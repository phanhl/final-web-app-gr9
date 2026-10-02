'use client';
import React, { useState } from 'react';
import {
    User,
    Lock,
    LogIn,
    UserPlus,
    ShieldCheck,
    Eye,
    EyeOff,
    AlertCircle,
    CheckCircle2,
    Sparkles,
    KeyRound,
} from 'lucide-react';

export function AuthModal({ onLoginSuccess, isHostPasswordSet, language = 'vi', notice = '' }) {
    const [mode, setMode] = useState('login'); // 'login' | 'register'
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [setupCode, setSetupCode] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const isVi = language !== 'en';
    // First-time host setup needs the one-time code printed on the server console
    const needsSetupCode = mode === 'login' && !isHostPasswordSet && username.trim().toLowerCase() === 'admin';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        const cleanUser = username.trim().toLowerCase();
        if (!cleanUser) {
            setError(isVi ? 'Vui lòng nhập tên đăng nhập' : 'Please enter a username');
            return;
        }

        if (!password) {
            setError(isVi ? 'Vui lòng nhập mật khẩu' : 'Please enter a password');
            return;
        }

        if (mode === 'register' || needsSetupCode) {
            if (password.length < 8) {
                setError(isVi ? 'Mật khẩu phải có ít nhất 8 ký tự' : 'Password must be at least 8 characters');
                return;
            }
        }
        if (needsSetupCode && !setupCode.trim()) {
            setError(isVi ? 'Vui lòng nhập mã thiết lập hiển thị ở terminal chạy server' : 'Please enter the setup code shown in the server terminal');
            return;
        }

        if (mode === 'register') {
            if (password !== confirmPassword) {
                setError(isVi ? 'Mật khẩu xác nhận không khớp' : 'Passwords do not match');
                return;
            }
        }

        setLoading(true);
        try {
            let initialData = null;
            if (mode === 'register') {
                try {
                    const saved = localStorage.getItem('quan_ly_chi_tieu_data_v2');
                    if (saved) {
                        const parsed = JSON.parse(saved);
                        // The server accepts sign-up requests up to 1 MB: bigger offline data (e.g. receipt photos)
                        // is left out and can be imported as a JSON backup from Settings after signing up
                        if (parsed && Array.isArray(parsed.wallets) && parsed.wallets.length > 0 && saved.length < 900 * 1024) {
                            initialData = parsed;
                        }
                    }
                } catch (e) {}
            }

            const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
            const body = mode === 'login'
                ? { username: cleanUser, password, ...(needsSetupCode ? { setupCode: setupCode.trim() } : {}) }
                : { username: cleanUser, password, displayName: displayName.trim() || cleanUser, initialData };

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                setError(data.error || (isVi ? 'Đăng nhập không thành công' : 'Authentication failed'));
                setLoading(false);
                return;
            }

            setSuccessMessage(data.message || (isVi ? 'Thành công!' : 'Success!'));
            try {
                // Clear only un-scoped legacy cache
                localStorage.removeItem('quan_ly_chi_tieu_data_v2');
                localStorage.removeItem('fintrack_user_profile');
            } catch (e) {}

            setTimeout(() => {
                if (onLoginSuccess) {
                    onLoginSuccess(data.user);
                }
            }, 300);
        } catch (err) {
            setError(isVi ? 'Không thể kết nối đến máy chủ. Vui lòng thử lại.' : 'Network error. Please try again.');
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 backdrop-blur-xl p-4 overflow-y-auto">
            {/* Subtle background glow effect */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

            <div className="relative w-full max-w-md bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl shadow-2xl p-6 sm:p-8 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
                {/* Brand Header */}
                <div className="text-center space-y-2 mb-6">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white shadow-lg shadow-blue-500/30 mb-1">
                        <ShieldCheck className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                        FinTrack <span className="text-blue-600 dark:text-blue-400">Pro</span>
                    </h2>
                </div>

                {/* Tab Switcher: Login vs Register */}
                <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-2xl mb-6">
                    <button
                        type="button"
                        onClick={() => { setMode('login'); setError(''); setSuccessMessage(''); }}
                        className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                            mode === 'login'
                                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <LogIn className="w-3.5 h-3.5" />
                        {isVi ? 'Đăng Nhập' : 'Sign In'}
                    </button>
                    <button
                        type="button"
                        onClick={() => { setMode('register'); setError(''); setSuccessMessage(''); }}
                        className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                            mode === 'register'
                                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <UserPlus className="w-3.5 h-3.5" />
                        {isVi ? 'Tạo Tài Khoản Khách' : 'Sign Up'}
                    </button>
                </div>

                {notice && (
                    <div role="status" className="mb-5 p-3 rounded-2xl bg-slate-500/10 border border-slate-500/20 text-slate-700 dark:text-slate-300 text-xs flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{notice}</span>
                    </div>
                )}

                {/* Helper info badge */}
                {mode === 'login' && !isHostPasswordSet && (
                    <div className="mb-5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-start gap-2">
                        <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>
                            {isVi
                                ? 'Chủ sở hữu: Đăng nhập với tài khoản "admin", đặt mật khẩu mới (ít nhất 8 ký tự) và nhập mã thiết lập in ở terminal chạy server (hoặc trong file data/.host_setup_code).'
                                : 'Host: Sign in as "admin", choose a new password (8+ characters) and enter the setup code printed in the server terminal (or in data/.host_setup_code).'}
                        </span>
                    </div>
                )}

                {mode === 'register' && (
                    <div className="mb-5 p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400 text-xs flex items-start gap-2">
                        <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>
                            {isVi
                                ? 'Khách được cấp một không gian độc lập với User ID riêng. Dữ liệu của bạn được cô lập 100% và bảo mật tuyệt đối.'
                                : 'Guests receive an isolated workspace with a unique User ID. Your financial data is private.'}
                        </span>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {mode === 'register' && (
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                {isVi ? 'Tên hiển thị' : 'Display Name'}
                            </label>
                            <div className="relative">
                                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    placeholder={isVi ? 'VD: Bạn Minh' : 'e.g. Alex'}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                            {isVi ? 'Tên đăng nhập' : 'Username'}
                        </label>
                        <div className="relative">
                            <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                required
                                autoFocus
                                autoComplete="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder={mode === 'login' ? (isVi ? 'admin hoặc tên của bạn' : 'admin or username') : (isVi ? 'Chữ thường, số (VD: minh99)' : 'e.g. john_doe')}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                            {isVi ? 'Mật khẩu' : 'Password'}
                        </label>
                        <div className="relative">
                            <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                autoComplete={mode === 'login' && !needsSetupCode ? 'current-password' : 'new-password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full pl-10 pr-11 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {needsSetupCode && (
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                {isVi ? 'Mã thiết lập host' : 'Host setup code'}
                            </label>
                            <div className="relative">
                                <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    required
                                    autoComplete="one-time-code"
                                    value={setupCode}
                                    onChange={(e) => setSetupCode(e.target.value.toUpperCase())}
                                    placeholder="XXXXXXXX"
                                    maxLength={8}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono tracking-widest text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    )}

                    {mode === 'register' && (
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                {isVi ? 'Xác nhận mật khẩu' : 'Confirm Password'}
                            </label>
                            <div className="relative">
                                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {successMessage && (
                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>{successMessage}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white text-sm font-bold rounded-2xl shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
                    >
                        {loading ? (
                            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : mode === 'login' ? (
                            <>
                                <LogIn className="w-4 h-4" />
                                {isVi ? 'Đăng Nhập Vào Hệ Thống' : 'Sign In'}
                            </>
                        ) : (
                            <>
                                <UserPlus className="w-4 h-4" />
                                {isVi ? 'Tạo Tài Khoản & Bắt Đầu' : 'Create Account & Start'}
                            </>
                        )}
                    </button>
                </form>

                {/* Footer notice */}
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        {isVi
                            ? 'Dữ liệu được lưu trữ an toàn và bảo mật riêng cho từng User ID.'
                            : 'Data is securely stored and isolated per User ID.'}
                    </p>
                </div>
            </div>
        </div>
    );
}
