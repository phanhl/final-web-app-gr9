import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { INITIAL_WALLETS, INITIAL_TRANSACTIONS, INITIAL_BUDGETS, INITIAL_BILLS, INITIAL_GOALS, INITIAL_PLANNER, DEFAULT_CATEGORIES, INITIAL_SIMULATOR_CONFIG, } from '@/lib/mock-data';
let inMemoryData = null;
// Chuỗi promise tuần tự hóa các thao tác ghi để 2 request POST không ghi xen kẽ vào cùng 1 file
let writeQueue = Promise.resolve();
const MAX_PAYLOAD_BYTES = 20 * 1024 * 1024;
const ARRAY_FIELDS = ['wallets', 'transactions', 'categories', 'budgets', 'bills', 'goals'];
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
    return {
        wallets: INITIAL_WALLETS,
        transactions: INITIAL_TRANSACTIONS,
        categories: DEFAULT_CATEGORIES,
        budgets: INITIAL_BUDGETS,
        bills: INITIAL_BILLS,
        goals: INITIAL_GOALS,
        planner: INITIAL_PLANNER,
        currentMonth: '2026-09',
        simulatorConfig: INITIAL_SIMULATOR_CONFIG,
        updatedAt: new Date().toISOString(),
    };
}
/**
 * Ghi file nguyên tử: ghi ra file tạm rồi rename, tránh để lại database.json bị cắt dở khi tiến trình chết giữa chừng
 */
async function atomicWriteJSON(filePath, data) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const tmpFile = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
    await fs.rename(tmpFile, filePath);
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
        // Sao lưu bản hỏng để có thể cứu dữ liệu, tuyệt đối không ghi đè bằng dữ liệu mẫu
        const backup = `${DB_FILE}.corrupt-${Date.now()}`;
        await fs.copyFile(DB_FILE, backup).catch(() => { });
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
    return null;
}
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export async function GET() {
    try {
        let data = await readDatabase();
        if (!data) {
            data = getDefaultData();
            try {
                await atomicWriteJSON(DB_FILE, data);
            }
            catch {
                inMemoryData = data;
            }
        }
        return NextResponse.json({ success: true, data }, { headers: NO_CACHE_HEADERS });
    }
    catch (error) {
        console.error('API /api/storage GET Error:', error);
        // Không trả dữ liệu mẫu ở đây: client sẽ giữ nguyên bản local thay vì bị ghi đè bởi dữ liệu giả
        return NextResponse.json({ success: false, error: error.message || 'Không đọc được dữ liệu' }, { status: 500, headers: NO_CACHE_HEADERS });
    }
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
    const validationError = validatePayload(payload);
    if (validationError) {
        return NextResponse.json({ success: false, error: validationError }, { status: 400 });
    }
    const { baseUpdatedAt, force, ...rest } = payload;
    const run = async () => {
        let current = null;
        try {
            current = await readDatabase();
        }
        catch (err) {
            if (err.code !== 'DB_CORRUPT')
                throw err;
        }
        // Optimistic concurrency: client phải gửi updatedAt của bản server mà nó đang dựa vào.
        // Nếu server đã có bản mới hơn (thiết bị khác vừa lưu) -> 409 để client tự merge rồi gửi lại.
        if (!force && current?.updatedAt && baseUpdatedAt !== current.updatedAt) {
            return NextResponse.json({ success: false, conflict: true, data: current }, { status: 409, headers: NO_CACHE_HEADERS });
        }
        const dataToSave = {
            ...rest,
            updatedAt: new Date().toISOString(),
        };
        try {
            await atomicWriteJSON(DB_FILE, dataToSave);
        }
        catch (fsErr) {
            console.warn('Filesystem write not available, keeping in memory:', fsErr);
            inMemoryData = dataToSave;
        }
        return NextResponse.json({
            success: true,
            message: 'Đã lưu dữ liệu',
            updatedAt: dataToSave.updatedAt,
        });
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
