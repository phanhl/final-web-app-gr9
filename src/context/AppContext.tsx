'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Wallet,
  Transaction,
  Category,
  Budget,
  RecurringBill,
  SavingsGoal,
  IncomeBudgetPlanner,
  FinancialSummary,
  FilterPeriod,
  UserProfile,
  SimulatorConfig,
} from '@/types';
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
import { calculateFinancialSummary, checkWalletSufficientFunds, formatCurrency, getLocalDateString } from '@/lib/utils';

interface AppContextType {
  wallets: Wallet[];
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  bills: RecurringBill[];
  goals: SavingsGoal[];
  planner: IncomeBudgetPlanner;
  currentMonth: string;
  setCurrentMonth: (month: string) => void;
  serverSyncStatus: 'synced' | 'syncing' | 'offline';
  activeTab: string;
  setActiveTab: (tab: string) => void;
  quickAddOpen: boolean;
  setQuickAddOpen: (open: boolean) => void;
  quickAddDefaultType: 'EXPENSE' | 'INCOME' | 'TRANSFER';
  quickAddDefaultWalletId?: string;
  openQuickAdd: (type?: 'EXPENSE' | 'INCOME' | 'TRANSFER', defaultWalletId?: string) => void;
  financialSummary: FinancialSummary;
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleTheme: () => void;
  isDarkMode: boolean;
  userProfile: UserProfile;
  updateUserProfile: (profile: Partial<UserProfile>) => void;

  // Transactions
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => boolean;
  editTransaction: (id: string, tx: Partial<Transaction>) => boolean;
  deleteTransaction: (id: string) => void;

  // Wallets
  addWallet: (wallet: Omit<Wallet, 'id' | 'createdAt'>) => void;
  editWallet: (id: string, wallet: Partial<Wallet>) => void;
  deleteWallet: (id: string) => void;
  transferFunds: (fromWalletId: string, toWalletId: string, amount: number, fee: number, note?: string) => boolean;
  recalculateWalletBalances: () => void;

  // Budgets
  addBudget: (budget: Omit<Budget, 'id'>) => void;
  editBudget: (id: string, budget: Partial<Budget>) => void;
  deleteBudget: (id: string) => void;
  updatePlanner: (planner: IncomeBudgetPlanner) => void;

  // Bills
  addBill: (bill: Omit<RecurringBill, 'id'>) => void;
  editBill: (id: string, bill: Partial<RecurringBill>) => void;
  deleteBill: (id: string) => void;
  payBill: (billId: string, walletId: string, customPaidDate?: string) => void;

  // Goals
  addGoal: (goal: Omit<SavingsGoal, 'id' | 'createdAt' | 'history'>) => void;
  editGoal: (id: string, goal: Partial<SavingsGoal>) => void;
  deleteGoal: (id: string) => void;
  depositToGoal: (goalId: string, amount: number, walletId: string, note?: string) => void;
  withdrawFromGoal: (goalId: string, amount: number, walletId: string, note?: string) => void;

  // What-If Simulator Persistence
  simulatorConfig: SimulatorConfig;
  updateSimulatorConfig: (config: Partial<SimulatorConfig>) => void;

  // Deep-linking & Notification Navigation
  navTargetCategoryId: string | null;
  setNavTargetCategoryId: (id: string | null) => void;
  navTargetBudgetId: string | null;
  setNavTargetBudgetId: (id: string | null) => void;
  navTargetBillId: string | null;
  setNavTargetBillId: (id: string | null) => void;
  billToAutoPayId: string | null;
  setBillToAutoPayId: (id: string | null) => void;
  navigateToCategoryTransactions: (categoryId: string) => void;
  navigateToBudget: (budgetId: string) => void;
  navigateToBill: (billId: string, autoOpenPay?: boolean) => void;

