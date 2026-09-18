'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Transaction, TransactionType } from '@/types';
import {
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Calendar,
  Wallet,
  Tag,
  FileSpreadsheet,
  FileText,
  Plus,
  Edit2,
  Trash2,
  Eye,
  FileCheck,
  X,
  Upload,
  BarChart3,
  AlertTriangle,
} from 'lucide-react';
import { formatCurrency, formatDate, exportToCSV, exportToExcel, formatNumberWithDots } from '@/lib/utils';
import { POPULAR_TAGS } from '@/lib/mock-data';
import { ReceiptModal } from './ReceiptModal';
import { IconHelper } from './IconHelper';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const pieChartColors = ['#f97316', '#ec4899', '#8b5cf6', '#0ea5e9', '#eab308', '#10b981', '#64748b', '#ef4444'];

export const TransactionsView: React.FC = () => {
  const {
    transactions,
    wallets,
    categories,
    budgets,
    financialSummary,
    currentMonth,
    openQuickAdd,
    deleteTransaction,
    navTargetCategoryId,
    setNavTargetCategoryId,
  } = useApp();

  const [showCharts, setShowCharts] = useState(true);

  // Search & Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedWallet, setSelectedWallet] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Modals state
  const [receiptToView, setReceiptToView] = useState<string | null>(null);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [hoveredPieIndex, setHoveredPieIndex] = useState<number | null>(null);
  const [pieTimeScope, setPieTimeScope] = useState<'THIS_MONTH' | 'ALL'>('THIS_MONTH');

  // Auto-filter when navigated from Trung tâm Cảnh báo
  useEffect(() => {
    if (navTargetCategoryId) {
      setSelectedCategory(navTargetCategoryId);
      setSelectedType('EXPENSE');
      setSelectedWallet('ALL');
      setSelectedTag('ALL');
      setSearchTerm('');
      setStartDate('');
      setEndDate('');
    }
  }, [navTargetCategoryId]);

  // Filter logic
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Type
      if (selectedType !== 'ALL' && tx.type !== selectedType) return false;

      // Wallet
      if (selectedWallet !== 'ALL') {
        if (tx.walletId !== selectedWallet && tx.toWalletId !== selectedWallet) return false;
      }

      // Category
      if (selectedCategory !== 'ALL' && tx.categoryId !== selectedCategory) return false;

      // Tag
      if (selectedTag !== 'ALL' && (!tx.tags || !tx.tags.includes(selectedTag))) return false;

      // Date Range
      if (startDate) {
        const txDate = tx.date.split('T')[0];
        if (txDate < startDate) return false;
      }
      if (endDate) {
        const txDate = tx.date.split('T')[0];
        if (txDate > endDate) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchNote = tx.note?.toLowerCase().includes(term);
        const matchCat = tx.categoryName?.toLowerCase().includes(term);
        const matchWallet = tx.walletName?.toLowerCase().includes(term);
        const matchTags = (tx.tags || []).some((t) => t.toLowerCase().includes(term));
        if (!matchNote && !matchCat && !matchWallet && !matchTags) return false;
      }

      return true;
    });
  }, [transactions, selectedType, selectedWallet, selectedCategory, selectedTag, startDate, endDate, searchTerm]);

  // Aggregate statistics for filtered results
  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredTransactions.forEach((t) => {
      if (t.type === 'INCOME') income += t.amount;
      if (t.type === 'EXPENSE') expense += t.amount;
    });
    return {
      count: filteredTransactions.length,
      income,
      expense,
      net: income - expense,
    };
  }, [filteredTransactions]);

  // Bar chart & Pie chart data for TransactionsView
  const barChartData = useMemo(() => {
    const [y, m] = (currentMonth || '2026-09').split('-').map(Number);
    const monthList: string[] = [];
    for (let i = 2; i >= 0; i--) {
      const d = new Date(y || 2026, (m || 9) - 1 - i, 1);
      monthList.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return monthList.map((mo) => {
      const moTxs = transactions.filter((t) => t.date.startsWith(mo));
      const thu = moTxs.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
      const chi = moTxs.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
      return {
        month: `T${mo.slice(5)}`,
        Thu: thu,
        Chi: chi,
      };
    });
  }, [transactions, currentMonth]);

  const pieChartData = useMemo(() => {
    let expenseTxs = filteredTransactions.filter((t) => t.type === 'EXPENSE');
    if (pieTimeScope === 'THIS_MONTH' && !startDate && !endDate) {
      expenseTxs = expenseTxs.filter((t) => t.date.split('T')[0].startsWith(currentMonth));
    }
    const catMap: { [catName: string]: number } = {};
    expenseTxs.forEach((t) => {
      const cat = t.categoryName || 'Khác';
      catMap[cat] = (catMap[cat] || 0) + t.amount;
    });

    const list = Object.keys(catMap).map((catName) => {
      const matchedCat = categories.find((c) => c.name === catName);
      return {
        name: catName,
        value: catMap[catName],
        color: matchedCat?.color || '',
      };
    });

    // Sort descending by value (highest spending category first)
    list.sort((a, b) => b.value - a.value);

    return list.map((item, idx) => ({
      ...item,
      color: item.color || pieChartColors[idx % pieChartColors.length],
    }));
  }, [filteredTransactions, categories, pieTimeScope, startDate, endDate, currentMonth]);

  const totalPieExpense = useMemo(() => {
    return pieChartData.reduce((sum, item) => sum + item.value, 0);
  }, [pieChartData]);

  // Group by Date for Timeline View
  const groupedTransactions = useMemo(() => {
    const groups: { [dateKey: string]: Transaction[] } = {};
    filteredTransactions.forEach((tx) => {
      const dateKey = tx.date.split('T')[0];
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(tx);
    });

    // Sort dates descending
    const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    return sortedDates.map((dateKey) => {
      const dayTxs = groups[dateKey];
      const dayIncome = dayTxs.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
      const dayExpense = dayTxs.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
      return {
        dateKey,
        transactions: dayTxs,
        dayIncome,
        dayExpense,
        net: dayIncome - dayExpense,
      };
    });
  }, [filteredTransactions]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => (t.tags || []).forEach((tag) => set.add(tag)));
    return Array.from(set);
  }, [transactions]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedType('ALL');
    setSelectedWallet('ALL');
    setSelectedCategory('ALL');
    setSelectedTag('ALL');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters =
    searchTerm !== '' ||
    selectedType !== 'ALL' ||
    selectedWallet !== 'ALL' ||
    selectedCategory !== 'ALL' ||
    selectedTag !== 'ALL' ||
    startDate !== '' ||
    endDate !== '';

  return (
    <div className="space-y-6 pb-12">
      {/* 1. HEADER & ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
            Sổ Giao Dịch
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Theo dõi dòng tiền thu chi theo dòng thời gian (Timeline) với bộ lọc chuyên sâu
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setShowCharts((s) => !s)}
            className="flex items-center space-x-1.5 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold shadow-sm transition-colors"
            title="Ẩn hoặc hiện biểu đồ phân tích dòng tiền"
          >
            <BarChart3 className="w-4 h-4 text-indigo-500" />
            <span>{showCharts ? 'Ẩn biểu đồ' : 'Xem biểu đồ'}</span>
          </button>

          <button
            onClick={() => exportToCSV(filteredTransactions)}
            className="flex items-center space-x-1.5 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold shadow-sm transition-colors"
            title="Xuất danh sách sang file CSV UTF-8"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Xuất CSV</span>
          </button>

          <button
            onClick={() => exportToExcel(filteredTransactions, budgets, wallets, financialSummary)}
            className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
            title="Tải file Excel .xlsx đầy đủ dữ liệu"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Xuất Excel (.xlsx)</span>
          </button>

          <button
            onClick={() => openQuickAdd('EXPENSE')}
            className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Giao dịch mới</span>
          </button>
        </div>
      </div>

      {/* 2. STATS SUMMARY BAR OF FILTERED TRANSACTIONS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Số giao dịch</span>
          <p className="text-lg font-black text-slate-800 dark:text-white">{stats.count} GD</p>
        </div>
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Tổng khoản thu</span>
          <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">
            +{formatCurrency(stats.income)}
          </p>
        </div>
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Tổng khoản chi</span>
          <p className="text-lg font-black text-rose-600 dark:text-rose-400">
            -{formatCurrency(stats.expense)}
          </p>
        </div>
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Dòng tiền chênh lệch</span>
          <p
            className={`text-lg font-black ${
              stats.net >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {stats.net >= 0 ? '+' : ''}
            {formatCurrency(stats.net)}
          </p>
        </div>
      </div>

      {/* 2.5. CHARTS: THU - CHI & PHÂN BỔ CHI TIÊU TRONG SỔ GIAO DỊCH */}
      {showCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Bar Chart: Thu - Chi */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Dòng tiền Thu - Chi</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">So sánh thu nhập và chi tiêu 3 tháng gần nhất</p>
              </div>
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} dy={8} />
                  <YAxis
                    tickFormatter={(val) => `${val / 1000000}Tr`}
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip
                    formatter={(val: any) => formatCurrency(Number(val))}
                    contentStyle={{
                      borderRadius: 12,
                      border: 'none',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      backgroundColor: '#1e293b',
                      color: '#fff',
                    }}
                  />
                  <Bar dataKey="Thu" fill="#10b981" radius={[6, 6, 0, 0]} name="Thu nhập" />
                  <Bar dataKey="Chi" fill="#f43f5e" radius={[6, 6, 0, 0]} name="Chi tiêu" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart: Chi tiêu theo danh mục */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Chi tiêu theo danh mục</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Phân bổ tỷ trọng chi tiêu</p>
              </div>
              {totalPieExpense > 0 && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40">
                  {formatCurrency(totalPieExpense)}
                </span>
              )}
            </div>

            {/* Quick Scope Toggle: Tháng này vs Tất cả */}
            <div className="flex items-center justify-between my-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-400 font-medium">Kỳ thống kê:</span>
              <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setPieTimeScope('THIS_MONTH')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    pieTimeScope === 'THIS_MONTH'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Tháng này ({currentMonth.slice(5)}/{currentMonth.slice(0, 4)})
                </button>
                <button
                  type="button"
                  onClick={() => setPieTimeScope('ALL')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    pieTimeScope === 'ALL'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Tất cả
                </button>
              </div>
            </div>

            {pieChartData.length > 0 ? (
              <>
                {/* Donut Chart with Center Interactive Metrics */}
                <div className="relative h-44 w-full flex items-center justify-center my-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={2.5}
                        dataKey="value"
                        onMouseEnter={(_, index) => setHoveredPieIndex(index)}
                        onMouseLeave={() => setHoveredPieIndex(null)}
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            stroke={hoveredPieIndex === index ? '#ffffff' : 'transparent'}
                            strokeWidth={hoveredPieIndex === index ? 2 : 0}
                            style={{
                              transform: hoveredPieIndex === index ? 'scale(1.04)' : 'scale(1)',
                              transformOrigin: 'center center',
                              transition: 'all 0.2s ease',
                              cursor: 'pointer',
                            }}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            const percent = totalPieExpense > 0 ? ((data.value / totalPieExpense) * 100).toFixed(1) : '0';
                            return (
                              <div className="bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white text-xs px-3 py-2 rounded-xl shadow-xl border border-slate-700/60 pointer-events-none z-50">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
                                  <span className="font-bold text-white">{data.name}</span>
                                </div>
                                <div className="flex items-center justify-between gap-3 text-slate-300">
                                  <span className="font-semibold text-white">{formatCurrency(data.value)}</span>
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-emerald-300">
                                    {percent}%
                                  </span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Center of the Donut */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
                    {hoveredPieIndex !== null && pieChartData[hoveredPieIndex] ? (
                      <div className="animate-in fade-in zoom-in-90 duration-150">
                        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate max-w-[85px] mx-auto">
                          {pieChartData[hoveredPieIndex].name}
                        </p>
                        <p className="text-base font-black text-slate-900 dark:text-white leading-tight">
                          {totalPieExpense > 0
                            ? ((pieChartData[hoveredPieIndex].value / totalPieExpense) * 100).toFixed(1)
                            : 0}%
                        </p>
                        <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                          {formatCurrency(pieChartData[hoveredPieIndex].value)}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                          Tổng chi
                        </p>
                        <p className="text-sm font-black text-slate-900 dark:text-white leading-tight mt-0.5">
                          {formatCurrency(totalPieExpense)}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                          {pieChartData.length} danh mục
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Category Breakdown List with Percentage & Sleek Progress Bars */}
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 mt-1 scrollbar-thin [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700">
                  {pieChartData.map((entry, idx) => {
                    const percent = totalPieExpense > 0 ? ((entry.value / totalPieExpense) * 100).toFixed(1) : '0';
                    const isHovered = hoveredPieIndex === idx;
                    return (
                      <div
                        key={entry.name}
                        onMouseEnter={() => setHoveredPieIndex(idx)}
                        onMouseLeave={() => setHoveredPieIndex(null)}
                        className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                          isHovered
                            ? 'bg-slate-100 dark:bg-slate-800 scale-[1.01]'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-white dark:ring-slate-900"
                              style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-slate-700 dark:text-slate-300 font-medium truncate">
                              {entry.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {percent}%
                            </span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {formatCurrency(entry.value)}
                            </span>
                          </div>
                        </div>
                        {/* Mini progress bar */}
                        <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${percent}%`,
                              backgroundColor: entry.color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-xs text-slate-400">
                <BarChart3 className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-2 stroke-[1.5]" />
                <p>Không có dữ liệu chi tiêu phù hợp</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2.8 NOTIFICATION DEEP-LINK BANNER */}
      {navTargetCategoryId && selectedCategory === navTargetCategoryId && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl text-xs text-rose-700 dark:text-rose-300 shadow-xs gap-3 animate-in fade-in duration-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <p className="font-bold text-sm text-rose-800 dark:text-rose-200">
                Đang xem chi tiết chi tiêu: {categories.find((c) => c.id === navTargetCategoryId)?.name || 'Cảnh báo'}
              </p>
              <p className="text-rose-600/90 dark:text-rose-400/90 mt-0.5">
                Danh sách giao dịch bên dưới đã được tự động lọc theo danh mục này từ <b>Trung tâm Cảnh báo</b>.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setSelectedCategory('ALL');
              setNavTargetCategoryId(null);
            }}
            className="px-3.5 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl font-bold shadow-xs text-xs border border-slate-200 dark:border-slate-700 cursor-pointer self-start sm:self-auto shrink-0 transition-colors"
          >
            Xem tất cả giao dịch
          </button>
        </div>
      )}

      {/* 3. ADVANCED FILTER BAR */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            <Filter className="w-4 h-4 text-blue-500" />
            <span>Bộ lọc nâng cao</span>
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center space-x-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Xóa bộ lọc</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* Keyword search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo ghi chú..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">Tất cả loại giao dịch</option>
              <option value="EXPENSE">Khoản chi</option>
              <option value="INCOME">Khoản thu</option>
              <option value="TRANSFER">Chuyển khoản</option>
            </select>
          </div>

          {/* Wallet Filter */}
          <div>
            <select
              value={selectedWallet}
              onChange={(e) => setSelectedWallet(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">Tất cả ví & tài khoản</option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">Tất cả danh mục</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type === 'INCOME' ? 'Thu' : 'Chi'})
                </option>
              ))}
            </select>
          </div>

          {/* From date */}
          <div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              title="Từ ngày"
            />
          </div>

          {/* To date */}
          <div>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              title="Đến ngày"
            />
          </div>
        </div>

        {/* Tag Pills */}
        {allTags.length > 0 && (
          <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar pt-1">
            <span className="text-[11px] font-semibold text-slate-400 shrink-0">Nhãn:</span>
            <button
              onClick={() => setSelectedTag('ALL')}
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium shrink-0 transition-colors ${
                selectedTag === 'ALL'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              Tất cả
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium shrink-0 transition-colors ${
                  selectedTag === tag
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 4. TIMELINE LIST */}
      <div className="space-y-6">
        {groupedTransactions.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
            <Calendar className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-1">
              Không tìm thấy giao dịch nào
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Thử thay đổi bộ lọc hoặc thêm một giao dịch thu chi mới
            </p>
            <button
              onClick={() => openQuickAdd('EXPENSE')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl"
            >
              + Ghi nhận giao dịch ngay
            </button>
          </div>
        ) : (
          groupedTransactions.map((group) => (
            <div
              key={group.dateKey}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
            >
              {/* Day Header */}
              <div className="px-5 py-3.5 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-sm text-slate-800 dark:text-white">
                    {formatDate(group.dateKey, 'dateOnly')}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    ({group.transactions.length} giao dịch)
                  </span>
                </div>
                <div className="flex items-center space-x-3 text-xs">
                  {group.dayIncome > 0 && (
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      +{formatCurrency(group.dayIncome)}
                    </span>
                  )}
                  {group.dayExpense > 0 && (
                    <span className="font-semibold text-rose-600 dark:text-rose-400">
                      -{formatCurrency(group.dayExpense)}
                    </span>
                  )}
                </div>
              </div>

              {/* Transactions on this day */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {group.transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors flex items-center justify-between group"
                  >
                    {/* Left: Icon & Info */}
                    <div className="flex items-center space-x-3.5 truncate">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          tx.type === 'EXPENSE'
                            ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                            : tx.type === 'INCOME'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                            : 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
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

                      <div className="truncate">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                            {tx.type === 'TRANSFER'
                              ? `Chuyển sang: ${tx.toWalletName || 'Ví'}`
                              : tx.categoryName || 'Khác'}
                          </span>

                          {/* Receipt Badge */}
                          {tx.receiptImage && (
                            <button
                              onClick={() => setReceiptToView(tx.receiptImage || null)}
                              className="flex items-center space-x-1 px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded text-[10px] font-bold hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
                              title="Bấm để xem ảnh hóa đơn"
                            >
                              <FileCheck className="w-3 h-3" />
                              <span>Hóa đơn</span>
                            </button>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          <span>{formatDate(tx.date, 'time')}</span>
                          <span>•</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {tx.walletName}
                          </span>
                          {tx.note && (
                            <>
                              <span>•</span>
                              <span className="text-slate-600 dark:text-slate-400 italic truncate max-w-xs">
                                &quot;{tx.note}&quot;
                              </span>
                            </>
                          )}
                        </div>

                        {/* Tags */}
                        {tx.tags && tx.tags.length > 0 && (
                          <div className="flex items-center space-x-1 mt-1">
                            {tx.tags.map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-0.2 text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Amount & Actions */}
                    <div className="flex items-center space-x-4 shrink-0 ml-3">
                      <div className="text-right">
                        <span
                          className={`text-base font-black ${
                            tx.type === 'EXPENSE'
                              ? 'text-rose-600 dark:text-rose-400'
                              : tx.type === 'INCOME'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-blue-600 dark:text-blue-400'
                          }`}
                        >
                          {tx.type === 'EXPENSE' ? '-' : tx.type === 'INCOME' ? '+' : ''}
                          {formatCurrency(tx.amount)}
                        </span>
                        {tx.type === 'TRANSFER' && tx.fee && tx.fee > 0 && (
                          <p className="text-[10px] text-slate-400">Phí: {formatCurrency(tx.fee)}</p>
                        )}
                      </div>

                      {/* Edit / Delete Buttons */}
                      <div className="flex items-center space-x-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setTransactionToEdit(tx)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
                          title="Chỉnh sửa giao dịch"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Xác nhận xóa giao dịch này? Số dư ví sẽ được tự động hoàn lại.')) {
                              deleteTransaction(tx.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                          title="Xóa giao dịch"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modals */}
      <ReceiptModal
        isOpen={Boolean(receiptToView)}
        onClose={() => setReceiptToView(null)}
        imageUrl={receiptToView || undefined}
        title="Chi tiết ảnh hóa đơn đính kèm"
      />

      <EditTransactionModal
        isOpen={Boolean(transactionToEdit)}
        onClose={() => setTransactionToEdit(null)}
        transaction={transactionToEdit}
      />
    </div>
  );
};

interface EditTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
}

const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  isOpen,
  onClose,
  transaction,
}) => {
  const { wallets, categories, editTransaction, deleteTransaction } = useApp();

  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [amount, setAmount] = useState<number>(0);
  const [categoryId, setCategoryId] = useState<string>('');
  const [walletId, setWalletId] = useState<string>('');
  const [toWalletId, setToWalletId] = useState<string>('');
  const [fee, setFee] = useState<number>(0);
  const [date, setDate] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [receiptImage, setReceiptImage] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setAmount(transaction.amount);
      setCategoryId(transaction.categoryId || '');
      setWalletId(transaction.walletId || (wallets[0]?.id ?? ''));
      setToWalletId(transaction.toWalletId || '');
      setFee(transaction.fee || 0);
      setDate(transaction.date ? transaction.date.slice(0, 16) : new Date().toISOString().slice(0, 16));
      setNote(transaction.note || '');
      setTags(transaction.tags || []);
      setReceiptImage(transaction.receiptImage);
    }
  }, [transaction, wallets]);

  if (!isOpen || !transaction) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTagToggle = (tag: string) => {
    if (tags.includes(tag)) {
      setTags(tags.filter((t) => t !== tag));
    } else {
      setTags([...tags, tag]);
    }
  };

  const handleSave = () => {
    if (!amount || amount <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ');
      return;
    }

    const selectedWallet = wallets.find((w) => w.id === walletId);
    const selectedToWallet = wallets.find((w) => w.id === toWalletId);
    const selectedCategory = categories.find((c) => c.id === categoryId);

    const success = editTransaction(transaction.id, {
      type,
      amount: Number(amount),
      categoryId: type === 'TRANSFER' ? undefined : categoryId,
      categoryName: type === 'TRANSFER' ? undefined : (selectedCategory?.name || 'Khác'),
      walletId,
      walletName: selectedWallet?.name,
      toWalletId: type === 'TRANSFER' ? toWalletId : undefined,
      toWalletName: type === 'TRANSFER' ? selectedToWallet?.name : undefined,
      fee: type === 'TRANSFER' ? Number(fee) : 0,
      date: new Date(date).toISOString(),
      note,
      tags,
      receiptImage,
    });

    if (success) {
      onClose();
    }
  };

  const handleDelete = () => {
    if (confirm('Bạn có chắc chắn muốn xóa giao dịch này? Số dư ví sẽ được tự động hoàn tác.')) {
      deleteTransaction(transaction.id);
      onClose();
    }
  };

  const filteredCategories = categories.filter((c) => c.type === (type === 'INCOME' ? 'INCOME' : 'EXPENSE'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative max-w-xl w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Chỉnh sửa Giao dịch</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Type Selector */}
          <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-xl">
            <button
              type="button"
              onClick={() => setType('EXPENSE')}
              className={`py-2 text-sm font-semibold rounded-lg transition-all ${
                type === 'EXPENSE'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Khoản chi
            </button>
            <button
              type="button"
              onClick={() => setType('INCOME')}
              className={`py-2 text-sm font-semibold rounded-lg transition-all ${
                type === 'INCOME'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Khoản thu
            </button>
            <button
              type="button"
              onClick={() => setType('TRANSFER')}
              className={`py-2 text-sm font-semibold rounded-lg transition-all ${
                type === 'TRANSFER'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Chuyển khoản
            </button>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Số tiền (VNĐ)
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={amount ? formatNumberWithDots(amount) : ''}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, '');
                  if (cleaned.length <= 18) {
                    setAmount(cleaned ? Number(cleaned) : 0);
                  }
                }}
                onKeyDown={(e) => {
                  if (['e', 'E', '+', '-', '.', ','].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
                placeholder="0"
                className="w-full text-2xl font-bold pl-4 pr-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold pointer-events-none">₫</span>
            </div>
          </div>

          {/* Wallet */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                {type === 'TRANSFER' ? 'Từ ví / tài khoản' : 'Ví thanh toán'}
              </label>
              <select
                value={walletId}
                onChange={(e) => setWalletId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({new Intl.NumberFormat('vi-VN').format(w.balance)} ₫)
                  </option>
                ))}
              </select>
            </div>

            {type === 'TRANSFER' ? (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Đến ví / tài khoản
                </label>
                <select
                  value={toWalletId}
                  onChange={(e) => setToWalletId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                >
                  <option value="">-- Chọn ví đích --</option>
                  {wallets
                    .filter((w) => w.id !== walletId)
                    .map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Danh mục
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                >
                  <option value="">-- Chọn danh mục --</option>
                  {filteredCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Date & Time */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Thời gian giao dịch
            </label>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Ghi chú
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Nhập ghi chú chi tiết..."
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Nhãn (Tags)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagToggle(tag)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    tags.includes(tag)
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>

          {/* Receipt Image */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Ảnh hóa đơn / chứng từ
            </label>
            {receiptImage ? (
              <div className="relative inline-block border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={receiptImage} alt="Hóa đơn" className="h-32 object-contain bg-slate-100 dark:bg-slate-800" />
                <button
                  type="button"
                  onClick={() => setReceiptImage(undefined)}
                  className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors shadow"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer hover:border-blue-500 transition-colors">
                <Upload className="w-6 h-6 text-slate-400 mb-1" />
                <span className="text-xs text-slate-500 dark:text-slate-400">Tải ảnh hóa đơn lên</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center space-x-1.5 px-4 py-2.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl font-medium text-sm transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Xóa giao dịch</span>
          </button>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl font-medium text-sm transition-colors"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm transition-colors shadow-sm"
            >
              Lưu thay đổi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
