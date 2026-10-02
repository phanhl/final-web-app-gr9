import { NextResponse } from 'next/server';
import {
    SESSION_COOKIE_NAME,
    getSessionUser,
    getUsers,
    saveUsers
} from '@/lib/auth-server';
import { logSecurityEvent } from '@/lib/security-logger';

export const dynamic = 'force-dynamic';

function getClientIp(req) {
    return (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'local';
}

export async function POST(req) {
    const ip = getClientIp(req);
    let userId = null;

    try {
        const sessionUser = await getSessionUser();
        if (sessionUser) {
            userId = sessionUser.id;
            // Invalidate existing tokens server-side by bumping tokenVersion
            const users = await getUsers();
            const idx = users.findIndex(u => u.id === sessionUser.id);
            if (idx !== -1) {
                users[idx].tokenVersion = (users[idx].tokenVersion || 1) + 1;
                await saveUsers(users);
            }
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
    const isSecure = req.headers.get('x-forwarded-proto') === 'https' || req.nextUrl?.protocol === 'https:';

    res.cookies.set(SESSION_COOKIE_NAME, '', {
        httpOnly: true,
        secure: isSecure,
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
    });

    return res;
}
