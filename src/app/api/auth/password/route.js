import { NextResponse } from 'next/server';
import {
    getSessionUser,
    verifyPassword,
    hashPassword,
    setSessionCookie,
    setUnlockCookie,
    hasValidUnlockCookie,
} from '@/lib/auth-server';
import { getClientIp, createRateLimiter } from '@/lib/request-security';
import { getUserById, getSecurity, changePassword } from '@/lib/store';
import { logSecurityEvent } from '@/lib/security-logger';

export const dynamic = 'force-dynamic';

const limiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 5 });

/**
 * Change the signed-in user's password. Signs out every other device (tokenVersion bump)
 * and re-issues the session for the current one.
 */
export async function POST(req) {
    const ip = getClientIp(req);
    try {
        const sessionUser = await getSessionUser();
        if (!sessionUser) {
            return NextResponse.json({ success: false, code: 'UNAUTHORIZED', error: 'Phiên đăng nhập đã hết hạn' }, { status: 401 });
        }
        // Count the attempt before checking the password (atomic), forgive it on success
        if (!limiter.consume(sessionUser.id)) {
            return NextResponse.json({ success: false, error: 'Bạn đã nhập sai quá nhiều lần, vui lòng thử lại sau 15 phút' }, { status: 429 });
        }

        // Only a browser that had already unlocked the App PIN stays unlocked after the change
        // (the old unlock cookie dies with the tokenVersion bump); changing the password never unlocks the PIN by itself
        const securityBefore = await getSecurity(sessionUser.id);
        const wasUnlocked = await hasValidUnlockCookie(req, sessionUser, securityBefore?.pinHash);

        const body = await req.json().catch(() => null);
        const currentPassword = String(body?.currentPassword ?? '');
        const newPassword = String(body?.newPassword ?? '');
        if (currentPassword.length > 256) {
            return NextResponse.json({ success: false, error: 'Mật khẩu hiện tại không chính xác' }, { status: 403 });
        }
        if (newPassword.length < 8 || newPassword.length > 256) {
            return NextResponse.json({ success: false, error: 'Mật khẩu mới phải có từ 8 đến 256 ký tự' }, { status: 400 });
        }
        if (newPassword === currentPassword) {
            return NextResponse.json({ success: false, error: 'Mật khẩu mới phải khác mật khẩu hiện tại' }, { status: 400 });
        }

        const user = await getUserById(sessionUser.id);
        let updated = null;
        if (user && await verifyPassword(currentPassword, user.salt, user.passwordHash)) {
            const { salt, hash } = await hashPassword(newPassword);
            // Compare-and-set on tokenVersion: if this account changed meanwhile (another password change,
            // a logout), nothing is written and the request fails instead of silently overwriting it
            if (await changePassword(user.id, user.tokenVersion, salt, hash)) {
                updated = await getUserById(user.id);
            }
        }

        if (!updated) {
            logSecurityEvent({ event: 'AUTH_PASSWORD_CHANGE_FAILED', userId: sessionUser.id, ip, success: false });
            return NextResponse.json({ success: false, error: 'Mật khẩu hiện tại không chính xác' }, { status: 403 });
        }

        limiter.reset(sessionUser.id);
        logSecurityEvent({ event: 'AUTH_PASSWORD_CHANGED', userId: updated.id, ip, success: true });
        const res = NextResponse.json({ success: true, message: 'Đã đổi mật khẩu. Các thiết bị khác đã bị đăng xuất.' });
        await setSessionCookie(res, req, updated);
        if (wasUnlocked) {
            await setUnlockCookie(res, req, updated, securityBefore?.pinHash);
        }
        return res;
    } catch (err) {
        console.error('API /api/auth/password error:', err);
        return NextResponse.json({ success: false, error: 'Lỗi máy chủ khi đổi mật khẩu' }, { status: 500 });
    }
}
