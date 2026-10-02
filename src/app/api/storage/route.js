import { NextResponse } from 'next/server';
import { recomputeWalletBalances } from '@/lib/utils';
import {
    encryptSecureBackup,
    decryptSecureBackup,
    isValidSecureBackupId,
} from '@/lib/secure-backup';
import { validateBackupData } from '@/lib/backup-validation';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { INITIAL_WALLETS, INITIAL_TRANSACTIONS, INITIAL_BUDGETS, INITIAL_BILLS, INITIAL_GOALS, INITIAL_PLANNER, DEFAULT_CATEGORIES, INITIAL_SIMULATOR_CONFIG, } from '@/lib/mock-data';
import {
    getSessionUser,
    getUserDataFilePath,
    getDefaultUserData,
    USERS_DIR
} from '@/lib/auth-server';

let inMemoryData = null;
// Promise chain to serialize write operations so concurrent POST requests do not interleave into the same file
let writeQueue = Promise.resolve();
let lastCorruptBackup = { fingerprint: '', path: '' };
const MAX_PAYLOAD_BYTES = 20 * 1024 * 1024;
const ARRAY_FIELDS = ['wallets', 'transactions', 'categories', 'budgets', 'bills', 'goals'];
// Only persist recognized data fields; unknown client fields (isReset, security...) are ignored
const DATA_FIELDS = [...ARRAY_FIELDS, 'planner', 'currentMonth', 'userProfile', 'simulatorConfig'];
const PIN_PATTERN = /^\d{4,8}$/;
const NO_CACHE_HEADERS = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
};
function getDataDir() {
    if (process.env.VERCEL) {
        return '/tmp/data';
    }
    return path.join(process.cwd(), 'data');
}
const DATA_DIR = getDataDir();
const DB_FILE = path.join(DATA_DIR, 'database.json');

async function resolveStorageTarget() {
    try {
        const sessionUser = await getSessionUser();
        if (sessionUser) {
            if (sessionUser.role === 'host' || sessionUser.id === 'admin') {
                const adminFile = path.join(USERS_DIR, 'admin.json');
                try {
                    await fs.access(adminFile);
                    return { filePath: adminFile, user: sessionUser };
                } catch {
                    return { filePath: DB_FILE, user: sessionUser };
                }
            }
            return { filePath: getUserDataFilePath(sessionUser.id), user: sessionUser };
        }
    } catch (e) {
        console.warn('Failed to resolve session user:', e);
    }
    return { filePath: DB_FILE, user: null };
}

function getDefaultData() {
    const now = new Date();
    return {
        wallets: INITIAL_WALLETS,
        transactions: INITIAL_TRANSACTIONS,
        categories: DEFAULT_CATEGORIES,
        budgets: INITIAL_BUDGETS,
        bills: INITIAL_BILLS,
        goals: INITIAL_GOALS,
        planner: INITIAL_PLANNER,
        currentMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
        simulatorConfig: INITIAL_SIMULATOR_CONFIG,
        updatedAt: now.toISOString(),
    };
}
/**
 * Atomic file write: write to temporary file then rename, preventing truncated files if process aborts
 */
async function atomicWriteJSON(filePath, data) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const tmpFile = `${filePath}.${process.pid}.${Date.now()}.${crypto.randomBytes(3).toString('hex')}.tmp`;
    await fs.writeFile(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
    await fs.rename(tmpFile, filePath);
}
async function persist(filePath, data) {
    try {
        await atomicWriteJSON(filePath, data);
        inMemoryData = null;
    }
    catch (fsErr) {
        // Fallback to in-memory storage only on read-only serverless filesystems (e.g., Vercel)
        if (!process.env.VERCEL)
            throw fsErr;
        console.warn('Filesystem write not available, keeping in memory:', fsErr);
        inMemoryData = data;
    }
}
/**
 * Read DB according to target. Returns null if file does not exist.
 * Throws on corrupt file (DO NOT overwrite, to allow manual recovery).
 */
