import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { INITIAL_WALLETS, INITIAL_TRANSACTIONS, INITIAL_BUDGETS, INITIAL_BILLS, INITIAL_GOALS, INITIAL_PLANNER, DEFAULT_CATEGORIES, INITIAL_SIMULATOR_CONFIG, } from '@/lib/mock-data';
let inMemoryData = null;
// Chuỗi promise tuần tự hóa các thao tác ghi để 2 request POST không ghi xen kẽ vào cùng 1 file
let writeQueue = Promise.resolve();
let lastCorruptBackup = { fingerprint: '', path: '' };
const MAX_PAYLOAD_BYTES = 20 * 1024 * 1024;
const ARRAY_FIELDS = ['wallets', 'transactions', 'categories', 'budgets', 'bills', 'goals'];
// Chỉ lưu các trường dữ liệu đã biết; trường lạ từ client (isReset, security...) bị bỏ qua
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
 * Ghi file nguyên tử: ghi ra file tạm rồi rename, tránh để lại database.json bị cắt dở khi tiến trình chết giữa chừng
 */
async function atomicWriteJSON(filePath, data) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const tmpFile = `${filePath}.${process.pid}.${Date.now()}.${crypto.randomBytes(3).toString('hex')}.tmp`;
    await fs.writeFile(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
    await fs.rename(tmpFile, filePath);
}
async function persist(data) {
    try {
        await atomicWriteJSON(DB_FILE, data);
        inMemoryData = null;
    }
    catch (fsErr) {
        // Chỉ chấp nhận lưu tạm trong RAM trên môi trường không có ổ đĩa ghi được (Vercel)
        if (!process.env.VERCEL)
            throw fsErr;
        console.warn('Filesystem write not available, keeping in memory:', fsErr);
        inMemoryData = data;
    }
}
/**
 * Đọc DB. Trả về null nếu file chưa tồn tại.
 * Nếu file tồn tại nhưng hỏng -> ném lỗi (KHÔNG ghi đè, để còn khôi phục thủ công).
 */
