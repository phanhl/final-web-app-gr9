import { createRateLimiter } from './request-security';

const HOUR_MS = 60 * 60 * 1000;
// Anti-spam for account creation (password or Google): per IP and server-wide per hour
export const registerIpLimiter = createRateLimiter({ windowMs: HOUR_MS, max: 5 });
export const registerGlobalLimiter = createRateLimiter({ windowMs: HOUR_MS, max: Number(process.env.MAX_REGISTRATIONS_PER_HOUR) || 30 });

export function registrationEnabled() {
    const flag = String(process.env.ALLOW_REGISTRATION ?? 'true').toLowerCase();
    return !['0', 'false', 'no', 'off'].includes(flag);
}

/**
 * Reserve a sign-up slot for this IP (and server-wide) atomically. Returns false when over the limit.
 * Every attempt that reaches the expensive part counts, so parallel bursts cannot exceed the limit.
 */
export function consumeRegistrationSlot(ip) {
    if (registerIpLimiter.isLimited(ip) || registerGlobalLimiter.isLimited('global')) return false;
    registerIpLimiter.hit(ip);
    registerGlobalLimiter.hit('global');
    return true;
}
