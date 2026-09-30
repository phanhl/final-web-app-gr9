'use client';
import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { INITIAL_WALLETS, INITIAL_TRANSACTIONS, INITIAL_BUDGETS, INITIAL_BILLS, INITIAL_GOALS, INITIAL_PLANNER, DEFAULT_CATEGORIES, INITIAL_SIMULATOR_CONFIG, } from '@/lib/mock-data';
import { calculateFinancialSummary, checkWalletSufficientFunds, formatCurrency, getLocalDateString, toLocalDateKey, normalizeSaveDate } from '@/lib/utils';
import { translate, translateCategory, translateWalletType } from '@/lib/i18n';
const AppContext = createContext(undefined);
const STORAGE_KEY = 'quan_ly_chi_tieu_data_v2';
export const AppProvider = ({ children }) => {
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
    // Real-time multi-device sync refs
    const lastServerUpdatedAtRef = useRef(null);
    const isSavingRef = useRef(false);
    const lastSavedDataSignatureRef = useRef('');
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
    const applyServerData = useCallback((d) => {
        if (!d)
            return;
        if (d.wallets)
            setWallets(d.wallets);
        if (d.transactions) {
            const cleanTxs = d.transactions.filter(t => (Number(t.amount) || 0) < 100_000_000_000);
            setTransactions(cleanTxs);
        }
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
        if (d.updatedAt) {
            lastServerUpdatedAtRef.current = d.updatedAt;
        }
        // Update signature to match current server payload so auto-save won't echo back
        lastSavedDataSignatureRef.current = computeDataSignature(d);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
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
                headers: {
                    'Cache-Control': 'no-cache, no-store',
                    Pragma: 'no-cache',
                },
            });
            if (res.ok) {
                const result = await res.json();
                if (result.success && result.data) {
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
    }, [applyServerData]);
    // Initial load: prioritize server disk as single source of truth across all devices
    useEffect(() => {
        let isSubscribed = true;
        async function loadData() {
            let serverData = null;
            try {
                const res = await fetch('/api/storage', {
                    cache: 'no-store',
                    headers: {
                        'Cache-Control': 'no-cache, no-store',
                        Pragma: 'no-cache',
                    },
                });
                if (res.ok) {
                    const result = await res.json();
                    if (result.success && result.data) {
                        serverData = result.data;
                    }
                }
            }
            catch (e) {
                console.warn('Could not connect to server storage API:', e);
            }
            let localData = null;
            try {
                const saved = localStorage.getItem(STORAGE_KEY);
                if (saved) {
                    localData = JSON.parse(saved);
                    if (localData && Array.isArray(localData.transactions)) {
                        localData.transactions = localData.transactions.filter(t => (Number(t.amount) || 0) < 100_000_000_000);
                    }
                }
            }
            catch (e) {
                console.error('Failed to parse localStorage data:', e);
            }
            // Choose between server and local by comparing last updatedAt timestamp
            let chosenData = serverData || localData;
            if (localData && serverData) {
                const localTime = new Date(localData.updatedAt || 0).getTime();
                const serverTime = new Date(serverData.updatedAt || 0).getTime();
                if (localTime > serverTime) {
                    chosenData = localData;
                }
            }
            if (chosenData && isSubscribed) {
                applyServerData(chosenData);
                setServerSyncStatus(serverData ? 'synced' : 'offline');
            }
            else if (!chosenData && isSubscribed) {
                setServerSyncStatus('offline');
            }
            if (isSubscribed) {
                setMounted(true);
            }
        }
        loadData();
        return () => {
            isSubscribed = false;
        };
    }, [applyServerData]);
    // Real-time polling & focus/visibility sync across multi-devices (Phone <-> PC)
    useEffect(() => {
        if (!mounted)
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
                    headers: {
                        'Cache-Control': 'no-cache, no-store',
                        Pragma: 'no-cache',
                    },
                });
                if (res.ok) {
                    const result = await res.json();
                    if (result.success && result.data) {
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
    }, [mounted, applyServerData]);
    // Auto-save local changes to server disk
    useEffect(() => {
        if (!mounted)
            return;
        const currentData = {
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
        };
        const currentSignature = computeDataSignature(currentData);
        // If state equals what we last saved or loaded from server, do nothing!
        if (currentSignature === lastSavedDataSignatureRef.current) {
            return;
        }
        const payload = {
            ...currentData,
            updatedAt: new Date().toISOString(),
        };
        // 1. Fast local cache save
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        }
        catch (e) {
            console.error('Failed to save to localStorage:', e);
        }
        // 2. Persist to server disk via API
        isSavingRef.current = true;
        setServerSyncStatus('syncing');
        const timer = setTimeout(async () => {
            try {
                const res = await fetch('/api/storage', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                if (res.ok) {
                    const result = await res.json();
                    lastSavedDataSignatureRef.current = currentSignature;
                    if (result.updatedAt) {
                        lastServerUpdatedAtRef.current = result.updatedAt;
                    }
                    setServerSyncStatus('synced');
                }
                else {
                    setServerSyncStatus('offline');
                }
            }
            catch (err) {
                console.warn('Failed to sync to server storage API:', err);
                setServerSyncStatus('offline');
            }
            finally {
                isSavingRef.current = false;
            }
        }, 400);
        return () => {
            clearTimeout(timer);
            isSavingRef.current = false;
        };
    }, [mounted, wallets, transactions, categories, budgets, bills, goals, planner, currentMonth, userProfile, simulatorConfig]);
    // Immediate save on demand
    const saveDataNow = async () => {
        const currentData = {
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
        };
        const currentSignature = computeDataSignature(currentData);
        const payload = {
            ...currentData,
            updatedAt: new Date().toISOString(),
        };
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        }
        catch (e) {
            console.error('Failed to save to localStorage:', e);
        }
        isSavingRef.current = true;
        setServerSyncStatus('syncing');
        try {
            const res = await fetch('/api/storage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                const result = await res.json();
                lastSavedDataSignatureRef.current = currentSignature;
                if (result.updatedAt) {
                    lastServerUpdatedAtRef.current = result.updatedAt;
                }
                setServerSyncStatus('synced');
                return true;
            }
            else {
                setServerSyncStatus('offline');
                return false;
            }
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
    const financialSummary = calculateFinancialSummary(wallets, transactions, currentMonth);
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
    // Helper: Determine if transaction date is effective as of today (wall-clock local date)
    const isTxEffective = (dateStr) => {
        if (!dateStr) return true;
        const txDateKey = toLocalDateKey(dateStr);
        const todayKey = getLocalDateString();
        return txDateKey <= todayKey;
    };
    // Add Transaction
    const addTransaction = (tx) => {
        // 1. Validate funds for EXPENSE and TRANSFER to prevent negative balance
        if (tx.type === 'EXPENSE' || tx.type === 'TRANSFER') {
            const sourceWallet = wallets.find((w) => w.id === tx.walletId);
            const fee = tx.type === 'TRANSFER' ? (tx.fee || 0) : 0;
            const validation = checkWalletSufficientFunds(sourceWallet, tx.amount, fee);
            if (!validation.isValid) {
                alert(validation.errorMessage || 'Số dư ví không đủ để thực hiện giao dịch này!');
                return false;
            }
        }
        const id = `tx-${Date.now()}`;
        const createdAt = new Date().toISOString();
        const txDate = tx.date ? normalizeSaveDate(tx.date) : normalizeSaveDate();
        const todayKey = getLocalDateString();
        if (toLocalDateKey(txDate) > todayKey) {
            alert('Không thể ghi nhận giao dịch cho ngày trong tương lai (chưa đến ngày)!');
            return false;
        }
        const newTx = {
            ...tx,
            date: txDate,
            id,
            createdAt,
        };
        // Update wallet balances with mathematical integrity (no artificial clamping)
        // ONLY update wallet balance if the transaction date has arrived (date <= today)
        if (isTxEffective(newTx.date)) {
            setWallets((prevWallets) => prevWallets.map((w) => {
                if (newTx.type === 'EXPENSE' && w.id === newTx.walletId) {
                    if (w.type === 'CREDIT') {
                        return { ...w, balance: w.balance + newTx.amount };
                    }
                    return { ...w, balance: w.balance - newTx.amount };
                }
                if (newTx.type === 'INCOME' && w.id === newTx.walletId) {
                    if (w.type === 'CREDIT') {
                        return { ...w, balance: w.balance - newTx.amount };
                    }
                    return { ...w, balance: w.balance + newTx.amount };
                }
                if (newTx.type === 'TRANSFER') {
                    if (w.id === newTx.walletId) {
                        if (w.type === 'CREDIT') {
                            return { ...w, balance: w.balance + (newTx.amount + (newTx.fee || 0)) };
                        }
                        return { ...w, balance: w.balance - (newTx.amount + (newTx.fee || 0)) };
                    }
                    if (w.id === newTx.toWalletId) {
                        if (w.type === 'CREDIT') {
                            return { ...w, balance: w.balance - newTx.amount };
                        }
                        return { ...w, balance: w.balance + newTx.amount };
                    }
                }
                return w;
            }));
        }
        setTransactions((prev) => [newTx, ...prev]);
        return true;
    };
    // Import Bank Statement Transactions in Batch
    const importBankStatementTransactions = ({
        transactionsToImport,
        walletId,
        balanceAdjustmentMode = 'NET_CHANGE',
        exactClosingBalance = null,
    }) => {
        if (!transactionsToImport || transactionsToImport.length === 0) {
            return { success: false, message: 'Không có giao dịch nào được chọn để nạp' };
        }
        const targetWallet = wallets.find((w) => w.id === walletId);
        if (!targetWallet) {
            return { success: false, message: 'Không tìm thấy ví tương ứng' };
        }

        let totalIncome = 0;
        let totalExpense = 0;

        const newTxList = transactionsToImport.map((tx, idx) => {
            const amount = Number(tx.amount) || 0;
            if (tx.type === 'INCOME') totalIncome += amount;
            if (tx.type === 'EXPENSE') totalExpense += amount;

            return {
                id: `tx-st-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
                type: tx.type,
                amount,
                categoryId: tx.categoryId,
                categoryName: tx.categoryName,
                walletId: targetWallet.id,
                walletName: targetWallet.name,
                date: tx.date || new Date().toISOString(),
                note: tx.note || 'Sao kê ngân hàng',
                tags: Array.isArray(tx.tags) && tx.tags.length > 0 ? tx.tags : ['Sao kê'],
                createdAt: new Date().toISOString(),
            };
        });

        const netChange = totalIncome - totalExpense;
        const oldBalance = targetWallet.balance;
        let newBalance = oldBalance;

        if (balanceAdjustmentMode === 'SET_EXACT' && exactClosingBalance !== null && !isNaN(Number(exactClosingBalance))) {
            newBalance = Math.max(0, Number(exactClosingBalance));
        } else {
            if (targetWallet.type === 'CREDIT') {
                newBalance = Math.max(0, oldBalance + totalExpense - totalIncome);
            } else {
                newBalance = Math.max(0, oldBalance + netChange);
            }
        }

        setWallets((prev) => prev.map((w) => {
            if (w.id === targetWallet.id) {
                return { ...w, balance: newBalance };
            }
            return w;
        }));

        setTransactions((prev) => [...newTxList, ...prev]);

        if (newTxList.length > 0) {
            const latestTxMonth = newTxList[0].date.slice(0, 7);
            if (latestTxMonth && /^\d{4}-\d{2}$/.test(latestTxMonth)) {
                setCurrentMonth(latestTxMonth);
            }
        }

        return {
            success: true,
            count: newTxList.length,
            totalIncome,
            totalExpense,
            walletName: targetWallet.name,
        };
    };
    // Edit Transaction
    const editTransaction = (id, updated) => {
        const oldTx = transactions.find((t) => t.id === id);
        if (!oldTx)
            return false;
        const newTx = { ...oldTx, ...updated };
        if (newTx.date) {
            newTx.date = normalizeSaveDate(newTx.date);
        }
        const todayKey = getLocalDateString();
        if (toLocalDateKey(newTx.date) > todayKey) {
            alert('Không thể đặt ngày giao dịch trong tương lai (chưa đến ngày)!');
            return false;
        }
        if (newTx.type === 'TRANSFER') {
            if (newTx.walletId === newTx.toWalletId) {
                alert('Ví nhận phải khác ví chuyển!');
                return false;
            }
            const destW = wallets.find((w) => w.id === newTx.toWalletId);
            newTx.toWalletName = destW?.name || newTx.toWalletName;
        } else {
            delete newTx.toWalletId;
            delete newTx.toWalletName;
            newTx.fee = 0;
        }

        const oldEffective = isTxEffective(oldTx.date);
        const newEffective = isTxEffective(newTx.date);

        // Rollback old transaction on wallets ONLY if it was effective as of today
        let adjustedWallets = [...wallets];
        if (oldEffective) {
            adjustedWallets = adjustedWallets.map((w) => {
                if (oldTx.type === 'EXPENSE' && w.id === oldTx.walletId) {
                    if (w.type === 'CREDIT')
                        return { ...w, balance: w.balance - oldTx.amount };
                    return { ...w, balance: w.balance + oldTx.amount };
                }
                if (oldTx.type === 'INCOME' && w.id === oldTx.walletId) {
                    if (w.type === 'CREDIT')
                        return { ...w, balance: w.balance + oldTx.amount };
                    return { ...w, balance: w.balance - oldTx.amount };
                }
                if (oldTx.type === 'TRANSFER') {
                    if (w.id === oldTx.walletId) {
                        if (w.type === 'CREDIT')
                            return { ...w, balance: w.balance - (oldTx.amount + (oldTx.fee || 0)) };
                        return { ...w, balance: w.balance + (oldTx.amount + (oldTx.fee || 0)) };
                    }
                    if (w.id === oldTx.toWalletId) {
                        if (w.type === 'CREDIT')
                            return { ...w, balance: w.balance + oldTx.amount };
                        return { ...w, balance: w.balance - oldTx.amount };
                    }
                }
                return w;
            });
        }

        // Validate new transaction funds against rolled-back wallets if effective
        if (newEffective && (newTx.type === 'EXPENSE' || newTx.type === 'TRANSFER')) {
            const sourceW = adjustedWallets.find((w) => w.id === newTx.walletId);
            const fee = newTx.type === 'TRANSFER' ? (newTx.fee || 0) : 0;
            const validation = checkWalletSufficientFunds(sourceW, newTx.amount, fee);
            if (!validation.isValid) {
                alert(validation.errorMessage || 'Số dư ví không đủ sau khi điều chỉnh!');
                return false;
            }
        }

        // Apply new transaction to wallets ONLY if it is effective as of today
        if (newEffective) {
            adjustedWallets = adjustedWallets.map((w) => {
                if (newTx.type === 'EXPENSE' && w.id === newTx.walletId) {
                    if (w.type === 'CREDIT')
                        return { ...w, balance: w.balance + newTx.amount };
                    return { ...w, balance: w.balance - newTx.amount };
                }
                if (newTx.type === 'INCOME' && w.id === newTx.walletId) {
                    if (w.type === 'CREDIT')
                        return { ...w, balance: w.balance - newTx.amount };
                    return { ...w, balance: w.balance + newTx.amount };
                }
                if (newTx.type === 'TRANSFER') {
                    if (w.id === newTx.walletId) {
                        if (w.type === 'CREDIT')
                            return { ...w, balance: w.balance + (newTx.amount + (newTx.fee || 0)) };
                        return { ...w, balance: w.balance - (newTx.amount + (newTx.fee || 0)) };
                    }
                    if (w.id === newTx.toWalletId) {
                        if (w.type === 'CREDIT')
                            return { ...w, balance: w.balance - newTx.amount };
                        return { ...w, balance: w.balance + newTx.amount };
                    }
                }
                return w;
            });
        }
        setWallets(adjustedWallets);
        setTransactions((prev) => prev.map((t) => (t.id === id ? newTx : t)));
        return true;
    };
    // Delete Transaction
    const deleteTransaction = (id) => {
        const oldTx = transactions.find((t) => t.id === id);
        if (!oldTx)
            return;
        // Rollback wallet balance safely if transaction was effective as of today
        if (isTxEffective(oldTx.date)) {
            setWallets((prevWallets) => prevWallets.map((w) => {
                if (oldTx.type === 'EXPENSE' && w.id === oldTx.walletId) {
                    if (w.type === 'CREDIT')
                        return { ...w, balance: w.balance - oldTx.amount };
                    return { ...w, balance: w.balance + oldTx.amount };
                }
                if (oldTx.type === 'INCOME' && w.id === oldTx.walletId) {
                    if (w.type === 'CREDIT')
                        return { ...w, balance: w.balance + oldTx.amount };
                    return { ...w, balance: w.balance - oldTx.amount };
                }
                if (oldTx.type === 'TRANSFER') {
                    if (w.id === oldTx.walletId) {
                        if (w.type === 'CREDIT')
                            return { ...w, balance: w.balance - (oldTx.amount + (oldTx.fee || 0)) };
                        return { ...w, balance: w.balance + (oldTx.amount + (oldTx.fee || 0)) };
                    }
                    if (w.id === oldTx.toWalletId) {
                        if (w.type === 'CREDIT')
                            return { ...w, balance: w.balance + oldTx.amount };
                        return { ...w, balance: w.balance - oldTx.amount };
                    }
                }
                return w;
            }));
        }
        setTransactions((prev) => prev.filter((t) => t.id !== id));
    };
    // Wallets
    const addWallet = (wallet) => {
        const newWallet = {
            ...wallet,
            id: `wal-${Date.now()}`,
            createdAt: new Date().toISOString(),
        };
        setWallets((prev) => [...prev, newWallet]);
    };
    const editWallet = (id, updated) => {
        setWallets((prev) => prev.map((w) => (w.id === id ? { ...w, ...updated } : w)));
    };
    const deleteWallet = (id) => {
        setWallets((prev) => prev.filter((w) => w.id !== id));
        // Also remove transactions associated with this deleted wallet to prevent orphaned entries
        setTransactions((prev) => prev.filter((tx) => tx.walletId !== id && tx.toWalletId !== id));
        // Unbind any bills or goals associated with this wallet
        setBills((prev) => prev.map((b) => b.walletId === id ? { ...b, walletId: undefined } : b));
        setGoals((prev) => prev.map((g) => g.walletId === id ? { ...g, walletId: undefined } : g));
    };
    const transferFunds = (fromWalletId, toWalletId, amount, fee, note) => {
        if (fromWalletId === toWalletId) {
            alert('Ví nhận phải khác ví chuyển!');
            return false;
        }
        const fromW = wallets.find((w) => w.id === fromWalletId);
        const toW = wallets.find((w) => w.id === toWalletId);
        const validation = checkWalletSufficientFunds(fromW, amount, fee);
        if (!validation.isValid) {
            alert(validation.errorMessage || 'Số dư ví chuyển không đủ!');
            return false;
        }
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
    // Recalculate wallet balances safely from history
    const recalculateWalletBalances = () => {
        const todayKey = getLocalDateString();
        setWallets((prevWallets) => {
            return prevWallets.map((w) => {
                let currentBal = w.initialBalance || 0;
                const sortedTxs = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                for (const tx of sortedTxs) {
                    // Do not count future transactions towards current balance
                    if (toLocalDateKey(tx.date) > todayKey) {
                        continue;
                    }
                    if (tx.type === 'EXPENSE' && tx.walletId === w.id) {
                        if (w.type === 'CREDIT') {
                            currentBal += tx.amount;
                        }
                        else {
                            currentBal -= tx.amount;
                        }
                    }
                    else if (tx.type === 'INCOME' && tx.walletId === w.id) {
                        if (w.type === 'CREDIT') {
                            currentBal -= tx.amount;
                        }
                        else {
                            currentBal += tx.amount;
                        }
                    }
                    else if (tx.type === 'TRANSFER') {
                        if (tx.walletId === w.id) {
                            if (w.type === 'CREDIT') {
                                currentBal += tx.amount + (tx.fee || 0);
                            }
                            else {
                                currentBal -= (tx.amount + (tx.fee || 0));
                            }
                        }
                        else if (tx.toWalletId === w.id) {
                            if (w.type === 'CREDIT') {
                                currentBal -= tx.amount;
                            }
                            else {
                                currentBal += tx.amount;
                            }
                        }
                    }
                }
                return { ...w, balance: currentBal };
            });
        });
    };
    // Budgets
    const addBudget = (budget) => {
        const newBudget = {
            ...budget,
            id: `bud-${Date.now()}`,
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
            id: `bill-${Date.now()}`,
        };
        setBills((prev) => [...prev, newBill]);
    };
    const editBill = (id, updated) => {
        setBills((prev) => prev.map((b) => (b.id === id ? { ...b, ...updated } : b)));
    };
    const deleteBill = (id) => {
        setBills((prev) => prev.filter((b) => b.id !== id));
    };
    const payBill = (billId, walletId, customPaidDate) => {
        const bill = bills.find((b) => b.id === billId);
        if (!bill)
            return;
        const targetWallet = wallets.find((w) => w.id === walletId) || wallets[0];
        const validation = checkWalletSufficientFunds(targetWallet, bill.amount);
        if (!validation.isValid) {
            alert(validation.errorMessage || `Số dư ví ${targetWallet?.name} không đủ để thanh toán hóa đơn này!`);
            return;
        }
        const billCategory = categories.find((c) => c.id === bill.categoryId);
        const paidDate = customPaidDate || getLocalDateString();
        // 1. Mark bill as PAID
        setBills((prev) => prev.map((b) => b.id === billId
            ? {
                ...b,
                status: 'PAID',
                lastPaidDate: paidDate,
                walletId,
            }
            : b));
        // 2. Automatically record transaction (addTransaction will deduct wallet balance safely)
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        const txDate = `${paidDate}T${timeStr}`;
        addTransaction({
            type: 'EXPENSE',
            amount: bill.amount,
            categoryId: bill.categoryId,
            categoryName: billCategory?.name || bill.categoryName || 'Hóa đơn',
            walletId: targetWallet.id,
            walletName: targetWallet.name,
            date: txDate,
            note: `Thanh toán hóa đơn: ${bill.name}`,
            tags: ['Hóa đơn định kỳ'],
        });
    };
    // Goals
    const addGoal = (goal) => {
        const newGoal = {
            ...goal,
            id: `goal-${Date.now()}`,
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
            return;
        // Check if wallet has sufficient funds
        const validation = checkWalletSufficientFunds(wallet, amount);
        if (!validation.isValid) {
            alert(validation.errorMessage || `Số dư ví ${wallet.name} không đủ để tích lũy vào mục tiêu!`);
            return;
        }
        // Add to goal
        const newHistoryItem = {
            id: `gh-${Date.now()}`,
            date: getLocalDateString(),
            amount,
            type: 'DEPOSIT',
            walletId,
            note: note || `Nạp từ ${wallet.name}`,
        };
        setGoals((prev) => prev.map((g) => g.id === goalId
            ? {
                ...g,
                currentAmount: g.currentAmount + amount,
                history: [newHistoryItem, ...g.history],
            }
            : g));
        // Log transaction - addTransaction already safely deducts from wallet without double-counting
        addTransaction({
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
    };
    const withdrawFromGoal = (goalId, amount, walletId, note) => {
        const goal = goals.find((g) => g.id === goalId);
        const wallet = wallets.find((w) => w.id === walletId);
        if (!goal || !wallet)
            return;
        if (amount > goal.currentAmount) {
            alert(`Số tiền rút (${formatCurrency(amount)}) vượt quá số dư hiện có trong mục tiêu (${formatCurrency(goal.currentAmount)})!`);
            return;
        }
        // Deduct from goal
        const newHistoryItem = {
            id: `gh-${Date.now()}`,
            date: getLocalDateString(),
            amount,
            type: 'WITHDRAW',
            walletId,
            note: note || `Rút về ${wallet.name}`,
        };
        setGoals((prev) => prev.map((g) => g.id === goalId
            ? {
                ...g,
                currentAmount: Math.max(0, g.currentAmount - amount),
                history: [newHistoryItem, ...g.history],
            }
            : g));
        // Log income transaction - addTransaction already safely adds to wallet without double-counting
        addTransaction({
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
        localStorage.removeItem(STORAGE_KEY);
        try {
            await fetch('/api/storage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(defaultData),
            });
            setServerSyncStatus('synced');
        }
        catch (e) {
            console.error('Failed to reset on server:', e);
        }
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
            if (data.wallets && Array.isArray(data.wallets))
                setWallets(data.wallets);
            if (data.transactions && Array.isArray(data.transactions))
                setTransactions(data.transactions);
            if (data.categories && Array.isArray(data.categories))
                setCategories(data.categories);
            if (data.budgets && Array.isArray(data.budgets))
                setBudgets(data.budgets);
            if (data.bills && Array.isArray(data.bills))
                setBills(data.bills);
            if (data.goals && Array.isArray(data.goals))
                setGoals(data.goals);
            if (data.planner) {
                setPlanner({
                    ...data.planner,
                    emergencyPercent: data.planner.emergencyPercent !== undefined ? data.planner.emergencyPercent : 10,
                });
            }
            if (data.simulatorConfig)
                setSimulatorConfig(data.simulatorConfig);
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
            addTransaction,
            editTransaction,
            deleteTransaction,
            addWallet,
            editWallet,
            deleteWallet,
            transferFunds,
            recalculateWalletBalances,
            addBudget,
            editBudget,
            deleteBudget,
            updatePlanner,
            addBill,
            editBill,
            deleteBill,
            payBill,
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
        }}>
      {children}
    </AppContext.Provider>);
};
export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
};
