/**
 * Shared request helpers: trustworthy client IP, local-host detection, in-memory rate limiting.
 *
 * Client IP resolution (rate limiting only, never authorization):
 * - cf-connecting-ip: set by Cloudflare edge (cloudflared tunnel), clients cannot override it.
 * - Otherwise the RIGHTMOST X-Forwarded-For entry: proxies (ngrok, nginx) append the address they
 *   saw, so leftmost entries are client-controlled and must not be trusted.
 */

const LOOPBACK_IPS = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1', 'local']);
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
// Headers added by reverse proxies / tunnels. Any of them means the request did not come straight from the host machine.
// (Next.js itself always fills x-forwarded-host/-for/-proto, so those are checked by value instead.)
const PROXY_HEADERS = ['cf-connecting-ip', 'cf-ray', 'x-real-ip', 'forwarded', 'via', 'ngrok-trace-id'];

export function getClientIp(req) {
    const cf = req.headers.get('cf-connecting-ip');
    if (cf) return cf.trim();
    const xff = req.headers.get('x-forwarded-for');
    if (xff) {
        const parts = xff.split(',').map(s => s.trim()).filter(Boolean);
        if (parts.length) return parts[parts.length - 1];
    }
    return req.headers.get('x-real-ip') || 'local';
}

function hostnameOf(hostHeader) {
    if (!hostHeader) return '';
    const h = hostHeader.trim().toLowerCase();
    if (h.startsWith('[')) return h.slice(0, h.indexOf(']') + 1);
    return h.split(':')[0];
}

/**
 * Best-effort check that the request reached Next.js directly on the host machine (http://localhost:PORT),
 * not through ngrok / cloudflared. A client on the LAN can still forge these headers, so never use this
 * as the only gate for granting privileges.
 */
export function isLocalRequest(req) {
    if (!LOCAL_HOSTNAMES.has(hostnameOf(req.headers.get('host')))) return false;
    const fwdHost = req.headers.get('x-forwarded-host');
    if (fwdHost && !LOCAL_HOSTNAMES.has(hostnameOf(fwdHost))) return false;
    if (PROXY_HEADERS.some(h => req.headers.get(h))) return false;
    const xff = req.headers.get('x-forwarded-for');
    if (xff) {
        const parts = xff.split(',').map(s => s.trim()).filter(Boolean);
        if (!parts.every(ip => LOOPBACK_IPS.has(ip))) return false;
    }
    return true;
}

export function isSecureRequest(req) {
    return req.headers.get('x-forwarded-proto') === 'https' || req.nextUrl?.protocol === 'https:';
}

/**
 * Fixed-window failure counter keyed by arbitrary strings (IP, username...).
 * Entries are pruned lazily so spoofed keys cannot grow memory without bound.
 */
export function createRateLimiter({ windowMs, max, maxKeys = 10000 }) {
    const entries = new Map(); // key -> { count, first }

    function prune(now) {
        for (const [key, entry] of entries) {
            if (now - entry.first > windowMs) entries.delete(key);
        }
        // Still too many live keys: drop the oldest ones
        while (entries.size > maxKeys) {
            entries.delete(entries.keys().next().value);
        }
    }

    return {
        isLimited(key) {
            const now = Date.now();
            const entry = entries.get(key);
            if (entry && now - entry.first > windowMs) {
                entries.delete(key);
                return false;
            }
            return (entry?.count || 0) >= max;
        },
        hit(key) {
            const now = Date.now();
            const entry = entries.get(key);
            if (!entry || now - entry.first > windowMs) {
                if (entries.size >= maxKeys) prune(now);
                entries.set(key, { count: 1, first: now });
            } else {
                entry.count++;
            }
        },
        reset(key) {
            entries.delete(key);
        },
        /**
         * Check and count in one synchronous step. Checking first and counting after an `await` lets a burst of
         * parallel requests all pass the check before any of them is counted.
         * Returns false when the key is already limited.
         */
        consume(key) {
            if (this.isLimited(key)) return false;
            this.hit(key);
            return true;
        },
    };
}

/** Read a request body as text while enforcing a byte limit (checks Content-Length first, then the actual size). */
export async function readBodyWithLimit(req, maxBytes) {
    const declared = Number(req.headers.get('content-length'));
    if (Number.isFinite(declared) && declared > maxBytes) {
        return { tooLarge: true };
    }
    const raw = await req.text();
    if (Buffer.byteLength(raw, 'utf8') > maxBytes) {
        return { tooLarge: true };
    }
    return { raw };
}