async function readDatabase(target) {
    const filePath = target.filePath;
    let content;
    try {
        content = await fs.readFile(filePath, 'utf-8');
    }
    catch (err) {
        if (err.code === 'ENOENT') {
            if (target.user) {
                const initial = getDefaultUserData(target.user.username);
                await persist(filePath, initial);
                return initial;
            }
            return inMemoryData;
        }
        throw err;
    }
    try {
        return JSON.parse(content);
    }
    catch (parseErr) {
        // Back up corrupt file to preserve data, never overwrite with template data.
        // Back up each corrupt version only once during client polling.
        const stat = await fs.stat(filePath).catch(() => null);
        const fingerprint = `${stat?.mtimeMs}:${stat?.size}`;
        if (lastCorruptBackup.fingerprint !== fingerprint) {
            const backupPath = `${filePath}.corrupt-${Date.now()}`;
            await fs.copyFile(filePath, backupPath).catch(() => { });
            lastCorruptBackup = { fingerprint, path: backupPath };
        }
        const backup = lastCorruptBackup.path;
        const error = new Error(`${path.basename(filePath)} bị hỏng, đã sao lưu sang ${path.basename(backup)}`);
        error.code = 'DB_CORRUPT';
        throw error;
    }
}
function validatePayload(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return 'Dữ liệu không hợp lệ';
    }
    for (const field of ARRAY_FIELDS) {
        if (payload[field] !== undefined && !Array.isArray(payload[field])) {
            return `Trường "${field}" phải là mảng`;
        }
    }
    if (!Array.isArray(payload.wallets) || !Array.isArray(payload.transactions)) {
        return 'Thiếu dữ liệu ví hoặc giao dịch';
    }

    const walletIds = new Set();

    for (let i = 0; i < payload.wallets.length; i++) {
        const w = payload.wallets[i];

        if (
            !w ||
            typeof w !== 'object' ||
            Array.isArray(w) ||
            typeof w.id !== 'string' ||
            !w.id.trim()
        ) {
            return `Ví tại vị trí ${i} không hợp lệ`;
        }

        if (walletIds.has(w.id)) {
            return `Ví bị trùng ID: ${w.id}`;
        }

        walletIds.add(w.id);

        const balance = Number(w.balance);

        if (
            w.balance === null ||
            w.balance === '' ||
            !Number.isFinite(balance)
        ) {
            return `Số dư của ví tại vị trí ${i} không hợp lệ`;
        }
    }

    const transactionIds = new Set();

    for (let i = 0; i < payload.transactions.length; i++) {
        const tx = payload.transactions[i];

        if (
            !tx ||
            typeof tx !== 'object' ||
            Array.isArray(tx) ||
            typeof tx.id !== 'string' ||
            !tx.id.trim()
        ) {
            return `Giao dịch tại vị trí ${i} không hợp lệ`;
        }

        if (transactionIds.has(tx.id)) {
            return `Giao dịch bị trùng ID: ${tx.id}`;
        }

        transactionIds.add(tx.id);

        if (!['INCOME', 'EXPENSE', 'TRANSFER'].includes(tx.type)) {
            return `Loại giao dịch của ${tx.id} không hợp lệ`;
        }

        const amount = Number(tx.amount);

        if (
            tx.amount === null ||
            tx.amount === '' ||
            !Number.isFinite(amount) ||
            amount <= 0
        ) {
            return `Số tiền giao dịch tại vị trí ${i} không hợp lệ`;
        }

        if (tx.walletId !== undefined) {
            if (
                typeof tx.walletId !== 'string' ||
                !walletIds.has(tx.walletId)
            ) {
                return `Giao dịch ${tx.id} tham chiếu ví không tồn tại`;
            }
        }

        if (tx.toWalletId !== undefined) {
            if (
                typeof tx.toWalletId !== 'string' ||
                !walletIds.has(tx.toWalletId)
            ) {
                return `Giao dịch ${tx.id} tham chiếu ví đích không tồn tại`;
            }
        }
        
        if (tx.type === 'TRANSFER') {
            if (typeof tx.walletId !== 'string' || !walletIds.has(tx.walletId)) {
                return `Giao dịch chuyển khoản ${tx.id} thiếu ví nguồn hợp lệ`;
            }

            if (typeof tx.toWalletId !== 'string' || !walletIds.has(tx.toWalletId)) {
                return `Giao dịch chuyển khoản ${tx.id} thiếu ví đích hợp lệ`;
            }

            if (tx.walletId === tx.toWalletId) {
                return `Giao dịch chuyển khoản ${tx.id} không thể chuyển trong cùng một ví`;
            }

            const fee = Number(tx.fee);

            if (
                tx.fee !== undefined &&
                (
                    tx.fee === null ||
                    tx.fee === '' ||
                    !Number.isFinite(fee) ||
                    fee < 0
                )
            ) {
                return `Phí chuyển khoản của giao dịch ${tx.id} không hợp lệ`;
            }
        }
    }

    return null;
}
function pickDataFields(source) {
    const out = {};
    for (const field of DATA_FIELDS) {
        if (source?.[field] !== undefined)
            out[field] = source[field];
    }
    return out;
}
// -------------------------------------------------------------
// PIN: hashed using scrypt + salt, constant-time comparison, rate-limited failed attempts
// -------------------------------------------------------------
function hashPin(pin, salt = crypto.randomBytes(16).toString('hex')) {
    const hash = crypto.scryptSync(String(pin), salt, 32).toString('hex');
    return { salt, hash };
}
function verifyPinHash(pin, salt, hash) {
    if (!salt || !hash)
        return false;
    const candidate = crypto.scryptSync(String(pin), salt, 32);
    const expected = Buffer.from(hash, 'hex');
    return expected.length === candidate.length && crypto.timingSafeEqual(candidate, expected);
}
function safeEqualString(a, b) {
    const ha = crypto.createHash('sha256').update(String(a)).digest();
    const hb = crypto.createHash('sha256').update(String(b)).digest();
    return crypto.timingSafeEqual(ha, hb);
}
/** Normalize security schema in DB: migrate legacy plaintext PIN to hashed form */
function normalizeSecurity(security) {
    const sec = security && typeof security === 'object' ? security : {};
    let { pinSalt, pinHash } = sec;
    if (!pinHash && sec.pinCode) {
        ({ salt: pinSalt, hash: pinHash } = hashPin(sec.pinCode));
    }
    return {
        pinEnabled: Boolean(sec.pinEnabled) && Boolean(pinHash),
        pinSalt: pinHash ? pinSalt : undefined,
        pinHash: pinHash || undefined,
    };
}
function publicSecurity(security) {
    const sec = normalizeSecurity(security);
    return {
        pinEnabled: Boolean(process.env.APP_PIN) || sec.pinEnabled,
        hasPin: Boolean(process.env.APP_PIN) || Boolean(sec.pinHash),
        managedByEnv: Boolean(process.env.APP_PIN),
    };
}
const FAIL_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS_PER_IP = 5;
const MAX_FAILS_GLOBAL = 30;
const failedAttempts = new Map(); // ip -> { count, first }
let globalFails = { count: 0, first: 0 };
function getClientIp(req) {
    return (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'local';
}
function isRateLimited(ip) {
    const now = Date.now();
    if (now - globalFails.first > FAIL_WINDOW_MS)
        globalFails = { count: 0, first: now };
    const entry = failedAttempts.get(ip);
    if (entry && now - entry.first > FAIL_WINDOW_MS)
        failedAttempts.delete(ip);
    return (failedAttempts.get(ip)?.count || 0) >= MAX_FAILS_PER_IP || globalFails.count >= MAX_FAILS_GLOBAL;
}
function recordFailure(ip) {
    const now = Date.now();
    const entry = failedAttempts.get(ip);
    if (!entry || now - entry.first > FAIL_WINDOW_MS)
        failedAttempts.set(ip, { count: 1, first: now });
    else
        entry.count++;
    if (now - globalFails.first > FAIL_WINDOW_MS)
        globalFails = { count: 1, first: now };
    else
        globalFails.count++;
}
/**
 * Access control check. PIN is only accepted via x-app-pin header (omitted from URL to prevent log leakage).
 * Returns null if authorized, or error NextResponse.
 */
function checkAuth(req, currentData, user) {
    const envPin = process.env.APP_PIN;
    const sec = normalizeSecurity(currentData?.security);

    // If user is authenticated via session (Guest or Host):
    if (user) {
        if (!sec.pinEnabled) {
            return null;
        }
    } else {
        if (!envPin && !sec.pinEnabled)
            return null;
    }

    const ip = getClientIp(req);
    if (isRateLimited(ip)) {
        return NextResponse.json({ success: false, requiresPin: true, code: 'RATE_LIMITED', error: 'Nhập sai PIN quá nhiều lần, vui lòng thử lại sau 15 phút' }, { status: 429, headers: NO_CACHE_HEADERS });
    }
    const provided = req.headers.get('x-app-pin');
    if (provided) {
        const ok = (!user && envPin) ? safeEqualString(provided, envPin) : verifyPinHash(provided, sec.pinSalt, sec.pinHash);
        if (ok) {
            failedAttempts.delete(ip);
            return null;
        }
        recordFailure(ip);
    }
    return NextResponse.json({ success: false, requiresPin: true, code: 'PIN_REQUIRED', error: 'Yêu cầu mã PIN bảo mật chính xác để truy cập dữ liệu FinTrack' }, { status: 401, headers: NO_CACHE_HEADERS });
}
function toClientData(data) {
    const { security, ...rest } = data;
    return { ...rest, security: publicSecurity(security) };
}
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export async function GET(req) {
    try {
        const url = new URL(req.url);
        const target = await resolveStorageTarget();

        if (url.searchParams.get('action') === 'secureBackups') {
            const current = await readDatabase(target);
            const authError = checkAuth(req, current, target.user);
            if (authError) return authError;
            const backups = await listSecureBackups(target);
            return NextResponse.json({ success: true, backups }, { headers: NO_CACHE_HEADERS });
        }

        let data = await readDatabase(target);
        const authError = checkAuth(req, data, target.user);
        if (authError)
            return authError;
        if (!data) {
            data = target.user ? getDefaultUserData(target.user.username) : getDefaultData();
            await persist(target.filePath, data);
        }
        return NextResponse.json({ success: true, data: toClientData(data) }, { headers: NO_CACHE_HEADERS });
    }
    catch (error) {
        console.error('API /api/storage GET Error:', error);
        // Do not return fallback sample data here: client retains its local state rather than being overwritten with dummy data
        return NextResponse.json({ success: false, error: error.message || 'Không đọc được dữ liệu' }, { status: 500, headers: NO_CACHE_HEADERS });
    }
}
const MAX_SECURE_BACKUPS = 20;

function getSecureBackupDir(target) {
    if (target?.user && target.user.role === 'guest') {
        return path.join(USERS_DIR, target.user.id, 'secure-backups');
    }
    return path.join(DATA_DIR, 'secure-backups');
}

async function atomicWriteBuffer(filePath, buffer) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const tmpFile = `${filePath}.${process.pid}.${Date.now()}.${crypto.randomBytes(3).toString('hex')}.tmp`;
    await fs.writeFile(tmpFile, buffer, { mode: 0o600 });
    await fs.rename(tmpFile, filePath);
}

