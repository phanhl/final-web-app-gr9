import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { promisify } from 'util';
import { recomputeWalletBalances } from '@/lib/utils';
import {
    encryptSecureBackup,
    decryptSecureBackup,
    isValidSecureBackupId,
} from '@/lib/secure-backup';
import { validateBackupData } from '@/lib/backup-validation';
import { validatePayload, normalizeSnapshotNumbers, ARRAY_FIELDS } from '@/lib/storage-validation';
import {
    getSessionUser,
    getDefaultUserData,
    verifyPassword,
    setUnlockCookie,
    hasValidUnlockCookie,
} from '@/lib/auth-server';
import {
    ensureSnapshot,
    saveSnapshot,
    setSecurity,
    getUserById,
    listSecureBackups,
    insertSecureBackup,
    getSecureBackupData,
    deleteSecureBackup,
    StoreValidationError,
} from '@/lib/store';
import { getClientIp, createRateLimiter, readBodyWithLimit } from '@/lib/request-security';
import { logSecurityEvent } from '@/lib/security-logger';

const MAX_PAYLOAD_BYTES = 20 * 1024 * 1024;
// Only persist recognized data fields; unknown client fields (isReset, security...) are ignored
const DATA_FIELDS = [...ARRAY_FIELDS, 'planner', 'currentMonth', 'userProfile', 'simulatorConfig'];
const PIN_PATTERN = /^\d{4,8}$/;
const NO_CACHE_HEADERS = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
};

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

/** Database down vs. a bug: the first is temporary and the client keeps working offline */
function serverErrorResponse(error, fallbackMessage) {
    const unavailable = ['ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET', 'PROTOCOL_CONNECTION_LOST', 'PROTOCOL_SEQUENCE_TIMEOUT', 'ER_CON_COUNT_ERROR', 'ENOTFOUND'].includes(error?.code);
    return NextResponse.json(
        unavailable
            ? { success: false, code: 'SERVER_UNAVAILABLE', error: 'Máy chủ dữ liệu tạm thời không phản hồi, dữ liệu vẫn được giữ trên thiết bị' }
            : { success: false, error: fallbackMessage },
        { status: unavailable ? 503 : 500, headers: NO_CACHE_HEADERS },
    );
}

