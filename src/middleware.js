import { NextResponse } from 'next/server';

/**
 * Middleware permitting page access to display modern Login / Register modals.
 * Comprehensive data access security is strictly enforced at /api/storage and /api/auth.
 */
export function middleware(req) {
    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
