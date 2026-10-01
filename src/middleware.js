import { NextResponse } from 'next/server';

/**
 * Bảo vệ toàn bộ ứng dụng (trang + /api/storage) bằng HTTP Basic Auth.
 * Bật khi đặt biến môi trường APP_PASSWORD (và tùy chọn APP_USER, mặc định "admin").
 * Trình duyệt tự gửi lại thông tin đăng nhập cho mọi fetch cùng origin nên client không cần sửa gì.
 */
function safeEqual(a, b) {
    if (a.length !== b.length)
        return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
        diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return diff === 0;
}

export function middleware(req) {
    const password = process.env.APP_PASSWORD;
    if (!password)
        return NextResponse.next();
    const user = process.env.APP_USER || 'admin';
    const header = req.headers.get('authorization') || '';
    if (header.startsWith('Basic ')) {
        try {
            const decoded = atob(header.slice(6));
            const sep = decoded.indexOf(':');
            if (sep !== -1 && safeEqual(decoded.slice(0, sep), user) && safeEqual(decoded.slice(sep + 1), password)) {
                return NextResponse.next();
            }
        }
        catch {
            // header hỏng -> rơi xuống 401
        }
    }
    return new NextResponse('Yêu cầu đăng nhập', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="FinTrack", charset="UTF-8"' },
    });
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
