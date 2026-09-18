'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import {
  Settings,
  KeyRound,
  User,
  Sun,
  Moon,
  Monitor,
  Check,
  Palette,
  Globe,
} from 'lucide-react';
import { LANGUAGES } from '@/lib/i18n';

export const SettingsView: React.FC = () => {
  const {
    theme,
    setTheme,
    language,
    setLanguage,
    t,
  } = useApp();

  return (
    <div className="space-y-6 pb-12">
      {/* 1. HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
          {t('settings.title', 'Cài Đặt Hệ Thống')}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {t('settings.subtitle', 'Tùy chỉnh ngôn ngữ hiển thị, giao diện sáng/tối và thông tin tài khoản')}
        </p>
      </div>

      {/* 2. DISPLAY LANGUAGE */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <Globe className="w-5 h-5 text-emerald-500" />
            <h3 className="text-base font-bold text-slate-800 dark:text-white">
              {t('settings.languageTitle', 'Ngôn Ngữ Hiển Thị (Display Language)')}
            </h3>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold self-start sm:self-auto flex items-center gap-1.5">
            <span>{LANGUAGES.find((l) => l.code === language)?.flag}</span>
            <span>{LANGUAGES.find((l) => l.code === language)?.nativeName}</span>
          </span>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          {t('settings.languageDesc', 'Chọn ngôn ngữ hiển thị giao diện phù hợp với bạn hoặc chuyển đổi nhanh bằng nút góc màn hình.')}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {LANGUAGES.map((item) => {
            const isSelected = item.code === language;
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => setLanguage(item.code)}
                className={`p-4 rounded-xl border-2 text-left transition-all flex flex-col justify-between relative cursor-pointer ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl shadow-2xs">
                    {item.flag}
                  </div>
                  {isSelected && (
                    <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-900 dark:text-white">
                    {item.nativeName}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {item.code === 'vi'
                      ? t('settings.viDesc', 'Giao diện tiếng Việt chuẩn hóa')
                      : item.code === 'en'
                      ? 'English user interface'
                      : 'Interface utilisateur en français'}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. THEME & APPEARANCE */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <Palette className="w-5 h-5 text-indigo-500" />
            <h3 className="text-base font-bold text-slate-800 dark:text-white">
              {t('settings.themeSection', 'Tùy Chỉnh Giao Diện & Chủ Đề (Appearance & Theme)')}
            </h3>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium self-start sm:self-auto">
            {t('settings.currentTheme', 'Đang dùng:')} {theme === 'light' ? t('settings.themeLight', 'Chế độ Sáng') : theme === 'dark' ? t('settings.themeDark', 'Chế độ Tối') : t('settings.themeAuto', 'Tự động (Hệ thống)')}
          </span>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          {t('settings.themeDesc', 'Chọn chủ đề hiển thị theo sở thích của bạn hoặc chuyển đổi nhanh bằng nút Mặt trời/Mặt trăng trên thanh menu trên cùng. Thiết lập được tự động ghi nhớ.')}
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
              <p className="font-bold text-sm text-slate-900 dark:text-white">{t('settings.lightName', 'Giao diện Sáng (Light)')}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t('settings.lightDesc', 'Tươi sáng, thanh lịch, độ tương phản cao cho ban ngày.')}
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
              <p className="font-bold text-sm text-slate-900 dark:text-white">{t('settings.darkName', 'Giao diện Tối (Dark)')}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t('settings.darkDesc', 'Tông xám than dịu mắt, chống mỏi mắt khi sử dụng ban đêm.')}
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
              <p className="font-bold text-sm text-slate-900 dark:text-white">{t('settings.autoName', 'Theo Thiết Bị (Auto)')}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t('settings.autoDesc', 'Tự động đồng bộ theo chế độ hiển thị hệ thống của máy.')}
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* 4. USER & AUTHENTICATION SPEC */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <KeyRound className="w-5 h-5 text-emerald-500" />
          <h3 className="text-base font-bold text-slate-800 dark:text-white">
            {t('settings.authTitle', 'Tài Khoản & Xác Thực (Authentication)')}
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
                {t('settings.highSecurity', 'Bảo mật cao')}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
          <p>
            {t('settings.authStandards', 'Tiêu chuẩn công nghệ: Hỗ trợ tích hợp Clerk Auth, NextAuth.js hoặc Supabase Auth với Single Sign-On (Google OAuth, Apple ID, Email OTP).')}
          </p>
          <p>
            {t('settings.authIsolation', 'Bảo mật dữ liệu: Mỗi người dùng có không gian lưu trữ riêng biệt (Multi-tenancy isolation), mã hóa các giao dịch nhạy cảm.')}
          </p>
        </div>
      </div>
    </div>
  );
};