async function listSecureBackups(target) {
    const dir = getSecureBackupDir(target);
    await fs.mkdir(dir, { recursive: true });
    const files = await fs.readdir(dir).catch(() => []);
    const backups = [];

    for (const file of files) {
        if (!isValidSecureBackupId(file)) continue;
        const filePath = path.join(dir, file);
        try {
            const stat = await fs.stat(filePath);
            if (!stat.isFile()) continue;
            backups.push({
                id: file,
                createdAt: (stat.birthtimeMs ? stat.birthtime : stat.mtime).toISOString(),
                size: stat.size,
            });
        } catch {
            // Skip deleted or inaccessible file
        }
    }

    backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return backups;
}

async function pruneSecureBackups(target) {
    const backups = await listSecureBackups(target);
    if (backups.length <= MAX_SECURE_BACKUPS) return;
    const stale = backups.slice(MAX_SECURE_BACKUPS);
    const dir = getSecureBackupDir(target);
    for (const b of stale) {
        await fs.unlink(path.join(dir, b.id)).catch(() => {});
    }
}

async function createSecureBackupFile(target, data) {
    const dir = getSecureBackupDir(target);
    await fs.mkdir(dir, { recursive: true });
    const backupId = `backup-${Date.now()}-${crypto.randomUUID()}.ftbk`;
    const filePath = path.join(dir, backupId);
    const encrypted = encryptSecureBackup(data);
    await atomicWriteBuffer(filePath, encrypted);
    await pruneSecureBackups(target);
    const stat = await fs.stat(filePath);
    return {
        id: backupId,
        createdAt: (stat.birthtimeMs ? stat.birthtime : stat.mtime).toISOString(),
        size: stat.size,
    };
}

