import { NextResponse } from 'next/server';
import { getSessionUser, getUsers } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const sessionUser = await getSessionUser();
        const users = await getUsers();
        const adminUser = users.find(u => u.role === 'host' || u.username === 'admin');
        const isHostPasswordSet = Boolean(adminUser && adminUser.hasPassword);

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
        console.error('API /api/auth/me error:', err);
        return NextResponse.json({ authenticated: false, isHostPasswordSet: false }, { status: 500 });
    }
}
