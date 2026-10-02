'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { KeyRound, Sun, Moon, Monitor, Check, Palette, Globe, ShieldCheck, ShieldAlert, Lock, Unlock, Download, Upload, Database, Server, CheckCircle2, AlertCircle, UserCog, Trash2 } from 'lucide-react';
import { LANGUAGES } from '@/lib/i18n';

export const SettingsView = () => {
    const { 
        theme, setTheme, language, setLanguage, t, 
        security, updateSecuritySettings,
        userProfile, updateUserProfile,
        exportDatabaseJSON, importDatabaseJSON,
        listSecureBackups, createSecureBackup,
        restoreSecureBackup, deleteSecureBackup,
        showConfirm,
        currentUser, changePassword, deleteAccount,
        googleAuth, startGoogleAuth, unlinkGoogle
    } = useApp();
    const isEn = language === 'en';
    // Accounts created with Google have no password until the user sets one
    const hasPassword = currentUser?.hasPassword !== false;
    const [googleMessage, setGoogleMessage] = useState('');

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [passwordMessage, setPasswordMessage] = useState({ text: '', type: '' });
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [deleteMessage, setDeleteMessage] = useState('');

    const [pinCodeInput, setPinCodeInput] = useState('');
    const [pinMessage, setPinMessage] = useState({ text: '', type: '' });
    const [isSavingPin, setIsSavingPin] = useState(false);

    const [profileName, setProfileName] = useState(userProfile?.name || 'Admin');
    const [profileEmail, setProfileEmail] = useState(userProfile?.email || 'admin@fintrack.vn');
    const [profileSaved, setProfileSaved] = useState(false);

    const [secureBackups, setSecureBackups] = useState([]);
    const [secureBackupLoading, setSecureBackupLoading] = useState(false);

    const refreshSecureBackups = useCallback(async () => {
        setSecureBackupLoading(true);
        const result = await listSecureBackups();
        if (result.success) {
            setSecureBackups(result.backups || []);
        }
        setSecureBackupLoading(false);
    }, [listSecureBackups]);

    useEffect(() => {
        refreshSecureBackups();
    }, [refreshSecureBackups]);

    const handleCreateSecureBackup = async () => {
        setSecureBackupLoading(true);
        const result = await createSecureBackup();
        if (result.success) {
            await refreshSecureBackups();
            showConfirm({
                title: language === 'en' ? 'Backup Created' : 'Tạo sao lưu thành công',
                message: language === 'en' ? 'Secure backup created successfully.' : 'Đã tạo bản sao lưu an toàn thành công.',
                confirmText: 'OK',
                cancelText: null,
                variant: 'info',
            });
        } else {
            showConfirm({
                title: language === 'en' ? 'Backup Failed' : 'Tạo sao lưu thất bại',
                message: result.error || (language === 'en' ? 'Failed to create secure backup.' : 'Thao tác tạo bản sao lưu thất bại.'),
                confirmText: 'OK',
                cancelText: null,
                variant: 'danger',
            });
        }
        setSecureBackupLoading(false);
    };

    const handleRestoreSecureBackup = (backup) => {
        const dateStr = new Date(backup.createdAt).toLocaleString(language === 'en' ? 'en-GB' : 'vi-VN');
        showConfirm({
            title: language === 'en' ? 'Restore Secure Backup' : 'Khôi phục sao lưu an toàn',
            message: language === 'en'
                ? `Restore backup from ${dateStr}?\n\nA safety backup of your current data will be created automatically before restoring.`
                : `Khôi phục bản sao lưu ngày ${dateStr}?\n\nHệ thống sẽ tự động tạo một bản sao lưu an toàn của dữ liệu hiện tại trước khi khôi phục.`,
            confirmText: language === 'en' ? 'Restore Now' : 'Khôi phục ngay',
            cancelText: language === 'en' ? 'Cancel' : 'Hủy',
            variant: 'warning',
            onConfirm: async () => {
                setSecureBackupLoading(true);
                const result = await restoreSecureBackup(backup.id);
                if (result.success) {
                    await refreshSecureBackups();
                    showConfirm({
                        title: language === 'en' ? 'Restored Successfully' : 'Khôi phục thành công',
                        message: language === 'en' ? 'Secure backup restored successfully.' : 'Đã khôi phục bản sao lưu an toàn thành công.',
                        confirmText: 'OK',
                        cancelText: null,
                        variant: 'info',
                    });
                } else {
                    showConfirm({
                        title: language === 'en' ? 'Restore Failed' : 'Khôi phục thất bại',
                        message: result.error || (language === 'en' ? 'Failed to restore secure backup.' : 'Khôi phục thất bại.'),
                        confirmText: 'OK',
                        cancelText: null,
                        variant: 'danger',
                    });
                }
                setSecureBackupLoading(false);
            },
        });
    };

    const handleDeleteSecureBackup = (backup) => {
        const dateStr = new Date(backup.createdAt).toLocaleString(language === 'en' ? 'en-GB' : 'vi-VN');
        showConfirm({
            title: language === 'en' ? 'Delete Backup' : 'Xóa bản sao lưu',
            message: language === 'en'
                ? `Permanently delete secure backup from ${dateStr}? This action cannot be undone.`
                : `Xóa vĩnh viễn bản sao lưu an toàn ngày ${dateStr}? Thao tác này không thể hoàn tác.`,
            confirmText: language === 'en' ? 'Delete Permanently' : 'Xóa vĩnh viễn',
            cancelText: language === 'en' ? 'Cancel' : 'Hủy',
            variant: 'danger',
            onConfirm: async () => {
                setSecureBackupLoading(true);
                const result = await deleteSecureBackup(backup.id);
                if (result.success) {
                    await refreshSecureBackups();
                } else {
                    showConfirm({
                        title: language === 'en' ? 'Delete Failed' : 'Xóa thất bại',
                        message: result.error || (language === 'en' ? 'Failed to delete secure backup.' : 'Xóa bản sao lưu thất bại.'),
                        confirmText: 'OK',
                        cancelText: null,
                        variant: 'danger',
                    });
                }
                setSecureBackupLoading(false);
            },
        });
    };

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

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (newPassword.length < 8) {
            setPasswordMessage({ text: isEn ? 'New password must be at least 8 characters.' : 'Mật khẩu mới phải có ít nhất 8 ký tự.', type: 'error' });
            return;
        }
        if (newPassword !== confirmNewPassword) {
            setPasswordMessage({ text: isEn ? 'Password confirmation does not match.' : 'Mật khẩu xác nhận không khớp.', type: 'error' });
            return;
        }
        setIsChangingPassword(true);
        const res = await changePassword(currentPassword, newPassword);
        setIsChangingPassword(false);
        if (res.success) {
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
            setPasswordMessage({ text: isEn ? 'Password changed. Other devices have been signed out.' : 'Đã đổi mật khẩu. Các thiết bị khác đã bị đăng xuất.', type: 'success' });
        } else {
            setPasswordMessage({ text: res.error, type: 'error' });
        }
    };

    const handleUnlinkGoogle = () => {
        setGoogleMessage('');
        showConfirm({
            title: isEn ? 'Unlink Google' : 'Hủy liên kết Google',
            message: isEn
                ? `Stop signing in with ${currentUser?.googleEmail || 'this Google account'}? You will sign in with your password.`
                : `Ngừng đăng nhập bằng ${currentUser?.googleEmail || 'tài khoản Google này'}? Bạn sẽ đăng nhập bằng mật khẩu.`,
            confirmText: isEn ? 'Unlink' : 'Hủy liên kết',
            cancelText: isEn ? 'Cancel' : 'Hủy',
            variant: 'danger',
            onConfirm: async () => {
                const res = await unlinkGoogle();
                setGoogleMessage(res.success ? (isEn ? 'Google account unlinked.' : 'Đã hủy liên kết Google.') : (res.error || ''));
            },
        });
    };

    const handleDeleteAccount = (e) => {
        e.preventDefault();
        setDeleteMessage('');
        if (!deletePassword) {
            setDeleteMessage(isEn ? 'Enter your password to confirm.' : 'Nhập mật khẩu để xác nhận.');
            return;
        }
        showConfirm({
            title: isEn ? 'Delete account' : 'Xóa tài khoản',
            message: isEn
                ? 'Permanently delete this account, all wallets, transactions and encrypted backups on the server? This cannot be undone. Export a JSON backup first if you want to keep your data.'
                : 'Xóa vĩnh viễn tài khoản này cùng toàn bộ ví, giao dịch và bản sao lưu mã hóa trên máy chủ? Không thể hoàn tác. Hãy xuất file sao lưu JSON trước nếu muốn giữ dữ liệu.',
            confirmText: isEn ? 'Delete permanently' : 'Xóa vĩnh viễn',
            cancelText: isEn ? 'Cancel' : 'Hủy',
            variant: 'danger',
            onConfirm: async () => {
                const res = await deleteAccount(deletePassword);
                if (!res.success) {
                    setDeleteMessage(res.error);
                }
            },
        });
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
      </div>

      {/* 2. DISPLAY LANGUAGE */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <Globe className="w-5 h-5 text-emerald-500"/>
            <h3 className="text-base font-bold text-slate-800 dark:text-white">
              {t('settings.languageTitle', 'Ngôn Ngữ Hiển Thị')}
            </h3>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold self-start sm:self-auto flex items-center gap-1.5">
            <span>{LANGUAGES.find((l) => l.code === language)?.flag}</span>
            <span>{LANGUAGES.find((l) => l.code === language)?.nativeName}</span>
          </span>
        </div>

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
              {t('settings.themeSection', 'Tùy Chỉnh Giao Diện & Chủ Đề')}
            </h3>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium self-start sm:self-auto">
            {t('settings.currentTheme', 'Đang dùng:')} {theme === 'light' ? t('settings.themeLight', 'Chế độ Sáng') : theme === 'dark' ? t('settings.themeDark', 'Chế độ Tối') : t('settings.themeAuto', 'Tự động')}
          </span>
        </div>

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
              <p className="font-bold text-sm text-slate-900 dark:text-white">{t('settings.lightName', 'Giao diện Sáng')}</p>
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
              <p className="font-bold text-sm text-slate-900 dark:text-white">{t('settings.darkName', 'Giao diện Tối')}</p>
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
              <p className="font-bold text-sm text-slate-900 dark:text-white">{t('settings.autoName', 'Theo Thiết Bị')}</p>
            </div>
          </button>
        </div>
      </div>

      {/* 4. SECURITY & API GUARD */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <KeyRound className="w-5 h-5 text-rose-500"/>
            <h3 className="text-base font-bold text-slate-800 dark:text-white">
              {language === 'en' ? 'Security & App Lock' : 'Bảo Mật & Khóa Ứng Dụng'}
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
              : (language === 'en' ? 'Unprotected' : 'Chưa Khóa PIN')}
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
                  ? (language === 'en' ? 'Storage API & Interface are Protected' : 'Dữ Liệu & API Đang Được Khóa Bảo Mật')
                  : (language === 'en' ? 'Public Ngrok Access Warning' : 'Cảnh Báo Khi Mở Đường Dẫn Ngrok')}
                </span>
              </h4>
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

      {/* 4b. ACCOUNT: change password / delete account */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <UserCog className="w-5 h-5 text-indigo-500"/>
          <h3 className="text-base font-bold text-slate-800 dark:text-white">
            {isEn ? 'Account' : 'Tài Khoản'}
          </h3>
          {currentUser?.username && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
              {currentUser.username}
            </span>
          )}
        </div>

        <form onSubmit={handleChangePassword} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {hasPassword ? (isEn ? 'Change password' : 'Đổi mật khẩu') : (isEn ? 'Set a password' : 'Đặt mật khẩu')}
          </h4>
          {!hasPassword && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {isEn
                ? 'This account signs in with Google. Add a password to also sign in with your username.'
                : 'Tài khoản này đăng nhập bằng Google. Đặt mật khẩu để có thể đăng nhập bằng tên đăng nhập.'}
            </p>
          )}
          {/* Hidden username field lets password managers associate the new password with the right account */}
          <input type="text" name="username" autoComplete="username" value={currentUser?.username || ''} readOnly hidden />
          <div className={`grid grid-cols-1 gap-3 ${hasPassword ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
            {hasPassword && <div>
              <label htmlFor="current-password" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {isEn ? 'Current password:' : 'Mật khẩu hiện tại:'}
              </label>
              <input id="current-password" type="password" autoComplete="current-password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold dark:text-white"/>
            </div>}
            <div>
              <label htmlFor="new-password" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {isEn ? 'New password (8+ characters):' : 'Mật khẩu mới (từ 8 ký tự):'}
              </label>
              <input id="new-password" type="password" autoComplete="new-password" required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold dark:text-white"/>
            </div>
            <div>
              <label htmlFor="confirm-new-password" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {isEn ? 'Confirm new password:' : 'Xác nhận mật khẩu mới:'}
              </label>
              <input id="confirm-new-password" type="password" autoComplete="new-password" required minLength={8} value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold dark:text-white"/>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 pt-1">
            <span className={`text-[11px] font-semibold ${passwordMessage.type === 'error' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {passwordMessage.text}
            </span>
            <button type="submit" disabled={isChangingPassword}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-sm shrink-0">
              {hasPassword ? (isEn ? 'Change password' : 'Đổi mật khẩu') : (isEn ? 'Set password' : 'Đặt mật khẩu')}
            </button>
          </div>
        </form>

        {/* Google account link */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {isEn ? 'Google account' : 'Tài khoản Google'}
          </h4>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-600 dark:text-slate-300 min-w-0 break-all">
              {currentUser?.googleLinked
                ? <>{isEn ? 'Linked to' : 'Đã liên kết với'} <strong>{currentUser.googleEmail || 'Google'}</strong></>
                : googleAuth?.enabled
                  ? (isEn ? 'Not linked. Link it to sign in with one click.' : 'Chưa liên kết. Liên kết để đăng nhập bằng Google chỉ với một chạm.')
                  : (isEn ? 'Google sign-in is not configured on this server (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).' : 'Máy chủ chưa cấu hình đăng nhập Google (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).')}
            </p>
            {currentUser?.googleLinked ? (
              <button type="button" onClick={handleUnlinkGoogle} className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl shrink-0">
                {isEn ? 'Unlink' : 'Hủy liên kết'}
              </button>
            ) : googleAuth?.enabled && (
              <button type="button" onClick={() => startGoogleAuth('link')} className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white text-xs font-bold rounded-xl shrink-0">
                {isEn ? 'Link Google account' : 'Liên kết Google'}
              </button>
            )}
          </div>
          {googleMessage && <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">{googleMessage}</p>}
        </div>

        {currentUser?.role === 'host' ? (
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {isEn
              ? 'Forgot the host password? On the server machine run: npm run reset-password -- admin'
              : 'Quên mật khẩu host? Trên máy chủ chạy: npm run reset-password -- admin'}
          </p>
        ) : (
          <form onSubmit={handleDeleteAccount} className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5"/>
              {isEn ? 'Delete account' : 'Xóa tài khoản'}
            </h4>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              {isEn
                ? 'Removes your account and all of its data from the server. This cannot be undone.'
                : 'Xóa tài khoản và toàn bộ dữ liệu của bạn khỏi máy chủ. Không thể hoàn tác.'}
              {!hasPassword && (isEn ? ' Set a password above first to confirm the deletion.' : ' Hãy đặt mật khẩu ở trên trước để xác nhận việc xóa.')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input type="password" autoComplete="current-password" aria-label={isEn ? 'Password' : 'Mật khẩu'} placeholder={isEn ? 'Your password' : 'Mật khẩu của bạn'} value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)}
                className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold dark:text-white"/>
              <button type="submit" className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm shrink-0">
                {isEn ? 'Delete my account' : 'Xóa tài khoản của tôi'}
              </button>
            </div>
            {deleteMessage && <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">{deleteMessage}</p>}
          </form>
        )}
      </div>

      {/* 5. DATA PERSISTENCE & DEPLOYMENT GUIDE (FIX ISSUE 15) */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <Database className="w-5 h-5 text-blue-500"/>
          <h3 className="text-base font-bold text-slate-800 dark:text-white">
            {language === 'en' ? 'Data Persistence & Backup Architecture' : 'Lưu Trữ Bền Vững & Sao Lưu Dữ Liệu'}
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
                : 'Dữ liệu được lưu trữ vĩnh viễn trên ổ cứng tại thư mục `data/database.json` với cơ chế ghi nguyên tử chống lỗi file. Dữ liệu được bảo toàn trọn vẹn qua các lần khởi động.'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400 font-bold text-xs">
              <AlertCircle className="w-4 h-4" />
              <span>{language === 'en' ? 'Serverless Hosting (Vercel)' : 'Triển Khai Serverless (Vercel)'}</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {language === 'en'
                ? 'Serverless containers have ephemeral filesystems (/tmp). FinTrack maintains an offline client cache on LocalStorage and lets you export/import full JSON backups below.'
                : 'Môi trường Serverless của Vercel có hệ thống tệp tạm thời (/tmp). FinTrack duy trì bộ nhớ đệm an toàn trên trình duyệt và hỗ trợ Xuất/Nhập tệp JSON sao lưu dự phòng bên dưới.'}
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
            <span>{language === 'en' ? 'Export Backup Data' : 'Xuất Tệp Dữ Liệu Dự Phòng'}</span>
          </button>

          <label className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold border border-emerald-200 dark:border-emerald-800 transition-all cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>{language === 'en' ? 'Restore Data' : 'Khôi Phục Dữ Liệu Dự Phòng'}</span>
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleFileImport}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* 6. SECURE ENCRYPTED BACKUPS */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-500" />
              <h3 className="text-base font-bold text-slate-800 dark:text-white">
                {language === 'en' ? 'Secure Backups' : 'Sao Lưu An Toàn'}
              </h3>
            </div>
          </div>

          <button
            type="button"
            disabled={secureBackupLoading}
            onClick={handleCreateSecureBackup}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Database className="w-4 h-4" />
            <span>
              {secureBackupLoading
                ? '...'
                : (language === 'en' ? 'Create Secure Backup' : 'Tạo Bản Sao Lưu An Toàn')}
            </span>
          </button>
        </div>

        {secureBackups.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            {language === 'en' ? 'No secure backups yet.' : 'Chưa có bản sao lưu an toàn nào.'}
          </div>
        ) : (
          <div className="space-y-2">
            {secureBackups.map((backup) => (
              <div
                key={backup.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-800 dark:text-white">
                    {new Date(backup.createdAt).toLocaleString(
                      language === 'en' ? 'en-GB' : 'vi-VN'
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {(backup.size / 1024).toFixed(1)} KB
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={secureBackupLoading}
                    onClick={() => handleRestoreSecureBackup(backup)}
                    className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/60 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {language === 'en' ? 'Restore' : 'Khôi phục'}
                  </button>

                  <button
                    type="button"
                    disabled={secureBackupLoading}
                    onClick={() => handleDeleteSecureBackup(backup)}
                    className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {language === 'en' ? 'Delete' : 'Xóa'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>);
};