async function readSecureBackup(target, backupId) {
    if (!isValidSecureBackupId(backupId)) {
        throw new Error('Invalid Secure Backup ID');
    }
    const dir = getSecureBackupDir(target);
    const filePath = path.join(dir, backupId);
    const encrypted = await fs.readFile(filePath);
    return decryptSecureBackup(encrypted);
}

async function deleteSecureBackupFile(target, backupId) {
    if (!isValidSecureBackupId(backupId)) {
        throw new Error('Invalid Secure Backup ID');
    }
    const dir = getSecureBackupDir(target);
    const filePath = path.join(dir, backupId);
    await fs.unlink(filePath);
}

async function handleCreateSecureBackup(req, target) {
    const current = await readDatabase(target);
    const authError = checkAuth(req, current, target.user);
    if (authError) return authError;

    const source = current || (target.user ? getDefaultUserData(target.user.username) : getDefaultData());
    const snapshot = {
        backupVersion: 1,
        createdAt: new Date().toISOString(),
        ...pickDataFields(source),
        wallets: recomputeWalletBalances(source.wallets || [], source.transactions || []),
    };

    const backup = await createSecureBackupFile(target, snapshot);
    return NextResponse.json({ success: true, backup }, { headers: NO_CACHE_HEADERS });
}

async function handleRestoreSecureBackup(req, target, backupId) {
    const current = await readDatabase(target);
    const authError = checkAuth(req, current, target.user);
    if (authError) return authError;

    let backupData;
    try {
        backupData = await readSecureBackup(target, backupId);
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const validationErrors = validateBackupData(backupData);
    if (validationErrors.length > 0) {
        return NextResponse.json({ success: false, error: 'Invalid Secure Backup format', details: validationErrors }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    let safetyBackup = null;
    if (current) {
        const safetySnapshot = {
            backupVersion: 1,
            createdAt: new Date().toISOString(),
            ...pickDataFields(current),
            wallets: recomputeWalletBalances(current.wallets || [], current.transactions || []),
        };
        safetyBackup = await createSecureBackupFile(target, safetySnapshot).catch(() => null);
    }

    const restoredWallets = recomputeWalletBalances(backupData.wallets, backupData.transactions);
    const restoredData = {
        ...pickDataFields(backupData),
        wallets: restoredWallets,
        security: normalizeSecurity(current?.security),
        updatedAt: new Date().toISOString(),
    };

    await persist(target.filePath, restoredData);
    return NextResponse.json({
        success: true,
        message: 'Secure backup restored successfully',
        updatedAt: restoredData.updatedAt,
        safetyBackup
    }, { headers: NO_CACHE_HEADERS });
}

async function handleDeleteSecureBackup(req, target, backupId) {
    const current = await readDatabase(target);
    const authError = checkAuth(req, current, target.user);
    if (authError) return authError;

    try {
        await deleteSecureBackupFile(target, backupId);
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 404, headers: NO_CACHE_HEADERS });
    }
    return NextResponse.json({ success: true }, { headers: NO_CACHE_HEADERS });
}

async function handleUpdateSecurity(req, payload, target) {
    const current = await readDatabase(target);
    const authError = checkAuth(req, current, target.user);
    if (authError)
        return authError;
    if (!target.user && process.env.APP_PIN) {
        return NextResponse.json({ success: false, code: 'PIN_ENV_MANAGED', error: 'PIN đang được quản lý bằng biến môi trường APP_PIN trên server' }, { status: 400 });
    }
    const pinCode = payload.pinCode !== undefined && payload.pinCode !== null ? String(payload.pinCode).trim() : '';
    if (pinCode && !PIN_PATTERN.test(pinCode)) {
        return NextResponse.json({ success: false, code: 'PIN_FORMAT', error: 'Mã PIN phải gồm 4-8 chữ số' }, { status: 400 });
    }
    const sec = normalizeSecurity(current?.security);
    const next = { ...sec, pinEnabled: Boolean(payload.pinEnabled) };
    if (pinCode) {
        const { salt, hash } = hashPin(pinCode);
        next.pinSalt = salt;
        next.pinHash = hash;
    }
    if (next.pinEnabled && !next.pinHash) {
        return NextResponse.json({ success: false, code: 'PIN_NOT_SET', error: 'Cần đặt mã PIN trước khi bật khóa' }, { status: 400 });
    }
    // Preserve updatedAt: security updates do not constitute data changes and avoid sync conflicts
    const dataToSave = { ...(current || (target.user ? getDefaultUserData(target.user.username) : getDefaultData())), security: next };
    await persist(target.filePath, dataToSave);
    return NextResponse.json({ success: true, security: publicSecurity(next) }, { headers: NO_CACHE_HEADERS });
}
export async function POST(req) {
    let payload;
    try {
        const raw = await req.text();
        if (raw.length > MAX_PAYLOAD_BYTES) {
            return NextResponse.json({ success: false, error: 'Dữ liệu quá lớn' }, { status: 413 });
        }
        payload = JSON.parse(raw);
    }
    catch {
        return NextResponse.json({ success: false, error: 'JSON không hợp lệ' }, { status: 400 });
    }
    const isSecurityUpdate = payload && payload.action === 'updateSecurity';
    const isSecureBackupAction = payload && (
        payload.action === 'createSecureBackup' ||
        payload.action === 'restoreSecureBackup' ||
        payload.action === 'deleteSecureBackup'
    );
    if (!isSecurityUpdate && !isSecureBackupAction) {
        const validationError = validatePayload(payload);
        if (validationError) {
            return NextResponse.json({ success: false, error: validationError }, { status: 400 });
        }
    }
    const run = async () => {
        const target = await resolveStorageTarget();
        if (isSecurityUpdate)
            return handleUpdateSecurity(req, payload, target);
        if (payload?.action === 'createSecureBackup')
            return handleCreateSecureBackup(req, target);
        if (payload?.action === 'restoreSecureBackup')
            return handleRestoreSecureBackup(req, target, payload.backupId);
        if (payload?.action === 'deleteSecureBackup')
            return handleDeleteSecureBackup(req, target, payload.backupId);
        let current = null;
        let corrupt = false;
        try {
            current = await readDatabase(target);
        }
        catch (err) {
            if (err.code !== 'DB_CORRUPT')
                throw err;
            corrupt = true;
        }
        if (corrupt && !process.env.APP_PIN && req.headers.get('x-forwarded-for')) {
            // Corrupt DB -> PIN configuration unavailable. Only allow restoration from host machine (not via public tunnel),
            // or when APP_PIN env var is defined.
            return NextResponse.json({ success: false, error: 'Dữ liệu bị hỏng (đã sao lưu). Hãy khôi phục từ máy chủ.' }, { status: 503 });
        }
        // Corrupt DB backed up -> permit client to rewrite its complete authoritative snapshot
        const authError = checkAuth(req, current, target.user);
        if (authError)
            return authError;
        // Optimistic concurrency: client must transmit baseUpdatedAt of its active server snapshot.
        // If server is newer (another device saved) -> 409 to trigger client-side 3-way merge.
        if (current?.updatedAt && payload.baseUpdatedAt !== current.updatedAt) {
            return NextResponse.json({ success: false, conflict: true, data: toClientData(current) }, { status: 409, headers: NO_CACHE_HEADERS });
        }
        
        const serverWallets = recomputeWalletBalances(
            payload.wallets,
            payload.transactions
        );

        const dataToSave = {
            ...pickDataFields(payload),
            security: normalizeSecurity(current?.security),
            updatedAt: new Date().toISOString(),
            wallets: serverWallets,
        };
        await persist(target.filePath, dataToSave);
        return NextResponse.json({
            success: true,
            message: 'Đã lưu dữ liệu',
            updatedAt: dataToSave.updatedAt,
        }, { headers: NO_CACHE_HEADERS });
    };
    const result = writeQueue.then(run, run);
    writeQueue = result.catch(() => { });
    try {
        return await result;
    }
    catch (error) {
        console.error('API /api/storage POST Error:', error);
        return NextResponse.json({ success: false, error: 'Không lưu được dữ liệu trên server' }, { status: 500 });
    }
}
