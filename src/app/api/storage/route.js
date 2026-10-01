import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import {
    INITIAL_WALLETS,
    INITIAL_TRANSACTIONS,
    INITIAL_BUDGETS,
    INITIAL_BILLS,
    INITIAL_GOALS,
    INITIAL_PLANNER,
    DEFAULT_CATEGORIES,
    INITIAL_SIMULATOR_CONFIG,
} from '@/lib/mock-data';

let inMemoryData = null;

function getDataDir() {
    if (process.env.VERCEL) {
        return '/tmp/data';
    }
    return path.join(process.cwd(), 'data');
}

const DATA_DIR = getDataDir();
const DB_FILE = path.join(DATA_DIR, 'database.json');

async function ensureDataDir() {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }
}

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
        security: {
            pinEnabled: false,
            pinCode: '',
        },
        userProfile: {
            name: 'Nguyễn Văn A',
            email: 'nguyenvana@gmail.com',
            currency: 'VND',
            avatar: 'A',
        },
        updatedAt: new Date().toISOString(),
    };
}

async function readDatabaseFile() {
    await ensureDataDir();
    try {
        const fileContent = await fs.readFile(DB_FILE, 'utf-8');
        return JSON.parse(fileContent);
    } catch {
        if (inMemoryData) {
            return inMemoryData;
        }
        const defaultData = getDefaultData();
        try {
            await atomicWriteFile(DB_FILE, JSON.stringify(defaultData, null, 2));
        } catch (e) {
            inMemoryData = defaultData;
        }
        return defaultData;
    }
}

