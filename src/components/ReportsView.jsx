'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { BarChart3, PieChart as PieChartIcon, TrendingUp, Calendar, FileSpreadsheet, FileText, } from 'lucide-react';
import { formatCurrency, formatDate, exportToCSV, exportToExcel, formatCompactNumber, formatMonthLabel, toLocalDateKey, } from '@/lib/utils';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, AreaChart, Area, } from 'recharts';
const pieChartColors = ['#f97316', '#ec4899', '#8b5cf6', '#0ea5e9', '#eab308', '#10b981', '#64748b', '#ef4444'];
export const ReportsView = () => {
    const { transactions, budgets, wallets, financialSummary, currentMonth, availableMonths, categories, t, tCategory, tWalletType, language, } = useApp();
    // Period state: 'ALL' | 'YYYY-MM' | 'THIS_YEAR' | 'CUSTOM'
    // Default to first available month or currentMonth
    const [selectedPeriod, setSelectedPeriod] = useState(availableMonths.length > 0 ? availableMonths[0] : currentMonth || 'ALL');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [pieType, setPieType] = useState('EXPENSE');
    const [barMode, setBarMode] = useState('BOTH');
    const [hoveredPieIndex, setHoveredPieIndex] = useState(null);
    // Filter transactions according to selected period
    const filteredTxs = useMemo(() => {
        return transactions.filter((tx) => {
            const txDate = toLocalDateKey(tx.date);
            if (selectedPeriod === 'ALL') {
                return true;
            }
            if (selectedPeriod === 'THIS_YEAR') {
                const yearStr = (availableMonths[0] || currentMonth || '2026-10').split('-')[0];
                return txDate.startsWith(yearStr);
            }
            if (selectedPeriod === 'CUSTOM') {
                if (customStart && txDate < customStart)
                    return false;
                if (customEnd && txDate > customEnd)
                    return false;
                return true;
            }
            // If selectedPeriod is a specific month (e.g. '2026-10')
            return txDate.startsWith(selectedPeriod);
        });
    }, [transactions, selectedPeriod, availableMonths, currentMonth, customStart, customEnd]);
    // Auto switch pieType if active filtered transactions have no expenses but have income
    useEffect(() => {
        const hasExpenses = filteredTxs.some((t) => t.type === 'EXPENSE');
        const hasIncome = filteredTxs.some((t) => t.type === 'INCOME');
        if (!hasExpenses && hasIncome) {
            setPieType('INCOME');
        }
        else if (hasExpenses && !hasIncome) {
            setPieType('EXPENSE');
        }
    }, [filteredTxs]);
    // Aggregate totals
    const totalIncome = useMemo(() => filteredTxs.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0), [filteredTxs]);
    const totalExpense = useMemo(() => filteredTxs.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0), [filteredTxs]);
    const netSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? Math.max(0, Math.round((netSavings / totalIncome) * 100)) : 0;
    // Pie chart: Category Breakdown (matching TransactionsView)
    const categoryBreakdown = useMemo(() => {
        const targetTxs = filteredTxs.filter((t) => t.type === pieType);
        const catMap = {};
        targetTxs.forEach((t) => {
            const name = t.categoryName || tCategory('Khác');
            if (!catMap[name])
                catMap[name] = { total: 0, count: 0 };
            catMap[name].total += t.amount;
            catMap[name].count += 1;
        });
        const totalPieAmount = targetTxs.reduce((s, t) => s + t.amount, 0);
        const list = Object.keys(catMap).map((name) => {
            const matchedCat = categories.find((c) => c.name === name);
            return {
                name,
                value: catMap[name].total,
                count: catMap[name].count,
                percentage: totalPieAmount > 0 ? Math.round((catMap[name].total / totalPieAmount) * 1000) / 10 : 0,
                color: matchedCat?.color || '',
            };
        });
        // Sort descending by value (highest spending / earning category first)
        list.sort((a, b) => b.value - a.value);
        return list.map((item, idx) => ({
            ...item,
            color: item.color || (pieType === 'INCOME'
                ? ['#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899'][idx % 6]
                : pieChartColors[idx % pieChartColors.length]),
        }));
    }, [filteredTxs, categories, pieType, tCategory]);
    const totalPieAmount = useMemo(() => {
        return categoryBreakdown.reduce((sum, item) => sum + item.value, 0);
    }, [categoryBreakdown]);
    // Bar chart: Historical 6-month comparison (from REAL database transactions, no fake mock data)
    const monthlyComparisonData = useMemo(() => {
        const latestMonth = availableMonths[0] || currentMonth || '2026-10';
        const [y, m] = latestMonth.split('-').map(Number);
        const monthList = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(y || 2026, (m || 10) - 1 - i, 1);
            monthList.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        }
        return monthList.map((mo) => {
            const monthTxs = transactions.filter((t) => toLocalDateKey(t.date).startsWith(mo));
            const inc = monthTxs.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
            const exp = monthTxs.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
            return {
                month: `T${mo.slice(5)}`,
                rawMonth: mo,
                Thu: inc,
                Chi: exp,
            };
        });
    }, [transactions, availableMonths, currentMonth]);
    // Daily breakdown when a specific month is selected (matching TransactionsView)
    const dailyBreakdownData = useMemo(() => {
        if (selectedPeriod === 'ALL' || selectedPeriod === 'THIS_YEAR' || selectedPeriod === 'CUSTOM')
            return [];
        const monthTxs = transactions.filter((t) => toLocalDateKey(t.date).startsWith(selectedPeriod));
        const dayMap = {};
        monthTxs.forEach((t) => {
            const dStr = toLocalDateKey(t.date);
            const dayLabel = `${dStr.slice(8, 10)}/${dStr.slice(5, 7)}`;
            if (!dayMap[dayLabel]) {
                dayMap[dayLabel] = { Thu: 0, Chi: 0, dateStr: dStr };
            }
            if (t.type === 'INCOME')
                dayMap[dayLabel].Thu += t.amount;
            if (t.type === 'EXPENSE')
                dayMap[dayLabel].Chi += t.amount;
        });
        return Object.keys(dayMap)
            .sort((a, b) => dayMap[a].dateStr.localeCompare(dayMap[b].dateStr))
            .map((dayLabel) => ({
            month: dayLabel,
            Thu: dayMap[dayLabel].Thu,
            Chi: dayMap[dayLabel].Chi,
            rawMonth: dayMap[dayLabel].dateStr,
        }));
    }, [transactions, selectedPeriod]);
    const activeBarChartData = (selectedPeriod !== 'ALL' && selectedPeriod !== 'THIS_YEAR' && selectedPeriod !== 'CUSTOM' && dailyBreakdownData.length > 0)
        ? dailyBreakdownData
        : monthlyComparisonData;
    // Scaled bar chart data: values strictly 0 produce 0 height (no bar drawn)
    // Non-zero values scale progressively so bars visibly grow without flattening
    const scaledBarChartData = useMemo(() => {
        const rawData = activeBarChartData;
        if (!rawData || rawData.length === 0)
            return [];
        const relevantValues = [];
        rawData.forEach((d) => {
            if ((barMode === 'BOTH' || barMode === 'INCOME') && d.Thu > 0)
                relevantValues.push(d.Thu);
            if ((barMode === 'BOTH' || barMode === 'EXPENSE') && d.Chi > 0)
                relevantValues.push(d.Chi);
        });
        if (relevantValues.length === 0) {
            return rawData.map((d) => ({ ...d, displayThu: 0, displayChi: 0 }));
        }
        const maxVal = Math.max(...relevantValues);
        const minVal = Math.min(...relevantValues);
        const ratio = maxVal / (minVal || 1);
        const useSymlog = ratio > 20;
        const C = Math.max(minVal, 100000);
        const maxLog = Math.log10(1 + maxVal / C);
        const scaleVal = (val) => {
            if (val <= 0)
                return 0;
            if (!useSymlog) {
                return (val / maxVal) * 100;
            }
            return (Math.log10(1 + val / C) / maxLog) * 100;
        };
        return rawData.map((d) => ({
            ...d,
            displayThu: scaleVal(d.Thu),
            displayChi: scaleVal(d.Chi),
        }));
    }, [activeBarChartData, barMode]);
    // Real total wealth from wallets
    const currentTotalWealth = useMemo(() => {
        return wallets.reduce((s, w) => s + w.balance, 0);
    }, [wallets]);
    // Cash flow trend line/area based on actual wallet wealth & monthly flow
    const cashflowTrendData = useMemo(() => {
        const totalNetInWindow = monthlyComparisonData.reduce((s, d) => s + (d.Thu - d.Chi), 0);
        let cumulative = currentTotalWealth - totalNetInWindow;
        return monthlyComparisonData.map((d) => {
            const diff = d.Thu - d.Chi;
            cumulative += diff;
            return {
                month: d.month,
                [t('reports.netCashflow', 'Dòng tiền thuần')]: diff,
                [t('reports.accumulated', 'Tổng tích lũy')]: cumulative,
            };
        });
    }, [monthlyComparisonData, currentTotalWealth, t]);
    return (<div className="space-y-6 pb-12 print:p-0 print:m-0">
      {/* 1. HEADER & ACTIONS */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
            {t('rep.reportTitle', 'Báo Cáo & Phân Tích Chuyên Sâu')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('rep.reportSubtitle', 'Biểu đồ tròn cơ cấu chi tiêu, so sánh Thu - Chi theo thời gian, phân tích xu hướng dòng tiền & xuất báo cáo')}
          </p>
        </div>

        {/* Action buttons: Excel, CSV */}
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => exportToCSV(filteredTxs)} className="flex items-center space-x-1.5 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer">
            <FileText className="w-4 h-4 text-emerald-600"/>
            <span>{t('rep.exportCSV', 'Xuất CSV')}</span>
          </button>

          <button onClick={() => exportToExcel(filteredTxs, budgets, wallets, financialSummary)} className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer">
            <FileSpreadsheet className="w-4 h-4"/>
            <span>{t('rep.exportExcel', 'Xuất Excel (.xlsx)')}</span>
          </button>
        </div>
      </div>

      {/* 2. TIME PERIOD FILTER BUTTONS (MATCHING TRANSACTIONSVIEW DYNAMIC MONTHS) */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 print:hidden">
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto scrollbar-none">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-blue-500"/>
            {t('rep.timePeriod', 'Kỳ báo cáo:')}
          </span>

          {/* Quick All Months Button */}
          <button type="button" onClick={() => setSelectedPeriod('ALL')} className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${selectedPeriod === 'ALL'
            ? 'bg-blue-600 text-white shadow-xs'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
            {t('tx.allMonths', 'Tất cả các tháng')}
          </button>

          {/* Available Months Pills */}
          {availableMonths.map((m) => (<button key={m} type="button" onClick={() => setSelectedPeriod(m)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${selectedPeriod === m
                ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-500/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
              {formatMonthLabel(m, language)}
            </button>))}

          {/* This Year */}
          <button type="button" onClick={() => setSelectedPeriod('THIS_YEAR')} className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${selectedPeriod === 'THIS_YEAR'
            ? 'bg-blue-600 text-white shadow-xs'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
            {t('rep.thisYearPeriod', 'Cả năm')} {(availableMonths[0] || '2026').slice(0, 4)}
          </button>

          {/* Custom Date Range */}
          <button type="button" onClick={() => setSelectedPeriod('CUSTOM')} className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${selectedPeriod === 'CUSTOM'
            ? 'bg-blue-600 text-white shadow-xs'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
            {t('rep.customPeriod', 'Tùy chọn ngày')}
          </button>
        </div>

        {selectedPeriod === 'CUSTOM' && (<div className="flex items-center space-x-2 shrink-0">
            <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"/>
            <span className="text-xs text-slate-400">{t('rep.to', 'đến')}</span>
            <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"/>
          </div>)}
      </div>

      {/* 3. EXECUTIVE SUMMARY BANNER (EXACT NUMBERS MATCHING TRANSACTIONSVIEW) */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs print:border-none print:shadow-none">
        <div className="hidden print:block pb-4 mb-4 border-b">
          <h2 className="text-xl font-bold text-slate-900">{t('rep.execSummary', 'BÁO CÁO TỔNG HỢP TÀI CHÍNH CHI TIÊU')}</h2>
          <p className="text-xs text-slate-500">
            {t('rep.reportPeriod', 'Kỳ báo cáo:')}{' '}
            {selectedPeriod === 'ALL'
            ? t('tx.allMonths', 'Tất cả các tháng')
            : selectedPeriod === 'THIS_YEAR'
                ? `${t('rep.thisYearPeriod', 'Cả năm')} ${(availableMonths[0] || '2026').slice(0, 4)}`
                : selectedPeriod === 'CUSTOM'
                    ? `${customStart || '...'} -> ${customEnd || '...'}`
                    : formatMonthLabel(selectedPeriod, language)}{' '}
            • {t('rep.createdAt', 'Tạo ngày:')} {formatDate(new Date().toISOString(), 'full', language)}
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
            <p className={`text-xl font-black mt-1 ${netSavings >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'}`}>
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
        {/* Chart 1: Donut Chart with Income/Expense Toggle */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center space-x-2">
                  <PieChartIcon className={`w-5 h-5 ${pieType === 'INCOME' ? 'text-emerald-500' : 'text-purple-500'}`}/>
                  <span>
                    {pieType === 'INCOME' ? t('tx.incomeStructure', 'Cơ cấu thu nhập') : t('rep.structureByCategory', 'Cơ cấu chi tiêu theo Danh mục')}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {pieType === 'INCOME'
            ? t('tx.incomeDistribution', 'Phân bổ tỷ trọng nguồn thu trong kỳ')
            : t('rep.structureSubtitle', 'Phân bổ tỷ trọng % các nhóm chi tiêu trong kỳ')}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Toggle Khoản chi / Khoản thu */}
                <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold border border-slate-200 dark:border-slate-700">
                  <button type="button" onClick={() => setPieType('EXPENSE')} className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer ${pieType === 'EXPENSE'
            ? 'bg-rose-500 text-white shadow-xs'
            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
                    {t('dash.expense', 'Chi tiêu')}
                  </button>
                  <button type="button" onClick={() => setPieType('INCOME')} className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer ${pieType === 'INCOME'
            ? 'bg-emerald-500 text-white shadow-xs'
            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
                    {t('dash.income', 'Thu nhập')}
                  </button>
                </div>

                {totalPieAmount > 0 && (<span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${pieType === 'INCOME'
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40'
                : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/40'}`}>
                    {pieType === 'INCOME' ? '+' : '-'}{formatCurrency(totalPieAmount)}
                  </span>)}
              </div>
            </div>

            {categoryBreakdown.length > 0 ? (<>
                {/* Donut Chart with Center Interactive Metrics */}
                <div className="relative h-56 w-full flex items-center justify-center my-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryBreakdown} cx="50%" cy="50%" innerRadius={58} outerRadius={82} paddingAngle={2.5} dataKey="value" onMouseEnter={(_, index) => setHoveredPieIndex(index)} onMouseLeave={() => setHoveredPieIndex(null)}>
                        {categoryBreakdown.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} stroke={hoveredPieIndex === index ? '#ffffff' : 'transparent'} strokeWidth={hoveredPieIndex === index ? 2 : 0} style={{
                    transform: hoveredPieIndex === index ? 'scale(1.04)' : 'scale(1)',
                    transformOrigin: 'center center',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                }}/>))}
                      </Pie>
                      <Tooltip content={({ active, payload }) => {
                if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const percent = totalPieAmount > 0 ? ((data.value / totalPieAmount) * 100).toFixed(1) : '0';
                    return (<div className="bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white text-xs px-3 py-2 rounded-xl shadow-xl border border-slate-700/60 pointer-events-none z-50">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }}/>
                                  <span className="font-bold text-white">{tCategory(data.name)}</span>
                                </div>
                                <div className="flex items-center justify-between gap-3 text-slate-300">
                                  <span className="font-semibold text-white">{formatCurrency(data.value)}</span>
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-emerald-300">
                                    {percent}%
                                  </span>
                                </div>
                              </div>);
                }
                return null;
            }}/>
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Center of the Donut */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
                    {hoveredPieIndex !== null && categoryBreakdown[hoveredPieIndex] ? (<div className="animate-in fade-in zoom-in-90 duration-150">
                        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate max-w-[100px] mx-auto">
                          {tCategory(categoryBreakdown[hoveredPieIndex].name)}
                        </p>
                        <p className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                          {totalPieAmount > 0
                    ? ((categoryBreakdown[hoveredPieIndex].value / totalPieAmount) * 100).toFixed(1)
                    : 0}%
                        </p>
                        <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                          {formatCurrency(categoryBreakdown[hoveredPieIndex].value)}
                        </p>
                      </div>) : (<div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                          {pieType === 'INCOME' ? t('dash.income', 'Tổng thu') : t('reports.totalExpense', 'Tổng chi')}
                        </p>
                        <p className={`text-base font-black leading-tight mt-0.5 ${pieType === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                          {formatCurrency(totalPieAmount)}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                          {categoryBreakdown.length} {t('reports.categories', 'danh mục')}
                        </p>
                      </div>)}
                  </div>
                </div>

                {/* Category Breakdown List with Percentage & Progress Bars */}
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1 mt-2 scrollbar-thin [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700">
                  {categoryBreakdown.map((entry, idx) => {
                const percent = totalPieAmount > 0 ? ((entry.value / totalPieAmount) * 100).toFixed(1) : '0';
                const isHovered = hoveredPieIndex === idx;
                return (<div key={entry.name} onMouseEnter={() => setHoveredPieIndex(idx)} onMouseLeave={() => setHoveredPieIndex(null)} className={`p-2 rounded-xl transition-all cursor-pointer ${isHovered
                        ? 'bg-slate-100 dark:bg-slate-800 scale-[1.01]'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-white dark:ring-slate-900" style={{ backgroundColor: entry.color }}/>
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
                          <div className="h-full rounded-full transition-all duration-300" style={{
                        width: `${percent}%`,
                        backgroundColor: entry.color,
                    }}/>
                        </div>
                      </div>);
            })}
                </div>
              </>) : (<div className="py-16 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-2">
                  <PieChartIcon className="w-6 h-6"/>
                </div>
                <p className="text-xs text-slate-400 font-medium">
                  {pieType === 'INCOME' ? t('reports.noIncomeData', 'Chưa có dữ liệu thu nhập trong kỳ này') : t('reports.noExpenseData', 'Chưa có dữ liệu chi tiêu trong kỳ này')}
                </p>
              </div>)}
          </div>
        </div>

        {/* Chart 2: Income vs Expense bar chart (Matching TransactionsView daily / monthly) */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-blue-500"/>
                <span>
                  {selectedPeriod !== 'ALL' && selectedPeriod !== 'THIS_YEAR' && selectedPeriod !== 'CUSTOM' && dailyBreakdownData.length > 0
            ? t('tx.dailyBreakdown', 'Diễn biến thu - chi theo ngày')
            : t('reports.incomeExpenseComparison', 'So sánh Thu - Chi theo thời gian')}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {selectedPeriod !== 'ALL' && selectedPeriod !== 'THIS_YEAR' && selectedPeriod !== 'CUSTOM' && dailyBreakdownData.length > 0
            ? `${formatMonthLabel(selectedPeriod, language)} • ${t('tx.dailyBreakdown', 'Diễn biến dòng tiền theo từng ngày')}`
            : t('reports.cashflow5Months', 'Biến động dòng tiền qua các tháng gần nhất')}
              </p>
            </div>

            {/* Bar Chart Mode Toggle */}
            <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold border border-slate-200 dark:border-slate-700">
              <button type="button" onClick={() => setBarMode('BOTH')} className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer ${barMode === 'BOTH'
            ? 'bg-blue-600 text-white shadow-xs'
            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
                {t('tx.bothCashflow', 'Thu & Chi')}
              </button>
              <button type="button" onClick={() => setBarMode('EXPENSE')} className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer ${barMode === 'EXPENSE'
            ? 'bg-rose-500 text-white shadow-xs'
            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
                {t('tx.onlyExpense', 'Chỉ Chi tiêu')}
              </button>
              <button type="button" onClick={() => setBarMode('INCOME')} className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer ${barMode === 'INCOME'
            ? 'bg-emerald-500 text-white shadow-xs'
            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
                {t('tx.onlyIncome', 'Chỉ Thu nhập')}
              </button>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scaledBarChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }}/>
                <YAxis domain={[0, 100]} hide={true}/>
                <Tooltip content={({ active, payload }) => {
            if (!active || !payload || !payload.length)
                return null;
            const data = payload[0].payload;
            return (<div className="bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white text-xs px-3.5 py-2.5 rounded-xl shadow-xl border border-slate-700/60 pointer-events-none z-50 min-w-[150px]">
                        <p className="font-bold text-slate-200 mb-1.5 border-b border-slate-700/60 pb-1">
                          {data.rawMonth ? formatDate(data.rawMonth, 'short', language) : data.month}
                        </p>
                        <div className="space-y-1">
                          {(barMode === 'BOTH' || barMode === 'INCOME') && (<div className="flex items-center justify-between gap-3 text-emerald-400">
                              <span className="text-slate-400">{t('dashboard.income', 'Thu nhập')}:</span>
                              <span className="font-bold">
                                {data.Thu > 0 ? `+${formatCurrency(data.Thu)}` : '0 ₫'}
                              </span>
                            </div>)}
                          {(barMode === 'BOTH' || barMode === 'EXPENSE') && (<div className="flex items-center justify-between gap-3 text-rose-400">
                              <span className="text-slate-400">{t('dashboard.expense', 'Chi tiêu')}:</span>
                              <span className="font-bold">
                                {data.Chi > 0 ? `-${formatCurrency(data.Chi)}` : '0 ₫'}
                              </span>
                            </div>)}
                        </div>
                      </div>);
        }}/>
                {(barMode === 'BOTH' || barMode === 'INCOME') && (<Bar dataKey="displayThu" fill="#10b981" shape={(props) => {
                const { x, y, width, height, value } = props;
                if (!value || value <= 0 || height <= 0)
                    return <g />;
                const r = Math.min(6, width / 2);
                const minH = 4;
                const h = Math.max(height, minH);
                const adjustedY = y - (h - height);
                return (<rect x={x} y={adjustedY} width={width} height={h} fill="#10b981" rx={r} ry={r} className="cursor-pointer transition-all hover:opacity-80"/>);
            }} name={t('dashboard.income', 'Thu nhập')}/>)}
                {(barMode === 'BOTH' || barMode === 'EXPENSE') && (<Bar dataKey="displayChi" fill="#f43f5e" shape={(props) => {
                const { x, y, width, height, value } = props;
                if (!value || value <= 0 || height <= 0)
                    return <g />;
                const r = Math.min(6, width / 2);
                const minH = 4;
                const h = Math.max(height, minH);
                const adjustedY = y - (h - height);
                return (<rect x={x} y={adjustedY} width={width} height={h} fill="#f43f5e" rx={r} ry={r} className="cursor-pointer transition-all hover:opacity-80"/>);
            }} name={t('dashboard.expense', 'Chi tiêu')}/>)}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 5. CHART 3: PHÂN TÍCH XU HƯỚNG DÒNG TIỀN & TÍCH LŨY (AREA CHART) */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-indigo-500"/>
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
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 12 }}/>
              <YAxis tickFormatter={formatCompactNumber} tick={{ fontSize: 11 }} width={54}/>
              <Tooltip 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    formatter={(val) => formatCurrency(Number(val))} contentStyle={{
            backgroundColor: '#1e293b',
            borderColor: '#334155',
            borderRadius: '4px',
            color: '#fff',
            fontSize: '12px',
        }}/>
              <Area type="monotone" dataKey={t('reports.accumulated', 'Tổng tích lũy')} stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorNetWorth)"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 6. DETAILED CATEGORY / INCOME RANKING TABLE */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800 dark:text-white">
            {pieType === 'INCOME' ? t('reports.incomeRanking', 'Xếp hạng Nguồn Thu nhập trong Kỳ') : t('reports.categoryRanking', 'Xếp hạng Danh mục Chi tiêu trong Kỳ')}
          </h3>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {categoryBreakdown.length} {t('reports.categories', 'danh mục')}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="px-6 py-3">{t('reports.rank', 'Hạng')}</th>
                <th className="px-6 py-3">{t('reports.category', 'Danh mục')}</th>
                <th className="px-6 py-3">
                  {pieType === 'INCOME' ? t('reports.totalIncomeCol', 'Tổng thu (₫)') : t('reports.totalSpentCol', 'Tổng chi (₫)')}
                </th>
                <th className="px-6 py-3">{t('reports.percentageCol', 'Tỷ trọng (%)')}</th>
                <th className="px-6 py-3">{t('reports.txCountCol', 'Số giao dịch')}</th>
                <th className="px-6 py-3">{t('reports.avgPerTxCol', 'Trung bình / lần')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {categoryBreakdown.map((cat, idx) => (<tr key={cat.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-6 py-3.5 font-extrabold text-slate-400">#{idx + 1}</td>
                  <td className="px-6 py-3.5 font-bold text-slate-800 dark:text-white flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }}/>
                    <span>{tCategory(cat.name)}</span>
                  </td>
                  <td className={`px-6 py-3.5 font-extrabold ${pieType === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {pieType === 'INCOME' ? '+' : '-'}{formatCurrency(cat.value)}
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 w-10">
                        {cat.percentage}%
                      </span>
                      <div className="w-24 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}/>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-slate-600 dark:text-slate-400 font-medium">
                    {cat.count} {t('reports.times', 'lần')}
                  </td>
                  <td className="px-6 py-3.5 font-semibold text-slate-700 dark:text-slate-300">
                    {formatCurrency(Math.round(cat.value / (cat.count || 1)))}
                  </td>
                </tr>))}
            </tbody>
          </table>
        </div>
      </div>
    </div>);
};
