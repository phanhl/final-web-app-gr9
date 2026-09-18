'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRightLeft,
  ChevronRight,
  AlertTriangle,
  PiggyBank,
  Eye,
  Sparkles,
} from 'lucide-react';
import { formatCurrency, formatDate, calculateBudgetStatuses } from '@/lib/utils';
import { ReceiptModal } from './ReceiptModal';

export const DashboardView: React.FC = () => {
  const {
    financialSummary,
    transactions,
    budgets,
    bills,
    currentMonth,
    openQuickAdd,
    setActiveTab,
    t,
  } = useApp();
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const [showBalance, setShowBalance] = useState(true);

  const budgetStatuses = calculateBudgetStatuses(budgets, transactions, currentMonth);
  const exceededBudgets = budgetStatuses.filter((b) => b.status === 'EXCEEDED');
  const warningBudgets = budgetStatuses.filter((b) => b.status === 'WARNING');
  const unpaidBills = bills.filter((b) => b.status === 'UNPAID');

  const recentTransactions = transactions.slice(0, 6);

  const quickActions = [
    { label: t('dash.quickExpense', 'Chi phí'), icon: ArrowDownLeft, color: 'bg-rose-500', onClick: () => openQuickAdd('EXPENSE') },
    { label: t('dash.quickIncome', 'Thu nhập'), icon: ArrowUpRight, color: 'bg-emerald-500', onClick: () => openQuickAdd('INCOME') },
    { label: t('dash.quickTransfer', 'Chuyển ví'), icon: ArrowRightLeft, color: 'bg-sky-500', onClick: () => openQuickAdd('TRANSFER') },
    { label: t('dash.quickBudget', 'Ngân sách'), icon: PiggyBank, color: 'bg-amber-500', onClick: () => setActiveTab('budgets') },
  ];

  const hasAlerts = exceededBudgets.length > 0 || warningBudgets.length > 0 || unpaidBills.length > 0;

  return (
    <div className="space-y-5 pb-4">
      {/* Header: Khối tiêu đề với nền màu xanh dương nhạt tinh tế, rõ ràng */}
      <div className="flex items-center justify-between p-4 sm:p-5 rounded-2xl bg-sky-50/90 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-900/60 shadow-sm">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('dash.title', 'Tổng quan tài chính')}
          </h1>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-0.5">
            {t('dash.subtitle', 'Theo dõi dòng tiền & ngân sách thông minh')}
          </p>
        </div>

        <button
          onClick={() => setShowBalance((s) => !s)}
          className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-sky-200/80 dark:border-sky-800 text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white shadow-sm transition-colors cursor-pointer"
          aria-label={showBalance ? t('dash.hideBalance', 'Ẩn số dư') : t('dash.showBalance', 'Hiện số dư')}
          title={showBalance ? t('dash.hideBalance', 'Ẩn số dư') : t('dash.showBalance', 'Hiện số dư')}
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>

      {/* Balance Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg shadow-emerald-500/20 p-5">
        <div className="relative z-10">
          <p className="text-sm font-medium text-emerald-100">{t('dash.netAssets', 'Tổng tài sản ròng')}</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight">
              {showBalance ? formatCurrency(financialSummary.totalAssets) : '••••••'}
            </span>
          </div>
          <div className="mt-4 flex items-center gap-4 text-sm">
            <div>
              <p className="text-emerald-100 text-xs">{t('dash.available', 'Số dư khả dụng')}</p>
              <p className="font-bold">
                {showBalance ? formatCurrency(financialSummary.availableBalance) : '•••'}
              </p>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div>
              <p className="text-emerald-100 text-xs">{t('dash.savings', 'Tiết kiệm')}</p>
              <p className="font-bold">
                {showBalance ? formatCurrency(financialSummary.totalSavings) : '•••'}
              </p>
            </div>
          </div>
        </div>
        <div className="absolute -right-6 -bottom-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute right-10 top-0 w-20 h-20 rounded-full bg-white/10 blur-xl" />
      </div>

      {/* Income / Expense */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('dash.income', 'Thu nhập')}</span>
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-white truncate">
            {formatCurrency(financialSummary.monthlyIncome)}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('dash.expense', 'Chi tiêu')}</span>
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-white truncate">
            {formatCurrency(financialSummary.monthlyExpense)}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3">{t('dash.quickActions', 'Thao tác nhanh')}</h2>
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button key={action.label} onClick={action.onClick} className="flex flex-col items-center gap-2 group cursor-pointer">
                <div
                  className={`w-12 h-12 rounded-2xl ${action.color} text-white flex items-center justify-center shadow-md group-active:scale-90 transition-transform`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Alerts */}
      {hasAlerts && (
        <div className="space-y-2.5">
          {exceededBudgets.slice(0, 1).map((item) => (
            <button
              key={item.budget.id}
              onClick={() => setActiveTab('budgets')}
              className="w-full flex items-center gap-3 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 rounded-2xl text-left transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-rose-800 dark:text-rose-200">Vượt ngân sách {item.budget.categoryName}</p>
                <p className="text-xs text-rose-600/80 dark:text-rose-400 truncate">
                  Đã chi {formatCurrency(item.spent)} / {formatCurrency(item.budget.amount)}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-rose-300 dark:text-rose-500 shrink-0" />
            </button>
          ))}

          {warningBudgets.slice(0, 1).map((item) => (
            <button
              key={item.budget.id}
              onClick={() => setActiveTab('budgets')}
              className="w-full flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 rounded-2xl text-left transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-amber-800 dark:text-amber-200">Sắp vượt ngân sách {item.budget.categoryName}</p>
                <p className="text-xs text-amber-600/80 dark:text-amber-400 truncate">Đã sử dụng {item.percentage}%</p>
              </div>
              <ChevronRight className="w-4 h-4 text-amber-300 dark:text-amber-500 shrink-0" />
            </button>
          ))}

          {unpaidBills.length > 0 && (
            <button
              onClick={() => setActiveTab('bills')}
              className="w-full flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 rounded-2xl text-left transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                <Wallet className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-blue-800 dark:text-blue-200">{unpaidBills.length} hóa đơn sắp đến hạn</p>
                <p className="text-xs text-blue-600/80 dark:text-blue-400 truncate">
                  Tổng {formatCurrency(unpaidBills.reduce((s, b) => s + b.amount, 0))}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-blue-300 dark:text-blue-500 shrink-0" />
            </button>
          )}
        </div>
      )}

      {/* What-If Simulator Quick Entry */}
      <button
        onClick={() => setActiveTab('whatif')}
        className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent border border-indigo-200/80 dark:border-indigo-800/50 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group text-left shadow-sm"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              Mô phỏng tài chính What-If
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">Công cụ dự báo</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Kéo thanh trượt để dự báo tăng trưởng tài sản khi cắt giảm chi tiêu hoặc đầu tư thêm
            </p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
      </button>

      {/* Recent Transactions */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {t('dash.recentTransactions', 'Giao dịch gần đây')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('dash.subtitle', 'Các phát sinh mới nhất')}
            </p>
          </div>
          <button
            onClick={() => setActiveTab('transactions')}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>{t('dash.viewAll', 'Xem tất cả sổ GD')}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {recentTransactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  tx.type === 'EXPENSE'
                    ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                    : tx.type === 'INCOME'
                    ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                    : 'bg-sky-100 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400'
                }`}
              >
                {tx.type === 'EXPENSE' ? (
                  <ArrowDownLeft className="w-5 h-5" />
                ) : tx.type === 'INCOME' ? (
                  <ArrowUpRight className="w-5 h-5" />
                ) : (
                  <ArrowRightLeft className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {tx.type === 'TRANSFER' ? `Chuyển sang ${tx.toWalletName || 'Ví'}` : tx.categoryName || 'Khác'}
                  </p>
                  {tx.receiptImage && (
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded-full">Hóa đơn</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {formatDate(tx.date, 'full')} • {tx.walletName}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span
                  className={`text-sm font-bold ${
                    tx.type === 'EXPENSE' ? 'text-rose-600 dark:text-rose-400' : tx.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-sky-600 dark:text-sky-400'
                  }`}
                >
                  {tx.type === 'EXPENSE' ? '-' : tx.type === 'INCOME' ? '+' : ''}
                  {formatCurrency(tx.amount)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ReceiptModal
        isOpen={Boolean(selectedReceipt)}
        onClose={() => setSelectedReceipt(null)}
        imageUrl={selectedReceipt || undefined}
        title="Ảnh chụp chứng từ hóa đơn"
      />
    </div>
  );
};