async function atomicWriteFile(filePath, content) {
    const tmpPath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 6)}`;
    await fs.writeFile(tmpPath, content, 'utf-8');
    await fs.rename(tmpPath, filePath);
}

// -------------------------------------------------------------
// SCHEMA VALIDATION (Fixes Issue 10: Database Schema Validation)
// -------------------------------------------------------------
function validateDatabaseSchema(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return { valid: false, error: 'Dữ liệu payload phải là một JSON object hợp lệ' };
    }
    const arrayFields = ['wallets', 'transactions', 'categories', 'budgets', 'bills', 'goals'];
    for (const field of arrayFields) {
        if (payload[field] !== undefined && !Array.isArray(payload[field])) {
            return { valid: false, error: `Trường '${field}' phải là một mảng (Array)` };
        }
    }
    if (payload.transactions) {
        for (let i = 0; i < payload.transactions.length; i++) {
            const tx = payload.transactions[i];
            if (!tx || typeof tx !== 'object') {
                return { valid: false, error: `Giao dịch tại vị trí ${i} không hợp lệ` };
            }
            if (tx.amount !== undefined && (isNaN(Number(tx.amount)) || !isFinite(Number(tx.amount)))) {
                return { valid: false, error: `Số tiền giao dịch tại vị trí ${i} không phải là số hợp lệ` };
            }
        }
    }
    return { valid: true };
}

// -------------------------------------------------------------
// AUTHENTICATION & PIN CHECK (Fixes Issue 1 & 2: Security & Ngrok Exposure)
// -------------------------------------------------------------
function checkAuth(req, currentData) {
    const envPin = process.env.APP_PIN;
    const dbPinEnabled = currentData?.security?.pinEnabled;
    const dbPinCode = currentData?.security?.pinCode;

    const isPinRequired = Boolean(envPin || (dbPinEnabled && dbPinCode));
    if (!isPinRequired) {
        return { authorized: true, isPinRequired: false };
    }

    const expectedPin = envPin || dbPinCode;
    const providedPin = req.headers.get('x-app-pin') || 
                        new URL(req.url, 'http://localhost').searchParams.get('pin');

    if (providedPin && String(providedPin).trim() === String(expectedPin).trim()) {
        return { authorized: true, isPinRequired: true };
    }

    return { 
        authorized: false, 
        isPinRequired: true, 
        error: 'Yêu cầu mã PIN bảo mật chính xác để truy cập dữ liệu FinTrack' 
    };
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req) {
    try {
        const currentData = await readDatabaseFile();
        const auth = checkAuth(req, currentData);

        if (!auth.authorized) {
            return NextResponse.json(
                { success: false, error: auth.error, requiresPin: true },
                { 
                    status: 401,
                    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
                }
            );
        }

        // Strip pinCode from GET response if sent to client for security
        const sanitizedData = {
            ...currentData,
            security: {
                pinEnabled: Boolean(currentData?.security?.pinEnabled || process.env.APP_PIN),
                hasPin: Boolean(currentData?.security?.pinCode || process.env.APP_PIN),
            },
        };

        return NextResponse.json({ success: true, data: sanitizedData }, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                Pragma: 'no-cache',
                Expires: '0',
            },
        });
    } catch (error) {
        console.error('API /api/storage GET Error:', error);
        return NextResponse.json(
            { success: false, error: 'Lỗi máy chủ khi đọc cơ sở dữ liệu: ' + error.message },
            { status: 500 }
        );
    }
}

export async function POST(req) {
    try {
        const currentData = await readDatabaseFile();
        const auth = checkAuth(req, currentData);

        if (!auth.authorized) {
            return NextResponse.json(
                { success: false, error: auth.error, requiresPin: true },
                { status: 401 }
            );
        }

        const payload = await req.json();
        
        // 1. Schema Validation (Fix Issue 10)
        const validation = validateDatabaseSchema(payload);
        if (!validation.valid) {
            return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
        }

        // 2. Multi-device sync & lost update resolution (Fix Issue 4)
        let mergedTransactions = payload.transactions || currentData.transactions || [];
        if (!payload.isReset && Array.isArray(currentData.transactions) && Array.isArray(payload.transactions)) {
            const incomingIds = new Set(payload.transactions.map((t) => t.id));
            const clientUpdateTime = new Date(payload.updatedAt || 0).getTime();
            
            // Reconcile transactions added concurrently on another device within the last 10 minutes
            for (const existingTx of currentData.transactions) {
                if (!incomingIds.has(existingTx.id)) {
                    const txCreated = new Date(existingTx.createdAt || existingTx.date || 0).getTime();
                    if (txCreated > clientUpdateTime - 600000) {
                        mergedTransactions.push(existingTx);
                    }
                }
            }
        }

        // Preserve security pin if client didn't supply pinCode
        const preservedSecurity = {
            pinEnabled: payload.security?.pinEnabled !== undefined 
                ? payload.security.pinEnabled 
                : (currentData.security?.pinEnabled || false),
            pinCode: payload.security?.pinCode !== undefined
                ? payload.security.pinCode
                : (currentData.security?.pinCode || ''),
        };

        const dataToSave = {
            ...currentData,
            ...payload,
            transactions: mergedTransactions,
            security: preservedSecurity,
            updatedAt: new Date().toISOString(),
        };

        // 3. Atomic file persistence (Fix Issue 3)
        try {
            await ensureDataDir();
            await atomicWriteFile(DB_FILE, JSON.stringify(dataToSave, null, 2));
            inMemoryData = dataToSave;
        } catch (fsErr) {
            console.warn('Filesystem write error, fallback to in-memory:', fsErr);
            inMemoryData = dataToSave;
            if (!process.env.VERCEL) {
                return NextResponse.json(
                    { success: false, error: 'Lỗi ghi đĩa: ' + fsErr.message },
                    { status: 500 }
                );
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Đã lưu dữ liệu an toàn',
            updatedAt: dataToSave.updatedAt,
            data: {
                ...dataToSave,
                security: {
                    pinEnabled: dataToSave.security.pinEnabled,
                    hasPin: Boolean(dataToSave.security.pinCode),
                },
            },
        });
    } catch (error) {
        console.error('API /api/storage POST Error:', error);
        // FIX ISSUE 3: Return real 500 error, never fake success: true
        return NextResponse.json(
            { success: false, error: 'Lỗi máy chủ khi lưu cơ sở dữ liệu: ' + error.message },
            { status: 500 }
        );
    }
}

