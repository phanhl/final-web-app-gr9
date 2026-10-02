import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { promisify } from 'util';
import { cookies } from 'next/headers';
import { DEFAULT_CATEGORIES } from './mock-data';
import { isSecureRequest } from './request-security';

function getDataDir() {
    if (process.env.VERCEL) {
        return '/tmp/data';
    }
    return path.join(process.cwd(), 'data');
}

const DATA_DIR = getDataDir();
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const USERS_DIR = path.join(DATA_DIR, 'users');
const SECRET_FILE = path.join(DATA_DIR, '.session_secret');
const LEGACY_DB_FILE = path.join(DATA_DIR, 'database.json');
const SETUP_CODE_FILE = path.join(DATA_DIR, '.host_setup_code');
const SESSION_COOKIE_NAME = 'fintrack_session';
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days (reduced from 30 days for security)
// PIN unlock cookie: proves the PIN (or account password) was entered recently on this browser
const UNLOCK_COOKIE_NAME = 'fintrack_unlock';
const UNLOCK_MAX_AGE = 12 * 60 * 60; // 12 hours

let sessionSecretCache = null;

/**
 * Create data directories with owner-only permissions (0700) and tighten them if they already exist.
 */
let dataDirsReady = false;
export async function ensureDataDirs() {
    if (dataDirsReady) return;
    for (const dir of [DATA_DIR, USERS_DIR]) {
        await fs.mkdir(dir, { recursive: true, mode: 0o700 });
        await fs.chmod(dir, 0o700).catch(() => {});
        // Files created by older versions were world-readable (0664): tighten them once at startup
        const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
        for (const entry of entries) {
            if (entry.isFile()) {
                await fs.chmod(path.join(dir, entry.name), 0o600).catch(() => {});
            } else if (entry.isDirectory() && dir === USERS_DIR) {
                await fs.chmod(path.join(dir, entry.name), 0o700).catch(() => {});
            }
        }
    }
    dataDirsReady = true;
}

/**
 * Atomic JSON write (temp file + rename) with owner-only file permissions (0600).
 */
export async function writeJsonAtomic(filePath, data) {
    await fs.mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 });
    const tmp = `${filePath}.${process.pid}.${Date.now()}.${crypto.randomBytes(3).toString('hex')}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), { encoding: 'utf-8', mode: 0o600 });
    await fs.rename(tmp, filePath);
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
 * Read all user accounts.
 * Missing users.json -> initialize with the host account.
 * Corrupt users.json -> throw (NEVER re-initialize: that would wipe every guest and reopen host setup).
 */
export async function getUsers() {
    await ensureDataDirs();
    let content;
    try {
        content = await fs.readFile(USERS_FILE, 'utf-8');
    } catch (err) {
        if (err.code !== 'ENOENT') throw err;
        return initializeUsersOnce();
    }
    try {
        const users = JSON.parse(content);
        if (!Array.isArray(users)) throw new Error('users.json is not an array');
        return users;
    } catch (err) {
        console.error('CRITICAL: data/users.json is corrupt. Fix or restore it manually; refusing to overwrite.', err.message);
        const error = new Error('Tệp tài khoản bị hỏng, vui lòng liên hệ quản trị viên');
        error.code = 'USERS_CORRUPT';
        throw error;
    }
}

// Single in-flight initialization shared by concurrent callers. Deliberately NOT withUsersLock:
// getUsers() is called from inside that lock (register, logout...), and re-entering it would deadlock.
let initUsersPromise = null;
function initializeUsersOnce() {
    if (!initUsersPromise) {
        initUsersPromise = initializeUsers().finally(() => {
            initUsersPromise = null;
        });
    }
    return initUsersPromise;
}

async function initializeUsers() {
    // Re-check: another request may have created the file meanwhile
    try {
        return JSON.parse(await fs.readFile(USERS_FILE, 'utf-8'));
    } catch (err) {
        if (err.code !== 'ENOENT') throw err;
    }

    let hasHostPassword = false;
    let hostHash = '';
    let hostSalt = '';
    if (process.env.APP_PASSWORD) {
        if (process.env.APP_PASSWORD.length < 8) {
            console.warn('APP_PASSWORD is shorter than 8 characters and was ignored');
        } else {
            const h = await hashPassword(process.env.APP_PASSWORD);
            hostSalt = h.salt;
            hostHash = h.hash;
            hasHostPassword = true;
        }
    }

    const initialUsers = [{
        id: 'admin',
        username: 'admin',
        role: 'host',
        tokenVersion: 1,
        hasPassword: hasHostPassword,
        salt: hostSalt,
        passwordHash: hostHash,
        createdAt: new Date().toISOString(),
    }];
    await writeJsonAtomic(USERS_FILE, initialUsers);

    // Ensure admin data is initialized (copy from legacy database.json if available)
    const adminDataFile = path.join(USERS_DIR, 'admin.json');
    try {
        await fs.access(adminDataFile);
    } catch {
        try {
            const legacy = JSON.parse(await fs.readFile(LEGACY_DB_FILE, 'utf-8'));
            await writeJsonAtomic(adminDataFile, legacy);
        } catch {
            await writeJsonAtomic(adminDataFile, getDefaultUserData('admin'));
        }
    }

    if (!hasHostPassword) {
        await getHostSetupCode();
    }
    return initialUsers;
}

/**
 * Save user accounts. Callers that read-modify-write must hold withUsersLock.
 */
export async function saveUsers(users) {
    await ensureDataDirs();
    await writeJsonAtomic(USERS_FILE, users);
}

// Serializes read-modify-write cycles on users.json so concurrent requests cannot drop each other's changes
let usersLock = Promise.resolve();
export function withUsersLock(fn) {
    const run = usersLock.then(fn, fn);
    usersLock = run.catch(() => {});
    return run;
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
 * Get data file path for a specific user
 */
export function getUserDataFilePath(userId) {
    const safeId = String(userId).replace(/[^a-zA-Z0-9_-]/g, '');
    return path.join(USERS_DIR, `${safeId}.json`);
}

/**
 * Retrieve active session user from request cookies
 */
export async function getSessionUser() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
        if (!token) return null;
        const session = await verifySessionToken(token);
        // Unlock tokens share the signing key but must never be accepted as a session
        if (!session || !session.userId || session.kind) return null;
        
        // Verify user still exists in registry
        const users = await getUsers();
        const user = users.find(u => u.id === session.userId);
        if (!user) return null;

        // Session Revocation: if tokenVersion was incremented (e.g. after logout or password change), invalidate token
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
    } catch {
        return null;
    }
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

export { SESSION_COOKIE_NAME, SESSION_MAX_AGE, USERS_DIR, DATA_DIR, LEGACY_DB_FILE };
