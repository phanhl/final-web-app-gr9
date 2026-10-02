import { NextResponse } from 'next/server';
import { recomputeWalletBalances } from '@/lib/utils';
import {
    encryptSecureBackup,
    decryptSecureBackup,
    isValidSecureBackupId,
} from '@/lib/secure-backup';
import { validateBackupData } from '@/lib/backup-validation';
import { validatePayload, normalizeSnapshotNumbers, ARRAY_FIELDS } from '@/lib/storage-validation';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { promisify } from 'util';
import {
    getSessionUser,
    getDefaultUserData,
    getUsers,
    verifyPassword,
    writeJsonAtomic,
    setUnlockCookie,
    hasValidUnlockCookie,
    USERS_DIR,
    DATA_DIR,
} from '@/lib/auth-server';
import { resolveUserDataFile, withDataWriteQueue } from '@/lib/user-data';
import { getClientIp, isLocalRequest, createRateLimiter, readBodyWithLimit } from '@/lib/request-security';
import { logSecurityEvent } from '@/lib/security-logger';

// Fallback store per data file, used only when the filesystem is read-only (serverless). Never shared between users.
const inMemoryData = new Map();
const lastCorruptBackups = new Map(); // filePath -> { fingerprint, path }
const MAX_PAYLOAD_BYTES = 20 * 1024 * 1024;
// Only persist recognized data fields; unknown client fields (isReset, security...) are ignored
const DATA_FIELDS = [...ARRAY_FIELDS, 'planner', 'currentMonth', 'userProfile', 'simulatorConfig'];
const PIN_PATTERN = /^\d{4,8}$/;
const NO_CACHE_HEADERS = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
};

/**
 * Resolve the data file of the signed-in user. Returns null when there is no valid session.
 */
async function resolveStorageTarget() {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return null;
    return { filePath: await resolveUserDataFile(sessionUser), user: sessionUser };
}

function unauthorizedResponse(req) {
    logSecurityEvent({
        event: 'UNAUTHORIZED_STORAGE_ACCESS',
        ip: getClientIp(req),
        success: false,
        details: { reason: 'NO_VALID_SESSION' }
    });
    return NextResponse.json({
        success: false,
        code: 'UNAUTHORIZED',
        error: 'Yêu cầu đăng nhập tài khoản để truy cập dữ liệu FinTrack'
    }, { status: 401, headers: NO_CACHE_HEADERS });
}

async function persist(filePath, data) {
    try {
        await writeJsonAtomic(filePath, data);
        inMemoryData.delete(filePath);
    }
    catch (fsErr) {
        // Fallback to in-memory storage only on read-only serverless filesystems (e.g., Vercel)
        if (!process.env.VERCEL)
            throw fsErr;
        console.warn('Filesystem write not available, keeping in memory:', fsErr);
        inMemoryData.set(filePath, data);
    }
}
/**
 * Read the user's DB. Creates the default dataset when the file does not exist yet.
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
            if (inMemoryData.has(filePath)) return inMemoryData.get(filePath);
            const initial = getDefaultUserData(target.user.username);
            await persist(filePath, initial);
            return initial;
        }
        throw err;
    }
    let data;
    try {
        data = JSON.parse(content);
    }
    catch {
        // Back up corrupt file to preserve data, never overwrite with template data.
        // Back up each corrupt version only once during client polling.
        const stat = await fs.stat(filePath).catch(() => null);
        const fingerprint = `${stat?.mtimeMs}:${stat?.size}`;
        let last = lastCorruptBackups.get(filePath);
        if (!last || last.fingerprint !== fingerprint) {
            const backupPath = `${filePath}.corrupt-${Date.now()}`;
            await fs.copyFile(filePath, backupPath).catch(err => {
                console.error('Failed to backup corrupt database file:', err);
            });
            last = { fingerprint, path: backupPath };
            lastCorruptBackups.set(filePath, last);
        }
        const error = new Error(`${path.basename(filePath)} bị hỏng, đã sao lưu sang ${path.basename(last.path)}`);
        error.code = 'DB_CORRUPT';
        throw error;
    }
    // Legacy files kept the PIN in plaintext: hash it once and persist, so the plaintext leaves the disk and
    // the hash (which unlock cookies are bound to) stays stable instead of being re-salted on every read.
    if (data?.security?.pinCode && !data.security.pinHash) {
        data = { ...data, security: normalizeSecurity(data.security) };
        await persist(filePath, data);
    }
    return data;
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
const scryptAsync = promisify(crypto.scrypt);
// Sync variant only for the one-time migration of legacy plaintext PINs (normalizeSecurity)
function hashPin(pin, salt = crypto.randomBytes(16).toString('hex')) {
    const hash = crypto.scryptSync(String(pin), salt, 32).toString('hex');
    return { salt, hash };
}
// Request paths use async scrypt so hashing does not block other requests
async function hashPinAsync(pin, salt = crypto.randomBytes(16).toString('hex')) {
    const hash = (await scryptAsync(String(pin), salt, 32)).toString('hex');
    return { salt, hash };
}
async function verifyPinHash(pin, salt, hash) {
    if (!salt || !hash)
        return false;
    const candidate = await scryptAsync(String(pin), salt, 32);
    const expected = Buffer.from(hash, 'hex');
    return expected.length === candidate.length && crypto.timingSafeEqual(candidate, expected);
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
        pinEnabled: sec.pinEnabled,
        hasPin: Boolean(sec.pinHash),
    };
}
const FAIL_WINDOW_MS = 15 * 60 * 1000;
// Per-IP limit stops casual guessing; per-account limit stops guessing spread across many (spoofed) IPs
const pinIpLimiter = createRateLimiter({ windowMs: FAIL_WINDOW_MS, max: 5 });
const pinUserLimiter = createRateLimiter({ windowMs: FAIL_WINDOW_MS, max: 10 });

/**
 * Access control check for a signed-in user.
 * When PIN lock is enabled, accepts either a valid unlock cookie or the PIN / account password in the x-app-pin header.
 * Returns { error } (a NextResponse) or { grantUnlock } telling the caller to issue a fresh unlock cookie.
 */
