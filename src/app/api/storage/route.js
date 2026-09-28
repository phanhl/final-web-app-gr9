import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { INITIAL_WALLETS, INITIAL_TRANSACTIONS, INITIAL_BUDGETS, INITIAL_BILLS, INITIAL_GOALS, INITIAL_PLANNER, DEFAULT_CATEGORIES, INITIAL_SIMULATOR_CONFIG, } from '@/lib/mock-data';
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
    }
    catch {
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
        updatedAt: new Date().toISOString(),
    };
}
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export async function GET() {
    try {
        await ensureDataDir();
        try {
            const fileContent = await fs.readFile(DB_FILE, 'utf-8');
            const data = JSON.parse(fileContent);
            return NextResponse.json({ success: true, data }, {
                headers: {
                    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                    Pragma: 'no-cache',
                    Expires: '0',
                },
            });
        }
        catch {
            if (inMemoryData) {
                return NextResponse.json({ success: true, data: inMemoryData }, {
                    headers: {
                        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                        Pragma: 'no-cache',
                        Expires: '0',
                    },
                });
            }
            // File doesn't exist yet, initialize with default data
            const defaultData = getDefaultData();
            try {
                await fs.writeFile(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
            }
            catch (e) {
                inMemoryData = defaultData;
            }
            return NextResponse.json({ success: true, data: defaultData }, {
                headers: {
                    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                    Pragma: 'no-cache',
                    Expires: '0',
                },
            });
        }
    }
    catch (error) {
        console.error('API /api/storage GET Error:', error);
        return NextResponse.json({ success: true, data: getDefaultData() }, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate',
            },
        });
    }
}
export async function POST(req) {
    try {
        const payload = await req.json();
        if (!payload || typeof payload !== 'object') {
            return NextResponse.json({ success: false, error: 'Dữ liệu không hợp lệ' }, { status: 400 });
        }
        const dataToSave = {
            ...payload,
            updatedAt: new Date().toISOString(),
        };
        try {
            await ensureDataDir();
            await fs.writeFile(DB_FILE, JSON.stringify(dataToSave, null, 2), 'utf-8');
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
    }
    catch (error) {
        console.error('API /api/storage POST Error:', error);
        return NextResponse.json({ success: true, message: 'Dữ liệu đã được lưu trên client' }, { status: 200 });
    }
}
