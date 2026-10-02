import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import {
    INITIAL_WALLETS,
    DEFAULT_CATEGORIES,
    INITIAL_PLANNER,
    INITIAL_SIMULATOR_CONFIG
} from './mock-data';

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
const SESSION_COOKIE_NAME = 'fintrack_session';
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

let sessionSecretCache = null;

async function getSessionSecret() {
    if (process.env.APP_SESSION_SECRET) {
        return process.env.APP_SESSION_SECRET;
    }
    if (sessionSecretCache) {
        return sessionSecretCache;
    }
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        const secret = await fs.readFile(SECRET_FILE, 'utf-8').catch(() => null);
        if (secret && secret.trim().length >= 32) {
            sessionSecretCache = secret.trim();
            return sessionSecretCache;
        }
        const newSecret = crypto.randomBytes(32).toString('hex');
        await fs.writeFile(SECRET_FILE, newSecret, 'utf-8').catch(() => {});
        sessionSecretCache = newSecret;
        return newSecret;
    } catch {
        sessionSecretCache = 'fintrack_pro_default_secure_secret_2026';
        return sessionSecretCache;
    }
}

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
    const hash = crypto.scryptSync(String(password), salt, 32).toString('hex');
    return { salt, hash };
}

export function verifyPassword(password, salt, hash) {
    if (!salt || !hash) return false;
    try {
        const candidate = crypto.scryptSync(String(password), salt, 32);
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
        if (payload.exp && Date.now() > payload.exp) {
            return null; // Expired
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
            role: 'Khách (Guest)',
            membership: 'Thành viên mới',
            joinedDate: `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`,
            avatarColor: '#10b981',
        },
        updatedAt: now.toISOString(),
    };
}

/**
 * Read all user accounts
 */
export async function getUsers() {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.mkdir(USERS_DIR, { recursive: true });
    try {
        const content = await fs.readFile(USERS_FILE, 'utf-8');
        return JSON.parse(content);
    } catch {
        // users.json not found -> initialize
        let initialUsers = [];
        let hasHostPassword = false;
        let hostHash = '';
        let hostSalt = '';

        if (process.env.APP_PASSWORD) {
            const h = hashPassword(process.env.APP_PASSWORD);
            hostSalt = h.salt;
            hostHash = h.hash;
            hasHostPassword = true;
        }

        const adminUser = {
            id: 'admin',
            username: 'admin',
            role: 'host',
            hasPassword: hasHostPassword,
            salt: hostSalt,
            passwordHash: hostHash,
            createdAt: new Date().toISOString(),
        };

        initialUsers.push(adminUser);
        await fs.writeFile(USERS_FILE, JSON.stringify(initialUsers, null, 2), 'utf-8').catch(() => {});

        // Ensure admin data is initialized (copy from database.json if available)
        const adminDataFile = path.join(USERS_DIR, 'admin.json');
        try {
            await fs.access(adminDataFile);
        } catch {
            // admin.json missing, copy from legacy database.json if available
            try {
                const legacy = await fs.readFile(LEGACY_DB_FILE, 'utf-8');
                await fs.writeFile(adminDataFile, legacy, 'utf-8');
            } catch {
                await fs.writeFile(adminDataFile, JSON.stringify(getDefaultUserData('admin'), null, 2), 'utf-8');
            }
        }

        return initialUsers;
    }
}

/**
 * Save user accounts
 */
export async function saveUsers(users) {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const tmp = `${USERS_FILE}.${Date.now()}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(users, null, 2), 'utf-8');
    await fs.rename(tmp, USERS_FILE);
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
        if (!session || !session.userId) return null;
        
        // Verify user still exists in registry
        const users = await getUsers();
        const user = users.find(u => u.id === session.userId);
        if (!user) return null;

        return {
            id: user.id,
            username: user.username,
            role: user.role,
        };
    } catch {
        return null;
    }
}

export { SESSION_COOKIE_NAME, SESSION_MAX_AGE, USERS_DIR, DATA_DIR, LEGACY_DB_FILE };
