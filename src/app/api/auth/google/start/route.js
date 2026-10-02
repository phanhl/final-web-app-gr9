import { NextResponse } from 'next/server';
import { getSessionUser, createSessionToken } from '@/lib/auth-server';
import { getGoogleConfig, getRedirectUri, getRequestOrigin, buildAuthUrl, createPkcePair, randomToken, OAUTH_COOKIE } from '@/lib/google-oauth';
import { isSecureRequest } from '@/lib/request-security';
import { registrationEnabled } from '@/lib/registration';

export const dynamic = 'force-dynamic';

const FLOW_TTL_SECONDS = 10 * 60;
const MODES = new Set(['login', 'signup', 'link']);

/**
 * GET /api/auth/google/start?mode=login|signup|link
 * Starts the Google flow: PKCE verifier, state and nonce are kept in a short-lived, signed, httpOnly cookie
 * scoped to /api/auth/google so the callback can prove the response belongs to this browser's request.
 */
export async function GET(req) {
    const origin = getRequestOrigin(req);
    const back = (reason) => NextResponse.redirect(`${origin}/?google=error&reason=${reason}`, 302);
    const config = getGoogleConfig();
    if (!config.enabled) return back('disabled');

    const mode = MODES.has(req.nextUrl.searchParams.get('mode')) ? req.nextUrl.searchParams.get('mode') : 'login';
    let sessionUser = null;
    if (mode === 'link') {
        sessionUser = await getSessionUser();
        if (!sessionUser) return back('session');
    }
    if (mode === 'signup' && !registrationEnabled()) return back('registration_disabled');

    const { verifier, challenge } = createPkcePair();
    const state = randomToken();
    const nonce = randomToken();
    const flow = await createSessionToken({
        kind: 'oauth',
        state,
        verifier,
        nonce,
        mode,
        uid: sessionUser?.id || null,
        tv: sessionUser?.tokenVersion || null,
        exp: Date.now() + FLOW_TTL_SECONDS * 1000,
    });

    const res = NextResponse.redirect(buildAuthUrl(config, {
        redirectUri: getRedirectUri(req),
        state,
        nonce,
        codeChallenge: challenge,
    }), 302);
    res.cookies.set(OAUTH_COOKIE, flow, {
        httpOnly: true,
        secure: isSecureRequest(req),
        // lax: the cookie must come back on Google's top-level GET redirect to the callback
        sameSite: 'lax',
        maxAge: FLOW_TTL_SECONDS,
        path: '/api/auth/google',
    });
    res.headers.set('Cache-Control', 'no-store');
    return res;
}
