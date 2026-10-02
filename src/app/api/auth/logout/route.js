import { NextResponse } from 'next/server';
import {
    getSessionUser,
    getUsers,
    saveUsers,
    withUsersLock,
    clearAuthCookies,
} from '@/lib/auth-server';
import { getClientIp } from '@/lib/request-security';
import { logSecurityEvent } from '@/lib/security-logger';

export const dynamic = 'force-dynamic';

export async function POST(req) {
    const ip = getClientIp(req);
    let userId = null;

    try {
        const sessionUser = await getSessionUser();
        if (sessionUser) {
            userId = sessionUser.id;
            // Invalidate existing tokens server-side by bumping tokenVersion
            await withUsersLock(async () => {
                const users = await getUsers();
                const idx = users.findIndex(u => u.id === sessionUser.id);
                if (idx !== -1) {
                    users[idx].tokenVersion = (users[idx].tokenVersion || 1) + 1;
                    await saveUsers(users);
                }
            });
        }
    } catch (err) {
        console.error('Session revocation error during logout:', err);
    }

    logSecurityEvent({
        event: 'AUTH_LOGOUT',
        userId,
        ip,
        success: true
    });

    const res = NextResponse.json({ success: true, message: 'Đã đăng xuất và vô hiệu hóa phiên' });
    clearAuthCookies(res, req);
    return res;
}
