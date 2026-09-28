'use client';
import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { LayoutDashboard, ReceiptText, PieChart, CalendarCheck, WalletCards, BarChart3, Settings, Plus, Bell, AlertTriangle, Flame, User, CheckCircle2, ChevronRight, Shield, Sparkles, Sun, Moon, Edit2, Check, Download, X, Mail, Phone, Calendar, Crown, Search, CreditCard, RefreshCw, Eye, EyeOff, } from 'lucide-react';
import { formatCurrency, calculateBudgetStatuses } from '@/lib/utils';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
const navItems = [
    { id: 'dashboard', key: 'nav.dashboard', defaultLabel: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', key: 'nav.transactions', defaultLabel: 'Transactions', icon: ReceiptText },
    { id: 'budgets', key: 'nav.budgets', defaultLabel: 'Budgets', icon: PieChart },
    { id: 'whatif', key: 'nav.whatif', defaultLabel: 'What-If Simulation', icon: Sparkles },
    { id: 'bills', key: 'nav.bills', defaultLabel: 'Recurring', icon: CalendarCheck },
    { id: 'reports', key: 'nav.reports', defaultLabel: 'Reports', icon: BarChart3 },
    { id: 'wallets', key: 'nav.wallets', defaultLabel: 'Wallets & Accounts', icon: WalletCards },
    { id: 'settings', key: 'nav.settings', defaultLabel: 'Settings', icon: Settings },
];
const bottomNavItems = [
    { id: 'dashboard', key: 'nav.dashboard', defaultLabel: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', key: 'nav.shortTransactions', defaultLabel: 'Tx', icon: ReceiptText },
    { id: 'budgets', key: 'nav.budgets', defaultLabel: 'Budgets', icon: PieChart },
    { id: 'reports', key: 'nav.reports', defaultLabel: 'Reports', icon: BarChart3 },
    { id: 'settings', key: 'nav.settings', defaultLabel: 'Settings', icon: Settings },
];
export const Navigation = () => {
    const { activeTab, setActiveTab, openQuickAdd, budgets, transactions, bills, financialSummary, currentMonth, serverSyncStatus, syncDataFromServer, theme, toggleTheme, isDarkMode, userProfile, updateUserProfile, wallets, goals, exportDatabaseJSON, navigateToCategoryTransactions, navigateToBudget, navigateToBill, language, t, tCategory, tWalletType, dismissedAlertIds, dismissAlert, restoreAlert, dismissAllAlerts, restoreAllAlerts, isAlertDismissed, } = useApp();
    const [showNotificationModal, setShowNotificationModal] = useState(false);
    const [showDismissedSection, setShowDismissedSection] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [isManualSyncing, setIsManualSyncing] = useState(false);
    const handleManualSync = async () => {
        setIsManualSyncing(true);
        await syncDataFromServer();
        setTimeout(() => {
            setIsManualSyncing(false);
        }, 600);
    };
    // Profile editing state
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editName, setEditName] = useState(userProfile.name);
    const [editEmail, setEditEmail] = useState(userProfile.email);
    const [editPhone, setEditPhone] = useState(userProfile.phone || '');
    const [editAvatarColor, setEditAvatarColor] = useState(userProfile.avatarColor || '#10b981');
    const budgetStatuses = calculateBudgetStatuses(budgets, transactions, currentMonth);
    const warningBudgets = budgetStatuses.filter((b) => b.status === 'WARNING');
    const exceededBudgets = budgetStatuses.filter((b) => b.status === 'EXCEEDED');
    const unpaidUpcomingBills = bills.filter((b) => b.status === 'UNPAID');
    // Active (non-dismissed) alerts for bell badge and primary list
    const activeExceededBudgets = exceededBudgets.filter((b) => !isAlertDismissed(`budget-${b.budget.id}`));
    const activeWarningBudgets = warningBudgets.filter((b) => !isAlertDismissed(`budget-${b.budget.id}`));
    const activeUnpaidBills = unpaidUpcomingBills.filter((b) => !isAlertDismissed(`bill-${b.id}`));
    const alertCount = activeExceededBudgets.length + activeWarningBudgets.length + activeUnpaidBills.length;
    // Dismissed alerts list
    const dismissedExceededBudgets = exceededBudgets.filter((b) => isAlertDismissed(`budget-${b.budget.id}`));
    const dismissedWarningBudgets = warningBudgets.filter((b) => isAlertDismissed(`budget-${b.budget.id}`));
    const dismissedUnpaidBills = unpaidUpcomingBills.filter((b) => isAlertDismissed(`bill-${b.id}`));
    const dismissedCount = dismissedExceededBudgets.length + dismissedWarningBudgets.length + dismissedUnpaidBills.length;
    return (<>
      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-emerald-600 flex items-center justify-center text-white shadow-sm">
              <Flame className="w-4 h-4 fill-current"/>
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">FinTrack Pro</h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                {t('app.tagline', 'Quản lý chi tiêu')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Real-time Multi-device Sync Button (Mobile) */}
            <button onClick={handleManualSync} disabled={isManualSyncing || serverSyncStatus === 'syncing'} className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 transition-colors cursor-pointer" aria-label={t('nav.syncLiveTooltip', 'Đồng bộ thời gian thực đa thiết bị (Nhấn để làm mới ngay)')} title={t('nav.syncLiveTooltip', 'Đồng bộ thời gian thực đa thiết bị (Nhấn để làm mới ngay)')}>
              <RefreshCw className={`w-4 h-4 ${isManualSyncing || serverSyncStatus === 'syncing'
            ? 'animate-spin text-emerald-500'
            : serverSyncStatus === 'synced'
                ? 'text-emerald-500'
                : 'text-amber-500'}`}/>
            </button>

            {/* Dark / Light Mode Toggle Button */}
            <button onClick={toggleTheme} className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 transition-colors" aria-label={isDarkMode ? t('app.themeLight', 'Chuyển sang chế độ Sáng') : t('app.themeDark', 'Chuyển sang chế độ Tối')} title={isDarkMode ? t('app.themeLight', 'Chuyển sang chế độ Sáng') : t('app.themeDark', 'Chuyển sang chế độ Tối')}>
              {isDarkMode ? (<Sun className="w-5 h-5 text-amber-400"/>) : (<Moon className="w-5 h-5 text-slate-600 dark:text-slate-300"/>)}
            </button>

            <button onClick={() => setShowNotificationModal(!showNotificationModal)} className="relative w-9 h-9 flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 transition-colors" aria-label={t('nav.notifications', 'Thông báo')}>
              <Bell className="w-5 h-5"/>
              {alertCount > 0 && (<span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {alertCount}
                </span>)}
            </button>

            {/* User Profile Avatar (Mobile) */}
            <button onClick={() => {
            setEditName(userProfile.name);
            setEditEmail(userProfile.email);
            setEditPhone(userProfile.phone || '');
            setEditAvatarColor(userProfile.avatarColor || '#10b981');
            setIsEditingProfile(false);
            setShowProfileModal(true);
        }} className="w-8 h-8 rounded-xl text-white flex items-center justify-center font-bold text-xs shadow-sm ml-0.5 cursor-pointer transition-transform active:scale-95" style={{ backgroundColor: userProfile.avatarColor || '#10b981' }} title={t('nav.personalInfo', 'Thông tin cá nhân')}>
              {userProfile.name ? userProfile.name.charAt(0).toUpperCase() : 'A'}
            </button>
          </div>
        </div>
      </header>

      {/* Desktop Top Header */}
      <header className="hidden lg:block sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-emerald-600 flex items-center justify-center text-white shadow-sm">
              <Flame className="w-5 h-5 fill-current"/>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white">
                  FinTrack Pro
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-200 dark:border-emerald-800">
                  {t('app.tagline', 'Quản lý chi tiêu')}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                {t('app.subtitle', 'Hệ thống tài chính cá nhân & Ngân sách thông minh')}
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-4 bg-slate-50 dark:bg-slate-800/80 px-4 py-1.5 rounded-full border border-slate-100 dark:border-slate-700/80 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 mr-1.5">
                {t('app.availableBalance', 'Số dư khả dụng:')}
              </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(financialSummary.availableBalance)}
              </span>
            </div>
            <div className="w-px h-3.5 bg-slate-300 dark:bg-slate-700"/>
            <div>
              <span className="text-slate-500 dark:text-slate-400 mr-1.5">
                {t('app.totalAssets', 'Tài sản ròng:')}
              </span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {formatCurrency(financialSummary.totalAssets)}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <button onClick={() => openQuickAdd('EXPENSE')} className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-sm font-semibold shadow-md shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer">
              <Plus className="w-4 h-4"/>
              <span>{t('app.quickAdd', 'Nhập nhanh')}</span>
            </button>

            {/* Language Switcher on Desktop Header */}
            <LanguageSwitcher />

            {/* Real-time Multi-device Sync Status & Button */}
            <button onClick={handleManualSync} disabled={isManualSyncing || serverSyncStatus === 'syncing'} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-600 dark:text-slate-300 active:scale-95 cursor-pointer" title={t('nav.syncLiveTooltip', 'Đồng bộ thời gian thực đa thiết bị (Nhấn để làm mới ngay)')}>
              <RefreshCw className={`w-3.5 h-3.5 ${isManualSyncing || serverSyncStatus === 'syncing'
            ? 'animate-spin text-emerald-500'
            : serverSyncStatus === 'synced'
                ? 'text-emerald-500'
                : 'text-amber-500'}`}/>
              <span className="hidden xl:inline text-[11px]">
                {serverSyncStatus === 'synced'
            ? t('settings.statusSynced', 'Đã đồng bộ')
            : serverSyncStatus === 'syncing' || isManualSyncing
                ? t('settings.statusSyncing', 'Đang lưu...')
                : t('settings.statusOffline', 'Ngoại tuyến')}
              </span>
            </button>

            {/* Dark / Light Mode Toggle Button */}
            <button onClick={toggleTheme} className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer" aria-label={isDarkMode ? t('app.themeLight', 'Chuyển sang chế độ Sáng') : t('app.themeDark', 'Chuyển sang chế độ Tối')} title={isDarkMode ? t('app.themeLight', 'Chuyển sang chế độ Sáng') : t('app.themeDark', 'Chuyển sang chế độ Tối')}>
              {isDarkMode ? (<Sun className="w-5 h-5 text-amber-400 animate-in spin-in-180 duration-300"/>) : (<Moon className="w-5 h-5 text-slate-600 dark:text-slate-300 animate-in spin-in-180 duration-300"/>)}
            </button>

            <div className="relative">
              <button onClick={() => setShowNotificationModal(!showNotificationModal)} className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl relative transition-colors cursor-pointer" aria-label={t('nav.notifications', 'Thông báo cảnh báo')}>
                <Bell className="w-5 h-5"/>
                {alertCount > 0 && (<span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                    {alertCount}
                  </span>)}
              </button>
            </div>

            <div className="relative">
              <button onClick={() => {
            setEditName(userProfile.name);
            setEditEmail(userProfile.email);
            setEditPhone(userProfile.phone || '');
            setEditAvatarColor(userProfile.avatarColor || '#10b981');
            setIsEditingProfile(false);
            setShowProfileModal(true);
        }} className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                <div className="w-8 h-8 rounded-full text-white flex items-center justify-center font-bold text-xs shadow-sm shrink-0" style={{ backgroundColor: userProfile.avatarColor || '#10b981' }}>
                  {userProfile.name ? userProfile.name.charAt(0).toUpperCase() : 'A'}
                </div>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 hidden lg:inline">
                  {userProfile.name}
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Desktop Tab Navigation */}
      <nav className="hidden lg:block bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex space-x-1 overflow-x-auto no-scrollbar py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (<button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}>
                <Icon className="w-4 h-4"/>
                <span>{t(item.key, item.defaultLabel)}</span>
              </button>);
        })}
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-2 pb-safe shadow-[0_-4px_20px_rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-around h-[64px]">
          {bottomNavItems.slice(0, 2).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (<button key={item.id} onClick={() => setActiveTab(item.id)} className="flex flex-col items-center justify-center flex-1 h-full min-w-0 cursor-pointer">
                <div className={`p-1.5 rounded-xl transition-colors ${isActive ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : 'text-slate-400 dark:text-slate-500'}`}>
                  <Icon className="w-5 h-5"/>
                </div>
                <span className={`text-[10px] font-medium mt-0.5 ${isActive ? 'text-emerald-700 dark:text-emerald-300 font-semibold' : 'text-slate-400 dark:text-slate-500'}`}>
                  {t(item.key, item.defaultLabel)}
                </span>
              </button>);
        })}

          {/* FAB */}
          <button onClick={() => openQuickAdd('EXPENSE')} className="flex-shrink-0 -mt-5 w-14 h-14 rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 flex items-center justify-center active:scale-90 transition-transform cursor-pointer" aria-label={t('app.quickAdd', 'Thêm giao dịch')}>
            <Plus className="w-7 h-7"/>
          </button>

          {bottomNavItems.slice(2).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (<button key={item.id} onClick={() => setActiveTab(item.id)} className="flex flex-col items-center justify-center flex-1 h-full min-w-0 cursor-pointer">
                <div className={`p-1.5 rounded-xl transition-colors ${isActive ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : 'text-slate-400 dark:text-slate-500'}`}>
                  <Icon className="w-5 h-5"/>
                </div>
                <span className={`text-[10px] font-medium mt-0.5 ${isActive ? 'text-emerald-700 dark:text-emerald-300 font-semibold' : 'text-slate-400 dark:text-slate-500'}`}>
                  {t(item.key, item.defaultLabel)}
                </span>
              </button>);
        })}
        </div>
      </nav>

      {/* Notification Dropdown (shared) */}
      {showNotificationModal && (<>
          {/* Backdrop for closing */}
          <div className="fixed inset-0 z-30" onClick={() => setShowNotificationModal(false)}/>

          <div className="fixed lg:absolute lg:right-8 lg:top-16 lg:w-[430px] inset-x-3 top-16 lg:top-auto lg:inset-x-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 z-40 max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-emerald-600 dark:text-emerald-400"/>
                <span>{t('notif.title', 'Trung tâm Cảnh báo')}</span>
              </h4>
              <div className="flex items-center space-x-2">
                {alertCount > 0 ? (<span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 px-2.5 py-0.5 rounded-full">
                    {alertCount} {t('notif.pendingTasks', 'việc cần xử lý')}
                  </span>) : (<span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Check className="w-3 h-3"/>
                    <span>{t('notif.allClear', 'Đã xử lý xong')}</span>
                  </span>)}
                {alertCount > 0 && (<button type="button" onClick={() => {
                    const allIds = [
                        ...activeExceededBudgets.map((b) => `budget-${b.budget.id}`),
                        ...activeWarningBudgets.map((b) => `budget-${b.budget.id}`),
                        ...activeUnpaidBills.map((b) => `bill-${b.id}`),
                    ];
                    dismissAllAlerts(allIds);
                }} className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 px-2 py-0.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer" title={t('notif.dismissAllTitle', 'Ẩn tất cả cảnh báo khỏi chuông thông báo')}>
                    {t('notif.dismissAll', 'Ẩn tất cả')}
                  </button>)}
                <button onClick={() => setShowNotificationModal(false)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                  <X className="w-4 h-4"/>
                </button>
              </div>
            </div>

            <div className="py-2.5 space-y-2.5 overflow-y-auto pr-0.5 max-h-[58vh]">
              {/* ACTIVE EXCEEDED BUDGETS */}
              {activeExceededBudgets.map((b) => (<div key={b.budget.id} onClick={() => {
                    navigateToBudget(b.budget.id);
                    setShowNotificationModal(false);
                }} className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 hover:border-rose-400 dark:hover:border-rose-700 hover:shadow-md transition-all cursor-pointer group">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                        <AlertTriangle className="w-4 h-4"/>
                      </div>
                      <div className="text-xs">
                        <p className="font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1">
                          <span>{t('nav.alertOverBudget', 'Vượt ngân sách')} {tCategory(b.budget.categoryName)}</span>
                        </p>
                        <p className="text-rose-600/90 dark:text-rose-400/90 mt-0.5 font-medium">
                          {t('dashboard.spent', 'Đã chi')} {formatCurrency(b.spent)} / {formatCurrency(b.budget.amount)} ({b.percentage}%)
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-rose-400 group-hover:translate-x-1 transition-transform shrink-0 mt-1"/>
                  </div>

                  {/* Quick Actions */}
                  <div className="mt-2.5 pt-2 border-t border-rose-200/60 dark:border-rose-900/50 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={(e) => {
                    e.stopPropagation();
                    navigateToCategoryTransactions(b.budget.categoryId);
                    setShowNotificationModal(false);
                }} className="px-2.5 py-1 bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-300 font-bold rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors shadow-2xs border border-rose-200 dark:border-rose-800 flex items-center gap-1 cursor-pointer">
                        <Search className="w-3 h-3"/>
                        <span>{t('notif.viewExpenses', 'Xem các khoản đã chi')}</span>
                      </button>

                      <button type="button" onClick={(e) => {
                    e.stopPropagation();
                    dismissAlert(`budget-${b.budget.id}`);
                }} className="px-2.5 py-1 bg-rose-100/70 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 hover:bg-rose-200 dark:hover:bg-rose-900/80 font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer" title={t('notif.dismissTip', 'Ẩn cảnh báo này khỏi chuông thông báo (vẫn giữ cảnh báo trong phần Ngân sách)')}>
                        <EyeOff className="w-3 h-3"/>
                        <span>{t('notif.dismiss', 'Ẩn')}</span>
                      </button>
                    </div>

                    <button type="button" onClick={(e) => {
                    e.stopPropagation();
                    navigateToBudget(b.budget.id);
                    setShowNotificationModal(false);
                }} className="text-rose-600 dark:text-rose-400 font-semibold hover:underline flex items-center gap-0.5 cursor-pointer">
                      <span>{t('nav.budgets', 'Ngân sách')}</span>
                      <ChevronRight className="w-3 h-3"/>
                    </button>
                  </div>
                </div>))}

              {/* ACTIVE WARNING BUDGETS (80%) */}
              {activeWarningBudgets.map((b) => (<div key={b.budget.id} onClick={() => {
                    navigateToBudget(b.budget.id);
                    setShowNotificationModal(false);
                }} className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 hover:border-amber-400 dark:hover:border-amber-700 hover:shadow-md transition-all cursor-pointer group">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                        <AlertTriangle className="w-4 h-4"/>
                      </div>
                      <div className="text-xs">
                        <p className="font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                          <span>{t('nav.alertNearBudget', 'Cảnh báo 80%:')} {tCategory(b.budget.categoryName)}</span>
                        </p>
                        <p className="text-amber-600/90 dark:text-amber-400/90 mt-0.5 font-medium">
                          {t('budget.usedBudget', 'Đã sử dụng')} {b.percentage}%. {t('budget.canSpend', 'Còn')} {formatCurrency(b.remaining)}.
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform shrink-0 mt-1"/>
                  </div>

                  {/* Quick Actions */}
                  <div className="mt-2.5 pt-2 border-t border-amber-200/60 dark:border-amber-900/50 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={(e) => {
                    e.stopPropagation();
                    navigateToCategoryTransactions(b.budget.categoryId);
                    setShowNotificationModal(false);
                }} className="px-2.5 py-1 bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 font-bold rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors shadow-2xs border border-amber-200 dark:border-amber-800 flex items-center gap-1 cursor-pointer">
                        <Search className="w-3 h-3"/>
                        <span>{t('notif.viewExpenses', 'Xem các khoản đã chi')}</span>
                      </button>

                      <button type="button" onClick={(e) => {
                    e.stopPropagation();
                    dismissAlert(`budget-${b.budget.id}`);
                }} className="px-2.5 py-1 bg-amber-100/70 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/80 font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer" title={t('notif.dismissTip', 'Ẩn cảnh báo này khỏi chuông thông báo (vẫn giữ cảnh báo trong phần Ngân sách)')}>
                        <EyeOff className="w-3 h-3"/>
                        <span>{t('notif.dismiss', 'Ẩn')}</span>
                      </button>
                    </div>

                    <button type="button" onClick={(e) => {
                    e.stopPropagation();
                    navigateToBudget(b.budget.id);
                    setShowNotificationModal(false);
                }} className="text-amber-600 dark:text-amber-400 font-semibold hover:underline flex items-center gap-0.5 cursor-pointer">
                      <span>{t('nav.budgets', 'Ngân sách')}</span>
                      <ChevronRight className="w-3 h-3"/>
                    </button>
                  </div>
                </div>))}

              {/* ACTIVE UNPAID UPCOMING BILLS */}
              {activeUnpaidBills.map((bill) => (<div key={bill.id} onClick={() => {
                    navigateToBill(bill.id, false);
                    setShowNotificationModal(false);
                }} className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 hover:border-blue-400 dark:hover:border-blue-700 hover:shadow-md transition-all cursor-pointer group">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                        <CalendarCheck className="w-4 h-4"/>
                      </div>
                      <div className="text-xs">
                        <p className="font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                          <span>{bill.name}</span>
                        </p>
                        <p className="text-blue-600/90 dark:text-blue-400/90 mt-0.5 font-medium">
                          {t('notif.dueDay', 'Hạn ngày')} {bill.dueDay} • {formatCurrency(bill.amount)}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-blue-400 group-hover:translate-x-1 transition-transform shrink-0 mt-1"/>
                  </div>

                  {/* Quick Actions */}
                  <div className="mt-2.5 pt-2 border-t border-blue-200/60 dark:border-blue-900/50 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={(e) => {
                    e.stopPropagation();
                    navigateToBill(bill.id, true);
                    setShowNotificationModal(false);
                }} className="px-3 py-1 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-2xs flex items-center gap-1 cursor-pointer">
                        <CreditCard className="w-3 h-3"/>
                        <span>{t('notif.payNow', 'Thanh toán ngay')}</span>
                      </button>

                      <button type="button" onClick={(e) => {
                    e.stopPropagation();
                    dismissAlert(`bill-${bill.id}`);
                }} className="px-2.5 py-1 bg-blue-100/70 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/80 font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer" title={t('notif.dismissTip', 'Ẩn cảnh báo này khỏi chuông thông báo')}>
                        <EyeOff className="w-3 h-3"/>
                        <span>{t('notif.dismiss', 'Ẩn')}</span>
                      </button>
                    </div>

                    <button type="button" onClick={(e) => {
                    e.stopPropagation();
                    navigateToBill(bill.id, false);
                    setShowNotificationModal(false);
                }} className="text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-0.5 cursor-pointer">
                      <span>{t('nav.bills', 'Định kỳ')}</span>
                      <ChevronRight className="w-3 h-3"/>
                    </button>
                  </div>
                </div>))}

              {/* EMPTY STATE */}
              {alertCount === 0 && (<div className="text-center py-6 px-2 text-slate-500 dark:text-slate-400">
                  <CheckCircle2 className="w-9 h-9 mx-auto text-emerald-500 dark:text-emerald-400 mb-2"/>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {t('notif.noAlerts', 'Tuyệt vời! Không có cảnh báo tài chính nào.')}
                  </p>
                  {dismissedCount > 0 && (<p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
                      {t('notif.hasDismissedHint', `Đang ẩn ${dismissedCount} cảnh báo khỏi chuông. Các mục vẫn hiển thị cảnh báo chi tiết trong trang Ngân sách.`).replace('{count}', String(dismissedCount))}
                    </p>)}
                </div>)}

              {/* DISMISSED ALERTS ACCORDION */}
              {dismissedCount > 0 && (<div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                  <button type="button" onClick={() => setShowDismissedSection((prev) => !prev)} className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 transition-colors cursor-pointer">
                    <span className="flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-slate-400"/>
                      <span>{t('notif.dismissedCount', 'Cảnh báo đã ẩn')} ({dismissedCount})</span>
                    </span>
                    <span className="text-[11px] text-blue-600 dark:text-blue-400 font-bold">
                      {showDismissedSection ? t('notif.hideDismissed', 'Thu gọn') : t('notif.showDismissed', 'Xem chi tiết')}
                    </span>
                  </button>

                  {showDismissedSection && (<div className="mt-2 space-y-2 max-h-[160px] overflow-y-auto pr-1 animate-in fade-in duration-150">
                      <div className="flex justify-end pb-1">
                        <button type="button" onClick={() => restoreAllAlerts()} className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer">
                          {t('notif.restoreAll', 'Khôi phục tất cả')}
                        </button>
                      </div>

                      {dismissedExceededBudgets.map((b) => (<div key={`dismissed-exceeded-${b.budget.id}`} className="p-2 rounded-lg bg-slate-100/70 dark:bg-slate-800/60 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"/>
                            <span className="truncate font-medium text-slate-700 dark:text-slate-300">
                              {tCategory(b.budget.categoryName)} ({b.percentage}%)
                            </span>
                          </div>
                          <button type="button" onClick={() => restoreAlert(`budget-${b.budget.id}`)} className="px-2 py-0.5 bg-white dark:bg-slate-700 text-[10px] font-bold text-blue-600 dark:text-blue-300 rounded shadow-2xs hover:bg-blue-50 dark:hover:bg-slate-600 transition-colors cursor-pointer shrink-0">
                            {t('notif.restore', 'Hiện lại')}
                          </button>
                        </div>))}

                      {dismissedWarningBudgets.map((b) => (<div key={`dismissed-warning-${b.budget.id}`} className="p-2 rounded-lg bg-slate-100/70 dark:bg-slate-800/60 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"/>
                            <span className="truncate font-medium text-slate-700 dark:text-slate-300">
                              {tCategory(b.budget.categoryName)} ({b.percentage}%)
                            </span>
                          </div>
                          <button type="button" onClick={() => restoreAlert(`budget-${b.budget.id}`)} className="px-2 py-0.5 bg-white dark:bg-slate-700 text-[10px] font-bold text-blue-600 dark:text-blue-300 rounded shadow-2xs hover:bg-blue-50 dark:hover:bg-slate-600 transition-colors cursor-pointer shrink-0">
                            {t('notif.restore', 'Hiện lại')}
                          </button>
                        </div>))}

                      {dismissedUnpaidBills.map((bill) => (<div key={`dismissed-bill-${bill.id}`} className="p-2 rounded-lg bg-slate-100/70 dark:bg-slate-800/60 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"/>
                            <span className="truncate font-medium text-slate-700 dark:text-slate-300">
                              {bill.name} ({formatCurrency(bill.amount)})
                            </span>
                          </div>
                          <button type="button" onClick={() => restoreAlert(`bill-${bill.id}`)} className="px-2 py-0.5 bg-white dark:bg-slate-700 text-[10px] font-bold text-blue-600 dark:text-blue-300 rounded shadow-2xs hover:bg-blue-50 dark:hover:bg-slate-600 transition-colors cursor-pointer shrink-0">
                            {t('notif.restore', 'Hiện lại')}
                          </button>
                        </div>))}
                    </div>)}
                </div>)}
            </div>

            {/* Footer tip */}
            <div className="pt-2.5 mt-1 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 text-center shrink-0">
              {t('nav.alertHint', '💡 Bấm trực tiếp vào cảnh báo để chuyển ngay đến mục tương ứng')}
            </div>
          </div>
        </>)}

      {/* Profile Modal */}
      {showProfileModal && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="fixed inset-0" onClick={() => {
                setShowProfileModal(false);
                setIsEditingProfile(false);
            }}/>
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  <User className="w-4 h-4"/>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {isEditingProfile ? t('nav.editProfile', 'Chỉnh sửa thông tin cá nhân') : t('nav.accountInfo', 'Thông tin tài khoản')}
                </h3>
              </div>
              <button onClick={() => {
                setShowProfileModal(false);
                setIsEditingProfile(false);
            }} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                <X className="w-4 h-4"/>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5">
              {!isEditingProfile ? (
            /* VIEW MODE */
            <div className="space-y-4">
                  {/* Hero card */}
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 p-4 text-center">
                    <div className="relative inline-block mx-auto mb-2">
                      <div className="w-16 h-16 rounded-2xl text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-emerald-500/20 mx-auto" style={{ backgroundColor: userProfile.avatarColor || '#10b981' }}>
                        {userProfile.name ? userProfile.name.charAt(0).toUpperCase() : 'A'}
                      </div>
                      <div className="absolute -bottom-1 -right-1 bg-amber-400 text-slate-950 p-1 rounded-full shadow-sm" title="VIP Member">
                        <Crown className="w-3.5 h-3.5"/>
                      </div>
                    </div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      {userProfile.name}
                    </h4>
                    <div className="flex items-center justify-center gap-2 mt-1 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <Shield className="w-3 h-3"/>
                        {userProfile.role}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        <Crown className="w-3 h-3"/>
                        {userProfile.membership}
                      </span>
                    </div>
                  </div>

                  {/* Profile info list */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3.5 space-y-2.5 border border-slate-100 dark:border-slate-800 text-xs">
                    <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400"/>
                        Email
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {userProfile.email}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400"/>
                        {t('nav.phone', 'Số điện thoại')}
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {userProfile.phone || t('nav.notSet', 'Chưa thiết lập')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-400"/>
                        {t('nav.joinedDate', 'Ngày tham gia')}
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {userProfile.joinedDate}
                      </span>
                    </div>
                  </div>

                  {/* Mini Stats */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{t('nav.activeWallets', 'Ví hoạt động')}</div>
                      <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                        {wallets.length}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{t('nav.transactionsCount', 'Giao dịch')}</div>
                      <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                        {transactions.length}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{t('nav.goalsCount', 'Mục tiêu')}</div>
                      <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                        {goals.length}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 space-y-2">
                    <button onClick={() => setIsEditingProfile(true)} className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-4 rounded-xl text-xs font-semibold shadow-sm shadow-emerald-600/20 transition-all cursor-pointer active:scale-95">
                      <Edit2 className="w-3.5 h-3.5"/>
                      <span>{t('nav.editProfileBtn', 'Chỉnh sửa thông tin cá nhân')}</span>
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => {
                    exportDatabaseJSON();
                }} className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors cursor-pointer">
                        <Download className="w-3.5 h-3.5"/>
                        <span>{t('nav.backupDataBtn', 'Sao lưu dữ liệu')}</span>
                      </button>
                      <button onClick={() => {
                    setShowProfileModal(false);
                    setActiveTab('settings');
                }} className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors cursor-pointer">
                        <Settings className="w-3.5 h-3.5"/>
                        <span>{t('nav.generalSettingsBtn', 'Cài đặt chung')}</span>
                      </button>
                    </div>
                  </div>
                </div>) : (
            /* EDIT MODE */
            <form onSubmit={(e) => {
                    e.preventDefault();
                    updateUserProfile({
                        name: editName.trim() || 'Admin',
                        email: editEmail.trim() || 'admin@fintrack.vn',
                        phone: editPhone.trim(),
                        avatarColor: editAvatarColor,
                    });
                    setIsEditingProfile(false);
                }} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      {t('nav.fullNameLabel', 'Họ và tên / Tên hiển thị')}
                    </label>
                    <input type="text" required value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" placeholder={t('nav.namePlaceholder', 'Ví dụ: Nguyễn Văn A')}/>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      {t('nav.emailLabel', 'Địa chỉ Email')}
                    </label>
                    <input type="email" required value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" placeholder="email@vidu.com"/>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      {t('nav.phoneLabel', 'Số điện thoại')}
                    </label>
                    <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" placeholder={t('nav.phonePlaceholder', 'Ví dụ: 0912 345 678')}/>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      {t('nav.avatarColorLabel', 'Màu đại diện')}
                    </label>
                    <div className="flex items-center gap-2.5">
                      {[
                    { color: '#10b981', label: 'Emerald' },
                    { color: '#3b82f6', label: 'Blue' },
                    { color: '#6366f1', label: 'Indigo' },
                    { color: '#8b5cf6', label: 'Purple' },
                    { color: '#f43f5e', label: 'Rose' },
                    { color: '#f59e0b', label: 'Amber' },
                ].map((item) => (<button key={item.color} type="button" onClick={() => setEditAvatarColor(item.color)} className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${editAvatarColor === item.color
                        ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white scale-110'
                        : 'opacity-80 hover:opacity-100 hover:scale-105'}`} style={{ backgroundColor: item.color }} title={item.label}>
                          {editAvatarColor === item.color && (<Check className="w-3.5 h-3.5 text-white stroke-[3]"/>)}
                        </button>))}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button type="button" onClick={() => setIsEditingProfile(false)} className="px-3.5 py-2 text-xs font-medium rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                      {t('common.cancel', 'Hủy')}
                    </button>
                    <button type="submit" className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20 transition-all cursor-pointer">
                      <Check className="w-3.5 h-3.5"/>
                      <span>{t('nav.saveProfileBtn', 'Lưu thông tin')}</span>
                    </button>
                  </div>
                </form>)}
            </div>
          </div>
        </div>)}
    </>);
};
