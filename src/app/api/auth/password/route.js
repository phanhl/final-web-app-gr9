import { NextResponse } from 'next/server';
import {
    getSessionUser,
    getUsers,
    saveUsers,
    withUsersLock,
    verifyPassword,
    hashPassword,
    setSessionCookie,
    setUnlockCookie,
    hasValidUnlockCookie,
} from '@/lib/auth-server';
import { getClientIp, createRateLimiter } from '@/lib/request-security';
import { readUserSecurity } from '@/lib/user-data';
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
        const securityBefore = await readUserSecurity(sessionUser);
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
        if (sessionUser.hasPassword && newPassword === currentPassword) {
            return NextResponse.json({ success: false, error: 'Mật khẩu mới phải khác mật khẩu hiện tại' }, { status: 400 });
        }

        const updated = await withUsersLock(async () => {
            const users = await getUsers();
            const user = users.find(u => u.id === sessionUser.id);
            // Accounts created with Google have no password yet: they may set one without a current password
            if (!user || (user.hasPassword && !(await verifyPassword(currentPassword, user.salt, user.passwordHash)))) {
                return null;
            }
            const { salt, hash } = await hashPassword(newPassword);
            user.salt = salt;
            user.passwordHash = hash;
            user.hasPassword = true;
            user.tokenVersion = (user.tokenVersion || 1) + 1;
            user.passwordChangedAt = new Date().toISOString();
            await saveUsers(users);
            return user;
        });

        if (!updated) {
            logSecurityEvent({ event: 'AUTH_PASSWORD_CHANGE_FAILED', userId: sessionUser.id, ip, success: false });
            return NextResponse.json({ success: false, error: 'Mật khẩu hiện tại không chính xác' }, { status: 403 });
        }

        limiter.reset(sessionUser.id);
        logSecurityEvent({ event: 'AUTH_PASSWORD_CHANGED', userId: updated.id, ip, success: true });
        const res = NextResponse.json({ success: true, message: 'Đã đổi mật khẩu. Các thiết bị khác đã bị đăng xuất.' });
        await setSessionCookie(res, req, updated);
        if (wasUnlocked) {
            const security = await readUserSecurity(updated);
            await setUnlockCookie(res, req, updated, security?.pinHash);
        }
        return res;
    } catch (err) {
        console.error('API /api/auth/password error:', err);
        return NextResponse.json({ success: false, error: 'Lỗi máy chủ khi đổi mật khẩu' }, { status: 500 });
    }
}
