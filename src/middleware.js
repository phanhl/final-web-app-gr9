import { NextResponse } from 'next/server';

/**
 * Middleware cho phép truy cập trang web để hiển thị giao diện Đăng Nhập / Đăng Ký hiện đại.
 * Toàn bộ bảo mật dữ liệu được kiểm soát tại API /api/storage và /api/auth.
 */
export function middleware(req) {
    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
