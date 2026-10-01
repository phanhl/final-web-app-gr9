import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function POST() {
    const res = NextResponse.json({ success: true, message: 'Đã đăng xuất' });
    res.cookies.set(SESSION_COOKIE_NAME, '', {
        httpOnly: true,
        maxAge: 0,
        path: '/',
    });
    return res;
}
