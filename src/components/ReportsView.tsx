'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import {
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  Download,
  Calendar,
  FileSpreadsheet,
  FileText,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
} from 'lucide-react';
import {
  formatCurrency,
  formatDate,
  exportToCSV,
  exportToExcel,
} from '@/lib/utils';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { IconHelper } from './IconHelper';

const pieChartColors = ['#f97316', '#ec4899', '#8b5cf6', '#0ea5e9', '#eab308', '#10b981', '#64748b', '#ef4444'];

export const ReportsView: React.FC = () => {
  const { transactions, budgets, wallets, financialSummary, currentMonth, categories,
    t,
    tCategory,
    tWalletType,
    language,
  } = useApp();

  const [period, setPeriod] = useState<'THIS_MONTH' | 'LAST_MONTH' | 'THIS_YEAR' | 'CUSTOM'>('THIS_MONTH');
  const [customStart, setCustomStart] = useState(`${currentMonth}-01`);
  const [customEnd, setCustomEnd] = useState(`${currentMonth}-31`);
  const [hoveredPieIndex, setHoveredPieIndex] = useState<number | null>(null);

  // Filter transactions according to selected period
  const filteredTxs = useMemo(() => {
    return transactions.filter((tx) => {
      const txDate = tx.date.split('T')[0];
      if (period === 'THIS_MONTH') {
        return txDate.startsWith(currentMonth);
      }
      if (period === 'LAST_MONTH') {
        const [y, m] = currentMonth.split('-').map(Number);
        const lastMonthDate = new Date(y || 2026, (m || 9) - 2, 1);
        const lastMonthStr = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;
        return txDate.startsWith(lastMonthStr);
      }
      if (period === 'THIS_YEAR') {
        const yearStr = currentMonth.split('-')[0] || '2026';
        return txDate.startsWith(yearStr);
      }
      if (period === 'CUSTOM') {
        if (customStart && txDate < customStart) return false;
        if (customEnd && txDate > customEnd) return false;
        return true;
      }
      return true;
    });
  }, [transactions, period, currentMonth, customStart, customEnd]);

  // Aggregate totals
  const totalIncome = useMemo(
    () => filteredTxs.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0),
    [filteredTxs]
  );
  const totalExpense = useMemo(
    () => filteredTxs.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0),
    [filteredTxs]
  );
  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.max(0, Math.round((netSavings / totalIncome) * 100)) : 0;

  // Pie chart: Category Breakdown (matching TransactionsView)
  const categoryBreakdown = useMemo(() => {
    const expenseTxs = filteredTxs.filter((t) => t.type === 'EXPENSE');
    const catMap: { [name: string]: { total: number; count: number } } = {};

    expenseTxs.forEach((t) => {
      const name = t.categoryName || tCategory('Khác');
      if (!catMap[name]) catMap[name] = { total: 0, count: 0 };
      catMap[name].total += t.amount;
      catMap[name].count += 1;
    });

    const list = Object.keys(catMap).map((name) => {
      const matchedCat = categories.find((c) => c.name === name);
      return {
        name,
        value: catMap[name].total,
        count: catMap[name].count,
        percentage: totalExpense > 0 ? Math.round((catMap[name].total / totalExpense) * 1000) / 10 : 0,
        color: matchedCat?.color || '',
      };
    });

    // Sort descending by value (highest spending category first)
    list.sort((a, b) => b.value - a.value);

    return list.map((item, idx) => ({
      ...item,
      color: item.color || pieChartColors[idx % pieChartColors.length],
    }));
  }, [filteredTxs, categories, totalExpense]);

  // Bar chart: Income vs Expense over time
  const monthlyComparisonData = useMemo(() => {
    const months = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09'];
    return months.map((m) => {
      const monthTxs = transactions.filter((t) => t.date.startsWith(m));
      const inc = monthTxs.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
      const exp = monthTxs.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
      return {
        month: `T${m.slice(5)}`,
        Thu: inc || (m === '2026-05' ? 28000000 : m === '2026-06' ? 31000000 : m === '2026-07' ? 32000000 : 0),
        Chi: exp || (m === '2026-05' ? 12000000 : m === '2026-06' ? 13500000 : m === '2026-07' ? 14500000 : 0),
      };
    });
  }, [transactions]);

  // Cash flow trend line/area
  const cashflowTrendData = useMemo(() => {
    let runningBalance = 160000000; // Base net worth
    return monthlyComparisonData.map((d) => {
      const diff = d.Thu - d.Chi;
      runningBalance += diff;
      return {
        month: d.month,
        [t('reports.netCashflow', 'Dòng tiền thuần')]: diff,
        [t('reports.accumulated', 'Tổng tích lũy')]: runningBalance,
      };
    });
  }, [monthlyComparisonData]);

  return (
    <div className="space-y-6 pb-12 print:p-0 print:m-0">
      {/* 1. HEADER & PERIOD SELECTOR */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
            {t('rep.reportTitle', 'Báo Cáo & Phân Tích Chuyên Sâu')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('rep.reportSubtitle', 'Biểu đồ tròn cơ cấu chi tiêu, so sánh Thu - Chi theo thời gian, phân tích xu hướng dòng tiền & xuất báo cáo')}
          </p>
        </div>

        {/* Action buttons: Excel, CSV, PDF/Print */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportToCSV(filteredTxs)}
            className="flex items-center space-x-1.5 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold shadow-sm transition-colors"
          >
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>{t('rep.exportCSV', 'Xuất CSV')}</span>
          </button>

          <button
            onClick={() => exportToExcel(filteredTxs, budgets, wallets, financialSummary)}
            className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{t('rep.exportExcel', 'Xuất Excel (.xlsx)')}</span>
          </button>
        </div>
      </div>

      {/* 2. TIME PERIOD FILTER BUTTONS */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 mr-2">{t('rep.timePeriod', 'Khoảng thời gian:')}</span>
          <button
            onClick={() => setPeriod('THIS_MONTH')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              period === 'THIS_MONTH'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            {t('rep.thisMonthPeriod', 'Tháng này')} (09/2026)
          </button>

          <button
            onClick={() => setPeriod('LAST_MONTH')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              period === 'LAST_MONTH'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            {t('rep.lastMonthPeriod', 'Tháng trước')} (08/2026)
          </button>

          <button
            onClick={() => setPeriod('THIS_YEAR')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              period === 'THIS_YEAR'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            {t('rep.thisYearPeriod', 'Cả năm')} 2026
          </button>

          <button
            onClick={() => setPeriod('CUSTOM')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              period === 'CUSTOM'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            {t('rep.customPeriod', 'Tùy chọn ngày')}
          </button>
        </div>

        {period === 'CUSTOM' && (
          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            />
            <span className="text-xs text-slate-400">{t('rep.to', 'đến')}</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            />
          </div>
        )}
      </div>

      {/* 3. EXECUTIVE SUMMARY BANNER (PRINT-FRIENDLY) */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm print:border-none print:shadow-none">
        <div className="hidden print:block pb-4 mb-4 border-b">
          <h2 className="text-xl font-bold text-slate-900">{t('rep.execSummary', 'BÁO CÁO TỔNG HỢP TÀI CHÍNH CHI TIÊU')}</h2>
          <p className="text-xs text-slate-500">
            {t('rep.reportPeriod', 'Kỳ báo cáo:')} {period === 'THIS_MONTH' ? 'Tháng 09/2026' : period === 'LAST_MONTH' ? 'Tháng 08/2026' : 'Năm 2026'} • {t('rep.createdAt', 'Tạo ngày:')} {formatDate(new Date().toISOString(), 'full')}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">{t('rep.totalIncome', 'Tổng thu nhập')}</span>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              +{formatCurrency(totalIncome)}
            </p>
            <span className="text-[11px] text-slate-400">{filteredTxs.filter((t) => t.type === 'INCOME').length} {t('rep.incomeCount', 'khoản thu')}</span>
          </div>

          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">{t('rep.totalExpense', 'Tổng chi tiêu')}</span>
            <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
              -{formatCurrency(totalExpense)}
            </p>
            <span className="text-[11px] text-slate-400">{filteredTxs.filter((t) => t.type === 'EXPENSE').length} {t('rep.expenseCount', 'khoản chi')}</span>
          </div>

          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">{t('rep.netSurplus', 'Thặng dư / Tích lũy')}</span>
            <p
              className={`text-xl font-black mt-1 ${
                netSavings >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {netSavings >= 0 ? '+' : ''}
              {formatCurrency(netSavings)}
            </p>
            <span className="text-[11px] text-slate-400">{t('rep.netCashflow', 'Dòng tiền ròng')}</span>
          </div>

          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">{t('rep.savingsRate', 'Tỷ lệ tích lũy')}</span>
            <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
              {savingsRate}%
            </p>
            <span className="text-[11px] text-slate-400">{t('rep.ofTotalIncome', 'Trên tổng thu nhập')}</span>
          </div>
        </div>
      </div>

      {/* 4. CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:block print:space-y-6">
        {/* Chart 1: Expense breakdown donut chart */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center space-x-2">
                  <PieChartIcon className="w-5 h-5 text-purple-500" />
                  <span>{t('rep.structureByCategory', 'Cơ cấu chi tiêu theo Danh mục')}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('rep.structureSubtitle', 'Phân bổ tỷ trọng % các nhóm chi tiêu trong kỳ')}
                </p>
              </div>
              {totalExpense > 0 && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40">
                  {formatCurrency(totalExpense)}
                </span>
              )}
            </div>

            {categoryBreakdown.length > 0 ? (
              <>
                {/* Donut Chart with Center Interactive Metrics */}
                <div className="relative h-56 w-full flex items-center justify-center my-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={58}
                        outerRadius={82}
                        paddingAngle={2.5}
                        dataKey="value"
                        onMouseEnter={(_, index) => setHoveredPieIndex(index)}
                        onMouseLeave={() => setHoveredPieIndex(null)}
                      >
                        {categoryBreakdown.map((entry, index) => (
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
                            const percent = totalExpense > 0 ? ((data.value / totalExpense) * 100).toFixed(1) : '0';
                            return (
                              <div className="bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white text-xs px-3 py-2 rounded-xl shadow-xl border border-slate-700/60 pointer-events-none z-50">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
                                  <span className="font-bold text-white">{tCategory(data.name)}</span>
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
                    {hoveredPieIndex !== null && categoryBreakdown[hoveredPieIndex] ? (
                      <div className="animate-in fade-in zoom-in-90 duration-150">
                        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate max-w-[100px] mx-auto">
                          {tCategory(categoryBreakdown[hoveredPieIndex].name)}
                        </p>
                        <p className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                          {totalExpense > 0
                            ? ((categoryBreakdown[hoveredPieIndex].value / totalExpense) * 100).toFixed(1)
                            : 0}%
                        </p>
                        <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                          {formatCurrency(categoryBreakdown[hoveredPieIndex].value)}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                          {t('reports.totalExpense', 'Tổng chi')}
                        </p>
                        <p className="text-base font-black text-slate-900 dark:text-white leading-tight mt-0.5">
                          {formatCurrency(totalExpense)}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                          {categoryBreakdown.length} {t('reports.categories', 'danh mục')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Category Breakdown List with Percentage & Sleek Progress Bars (same as TransactionsView) */}
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1 mt-2 scrollbar-thin [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700">
                  {categoryBreakdown.map((entry, idx) => {
                    const percent = totalExpense > 0 ? ((entry.value / totalExpense) * 100).toFixed(1) : '0';
                    const isHovered = hoveredPieIndex === idx;
                    return (
                      <div
                        key={entry.name}
                        onMouseEnter={() => setHoveredPieIndex(idx)}
                        onMouseLeave={() => setHoveredPieIndex(null)}
                        className={`p-2 rounded-xl transition-all cursor-pointer ${
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
                              {tCategory(entry.name)}
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
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
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
              <div className="py-16 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-2">
                  <PieChartIcon className="w-6 h-6" />
                </div>
                <p className="text-xs text-slate-400 font-medium">{t('reports.noExpenseData', 'Chưa có dữ liệu chi tiêu trong kỳ này')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Income vs Expense bar chart */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-blue-500" />
                <span>{t('reports.incomeExpenseComparison', 'So sánh Thu - Chi theo thời gian')}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('reports.cashflow5Months', 'Biến động dòng tiền qua 5 tháng gần nhất')}
              </p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyComparisonData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis
                  tickFormatter={(val) => `${val / 1000000}Tr`}
                  tick={{ fontSize: 12 }}
                  width={45}
                />
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(val: any) => formatCurrency(Number(val))}
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Thu" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Chi" fill="#f43f5e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 5. CHART 3: PHÂN TÍCH XU HƯỚNG DÒNG TIỀN (AREA CHART) */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-indigo-500" />
              <span>{t('reports.trendAnalysis', 'Phân tích Xu hướng Dòng tiền & Tích lũy')}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('reports.growthChartDesc', 'Biểu đồ tăng trưởng tổng tài sản tích lũy qua các tháng')}
            </p>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cashflowTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis
                tickFormatter={(val) => `${val / 1000000}Tr`}
                tick={{ fontSize: 12 }}
                width={50}
              />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(val: any) => formatCurrency(Number(val))}
                contentStyle={{
                  backgroundColor: '#1e293b',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Area
                type="monotone"
                dataKey={t('reports.accumulated', 'Tổng tích lũy')}
                stroke="#6366f1"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorNetWorth)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 6. DETAILED CATEGORY RANKING TABLE */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-800 dark:text-white">
            {t('reports.categoryRanking', 'Xếp hạng Danh mục Chi tiêu trong Kỳ')}
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="px-6 py-3">{t('reports.rank', 'Hạng')}</th>
                <th className="px-6 py-3">{t('reports.category', 'Danh mục')}</th>
                <th className="px-6 py-3">{t('reports.totalSpentCol', 'Tổng chi (₫)')}</th>
                <th className="px-6 py-3">{t('reports.percentageCol', 'Tỷ trọng (%)')}</th>
                <th className="px-6 py-3">{t('reports.txCountCol', 'Số giao dịch')}</th>
                <th className="px-6 py-3">{t('reports.avgPerTxCol', 'Trung bình / lần')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {categoryBreakdown.map((cat, idx) => (
                <tr key={cat.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-6 py-3.5 font-extrabold text-slate-400">#{idx + 1}</td>
                  <td className="px-6 py-3.5 font-bold text-slate-800 dark:text-white flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span>{tCategory(cat.name)}</span>
                  </td>
                  <td className="px-6 py-3.5 font-extrabold text-rose-600 dark:text-rose-400">
                    {formatCurrency(cat.value)}
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 w-10">
                        {cat.percentage}%
                      </span>
                      <div className="w-24 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-slate-600 dark:text-slate-400 font-medium">
                    {cat.count} {t('reports.times', 'lần')}
                  </td>
                  <td className="px-6 py-3.5 font-semibold text-slate-700 dark:text-slate-300">
                    {formatCurrency(Math.round(cat.value / (cat.count || 1)))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
