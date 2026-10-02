import { NextResponse } from 'next/server';
import crypto from 'crypto';
import {
    getUsers,
    saveUsers,
    withUsersLock,
    hashPassword,
    setSessionCookie,
    getUserDataFilePath,
    getDefaultUserData,
    writeJsonAtomic,
} from '@/lib/auth-server';
import { validatePayload, normalizeSnapshotNumbers } from '@/lib/storage-validation';
import { getClientIp, readBodyWithLimit } from '@/lib/request-security';
import { registrationEnabled, consumeRegistrationSlot } from '@/lib/registration';
import { logSecurityEvent } from '@/lib/security-logger';

export const dynamic = 'force-dynamic';

// Username + password + optional offline data carried over from the browser. Larger offline data can be
// imported as a JSON backup after signing up instead.
const MAX_BODY_BYTES = 1024 * 1024;

export async function POST(req) {
    const ip = getClientIp(req);
    try {
        if (!registrationEnabled()) {
            return NextResponse.json({ success: false, error: 'Máy chủ đang tắt chức năng đăng ký tài khoản mới' }, { status: 403 });
        }
        const { raw, tooLarge } = await readBodyWithLimit(req, MAX_BODY_BYTES);
        if (tooLarge) {
            return NextResponse.json({ success: false, error: 'Dữ liệu quá lớn' }, { status: 413 });
        }
        let body = null;
        try {
            body = JSON.parse(raw);
        } catch {
            body = null;
        }
        if (!body || !body.username || !body.password) {
            return NextResponse.json({ success: false, error: 'Vui lòng nhập tên đăng nhập và mật khẩu' }, { status: 400 });
        }

        const username = String(body.username).trim().toLowerCase();
        const password = String(body.password);
        const displayName = (body.displayName ? String(body.displayName).trim() : username).slice(0, 50) || username;

        // Validate username format (lowercase letters, numbers, and underscore only, 3-20 chars)
        if (!/^[a-z0-9_]{3,20}$/.test(username)) {
            return NextResponse.json({
                success: false,
                error: 'Tên đăng nhập phải từ 3-20 ký tự, chỉ gồm chữ cái thường, số và dấu gạch dưới (_)'
            }, { status: 400 });
        }
        if (username === 'admin') {
            return NextResponse.json({ success: false, error: 'Tên đăng nhập này đã được sử dụng. Vui lòng chọn tên khác' }, { status: 409 });
        }

        // Security requirement: Minimum password length 8 characters
        if (password.length < 8 || password.length > 256) {
            return NextResponse.json({ success: false, error: 'Mật khẩu phải có từ 8 đến 256 ký tự' }, { status: 400 });
        }

        // Reserve a sign-up slot only now (cheap checks done, expensive scrypt + disk writes ahead). Checking and
        // counting in one synchronous step keeps parallel bursts from creating more accounts than allowed.
        if (!consumeRegistrationSlot(ip)) {
            logSecurityEvent({ event: 'AUTH_REGISTER_RATE_LIMITED', ip, success: false });
            return NextResponse.json({ success: false, error: 'Đã tạo quá nhiều tài khoản trong thời gian ngắn, vui lòng thử lại sau' }, { status: 429 });
        }

        // Optional offline data carried over from the browser: must pass the same validation as /api/storage
        let initialUserData = getDefaultUserData(displayName);
        const initialData = body.initialData;
        if (initialData && typeof initialData === 'object' && Array.isArray(initialData.wallets) && initialData.wallets.length > 0) {
            const candidate = {
                ...initialUserData,
                wallets: initialData.wallets,
                transactions: Array.isArray(initialData.transactions) ? initialData.transactions : [],
                categories: Array.isArray(initialData.categories) && initialData.categories.length > 0 ? initialData.categories : initialUserData.categories,
                budgets: Array.isArray(initialData.budgets) ? initialData.budgets : [],
                bills: Array.isArray(initialData.bills) ? initialData.bills : [],
                goals: Array.isArray(initialData.goals) ? initialData.goals : [],
                planner: initialData.planner || initialUserData.planner,
                simulatorConfig: initialData.simulatorConfig || initialUserData.simulatorConfig,
                updatedAt: new Date().toISOString(),
            };
            // Invalid carried-over data is dropped instead of blocking sign-up
            if (!validatePayload(candidate)) {
                initialUserData = normalizeSnapshotNumbers(candidate);
            }
        }

        // Hash outside the users.json lock so other account writes do not wait for scrypt
        const { salt, hash } = await hashPassword(password);
        const newUser = await withUsersLock(async () => {
            const users = await getUsers();
            if (users.some(u => u.username.toLowerCase() === username)) {
                return null;
            }
            const created = {
                id: `usr_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
                username,
                role: 'guest',
                tokenVersion: 1,
                hasPassword: true,
                salt,
                passwordHash: hash,
                displayName,
                createdAt: new Date().toISOString(),
            };
            // Write the data file first so a registered account never points at a missing store
            await writeJsonAtomic(getUserDataFilePath(created.id), initialUserData);
            users.push(created);
            await saveUsers(users);
            return created;
        });

        if (!newUser) {
            logSecurityEvent({ event: 'AUTH_REGISTER_CONFLICT', ip, success: false, details: { username } });
            return NextResponse.json({ success: false, error: 'Tên đăng nhập này đã được sử dụng. Vui lòng chọn tên khác' }, { status: 409 });
        }

        logSecurityEvent({ event: 'AUTH_REGISTER_SUCCESS', userId: newUser.id, ip, success: true, details: { username } });

        const res = NextResponse.json({
            success: true,
            user: {
                id: newUser.id,
                username: newUser.username,
                role: newUser.role,
            },
            message: 'Đăng ký tài khoản thành công',
        });
        await setSessionCookie(res, req, newUser);
        return res;
    } catch (err) {
        console.error('API /api/auth/register error:', err);
        return NextResponse.json({ success: false, error: 'Lỗi máy chủ khi đăng ký tài khoản' }, { status: 500 });
    }
}
