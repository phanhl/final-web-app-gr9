import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import crypto from 'crypto';
import {
    getUsers,
    saveUsers,
    hashPassword,
    createSessionToken,
    getUserDataFilePath,
    getDefaultUserData,
    SESSION_COOKIE_NAME,
    SESSION_MAX_AGE,
    USERS_DIR
} from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function POST(req) {
    try {
        const body = await req.json().catch(() => null);
        if (!body || !body.username || !body.password) {
            return NextResponse.json({ success: false, error: 'Vui lòng nhập tên đăng nhập và mật khẩu' }, { status: 400 });
        }

        const username = String(body.username).trim().toLowerCase();
        const password = String(body.password);
        const displayName = body.displayName ? String(body.displayName).trim() : username;

        // Validate username format (lowercase letters, numbers, and underscore only, 3-20 chars)
        if (!/^[a-z0-9_]{3,20}$/.test(username)) {
            return NextResponse.json({
                success: false,
                error: 'Tên đăng nhập phải từ 3-20 ký tự, chỉ gồm chữ cái thường, số và dấu gạch dưới (_)'
            }, { status: 400 });
        }

        if (password.length < 6) {
            return NextResponse.json({ success: false, error: 'Mật khẩu phải có ít nhất 6 ký tự' }, { status: 400 });
        }

        const users = await getUsers();
        if (users.some(u => u.username.toLowerCase() === username)) {
            return NextResponse.json({ success: false, error: 'Tên đăng nhập này đã được sử dụng. Vui lòng chọn tên khác' }, { status: 409 });
        }

        const userId = `usr_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
        const { salt, hash } = hashPassword(password);

        const newUser = {
            id: userId,
            username,
            role: 'guest',
            hasPassword: true,
            salt,
            passwordHash: hash,
            displayName,
            createdAt: new Date().toISOString(),
        };

        users.push(newUser);
        await saveUsers(users);

        // Initialize isolated user data store for guest
        await fs.mkdir(USERS_DIR, { recursive: true });
        const userFilePath = getUserDataFilePath(userId);
        const initialUserData = getDefaultUserData(displayName);
        await fs.writeFile(userFilePath, JSON.stringify(initialUserData, null, 2), 'utf-8');

        // Create session cookie
        const sessionPayload = {
            userId: newUser.id,
            username: newUser.username,
            role: newUser.role,
            exp: Date.now() + SESSION_MAX_AGE * 1000,
        };

        const token = await createSessionToken(sessionPayload);
        const res = NextResponse.json({
            success: true,
            user: {
                id: newUser.id,
                username: newUser.username,
                role: newUser.role,
            },
            message: 'Đăng ký tài khoản thành công',
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
        console.error('API /api/auth/register error:', err);
        return NextResponse.json({ success: false, error: 'Lỗi máy chủ khi đăng ký tài khoản' }, { status: 500 });
    }
}