async function checkAuth(req, currentData, user) {
    const sec = normalizeSecurity(currentData?.security);
    if (!sec.pinEnabled) {
        return {};
    }
    if (await hasValidUnlockCookie(req, user, sec.pinHash)) {
        return {};
    }

    const ip = getClientIp(req);
    if (pinIpLimiter.isLimited(ip) || pinUserLimiter.isLimited(user.id)) {
        logSecurityEvent({ event: 'PIN_RATE_LIMITED', userId: user.id, ip, success: false });
        return { error: NextResponse.json({ success: false, requiresPin: true, code: 'RATE_LIMITED', error: 'Nhập sai PIN quá nhiều lần, vui lòng thử lại sau 15 phút' }, { status: 429, headers: NO_CACHE_HEADERS }) };
    }

    const provided = req.headers.get('x-app-pin');
    if (provided && provided.length <= 256) {
        // Count the guess before checking it (atomic), forgive it on success: parallel guesses cannot exceed the limit
        if (!pinIpLimiter.consume(ip) || !pinUserLimiter.consume(user.id)) {
            logSecurityEvent({ event: 'PIN_RATE_LIMITED', userId: user.id, ip, success: false });
            return { error: NextResponse.json({ success: false, requiresPin: true, code: 'RATE_LIMITED', error: 'Nhập sai PIN quá nhiều lần, vui lòng thử lại sau 15 phút' }, { status: 429, headers: NO_CACHE_HEADERS }) };
        }
        let ok = await verifyPinHash(provided, sec.pinSalt, sec.pinHash);
        let via = 'PIN';
        if (!ok) {
            // Dual validation: also allow unlocking with user's account password
            try {
                const users = await getUsers();
                const dbUser = users.find(u => u.id === user.id);
                ok = Boolean(dbUser && dbUser.passwordHash && await verifyPassword(provided, dbUser.salt, dbUser.passwordHash));
                via = 'PASSWORD';
            } catch (e) {
                console.warn('Fallback password check error in checkAuth:', e);
            }
        }
        if (ok) {
            pinIpLimiter.reset(ip);
            pinUserLimiter.reset(user.id);
            logSecurityEvent({ event: via === 'PIN' ? 'PIN_AUTH_SUCCESS' : 'PIN_AUTH_SUCCESS_VIA_PASSWORD', userId: user.id, ip, success: true });
            return { grantUnlock: true };
        }
        logSecurityEvent({ event: 'PIN_AUTH_FAILED', userId: user.id, ip, success: false });
    }
    return { error: NextResponse.json({ success: false, requiresPin: true, code: 'PIN_REQUIRED', error: 'Yêu cầu mã PIN bảo mật chính xác để truy cập dữ liệu FinTrack' }, { status: 401, headers: NO_CACHE_HEADERS }) };
}
/** Attach an unlock cookie after a successful PIN entry so the browser does not need to keep the PIN */
async function withUnlock(res, req, target, auth, security) {
    if (auth?.grantUnlock) {
        await setUnlockCookie(res, req, target.user, normalizeSecurity(security).pinHash);
    }
    return res;
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
        if (!target) return unauthorizedResponse(req);

        if (url.searchParams.get('action') === 'secureBackups') {
            const current = await readDatabase(target);
            const auth = await checkAuth(req, current, target.user);
            if (auth.error) return auth.error;
            const backups = await listSecureBackups(target);
            return withUnlock(NextResponse.json({ success: true, backups }, { headers: NO_CACHE_HEADERS }), req, target, auth, current?.security);
        }

        const data = await readDatabase(target);
        const auth = await checkAuth(req, data, target.user);
        if (auth.error)
            return auth.error;
        return withUnlock(NextResponse.json({ success: true, data: toClientData(data) }, { headers: NO_CACHE_HEADERS }), req, target, auth, data?.security);
    }
    catch (error) {
        console.error('API /api/storage GET Error:', error);
        // Do not return fallback sample data here: client retains its local state rather than being overwritten with dummy data
        const message = error.code === 'DB_CORRUPT' ? error.message : 'Không đọc được dữ liệu';
        return NextResponse.json({ success: false, error: message }, { status: 500, headers: NO_CACHE_HEADERS });
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
    await fs.mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 });
    const tmpFile = `${filePath}.${process.pid}.${Date.now()}.${crypto.randomBytes(3).toString('hex')}.tmp`;
    await fs.writeFile(tmpFile, buffer, { mode: 0o600 });
    await fs.rename(tmpFile, filePath);
}

