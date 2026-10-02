import { NextResponse } from 'next/server';
import {
    getUsers,
    saveUsers,
    verifyPassword,
    hashPassword,
    createSessionToken,
    SESSION_COOKIE_NAME,
    SESSION_MAX_AGE
} from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

const FAIL_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_FAILS_PER_IP = 5; // Maximum 5 failed attempts
const loginFailedAttempts = new Map(); // ip -> { count, first }

function getClientIp(req) {
    return (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'local';
}

function isLoginRateLimited(ip) {
    const now = Date.now();
    const entry = loginFailedAttempts.get(ip);
    if (entry && now - entry.first > FAIL_WINDOW_MS) {
        loginFailedAttempts.delete(ip);
        return false;
    }
    return (entry?.count || 0) >= MAX_FAILS_PER_IP;
}

function recordLoginFailure(ip) {
    const now = Date.now();
    const entry = loginFailedAttempts.get(ip);
    if (!entry || now - entry.first > FAIL_WINDOW_MS) {
        loginFailedAttempts.set(ip, { count: 1, first: now });
    } else {
        entry.count++;
    }
}

export async function POST(req) {
    try {
        const ip = getClientIp(req);
        if (isLoginRateLimited(ip)) {
            return NextResponse.json({
                success: false,
                error: 'Bạn đã thử đăng nhập sai quá 5 lần. Vì lý do bảo mật, vui lòng thử lại sau 15 phút.'
            }, { status: 429 });
        }

        const body = await req.json().catch(() => null);
        if (!body || !body.username || !body.password) {
            return NextResponse.json({ success: false, error: 'Vui lòng nhập tên đăng nhập và mật khẩu' }, { status: 400 });
        }

        const username = String(body.username).trim().toLowerCase();
        const password = String(body.password);

        const users = await getUsers();
        let user = users.find(u => u.username.toLowerCase() === username);

        if (!user) {
            recordLoginFailure(ip);
            return NextResponse.json({ success: false, error: 'Tài khoản không tồn tại. Nếu bạn là khách, vui lòng bấm "Tạo tài khoản"' }, { status: 401 });
        }

        // Host account first-time login without an established password
        if (user.role === 'host' && !user.hasPassword) {
            if (password.length < 6) {
                return NextResponse.json({ success: false, error: 'Mật khẩu khởi tạo cho Host phải có ít nhất 6 ký tự' }, { status: 400 });
            }
            const { salt, hash } = hashPassword(password);
            user.salt = salt;
            user.passwordHash = hash;
            user.hasPassword = true;
            await saveUsers(users);
        } else {
            // Standard password verification
            const valid = verifyPassword(password, user.salt, user.passwordHash);
            if (!valid) {
                recordLoginFailure(ip);
                return NextResponse.json({ success: false, error: 'Mật khẩu không chính xác' }, { status: 401 });
            }
        }

        // Successful login -> reset failed attempt counter
        loginFailedAttempts.delete(ip);

        const sessionPayload = {
            userId: user.id,
            username: user.username,
            role: user.role,
            exp: Date.now() + SESSION_MAX_AGE * 1000,
        };

        const token = await createSessionToken(sessionPayload);
        const res = NextResponse.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
            },
            message: 'Đăng nhập thành công',
        });

        const isSecure = req.headers.get('x-forwarded-proto') === 'https' || req.nextUrl?.protocol === 'https:';
        res.cookies.set(SESSION_COOKIE_NAME, token, {
            httpOnly: true,
            secure: isSecure,
            sameSite: 'lax',
            maxAge: SESSION_MAX_AGE,
            path: '/',
        });

        return res;
    } catch (err) {
        console.error('API /api/auth/login error:', err);
        return NextResponse.json({ success: false, error: 'Lỗi máy chủ khi đăng nhập' }, { status: 500 });
    }
}
