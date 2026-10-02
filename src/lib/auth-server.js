import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { promisify } from 'util';
import { cookies } from 'next/headers';
import { DEFAULT_CATEGORIES } from './mock-data';
import { isSecureRequest } from './request-security';
import { getPool } from './db';
import { getUserById, getHostUser, createUserWithData } from './store';
import { importLegacyJsonIfNeeded } from './legacy-import';

// Accounts and financial data live in MySQL (src/lib/db.js). data/ only keeps the server's secrets:
// session signing key, backup encryption key, the one-time host setup code, and archived JSON from older versions.
const DATA_DIR = path.join(process.cwd(), 'data');
const SECRET_FILE = path.join(DATA_DIR, '.session_secret');
const SETUP_CODE_FILE = path.join(DATA_DIR, '.host_setup_code');
const SESSION_COOKIE_NAME = 'fintrack_session';
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days (reduced from 30 days for security)
// PIN unlock cookie: proves the PIN (or account password) was entered recently on this browser
const UNLOCK_COOKIE_NAME = 'fintrack_unlock';
const UNLOCK_MAX_AGE = 12 * 60 * 60; // 12 hours

let sessionSecretCache = null;

/**
 * Create data/ with owner-only permissions (0700) and tighten the secret files in it (0600).
 */
let dataDirsReady = false;
export async function ensureDataDirs() {
    if (dataDirsReady) return;
    await fs.mkdir(DATA_DIR, { recursive: true, mode: 0o700 });
    await fs.chmod(DATA_DIR, 0o700).catch(() => {});
    const entries = await fs.readdir(DATA_DIR, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
        if (entry.isFile()) await fs.chmod(path.join(DATA_DIR, entry.name), 0o600).catch(() => {});
    }
    dataDirsReady = true;
}

async function getSessionSecret() {
    if (process.env.APP_SESSION_SECRET) {
        const envSecret = process.env.APP_SESSION_SECRET.trim();
        if (envSecret.length < 32) {
            throw new Error('APP_SESSION_SECRET must be at least 32 characters');
        }
        return envSecret;
    }
    if (sessionSecretCache) {
        return sessionSecretCache;
    }
    try {
        await ensureDataDirs();
        const secret = await fs.readFile(SECRET_FILE, 'utf-8').catch(() => null);
        if (secret && secret.trim().length >= 32) {
            sessionSecretCache = secret.trim();
            return sessionSecretCache;
        }
        const newSecret = crypto.randomBytes(32).toString('hex');
        await fs.writeFile(SECRET_FILE, newSecret, { encoding: 'utf-8', mode: 0o600 });
        sessionSecretCache = newSecret;
        return newSecret;
    } catch (err) {
        console.error('Critical security error: Unable to read/create session secret:', err);
        throw new Error('Unable to obtain a secure session secret');
    }
}

// Async scrypt runs on libuv's thread pool: scryptSync would freeze every other request while hashing
const scryptAsync = promisify(crypto.scrypt);

export async function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
    const hash = (await scryptAsync(String(password), salt, 32)).toString('hex');
    return { salt, hash };
}

export async function verifyPassword(password, salt, hash) {
    if (!salt || !hash) return false;
    try {
        const candidate = await scryptAsync(String(password), salt, 32);
        const expected = Buffer.from(hash, 'hex');
        return expected.length === candidate.length && crypto.timingSafeEqual(candidate, expected);
    } catch {
        return false;
    }
}

export async function createSessionToken(payload) {
    const secret = await getSessionSecret();
    const dataStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto.createHmac('sha256', secret).update(dataStr).digest('base64url');
    return `${dataStr}.${signature}`;
}

export async function verifySessionToken(token) {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [dataStr, signature] = parts;
    const secret = await getSessionSecret();
    const expectedSig = crypto.createHmac('sha256', secret).update(dataStr).digest('base64url');
    if (signature.length !== expectedSig.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
        return null;
    }
    try {
        const payload = JSON.parse(Buffer.from(dataStr, 'base64url').toString('utf-8'));
        if (!payload.exp || Date.now() > payload.exp) {
            return null; // Missing expiry or expired
        }
        return payload;
    } catch {
        return null;
    }
}

