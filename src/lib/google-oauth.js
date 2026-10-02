import crypto from 'crypto';

/**
 * Google Sign-In (OAuth 2.0 authorization code flow + PKCE, OpenID Connect ID token).
 * No third-party library: the ID token is verified against Google's published keys (JWKS),
 * plus issuer, audience, expiry and the per-login nonce.
 *
 * Endpoints can be overridden through env vars only so the flow can be exercised against a local
 * mock provider in tests; production uses Google's defaults.
 */
// Signed, httpOnly cookie holding state / PKCE verifier / nonce between /start and /callback
export const OAUTH_COOKIE = 'fintrack_oauth';

const DEFAULTS = {
    authEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    jwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
    issuers: ['https://accounts.google.com', 'accounts.google.com'],
};

export function getGoogleConfig() {
    const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
    const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
    return {
        enabled: Boolean(clientId && clientSecret),
        clientId,
        clientSecret,
        authEndpoint: process.env.GOOGLE_AUTH_ENDPOINT || DEFAULTS.authEndpoint,
        tokenEndpoint: process.env.GOOGLE_TOKEN_ENDPOINT || DEFAULTS.tokenEndpoint,
        jwksUri: process.env.GOOGLE_JWKS_URI || DEFAULTS.jwksUri,
        issuers: process.env.GOOGLE_ISSUER ? [process.env.GOOGLE_ISSUER] : DEFAULTS.issuers,
    };
}

/**
 * Public origin of this request (https://xxx.ngrok-free.app, http://localhost:3000...).
 * GOOGLE_REDIRECT_ORIGIN pins it when the app sits behind a proxy that rewrites Host.
 * A forged Host only produces a redirect_uri Google refuses (it must be registered in Google Cloud).
 */
export function getRequestOrigin(req) {
    if (process.env.GOOGLE_REDIRECT_ORIGIN) {
        return process.env.GOOGLE_REDIRECT_ORIGIN.replace(/\/+$/, '');
    }
    const proto = (req.headers.get('x-forwarded-proto') || req.nextUrl.protocol.replace(':', '') || 'http').split(',')[0].trim();
    const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || req.nextUrl.host).split(',')[0].trim();
    return `${proto}://${host}`;
}

export function getRedirectUri(req) {
    return `${getRequestOrigin(req)}/api/auth/google/callback`;
}

const b64url = (buf) => Buffer.from(buf).toString('base64url');

export function createPkcePair() {
    const verifier = b64url(crypto.randomBytes(32));
    const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
    return { verifier, challenge };
}

export function randomToken(bytes = 24) {
    return b64url(crypto.randomBytes(bytes));
}

export function buildAuthUrl(config, { redirectUri, state, nonce, codeChallenge, loginHint }) {
    const url = new URL(config.authEndpoint);
    url.searchParams.set('client_id', config.clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('state', state);
    url.searchParams.set('nonce', nonce);
    url.searchParams.set('code_challenge', codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
    // Always show the account chooser so people with several Google accounts pick the right one
    url.searchParams.set('prompt', 'select_account');
    if (loginHint) url.searchParams.set('login_hint', loginHint);
    return url.toString();
}

export async function exchangeCode(config, { code, redirectUri, codeVerifier }) {
    const body = new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        code_verifier: codeVerifier,
    });
    const res = await fetch(config.tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal: AbortSignal.timeout(10000),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.id_token) {
        const error = new Error(`Token exchange failed: ${json.error || res.status}`);
        error.code = 'TOKEN_EXCHANGE_FAILED';
        throw error;
    }
    return json;
}

// JWKS cache: Google rotates keys every few days; refetch on unknown kid (at most once a minute)
let jwksCache = { uri: '', keys: [], fetchedAt: 0 };
async function getSigningKey(config, kid) {
    const now = Date.now();
    const fresh = jwksCache.uri === config.jwksUri && now - jwksCache.fetchedAt < 6 * 60 * 60 * 1000;
    let key = fresh ? jwksCache.keys.find((k) => k.kid === kid) : null;
    if (!key && (!fresh || now - jwksCache.fetchedAt > 60 * 1000)) {
        const res = await fetch(config.jwksUri, { signal: AbortSignal.timeout(10000) });
        if (!res.ok) throw Object.assign(new Error('Cannot fetch Google signing keys'), { code: 'JWKS_UNAVAILABLE' });
        const json = await res.json();
        jwksCache = { uri: config.jwksUri, keys: Array.isArray(json.keys) ? json.keys : [], fetchedAt: now };
        key = jwksCache.keys.find((k) => k.kid === kid);
    }
    if (!key) throw Object.assign(new Error('Unknown ID token signing key'), { code: 'BAD_TOKEN' });
    return crypto.createPublicKey({ key, format: 'jwk' });
}

/**
 * Verify a Google ID token. Returns its claims (sub, email, email_verified, name...) or throws.
 */
export async function verifyIdToken(config, idToken, { nonce }) {
    const fail = (msg) => { throw Object.assign(new Error(msg), { code: 'BAD_TOKEN' }); };
    const parts = String(idToken || '').split('.');
    if (parts.length !== 3) fail('Malformed ID token');
    let header, claims;
    try {
        header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
        claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    } catch {
        fail('Malformed ID token');
    }
    if (header.alg !== 'RS256') fail('Unexpected ID token algorithm');
    const key = await getSigningKey(config, header.kid);
    const valid = crypto.verify('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), key, Buffer.from(parts[2], 'base64url'));
    if (!valid) fail('Invalid ID token signature');

    const nowSec = Math.floor(Date.now() / 1000);
    const skew = 120;
    if (!config.issuers.includes(claims.iss)) fail('Unexpected ID token issuer');
    const audOk = Array.isArray(claims.aud) ? claims.aud.includes(config.clientId) : claims.aud === config.clientId;
    if (!audOk) fail('ID token was issued for another app');
    if (typeof claims.exp !== 'number' || claims.exp + skew < nowSec) fail('ID token expired');
    if (typeof claims.iat === 'number' && claims.iat - skew > nowSec) fail('ID token issued in the future');
    if (!nonce || claims.nonce !== nonce) fail('ID token nonce mismatch');
    if (!claims.sub) fail('ID token has no subject');
    return claims;
}

/**
 * Username for a new Google-created account: email local part, sanitized to the app's
 * /^[a-z0-9_]{3,20}$/ rule, plus a short random suffix to avoid collisions.
 */
export function usernameFromEmail(email) {
    const base = String(email || '').split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 13) || 'google';
    const padded = base.length < 3 ? `${base}usr` : base;
    return `${padded}_${crypto.randomBytes(3).toString('hex')}`.slice(0, 20);
}