async function listSecureBackups(target) {
    const dir = getSecureBackupDir(target);
    await fs.mkdir(dir, { recursive: true, mode: 0o700 });
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
        await fs.unlink(path.join(dir, b.id)).catch(err => {
            console.error('Failed to clean up expired backup:', b.id, err);
        });
    }
}

async function createSecureBackupFile(target, data) {
    const dir = getSecureBackupDir(target);
    await fs.mkdir(dir, { recursive: true, mode: 0o700 });
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
    const auth = await checkAuth(req, current, target.user);
    if (auth.error) return auth.error;

    const source = current || getDefaultUserData(target.user.username);
    const snapshot = {
        backupVersion: 1,
        createdAt: new Date().toISOString(),
        ...pickDataFields(source),
        wallets: recomputeWalletBalances(source.wallets || [], source.transactions || []),
    };

    const backup = await createSecureBackupFile(target, snapshot);
    logSecurityEvent({
        event: 'SECURE_BACKUP_CREATED',
        userId: target.user.id,
        ip: getClientIp(req),
        success: true,
        details: { backupId: backup.id }
    });
    return withUnlock(NextResponse.json({ success: true, backup }, { headers: NO_CACHE_HEADERS }), req, target, auth, current?.security);
}

async function handleRestoreSecureBackup(req, target, backupId) {
    const current = await readDatabase(target);
    const auth = await checkAuth(req, current, target.user);
    if (auth.error) return auth.error;

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
        safetyBackup = await createSecureBackupFile(target, safetySnapshot).catch(err => {
            console.error('Failed to create safety backup during restore:', err);
            return null;
        });
    }

    backupData = normalizeSnapshotNumbers(backupData);
    const restoredWallets = recomputeWalletBalances(backupData.wallets, backupData.transactions);
    const restoredData = {
        ...pickDataFields(backupData),
        wallets: restoredWallets,
        security: normalizeSecurity(current?.security),
        updatedAt: new Date().toISOString(),
    };

    await persist(target.filePath, restoredData);
    logSecurityEvent({
        event: 'SECURE_BACKUP_RESTORED',
        userId: target.user.id,
        ip: getClientIp(req),
        success: true,
        details: { backupId }
    });
    return withUnlock(NextResponse.json({
        success: true,
        message: 'Secure backup restored successfully',
        updatedAt: restoredData.updatedAt,
        safetyBackup
    }, { headers: NO_CACHE_HEADERS }), req, target, auth, current?.security);
}

