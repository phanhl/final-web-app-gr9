import { NextResponse } from 'next/server';

/**
 * Security Middleware (Defense-in-Depth)
 * 1. Enforces authentication perimeter on sensitive data endpoints (/api/storage).
 * 2. Applies baseline security headers across all matched routes.
 */
export function middleware(req) {
    const { pathname } = req.nextUrl;

    // Defense-in-Depth: Protect /api/storage from unauthenticated / anonymous requests
    if (pathname.startsWith('/api/storage')) {
        const sessionCookie = req.cookies.get('fintrack_session')?.value;
        if (!sessionCookie) {
            return NextResponse.json({
                success: false,
                code: 'UNAUTHORIZED',
                error: 'Yêu cầu đăng nhập tài khoản để truy cập dữ liệu'
            }, {
                status: 401,
                headers: {
                    'Cache-Control': 'no-store, no-cache, must-revalidate',
                    'X-Content-Type-Options': 'nosniff',
                    'X-Frame-Options': 'DENY'
                }
            });
        }
    }

    const response = NextResponse.next();

    // Attach security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    return response;
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
