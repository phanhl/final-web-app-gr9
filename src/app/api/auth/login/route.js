import { NextResponse } from 'next/server';
import {
    ensureReady,
    verifyPassword,
    hashPassword,
    setSessionCookie,
    verifyHostSetupCode,
    consumeHostSetupCode,
} from '@/lib/auth-server';
import { getUserByUsername, getUserById, setHostPasswordIfUnset } from '@/lib/store';
import { getClientIp, isLocalRequest, createRateLimiter } from '@/lib/request-security';
import { logSecurityEvent } from '@/lib/security-logger';

export const dynamic = 'force-dynamic';

const FAIL_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
// Per-IP limit + per-account limit: rotating (spoofed) IPs no longer gives unlimited guesses on one account
const ipLimiter = createRateLimiter({ windowMs: FAIL_WINDOW_MS, max: 5 });
const accountLimiter = createRateLimiter({ windowMs: FAIL_WINDOW_MS, max: 10 });
// Burn the same scrypt cost for unknown usernames so response timing does not reveal which accounts exist
const DUMMY_SALT = 'fintrack-dummy-salt-for-timing';
let dummyHash = null;
const getDummyHash = async () => (dummyHash ??= (await hashPassword('fintrack-dummy-password', DUMMY_SALT)).hash);
const INVALID_CREDENTIALS = 'Tên đăng nhập hoặc mật khẩu không chính xác';

export async function POST(req) {
    const ip = getClientIp(req);
    try {
        const body = await req.json().catch(() => null);
        if (!body || !body.username || !body.password) {
            return NextResponse.json({ success: false, error: 'Vui lòng nhập tên đăng nhập và mật khẩu' }, { status: 400 });
        }

        const username = String(body.username).trim().toLowerCase().slice(0, 64);
        const password = String(body.password);
        if (password.length > 256) {
            return NextResponse.json({ success: false, error: INVALID_CREDENTIALS }, { status: 401 });
        }

        // Requests made directly on the host machine skip the per-account lockout, so a stranger spamming wrong
        // passwords through the tunnel cannot lock the owner out of their own account (per-IP limit still applies).
        const local = isLocalRequest(req);
        // Every attempt is counted up front (and forgiven on success): checking now and counting after the
        // password check let parallel bursts slip past the limit
        if (!ipLimiter.consume(ip) || (!local && !accountLimiter.consume(username))) {
            logSecurityEvent({ event: 'AUTH_LOGIN_RATE_LIMITED', ip, success: false, details: { username } });
            return NextResponse.json({
                success: false,
                error: 'Bạn đã thử đăng nhập sai quá nhiều lần. Vì lý do bảo mật, vui lòng thử lại sau 15 phút.'
            }, { status: 429 });
        }

        await ensureReady();
        // Usernames are unique case-insensitively in the database
        let user = await getUserByUsername(username);

        const fail = (reason, status = 401, error = INVALID_CREDENTIALS) => {
            logSecurityEvent({ event: 'AUTH_LOGIN_FAILED', userId: user?.id, ip, success: false, details: { username, reason } });
            return NextResponse.json({ success: false, error }, { status });
        };

        if (!user) {
            await verifyPassword(password, DUMMY_SALT, await getDummyHash());
            return fail('USER_NOT_FOUND');
        }

        if (user.role === 'host' && !user.hasPassword) {
            // First-time host setup: requires the one-time setup code printed on the server console,
            // so a stranger who opens the public tunnel URL first cannot claim the admin account.
            if (!(await verifyHostSetupCode(body.setupCode))) {
                return fail('HOST_SETUP_CODE_INVALID', 403, 'Cần mã thiết lập hợp lệ để đặt mật khẩu host lần đầu. Mã được in ở terminal chạy server (hoặc file data/.host_setup_code).');
            }
            if (password.length < 8) {
                return NextResponse.json({ success: false, error: 'Mật khẩu khởi tạo cho Host phải có ít nhất 8 ký tự' }, { status: 400 });
            }
            const { salt, hash } = await hashPassword(password);
            // Atomic: only succeeds while the host still has no password (someone else may finish first)
            if (!(await setHostPasswordIfUnset(user.id, salt, hash))) {
                return fail('HOST_ALREADY_SET');
            }
            await consumeHostSetupCode();
            user = await getUserById(user.id);
            logSecurityEvent({ event: 'AUTH_HOST_PASSWORD_INITIALIZED', userId: user.id, ip, success: true });
        } else if (!(await verifyPassword(password, user.salt, user.passwordHash))) {
            return fail('INVALID_PASSWORD');
        }

        // Successful login -> reset failed attempt counters
        ipLimiter.reset(ip);
        accountLimiter.reset(username);
        logSecurityEvent({ event: 'AUTH_LOGIN_SUCCESS', userId: user.id, ip, success: true, details: { username, role: user.role } });

        const res = NextResponse.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
            },
            message: 'Đăng nhập thành công',
        });
        // Signing in does NOT unlock the App PIN: when PIN protection is on it is entered separately afterwards
        await setSessionCookie(res, req, user);
        return res;
    } catch (err) {
        console.error('API /api/auth/login error:', err);
        return NextResponse.json({ success: false, error: 'Lỗi máy chủ khi đăng nhập' }, { status: 500 });
    }
}

