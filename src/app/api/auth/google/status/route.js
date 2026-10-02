import { NextResponse } from 'next/server';
import { getGoogleConfig } from '@/lib/google-oauth';
import { registrationEnabled } from '@/lib/registration';

export const dynamic = 'force-dynamic';

/** Lets the UI show Google buttons only when the server has a Google client configured. */
export async function GET() {
    return NextResponse.json({ enabled: getGoogleConfig().enabled, signupEnabled: registrationEnabled() });
}
