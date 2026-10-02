import { NextResponse } from 'next/server';
import { getGoogleConfig, getRequestOrigin } from '@/lib/google-oauth';
import { registrationEnabled } from '@/lib/registration';

export const dynamic = 'force-dynamic';

// Google only accepts redirect URIs that are https, or plain http on localhost
function originUsableWithGoogle(origin) {
    try {
        const url = new URL(origin);
        return url.protocol === 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    } catch {
        return false;
    }
}

/**
 * Lets the UI show Google buttons only when they can actually work: a Google client is configured on the
 * server AND the address the app was opened on is one Google accepts (not http://192.168.x.x on the LAN).
 */
export async function GET(req) {
    const configured = getGoogleConfig().enabled;
    const usableHere = originUsableWithGoogle(getRequestOrigin(req));
    return NextResponse.json({
        enabled: configured && usableHere,
        configured,
        reason: !configured ? 'not_configured' : (usableHere ? null : 'needs_https'),
        signupEnabled: registrationEnabled(),
    });
}
