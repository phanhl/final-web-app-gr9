/**
 * Centralized Security Event Logger (OWASP A09: Security Logging & Monitoring)
 * Emits structured security audit logs without leaking credentials or secrets.
 */

const REDACTED_KEYS = new Set([
    'password',
    'pass',
    'pin',
    'token',
    'cookie',
    'secret',
    'salt',
    'hash',
    'passwordhash',
    'pinhash',
    'authorization',
    'x-app-pin'
]);

function sanitizeDetails(obj) {
    if (!obj || typeof obj !== 'object') return {};
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        if (REDACTED_KEYS.has(key.toLowerCase())) {
            sanitized[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeDetails(value);
        } else {
            sanitized[key] = value;
        }
    }
    return sanitized;
}

export function logSecurityEvent({
    event,
    userId = null,
    ip = 'unknown',
    success = true,
    details = {}
}) {
    const entry = {
        timestamp: new Date().toISOString(),
        event,
        userId: userId || null,
        ip: ip || 'unknown',
        status: success ? 'SUCCESS' : 'FAILURE',
        details: sanitizeDetails(details),
    };

    const prefix = success ? '[SECURITY-AUDIT]' : '[SECURITY-ALERT]';
    if (success) {
        console.log(`${prefix} ${JSON.stringify(entry)}`);
    } else {
        console.warn(`${prefix} ${JSON.stringify(entry)}`);
    }
}
