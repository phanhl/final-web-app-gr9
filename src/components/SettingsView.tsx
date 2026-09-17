'use client';

import React, { useRef, useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Settings,
  Database,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  CheckCircle2,
  Layers,
  Server,
  KeyRound,
  FileCode,
  ShieldCheck,
  User,
  Sun,
  Moon,
  Monitor,
  Check,
  Palette,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    wallets,
    transactions,
    budgets,
    bills,
    goals,
    serverSyncStatus,
    theme,
    setTheme,
    resetToDefaultData,
    clearAllData,
    exportDatabaseJSON,
    importDatabaseJSON,
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = importDatabaseJSON(content);
        if (success) {
          setImportStatus('Khôi phục dữ liệu từ file JSON thành công!');
          setTimeout(() => setImportStatus(null), 4000);
        } else {
          alert('Lỗi: File JSON không đúng định dạng sao lưu của ứng dụng');
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
          Cài Đặt & Quản Lý Dữ Liệu
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Sao lưu dự phòng, khôi phục dữ liệu, thiết lập hệ thống và tài liệu kiến trúc kỹ thuật
        </p>
      </div>

      {importStatus && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center space-x-3 text-emerald-800 dark:text-emerald-200 text-xs font-semibold">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <span>{importStatus}</span>
        </div>
      )}

      {/* 2. THEME & APPEARANCE */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <Palette className="w-5 h-5 text-indigo-500" />
            <h3 className="text-base font-bold text-slate-800 dark:text-white">
              Tùy Chỉnh Giao Diện & Chủ Đề (Appearance & Theme)
            </h3>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium self-start sm:self-auto">
            Đang dùng: {theme === 'light' ? 'Chế độ Sáng' : theme === 'dark' ? 'Chế độ Tối' : 'Tự động (Hệ thống)'}
          </span>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Chọn chủ đề hiển thị theo sở thích của bạn hoặc chuyển đổi nhanh bằng nút Mặt trời/Mặt trăng trên thanh menu trên cùng. Thiết lập được tự động ghi nhớ.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Light theme card */}
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`p-4 rounded-xl border-2 text-left transition-all flex flex-col justify-between relative cursor-pointer ${
              theme === 'light'
                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Sun className="w-5 h-5" />
              </div>
              {theme === 'light' && (
                <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                  <Check className="w-3.5 h-3.5" />
                </span>
              )}
            </div>
            <div>
              <p className="font-bold text-sm text-slate-900 dark:text-white">Giao diện Sáng (Light)</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Tươi sáng, thanh lịch, độ tương phản cao cho ban ngày.
              </p>
            </div>
          </button>

          {/* Dark theme card */}
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`p-4 rounded-xl border-2 text-left transition-all flex flex-col justify-between relative cursor-pointer ${
              theme === 'dark'
                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 text-indigo-400 flex items-center justify-center">
                <Moon className="w-5 h-5" />
              </div>
              {theme === 'dark' && (
                <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                  <Check className="w-3.5 h-3.5" />
                </span>
              )}
            </div>
            <div>
              <p className="font-bold text-sm text-slate-900 dark:text-white">Giao diện Tối (Dark)</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Tông xám than dịu mắt, chống mỏi mắt khi sử dụng ban đêm.
              </p>
            </div>
          </button>

          {/* System theme card */}
          <button
            type="button"
            onClick={() => setTheme('system')}
            className={`p-4 rounded-xl border-2 text-left transition-all flex flex-col justify-between relative cursor-pointer ${
              theme === 'system'
                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Monitor className="w-5 h-5" />
              </div>
              {theme === 'system' && (
                <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                  <Check className="w-3.5 h-3.5" />
                </span>
              )}
            </div>
            <div>
              <p className="font-bold text-sm text-slate-900 dark:text-white">Theo Thiết Bị (Auto)</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Tự động đồng bộ theo chế độ hiển thị hệ thống của máy.
              </p>
            </div>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 3. BACKUP & RESTORE */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Database className="w-5 h-5 text-blue-500" />
            <h3 className="text-base font-bold text-slate-800 dark:text-white">
              Sao Lưu & Khôi Phục Dữ Liệu
            </h3>
          </div>

          {/* Server Disk Persistence Status */}
          <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/50 flex items-start space-x-3 text-xs">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0 animate-pulse" />
            <div>
              <p className="font-bold text-emerald-900 dark:text-emerald-200">
                Lưu trữ máy chủ: {serverSyncStatus === 'synced' ? 'Đã đồng bộ' : serverSyncStatus === 'syncing' ? 'Đang lưu...' : 'Ngoại tuyến (Offline)'}
              </p>
              <p className="text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
                Dữ liệu được lưu trực tiếp vào tệp <code className="px-1 py-0.5 bg-white dark:bg-slate-800 rounded font-mono text-[11px]">data/database.json</code> trên ổ cứng. Tắt/bật lại server hoặc đổi trình duyệt dữ liệu vẫn bảo toàn nguyên vẹn.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Export JSON */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-white">Xuất file JSON sao lưu</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tải toàn bộ cơ sở dữ liệu ({wallets.length} ví, {transactions.length} giao dịch, {budgets.length} ngân sách)
                </p>
              </div>
              <button
                onClick={exportDatabaseJSON}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Xuất JSON</span>
              </button>
            </div>

            {/* Import JSON */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-white">Khôi phục từ file JSON</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tải lên tệp sao lưu .json đã lưu trước đó
                </p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold shadow-sm transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span>Chọn file JSON</span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Reset to Demo Data */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-white">Dữ liệu mẫu chuẩn (Demo Data)</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Khôi phục đầy đủ dữ liệu thực tế mẫu: 5 ví, lịch sử giao dịch, ngân sách tháng 9, hóa đơn, hũ tích lũy
                </p>
              </div>
              <button
                onClick={() => {
                  if (confirm('Khôi phục lại dữ liệu mẫu thực tế ban đầu?')) {
                    resetToDefaultData();
                  }
                }}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Nạp Demo</span>
              </button>
            </div>

            {/* Clear all data */}
            <div className="p-4 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-rose-700 dark:text-rose-300">Xóa sạch dữ liệu (Reset trắng)</h4>
                <p className="text-xs text-rose-600/70 dark:text-rose-400/70 mt-0.5">
                  Xóa toàn bộ giao dịch, hóa đơn, ngân sách để bắt đầu lại từ đầu
                </p>
              </div>
              <button
                onClick={() => {
                  if (confirm('CẢNH BÁO: Thao tác này sẽ xóa sạch toàn bộ giao dịch và thiết lập. Bạn có chắc chắn?')) {
                    clearAllData();
                  }
                }}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Xóa hết</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. USER & AUTHENTICATION SPEC */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <KeyRound className="w-5 h-5 text-emerald-500" />
            <h3 className="text-base font-bold text-slate-800 dark:text-white">
              Tài Khoản & Xác Thực (Authentication)
            </h3>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-200 dark:border-emerald-800/40 flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
              A
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-white">Admin</h4>
              <p className="text-xs text-slate-500">admin@example.com</p>
              <div className="flex items-center space-x-2 mt-1">
                <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded text-[10px] font-bold">
                  Clerk / NextAuth Google OAuth
                </span>
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded text-[10px] font-bold">
                  Bảo mật cao
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
            <p>
              <strong>Tiêu chuẩn công nghệ:</strong> Hỗ trợ tích hợp Clerk Auth, NextAuth.js hoặc Supabase Auth với Single Sign-On (Google OAuth, Apple ID, Email OTP).
            </p>
            <p>
              <strong>Bảo mật dữ liệu:</strong> Mỗi người dùng có không gian lưu trữ riêng biệt (Multi-tenancy isolation), mã hóa các giao dịch nhạy cảm.
            </p>
          </div>
        </div>
      </div>

      {/* 4. TECH STACK SPECIFICATION OVERVIEW (MATCHING DOCX) */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <Layers className="w-5 h-5 text-indigo-500" />
          <h3 className="text-base font-bold text-slate-800 dark:text-white">
            Kiến Trúc Kỹ Thuật (Tech Stack Breakdown)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-2 font-bold text-slate-800 dark:text-white mb-2">
              <FileCode className="w-4 h-4 text-blue-500" />
              <span>1. Frontend Layer</span>
            </div>
            <ul className="space-y-1 text-slate-500 dark:text-slate-400">
              <li>• <strong>Framework:</strong> Next.js 15 (React 19 + TypeScript)</li>
              <li>• <strong>Styling:</strong> Tailwind CSS v4 Responsive Fintech UI</li>
              <li>• <strong>Charts:</strong> Recharts (Pie, Bar, Area charts)</li>
              <li>• <strong>Icons:</strong> Lucide React Vector Icons</li>
              <li>• <strong>Spreadsheets:</strong> SheetJS (xlsx) & CSV engine</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-2 font-bold text-slate-800 dark:text-white mb-2">
              <Server className="w-4 h-4 text-emerald-500" />
              <span>2. Backend & Calculations</span>
            </div>
            <ul className="space-y-1 text-slate-500 dark:text-slate-400">
              <li>• <strong>Node.js Server:</strong> REST API Routes (/api)</li>
              <li>• <strong>Thuật toán tài chính:</strong> Tổng hợp khả dụng, Net Worth, 50/30/20 Budget planner</li>
              <li>• <strong>Cảnh báo thông minh:</strong> Ngưỡng 80% (Warning) & 100% (Exceeded)</li>
              <li>• <strong>Xử lý hóa đơn:</strong> Đối soát và tự động trừ ví</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-2 font-bold text-slate-800 dark:text-white mb-2">
              <ShieldCheck className="w-4 h-4 text-purple-500" />
              <span>3. Database & Persistence</span>
            </div>
            <ul className="space-y-1 text-slate-500 dark:text-slate-400">
              <li>• <strong>Database:</strong> PostgreSQL / Supabase Relational DB</li>
              <li>• <strong>Zero-config Mode:</strong> LocalStorage & JSON Backup Engine</li>
              <li>• <strong>Toàn vẹn dữ liệu:</strong> Tự động hoàn tác số dư khi xóa / sửa giao dịch</li>
              <li>• <strong>Receipt storage:</strong> Base64 / Cloud Bucket attachments</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
