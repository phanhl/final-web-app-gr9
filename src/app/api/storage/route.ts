import { NextRequest, NextResponse } from 'next/server';
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

const DATA_DIR = path.join(process.cwd(), 'data');
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
    updatedAt: new Date().toISOString(),
  };
}

export async function GET() {
  try {
    await ensureDataDir();

    try {
      const fileContent = await fs.readFile(DB_FILE, 'utf-8');
      const data = JSON.parse(fileContent);
      return NextResponse.json({ success: true, data });
    } catch {
      // File doesn't exist yet, initialize with default data
      const defaultData = getDefaultData();
      await fs.writeFile(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
      return NextResponse.json({ success: true, data: defaultData });
    }
  } catch (error) {
    console.error('API /api/storage GET Error:', error);
    return NextResponse.json(
      { success: false, error: 'Không thể đọc dữ liệu từ server disk' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    if (!payload || typeof payload !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Dữ liệu không hợp lệ' },
        { status: 400 }
      );
    }

    await ensureDataDir();

    const dataToSave = {
      ...payload,
      updatedAt: new Date().toISOString(),
    };

    await fs.writeFile(DB_FILE, JSON.stringify(dataToSave, null, 2), 'utf-8');

    return NextResponse.json({ success: true, message: 'Đã lưu dữ liệu vào server disk' });
  } catch (error) {
    console.error('API /api/storage POST Error:', error);
    return NextResponse.json(
      { success: false, error: 'Không thể ghi dữ liệu vào server disk' },
      { status: 500 }
    );
  }
}
