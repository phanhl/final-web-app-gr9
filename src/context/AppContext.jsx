'use client';
import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { INITIAL_WALLETS, INITIAL_TRANSACTIONS, INITIAL_BUDGETS, INITIAL_BILLS, INITIAL_GOALS, INITIAL_PLANNER, DEFAULT_CATEGORIES, INITIAL_SIMULATOR_CONFIG, } from '@/lib/mock-data';
import { calculateFinancialSummary, checkWalletSufficientFunds, formatCurrency, getLocalDateString, toLocalDateKey, normalizeSaveDate, applyTxToWallets, recomputeWalletBalances, sumWalletTxEffect, mergeSnapshots, generateId, MAX_TX_AMOUNT } from '@/lib/utils';
import { validateBackupData } from '@/lib/backup-validation';
import { translate, translateCategory, translateWalletType, translateTag, translateBillName, translateBillNote, translateWalletName, translateNote } from '@/lib/i18n';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { AuthModal } from '@/components/AuthModal';
import { ConfirmModal } from '@/components/ConfirmModal';
const AppContext = createContext(undefined);
const STORAGE_KEY = 'quan_ly_chi_tieu_data_v2';
export const AppProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [isHostPasswordSet, setIsHostPasswordSet] = useState(false);
    const currentUserRef = useRef(currentUser);
    currentUserRef.current = currentUser;
    const [mounted, setMounted] = useState(false);
    const [wallets, setWallets] = useState(INITIAL_WALLETS);
    const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);
    const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
    const [budgets, setBudgets] = useState(INITIAL_BUDGETS);
    const [bills, setBills] = useState(INITIAL_BILLS);
    const [goals, setGoals] = useState(INITIAL_GOALS);
    const [planner, setPlanner] = useState(INITIAL_PLANNER);
    const [currentMonth, setCurrentMonth] = useState('2026-09');
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [confirmModalConfig, setConfirmModalConfig] = useState(null);

    const showConfirm = useCallback(({
        title,
        message,
        confirmText,
        cancelText,
        variant = 'danger',
        onConfirm,
    }) => {
        setConfirmModalConfig({
            title,
            message,
            confirmText,
            cancelText,
            variant,
            onConfirm,
        });
    }, []);

    const closeConfirm = useCallback(() => {
        setConfirmModalConfig(null);
    }, []);

    useEffect(() => {
        try {
            const saved = localStorage.getItem('fintrack_sidebar_open');
            if (saved !== null) {
                setIsSidebarOpen(saved === 'true');
            } else if (typeof window !== 'undefined' && window.innerWidth >= 1280) {
                setIsSidebarOpen(true);
            }
        } catch (e) {}
    }, []);

    const toggleSidebar = useCallback(() => {
        setIsSidebarOpen(prev => {
            const next = !prev;
            try { localStorage.setItem('fintrack_sidebar_open', String(next)); } catch (e) {}
            return next;
        });
    }, []);
    const [quickAddOpen, setQuickAddOpen] = useState(false);
    const [quickAddDefaultType, setQuickAddDefaultType] = useState('EXPENSE');
    const [quickAddDefaultWalletId, setQuickAddDefaultWalletId] = useState(undefined);
    const [statementModalOpen, setStatementModalOpen] = useState(false);
    const [statementDefaultWalletId, setStatementDefaultWalletId] = useState(undefined);
    const [serverSyncStatus, setServerSyncStatus] = useState('synced');
    // User Profile
    const [userProfile, setUserProfile] = useState({
        name: 'Admin',
        email: 'admin@fintrack.vn',
        phone: '0912 345 678',
        role: 'Chủ tài khoản (Owner)',
        membership: 'VIP Lifetime Member',
        joinedDate: '16/09/2026',
        avatarColor: '#10b981',
    });
    const updateUserProfile = (profile) => {
        setUserProfile((prev) => {
            const updated = { ...prev, ...profile };
            try {
                localStorage.setItem('fintrack_user_profile', JSON.stringify(updated));
            }
            catch (e) { }
            return updated;
        });
    };
    // What-If Simulator Configuration State
    const [simulatorConfig, setSimulatorConfig] = useState(INITIAL_SIMULATOR_CONFIG);
    const updateSimulatorConfig = (config) => {
        setSimulatorConfig((prev) => ({ ...prev, ...config }));
    };
    // Deep-linking & Notification Navigation States
    const [navTargetCategoryId, setNavTargetCategoryId] = useState(null);
    const [navTargetBudgetId, setNavTargetBudgetId] = useState(null);
    const [navTargetBillId, setNavTargetBillId] = useState(null);
    const [billToAutoPayId, setBillToAutoPayId] = useState(null);
    const navigateToCategoryTransactions = (categoryId) => {
        setNavTargetCategoryId(categoryId);
        setActiveTab('transactions');
    };
    const navigateToBudget = (budgetId) => {
        setNavTargetBudgetId(budgetId);
        setActiveTab('budgets');
    };
    const navigateToBill = (billId, autoOpenPay = false) => {
        setNavTargetBillId(billId);
        if (autoOpenPay) {
            setBillToAutoPayId(billId);
        }
        setActiveTab('bills');
    };
    // Alert Dismissal Management
    const [dismissedAlertIds, setDismissedAlertIds] = useState([]);
    useEffect(() => {
        try {
            const saved = localStorage.getItem('fintrack_dismissed_alerts');
            if (saved) {
                setDismissedAlertIds(JSON.parse(saved));
            }
        }
        catch (e) {
            // ignore
        }
    }, []);
    const dismissAlert = (alertId) => {
        setDismissedAlertIds((prev) => {
            if (prev.includes(alertId))
                return prev;
            const next = [...prev, alertId];
            try {
                localStorage.setItem('fintrack_dismissed_alerts', JSON.stringify(next));
            }
            catch (e) { }
            return next;
        });
    };
    const restoreAlert = (alertId) => {
        setDismissedAlertIds((prev) => {
            const next = prev.filter((id) => id !== alertId);
            try {
                localStorage.setItem('fintrack_dismissed_alerts', JSON.stringify(next));
            }
            catch (e) { }
            return next;
        });
    };
    const dismissAllAlerts = (alertIds) => {
        setDismissedAlertIds((prev) => {
            const set = new Set([...prev, ...alertIds]);
            const next = Array.from(set);
            try {
                localStorage.setItem('fintrack_dismissed_alerts', JSON.stringify(next));
            }
            catch (e) { }
            return next;
        });
    };
    const restoreAllAlerts = () => {
        setDismissedAlertIds([]);
        try {
            localStorage.removeItem('fintrack_dismissed_alerts');
        }
        catch (e) { }
    };
    const isAlertDismissed = (alertId) => {
        return dismissedAlertIds.includes(alertId);
    };
    // Theme Management (Light, Dark, System)
    const [theme, setThemeState] = useState('system');
    const [isDarkMode, setIsDarkMode] = useState(false);
    useEffect(() => {
        try {
            const savedTheme = localStorage.getItem('fintrack_theme') || 'system';
            setThemeState(savedTheme);
        }
        catch (e) {
            console.warn('Failed to read theme from localStorage', e);
        }
    }, []);
    useEffect(() => {
        const updateTheme = () => {
            const isDark = theme === 'dark' ||
                (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
            setIsDarkMode(isDark);
            if (typeof document !== 'undefined') {
                if (isDark) {
                    document.documentElement.classList.add('dark');
                }
                else {
                    document.documentElement.classList.remove('dark');
                }
            }
        };
        updateTheme();
        try {
            localStorage.setItem('fintrack_theme', theme);
        }
        catch (e) {
            // ignore
        }
        if (theme === 'system' && typeof window !== 'undefined') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const listener = () => updateTheme();
            mediaQuery.addEventListener('change', listener);
            return () => mediaQuery.removeEventListener('change', listener);
        }
    }, [theme]);
    const setTheme = (newTheme) => {
        setThemeState(newTheme);
    };
    const toggleTheme = () => {
        setThemeState(isDarkMode ? 'light' : 'dark');
    };
    // Language & i18n Management
    const [language, setLanguageState] = useState('vi');
    useEffect(() => {
        try {
            const savedLang = localStorage.getItem('fintrack_language');
            if (savedLang && ['vi', 'en'].includes(savedLang)) {
                setLanguageState(savedLang);
            }
            else {
                setLanguageState('vi');
            }
        }
        catch (e) {
            // ignore
        }
    }, []);
    // Synchronize html lang attribute (screen readers, browser auto-translation)
    useEffect(() => {
        if (typeof document !== 'undefined')
            document.documentElement.lang = language === 'en' ? 'en' : 'vi';
    }, [language]);
    const setLanguage = (lang) => {
        setLanguageState(lang);
        try {
            localStorage.setItem('fintrack_language', lang);
        }
        catch (e) {
            // ignore
        }
    };
    const t = (key, fallback) => {
        return translate(language, key, fallback);
    };
    const tCategory = (name) => {
        return translateCategory(name || '', language);
    };
    const tWalletType = (type) => {
        return translateWalletType(type || '', language);
    };
    const tTag = (tag) => {
        return translateTag(tag || '', language);
    };
    const tBillName = (name) => {
        return translateBillName(name || '', language);
    };
    const tBillNote = (note) => {
        return translateBillNote(note || '', language);
    };
    const tWalletName = (name) => {
        return translateWalletName(name || '', language);
    };
    const tNote = (note) => {
        return translateNote(note || '', language);
    };
    // Real-time multi-device sync refs
    const lastServerUpdatedAtRef = useRef(null);
    const isSavingRef = useRef(false);
    const lastSavedDataSignatureRef = useRef('');
    // Most recent server snapshot acting as base for conflict resolution
    const lastServerSnapshotRef = useRef(null);
    // PIN protection for /api/storage (server exposes pinEnabled/hasPin only, never the PIN)
    const [security, setSecurity] = useState({ pinEnabled: false, hasPin: false });
    const appPinRef = useRef('');
    const [isPinLocked, setIsPinLocked] = useState(false);
    const [pinUnlockError, setPinUnlockError] = useState('');
    const setAppPin = (pin) => {
        appPinRef.current = pin || '';
    };
    const getApiHeaders = useCallback((extra = {}) => {
        const headers = {
            'Cache-Control': 'no-cache, no-store',
            Pragma: 'no-cache',
            ...extra,
        };

        if (appPinRef.current) {
            headers['x-app-pin'] = appPinRef.current;
        }

        return headers;
    }, []);
    // 401 due to missing/invalid PIN -> trigger lock screen
    const handleAuthFailure = useCallback(async (res) => {
        if (res.status !== 401)
            return false;
        setIsPinLocked(true);
        setServerSyncStatus('offline');
        return true;
    }, []);
    const computeDataSignature = (data) => {
        return JSON.stringify({
            wallets: data.wallets || [],
            transactions: data.transactions || [],
            categories: data.categories || [],
            budgets: data.budgets || [],
            bills: data.bills || [],
            goals: data.goals || [],
            planner: data.planner || {},
            currentMonth: data.currentMonth || '',
            userProfile: data.userProfile || {},
            simulatorConfig: data.simulatorConfig || {},
        });
    };
    // Centralized server data applicator
    const applyServerData = useCallback((d, fromServer = true) => {
        if (!d)
            return;
        if (d.wallets)
            setWallets(d.wallets);
        if (d.transactions)
            setTransactions(d.transactions);
        if (d.categories)
            setCategories(d.categories);
        if (d.budgets)
            setBudgets(d.budgets);
        if (d.bills)
            setBills(d.bills);
        if (d.goals)
            setGoals(d.goals);
        if (d.planner) {
            setPlanner({
                ...d.planner,
                emergencyPercent: d.planner.emergencyPercent !== undefined ? d.planner.emergencyPercent : 10,
            });
        }
        if (d.currentMonth)
            setCurrentMonth(d.currentMonth);
        if (d.userProfile)
            setUserProfile(d.userProfile);
        if (d.simulatorConfig)
            setSimulatorConfig(d.simulatorConfig);
        if (fromServer && d.security) {
            setSecurity({
                pinEnabled: Boolean(d.security.pinEnabled),
                hasPin: Boolean(d.security.hasPin),
            });
        }
        if (fromServer) {
            if (d.updatedAt)
                lastServerUpdatedAtRef.current = d.updatedAt;
            lastServerSnapshotRef.current = d;
        }
        // Update signature to match current server payload so auto-save won't echo back.
        // For local unsaved data, do NOT update signature so auto-save flushes to server.
        if (fromServer) {
            lastSavedDataSignatureRef.current = computeDataSignature(d);
        }
        try {
            const { security: _security, ...cacheable } = d;
            const uid = currentUserRef.current?.id;
            const key = uid ? `quan_ly_chi_tieu_data_v2_${uid}` : STORAGE_KEY;
            localStorage.setItem(key, JSON.stringify(cacheable));
        }
        catch (e) {
            console.warn('Failed to update localStorage cache:', e);
        }
    }, []);
    // Manual or automatic pull from server
    const syncDataFromServer = useCallback(async () => {
        try {
            const res = await fetch('/api/storage', {
                cache: 'no-store',
                headers: getApiHeaders(),
            });
            if (await handleAuthFailure(res))
                return false;
            if (res.ok) {
                const result = await res.json();
                if (isSavingRef.current) {
                    // Currently saving local mutations -> that save operation handles server merge
                    return false;
                }
                if (result.success && result.data) {
                    setIsPinLocked(false);
                    applyServerData(result.data);
                    setServerSyncStatus('synced');
                    return true;
                }
            }
            setServerSyncStatus('offline');
            return false;
        }
        catch (err) {
            console.warn('syncDataFromServer failed:', err);
            setServerSyncStatus('offline');
            return false;
        }
    }, [applyServerData, getApiHeaders, handleAuthFailure]);
    const readLocalCache = (customUid) => {
        try {
            const uid = customUid || currentUserRef.current?.id;
            const key = uid ? `quan_ly_chi_tieu_data_v2_${uid}` : STORAGE_KEY;
            const saved = localStorage.getItem(key);
            return saved ? JSON.parse(saved) : null;
        }
        catch (e) {
            console.error('Failed to parse localStorage data:', e);
            return null;
        }
    };
    // Apply server state; if local has pending offline modifications, merge and schedule auto-save
    const applyInitialData = useCallback((serverData, localData) => {
        if (serverData) {
            applyServerData(serverData, true);
        }
        if (localData) {
            const localTime = new Date(localData.updatedAt || 0).getTime();
            const serverTime = new Date(serverData?.updatedAt || 0).getTime();
            if (!serverData || localTime > serverTime) {
                const merged = serverData ? mergeSnapshots(serverData, localData, serverData) : localData;
                applyServerData(merged, false);
            }
        }
    }, [applyServerData]);
    // Verify PIN and unlock app
    const verifyAndUnlockApp = async (enteredPin) => {
        try {
            const res = await fetch('/api/storage', {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache, no-store',
                    Pragma: 'no-cache',
                    'x-app-pin': enteredPin,
                },
            });
            if (res.ok) {
                const result = await res.json();
                if (result.success && result.data) {
                    setAppPin(enteredPin);
                    setPinUnlockError('');
                    applyInitialData(result.data, readLocalCache());
                    setIsPinLocked(false);
                    setServerSyncStatus('synced');
                    setMounted(true);
                    return { success: true };
                }
            }
            let message = language === 'en' ? 'Incorrect PIN code!' : 'Mã PIN bảo mật không chính xác!';
            if (res.status === 429) {
                const body = await res.json().catch(() => ({}));
                message = t('err.RATE_LIMITED', body.error || 'Nhập sai PIN quá nhiều lần, vui lòng thử lại sau 15 phút');
            }
            setPinUnlockError(message);
            return { success: false, error: message };
        }
        catch (err) {
            setPinUnlockError(err.message);
            return { success: false, error: err.message };
        }
    };
    // Enable/disable PIN or change PIN code. Sent as isolated action to avoid touching financial data.
    const updateSecuritySettings = async ({ pinEnabled, pinCode }) => {
        const cleanPin = pinCode !== undefined && pinCode !== null ? String(pinCode).trim() : '';
        if (cleanPin && !/^\d{4,8}$/.test(cleanPin)) {
            return { success: false, error: t('err.PIN_FORMAT', 'Mã PIN phải gồm 4-8 chữ số') };
        }
        try {
            const res = await fetch('/api/storage', {
                method: 'POST',
                headers: getApiHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ action: 'updateSecurity', pinEnabled: Boolean(pinEnabled), pinCode: cleanPin || undefined }),
            });
            const result = await res.json().catch(() => ({}));
            if (res.ok && result.success) {
                if (cleanPin)
                    setAppPin(cleanPin);
                setSecurity({
                    pinEnabled: Boolean(result.security?.pinEnabled),
                    hasPin: Boolean(result.security?.hasPin),
                });
                return { success: true };
            }
            if (res.status === 401)
                setIsPinLocked(true);
            return { success: false, error: result.code ? t(`err.${result.code}`, result.error) : (result.error || `HTTP ${res.status}`) };
        }
        catch (e) {
            return { success: false, error: e.message };
        }
    };
    // Verify session authentication and hydrate initial user data by User ID
    useEffect(() => {
        let isSubscribed = true;
        async function checkAuthAndLoad() {
            try {
                const authRes = await fetch('/api/auth/me', { cache: 'no-store' });
                const authData = await authRes.json().catch(() => ({ authenticated: false }));
                if (!isSubscribed) return;

                setIsHostPasswordSet(Boolean(authData.isHostPasswordSet));

                if (authData.authenticated && authData.user) {
                    currentUserRef.current = authData.user;
                    setCurrentUser(authData.user);

                    let serverData = null;
                    let locked = false;
                    try {
                        const res = await fetch('/api/storage', {
                            cache: 'no-store',
                            headers: getApiHeaders(),
                        });
                        if (res.status === 401) {
                            const errData = await res.json().catch(() => ({}));
                            if (errData.requiresPin) {
                                locked = true;
                                if (isSubscribed) setIsPinLocked(true);
                            }
                        }
                        else if (res.ok) {
                            const result = await res.json();
                            if (result.success && result.data) {
                                serverData = result.data;
                            }
                        }
                    }
                    catch (e) {
                        console.warn('Could not connect to server storage API:', e);
                    }

                    if (!isSubscribed) return;
                    if (locked) {
                        setServerSyncStatus('offline');
                        setAuthLoading(false);
                        return;
                    }

                    applyInitialData(serverData, readLocalCache(authData.user.id));
                    setServerSyncStatus(serverData ? 'synced' : 'offline');
                    setMounted(true);
                } else {
                    currentUserRef.current = null;
                    setCurrentUser(null);
                    setMounted(false);
                }
            }
            catch (err) {
                console.error('Failed to check auth:', err);
                if (isSubscribed) {
                    currentUserRef.current = null;
                    setCurrentUser(null);
                    setMounted(false);
                }
            }
            finally {
                if (isSubscribed) {
                    setAuthLoading(false);
                }
            }
        }
        checkAuthAndLoad();
        return () => {
            isSubscribed = false;
        };
    }, [applyInitialData, getApiHeaders]);

    const handleLoginSuccess = async (user) => {
        currentUserRef.current = user;
        setCurrentUser(user);
        setAuthLoading(true);

        // Clear stale localStorage cache for clean new account state
        try {
            localStorage.removeItem('quan_ly_chi_tieu_data_v2');
            localStorage.removeItem('fintrack_user_profile');
            localStorage.removeItem(`quan_ly_chi_tieu_data_v2_${user.id}`);
        } catch (e) {}

        // Reset state to empty before hydrating user-isolated personal store
        setWallets([]);
        setTransactions([]);
        setBudgets([]);
        setBills([]);
        setGoals([]);
        setPlanner({
            monthlyIncome: 0,
            needsPercent: 50,
            wantsPercent: 30,
            savingsPercent: 20,
            emergencyPercent: 0,
            notes: '',
        });

        try {
            const res = await fetch('/api/storage', {
                cache: 'no-store',
                headers: getApiHeaders(),
            });
            if (res.ok) {
                const result = await res.json();
                if (result.success && result.data) {
                    applyServerData(result.data, true);
                    setServerSyncStatus('synced');
                    setMounted(true);
                }
            }
        }
        catch (err) {
            console.error('Failed to load data after login:', err);
        }
        finally {
            setAuthLoading(false);
        }
    };

    const logoutUser = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
        } catch {}
        try {
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('quan_ly_chi_tieu_data_v2') || key.startsWith('fintrack_user_profile'))) {
                    localStorage.removeItem(key);
                }
            }
        } catch {}
        currentUserRef.current = null;
        setCurrentUser(null);
        setMounted(false);
        setIsPinLocked(false);
        setWallets([]);
        setTransactions([]);
        setBudgets([]);
        setBills([]);
        setGoals([]);
        setPlanner({
            monthlyIncome: 0,
            needsPercent: 50,
            wantsPercent: 30,
            savingsPercent: 20,
            emergencyPercent: 0,
            notes: '',
        });
    };

    // Real-time polling & focus/visibility sync across multi-devices (Phone <-> PC)
    useEffect(() => {
        if (!mounted || !currentUser)
            return;
        let isChecking = false;
        const checkForUpdates = async () => {
            // Don't poll if actively saving local changes or already fetching
            if (isSavingRef.current || isChecking)
                return;
            try {
                isChecking = true;
                const res = await fetch('/api/storage', {
                    cache: 'no-store',
                    headers: getApiHeaders(),
                });
                if (await handleAuthFailure(res))
                    return;
                if (res.ok) {
                    const result = await res.json();
                    // Local changes pending save -> do not apply server data to prevent overwriting (will merge upon saving)
                    if (isSavingRef.current)
                        return;
                    if (result.success && result.data) {
                        setIsPinLocked(false);
                        if (result.data.security) {
                            setSecurity({
                                pinEnabled: Boolean(result.data.security.pinEnabled),
                                hasPin: Boolean(result.data.security.hasPin),
                            });
                        }
                        const serverUpdatedAt = result.data.updatedAt;
                        // If server timestamp differs from our last applied state
                        if (serverUpdatedAt && serverUpdatedAt !== lastServerUpdatedAtRef.current) {
                            const serverSig = computeDataSignature(result.data);
                            if (serverSig !== lastSavedDataSignatureRef.current) {
                                applyServerData(result.data);
                            }
                            else {
                                lastServerUpdatedAtRef.current = serverUpdatedAt;
                            }
                        }
                        setServerSyncStatus('synced');
                    }
                }
            }
            catch (e) {
                console.warn('[Sync] Poll check error:', e);
            }
            finally {
                isChecking = false;
            }
        };
        // 1. Polling interval every 3.5s for seamless background sync
        const interval = setInterval(checkForUpdates, 3500);
        // 2. Immediate check when unlocking phone or switching back to browser tab
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkForUpdates();
            }
        };
        // 3. Immediate check when window gains focus
        const handleFocus = () => {
            checkForUpdates();
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);
        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
        };
    }, [mounted, applyServerData, getApiHeaders, handleAuthFailure]);
    const getCurrentData = () => ({
        wallets,
        transactions,
        categories,
        budgets,
        bills,
        goals,
        planner,
        currentMonth,
        userProfile,
        simulatorConfig,
    });
    /**
     * Push data to server with baseUpdatedAt. If another device just saved (409),
     * execute 3-way merge (base = old server version, local, remote) and retry instead of overwriting lost data.
     */
    const pushToServer = async (initialData) => {
        let data = initialData;
        for (let attempt = 0; attempt < 3; attempt++) {
            const payload = {
                ...data,
                updatedAt: new Date().toISOString(),
                baseUpdatedAt: lastServerUpdatedAtRef.current,
            };
            try {
                const uid = currentUser?.id;
                const key = uid ? `quan_ly_chi_tieu_data_v2_${uid}` : STORAGE_KEY;
                localStorage.setItem(key, JSON.stringify(payload));
            }
            catch (e) {
                console.error('Failed to save to localStorage:', e);
            }
            const res = await fetch('/api/storage', {
                method: 'POST',
                headers: getApiHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify(payload),
            });
            if (await handleAuthFailure(res))
                return false;
            if (res.status === 409) {
                const result = await res.json();
                const remote = result.data;
                const merged = mergeSnapshots(lastServerSnapshotRef.current, data, remote);
                lastServerUpdatedAtRef.current = remote.updatedAt;
                lastServerSnapshotRef.current = remote;
                applyServerData(merged, false);
                data = merged;
                continue;
            }
            if (!res.ok) {
                return false;
            }
            const result = await res.json();
            lastSavedDataSignatureRef.current = computeDataSignature(data);
            if (result.updatedAt) {
                lastServerUpdatedAtRef.current = result.updatedAt;
                lastServerSnapshotRef.current = { ...data, updatedAt: result.updatedAt };
            }
            return true;
        }
        return false;
    };
    // Auto-save local changes to server disk
    useEffect(() => {
        if (!mounted || isPinLocked || !currentUser)
            return;
        const currentData = getCurrentData();
        const currentSignature = computeDataSignature(currentData);
        // If state equals what we last saved or loaded from server, do nothing!
        if (currentSignature === lastSavedDataSignatureRef.current) {
            return;
        }
        // 1. Fast local cache save
        try {
            const uid = currentUser?.id;
            const key = uid ? `quan_ly_chi_tieu_data_v2_${uid}` : STORAGE_KEY;
            localStorage.setItem(key, JSON.stringify({ ...currentData, updatedAt: new Date().toISOString() }));
        }
        catch (e) {
            console.error('Failed to save to localStorage:', e);
        }
        // 2. Persist to server disk via API (debounced)
        isSavingRef.current = true;
        setServerSyncStatus('syncing');
        let cancelled = false;
        let fired = false;
        const timer = setTimeout(async () => {
            fired = true;
            try {
                const ok = await pushToServer(currentData);
                if (!cancelled)
                    setServerSyncStatus(ok ? 'synced' : 'offline');
            }
            catch (err) {
                console.warn('Failed to sync to server storage API:', err);
                if (!cancelled)
                    setServerSyncStatus('offline');
            }
            finally {
                isSavingRef.current = false;
            }
        }, 400);
        return () => {
            cancelled = true;
            clearTimeout(timer);
            if (!fired)
                isSavingRef.current = false;
        };
    }, [mounted, isPinLocked, wallets, transactions, categories, budgets, bills, goals, planner, currentMonth, userProfile, simulatorConfig]);
    // Immediate save on demand
    const saveDataNow = async () => {
        isSavingRef.current = true;
        setServerSyncStatus('syncing');
        try {
            const ok = await pushToServer(getCurrentData());
            setServerSyncStatus(ok ? 'synced' : 'offline');
            return ok;
        }
        catch (err) {
            console.warn('Failed to sync to server storage API:', err);
            setServerSyncStatus('offline');
            return false;
        }
        finally {
            isSavingRef.current = false;
        }
    };
    const openQuickAdd = (type = 'EXPENSE', defaultWalletId) => {
        setQuickAddDefaultType(type);
        setQuickAddDefaultWalletId(defaultWalletId);
        setQuickAddOpen(true);
    };
    const openStatementModal = (defaultWalletId) => {
        setStatementDefaultWalletId(defaultWalletId);
        setStatementModalOpen(true);
    };
    const closeStatementModal = () => {
        setStatementModalOpen(false);
        setStatementDefaultWalletId(undefined);
    };
    // Financial summary
    const financialSummary = useMemo(() => calculateFinancialSummary(wallets, transactions, currentMonth), [wallets, transactions, currentMonth]);
    // Available distinct months from all transactions + currentMonth
    const availableMonths = useMemo(() => {
        const set = new Set();
        if (currentMonth && /^\d{4}-\d{2}$/.test(currentMonth))
            set.add(currentMonth);
        const now = new Date();
        const todayMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        set.add(todayMonth);
        transactions.forEach((tx) => {
            const m = tx.date?.slice(0, 7);
            if (m && /^\d{4}-\d{2}$/.test(m)) {
                set.add(m);
            }
        });
        return Array.from(set).sort((a, b) => b.localeCompare(a));
    }, [transactions, currentMonth]);
    // Common validation for all transactions: valid amount & no future dates
    const validateTxBasics = (amount, date) => {
        const num = Number(amount);
        if (!Number.isFinite(num) || num <= 0) {
            return t('err.amountPositive', 'Số tiền giao dịch phải lớn hơn 0');
        }
        if (num > MAX_TX_AMOUNT) {
            return `${t('err.amountTooLarge', 'Số tiền vượt quá giới hạn cho phép')} (${formatCurrency(MAX_TX_AMOUNT)})`;
        }
        if (toLocalDateKey(date) > getLocalDateString()) {
            return t('err.futureDate', 'Không thể ghi nhận giao dịch cho ngày trong tương lai (chưa đến ngày)!');
        }
        return null;
    };
    // Add Transaction - returns created transaction (truthy) or false if rejected
    const addTransaction = (tx) => {
        const txDate = tx.date ? normalizeSaveDate(tx.date) : normalizeSaveDate();
        const basicError = validateTxBasics(tx.amount, txDate);
        if (basicError) {
            alert(basicError);
            return false;
        }
        if (tx.type === 'TRANSFER') {
            if (!tx.toWalletId || tx.toWalletId === tx.walletId) {
                alert(t('Ví nhận phải khác ví chuyển', 'Ví nhận phải khác ví chuyển!'));
                return false;
            }
            if (!wallets.some((w) => w.id === tx.toWalletId)) {
                alert(t('err.destWalletNotFound', 'Không tìm thấy ví nhận'));
                return false;
            }
        }
        // Validate funds for EXPENSE and TRANSFER to prevent negative balance
        if (tx.type === 'EXPENSE' || tx.type === 'TRANSFER') {
            const sourceWallet = wallets.find((w) => w.id === tx.walletId);
            const fee = tx.type === 'TRANSFER' ? (tx.fee || 0) : 0;
            const validation = checkWalletSufficientFunds(sourceWallet, tx.amount, fee, language);
            if (!validation.isValid) {
                alert(validation.errorMessage || t('err.insufficientBalance', 'Số dư ví không đủ để thực hiện giao dịch này!'));
                return false;
            }
        }
        const newTx = {
            ...tx,
            amount: Number(tx.amount),
            date: txDate,
            id: generateId('tx'),
            createdAt: new Date().toISOString(),
        };
        setWallets((prevWallets) => applyTxToWallets(prevWallets, newTx, 1));
        setTransactions((prev) => [newTx, ...prev]);
        return newTx;
    };
    // Import Bank Statement Transactions in Batch
    const importBankStatementTransactions = ({
        transactionsToImport,
        walletId,
        balanceAdjustmentMode = 'NET_CHANGE',
        exactClosingBalance = null,
    }) => {
        if (!transactionsToImport || transactionsToImport.length === 0) {
            return { success: false, message: t('err.noTxSelected', 'Không có giao dịch nào được chọn để nạp') };
        }
        const targetWallet = wallets.find((w) => w.id === walletId);
        if (!targetWallet) {
            return { success: false, message: t('err.walletNotFound', 'Không tìm thấy ví tương ứng') };
        }
        const defaultIncCat = categories.find((c) => c.type === 'INCOME') || { id: 'cat-other-inc', name: 'Thu nhập khác' };
        const defaultExpCat = categories.find((c) => c.type === 'EXPENSE') || { id: 'cat-other-exp', name: 'Chi phí khác' };
        let skipped = 0;
        const newTxList = [];
        transactionsToImport.forEach((tx) => {
            if (!tx || typeof tx !== 'object' || (tx.type !== 'INCOME' && tx.type !== 'EXPENSE')) {
                skipped++;
                return;
            }
            const amount = Number(tx.amount) || 0;
            const date = normalizeSaveDate(tx.date || undefined);
            if (validateTxBasics(amount, date)) {
                skipped++;
                return;
            }
            // Category must exist and match transaction type (income/expense); otherwise fallback to default category
            const foundCat = categories.find((c) => c.id === tx.categoryId && c.type === tx.type);
            const cat = foundCat || (tx.type === 'INCOME' ? defaultIncCat : defaultExpCat);
            newTxList.push({
                id: generateId('tx-st'),
                type: tx.type,
                amount,
                categoryId: cat.id,
                categoryName: cat.name,
                walletId: targetWallet.id,
                walletName: targetWallet.name,
                date,
                note: String(tx.note || 'Sao kê ngân hàng').trim().slice(0, 300),
                tags: Array.isArray(tx.tags) && tx.tags.length > 0 ? tx.tags : ['Sao kê'],
                createdAt: new Date().toISOString(),
            });
        });
        if (newTxList.length === 0) {
            return { success: false, message: t('err.noValidTx', 'Không có giao dịch hợp lệ (số tiền không hợp lệ hoặc ngày trong tương lai)') };
        }
        const totalIncome = newTxList.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
        const totalExpense = newTxList.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
        const netChange = totalIncome - totalExpense;
        const importDelta = sumWalletTxEffect(targetWallet, newTxList);
        let newBalance = (Number(targetWallet.balance) || 0) + importDelta;
        let newInitialBalance = Number(targetWallet.initialBalance) || 0;
        if (balanceAdjustmentMode === 'SET_EXACT' && exactClosingBalance !== null && exactClosingBalance !== '' && !isNaN(Number(exactClosingBalance))) {
            // Set exact closing balance from statement; allocate discrepancy into initialBalance
            // so "initialBalance + transaction history" always reconciles with current balance
            const exact = Number(exactClosingBalance);
            newInitialBalance += exact - newBalance;
            newBalance = exact;
        }
        setWallets((prev) => prev.map((w) => (w.id === targetWallet.id ? { ...w, balance: newBalance, initialBalance: newInitialBalance } : w)));
        setTransactions((prev) => [...newTxList, ...prev]);
        // Switch to the month of the latest transaction (independent of row order in file)
        const latestDate = newTxList.reduce((max, t) => (t.date > max ? t.date : max), '');
        const latestTxMonth = latestDate.slice(0, 7);
        if (/^\d{4}-\d{2}$/.test(latestTxMonth)) {
            setCurrentMonth(latestTxMonth);
        }
        return {
            success: true,
            count: newTxList.length,
            skipped,
            totalIncome,
            totalExpense,
            netChange,
            newBalance,
            walletName: targetWallet.name,
        };
    };
    // Edit Transaction
    const editTransaction = (id, updated) => {
        const oldTx = transactions.find((t) => t.id === id);
        if (!oldTx)
            return false;
        const newTx = { ...oldTx, ...updated };
        newTx.date = normalizeSaveDate(newTx.date || undefined);
        newTx.amount = Number(newTx.amount);
        const basicError = validateTxBasics(newTx.amount, newTx.date);
        if (basicError) {
            alert(basicError);
            return false;
        }
        if (newTx.type === 'TRANSFER') {
            if (!newTx.toWalletId || newTx.walletId === newTx.toWalletId) {
                alert(t('Ví nhận phải khác ví chuyển', 'Ví nhận phải khác ví chuyển!'));
                return false;
            }
            const destW = wallets.find((w) => w.id === newTx.toWalletId);
            newTx.toWalletName = destW?.name || newTx.toWalletName;
        }
        else {
            delete newTx.toWalletId;
            delete newTx.toWalletName;
            newTx.fee = 0;
        }
        const sourceW = wallets.find((w) => w.id === newTx.walletId);
        if (sourceW)
            newTx.walletName = sourceW.name;
        // Rollback previous transaction then apply updated transaction
        const rolledBack = applyTxToWallets(wallets, oldTx, -1);
        if (newTx.type === 'EXPENSE' || newTx.type === 'TRANSFER') {
            const rolledSource = rolledBack.find((w) => w.id === newTx.walletId);
            const fee = newTx.type === 'TRANSFER' ? (newTx.fee || 0) : 0;
            const validation = checkWalletSufficientFunds(rolledSource, newTx.amount, fee, language);
            if (!validation.isValid) {
                alert(validation.errorMessage || t('err.insufficientAfterEdit', 'Số dư ví không đủ sau khi điều chỉnh!'));
                return false;
            }
        }
        setWallets(applyTxToWallets(rolledBack, newTx, 1));
        setTransactions((prev) => prev.map((t) => (t.id === id ? newTx : t)));
        return true;
    };
    // Delete Transaction
    const deleteTransaction = (id) => {
        const oldTx = transactions.find((t) => t.id === id);
        if (!oldTx)
            return;
        setWallets((prevWallets) => applyTxToWallets(prevWallets, oldTx, -1));
        setTransactions((prev) => prev.filter((t) => t.id !== id));
        // Deleting bill payment transaction -> revert bill to unpaid (funds restored to wallet)
        setBills((prev) => prev.map((b) => (b.lastPaymentTxId === id || (oldTx.billId && b.id === oldTx.billId && b.status === 'PAID'
            && toLocalDateKey(oldTx.date) === String(b.lastPaidDate || '').slice(0, 10))
            ? { ...b, status: 'UNPAID', lastPaidDate: undefined, lastPaymentTxId: undefined }
            : b)));
        // Deleting goal deposit/withdraw transaction -> revert amount in target goal
        setGoals((prev) => prev.map((g) => {
            const item = (g.history || []).find((h) => h.txId === id);
            if (!item)
                return g;
            const delta = item.type === 'DEPOSIT' ? -Number(item.amount) : Number(item.amount);
            return {
                ...g,
                currentAmount: Math.max(0, (Number(g.currentAmount) || 0) + delta),
                history: g.history.filter((h) => h.txId !== id),
            };
        }));
    };
    // Wallets
    const addWallet = (wallet) => {
        const balance = Number(wallet.balance) || 0;
        const newWallet = {
            ...wallet,
            balance,
            initialBalance: wallet.initialBalance !== undefined ? Number(wallet.initialBalance) || 0 : balance,
            id: wallet.id || generateId('wal'),
            createdAt: new Date().toISOString(),
        };
        setWallets((prev) => [...prev, newWallet]);
        return newWallet;
    };
    const editWallet = (id, updated) => {
        const oldWallet = wallets.find((w) => w.id === id);
        if (!oldWallet)
            return;
        const merged = { ...oldWallet, ...updated };
        // Balance = initial balance + history. When user adjusts balance (or wallet type),
        // adjust initialBalance so the formula remains consistent without discrepancies upon recalculation.
        const effect = sumWalletTxEffect(merged, transactions);
        if (updated.balance !== undefined) {
            merged.balance = Number(updated.balance) || 0;
            merged.initialBalance = merged.balance - effect;
        }
        else {
            merged.initialBalance = Number(merged.initialBalance) || 0;
            merged.balance = merged.initialBalance + effect;
        }
        setWallets((prev) => prev.map((w) => (w.id === id ? merged : w)));
        // Sync wallet name displayed in transactions
        if (updated.name && updated.name !== oldWallet.name) {
            setTransactions((prev) => prev.map((t) => {
                if (t.walletId === id)
                    t = { ...t, walletName: updated.name };
                if (t.toWalletId === id)
                    t = { ...t, toWalletName: updated.name };
                return t;
            }));
        }
    };
    const deleteWallet = (id) => {
        const deleted = wallets.find((w) => w.id === id);
        setWallets((prev) => prev.filter((w) => w.id !== id));
        // Delete transactions belonging to removed wallet. For transfers with ANOTHER wallet, convert
        // to income/expense on the remaining wallet so its balance remains accurate (funds physically moved).
        setTransactions((prev) => prev.flatMap((tx) => {
            if (tx.type === 'TRANSFER' && (tx.walletId === id || tx.toWalletId === id)) {
                if (tx.walletId === id && tx.toWalletId && tx.toWalletId !== id) {
                    const { toWalletId, toWalletName, fee, ...rest } = tx;
                    return [{
                        ...rest,
                        type: 'INCOME',
                        walletId: toWalletId,
                        walletName: toWalletName,
                        categoryId: 'cat-other-inc',
                        categoryName: 'Thu nhập khác',
                        note: `${tx.note || 'Chuyển khoản'} (từ ví đã xóa: ${deleted?.name || ''})`,
                    }];
                }
                if (tx.toWalletId === id && tx.walletId !== id) {
                    const { toWalletId, toWalletName, fee, ...rest } = tx;
                    return [{
                        ...rest,
                        type: 'EXPENSE',
                        amount: (Number(tx.amount) || 0) + (Number(fee) || 0),
                        categoryId: 'cat-other-exp',
                        categoryName: 'Chi phí khác',
                        note: `${tx.note || 'Chuyển khoản'} (sang ví đã xóa: ${deleted?.name || ''})`,
                    }];
                }
                return [];
            }
            return tx.walletId === id ? [] : [tx];
        }));
        // Unbind any bills or goals associated with this wallet
        setBills((prev) => prev.map((b) => b.walletId === id ? { ...b, walletId: undefined } : b));
        setGoals((prev) => prev.map((g) => g.walletId === id ? { ...g, walletId: undefined } : g));
    };
    const transferFunds = (fromWalletId, toWalletId, amount, fee, note) => {
        const fromW = wallets.find((w) => w.id === fromWalletId);
        const toW = wallets.find((w) => w.id === toWalletId);
        return addTransaction({
            type: 'TRANSFER',
            amount,
            fee: fee || 0,
            walletId: fromWalletId,
            walletName: fromW?.name,
            toWalletId,
            toWalletName: toW?.name,
            date: normalizeSaveDate(),
            note: note || `Chuyển khoản từ ${fromW?.name || 'Ví'} sang ${toW?.name || 'Ví'}`,
            tags: ['Chuyển khoản nội bộ'],
        });
    };
    // Pay credit card balance from an asset wallet (internal transfer, not counted as expense)
    const payCreditCard = (creditWalletId, fromWalletId, amount, note) => {
        const creditW = wallets.find((w) => w.id === creditWalletId);
        if (!creditW || creditW.type !== 'CREDIT') {
            alert(t('err.mustBeCreditCard', 'Ví nhận phải là thẻ tín dụng'));
            return false;
        }
        if (Number(amount) > (Number(creditW.balance) || 0)) {
            alert(`${t('err.payExceedsDebt', 'Số tiền trả vượt quá dư nợ hiện tại')} (${formatCurrency(creditW.balance)})`);
            return false;
        }
        return transferFunds(fromWalletId, creditWalletId, Number(amount), 0, note || `Thanh toán dư nợ thẻ ${creditW.name}`);
    };
    // Recalculate wallet balances safely from history
    const recalculateWalletBalances = () => {
        setWallets((prevWallets) => recomputeWalletBalances(prevWallets, transactions));
    };
    // Budgets
    const addBudget = (budget) => {
        const newBudget = {
            ...budget,
            id: generateId('bud'),
        };
        setBudgets((prev) => [...prev, newBudget]);
    };
    const editBudget = (id, updated) => {
        setBudgets((prev) => prev.map((b) => (b.id === id ? { ...b, ...updated } : b)));
    };
    const deleteBudget = (id) => {
        setBudgets((prev) => prev.filter((b) => b.id !== id));
    };
    const updatePlanner = (newPlanner) => {
        setPlanner(newPlanner);
    };
    // Bills
    const addBill = (bill) => {
        const newBill = {
            ...bill,
            id: generateId('bill'),
        };
        setBills((prev) => [...prev, newBill]);
        return newBill;
    };
    const editBill = (id, updated) => {
        setBills((prev) => prev.map((b) => (b.id === id ? { ...b, ...updated } : b)));
    };
    const deleteBill = (id) => {
        setBills((prev) => prev.filter((b) => b.id !== id));
    };
    // billOrId: id or the bill object itself (used when bill is newly created and not yet in `bills` state)
    const payBill = (billOrId, walletId, customPaidDate) => {
        const bill = typeof billOrId === 'object' && billOrId ? billOrId : bills.find((b) => b.id === billOrId);
        if (!bill)
            return false;
        const billId = bill.id;
        const targetWallet = wallets.find((w) => w.id === walletId);
        if (!targetWallet) {
            alert(t('err.selectPayWallet', 'Vui lòng chọn ví thanh toán hợp lệ'));
            return false;
        }
        const billCategory = categories.find((c) => c.id === bill.categoryId);
        const paidDate = customPaidDate || getLocalDateString();
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        // 1. Record transaction first (balance and date validated) - only mark PAID when successful
        const createdTx = addTransaction({
            type: 'EXPENSE',
            amount: bill.amount,
            categoryId: bill.categoryId,
            categoryName: billCategory?.name || bill.categoryName || 'Hóa đơn',
            walletId: targetWallet.id,
            walletName: targetWallet.name,
            date: `${paidDate}T${timeStr}`,
            note: `Thanh toán hóa đơn: ${bill.name}`,
            tags: ['Hóa đơn định kỳ'],
            billId,
        });
        if (!createdTx)
            return false;
        // 2. Mark bill as PAID, save transaction ID for rollback capability
        setBills((prev) => prev.map((b) => b.id === billId
            ? {
                ...b,
                status: 'PAID',
                lastPaidDate: paidDate,
                lastPaymentTxId: createdTx.id,
                walletId: targetWallet.id,
            }
            : b));
        return true;
    };
    // Find transaction that deducted funds for the latest bill payment.
    // Legacy bill records lack lastPaymentTxId -> locate by billId / narrative / amount / date.
    const findBillPaymentTx = (bill) => {
        if (!bill)
            return null;
        if (bill.lastPaymentTxId) {
            const linked = transactions.find((t) => t.id === bill.lastPaymentTxId);
            if (linked)
                return linked;
        }
        if (!bill.lastPaidDate)
            return null;
        const paidKey = String(bill.lastPaidDate).slice(0, 10);
        return transactions.find((t) => t.type === 'EXPENSE'
            && toLocalDateKey(t.date) === paidKey
            && Number(t.amount) === Number(bill.amount)
            && (t.billId === bill.id || t.note === `Thanh toán hóa đơn: ${bill.name}`)) || null;
    };
    // Mark bill as unpaid; optionally delete recorded payment transaction (refund funds to wallet)
    const unpayBill = (billId, revertTransaction = false) => {
        const bill = bills.find((b) => b.id === billId);
        if (!bill)
            return { success: false, refunded: false };
        const paymentTx = revertTransaction ? findBillPaymentTx(bill) : null;
        if (paymentTx) {
            deleteTransaction(paymentTx.id);
        }
        setBills((prev) => prev.map((b) => b.id === billId ? { ...b, status: 'UNPAID', lastPaidDate: undefined, lastPaymentTxId: undefined } : b));
        return { success: true, refunded: Boolean(paymentTx), amount: paymentTx ? Number(paymentTx.amount) : 0 };
    };
    // Recurring bills: automatically revert to UNPAID upon entering a new billing cycle (month / quarter / year)
    useEffect(() => {
        if (!mounted)
            return;
        const periodKey = (dateStr, frequency) => {
            const [y, m] = String(dateStr).slice(0, 7).split('-').map(Number);
            if (!y || !m)
                return '';
            if (frequency === 'YEARLY')
                return `${y}`;
            if (frequency === 'QUARTERLY')
                return `${y}-Q${Math.ceil(m / 3)}`;
            return `${y}-${m}`;
        };
        const todayStr = getLocalDateString();
        const needsReset = (b) => b.status === 'PAID' && b.lastPaidDate && periodKey(b.lastPaidDate, b.frequency) !== periodKey(todayStr, b.frequency);
        if (bills.some(needsReset)) {
            setBills((prev) => prev.map((b) => (needsReset(b) ? { ...b, status: 'UNPAID' } : b)));
        }
    }, [mounted, bills]);
    // Goals
    const addGoal = (goal) => {
        const newGoal = {
            ...goal,
            id: generateId('goal'),
            history: [],
            createdAt: new Date().toISOString(),
        };
        setGoals((prev) => [...prev, newGoal]);
    };
    const editGoal = (id, updated) => {
        setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...updated } : g)));
    };
    const deleteGoal = (id) => {
        setGoals((prev) => prev.filter((g) => g.id !== id));
    };
    const depositToGoal = (goalId, amount, walletId, note) => {
        const goal = goals.find((g) => g.id === goalId);
        const wallet = wallets.find((w) => w.id === walletId);
        if (!goal || !wallet)
            return false;
        // Record transaction first (balance validated) - only credit goal upon success
        const createdTx = addTransaction({
            type: 'EXPENSE',
            amount,
            categoryId: 'cat-invest-exp',
            categoryName: 'Đầu tư & Tích lũy',
            walletId,
            walletName: wallet.name,
            date: normalizeSaveDate(),
            note: `Tích lũy vào hũ: ${goal.name}`,
            tags: ['Tích lũy mục tiêu'],
        });
        if (!createdTx)
            return false;
        const newHistoryItem = {
            id: generateId('gh'),
            date: getLocalDateString(),
            amount,
            type: 'DEPOSIT',
            walletId,
            txId: createdTx.id,
            note: note || `Nạp từ ${wallet.name}`,
        };
        setGoals((prev) => prev.map((g) => g.id === goalId
            ? {
                ...g,
                currentAmount: (Number(g.currentAmount) || 0) + amount,
                history: [newHistoryItem, ...(g.history || [])],
            }
            : g));
        return true;
    };
    const withdrawFromGoal = (goalId, amount, walletId, note) => {
        const goal = goals.find((g) => g.id === goalId);
        const wallet = wallets.find((w) => w.id === walletId);
        if (!goal || !wallet)
            return false;
        if (amount > goal.currentAmount) {
            alert(`${t('err.withdrawAmount', 'Số tiền rút')} (${formatCurrency(amount)}) ${t('err.withdrawExceedsGoal', 'vượt quá số dư hiện có trong mục tiêu')} (${formatCurrency(goal.currentAmount)})!`);
            return false;
        }
        const createdTx = addTransaction({
            type: 'INCOME',
            amount,
            categoryId: 'cat-other-inc',
            categoryName: 'Thu nhập khác',
            walletId,
            walletName: wallet.name,
            date: normalizeSaveDate(),
            note: `Rút từ hũ tích lũy: ${goal.name}`,
            tags: ['Rút hũ tiết kiệm'],
        });
        if (!createdTx)
            return false;
        const newHistoryItem = {
            id: generateId('gh'),
            date: getLocalDateString(),
            amount,
            type: 'WITHDRAW',
            walletId,
            txId: createdTx.id,
            note: note || `Rút về ${wallet.name}`,
        };
        setGoals((prev) => prev.map((g) => g.id === goalId
            ? {
                ...g,
                currentAmount: Math.max(0, (Number(g.currentAmount) || 0) - amount),
                history: [newHistoryItem, ...(g.history || [])],
            }
            : g));
        return true;
    };
    // Backup & Reset
    const resetToDefaultData = async () => {
        const defaultData = {
            wallets: INITIAL_WALLETS,
            transactions: INITIAL_TRANSACTIONS,
            categories: DEFAULT_CATEGORIES,
            budgets: INITIAL_BUDGETS,
            bills: INITIAL_BILLS,
            goals: INITIAL_GOALS,
            planner: INITIAL_PLANNER,
            currentMonth: '2026-09',
            simulatorConfig: INITIAL_SIMULATOR_CONFIG,
        };
        setWallets(defaultData.wallets);
        setTransactions(defaultData.transactions);
        setCategories(defaultData.categories);
        setBudgets(defaultData.budgets);
        setBills(defaultData.bills);
        setGoals(defaultData.goals);
        setPlanner(defaultData.planner);
        setCurrentMonth('2026-09');
        setSimulatorConfig(INITIAL_SIMULATOR_CONFIG);
        // Auto-save will push default data to server (with conflict detection)
    };
    const clearAllData = () => {
        setWallets([
            {
                id: 'wal-cash-empty',
                name: 'Tiền mặt',
                type: 'CASH',
                balance: 0,
                initialBalance: 0,
                currency: 'VND',
                color: '#10b981',
                icon: 'Banknote',
                createdAt: new Date().toISOString(),
            },
        ]);
        setTransactions([]);
        setBudgets([]);
        setBills([]);
        setGoals([]);
        setPlanner({
            monthlyIncome: 0,
            needsPercent: 50,
            wantsPercent: 25,
            savingsPercent: 15,
            emergencyPercent: 10,
        });
    };
    const exportDatabaseJSON = () => {
        const data = {
            wallets,
            transactions,
            categories,
            budgets,
            bills,
            goals,
            planner,
            simulatorConfig,
            exportedAt: new Date().toISOString(),
            version: '2.0',
        };
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `quan-ly-chi-tieu-backup-${getLocalDateString()}.json`;
        link.click();
        URL.revokeObjectURL(link.href);
    };
    const importDatabaseJSON = (jsonStr) => {
        try {
            const data = JSON.parse(jsonStr);

            // Step 1: validate entire backup structure before updating state
            const validationErrors = validateBackupData(data);

            if (validationErrors.length > 0) {
                console.error(
                    'Backup validation failed:',
                    validationErrors
                );

                return false;
            }

            // Normalize wallet.
            // Do not trust raw balance in backup file.
            const importedWallets = data.wallets.map((w) => ({
                ...w,
                initialBalance:
                    w.initialBalance !== undefined
                        ? Number(w.initialBalance) || 0
                        : Number(w.balance) || 0,
                balance:
                    Number(w.balance) || 0,
            }));

            // Recalculate balance based on initialBalance + transaction history.
            const recalculatedWallets =
                recomputeWalletBalances(
                    importedWallets,
                    data.transactions
                );

            // Only update state after all validations have passed.
            setWallets(recalculatedWallets);
            setTransactions(data.transactions);

            if (data.categories && Array.isArray(data.categories)) {
                setCategories(data.categories);
            }

            if (data.budgets && Array.isArray(data.budgets)) {
                setBudgets(data.budgets);
            }

            if (data.bills && Array.isArray(data.bills)) {
                setBills(data.bills);
            }

            if (data.goals && Array.isArray(data.goals)) {
                setGoals(data.goals);
            }

            if (data.planner) {
                setPlanner({
                    ...data.planner,
                    emergencyPercent:
                        data.planner.emergencyPercent !== undefined
                            ? data.planner.emergencyPercent
                            : 10,
                });
            }

            if (data.simulatorConfig) {
                setSimulatorConfig(data.simulatorConfig);
            }

            return true;
        }
        catch (e) {
            console.error('Import failed:', e);
            return false;
        }
    };
    return (<AppContext.Provider value={{
            wallets,
            transactions,
            categories,
            budgets,
            bills,
            goals,
            planner,
            currentMonth,
            setCurrentMonth,
            availableMonths,
            serverSyncStatus,
            activeTab,
            setActiveTab,
            isSidebarOpen,
            setIsSidebarOpen,
            toggleSidebar,
            quickAddOpen,
            setQuickAddOpen,
            quickAddDefaultType,
            quickAddDefaultWalletId,
            openQuickAdd,
            statementModalOpen,
            setStatementModalOpen,
            statementDefaultWalletId,
            openStatementModal,
            closeStatementModal,
            importBankStatementTransactions,
            financialSummary,
            theme,
            setTheme,
            toggleTheme,
            isDarkMode,
            userProfile,
            updateUserProfile,
            language,
            setLanguage,
            t,
            tCategory,
            tWalletType,
            tTag,
            tBillName,
            tBillNote,
            tWalletName,
            tNote,
            addTransaction,
            editTransaction,
            deleteTransaction,
            addWallet,
            editWallet,
            deleteWallet,
            transferFunds,
            payCreditCard,
            recalculateWalletBalances,
            addBudget,
            editBudget,
            deleteBudget,
            updatePlanner,
            addBill,
            editBill,
            deleteBill,
            payBill,
            unpayBill,
            findBillPaymentTx,
            addGoal,
            editGoal,
            deleteGoal,
            depositToGoal,
            withdrawFromGoal,
            simulatorConfig,
            updateSimulatorConfig,
            navTargetCategoryId,
            setNavTargetCategoryId,
            navTargetBudgetId,
            setNavTargetBudgetId,
            navTargetBillId,
            setNavTargetBillId,
            billToAutoPayId,
            setBillToAutoPayId,
            navigateToCategoryTransactions,
            navigateToBudget,
            navigateToBill,
            dismissedAlertIds,
            dismissAlert,
            restoreAlert,
            dismissAllAlerts,
            restoreAllAlerts,
            isAlertDismissed,
            saveDataNow,
            syncDataFromServer,
            resetToDefaultData,
            clearAllData,
            exportDatabaseJSON,
            importDatabaseJSON,
            security,
            isPinLocked,
            pinUnlockError,
            verifyAndUnlockApp,
            updateSecuritySettings,
            currentUser,
            authLoading,
            isHostPasswordSet,
            logoutUser,
            handleLoginSuccess,
            showConfirm,
        }}>
      {authLoading ? (
        <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-slate-950 text-white">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/30 mb-4 animate-pulse">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <p className="text-sm font-bold tracking-wide animate-pulse">FinTrack Pro</p>
          <p className="text-xs text-slate-400 mt-1">
            {language === 'en' ? 'Checking security session...' : 'Đang kiểm tra phiên bảo mật...'}
          </p>
        </div>
      ) : !currentUser ? (
        <AuthModal
          onLoginSuccess={handleLoginSuccess}
          isHostPasswordSet={isHostPasswordSet}
          language={language}
        />
      ) : (
        <>
          {children}
        </>
      )}
      {isPinLocked && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-7 text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
              <KeyRound className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                {language === 'en' ? 'App Access PIN Required' : 'Yêu Cầu Mã PIN Bảo Mật'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {language === 'en'
                ? 'FinTrack is protected against unauthorized access. Please enter your PIN code to unlock.'
                : 'FinTrack đang được bảo vệ chống truy cập trái phép qua mạng. Vui lòng nhập mã PIN bảo mật để mở khóa dữ liệu.'}
              </p>
            </div>
            <form onSubmit={async (e) => {
                e.preventDefault();
                const pinVal = e.target.pinInput.value.trim();
                if (pinVal)
                    await verifyAndUnlockApp(pinVal);
            }} className="space-y-4">
              <input name="pinInput" type="password" inputMode="numeric" autoComplete="current-password" maxLength={8} autoFocus placeholder="••••" className="w-full text-center text-3xl tracking-widest font-black py-3 px-4 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              {pinUnlockError && (<p className="text-xs font-bold text-rose-500">
                  {pinUnlockError}
                </p>)}
              <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-2xl shadow-lg shadow-blue-500/25 transition-all">
                {language === 'en' ? 'Unlock FinTrack' : 'Mở Khóa Ứng Dụng'}
              </button>
            </form>
          </div>
        </div>)}
      <ConfirmModal config={confirmModalConfig} onClose={closeConfirm} />
    </AppContext.Provider>);
};
export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
};
