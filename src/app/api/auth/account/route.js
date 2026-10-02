import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import {
    getSessionUser,
    getUsers,
    saveUsers,
    withUsersLock,
    verifyPassword,
    clearAuthCookies,
    getUserDataFilePath,
    USERS_DIR,
} from '@/lib/auth-server';
import { getClientIp, createRateLimiter } from '@/lib/request-security';
import { withDataWriteQueue } from '@/lib/user-data';
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

        const deleted = await withUsersLock(async () => {
            const users = await getUsers();
            const user = users.find(u => u.id === sessionUser.id);
            if (!user || !(await verifyPassword(password, user.salt, user.passwordHash))) {
                return false;
            }
            await saveUsers(users.filter(u => u.id !== user.id));
            return true;
        });

        if (!deleted) {
            logSecurityEvent({ event: 'AUTH_ACCOUNT_DELETE_FAILED', userId: sessionUser.id, ip, success: false });
            return NextResponse.json({ success: false, error: 'Mật khẩu không chính xác' }, { status: 403 });
        }

        // getUserDataFilePath sanitizes the id, so these paths always stay inside data/users/.
        // Queued behind in-flight saves so none of them can recreate the file after it is removed.
        await withDataWriteQueue(async () => {
            await fs.rm(getUserDataFilePath(sessionUser.id), { force: true });
            const userDir = path.join(USERS_DIR, path.basename(getUserDataFilePath(sessionUser.id), '.json'));
            await fs.rm(userDir, { recursive: true, force: true });
        });

        logSecurityEvent({ event: 'AUTH_ACCOUNT_DELETED', userId: sessionUser.id, ip, success: true });
        const res = NextResponse.json({ success: true, message: 'Đã xóa tài khoản và toàn bộ dữ liệu' });
        clearAuthCookies(res, req);
        return res;
    } catch (err) {
        console.error('API /api/auth/account error:', err);
        return NextResponse.json({ success: false, error: 'Lỗi máy chủ khi xóa tài khoản' }, { status: 500 });
    }
}
