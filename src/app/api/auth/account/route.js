import { NextResponse } from 'next/server';
import { getSessionUser, verifyPassword, clearAuthCookies } from '@/lib/auth-server';
import { getUserById, deleteUser } from '@/lib/store';
import { getClientIp, createRateLimiter } from '@/lib/request-security';
import { logSecurityEvent } from '@/lib/security-logger';

export const dynamic = 'force-dynamic';

const limiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 5 });

/**
 * Permanently delete the signed-in guest account and all of its data (data file + encrypted backups).
 * The host account cannot be deleted from the web UI.
 */
export async function DELETE(req) {
    const ip = getClientIp(req);
    try {
        const sessionUser = await getSessionUser();
        if (!sessionUser) {
            return NextResponse.json({ success: false, code: 'UNAUTHORIZED', error: 'Phiên đăng nhập đã hết hạn' }, { status: 401 });
        }
        if (sessionUser.role === 'host') {
            return NextResponse.json({ success: false, error: 'Không thể xóa tài khoản host từ giao diện web' }, { status: 403 });
        }
        // Count the attempt before checking the password (atomic), forgive it on success
        if (!limiter.consume(sessionUser.id)) {
            return NextResponse.json({ success: false, error: 'Bạn đã nhập sai quá nhiều lần, vui lòng thử lại sau 15 phút' }, { status: 429 });
        }

        const body = await req.json().catch(() => null);
        const password = String(body?.password ?? '');
        if (!password || password.length > 256) {
            return NextResponse.json({ success: false, error: 'Mật khẩu không chính xác' }, { status: 403 });
        }

        const user = await getUserById(sessionUser.id);
        const passwordOk = Boolean(user) && await verifyPassword(password, user.salt, user.passwordHash);
        // One transaction removes the account and everything it owns (data, settings, encrypted backups)
        const deleted = passwordOk && await deleteUser(sessionUser.id);

        if (!deleted) {
            logSecurityEvent({ event: 'AUTH_ACCOUNT_DELETE_FAILED', userId: sessionUser.id, ip, success: false });
            return NextResponse.json({ success: false, error: 'Mật khẩu không chính xác' }, { status: 403 });
        }

        logSecurityEvent({ event: 'AUTH_ACCOUNT_DELETED', userId: sessionUser.id, ip, success: true });
        const res = NextResponse.json({ success: true, message: 'Đã xóa tài khoản và toàn bộ dữ liệu' });
        clearAuthCookies(res, req);
        return res;
    } catch (err) {
        console.error('API /api/auth/account error:', err);
        return NextResponse.json({ success: false, error: 'Lỗi máy chủ khi xóa tài khoản' }, { status: 500 });
    }
}
