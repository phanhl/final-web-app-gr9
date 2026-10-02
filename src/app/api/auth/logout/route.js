import { NextResponse } from 'next/server';
import { getSessionUser, clearAuthCookies } from '@/lib/auth-server';
import { bumpTokenVersion } from '@/lib/store';
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
            await bumpTokenVersion(sessionUser.id);
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
