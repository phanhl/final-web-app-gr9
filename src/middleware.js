import { NextResponse } from 'next/server';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const API_ERROR_HEADERS = {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY'
};

/**
 * Security Middleware (Defense-in-Depth)
 * 1. Rejects cross-site state-changing API requests (CSRF), using the browser-provided Sec-Fetch-Site header.
 *    Same-site is rejected too: tunnel domains (*.trycloudflare.com, *.ngrok-free.app) host other people's apps.
 * 2. Enforces authentication perimeter on sensitive data endpoints (/api/storage).
 * 3. Applies baseline security headers across all matched routes.
 */
export function middleware(req) {
    const { pathname } = req.nextUrl;

    if (pathname.startsWith('/api/') && !SAFE_METHODS.has(req.method)) {
        const fetchSite = req.headers.get('sec-fetch-site');
        if (fetchSite === 'cross-site' || fetchSite === 'same-site') {
            return NextResponse.json({
                success: false,
                code: 'CROSS_SITE_BLOCKED',
                error: 'Yêu cầu từ trang web khác đã bị chặn'
            }, { status: 403, headers: API_ERROR_HEADERS });
        }
    }

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
                headers: API_ERROR_HEADERS
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
    matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|manifest.webmanifest|robots.txt).*)'],
};