async function handleDeleteSecureBackup(req, target, backupId) {
    const current = await readDatabase(target);
    const auth = await checkAuth(req, current, target.user);
    if (auth.error) return auth.error;

    try {
        await deleteSecureBackupFile(target, backupId);
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 404, headers: NO_CACHE_HEADERS });
    }
    logSecurityEvent({
        event: 'SECURE_BACKUP_DELETED',
        userId: target.user.id,
        ip: getClientIp(req),
        success: true,
        details: { backupId }
    });
    return withUnlock(NextResponse.json({ success: true }, { headers: NO_CACHE_HEADERS }), req, target, auth, current?.security);
}

async function handleUpdateSecurity(req, payload, target) {
    const current = await readDatabase(target);
    const auth = await checkAuth(req, current, target.user);
    if (auth.error)
        return auth.error;
    const pinCode = payload.pinCode !== undefined && payload.pinCode !== null ? String(payload.pinCode).trim() : '';
    if (pinCode && !PIN_PATTERN.test(pinCode)) {
        return NextResponse.json({ success: false, code: 'PIN_FORMAT', error: 'Mã PIN phải gồm 4-8 chữ số' }, { status: 400 });
    }
    const sec = normalizeSecurity(current?.security);
    const next = { ...sec, pinEnabled: Boolean(payload.pinEnabled) };
    if (pinCode) {
        const { salt, hash } = await hashPinAsync(pinCode);
        next.pinSalt = salt;
        next.pinHash = hash;
    }
    if (next.pinEnabled && !next.pinHash) {
        return NextResponse.json({ success: false, code: 'PIN_NOT_SET', error: 'Cần đặt mã PIN trước khi bật khóa' }, { status: 400 });
    }
    // Preserve updatedAt: security updates do not constitute data changes and avoid sync conflicts
    const dataToSave = { ...(current || getDefaultUserData(target.user.username)), security: next };
    await persist(target.filePath, dataToSave);
    logSecurityEvent({
        event: 'SECURITY_CONFIG_CHANGED',
        userId: target.user.id,
        ip: getClientIp(req),
        success: true,
        details: { pinEnabled: next.pinEnabled }
    });
    const res = NextResponse.json({ success: true, security: publicSecurity(next) }, { headers: NO_CACHE_HEADERS });
    // The user is already authorized: keep this browser unlocked under the new PIN
    await setUnlockCookie(res, req, target.user, next.pinHash);
    return res;
}
export async function POST(req) {
    let payload;
    try {
        const { raw, tooLarge } = await readBodyWithLimit(req, MAX_PAYLOAD_BYTES);
        if (tooLarge) {
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
        if (!target)
            return unauthorizedResponse(req);
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
        if (corrupt && !isLocalRequest(req)) {
            // Corrupt DB -> PIN configuration unavailable. Only allow overwriting from the host machine (not via a public tunnel).
            return NextResponse.json({ success: false, error: 'Dữ liệu bị hỏng (đã sao lưu). Hãy khôi phục từ máy chủ.' }, { status: 503 });
        }
        // Corrupt DB backed up -> permit client to rewrite its complete authoritative snapshot
        const auth = await checkAuth(req, current, target.user);
        if (auth.error)
            return auth.error;
        // Optimistic concurrency: client must transmit baseUpdatedAt of its active server snapshot.
        // If server is newer (another device saved) -> 409 to trigger client-side 3-way merge.
        // A client that omits baseUpdatedAt while the server already has data is treated as stale, not as "overwrite everything".
        if (current?.updatedAt && payload.baseUpdatedAt !== current.updatedAt) {
            return NextResponse.json({ success: false, conflict: true, data: toClientData(current) }, { status: 409, headers: NO_CACHE_HEADERS });
        }

        const snapshot = normalizeSnapshotNumbers(pickDataFields(payload));
        const serverWallets = recomputeWalletBalances(
            snapshot.wallets,
            snapshot.transactions
        );

        const dataToSave = {
            ...snapshot,
            security: normalizeSecurity(current?.security),
            updatedAt: new Date().toISOString(),
            wallets: serverWallets,
        };
        await persist(target.filePath, dataToSave);
        return withUnlock(NextResponse.json({
            success: true,
            message: 'Đã lưu dữ liệu',
            updatedAt: dataToSave.updatedAt,
        }, { headers: NO_CACHE_HEADERS }), req, target, auth, current?.security);
    };
    try {
        // Serialized with other writes (and account deletion) so concurrent POSTs never interleave on one file
        return await withDataWriteQueue(run);
    }
    catch (error) {
        console.error('API /api/storage POST Error:', error);
        return NextResponse.json({ success: false, error: 'Không lưu được dữ liệu trên server' }, { status: 500 });
    }
}
