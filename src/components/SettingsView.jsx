'use client';
import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { KeyRound, Sun, Moon, Monitor, Check, Palette, Globe, ShieldCheck, ShieldAlert, Lock, Unlock, Download, Upload, Database, Server, CheckCircle2, AlertCircle } from 'lucide-react';
import { LANGUAGES } from '@/lib/i18n';

export const SettingsView = () => {
    const { 
        theme, setTheme, language, setLanguage, t, 
        security, updateSecuritySettings,
        userProfile, updateUserProfile,
        exportDatabaseJSON, importDatabaseJSON,
        showConfirm
    } = useApp();

    const [pinCodeInput, setPinCodeInput] = useState('');
    const [pinMessage, setPinMessage] = useState({ text: '', type: '' });
    const [isSavingPin, setIsSavingPin] = useState(false);

    const [profileName, setProfileName] = useState(userProfile?.name || 'Admin');
    const [profileEmail, setProfileEmail] = useState(userProfile?.email || 'admin@fintrack.vn');
    const [profileSaved, setProfileSaved] = useState(false);

    const handleSaveProfile = (e) => {
        e.preventDefault();
        updateUserProfile({ name: profileName, email: profileEmail });
        setProfileSaved(true);
        setTimeout(() => setProfileSaved(false), 2500);
    };

    const handleTogglePin = async () => {
        setIsSavingPin(true);
        const nextState = !security?.pinEnabled;
        if (nextState && !security?.hasPin && !pinCodeInput.trim()) {
            setPinMessage({
                text: language === 'en' ? 'Please enter a 4-8 digit PIN code below before enabling!' : 'Vui lòng nhập mã PIN từ 4-8 chữ số bên dưới trước khi kích hoạt!',
                type: 'error'
            });
            setIsSavingPin(false);
            return;
        }
        const res = await updateSecuritySettings({
            pinEnabled: nextState,
            pinCode: pinCodeInput.trim() || undefined,
        });
        setIsSavingPin(false);
        if (res.success) {
            setPinMessage({
                text: nextState 
                    ? (language === 'en' ? 'PIN Protection activated! API storage is now guarded against unauthorized access.' : 'Đã bật bảo vệ PIN! API /api/storage đã được khóa an toàn chống truy cập trái phép qua Ngrok.') 
                    : (language === 'en' ? 'PIN Protection disabled.' : 'Đã tắt bảo vệ PIN.'),
                type: 'success'
            });
            setPinCodeInput('');
        } else {
            setPinMessage({ text: res.error || t('common.actionFailed', 'Thao tác thất bại'), type: 'error' });
        }
    };

    const handleUpdatePin = async (e) => {
        e.preventDefault();
        const cleanPin = pinCodeInput.trim();
        if (!/^\d{4,8}$/.test(cleanPin)) {
            setPinMessage({
                text: language === 'en' ? 'PIN must be 4-8 digits!' : 'Mã PIN phải gồm 4-8 chữ số!',
                type: 'error'
            });
            return;
        }
        setIsSavingPin(true);
        const res = await updateSecuritySettings({
            pinEnabled: true,
            pinCode: cleanPin,
        });
        setIsSavingPin(false);
        if (res.success) {
            setPinMessage({
                text: language === 'en' ? 'Security PIN successfully updated!' : 'Đã cập nhật mã PIN bảo mật thành công!',
                type: 'success'
            });
            setPinCodeInput('');
        } else {
            setPinMessage({ text: res.error || t('common.updateFailed', 'Cập nhật thất bại'), type: 'error' });
        }
    };

    const handleFileImport = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            const content = event.target?.result;
            if (typeof content === 'string') {
                const ok = await importDatabaseJSON(content);
                if (ok) {
                    showConfirm({
                        title: language === 'en' ? 'Import Succeeded' : 'Nhập dữ liệu thành công',
                        message: language === 'en' ? 'Data imported successfully from backup!' : 'Đã nhập dữ liệu thành công từ file sao lưu!',
                        confirmText: 'OK',
                        cancelText: null,
                        variant: 'info'
                    });
                } else {
                    showConfirm({
                        title: language === 'en' ? 'Import Failed' : 'Nhập dữ liệu thất bại',
                        message: language === 'en' ? 'Failed to import data: invalid backup structure or corrupted file!' : 'Lỗi khi nhập dữ liệu: định dạng file sao lưu không hợp lệ!',
                        confirmText: 'OK',
                        cancelText: null,
                        variant: 'danger'
                    });
                }
            }
        };
        reader.readAsText(file);
    };

    return (<div className="space-y-6 pb-12">
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
            <Globe className="w-5 h-5 text-emerald-500"/>
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
            return (<button key={item.code} type="button" onClick={() => setLanguage(item.code)} className={`p-4 rounded-xl border-2 text-left transition-all flex flex-col justify-between relative cursor-pointer ${isSelected
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'}`}>
                <div className="flex items-center justify-between w-full mb-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl shadow-2xs">
                    {item.flag}
                  </div>
                  {isSelected && (<span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5"/>
                    </span>)}
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
              </button>);
        })}
        </div>
      </div>

      {/* 3. THEME & APPEARANCE */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <Palette className="w-5 h-5 text-indigo-500"/>
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
          <button type="button" onClick={() => setTheme('light')} className={`p-4 rounded-xl border-2 text-left transition-all flex flex-col justify-between relative cursor-pointer ${theme === 'light'
            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm'
            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'}`}>
            <div className="flex items-center justify-between w-full mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Sun className="w-5 h-5"/>
              </div>
              {theme === 'light' && (<span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                  <Check className="w-3.5 h-3.5"/>
                </span>)}
            </div>
            <div>
              <p className="font-bold text-sm text-slate-900 dark:text-white">{t('settings.lightName', 'Giao diện Sáng (Light)')}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t('settings.lightDesc', 'Tươi sáng, thanh lịch, độ tương phản cao cho ban ngày.')}
              </p>
            </div>
          </button>

          {/* Dark theme card */}
          <button type="button" onClick={() => setTheme('dark')} className={`p-4 rounded-xl border-2 text-left transition-all flex flex-col justify-between relative cursor-pointer ${theme === 'dark'
            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm'
            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'}`}>
            <div className="flex items-center justify-between w-full mb-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 text-indigo-400 flex items-center justify-center">
                <Moon className="w-5 h-5"/>
              </div>
              {theme === 'dark' && (<span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                  <Check className="w-3.5 h-3.5"/>
                </span>)}
            </div>
            <div>
              <p className="font-bold text-sm text-slate-900 dark:text-white">{t('settings.darkName', 'Giao diện Tối (Dark)')}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t('settings.darkDesc', 'Tông xám than dịu mắt, chống mỏi mắt khi sử dụng ban đêm.')}
              </p>
            </div>
          </button>

          {/* System theme card */}
          <button type="button" onClick={() => setTheme('system')} className={`p-4 rounded-xl border-2 text-left transition-all flex flex-col justify-between relative cursor-pointer ${theme === 'system'
            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm'
            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'}`}>
            <div className="flex items-center justify-between w-full mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Monitor className="w-5 h-5"/>
              </div>
              {theme === 'system' && (<span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                  <Check className="w-3.5 h-3.5"/>
                </span>)}
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

      {/* 4. SECURITY & API GUARD (FIX ISSUES 1, 2 & 11) */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <KeyRound className="w-5 h-5 text-rose-500"/>
            <h3 className="text-base font-bold text-slate-800 dark:text-white">
              {language === 'en' ? 'Security & API Guard (App PIN & Ngrok Protection)' : 'Bảo Mật & Khóa Ứng Dụng (Mã PIN & API Guard)'}
            </h3>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 self-start sm:self-auto ${
            security?.pinEnabled 
              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300' 
              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
          }`}>
            {security?.pinEnabled ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            <span>{security?.pinEnabled 
              ? (language === 'en' ? 'PIN Protection Active' : 'Đang Bật Khóa PIN') 
              : (language === 'en' ? 'Unprotected (Local Mode)' : 'Chưa Khóa PIN (Chế độ nội bộ)')}
            </span>
          </span>
        </div>

        <div className={`p-4 rounded-2xl border transition-all ${
          security?.pinEnabled
            ? 'bg-gradient-to-r from-rose-500/10 to-amber-500/10 border-rose-200 dark:border-rose-800/40'
            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                {security?.pinEnabled ? <ShieldCheck className="w-5 h-5 text-emerald-500" /> : <ShieldAlert className="w-5 h-5 text-amber-500" />}
                <span>{security?.pinEnabled 
                  ? (language === 'en' ? 'Storage API & Interface are Protected' : 'Dữ Liệu & API /api/storage Đang Được Khóa Bảo Mật')
                  : (language === 'en' ? 'Public Ngrok Access Warning' : 'Cảnh Báo Khi Mở Đường Dẫn Ngrok')}
                </span>
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                {security?.pinEnabled
                  ? (language === 'en'
                      ? 'Anyone accessing via Ngrok or a new device must supply the correct PIN code to read or write database records.'
                      : 'Mọi thiết bị hoặc người truy cập qua đường dẫn Ngrok bắt buộc phải nhập đúng mã PIN trước khi đọc hoặc ghi vào cơ sở dữ liệu.')
                  : (language === 'en'
                      ? 'Anyone with your Ngrok public link can read and write to your database. Enable PIN protection to prevent unauthorized access!'
                      : 'Nếu bạn đang chia sẻ link Ngrok ra ngoài, bất kỳ ai có link đều có thể đọc/ghi database. Hãy bật mã PIN để khóa bảo vệ dữ liệu!')}
              </p>
            </div>
            <button
              type="button"
              disabled={isSavingPin}
              onClick={handleTogglePin}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm shrink-0 cursor-pointer ${
                security?.pinEnabled
                  ? 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white'
                  : 'bg-rose-600 hover:bg-rose-700 text-white'
              }`}
            >
              {security?.pinEnabled 
                ? (language === 'en' ? 'Disable PIN Protection' : 'Tắt Khóa PIN') 
                : (language === 'en' ? 'Enable PIN Protection' : 'Bật Bảo Vệ Mã PIN')}
            </button>
          </div>

          {/* Set / Change PIN Form */}
          <form onSubmit={handleUpdatePin} className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1">
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                {language === 'en' ? 'Set or Change PIN Code (4-8 digits):' : 'Thiết lập hoặc đổi mã PIN mới (4-8 chữ số):'}
              </label>
              <input
                type="password"
                maxLength={8}
                value={pinCodeInput}
                onChange={(e) => setPinCodeInput(e.target.value.replace(/\D/g, ''))}
                placeholder={t('settings.pinPlaceholder', 'Ví dụ: 1234 hoặc 2026')}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold dark:text-white"
              />
            </div>
            <button
              type="submit"
              disabled={isSavingPin || !pinCodeInput.trim()}
              className="mt-auto py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
            >
              {language === 'en' ? 'Save PIN Code' : 'Lưu Mã PIN'}
            </button>
          </form>

          {pinMessage.text && (
            <p className={`text-xs mt-3 font-semibold ${pinMessage.type === 'error' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {pinMessage.text}
            </p>
          )}
        </div>

        {/* User profile section */}
        <form onSubmit={handleSaveProfile} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {language === 'en' ? 'User Profile Information' : 'Thông Tin Hồ Sơ Người Dùng'}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {language === 'en' ? 'Display Name:' : 'Họ và Tên:'}
              </label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {language === 'en' ? 'Email Address:' : 'Địa Chỉ Email:'}
              </label>
              <input
                type="email"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold dark:text-white"
              />
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400">
              {profileSaved && (language === 'en' ? '✓ Profile saved' : '✓ Đã lưu hồ sơ thành công')}
            </span>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
            >
              {language === 'en' ? 'Update Profile' : 'Cập Nhật Hồ Sơ'}
            </button>
          </div>
        </form>
      </div>

      {/* 5. DATA PERSISTENCE & DEPLOYMENT GUIDE (FIX ISSUE 15) */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <Database className="w-5 h-5 text-blue-500"/>
          <h3 className="text-base font-bold text-slate-800 dark:text-white">
            {language === 'en' ? 'Data Persistence & Backup Architecture' : 'Lưu Trữ Bền Vững & Sao Lưu Dữ Liệu (Data Persistence)'}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
              <Server className="w-4 h-4" />
              <span>{language === 'en' ? 'Local / Self-hosted / VPS / Docker' : 'Chạy Cục Bộ / Máy Chủ VPS / Docker'}</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {language === 'en'
                ? 'Data is stored permanently on disk at `data/database.json` with atomic file writes to prevent corruption. Your records persist across restarts.'
                : 'Dữ liệu được lưu trữ vĩnh viễn trên ổ cứng tại thư mục `data/database.json` với cơ chế ghi nguyên tử (atomic write) chống lỗi file. Dữ liệu được bảo toàn trọn vẹn qua các lần khởi động.'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400 font-bold text-xs">
              <AlertCircle className="w-4 h-4" />
              <span>{language === 'en' ? 'Serverless Hosting (e.g. Vercel)' : 'Triển Khai Serverless (Vercel)'}</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {language === 'en'
                ? 'Serverless containers have ephemeral filesystems (/tmp). FinTrack maintains an offline client cache on LocalStorage and lets you export/import full JSON backups below.'
                : 'Môi trường Serverless của Vercel có hệ thống tệp tạm thời (/tmp). FinTrack duy trì bộ nhớ đệm an toàn trên trình duyệt (LocalStorage) và hỗ trợ Xuất/Nhập tệp JSON sao lưu dự phòng bên dưới.'}
            </p>
          </div>
        </div>

        {/* Export / Import Buttons */}
        <div className="pt-2 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={exportDatabaseJSON}
            className="flex items-center space-x-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold border border-blue-200 dark:border-blue-800 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{language === 'en' ? 'Export Backup Data (JSON)' : 'Xuất Tệp Dữ Liệu Dự Phòng (JSON)'}</span>
          </button>

          <label className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold border border-emerald-200 dark:border-emerald-800 transition-all cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>{language === 'en' ? 'Restore Data from JSON' : 'Khôi Phục Dữ Liệu Từ Tệp JSON'}</span>
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleFileImport}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>);
};