export const CLEAN_USER_PLANNER = {
    monthlyIncome: 0,
    needsPercent: 50,
    wantsPercent: 30,
    savingsPercent: 20,
    emergencyPercent: 0,
    notes: '',
};

export const CLEAN_SIMULATOR_CONFIG = {
    spendingCategories: [],
    projectionMonths: 12,
    savingsAmount: 0,
    savingsInterestRate: 5.5,
    investmentAmount: 0,
    investmentRateScenario: 8.5,
    customInvestRate: '8.5',
    hasExternalLoan: false,
    externalLoans: [],
};

export function getDefaultUserData(username = '') {
    const now = new Date();
    return {
        wallets: [
            {
                id: `wal-${Date.now()}-1`,
                name: 'Tiền mặt',
                type: 'CASH',
                balance: 0,
                initialBalance: 0,
                currency: 'VND',
                color: '#10b981',
                icon: 'Banknote',
                createdAt: now.toISOString(),
            },
            {
                id: `wal-${Date.now()}-2`,
                name: 'Tài khoản ngân hàng',
                type: 'BANK',
                balance: 0,
                initialBalance: 0,
                currency: 'VND',
                bankName: 'Ngân hàng',
                color: '#0ea5e9',
                icon: 'Building2',
                createdAt: now.toISOString(),
            }
        ],
        transactions: [],
        categories: DEFAULT_CATEGORIES,
        budgets: [],
        bills: [],
        goals: [],
        planner: CLEAN_USER_PLANNER,
        currentMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
        simulatorConfig: CLEAN_SIMULATOR_CONFIG,
        userProfile: {
            name: username || 'Người dùng',
            email: '',
            phone: '',
            role: 'Khách',
            membership: 'Thành viên mới',
            joinedDate: `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`,
            avatarColor: '#10b981',
        },
        updatedAt: now.toISOString(),
    };
}

/**
 * Make sure the database is reachable and migrated, older JSON data is imported, and the host account exists.
 * Runs once per process (concurrent callers share the same promise; a failure is retried on the next call).
 */
let readyPromise = null;
export function ensureReady() {
    if (!readyPromise) {
        readyPromise = (async () => {
            await ensureDataDirs();
            await getPool();
            await importLegacyJsonIfNeeded(DATA_DIR, { defaultUserData: getDefaultUserData });
            await ensureHostUser();
        })().catch((err) => {
            readyPromise = null;
            throw err;
        });
    }
    return readyPromise;
}

async function ensureHostUser() {
    let host = await getHostUser();
    if (!host) {
        let salt = '';
        let hash = '';
        const pw = process.env.APP_PASSWORD || '';
        if (pw && pw.length < 8) console.warn('APP_PASSWORD is shorter than 8 characters and was ignored');
        if (pw.length >= 8) ({ salt, hash } = await hashPassword(pw));
        // A concurrent start may create it first: createUserWithData then returns null and we re-read
        await createUserWithData({
            id: 'admin',
            username: 'admin',
            role: 'host',
            hasPassword: Boolean(hash),
            salt,
            passwordHash: hash,
            tokenVersion: 1,
            createdAt: new Date().toISOString(),
        }, getDefaultUserData('admin'));
        host = await getHostUser();
    }
    if (host && !host.hasPassword) {
        await getHostSetupCode();
    }
}

/**
 * One-time code required to set the host password from the web UI (when APP_PASSWORD is not used).
 * Stored in data/.host_setup_code (0600) and printed to the server console, so only someone with
 * access to the host machine can claim the admin account - not whoever opens the tunnel URL first.
 */
export async function getHostSetupCode() {
    await ensureDataDirs();
    const existing = await fs.readFile(SETUP_CODE_FILE, 'utf-8').catch(() => '');
    if (/^[A-Z0-9]{8}$/.test(existing.trim())) {
        return existing.trim();
    }
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = crypto.randomBytes(8);
    const code = Array.from(bytes, b => alphabet[b % alphabet.length]).join('');
    await fs.writeFile(SETUP_CODE_FILE, code, { encoding: 'utf-8', mode: 0o600 });
    console.log('==================================================================');
    console.log(`[FinTrack] Ma thiet lap mat khau host (admin): ${code}`);
    console.log(`[FinTrack] Host setup code (admin): ${code}  (also in data/.host_setup_code)`);
    console.log('==================================================================');
    return code;
}

