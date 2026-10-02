import { NextResponse } from 'next/server';
import { getSessionUser, getUsers, saveUsers, withUsersLock } from '@/lib/auth-server';
import { getClientIp } from '@/lib/request-security';
import { logSecurityEvent } from '@/lib/security-logger';

export const dynamic = 'force-dynamic';

/** POST /api/auth/google/unlink - remove the Google link from the signed-in account. */
export async function POST(req) {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
        return NextResponse.json({ success: false, code: 'UNAUTHORIZED', error: 'Phiên đăng nhập đã hết hạn' }, { status: 401 });
    }
    const outcome = await withUsersLock(async () => {
        const users = await getUsers();
        const me = users.find((u) => u.id === sessionUser.id);
        if (!me?.googleSub) return 'not_linked';
        // Without a password the account would have no way left to sign in
        if (!me.hasPassword) return 'no_password';
        delete me.googleSub;
        delete me.googleEmail;
        delete me.googleLinkedAt;
        await saveUsers(users);
        return 'ok';
    });
    if (outcome === 'no_password') {
        return NextResponse.json({ success: false, code: 'NO_PASSWORD', error: 'Hãy đặt mật khẩu cho tài khoản trước khi hủy liên kết Google, nếu không bạn sẽ không đăng nhập lại được.' }, { status: 400 });
    }
    if (outcome === 'not_linked') {
        return NextResponse.json({ success: false, error: 'Tài khoản chưa liên kết Google' }, { status: 400 });
    }
    logSecurityEvent({ event: 'AUTH_GOOGLE_UNLINKED', userId: sessionUser.id, ip: getClientIp(req), success: true });
    return NextResponse.json({ success: true });
}