async function readDatabase() {
    let content;
    try {
        content = await fs.readFile(DB_FILE, 'utf-8');
    }
    catch (err) {
        if (err.code === 'ENOENT')
            return inMemoryData;
        throw err;
    }
    try {
        return JSON.parse(content);
    }
    catch (parseErr) {
        // Sao lưu bản hỏng để có thể cứu dữ liệu, tuyệt đối không ghi đè bằng dữ liệu mẫu.
        // Mỗi phiên bản file hỏng chỉ sao lưu 1 lần (client poll liên tục).
        const stat = await fs.stat(DB_FILE).catch(() => null);
        const fingerprint = `${stat?.mtimeMs}:${stat?.size}`;
        if (lastCorruptBackup.fingerprint !== fingerprint) {
            const backupPath = `${DB_FILE}.corrupt-${Date.now()}`;
            await fs.copyFile(DB_FILE, backupPath).catch(() => { });
            lastCorruptBackup = { fingerprint, path: backupPath };
        }
        const backup = lastCorruptBackup.path;
        const error = new Error(`database.json bị hỏng, đã sao lưu sang ${path.basename(backup)}`);
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
    for (let i = 0; i < payload.transactions.length; i++) {
        const tx = payload.transactions[i];
        if (!tx || typeof tx !== 'object' || !tx.id) {
            return `Giao dịch tại vị trí ${i} không hợp lệ`;
        }
        if (!Number.isFinite(Number(tx.amount))) {
            return `Số tiền giao dịch tại vị trí ${i} không phải là số hợp lệ`;
        }
    }
    for (let i = 0; i < payload.wallets.length; i++) {
        const w = payload.wallets[i];
        if (!w || typeof w !== 'object' || !w.id || !Number.isFinite(Number(w.balance))) {
            return `Ví tại vị trí ${i} không hợp lệ`;
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
// PIN: lưu dạng băm scrypt + salt, so sánh constant-time, giới hạn số lần nhập sai
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
/** Chuẩn hóa phần security trong DB: chuyển PIN dạng plaintext cũ sang dạng băm */
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
 * Kiểm tra quyền truy cập. PIN chỉ nhận qua header x-app-pin (không nhận qua URL để không lọt vào log).
 * Trả về null nếu hợp lệ, hoặc NextResponse lỗi.
 */
function checkAuth(req, currentData) {
    const envPin = process.env.APP_PIN;
    const sec = normalizeSecurity(currentData?.security);
    if (!envPin && !sec.pinEnabled)
        return null;
    const ip = getClientIp(req);
    if (isRateLimited(ip)) {
        return NextResponse.json({ success: false, requiresPin: true, error: 'Nhập sai PIN quá nhiều lần, vui lòng thử lại sau 15 phút' }, { status: 429, headers: NO_CACHE_HEADERS });
    }
    const provided = req.headers.get('x-app-pin');
    if (provided) {
        const ok = envPin ? safeEqualString(provided, envPin) : verifyPinHash(provided, sec.pinSalt, sec.pinHash);
        if (ok) {
            failedAttempts.delete(ip);
            return null;
        }
        recordFailure(ip);
    }
    return NextResponse.json({ success: false, requiresPin: true, error: 'Yêu cầu mã PIN bảo mật chính xác để truy cập dữ liệu FinTrack' }, { status: 401, headers: NO_CACHE_HEADERS });
}
function toClientData(data) {
    const { security, ...rest } = data;
    return { ...rest, security: publicSecurity(security) };
}
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export async function GET(req) {
    try {
        let data = await readDatabase();
        const authError = checkAuth(req, data);
        if (authError)
            return authError;
        if (!data) {
            data = getDefaultData();
            await persist(data);
        }
        return NextResponse.json({ success: true, data: toClientData(data) }, { headers: NO_CACHE_HEADERS });
    }
    catch (error) {
        console.error('API /api/storage GET Error:', error);
        // Không trả dữ liệu mẫu ở đây: client sẽ giữ nguyên bản local thay vì bị ghi đè bởi dữ liệu giả
        return NextResponse.json({ success: false, error: error.message || 'Không đọc được dữ liệu' }, { status: 500, headers: NO_CACHE_HEADERS });
    }
}
async function handleUpdateSecurity(req, payload) {
    const current = await readDatabase();
    const authError = checkAuth(req, current);
    if (authError)
        return authError;
    if (process.env.APP_PIN) {
        return NextResponse.json({ success: false, error: 'PIN đang được quản lý bằng biến môi trường APP_PIN trên server' }, { status: 400 });
    }
    const pinCode = payload.pinCode !== undefined && payload.pinCode !== null ? String(payload.pinCode).trim() : '';
    if (pinCode && !PIN_PATTERN.test(pinCode)) {
        return NextResponse.json({ success: false, error: 'Mã PIN phải gồm 4-8 chữ số' }, { status: 400 });
    }
    const sec = normalizeSecurity(current?.security);
    const next = { ...sec, pinEnabled: Boolean(payload.pinEnabled) };
    if (pinCode) {
        const { salt, hash } = hashPin(pinCode);
        next.pinSalt = salt;
        next.pinHash = hash;
    }
    if (next.pinEnabled && !next.pinHash) {
        return NextResponse.json({ success: false, error: 'Cần đặt mã PIN trước khi bật khóa' }, { status: 400 });
    }
    // Không đổi updatedAt: thay đổi bảo mật không phải thay đổi dữ liệu nên không gây xung đột đồng bộ
    const dataToSave = { ...(current || getDefaultData()), security: next };
    await persist(dataToSave);
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
    if (!isSecurityUpdate) {
        const validationError = validatePayload(payload);
        if (validationError) {
            return NextResponse.json({ success: false, error: validationError }, { status: 400 });
        }
    }
    const run = async () => {
        if (isSecurityUpdate)
            return handleUpdateSecurity(req, payload);
        let current = null;
        let corrupt = false;
        try {
            current = await readDatabase();
        }
        catch (err) {
            if (err.code !== 'DB_CORRUPT')
                throw err;
            corrupt = true;
        }
        if (corrupt && !process.env.APP_PIN && req.headers.get('x-forwarded-for')) {
            // DB hỏng -> không còn biết cấu hình PIN. Chỉ cho phép khôi phục từ máy chủ (không qua tunnel),
            // hoặc khi PIN được đặt bằng biến môi trường APP_PIN.
            return NextResponse.json({ success: false, error: 'database.json bị hỏng (đã sao lưu). Hãy khôi phục từ máy chủ.' }, { status: 503 });
        }
        // DB hỏng đã được sao lưu -> cho phép client ghi lại bản đầy đủ của mình
        const authError = checkAuth(req, current);
        if (authError)
            return authError;
        // Optimistic concurrency: client phải gửi updatedAt của bản server mà nó đang dựa vào.
        // Nếu server đã có bản mới hơn (thiết bị khác vừa lưu) -> 409 để client tự merge rồi gửi lại.
        if (current?.updatedAt && payload.baseUpdatedAt !== current.updatedAt) {
            return NextResponse.json({ success: false, conflict: true, data: toClientData(current) }, { status: 409, headers: NO_CACHE_HEADERS });
        }
        const dataToSave = {
            ...pickDataFields(payload),
            security: normalizeSecurity(current?.security),
            updatedAt: new Date().toISOString(),
        };
        await persist(dataToSave);
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