  // Backup & Reset
  saveDataNow: () => Promise<boolean>;
  resetToDefaultData: () => void;
  clearAllData: () => void;
  exportDatabaseJSON: () => void;
  importDatabaseJSON: (jsonStr: string) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = 'quan_ly_chi_tieu_data_v2';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mounted, setMounted] = useState(false);
  const [wallets, setWallets] = useState<Wallet[]>(INITIAL_WALLETS);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [budgets, setBudgets] = useState<Budget[]>(INITIAL_BUDGETS);
  const [bills, setBills] = useState<RecurringBill[]>(INITIAL_BILLS);
  const [goals, setGoals] = useState<SavingsGoal[]>(INITIAL_GOALS);
  const [planner, setPlanner] = useState<IncomeBudgetPlanner>(INITIAL_PLANNER);
  const [currentMonth, setCurrentMonth] = useState<string>('2026-09');

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [quickAddOpen, setQuickAddOpen] = useState<boolean>(false);
  const [quickAddDefaultType, setQuickAddDefaultType] = useState<'EXPENSE' | 'INCOME' | 'TRANSFER'>('EXPENSE');
  const [quickAddDefaultWalletId, setQuickAddDefaultWalletId] = useState<string | undefined>(undefined);

  const [serverSyncStatus, setServerSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');

  // User Profile
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: 'Admin',
    email: 'admin@fintrack.vn',
    phone: '0912 345 678',
    role: 'Chủ tài khoản (Owner)',
    membership: 'VIP Lifetime Member',
    joinedDate: '16/09/2026',
    avatarColor: '#10b981',
  });

  const updateUserProfile = (profile: Partial<UserProfile>) => {
    setUserProfile((prev) => {
      const updated = { ...prev, ...profile };
      try {
        localStorage.setItem('fintrack_user_profile', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // What-If Simulator Configuration State
  const [simulatorConfig, setSimulatorConfig] = useState<SimulatorConfig>(INITIAL_SIMULATOR_CONFIG);

  const updateSimulatorConfig = (config: Partial<SimulatorConfig>) => {
    setSimulatorConfig((prev) => ({ ...prev, ...config }));
  };

  // Deep-linking & Notification Navigation States
  const [navTargetCategoryId, setNavTargetCategoryId] = useState<string | null>(null);
  const [navTargetBudgetId, setNavTargetBudgetId] = useState<string | null>(null);
  const [navTargetBillId, setNavTargetBillId] = useState<string | null>(null);
  const [billToAutoPayId, setBillToAutoPayId] = useState<string | null>(null);

  const navigateToCategoryTransactions = (categoryId: string) => {
    setNavTargetCategoryId(categoryId);
    setActiveTab('transactions');
  };

  const navigateToBudget = (budgetId: string) => {
    setNavTargetBudgetId(budgetId);
    setActiveTab('budgets');
  };

  const navigateToBill = (billId: string, autoOpenPay: boolean = false) => {
    setNavTargetBillId(billId);
    if (autoOpenPay) {
      setBillToAutoPayId(billId);
    }
    setActiveTab('bills');
  };

  // Theme Management (Light, Dark, System)
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>('system');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  useEffect(() => {
    try {
      const savedTheme = (localStorage.getItem('fintrack_theme') as 'light' | 'dark' | 'system') || 'system';
      setThemeState(savedTheme);
    } catch (e) {
      console.warn('Failed to read theme from localStorage', e);
    }
  }, []);

  useEffect(() => {
    const updateTheme = () => {
      const isDark =
        theme === 'dark' ||
        (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

      setIsDarkMode(isDark);
      if (typeof document !== 'undefined') {
        if (isDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };

    updateTheme();
    try {
      localStorage.setItem('fintrack_theme', theme);
    } catch (e) {
      // ignore
    }

    if (theme === 'system' && typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => updateTheme();
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [theme]);

  const setTheme = (newTheme: 'light' | 'dark' | 'system') => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState(isDarkMode ? 'light' : 'dark');
  };

  // Load from server disk first, fallback to local storage
  useEffect(() => {
    let isSubscribed = true;

    async function loadData() {
      let serverData: any = null;
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
      } catch (e) {
        console.warn('Could not connect to server storage API:', e);
      }

      let localData: any = null;
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          localData = JSON.parse(saved);
        }
      } catch (e) {
        console.error('Failed to parse localStorage data:', e);
      }

      // Pick the freshest dataset between server disk and localStorage
      let chosenData = serverData;
      if (!serverData && localData) {
        chosenData = localData;
      } else if (serverData && localData) {
        const serverTime = serverData.updatedAt ? new Date(serverData.updatedAt).getTime() : 0;
        const localTime = localData.updatedAt ? new Date(localData.updatedAt).getTime() : 0;
        // If local data is newer by more than 500ms, prioritize local
        if (localTime > serverTime + 500) {
          chosenData = localData;
        }
      }

      if (chosenData && isSubscribed) {
        const d = chosenData;
        if (d.wallets) setWallets(d.wallets);
        if (d.transactions) setTransactions(d.transactions);
        if (d.categories) setCategories(d.categories);
        if (d.budgets) setBudgets(d.budgets);
        if (d.bills) setBills(d.bills);
        if (d.goals) setGoals(d.goals);
        if (d.planner) {
          setPlanner({
            ...d.planner,
            emergencyPercent: d.planner.emergencyPercent !== undefined ? d.planner.emergencyPercent : 10,
          });
        }
        if (d.currentMonth) setCurrentMonth(d.currentMonth);
        if (d.userProfile) setUserProfile(d.userProfile);
        if (d.simulatorConfig) setSimulatorConfig(d.simulatorConfig);
        setServerSyncStatus('synced');
      } else if (!chosenData && isSubscribed) {
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
  }, []);

  // Save to local storage & persist to server disk
  useEffect(() => {
    if (!mounted) return;

    const payload = {
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
      updatedAt: new Date().toISOString(),
    };

    // 1. Fast local cache save
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }

    // 2. Persist to server disk via API
    setServerSyncStatus('syncing');
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/storage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          setServerSyncStatus('synced');
        } else {
          setServerSyncStatus('offline');
        }
      } catch (err) {
        console.warn('Failed to sync to server storage API:', err);
        setServerSyncStatus('offline');
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [mounted, wallets, transactions, categories, budgets, bills, goals, planner, currentMonth, userProfile, simulatorConfig]);

  // Immediate save on demand
  const saveDataNow = async (): Promise<boolean> => {
    const payload = {
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
      updatedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }

    setServerSyncStatus('syncing');
    try {
      const res = await fetch('/api/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setServerSyncStatus('synced');
        return true;
      } else {
        setServerSyncStatus('offline');
        return false;
      }
    } catch (err) {
      console.warn('Failed to sync to server storage API:', err);
      setServerSyncStatus('offline');
      return false;
    }
  };

  const openQuickAdd = (type: 'EXPENSE' | 'INCOME' | 'TRANSFER' = 'EXPENSE', defaultWalletId?: string) => {
    setQuickAddDefaultType(type);
    setQuickAddDefaultWalletId(defaultWalletId);
    setQuickAddOpen(true);
  };

  // Financial summary
  const financialSummary = calculateFinancialSummary(wallets, transactions, currentMonth);

  // Add Transaction
  const addTransaction = (tx: Omit<Transaction, 'id' | 'createdAt'>): boolean => {
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
    const newTx: Transaction = {
      ...tx,
      id,
      createdAt,
    };

    // Update wallet balances with credit card logic & non-negative floor
    setWallets((prevWallets) =>
      prevWallets.map((w) => {
        if (tx.type === 'EXPENSE' && w.id === tx.walletId) {
          if (w.type === 'CREDIT') {
            return { ...w, balance: w.balance + tx.amount };
          }
          return { ...w, balance: Math.max(0, w.balance - tx.amount) };
        }
        if (tx.type === 'INCOME' && w.id === tx.walletId) {
          if (w.type === 'CREDIT') {
            return { ...w, balance: Math.max(0, w.balance - tx.amount) };
          }
          return { ...w, balance: w.balance + tx.amount };
        }
        if (tx.type === 'TRANSFER') {
          if (w.id === tx.walletId) {
            if (w.type === 'CREDIT') {
              return { ...w, balance: w.balance + (tx.amount + (tx.fee || 0)) };
            }
            return { ...w, balance: Math.max(0, w.balance - (tx.amount + (tx.fee || 0))) };
          }
          if (w.id === tx.toWalletId) {
            if (w.type === 'CREDIT') {
              return { ...w, balance: Math.max(0, w.balance - tx.amount) };
            }
            return { ...w, balance: w.balance + tx.amount };
          }
        }
        return w;
      })
    );

    setTransactions((prev) => [newTx, ...prev]);
    return true;
  };

  // Edit Transaction
  const editTransaction = (id: string, updated: Partial<Transaction>): boolean => {
    const oldTx = transactions.find((t) => t.id === id);
    if (!oldTx) return false;

    // Rollback old transaction on wallets
    let adjustedWallets = [...wallets];
    adjustedWallets = adjustedWallets.map((w) => {
      if (oldTx.type === 'EXPENSE' && w.id === oldTx.walletId) {
        if (w.type === 'CREDIT') return { ...w, balance: Math.max(0, w.balance - oldTx.amount) };
        return { ...w, balance: w.balance + oldTx.amount };
      }
      if (oldTx.type === 'INCOME' && w.id === oldTx.walletId) {
        if (w.type === 'CREDIT') return { ...w, balance: w.balance + oldTx.amount };
        return { ...w, balance: Math.max(0, w.balance - oldTx.amount) };
      }
      if (oldTx.type === 'TRANSFER') {
        if (w.id === oldTx.walletId) {
          if (w.type === 'CREDIT') return { ...w, balance: Math.max(0, w.balance - (oldTx.amount + (oldTx.fee || 0))) };
          return { ...w, balance: w.balance + (oldTx.amount + (oldTx.fee || 0)) };
        }
        if (w.id === oldTx.toWalletId) {
          if (w.type === 'CREDIT') return { ...w, balance: w.balance + oldTx.amount };
          return { ...w, balance: Math.max(0, w.balance - oldTx.amount) };
        }
      }
      return w;
    });

    const newTx: Transaction = { ...oldTx, ...updated };

    // Validate new transaction funds against rolled-back wallets
    if (newTx.type === 'EXPENSE' || newTx.type === 'TRANSFER') {
      const sourceW = adjustedWallets.find((w) => w.id === newTx.walletId);
      const fee = newTx.type === 'TRANSFER' ? (newTx.fee || 0) : 0;
      const validation = checkWalletSufficientFunds(sourceW, newTx.amount, fee);
      if (!validation.isValid) {
        alert(validation.errorMessage || 'Số dư ví không đủ sau khi điều chỉnh!');
        return false;
      }
    }

    // Apply new transaction to wallets
    adjustedWallets = adjustedWallets.map((w) => {
      if (newTx.type === 'EXPENSE' && w.id === newTx.walletId) {
        if (w.type === 'CREDIT') return { ...w, balance: w.balance + newTx.amount };
        return { ...w, balance: Math.max(0, w.balance - newTx.amount) };
      }
      if (newTx.type === 'INCOME' && w.id === newTx.walletId) {
        if (w.type === 'CREDIT') return { ...w, balance: Math.max(0, w.balance - newTx.amount) };
        return { ...w, balance: w.balance + newTx.amount };
      }
      if (newTx.type === 'TRANSFER') {
        if (w.id === newTx.walletId) {
          if (w.type === 'CREDIT') return { ...w, balance: w.balance + (newTx.amount + (newTx.fee || 0)) };
          return { ...w, balance: Math.max(0, w.balance - (newTx.amount + (newTx.fee || 0))) };
        }
        if (w.id === newTx.toWalletId) {
          if (w.type === 'CREDIT') return { ...w, balance: Math.max(0, w.balance - newTx.amount) };
          return { ...w, balance: w.balance + newTx.amount };
        }
      }
      return w;
    });

    setWallets(adjustedWallets);
    setTransactions((prev) => prev.map((t) => (t.id === id ? newTx : t)));
    return true;
  };

  // Delete Transaction
  const deleteTransaction = (id: string) => {
    const oldTx = transactions.find((t) => t.id === id);
    if (!oldTx) return;

    // Rollback wallet balance safely
    setWallets((prevWallets) =>
      prevWallets.map((w) => {
        if (oldTx.type === 'EXPENSE' && w.id === oldTx.walletId) {
          if (w.type === 'CREDIT') return { ...w, balance: Math.max(0, w.balance - oldTx.amount) };
          return { ...w, balance: w.balance + oldTx.amount };
        }
        if (oldTx.type === 'INCOME' && w.id === oldTx.walletId) {
          if (w.type === 'CREDIT') return { ...w, balance: w.balance + oldTx.amount };
          return { ...w, balance: Math.max(0, w.balance - oldTx.amount) };
        }
        if (oldTx.type === 'TRANSFER') {
          if (w.id === oldTx.walletId) {
            if (w.type === 'CREDIT') return { ...w, balance: Math.max(0, w.balance - (oldTx.amount + (oldTx.fee || 0))) };
            return { ...w, balance: w.balance + (oldTx.amount + (oldTx.fee || 0)) };
          }
          if (w.id === oldTx.toWalletId) {
            if (w.type === 'CREDIT') return { ...w, balance: w.balance + oldTx.amount };
            return { ...w, balance: Math.max(0, w.balance - oldTx.amount) };
          }
        }
        return w;
      })
    );

    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  // Wallets
  const addWallet = (wallet: Omit<Wallet, 'id' | 'createdAt'>) => {
    const newWallet: Wallet = {
      ...wallet,
      id: `wal-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setWallets((prev) => [...prev, newWallet]);
  };

  const editWallet = (id: string, updated: Partial<Wallet>) => {
    setWallets((prev) => prev.map((w) => (w.id === id ? { ...w, ...updated } : w)));
  };

  const deleteWallet = (id: string) => {
    setWallets((prev) => prev.filter((w) => w.id !== id));
  };

  const transferFunds = (
    fromWalletId: string,
    toWalletId: string,
    amount: number,
    fee: number,
    note?: string
  ): boolean => {
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
      fee,
      walletId: fromWalletId,
      walletName: fromW?.name,
      toWalletId,
      toWalletName: toW?.name,
      date: new Date().toISOString(),
      note: note || `Chuyển khoản từ ${fromW?.name || 'Ví'} sang ${toW?.name || 'Ví'}`,
      tags: ['Chuyển khoản nội bộ'],
    });
  };

  // Recalculate wallet balances safely from history
  const recalculateWalletBalances = () => {
    setWallets((prevWallets) => {
      return prevWallets.map((w) => {
        let currentBal = w.initialBalance;
        const sortedTxs = [...transactions].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        for (const tx of sortedTxs) {
          if (tx.type === 'EXPENSE' && tx.walletId === w.id) {
            if (w.type === 'CREDIT') {
              currentBal += tx.amount;
            } else {
              currentBal = Math.max(0, currentBal - tx.amount);
            }
          } else if (tx.type === 'INCOME' && tx.walletId === w.id) {
            if (w.type === 'CREDIT') {
              currentBal = Math.max(0, currentBal - tx.amount);
            } else {
              currentBal += tx.amount;
            }
          } else if (tx.type === 'TRANSFER') {
            if (tx.walletId === w.id) {
              if (w.type === 'CREDIT') {
                currentBal += tx.amount + (tx.fee || 0);
              } else {
                currentBal = Math.max(0, currentBal - (tx.amount + (tx.fee || 0)));
              }
            } else if (tx.toWalletId === w.id) {
              if (w.type === 'CREDIT') {
                currentBal = Math.max(0, currentBal - tx.amount);
              } else {
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
  const addBudget = (budget: Omit<Budget, 'id'>) => {
    const newBudget: Budget = {
      ...budget,
      id: `bud-${Date.now()}`,
    };
    setBudgets((prev) => [...prev, newBudget]);
  };

  const editBudget = (id: string, updated: Partial<Budget>) => {
    setBudgets((prev) => prev.map((b) => (b.id === id ? { ...b, ...updated } : b)));
  };

  const deleteBudget = (id: string) => {
    setBudgets((prev) => prev.filter((b) => b.id !== id));
  };

  const updatePlanner = (newPlanner: IncomeBudgetPlanner) => {
    setPlanner(newPlanner);
  };

  // Bills
  const addBill = (bill: Omit<RecurringBill, 'id'>) => {
    const newBill: RecurringBill = {
      ...bill,
      id: `bill-${Date.now()}`,
    };
    setBills((prev) => [...prev, newBill]);
  };

  const editBill = (id: string, updated: Partial<RecurringBill>) => {
    setBills((prev) => prev.map((b) => (b.id === id ? { ...b, ...updated } : b)));
  };

  const deleteBill = (id: string) => {
    setBills((prev) => prev.filter((b) => b.id !== id));
  };

  const payBill = (billId: string, walletId: string, customPaidDate?: string) => {
    const bill = bills.find((b) => b.id === billId);
    if (!bill) return;

    const targetWallet = wallets.find((w) => w.id === walletId) || wallets[0];
    const validation = checkWalletSufficientFunds(targetWallet, bill.amount);
    if (!validation.isValid) {
      alert(validation.errorMessage || `Số dư ví ${targetWallet?.name} không đủ để thanh toán hóa đơn này!`);
      return;
    }

    const billCategory = categories.find((c) => c.id === bill.categoryId);
    const paidDate = customPaidDate || getLocalDateString();

    // 1. Mark bill as PAID
    setBills((prev) =>
      prev.map((b) =>
        b.id === billId
          ? {
              ...b,
              status: 'PAID',
              lastPaidDate: paidDate,
              walletId,
            }
          : b
      )
    );

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
  const addGoal = (goal: Omit<SavingsGoal, 'id' | 'createdAt' | 'history'>) => {
    const newGoal: SavingsGoal = {
      ...goal,
      id: `goal-${Date.now()}`,
      history: [],
      createdAt: new Date().toISOString(),
    };
    setGoals((prev) => [...prev, newGoal]);
  };

  const editGoal = (id: string, updated: Partial<SavingsGoal>) => {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...updated } : g)));
  };

  const deleteGoal = (id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  const depositToGoal = (goalId: string, amount: number, walletId: string, note?: string) => {
    const goal = goals.find((g) => g.id === goalId);
    const wallet = wallets.find((w) => w.id === walletId);
    if (!goal || !wallet) return;

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
      type: 'DEPOSIT' as const,
      walletId,
      note: note || `Nạp từ ${wallet.name}`,
    };

    setGoals((prev) =>
      prev.map((g) =>
        g.id === goalId
          ? {
              ...g,
              currentAmount: g.currentAmount + amount,
              history: [newHistoryItem, ...g.history],
            }
          : g
      )
    );

    // Log transaction - addTransaction already safely deducts from wallet without double-counting
    addTransaction({
      type: 'EXPENSE',
      amount,
      categoryId: 'cat-invest-exp',
      categoryName: 'Đầu tư & Tích lũy',
      walletId,
      walletName: wallet.name,
      date: new Date().toISOString(),
      note: `Tích lũy vào hũ: ${goal.name}`,
      tags: ['Tích lũy mục tiêu'],
    });
  };

  const withdrawFromGoal = (goalId: string, amount: number, walletId: string, note?: string) => {
    const goal = goals.find((g) => g.id === goalId);
    const wallet = wallets.find((w) => w.id === walletId);
    if (!goal || !wallet) return;

    if (amount > goal.currentAmount) {
      alert(`Số tiền rút (${formatCurrency(amount)}) vượt quá số dư hiện có trong mục tiêu (${formatCurrency(goal.currentAmount)})!`);
      return;
    }

    // Deduct from goal
    const newHistoryItem = {
      id: `gh-${Date.now()}`,
      date: getLocalDateString(),
      amount,
      type: 'WITHDRAW' as const,
      walletId,
      note: note || `Rút về ${wallet.name}`,
    };

    setGoals((prev) =>
      prev.map((g) =>
        g.id === goalId
          ? {
              ...g,
              currentAmount: Math.max(0, g.currentAmount - amount),
              history: [newHistoryItem, ...g.history],
            }
          : g
      )
    );

    // Log income transaction - addTransaction already safely adds to wallet without double-counting
    addTransaction({
      type: 'INCOME',
      amount,
      categoryId: 'cat-other-inc',
      categoryName: 'Thu nhập khác',
      walletId,
      walletName: wallet.name,
      date: new Date().toISOString(),
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
    } catch (e) {
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

  const importDatabaseJSON = (jsonStr: string): boolean => {
    try {
      const data = JSON.parse(jsonStr);
      if (data.wallets && Array.isArray(data.wallets)) setWallets(data.wallets);
      if (data.transactions && Array.isArray(data.transactions)) setTransactions(data.transactions);
      if (data.categories && Array.isArray(data.categories)) setCategories(data.categories);
      if (data.budgets && Array.isArray(data.budgets)) setBudgets(data.budgets);
      if (data.bills && Array.isArray(data.bills)) setBills(data.bills);
      if (data.goals && Array.isArray(data.goals)) setGoals(data.goals);
      if (data.planner) {
        setPlanner({
          ...data.planner,
          emergencyPercent: data.planner.emergencyPercent !== undefined ? data.planner.emergencyPercent : 10,
        });
      }
      if (data.simulatorConfig) setSimulatorConfig(data.simulatorConfig);
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  };

  return (
    <AppContext.Provider
      value={{
        wallets,
        transactions,
        categories,
        budgets,
        bills,
        goals,
        planner,
        currentMonth,
        setCurrentMonth,
        serverSyncStatus,
        activeTab,
        setActiveTab,
        quickAddOpen,
        setQuickAddOpen,
        quickAddDefaultType,
        quickAddDefaultWalletId,
        openQuickAdd,
        financialSummary,
        theme,
        setTheme,
        toggleTheme,
        isDarkMode,
        userProfile,
        updateUserProfile,
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
        saveDataNow,
        resetToDefaultData,
        clearAllData,
        exportDatabaseJSON,
        importDatabaseJSON,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
