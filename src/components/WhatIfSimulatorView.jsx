'use client';
import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Sparkles, TrendingUp, Sliders, Zap, CheckCircle2, AlertTriangle, Plus, Trash2, FileSpreadsheet, CreditCard, Building2, X, Wallet, Pencil, RotateCcw, } from 'lucide-react';
import { formatCurrency, formatNumberWithDots } from '@/lib/utils';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, } from 'recharts';
import * as XLSX from 'xlsx';
import { IconHelper, getIconLabel } from './IconHelper';
import { DEFAULT_SPENDING_ITEMS } from '@/lib/mock-data';
export const WhatIfSimulatorView = () => {
    const { transactions, financialSummary, categories, planner, simulatorConfig, updateSimulatorConfig, t, tCategory, tWalletType, language, showConfirm, } = useApp();
    // Khung thời gian mô phỏng
    const projectionMonths = simulatorConfig.projectionMonths;
    const setProjectionMonths = (val) => updateSimulatorConfig({ projectionMonths: val });
    // 1. CÁC KHOẢN TIÊU DÙNG CHI TIÊU CÁ NHÂN & LỰA CHỌN CẮT GIẢM
    const spendingCategories = Array.isArray(simulatorConfig?.spendingCategories)
        ? simulatorConfig.spendingCategories
        : [];
    const setSpendingCategories = (updater) => {
        if (typeof updater === 'function') {
            updateSimulatorConfig({ spendingCategories: updater(spendingCategories) });
        }
        else {
            updateSimulatorConfig({ spendingCategories: updater });
        }
    };
    // Modal thêm/sửa khoản chi tiêu What-If
    const [expenseModalOpen, setExpenseModalOpen] = useState(false);
    const [editingExpenseId, setEditingExpenseId] = useState(null);
    const [expenseSourceType, setExpenseSourceType] = useState('category');
    const [selectedCatId, setSelectedCatId] = useState(categories.find((c) => c.type === 'EXPENSE')?.id || categories[0]?.id || '');
    const [customExpenseName, setCustomExpenseName] = useState('');
    const [customExpenseIcon, setCustomExpenseIcon] = useState('Utensils');
    const [customExpenseColor, setCustomExpenseColor] = useState('#f97316');
    const [expenseAmount, setExpenseAmount] = useState('2000000');
    const [expenseCutPercent, setExpenseCutPercent] = useState('20');
    const [expenseApplyCut, setExpenseApplyCut] = useState(false);
    // 2. KÊNH ĐẦU TƯ / GỬI TIẾT KIỆM
    const savingsAmount = simulatorConfig?.savingsAmount ?? 0;
    const setSavingsAmount = (val) => updateSimulatorConfig({ savingsAmount: val });
    const savingsInterestRate = simulatorConfig?.savingsInterestRate ?? 5.5;
    const setSavingsInterestRate = (val) => updateSimulatorConfig({ savingsInterestRate: val });
    const investmentAmount = simulatorConfig?.investmentAmount ?? 0;
    const setInvestmentAmount = (val) => updateSimulatorConfig({ investmentAmount: val });
    const investmentRateScenario = simulatorConfig?.investmentRateScenario ?? 8.5;
    const setInvestmentRateScenario = (val) => updateSimulatorConfig({ investmentRateScenario: val });
    const [customInvestRate, setCustomInvestRate] = useState(simulatorConfig?.customInvestRate || '8.5');
    // 3. KHOẢN VAY NGOÀI & NGHĨA VỤ TRẢ NỢ (External Loans & Debts)
    const hasExternalLoan = Boolean(simulatorConfig?.hasExternalLoan);
    const setHasExternalLoan = (val) => updateSimulatorConfig({ hasExternalLoan: val });
    const externalLoans = Array.isArray(simulatorConfig?.externalLoans) ? simulatorConfig.externalLoans : [];
    const setExternalLoans = (updater) => {
        if (typeof updater === 'function') {
            updateSimulatorConfig({ externalLoans: updater(externalLoans) });
        }
        else {
            updateSimulatorConfig({ externalLoans: updater });
        }
    };
    const [addLoanModalOpen, setAddLoanModalOpen] = useState(false);
    const [newLoanName, setNewLoanName] = useState('');
    const [newLoanDebt, setNewLoanDebt] = useState('');
    const [newLoanPayment, setNewLoanPayment] = useState('');
    const [newLoanRate, setNewLoanRate] = useState('0');
    // Danh sách các mục người dùng đã chọn để cắt giảm
    const selectedCuts = useMemo(() => {
        return spendingCategories.filter((c) => c.isSelected);
    }, [spendingCategories]);
    // Tổng mức tiêu dùng cá nhân hiện tại từ các danh mục
    const totalPersonalExpense = useMemo(() => {
        return spendingCategories.reduce((sum, item) => sum + item.monthlyExpense, 0);
    }, [spendingCategories]);
    // Thu nhập và chi tiêu cơ bản
    const startingNetWorth = financialSummary?.totalAssets ?? 0;
    const monthlyIncome = planner?.monthlyIncome ?? 0;
    const baseMonthlyExpense = totalPersonalExpense > 0 ? totalPersonalExpense : (financialSummary?.monthlyExpense ?? 0);
    const baseMonthlySavings = Math.max(0, monthlyIncome - baseMonthlyExpense);
    // Tổng số tiền tiết kiệm được từ các khoản cắt giảm chi tiêu đã chọn
    const totalCutSavings = useMemo(() => {
        return selectedCuts.reduce((sum, item) => sum + Math.round(item.monthlyExpense * (item.cutPercent / 100)), 0);
    }, [selectedCuts]);
    // Tổng tiền trả nợ vay hàng tháng
    const totalMonthlyDebtPayment = useMemo(() => {
        if (!hasExternalLoan)
            return 0;
        return externalLoans.reduce((sum, loan) => sum + loan.monthlyPayment, 0);
    }, [hasExternalLoan, externalLoans]);
    // TỔNG HỢP MÔ PHỎNG CHI TIẾT TỪNG THÁNG (Month-by-Month Detailed Projection)
    const detailedMonthlyProjections = useMemo(() => {
        const rows = [];
        const monthlySavingsRate = savingsInterestRate / 100 / 12;
        const monthlyInvestRate = investmentRateScenario / 100 / 12;
        let baselineWealth = startingNetWorth;
        let whatIfWealth = startingNetWorth;
        let cumulativeSavingsPot = 0;
        let cumulativeInvestPot = 0;
        // Track remaining debt for each loan
        let currentLoanDebts = externalLoans.map((l) => ({ ...l, remaining: l.originalDebt }));
        for (let m = 0; m <= projectionMonths; m++) {
            if (m === 0) {
                rows.push({
                    monthIndex: 0,
                    label: t('whatif.month0', 'Hiện tại (T0)'),
                    income: monthlyIncome,
                    actualExpense: baseMonthlyExpense,
                    cutSavings: 0,
                    debtPaid: 0,
                    remainingDebtTotal: hasExternalLoan ? currentLoanDebts.reduce((s, l) => s + l.remaining, 0) : 0,
                    cashSaved: 0,
                    savingsPot: 0,
                    savingsInterestGain: 0,
                    investPot: 0,
                    investReturn: 0,
                    baselineTotal: Math.round(baselineWealth),
                    whatIfTotal: Math.round(whatIfWealth),
                    netDelta: 0,
                });
                continue;
            }
            // 1. Kịch bản gốc (Baseline: không cắt giảm, không đầu tư thêm, không quản lý nợ riêng)
            baselineWealth += baseMonthlySavings;
            // 2. Tính toán trả nợ trong tháng m
            let monthDebtPaid = 0;
            if (hasExternalLoan) {
                currentLoanDebts = currentLoanDebts.map((loan) => {
                    if (loan.remaining <= 0)
                        return { ...loan, remaining: 0 };
                    const pay = Math.min(loan.remaining, loan.monthlyPayment);
                    monthDebtPaid += pay;
                    return { ...loan, remaining: Math.max(0, loan.remaining - pay) };
                });
            }
            const remainingDebtTotal = hasExternalLoan ? currentLoanDebts.reduce((s, l) => s + l.remaining, 0) : 0;
            // 3. Dòng tiền sau khi cắt giảm chi tiêu và trả nợ
            const effectiveExpense = baseMonthlyExpense - totalCutSavings;
            const netCashflowBeforeAlloc = monthlyIncome - effectiveExpense - monthDebtPaid;
            // 4. Phân bổ vào Tiết kiệm an toàn
            const actualSavingsContribution = Math.min(Math.max(0, netCashflowBeforeAlloc), savingsAmount);
            const savingsInterestMonth = (cumulativeSavingsPot + actualSavingsContribution) * monthlySavingsRate;
            cumulativeSavingsPot = cumulativeSavingsPot + actualSavingsContribution + savingsInterestMonth;
            // 5. Phân bổ vào Đầu tư tài chính & TÍNH TOÁN LÃI / THUA LỖ
            const leftoverForInvest = Math.max(0, netCashflowBeforeAlloc - actualSavingsContribution);
            const actualInvestContribution = Math.min(leftoverForInvest, investmentAmount);
            // Lãi hoặc Lỗ đầu tư tài chính trong tháng (Có thể ÂM nếu investmentRateScenario < 0)
            const investReturnMonth = (cumulativeInvestPot + actualInvestContribution) * monthlyInvestRate;
            cumulativeInvestPot = Math.max(0, cumulativeInvestPot + actualInvestContribution + investReturnMonth);
            // Tiền mặt giữ lại không đầu tư
            const unallocatedCash = Math.max(0, leftoverForInvest - actualInvestContribution);
            // Cập nhật tổng tài sản ròng What-If tại tháng m (Trừ nợ còn lại!)
            whatIfWealth = startingNetWorth + m * unallocatedCash + cumulativeSavingsPot + cumulativeInvestPot - remainingDebtTotal;
            const delta = whatIfWealth - baselineWealth;
            rows.push({
                monthIndex: m,
                label: `${t('budget.monthLabel', 'Tháng')} ${m}`,
                income: monthlyIncome,
                actualExpense: effectiveExpense,
                cutSavings: totalCutSavings,
                debtPaid: monthDebtPaid,
                remainingDebtTotal,
                cashSaved: unallocatedCash,
                savingsPot: Math.round(cumulativeSavingsPot),
                savingsInterestGain: Math.round(savingsInterestMonth),
                investPot: Math.round(cumulativeInvestPot),
                investReturn: Math.round(investReturnMonth),
                baselineTotal: Math.round(baselineWealth),
                whatIfTotal: Math.round(whatIfWealth),
                netDelta: Math.round(delta),
            });
        }
        return rows;
    }, [
        startingNetWorth,
        projectionMonths,
        monthlyIncome,
        baseMonthlyExpense,
        baseMonthlySavings,
        totalCutSavings,
        hasExternalLoan,
        externalLoans,
        savingsAmount,
        savingsInterestRate,
        investmentAmount,
        investmentRateScenario,
    ]);
    const finalRow = detailedMonthlyProjections[detailedMonthlyProjections.length - 1];
    const finalDelta = finalRow.netDelta;
    // Kiểm tra và tìm các nhóm khoản chi bị trùng lặp danh mục hoặc tên
    const duplicateGroups = useMemo(() => {
        const map = new Map();
        spendingCategories.forEach((item) => {
            const key = (item.categoryId && item.categoryId !== 'custom')
                ? item.categoryId
                : (item.categoryName || '').trim().toLowerCase();
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(item);
        });
        return Array.from(map.values()).filter((group) => group.length > 1);
    }, [spendingCategories]);

    // Gộp tất cả các khoản chi bị trùng lặp lại thành một thẻ duy nhất (cộng dồn số tiền)
    const handleMergeDuplicates = () => {
        const mergedMap = new Map();
        spendingCategories.forEach((item) => {
            const key = (item.categoryId && item.categoryId !== 'custom')
                ? item.categoryId
                : (item.categoryName || '').trim().toLowerCase();
            if (!mergedMap.has(key)) {
                mergedMap.set(key, { ...item });
            } else {
                const existing = mergedMap.get(key);
                existing.monthlyExpense += Number(item.monthlyExpense) || 0;
                if (item.isSelected) {
                    existing.isSelected = true;
                    existing.cutPercent = Math.max(existing.cutPercent || 0, item.cutPercent || 0);
                }
            }
        });
        setSpendingCategories(Array.from(mergedMap.values()));
    };

    // Mở modal thêm khoản chi mới (tự động chọn danh mục khả dụng chưa có trong danh sách)
    const handleOpenAddExpense = () => {
        setEditingExpenseId(null);
        const existingCatIds = new Set(
            spendingCategories
                .filter((c) => c.categoryId && c.categoryId !== 'custom')
                .map((c) => c.categoryId)
        );
        const existingNames = new Set(
            spendingCategories.map((c) => (c.categoryName || '').trim().toLowerCase())
        );
        const availableCat = categories.find(
            (c) => c.type === 'EXPENSE' && !existingCatIds.has(c.id) && !existingNames.has((c.name || '').trim().toLowerCase())
        );

        if (availableCat) {
            setExpenseSourceType('category');
            setSelectedCatId(availableCat.id);
            setCustomExpenseName(availableCat.name);
            setCustomExpenseIcon(availableCat.icon || 'Utensils');
            setCustomExpenseColor(availableCat.color || '#3b82f6');
        } else {
            setExpenseSourceType('custom');
            setSelectedCatId('');
            setCustomExpenseName('');
            setCustomExpenseIcon('Wallet');
            setCustomExpenseColor('#3b82f6');
        }
        setExpenseAmount('2000000');
        setExpenseCutPercent('20');
        setExpenseApplyCut(false);
        setExpenseModalOpen(true);
    };

    // Mở modal sửa khoản chi hiện có
    const handleOpenEditExpense = (item) => {
        setEditingExpenseId(item.id);
        const matchedCat = categories.find((c) => c.id === item.categoryId);
        if (matchedCat) {
            setExpenseSourceType('category');
            setSelectedCatId(matchedCat.id);
        }
        else {
            setExpenseSourceType('custom');
            setSelectedCatId('');
        }
        setCustomExpenseName(item.categoryName);
        setCustomExpenseIcon(item.icon || 'Utensils');
        setCustomExpenseColor(item.color || '#3b82f6');
        setExpenseAmount(String(item.monthlyExpense || 0));
        setExpenseCutPercent(String(item.cutPercent || 20));
        setExpenseApplyCut(Boolean(item.isSelected));
        setExpenseModalOpen(true);
    };

    // Khi chọn danh mục mẫu trong dropdown
    const handleCategoryChange = (catId) => {
        setSelectedCatId(catId);
        const cat = categories.find((c) => c.id === catId);
        if (cat) {
            setCustomExpenseName(cat.name);
            setCustomExpenseIcon(cat.icon || 'Utensils');
            setCustomExpenseColor(cat.color || '#3b82f6');
        }
    };

    // Lưu khoản chi tiêu (thêm mới hoặc chỉnh sửa, có kiểm tra trùng lặp và hỗ trợ cộng dồn)
    // Icon đang được trỏ chuột / focus trong bộ chọn biểu tượng (hiển thị tên để hỗ trợ người dùng)
    const [hoveredIcon, setHoveredIcon] = useState(null);
    const handleSaveExpense = (e) => {
        e.preventDefault();
        const amt = Number(expenseAmount) || 0;
        const cutPct = Math.min(50, Math.max(0, Number(expenseCutPercent) || 0));
        let finalName = '';
        let finalIcon = 'Utensils';
        let finalColor = '#3b82f6';
        let finalCatId = 'custom';
        if (expenseSourceType === 'category') {
            const cat = categories.find((c) => c.id === selectedCatId);
            if (cat) {
                finalName = cat.name;
                finalIcon = cat.icon || 'Utensils';
                finalColor = cat.color || '#3b82f6';
                finalCatId = cat.id;
            }
            else {
                finalName = customExpenseName.trim() || t('whatif.defaultExpenseName', 'Khoản chi tiêu');
                finalIcon = customExpenseIcon;
                finalColor = customExpenseColor;
                finalCatId = 'custom';
            }
        }
        else {
            finalName = customExpenseName.trim() || t('whatif.defaultNewExpenseName', 'Khoản chi tiêu mới');
            finalIcon = customExpenseIcon;
            finalColor = customExpenseColor;
            finalCatId = `cat-custom-${Date.now()}`;
        }

        // Kiểm tra xem đã có khoản chi nào trùng lặp chưa (trừ khoản chi đang sửa)
        const existingDuplicate = spendingCategories.find((item) => {
            if (editingExpenseId && item.id === editingExpenseId) return false;
            const sameCatId = finalCatId !== 'custom' && item.categoryId === finalCatId;
            const sameName = (item.categoryName || '').trim().toLowerCase() === finalName.trim().toLowerCase();
            return sameCatId || sameName;
        });

        if (existingDuplicate) {
            const confirmMsg = `${t('whatif.duplicatePrompt', 'Khoản chi')} "${tCategory(existingDuplicate.categoryName)}" ${t('whatif.duplicatePromptDesc', 'đã có sẵn trong danh sách! Bạn có muốn cộng dồn số tiền')} +${formatCurrency(amt, language)} ${t('whatif.duplicatePromptMerge', 'vào khoản chi hiện có không?')}`;
            showConfirm({
                title: t('whatif.duplicateTitle', 'Trùng lặp khoản chi'),
                message: confirmMsg,
                confirmText: t('common.confirm', 'Cộng dồn'),
                variant: 'info',
                onConfirm: () => {
                    setSpendingCategories(spendingCategories.map((item) => {
                        if (item.id !== existingDuplicate.id) return item;
                        return {
                            ...item,
                            monthlyExpense: (item.monthlyExpense || 0) + amt,
                            isSelected: expenseApplyCut ? true : item.isSelected,
                            cutPercent: expenseApplyCut ? cutPct : item.cutPercent,
                        };
                    }));
                    setExpenseModalOpen(false);
                },
            });
            return;
        }

        if (editingExpenseId) {
            setSpendingCategories(spendingCategories.map((item) => {
                if (item.id !== editingExpenseId)
                    return item;
                return {
                    ...item,
                    categoryName: finalName,
                    icon: finalIcon,
                    color: finalColor,
                    categoryId: finalCatId,
                    monthlyExpense: amt,
                    cutPercent: cutPct,
                    isSelected: expenseApplyCut,
                };
            }));
        }
        else {
            const newItem = {
                id: `spend-${Date.now()}`,
                categoryId: finalCatId,
                categoryName: finalName,
                icon: finalIcon,
                color: finalColor,
                monthlyExpense: amt,
                isSelected: expenseApplyCut,
                cutPercent: cutPct,
            };
            setSpendingCategories([...spendingCategories, newItem]);
        }
        setExpenseModalOpen(false);
    };

    // Xóa khoản chi tiêu
    const handleDeleteExpenseItem = (id, name) => {
        const msg = `${t('whatif.confirmDeleteMsg', 'Bạn có chắc chắn muốn xóa khoản chi')} "${tCategory(name)}" ${t('whatif.confirmDeleteSuffix', 'khỏi mô phỏng What-If không?')}`;
        showConfirm({
            title: t('whatif.deleteTitle', 'Xác nhận xóa'),
            message: msg,
            confirmText: t('common.delete', 'Xóa'),
            variant: 'danger',
            onConfirm: () => {
                setSpendingCategories(spendingCategories.filter((c) => c.id !== id));
            },
        });
    };

    // Khôi phục về danh mục mặc định ban đầu
    const handleResetSpendingDefaults = () => {
        showConfirm({
            title: t('whatif.resetTitle', 'Khôi phục mặc định'),
            message: t('whatif.confirmResetSpending', 'Khôi phục danh sách các khoản chi tiêu mặc định ban đầu?'),
            confirmText: t('common.confirm', 'Khôi phục'),
            variant: 'warning',
            onConfirm: () => {
                setSpendingCategories(DEFAULT_SPENDING_ITEMS);
            },
        });
    };
    // Thêm khoản nợ vay mới
    const handleAddLoan = (e) => {
        e.preventDefault();
        if (!newLoanName.trim() || !Number(newLoanDebt) || !Number(newLoanPayment)) {
            alert(t('whatif.loanRequiredFields', 'Vui lòng nhập đầy đủ tên khoản nợ, dư nợ gốc và số tiền trả mỗi tháng'));
            return;
        }
        const newLoan = {
            id: `loan-${Date.now()}`,
            name: newLoanName,
            originalDebt: Number(newLoanDebt),
            monthlyPayment: Number(newLoanPayment),
            annualInterestRate: Number(newLoanRate) || 0,
        };
        setExternalLoans([...externalLoans, newLoan]);
        setAddLoanModalOpen(false);
        setNewLoanName('');
        setNewLoanDebt('');
        setNewLoanPayment('');
        setNewLoanRate('0');
    };
    // Xuất bảng dự phóng chi tiết ra Excel (.xlsx)
    const handleExportTableExcel = () => {
        const wb = XLSX.utils.book_new();
        const tableData = detailedMonthlyProjections.map((row) => ({
            [t('whatif.colMilestone', 'Mốc Thời Gian')]: row.label,
            [t('whatif.colIncome', 'Thu Nhập (₫)')]: row.income,
            [t('whatif.colExpenseAfterCut', 'Chi Tiêu Thực Tế (₫)')]: row.actualExpense,
            [t('sim.colCutSavings', 'Tiết Kiệm Nhờ Cắt Giảm (₫)')]: row.cutSavings,
            [t('whatif.colDebtPaid', 'Trả Nợ Vay Ngoài (₫)')]: row.debtPaid,
            [t('whatif.colRemainingDebt', 'Dư Nợ Còn Lại (₫)')]: row.remainingDebtTotal,
            [t('whatif.colSavingsDeposit', 'Gửi Tiết Kiệm Tích Lũy (₫)')]: row.savingsPot,
            [t('whatif.colInvested', 'Đầu Tư Tài Chính (₫)')]: row.investPot,
            [t('whatif.colInvestReturn', 'Lãi/Lỗ Đầu Tư Tháng (₫)')]: row.investReturn,
            [t('whatif.colWhatIfWealth', 'Tài Sản What-If (₫)')]: row.whatIfTotal,
            [t('whatif.colBaselineWealth', 'Kịch Bản Gốc (₫)')]: row.baselineTotal,
            [t('sim.colNetDelta', 'Chênh Lệch Dôi Ra (₫)')]: row.netDelta,
        }));
        const ws = XLSX.utils.json_to_sheet(tableData);
        XLSX.utils.book_append_sheet(wb, ws, 'Du_Bao_Chi_Tiet_What_If');
        XLSX.writeFile(wb, `Bang-Chi-Tiet-Mo-Phong-What-If-${projectionMonths}T.xlsx`);
    };
    return (<div className="space-y-6 pb-16">
      {/* 1. HERO BANNER */}
      <div className="p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 opacity-10">
          <Sparkles className="w-56 h-56"/>
        </div>
        <div className="relative z-10 max-w-4xl">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-extrabold uppercase tracking-wider mb-2.5">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300"/>
            <span>{t('sim.forecastHeading', 'Mô Phỏng Tài Chính & Quản Trị Rủi Ro Chuyên Sâu')}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {t('sim.title', 'Mô Phỏng What-If')}
          </h1>
          <p className="text-xs sm:text-sm text-blue-100 mt-2 leading-relaxed">
            {t('sim.subtitle')}
          </p>
        </div>
      </div>

      {/* 2. TOP IMPACT KPI SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase">{t('sim.currentNetWorth', 'Tài sản hiện tại')}</span>
          <p className="text-xl font-black text-slate-800 dark:text-white mt-1">
            {formatCurrency(startingNetWorth)}
          </p>
          <span className="text-[10px] text-slate-400">{t('whatif.month0', 'Thời điểm Tháng 0')}</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase">
            {t('sim.colCutSavings', 'Tiết kiệm nhờ cắt giảm')}
          </span>
          <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            +{formatCurrency(totalCutSavings)}{t('whatif.perMonth', '/tháng')}
          </p>
          <span className="text-[10px] text-emerald-600 font-semibold">
            {t('budget.usedBudget', 'Đã chọn')} {selectedCuts.length} / {spendingCategories.length} {t('whatif.categoriesSelected', 'danh mục')}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase">
            {t('sim.colDebtPay', 'Trả nợ vay hàng tháng')}
          </span>
          <p className={`text-xl font-black mt-1 ${totalMonthlyDebtPayment > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-white'}`}>
            {hasExternalLoan ? `-${formatCurrency(totalMonthlyDebtPayment)}${t('whatif.perMonth', '/tháng')}` : t('whatif.noDebt', '0 ₫ (Không nợ)')}
          </p>
          <span className="text-[10px] text-slate-400">
            {hasExternalLoan ? `${externalLoans.length} ${t('whatif.externalLoansCount', 'khoản nợ vay ngoài')}` : t('whatif.financialSafety', 'An toàn tài chính')}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-900 to-slate-900 text-white shadow-lg border border-indigo-500/30">
          <span className="text-[11px] font-bold text-indigo-300 uppercase">
            {t('sim.forecastAfter', 'DỰ BÁO SAU')} {projectionMonths} {t('whatif.monthsCount', 'THÁNG')}
          </span>
          <p className="text-xl font-black text-emerald-400 mt-1">
            {formatCurrency(finalRow.whatIfTotal)}
          </p>
          <span className="text-[10px] text-indigo-200">
            {t('whatif.netAssetDeduction', 'Đã trừ nợ & tính rủi ro đầu tư')}
          </span>
        </div>

        <div className={`p-4 rounded-2xl border shadow-sm ${finalDelta >= 0
            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
            : 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'}`}>
          <span className="text-[11px] font-extrabold uppercase flex items-center space-x-1">
            <Zap className="w-3.5 h-3.5 fill-current"/>
            <span>{t('sim.netDelta', 'Chênh lệch Net Gain')}</span>
          </span>
          <p className="text-xl font-black mt-1">
            {finalDelta >= 0 ? '+' : ''}
            {formatCurrency(finalDelta)}
          </p>
          <span className="text-[10px]">
            {finalDelta >= 0 ? t('whatif.surplusVersusOld', 'Dôi ra so với kịch bản cũ') : t('whatif.deficitDueToDebt', 'Thâm hụt do nợ / lỗ')}
          </span>
        </div>
      </div>

      {/* 3. MULTI-ITEM CONTROLS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* COLUMN 1: SPENDING SURVEY & CUT SELECTIONS */}
        <div className="space-y-6 min-w-0">
          {/* ========================================================================= */}
          {/* BƯỚC 1: MỨC TIÊU DÙNG CHI TIÊU CÁ NHÂN HIỆN TẠI (HIỆN MỨC TIÊU DÙNG TRƯỚC) */}
          {/* ========================================================================= */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 text-[11px] font-bold uppercase tracking-wider mb-1">
                  <span>{t('whatif.step1Title', 'Bước 1 • Khảo sát mức tiêu dùng')}</span>
                </div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white">
                  <span>{t('sim.spendingOptTitle', '1. Mức Tiêu Dùng Chi Tiêu Cá Nhân Hiện Tại')} ({spendingCategories.length})</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t('whatif.step1Desc', 'Xem trước mức chi tiêu hàng tháng theo từng khoản của bạn. Bấm "Chọn cắt giảm" để đưa mục đó xuống bảng tối ưu.')}
                </p>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <div className="px-3.5 py-1.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 text-right">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">{t('whatif.totalPersonalExpense', 'Tổng tiêu dùng cá nhân')}</span>
                  <span className="text-sm font-black text-slate-800 dark:text-white">
                    {formatCurrency(totalPersonalExpense)}{t('whatif.perMonth', '/tháng')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleResetSpendingDefaults}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors shrink-0"
                  title={t('whatif.resetDefaults', 'Khôi phục danh mục mặc định')}
                >
                  <RotateCcw className="w-4 h-4"/>
                </button>
                <button
                  type="button"
                  onClick={handleOpenAddExpense}
                  className="flex items-center space-x-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors shrink-0"
                >
                  <Plus className="w-3.5 h-3.5"/>
                  <span>{t('whatif.addExpenseItem', 'Thêm khoản chi')}</span>
                </button>
              </div>
            </div>

            {/* Cảnh báo và hỗ trợ gộp nhanh nếu có khoản chi trùng lặp */}
            {duplicateGroups.length > 0 && (
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center space-x-2.5 text-amber-800 dark:text-amber-200 text-xs">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold block">
                      {t('whatif.duplicateWarning', 'Phát hiện khoản chi bị trùng lặp danh mục. Bạn có thể gộp số tiền lại thành một khoản duy nhất.')}
                    </span>
                    <span className="text-[11px] text-amber-600/80 dark:text-amber-400/80">
                      {duplicateGroups.map(g => tCategory(g[0].categoryName)).join(', ')}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleMergeDuplicates}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0 flex items-center space-x-1.5 self-start sm:self-center"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{t('whatif.mergeDuplicates', 'Gộp các khoản trùng')}</span>
                </button>
              </div>
            )}

            {/* Empty State */}
            {spendingCategories.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/50 text-blue-600 mx-auto flex items-center justify-center">
                  <Wallet className="w-6 h-6"/>
                </div>
                <h4 className="text-sm font-bold text-slate-700 dark:text-white">
                  {t('whatif.noExpensesYet', 'Chưa có khoản chi tiêu nào trong kịch bản')}
                </h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {t('whatif.noExpensesDesc', 'Bạn có thể tự thêm các khoản chi tiêu cá nhân thực tế hoặc khôi phục lại danh mục mẫu ban đầu.')}
                </p>
                <div className="flex items-center justify-center space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={handleResetSpendingDefaults}
                    className="px-3.5 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors flex items-center space-x-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t('whatif.restoreDefaults', 'Khôi phục danh mục mẫu')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenAddExpense}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center space-x-1.5 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t('whatif.addExpenseItem', 'Thêm khoản chi')}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Grid */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {spendingCategories.map((item) => (
                  <div key={item.id} className={`p-3.5 rounded-2xl transition-all border min-w-0 overflow-hidden ${item.isSelected
                    ? 'border-rose-500 bg-rose-50/40 dark:bg-rose-950/20 shadow-sm ring-1 ring-rose-500/30'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-slate-300'}`}>
                    {/* Top: Icon & Category name + Edit/Delete buttons */}
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0" style={{ backgroundColor: item.color }}>
                          <IconHelper name={item.icon} size={16}/>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-slate-800 dark:text-white truncate" title={tCategory(item.categoryName)}>
                            {tCategory(item.categoryName)}
                          </h4>
                          <span className="text-[10px] text-slate-400 block truncate">
                            {t('whatif.personalExpense', 'Chi tiêu cá nhân')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditExpense(item);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors"
                          title={t('whatif.editExpenseItem', 'Chỉnh sửa khoản chi')}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteExpenseItem(item.id, item.categoryName);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                          title={t('whatif.deleteExpenseItem', 'Xóa khoản chi này')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Badge hiển thị xuống dưới */}
                    {item.isSelected && (
                      <div className="mt-2 flex items-center">
                        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800 inline-flex items-center gap-1.5 shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 animate-pulse"/>
                          <span>{t('whatif.cuttingBy', 'Đang giảm')} -{item.cutPercent}%</span>
                        </span>
                      </div>
                    )}

                    {/* Monthly expense input */}
                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs gap-1">
                      <span className="text-[11px] text-slate-500 font-medium truncate">{t('whatif.spendingLevel', 'Mức tiêu dùng:')}</span>
                      <div className="flex items-center space-x-1 shrink-0">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formatNumberWithDots(item.monthlyExpense)}
                          onChange={(e) => {
                            const cleaned = e.target.value.replace(/\D/g, '');
                            const val = cleaned ? Math.max(0, Number(cleaned)) : 0;
                            setSpendingCategories(spendingCategories.map((c) => c.id === item.id ? { ...c, monthlyExpense: val } : c));
                          }}
                          onKeyDown={(e) => {
                            if (['e', 'E', '+', '-', '.', ','].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          className="w-24 sm:w-28 px-2 py-0.5 text-right font-extrabold text-slate-800 dark:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-1 focus:ring-blue-500"
                        />
                        <span className="text-[11px] font-semibold text-slate-400">{t('whatif.currencyPerMonth', '₫/T')}</span>
                      </div>
                    </div>

                    {/* Select/Deselect button */}
                    <button
                      type="button"
                      onClick={() => {
                        setSpendingCategories(spendingCategories.map((c) => c.id === item.id ? { ...c, isSelected: !c.isSelected } : c));
                      }}
                      className={`w-full mt-2.5 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${item.isSelected
                        ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm'
                        : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-rose-300 hover:bg-rose-50/50 dark:hover:bg-rose-950/30 text-slate-700 dark:text-slate-300 hover:text-rose-600'}`}
                    >
                      {item.isSelected ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0"/>
                          <span className="truncate">{t('whatif.selectedCutClickCancel', 'Đang cắt giảm (Hủy)')}</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5 text-rose-500 shrink-0"/>
                          <span className="truncate">{t('whatif.selectToCut', 'Chọn để cắt giảm')}</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* STEP 2: CUT SLIDERS */}
          {/* ========================================================================= */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-[11px] font-bold uppercase tracking-wider mb-1">
                  <span>{t('whatif.step2Title', 'Bước 2 • Tùy chỉnh cắt giảm')}</span>
                </div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white">
                  <span>{t('whatif.selectedCutsHeading', '2. Các Khoản Đã Chọn Để Cắt Giảm')} ({selectedCuts.length})</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t('whatif.step2Desc', 'Kéo thanh trượt hoặc chọn nhanh tỷ lệ cắt giảm (0% - 50%) cho từng khoản bạn đã chọn ở trên')}
                </p>
              </div>

              {selectedCuts.length > 0 && (<div className="px-3 py-1 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 font-extrabold text-xs shrink-0 flex items-center space-x-1.5">
                  <Zap className="w-3.5 h-3.5 fill-current"/>
                  <span>{t('whatif.surplusBadge', 'Dôi ra:')} +{formatCurrency(totalCutSavings)}{t('whatif.perMonth', '/tháng')}</span>
                </div>)}
            </div>

            {selectedCuts.length === 0 ? (<div className="p-8 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 mx-auto flex items-center justify-center">
                  <Sliders className="w-6 h-6"/>
                </div>
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  {t('whatif.noSelectedCuts', 'Chưa có khoản chi tiêu nào được chọn để cắt giảm')}
                </h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  {t('whatif.noSelectedCutsHelp', 'Vui lòng bấm vào nút "+ Chọn để cắt giảm" tại các mục trong bảng "Mức Tiêu Dùng Chi Tiêu Cá Nhân" ở Bước 1 phía trên để thanh trượt cắt giảm xuất hiện tại đây.')}
                </p>
              </div>) : (<div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {selectedCuts.map((cut) => {
                const cutSavings = Math.round(cut.monthlyExpense * (cut.cutPercent / 100));
                const remainingExpense = cut.monthlyExpense - cutSavings;
                return (<div key={cut.id} className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-3 relative group">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: cut.color }}>
                              <IconHelper name={cut.icon} size={18}/>
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-800 dark:text-white">
                                {tCategory(cut.categoryName)}
                              </h4>
                              <span className="text-[10px] text-slate-400">
                                {t('whatif.baselineExpense', 'Mức tiêu dùng gốc:')} {formatCurrency(cut.monthlyExpense)}{t('whatif.perMonth', '/tháng')}
                              </span>
                            </div>
                          </div>

                          <button onClick={() => {
                        setSpendingCategories(spendingCategories.map((c) => c.id === cut.id ? { ...c, isSelected: false } : c));
                    }} className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950 rounded-lg transition-colors" title={t('whatif.deselectCut', 'Bỏ chọn cắt giảm mục này')}>
                            <X className="w-3.5 h-3.5"/>
                          </button>
                        </div>

                        {/* Slider */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500 text-[11px]">{t('whatif.cutRatio', 'Tỷ lệ cắt giảm:')}</span>
                            <span className="font-extrabold text-rose-600 dark:text-rose-400">
                              -{cut.cutPercent}% ({t('whatif.savingsPrefix', 'Tiết kiệm')} +{formatCurrency(cutSavings)}{t('whatif.perMonth', '/tháng')})
                            </span>
                          </div>

                          <input type="range" min="0" max="50" step="5" value={cut.cutPercent} onChange={(e) => {
                        const val = Number(e.target.value);
                        setSpendingCategories(spendingCategories.map((c) => c.id === cut.id ? { ...c, cutPercent: val } : c));
                    }} className="w-full accent-rose-500 cursor-pointer"/>

                          <div className="flex justify-between text-[10px] text-slate-400">
                            <span>0%</span>
                            <span>25%</span>
                            <span>50%</span>
                          </div>

                          {/* Quick buttons */}
                          <div className="flex items-center space-x-1.5 pt-1">
                            <span className="text-[10px] text-slate-400">{t('whatif.quickLabel', 'Nhanh:')}</span>
                            {[10, 20, 30, 50].map((pct) => (<button key={pct} type="button" onClick={() => {
                            setSpendingCategories(spendingCategories.map((c) => c.id === cut.id ? { ...c, cutPercent: pct } : c));
                        }} className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors ${cut.cutPercent === pct
                            ? 'bg-rose-600 text-white'
                            : 'bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-rose-100 hover:text-rose-600'}`}>
                                -{pct}%
                              </button>))}
                          </div>
                        </div>

                        {/* Post cut expense */}
                        <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">{t('whatif.postCutExpense', 'Chi phí sau khi giảm:')}</span>
                          <span className="font-bold text-slate-700 dark:text-slate-200">
                            {formatCurrency(remainingExpense)}{t('whatif.perMonth', '/tháng')}
                          </span>
                        </div>
                      </div>);
            })}
                </div>

                <div className="p-3 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 flex items-center justify-between text-xs">
                  <span className="font-bold text-rose-800 dark:text-rose-300">
                    {t('whatif.totalMonthlySavingsSummary', 'Tổng số tiền cắt giảm dôi ra mỗi tháng')} ({selectedCuts.length} {t('whatif.selectedItems', 'mục đã chọn')}):
                  </span>
                  <span className="text-sm font-black text-rose-600 dark:text-rose-400">
                    +{formatCurrency(totalCutSavings)}{t('whatif.perMonth', '/tháng')}
                  </span>
                </div>
              </div>)}
          </div>
        </div>

        {/* COLUMN 2: TIMEFRAME & CHARTS + INVEST + LOANS */}
        <div className="space-y-6 min-w-0">
          {/* TIMEFRAME & CHARTS */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                {t('whatif.forecastTimeframe', 'Khung Thời Gian Dự Phóng')}
              </h3>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                {projectionMonths} {t('whatif.monthsCount', 'Tháng')}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[6, 12, 24, 36].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setProjectionMonths(m)}
                  className={`py-2 text-xs font-extrabold rounded-xl border transition-all ${
                    projectionMonths === m
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {m}T
                </button>
              ))}
            </div>

            {/* Quick Chart */}
            <div className="h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={detailedMonthlyProjections}
                  margin={{ top: 10, right: 5, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="whatIfGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis
                    tickFormatter={(val) => `${Math.round(val / 1000000)}Tr`}
                    tick={{ fontSize: 10 }}
                    width={40}
                  />
                  <Tooltip
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(val) => formatCurrency(Number(val))}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '4px',
                      color: '#fff',
                      fontSize: '11px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="baselineTotal"
                    name={t('whatif.baselineScenario', 'Kịch bản gốc')}
                    stroke="#94a3b8"
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                    fill="none"
                  />
                  <Area
                    type="monotone"
                    dataKey="whatIfTotal"
                    name={t('whatif.whatifActual', 'What-If Thực Tế')}
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#whatIfGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Insight Note */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
              <strong>{t('whatif.conclusion', 'Kết luận:')}</strong> {t('whatif.afterMonths', 'Sau')} {projectionMonths} {t('whatif.monthsYouCut', 'tháng, bạn cắt giảm được')}{' '}
              <strong>{formatCurrency(totalCutSavings * projectionMonths)}</strong> {t('whatif.expensePaid', 'chi tiêu, trả được')}{' '}
              <strong>{formatCurrency(finalRow.debtPaid * projectionMonths)}</strong> {t('whatif.debtProfitLoss', 'tiền nợ. Lợi nhuận/lỗ đầu tư là')}{' '}
              <strong className={investmentRateScenario >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                {formatCurrency(finalRow.investReturn * projectionMonths)}
              </strong>
              {t('whatif.totalSurplusDelta', '. Tổng chênh lệch tài sản dôi ra là')}{' '}
              <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                {formatCurrency(finalDelta)}
              </span>
              !
            </div>
          </div>

          {/* SECTION B: INVEST & RISK */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-800 dark:text-white">
                <span>{t('whatif.section3Title', '3. Kênh Đầu Tư / Gửi Tiết Kiệm & Tính Toán Rủi Ro Thua Lỗ')}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {t('whatif.section3Desc', 'Mô phỏng cả kịch bản có lãi lẫn thua lỗ đầu tư tài chính (thị trường sụt giảm, mất vốn)')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Channel 1: Safe savings */}
              <div className="p-4 rounded-2xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Building2 className="w-4 h-4 text-blue-600"/>
                    <span className="text-xs font-bold text-blue-900 dark:text-blue-100">
                      {t('whatif.safeSavingsTitle', 'Gửi Tiết Kiệm An Toàn')}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
                    {t('whatif.noRisk', 'Không rủi ro')}
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">
                    {t('whatif.depositMorePerMonth', 'Gửi thêm mỗi tháng:')} <strong>{formatCurrency(savingsAmount)}</strong>
                  </label>
                  <input type="range" min="0" max="5000000" step="200000" value={savingsAmount} onChange={(e) => setSavingsAmount(Number(e.target.value))} className="w-full accent-blue-600 cursor-pointer"/>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">{t('whatif.depositInterestRate', 'Lãi suất gửi (%/năm):')}</span>
                  <input type="number" step="0.1" value={savingsInterestRate} onChange={(e) => setSavingsInterestRate(Number(e.target.value))} className="w-20 px-2 py-1 text-center font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"/>
                </div>
              </div>

              {/* Channel 2: Investments */}
              <div className="p-4 rounded-2xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-purple-600"/>
                    <span className="text-xs font-bold text-purple-900 dark:text-purple-100">
                      {t('whatif.financialInvestTitle', 'Đầu Tư Tài Chính (Cổ phiếu, Quỹ, Coin)')}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full">
                    {t('whatif.hasRisk', 'Có rủi ro')}
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">
                    {t('whatif.investPerMonth', 'Số tiền đầu tư mỗi tháng:')} <strong>{formatCurrency(investmentAmount)}</strong>
                  </label>
                  <input type="range" min="0" max="5000000" step="200000" value={investmentAmount} onChange={(e) => setInvestmentAmount(Number(e.target.value))} className="w-full accent-purple-600 cursor-pointer"/>
                </div>

                {/* Scenario */}
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1 font-semibold">
                    {t('whatif.scenarioReturnLoss', 'Kịch bản sinh lời / Thua lỗ (%/năm):')}
                  </label>
                  <div className="grid grid-cols-4 gap-1.5 text-[10px] font-bold">
                    <button type="button" onClick={() => setInvestmentRateScenario(12)} className={`p-1.5 rounded-lg border transition-colors ${investmentRateScenario === 12
            ? 'bg-emerald-600 text-white border-emerald-600'
            : 'bg-white dark:bg-slate-900 text-emerald-600 border-emerald-200'}`}>
                      {t('whatif.profit12', 'Lãi +12%')}
                    </button>
                    <button type="button" onClick={() => setInvestmentRateScenario(8.5)} className={`p-1.5 rounded-lg border transition-colors ${investmentRateScenario === 8.5
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white dark:bg-slate-900 text-blue-600 border-blue-200'}`}>
                      {t('whatif.profit85', 'Lãi +8.5%')}
                    </button>
                    <button type="button" onClick={() => setInvestmentRateScenario(-10)} className={`p-1.5 rounded-lg border transition-colors ${investmentRateScenario === -10
            ? 'bg-rose-600 text-white border-rose-600'
            : 'bg-white dark:bg-slate-900 text-rose-600 border-rose-200'}`}>
                      {t('whatif.loss10', 'Lỗ -10%')}
                    </button>
                    <button type="button" onClick={() => setInvestmentRateScenario(-25)} className={`p-1.5 rounded-lg border transition-colors ${investmentRateScenario === -25
            ? 'bg-rose-700 text-white border-rose-700'
            : 'bg-white dark:bg-slate-900 text-rose-700 border-rose-200'}`}>
                      {t('whatif.loss25', 'Lỗ nặng -25%')}
                    </button>
                  </div>

                  {investmentRateScenario < 0 && (<p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 mt-2 flex items-center space-x-1">
                      <AlertTriangle className="w-3.5 h-3.5"/>
                      <span>
                        {t('whatif.crashAlert', 'Đang mô phỏng thị trường sập: Vốn đầu tư bị lỗ')} {Math.abs(investmentRateScenario)}{t('common.perYear', '%/năm')}!
                      </span>
                    </p>)}
                </div>
              </div>
            </div>
          </div>

          {/* PHẦN C: KHOẢN VAY NGOÀI & NGHĨA VỤ TRẢ NỢ (External Loans & Debt Service) */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-3">
                <input type="checkbox" id="toggleLoans" checked={hasExternalLoan} onChange={(e) => setHasExternalLoan(e.target.checked)} className="w-4 h-4 accent-rose-600 rounded cursor-pointer"/>
                <div>
                  <label htmlFor="toggleLoans" className="text-base font-bold text-slate-800 dark:text-white cursor-pointer">
                    <span>{t('whatif.section4Title', '4. Tính Thêm Các Khoản Vay Ngoài & Nghĩa Vụ Trả Nợ')}</span>
                  </label>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {t('whatif.section4Desc', 'Hệ thống tự động trừ tiền gốc + lãi vay vào dòng tiền và giảm dần dư nợ theo từng tháng')}
                  </p>
                </div>
              </div>

              {hasExternalLoan && (<button onClick={() => setAddLoanModalOpen(true)} className="flex items-center space-x-1 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900 text-amber-700 dark:text-amber-300 font-bold text-xs rounded-xl transition-colors shrink-0">
                  <Plus className="w-3.5 h-3.5"/>
                  <span>{t('whatif.addLoanBtn', 'Thêm khoản nợ vay')}</span>
                </button>)}
            </div>

            {hasExternalLoan ? (<div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {externalLoans.map((loan) => (<div key={loan.id} className="p-3.5 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-2 relative group">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-xs font-bold text-amber-900 dark:text-amber-100">
                            {tCategory(loan.name)}
                          </h4>
                          <span className="text-[11px] text-amber-700 dark:text-amber-300">
                            {t('whatif.remainingPrincipal', 'Gốc còn lại:')} {formatCurrency(loan.originalDebt)} • {t('whatif.interestPerYr', 'Lãi:')} {loan.annualInterestRate}{t('common.perYear', '%/năm')}
                          </span>
                        </div>
                        <button onClick={() => setExternalLoans(externalLoans.filter((l) => l.id !== loan.id))} className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors">
                          <Trash2 className="w-3.5 h-3.5"/>
                        </button>
                      </div>

                      <div className="flex justify-between text-xs pt-1 border-t border-amber-200/50 dark:border-amber-900/30">
                        <span className="text-slate-500">{t('whatif.mustPayMonthly', 'Phải trả hàng tháng:')}</span>
                        <span className="font-extrabold text-rose-600 dark:text-rose-400">
                          -{formatCurrency(loan.monthlyPayment)}{t('whatif.perMonth', '/tháng')}
                        </span>
                      </div>
                    </div>))}
                </div>

                <div className="p-3 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 flex items-center justify-between text-xs">
                  <span className="font-bold text-rose-800 dark:text-rose-300">
                    {t('whatif.totalDebtPressure', 'Tổng áp lực trả nợ vay ngoài mỗi tháng:')}
                  </span>
                  <span className="text-sm font-black text-rose-600 dark:text-rose-400">
                    -{formatCurrency(totalMonthlyDebtPayment)}{t('whatif.perMonth', '/tháng')}
                  </span>
                </div>
              </div>) : (<p className="text-xs text-slate-400 italic">
                {t('whatif.zeroDebtMode', 'Chế độ không có nợ vay ngoài đang bật. Dòng tiền tiết kiệm sẽ không bị khấu trừ nợ.')}
              </p>)}
          </div>
        </div>
      </div>

      {/* 4. BẢNG PHÂN TÍCH CỤ THỂ CHI TIẾT TỪNG THÁNG (Detailed Month-by-Month Table) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white">
              <span>{t('whatif.monthlyTableTitle', 'Bảng Phân Tích Dòng Tiền & Tài Sản Chi Tiết Từng Tháng')}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {t('whatif.monthlyTableDesc', 'Chi tiết thu nhập, chi tiêu đã giảm, trả nợ vay ngoài, lãi/lỗ đầu tư và tài sản tích lũy qua từng cột')}
            </p>
          </div>

          <button onClick={handleExportTableExcel} className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors shrink-0">
            <FileSpreadsheet className="w-4 h-4"/>
            <span>{t('whatif.exportExcelBtn', 'Xuất Bảng Sang Excel (.xlsx)')}</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">{t('whatif.colMilestone', 'Mốc')}</th>
                <th className="px-4 py-3">{t('whatif.colIncome', 'Thu nhập (₫)')}</th>
                <th className="px-4 py-3">{t('whatif.colExpenseAfterCut', 'Chi tiêu sau giảm (₫)')}</th>
                <th className="px-4 py-3 text-rose-600">{t('whatif.colDebtPaid', 'Trả nợ vay (₫)')}</th>
                <th className="px-4 py-3">{t('whatif.colRemainingDebt', 'Dư nợ còn lại (₫)')}</th>
                <th className="px-4 py-3 text-blue-600">{t('whatif.colSavingsDeposit', 'Gửi tiết kiệm (₫)')}</th>
                <th className="px-4 py-3 text-purple-600">{t('whatif.colInvested', 'Đầu tư (₫)')}</th>
                <th className="px-4 py-3">{t('whatif.colInvestReturn', 'Lãi / Lỗ đầu tư (₫)')}</th>
                <th className="px-4 py-3 font-extrabold text-indigo-600">{t('whatif.colWhatIfWealth', 'Tài sản What-If (₫)')}</th>
                <th className="px-4 py-3">{t('whatif.colBaselineWealth', 'Kịch bản gốc (₫)')}</th>
                <th className="px-4 py-3 font-extrabold text-emerald-600">Net Gain (₫)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {detailedMonthlyProjections.map((row) => (<tr key={row.monthIndex} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-800 dark:text-white whitespace-nowrap">
                    {row.label}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {formatCurrency(row.income)}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {formatCurrency(row.actualExpense)}
                  </td>
                  <td className="px-4 py-3 text-rose-600 dark:text-rose-400 font-semibold whitespace-nowrap">
                    {row.debtPaid > 0 ? `-${formatCurrency(row.debtPaid)}` : '-'}
                  </td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                    {row.remainingDebtTotal > 0 ? formatCurrency(row.remainingDebtTotal) : '0 ₫'}
                  </td>
                  <td className="px-4 py-3 text-blue-600 dark:text-blue-400 font-semibold whitespace-nowrap">
                    {formatCurrency(row.savingsPot)}
                  </td>
                  <td className="px-4 py-3 text-purple-600 dark:text-purple-400 font-semibold whitespace-nowrap">
                    {formatCurrency(row.investPot)}
                  </td>
                  <td className={`px-4 py-3 font-bold whitespace-nowrap ${row.investReturn >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'}`}>
                    {row.investReturn > 0 ? `+${formatCurrency(row.investReturn)}` : formatCurrency(row.investReturn)}
                  </td>
                  <td className="px-4 py-3 font-black text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                    {formatCurrency(row.whatIfTotal)}
                  </td>
                  <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                    {formatCurrency(row.baselineTotal)}
                  </td>
                  <td className={`px-4 py-3 font-extrabold whitespace-nowrap ${row.netDelta >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'}`}>
                    {row.netDelta >= 0 ? `+${formatCurrency(row.netDelta)}` : formatCurrency(row.netDelta)}
                  </td>
                </tr>))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: THÊM / CHỈNH SỬA KHOẢN CHI TIÊU WHAT-IF */}
      {/* ========================================================================= */}
      {expenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative max-w-lg w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 my-8">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                  <Wallet className="w-5 h-5"/>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">
                    {editingExpenseId
                      ? t('whatif.editExpenseModal', 'Chỉnh sửa khoản chi What-If')
                      : t('whatif.addExpenseModal', 'Thêm khoản chi tiêu What-If')}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {editingExpenseId
                      ? t('whatif.editExpenseDesc', 'Cập nhật thông tin chi tiêu và mức cắt giảm kịch bản')
                      : t('whatif.addExpenseDesc', 'Thêm khoản chi cá nhân mới vào bảng khảo sát và mô phỏng')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExpenseModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5"/>
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-4 pt-4">
              {/* Type Switcher: Choose from categories OR Custom */}
              <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setExpenseSourceType('category');
                    const existingCatIds = new Set(
                      spendingCategories
                        .filter((c) => c.categoryId && c.categoryId !== 'custom' && c.id !== editingExpenseId)
                        .map((c) => c.categoryId)
                    );
                    const cat = categories.find((c) => c.type === 'EXPENSE' && !existingCatIds.has(c.id))
                      || categories.find((c) => c.type === 'EXPENSE')
                      || categories[0];
                    if (cat) {
                      setSelectedCatId(cat.id);
                      setCustomExpenseName(cat.name);
                      setCustomExpenseIcon(cat.icon || 'Utensils');
                      setCustomExpenseColor(cat.color || '#3b82f6');
                    }
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    expenseSourceType === 'category'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  {t('whatif.fromCategoryTab', 'Chọn từ danh mục mẫu')}
                </button>
                <button
                  type="button"
                  onClick={() => setExpenseSourceType('custom')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    expenseSourceType === 'custom'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  {t('whatif.customExpenseTab', 'Tự tạo tùy chỉnh')}
                </button>
              </div>

              {/* Source 1: Pick from category */}
              {expenseSourceType === 'category' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    {t('whatif.selectCategoryLabel', 'Chọn danh mục chi tiêu')}
                  </label>
                  <select
                    value={selectedCatId}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {categories
                      .filter((c) => c.type === 'EXPENSE')
                      .map((c) => {
                        const isAlreadyAdded = spendingCategories.some(
                          (item) => item.categoryId === c.id && item.id !== editingExpenseId
                        );
                        return (
                          <option key={c.id} value={c.id} disabled={isAlreadyAdded}>
                            {tCategory(c.name)} {isAlreadyAdded ? `(${t('whatif.alreadyInList', 'Đã có trong danh sách')})` : ''}
                          </option>
                        );
                      })}
                  </select>

                  {/* Category Preview */}
                  <div className="mt-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center space-x-2.5">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: customExpenseColor }}
                    >
                      <IconHelper name={customExpenseIcon} size={15}/>
                    </div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      {tCategory(customExpenseName)}
                    </span>
                  </div>
                </div>
              ) : (
                /* Source 2: Custom name, icon, color */
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      {t('whatif.customExpenseNameLabel', 'Tên khoản chi tiêu')}
                    </label>
                    <input
                      type="text"
                      required
                      value={customExpenseName}
                      onChange={(e) => setCustomExpenseName(e.target.value)}
                      placeholder={t('whatif.customExpenseNamePlaceholder', 'Ví dụ: Nuôi thú cưng, Tiền gửi về quê, Bảo hiểm...')}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  {/* Icon Selector */}
                  <div>
                    <label id="whatif-icon-label" className="block text-xs font-semibold text-slate-500 mb-1">
                      {t('whatif.chooseIcon', 'Chọn biểu tượng đại diện')}
                    </label>
                    <div role="radiogroup" aria-labelledby="whatif-icon-label" className="grid grid-cols-8 gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 max-h-32 overflow-y-auto">
                      {[
                        'Utensils', 'ShoppingBag', 'Home', 'Car', 'Gamepad2', 'HeartPulse',
                        'GraduationCap', 'Gift', 'Plane', 'Laptop', 'Flame', 'Wallet',
                        'Receipt', 'Coins', 'Store', 'MoreHorizontal'
                      ].map((iconName) => {
                        const iconLabel = getIconLabel(iconName, language);
                        const isSelected = customExpenseIcon === iconName;
                        return (
                          <button
                            key={iconName}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            aria-label={iconLabel}
                            title={iconLabel}
                            onClick={() => setCustomExpenseIcon(iconName)}
                            onMouseEnter={() => setHoveredIcon(iconName)}
                            onMouseLeave={() => setHoveredIcon(null)}
                            onFocus={() => setHoveredIcon(iconName)}
                            onBlur={() => setHoveredIcon(null)}
                            className={`p-2 rounded-lg flex items-center justify-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-xs scale-105'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            <IconHelper name={iconName} size={16}/>
                          </button>
                        );
                      })}
                    </div>
                    {/* Gợi ý: tên biểu tượng đang chọn + hướng dẫn */}
                    <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] min-h-5">
                      <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200" aria-live="polite">
                        <span
                          className="w-5 h-5 rounded-md flex items-center justify-center text-white shrink-0"
                          style={{ backgroundColor: hoveredIcon && hoveredIcon !== customExpenseIcon ? '#94a3b8' : customExpenseColor }}
                        >
                          <IconHelper name={hoveredIcon || customExpenseIcon} size={12}/>
                        </span>
                        {hoveredIcon && hoveredIcon !== customExpenseIcon
                          ? getIconLabel(hoveredIcon, language)
                          : `${t('whatif.selectedIcon', 'Đang chọn:')} ${getIconLabel(customExpenseIcon, language)}`}
                      </span>
                      <span className="text-slate-400 text-right">
                        {t('whatif.iconHint', 'Di chuột hoặc chạm vào biểu tượng để xem tên')}
                      </span>
                    </div>
                  </div>

                  {/* Color Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      {t('whatif.chooseColor', 'Chọn màu sắc nhận diện')}
                    </label>
                    <div className="flex flex-wrap gap-2 pt-0.5">
                      {[
                        '#f97316', '#ec4899', '#8b5cf6', '#3b82f6', '#0ea5e9',
                        '#10b981', '#eab308', '#ef4444', '#64748b', '#6366f1'
                      ].map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setCustomExpenseColor(color)}
                          style={{ backgroundColor: color }}
                          className={`w-6 h-6 rounded-full transition-transform ${
                            customExpenseColor === color ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : 'hover:scale-105'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Monthly Amount Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  {t('whatif.currentMonthlyExpense', 'Chi tiêu gốc hiện tại mỗi tháng (VNĐ)')}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={formatNumberWithDots(expenseAmount)}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/\D/g, '');
                      if (cleaned.length <= 12) {
                        setExpenseAmount(cleaned);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (['e', 'E', '+', '-', '.', ','].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    placeholder="2.000.000"
                    className="w-full text-xl font-black px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    {t('whatif.perMonthUnit', 'VNĐ / Tháng')}
                  </span>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[500000, 1000000, 2000000, 3000000, 5000000, 10000000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setExpenseAmount(String(preset))}
                      className="px-2 py-0.5 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-950 text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 transition-colors"
                    >
                      {preset >= 1000000 ? `${preset / 1000000}${language === 'en' ? 'M' : 'Tr'}` : `${preset / 1000}k`}
                    </button>
                  ))}
                </div>
              </div>

              {/* What-If Cut Option */}
              <div className="p-3.5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 space-y-2.5">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={expenseApplyCut}
                    onChange={(e) => setExpenseApplyCut(e.target.checked)}
                    className="w-4 h-4 accent-rose-600 rounded cursor-pointer"
                  />
                  <span className="text-xs font-bold text-rose-900 dark:text-rose-200">
                    {t('whatif.applyCutImmediately', 'Áp dụng cắt giảm ngay trong kịch bản')}
                  </span>
                </label>

                {expenseApplyCut && (
                  <div className="space-y-2 pt-1 border-t border-rose-200/60 dark:border-rose-900/40">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-400 font-medium">
                        {t('whatif.initialCutPercent', 'Tỷ lệ muốn cắt giảm ban đầu (%)')}
                      </span>
                      <span className="font-extrabold text-rose-600 dark:text-rose-400">
                        -{expenseCutPercent}%
                      </span>
                    </div>

                    <input
                      type="range"
                      min="0"
                      max="50"
                      step="5"
                      value={expenseCutPercent}
                      onChange={(e) => setExpenseCutPercent(e.target.value)}
                      className="w-full accent-rose-500 cursor-pointer"
                    />

                    <div className="flex items-center space-x-1.5">
                      {[10, 20, 30, 50].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setExpenseCutPercent(String(pct))}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors ${
                            Number(expenseCutPercent) === pct
                              ? 'bg-rose-600 text-white'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          -{pct}%
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setExpenseModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  {t('common.cancel', 'Hủy')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-colors"
                >
                  {editingExpenseId
                    ? t('whatif.saveExpenseBtn', 'Lưu khoản chi')
                    : t('whatif.addExpenseBtn', 'Thêm vào kịch bản')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: THÊM KHOẢN VAY NGOÀI / NỢ CẦN TRẢ */}
      {/* ========================================================================= */}
      {addLoanModalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                {t('whatif.addLoanModal', 'Thêm khoản vay ngoài / Nợ phải trả')}
              </h3>
              <button onClick={() => setAddLoanModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5"/>
              </button>
            </div>

            <form onSubmit={handleAddLoan} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  {t('whatif.loanNameLabel', 'Tên khoản nợ / Đối tác vay')}
                </label>
                <input type="text" required value={newLoanName} onChange={(e) => setNewLoanName(e.target.value)} placeholder={t('whatif.loanNamePlaceholder', 'Ví dụ: Vay mua xe máy, Vay người thân...')} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white"/>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  {t('whatif.remainingDebtLabel', 'Dư nợ gốc còn lại (VNĐ)')}
                </label>
                <input type="text" inputMode="numeric" required value={formatNumberWithDots(newLoanDebt)} onChange={(e) => {
                const cleaned = e.target.value.replace(/\D/g, '');
                if (cleaned.length <= 12) {
                    setNewLoanDebt(cleaned);
                }
            }} onKeyDown={(e) => {
                if (['e', 'E', '+', '-', '.', ','].includes(e.key)) {
                    e.preventDefault();
                }
            }} placeholder="20.000.000" className="w-full text-xl font-bold px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white"/>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  {t('whatif.monthlyDebtPaymentLabel', 'Số tiền phải trả mỗi tháng (VNĐ)')}
                </label>
                <input type="text" inputMode="numeric" required value={formatNumberWithDots(newLoanPayment)} onChange={(e) => {
                const cleaned = e.target.value.replace(/\D/g, '');
                if (cleaned.length <= 12) {
                    setNewLoanPayment(cleaned);
                }
            }} onKeyDown={(e) => {
                if (['e', 'E', '+', '-', '.', ','].includes(e.key)) {
                    e.preventDefault();
                }
            }} placeholder="2.000.000" className="w-full text-xl font-bold px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white"/>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  {t('whatif.loanInterestRateLabel', 'Lãi suất vay (%/năm, nếu có)')}
                </label>
                <input type="number" step="0.5" value={newLoanRate} onChange={(e) => setNewLoanRate(e.target.value)} placeholder="0" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white"/>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setAddLoanModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl">
                  {t('common.cancel', 'Hủy')}
                </button>
                <button type="submit" className="px-5 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-sm">
                  {t('whatif.saveLoanBtn', 'Lưu khoản nợ')}
                </button>
              </div>
            </form>
          </div>
        </div>)}
    </div>);
};
