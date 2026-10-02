import { NextResponse } from 'next/server';
import { getSessionUser, getHostSetupCode, ensureReady } from '@/lib/auth-server';
import { getHostUser } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        await ensureReady();
        const sessionUser = await getSessionUser();
        const host = await getHostUser();
        const isHostPasswordSet = Boolean(host && host.hasPassword);
        if (!isHostPasswordSet) {
            // Make sure a one-time setup code exists (printed to the server console) for the first host login
            await getHostSetupCode();
        }

        if (!sessionUser) {
            return NextResponse.json({
                authenticated: false,
                isHostPasswordSet,
            });
        }

        return NextResponse.json({
            authenticated: true,
            user: sessionUser,
            isHostPasswordSet,
        });
    } catch (err) {
        // Database unreachable: say so (503) instead of pretending the user is signed out
        console.error('API /api/auth/me error:', err);
        return NextResponse.json({ authenticated: false, code: 'SERVER_UNAVAILABLE', error: 'Máy chủ dữ liệu tạm thời không phản hồi' }, { status: 503 });
    }
}