export async function verifyHostSetupCode(code) {
    const expected = await fs.readFile(SETUP_CODE_FILE, 'utf-8').catch(() => '');
    if (!expected.trim() || typeof code !== 'string') return false;
    const a = crypto.createHash('sha256').update(code.trim().toUpperCase()).digest();
    const b = crypto.createHash('sha256').update(expected.trim()).digest();
    return crypto.timingSafeEqual(a, b);
}

export async function consumeHostSetupCode() {
    await fs.unlink(SETUP_CODE_FILE).catch(() => {});
}

/**
 * Signed-in user from the session cookie, or null when there is no valid session.
 * Database errors are NOT turned into "signed out": they propagate so the caller answers 503 instead of
 * showing the sign-in screen to someone whose session is fine.
 */
export async function getSessionUser() {
    let session;
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
        if (!token) return null;
        session = await verifySessionToken(token);
    } catch {
        return null;
    }
    // Unlock tokens share the signing key but must never be accepted as a session
    if (!session || !session.userId || session.kind) return null;

    await ensureReady();
    const user = await getUserById(String(session.userId));
    if (!user) return null;

    // Session revocation: logout / password change increments tokenVersion and invalidates older tokens
    const currentVersion = user.tokenVersion || 1;
    if ((session.tokenVersion || 1) !== currentVersion) {
        return null;
    }

    return {
        id: user.id,
        username: user.username,
        role: user.role,
        tokenVersion: currentVersion,
    };
}

/**
 * Issue a session cookie for this user on the given response.
 */
export async function setSessionCookie(res, req, user) {
    const token = await createSessionToken({
        userId: user.id,
        username: user.username,
        role: user.role,
        tokenVersion: user.tokenVersion || 1,
        exp: Date.now() + SESSION_MAX_AGE * 1000,
    });
    res.cookies.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: isSecureRequest(req),
        sameSite: 'lax',
        maxAge: SESSION_MAX_AGE,
        path: '/',
    });
}

/** Short fingerprint of the current PIN hash: changing the PIN invalidates existing unlock cookies */
export function pinFingerprint(pinHash) {
    return crypto.createHash('sha256').update(String(pinHash || 'no-pin')).digest('base64url').slice(0, 16);
}

/**
 * Mark this browser as PIN-unlocked (httpOnly cookie) so the client never has to store the PIN or password.
 */
export async function setUnlockCookie(res, req, user, pinHash) {
    const token = await createSessionToken({
        kind: 'unlock',
        userId: user.id,
        tokenVersion: user.tokenVersion || 1,
        pin: pinFingerprint(pinHash),
        exp: Date.now() + UNLOCK_MAX_AGE * 1000,
    });
    res.cookies.set(UNLOCK_COOKIE_NAME, token, {
        httpOnly: true,
        secure: isSecureRequest(req),
        sameSite: 'strict',
        maxAge: UNLOCK_MAX_AGE,
        path: '/api',
    });
}

export async function hasValidUnlockCookie(req, user, pinHash) {
    const token = req.cookies.get(UNLOCK_COOKIE_NAME)?.value;
    const payload = await verifySessionToken(token);
    return Boolean(
        payload &&
        payload.kind === 'unlock' &&
        payload.userId === user.id &&
        (payload.tokenVersion || 1) === (user.tokenVersion || 1) &&
        payload.pin === pinFingerprint(pinHash)
    );
}

export function clearAuthCookies(res, req) {
    const secure = isSecureRequest(req);
    res.cookies.set(SESSION_COOKIE_NAME, '', { httpOnly: true, secure, sameSite: 'lax', maxAge: 0, path: '/' });
    res.cookies.set(UNLOCK_COOKIE_NAME, '', { httpOnly: true, secure, sameSite: 'strict', maxAge: 0, path: '/api' });
}

export { SESSION_COOKIE_NAME, SESSION_MAX_AGE, DATA_DIR };
