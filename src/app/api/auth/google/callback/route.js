import { NextResponse } from 'next/server';
import crypto from 'crypto';
import {
    getUsers,
    saveUsers,
    withUsersLock,
    getSessionUser,
    verifySessionToken,
    setSessionCookie,
    getUserDataFilePath,
    getDefaultUserData,
    writeJsonAtomic,
} from '@/lib/auth-server';
import {
    getGoogleConfig,
    getRedirectUri,
    getRequestOrigin,
    exchangeCode,
    verifyIdToken,
    usernameFromEmail,
    OAUTH_COOKIE,
} from '@/lib/google-oauth';
import { getClientIp, isSecureRequest } from '@/lib/request-security';
import { registrationEnabled, consumeRegistrationSlot } from '@/lib/registration';
import { logSecurityEvent } from '@/lib/security-logger';

export const dynamic = 'force-dynamic';

const safeEqual = (a, b) => {
    const ha = crypto.createHash('sha256').update(String(a)).digest();
    const hb = crypto.createHash('sha256').update(String(b)).digest();
    return crypto.timingSafeEqual(ha, hb);
};

/**
 * GET /api/auth/google/callback?code=...&state=...
 * Completes the flow started by /api/auth/google/start and lands back on the app with ?google=<result>.
 * Accounts are matched by Google's stable `sub` id (not the e-mail, which a user can change),
 * and one Google account can be linked to exactly one FinTrack account.
 */
export async function GET(req) {
    const origin = getRequestOrigin(req);
    const ip = getClientIp(req);
    const finish = (result, reason) => {
        const url = new URL('/', origin);
        url.searchParams.set('google', result);
        if (reason) url.searchParams.set('reason', reason);
        const res = NextResponse.redirect(url.toString(), 302);
        // The flow cookie is single-use
        res.cookies.set(OAUTH_COOKIE, '', { httpOnly: true, secure: isSecureRequest(req), sameSite: 'lax', maxAge: 0, path: '/api/auth/google' });
        res.headers.set('Cache-Control', 'no-store');
        return res;
    };
    const fail = (reason, details) => {
        logSecurityEvent({ event: 'AUTH_GOOGLE_FAILED', ip, success: false, details: { reason, ...details } });
        return finish('error', reason);
    };

    const config = getGoogleConfig();
    if (!config.enabled) return fail('disabled');

    const params = req.nextUrl.searchParams;
    if (params.get('error')) {
        // access_denied = the user closed / cancelled the Google screen
        return fail(params.get('error') === 'access_denied' ? 'cancelled' : 'google_error', { error: params.get('error') });
    }

    const flow = await verifySessionToken(req.cookies.get(OAUTH_COOKIE)?.value);
    if (!flow || flow.kind !== 'oauth') return fail('expired');
    const state = params.get('state') || '';
    const code = params.get('code') || '';
    if (!state || !code || !safeEqual(state, flow.state)) return fail('state');

    let claims;
    try {
        const tokens = await exchangeCode(config, { code, redirectUri: getRedirectUri(req), codeVerifier: flow.verifier });
        claims = await verifyIdToken(config, tokens.id_token, { nonce: flow.nonce });
    } catch (err) {
        console.error('Google sign-in verification failed:', err.message);
        return fail(err.code === 'TOKEN_EXCHANGE_FAILED' ? 'exchange' : 'token');
    }

    const sub = String(claims.sub);
    const email = claims.email && claims.email_verified !== false ? String(claims.email).toLowerCase() : '';
    const signIn = async (user, result) => {
        const res = finish(result);
        // Like a password sign-in, Google does not unlock the App PIN: it is entered separately when enabled
        await setSessionCookie(res, req, user);
        logSecurityEvent({ event: result === 'signup' ? 'AUTH_GOOGLE_SIGNUP' : 'AUTH_GOOGLE_LOGIN', userId: user.id, ip, success: true });
        return res;
    };

    try {
        if (flow.mode === 'link') {
            const sessionUser = await getSessionUser();
            // The browser must still be signed in as the account that started the linking
            if (!sessionUser || sessionUser.id !== flow.uid || (sessionUser.tokenVersion || 1) !== (flow.tv || 1)) {
                return fail('session');
            }
            const outcome = await withUsersLock(async () => {
                const users = await getUsers();
                if (users.some((u) => u.googleSub === sub && u.id !== sessionUser.id)) return 'already_linked';
                const me = users.find((u) => u.id === sessionUser.id);
                if (!me) return 'session';
                me.googleSub = sub;
                me.googleEmail = email;
                me.googleLinkedAt = new Date().toISOString();
                await saveUsers(users);
                return 'ok';
            });
            if (outcome !== 'ok') return fail(outcome);
            logSecurityEvent({ event: 'AUTH_GOOGLE_LINKED', userId: sessionUser.id, ip, success: true, details: { email } });
            return finish('linked');
        }

        const users = await getUsers();
        const linked = users.find((u) => u.googleSub === sub);
        if (linked) {
            // Signing up with a Google account that already has a FinTrack account just signs in
            return signIn(linked, 'login');
        }
        if (flow.mode === 'login') return fail('not_linked');

        // mode === 'signup': new guest account bound to this Google account
        if (!registrationEnabled()) return fail('registration_disabled');
        if (!consumeRegistrationSlot(ip)) return fail('rate_limited');
        const created = await withUsersLock(async () => {
            const fresh = await getUsers();
            const existing = fresh.find((u) => u.googleSub === sub);
            if (existing) return existing;
            let username = usernameFromEmail(email);
            while (fresh.some((u) => u.username.toLowerCase() === username)) username = usernameFromEmail(email);
            const displayName = String(claims.name || username).trim().slice(0, 50) || username;
            const user = {
                id: `usr_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
                username,
                role: 'guest',
                tokenVersion: 1,
                // No password yet: the account signs in with Google until a password is set in Settings
                hasPassword: false,
                salt: '',
                passwordHash: '',
                displayName,
                googleSub: sub,
                googleEmail: email,
                googleLinkedAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
            };
            const data = getDefaultUserData(displayName);
            data.userProfile = { ...data.userProfile, email };
            await writeJsonAtomic(getUserDataFilePath(user.id), data);
            fresh.push(user);
            await saveUsers(fresh);
            return user;
        });
        return signIn(created, 'signup');
    } catch (err) {
        console.error('Google sign-in error:', err);
        return fail('server');
    }
}