/** The user's data, created from the default template the first time */
function loadUserSnapshot(user) {
    return ensureSnapshot(user.id, () => getDefaultUserData(user.username));
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
async function hashPin(pin, salt = crypto.randomBytes(16).toString('hex')) {
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
function normalizeSecurity(security) {
    const sec = security && typeof security === 'object' ? security : {};
    return {
        pinEnabled: Boolean(sec.pinEnabled) && Boolean(sec.pinHash),
        pinSalt: sec.pinHash ? sec.pinSalt : undefined,
        pinHash: sec.pinHash || undefined,
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
async function checkAuth(req, security, user) {
    const sec = normalizeSecurity(security);
    if (!sec.pinEnabled) {
        return {};
    }
    if (await hasValidUnlockCookie(req, user, sec.pinHash)) {
        return {};
    }

    const ip = getClientIp(req);
    const limited = () => ({ error: NextResponse.json({ success: false, requiresPin: true, code: 'RATE_LIMITED', error: 'Nhập sai PIN quá nhiều lần, vui lòng thử lại sau 15 phút' }, { status: 429, headers: NO_CACHE_HEADERS }) });
    if (pinIpLimiter.isLimited(ip) || pinUserLimiter.isLimited(user.id)) {
        logSecurityEvent({ event: 'PIN_RATE_LIMITED', userId: user.id, ip, success: false });
        return limited();
    }

    const provided = req.headers.get('x-app-pin');
    if (provided && provided.length <= 256) {
        // Count the guess before checking it (atomic), forgive it on success: parallel guesses cannot exceed the limit
        if (!pinIpLimiter.consume(ip) || !pinUserLimiter.consume(user.id)) {
            logSecurityEvent({ event: 'PIN_RATE_LIMITED', userId: user.id, ip, success: false });
            return limited();
        }
        let ok = await verifyPinHash(provided, sec.pinSalt, sec.pinHash);
        let via = 'PIN';
        if (!ok) {
            // Recovery path: the account password is also accepted on the PIN screen
            const dbUser = await getUserById(user.id);
            ok = Boolean(dbUser && dbUser.passwordHash && await verifyPassword(provided, dbUser.salt, dbUser.passwordHash));
            via = 'PASSWORD';
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
async function withUnlock(res, req, user, auth, security) {
    if (auth?.grantUnlock) {
        await setUnlockCookie(res, req, user, normalizeSecurity(security).pinHash);
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
        const user = await getSessionUser();
        if (!user) return unauthorizedResponse(req);
        const url = new URL(req.url);
        const snapshot = await loadUserSnapshot(user);
        const auth = await checkAuth(req, snapshot.security, user);
        if (auth.error) return auth.error;

        if (url.searchParams.get('action') === 'secureBackups') {
            const backups = await listSecureBackups(user.id);
            return withUnlock(NextResponse.json({ success: true, backups }, { headers: NO_CACHE_HEADERS }), req, user, auth, snapshot.security);
        }
        return withUnlock(NextResponse.json({ success: true, data: toClientData(snapshot) }, { headers: NO_CACHE_HEADERS }), req, user, auth, snapshot.security);
    }
    catch (error) {
        console.error('API /api/storage GET Error:', error);
        // Never return fallback sample data: the client keeps its local state rather than being overwritten
        return serverErrorResponse(error, 'Không đọc được dữ liệu');
    }
}

function backupSnapshot(source) {
    return {
        backupVersion: 1,
        createdAt: new Date().toISOString(),
        ...pickDataFields(source),
        wallets: recomputeWalletBalances(source.wallets || [], source.transactions || []),
    };
}

async function storeBackup(user, snapshot) {
    const id = `backup-${Date.now()}-${crypto.randomUUID()}.ftbk`;
    return insertSecureBackup(user.id, id, encryptSecureBackup(backupSnapshot(snapshot)));
}

async function handleCreateSecureBackup(req, user) {
    const current = await loadUserSnapshot(user);
    const auth = await checkAuth(req, current.security, user);
    if (auth.error) return auth.error;

    const backup = await storeBackup(user, current);
    logSecurityEvent({ event: 'SECURE_BACKUP_CREATED', userId: user.id, ip: getClientIp(req), success: true, details: { backupId: backup.id } });
    return withUnlock(NextResponse.json({ success: true, backup }, { headers: NO_CACHE_HEADERS }), req, user, auth, current.security);
}

async function handleRestoreSecureBackup(req, user, backupId) {
    const current = await loadUserSnapshot(user);
    const auth = await checkAuth(req, current.security, user);
    if (auth.error) return auth.error;

    if (!isValidSecureBackupId(backupId)) {
        return NextResponse.json({ success: false, error: 'Invalid Secure Backup ID' }, { status: 400, headers: NO_CACHE_HEADERS });
    }
    const encrypted = await getSecureBackupData(user.id, backupId);
    if (!encrypted) {
        return NextResponse.json({ success: false, error: 'Không tìm thấy bản sao lưu' }, { status: 404, headers: NO_CACHE_HEADERS });
    }
    let backupData;
    try {
        backupData = decryptSecureBackup(encrypted);
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400, headers: NO_CACHE_HEADERS });
    }
    const validationErrors = validateBackupData(backupData);
    if (validationErrors.length > 0) {
        return NextResponse.json({ success: false, error: 'Invalid Secure Backup format', details: validationErrors }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    // Keep what is being replaced as a backup of its own first
    const safetyBackup = await storeBackup(user, current).catch((err) => {
        console.error('Failed to create safety backup during restore:', err);
        return null;
    });

    const restored = normalizeSnapshotNumbers(pickDataFields(backupData));
    restored.wallets = recomputeWalletBalances(restored.wallets, restored.transactions);
    // force: a restore replaces whatever is there; the PIN settings are kept (security not passed)
    const result = await saveSnapshot(user.id, restored, { force: true });
    logSecurityEvent({ event: 'SECURE_BACKUP_RESTORED', userId: user.id, ip: getClientIp(req), success: true, details: { backupId } });
    return withUnlock(NextResponse.json({
        success: true,
        message: 'Secure backup restored successfully',
        updatedAt: result.updatedAt,
        safetyBackup
    }, { headers: NO_CACHE_HEADERS }), req, user, auth, current.security);
}

async function handleDeleteSecureBackup(req, user, backupId) {
    const current = await loadUserSnapshot(user);
    const auth = await checkAuth(req, current.security, user);
    if (auth.error) return auth.error;

    if (!isValidSecureBackupId(backupId) || !(await deleteSecureBackup(user.id, backupId))) {
        return NextResponse.json({ success: false, error: 'Không tìm thấy bản sao lưu' }, { status: 404, headers: NO_CACHE_HEADERS });
    }
    logSecurityEvent({ event: 'SECURE_BACKUP_DELETED', userId: user.id, ip: getClientIp(req), success: true, details: { backupId } });
    return withUnlock(NextResponse.json({ success: true }, { headers: NO_CACHE_HEADERS }), req, user, auth, current.security);
}

async function handleUpdateSecurity(req, payload, user) {
    const current = await loadUserSnapshot(user);
    const auth = await checkAuth(req, current.security, user);
    if (auth.error)
        return auth.error;
    const pinCode = payload.pinCode !== undefined && payload.pinCode !== null ? String(payload.pinCode).trim() : '';
    if (pinCode && !PIN_PATTERN.test(pinCode)) {
        return NextResponse.json({ success: false, code: 'PIN_FORMAT', error: 'Mã PIN phải gồm 4-8 chữ số' }, { status: 400 });
    }
    const sec = normalizeSecurity(current.security);
    const next = { ...sec, pinEnabled: Boolean(payload.pinEnabled) };
    if (pinCode) {
        const { salt, hash } = await hashPin(pinCode);
        next.pinSalt = salt;
        next.pinHash = hash;
    }
    if (next.pinEnabled && !next.pinHash) {
        return NextResponse.json({ success: false, code: 'PIN_NOT_SET', error: 'Cần đặt mã PIN trước khi bật khóa' }, { status: 400 });
    }
    // Only the PIN columns change: the sync version stays, so other devices see no data conflict
    await setSecurity(user.id, next);
    logSecurityEvent({
        event: 'SECURITY_CONFIG_CHANGED',
        userId: user.id,
        ip: getClientIp(req),
        success: true,
        details: { pinEnabled: next.pinEnabled }
    });
    const res = NextResponse.json({ success: true, security: publicSecurity(next) }, { headers: NO_CACHE_HEADERS });
    // The user is already authorized: keep this browser unlocked under the new PIN
    await setUnlockCookie(res, req, user, next.pinHash);
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
    const action = payload && typeof payload === 'object' ? payload.action : undefined;
    const isAction = ['updateSecurity', 'createSecureBackup', 'restoreSecureBackup', 'deleteSecureBackup'].includes(action);
    if (!isAction) {
        const validationError = validatePayload(payload);
        if (validationError) {
            return NextResponse.json({ success: false, error: validationError }, { status: 400 });
        }
    }
    try {
        const user = await getSessionUser();
        if (!user)
            return unauthorizedResponse(req);
        if (action === 'updateSecurity')
            return await handleUpdateSecurity(req, payload, user);
        if (action === 'createSecureBackup')
            return await handleCreateSecureBackup(req, user);
        if (action === 'restoreSecureBackup')
            return await handleRestoreSecureBackup(req, user, payload.backupId);
        if (action === 'deleteSecureBackup')
            return await handleDeleteSecureBackup(req, user, payload.backupId);

        const current = await loadUserSnapshot(user);
        const auth = await checkAuth(req, current.security, user);
        if (auth.error)
            return auth.error;

        const snapshot = normalizeSnapshotNumbers(pickDataFields(payload));
        snapshot.wallets = recomputeWalletBalances(snapshot.wallets, snapshot.transactions);
        // Optimistic concurrency, checked inside the write transaction under a row lock: the client sends the
        // version it last saw (baseUpdatedAt). If another device saved since, nothing is written and the client
        // receives the newer data (409) to merge. A missing baseUpdatedAt is treated as stale, never as "overwrite".
        const result = await saveSnapshot(user.id, snapshot, { expectedUpdatedAt: payload.baseUpdatedAt });
        if (result.conflict) {
            return NextResponse.json({ success: false, conflict: true, data: toClientData(result.current) }, { status: 409, headers: NO_CACHE_HEADERS });
        }
        return withUnlock(NextResponse.json({
            success: true,
            message: 'Đã lưu dữ liệu',
            updatedAt: result.updatedAt,
        }, { headers: NO_CACHE_HEADERS }), req, user, auth, current.security);
    }
    catch (error) {
        if (error instanceof StoreValidationError) {
            return NextResponse.json({ success: false, error: error.message }, { status: 400, headers: NO_CACHE_HEADERS });
        }
        console.error('API /api/storage POST Error:', error);
        return serverErrorResponse(error, 'Không lưu được dữ liệu trên server');
    }
}
