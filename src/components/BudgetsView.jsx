'use client';
import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Plus, AlertTriangle, ShieldAlert, CheckCircle2, Edit2, Trash2, ArrowUpRight, ArrowDownLeft, Calendar, Sparkles, DollarSign, X, Target, ReceiptText, Save, Check, Bell, BellOff, } from 'lucide-react';
import { formatCurrency, calculateBudgetStatuses, formatNumberWithDots } from '@/lib/utils';
import { IconHelper } from './IconHelper';
import confetti from 'canvas-confetti';
export const BudgetsView = () => {
    const { budgets, transactions, categories, goals, wallets, bills, planner, currentMonth, addBudget, editBudget, deleteBudget, updatePlanner, addGoal, editGoal, deleteGoal, depositToGoal, withdrawFromGoal, navTargetBudgetId, setNavTargetBudgetId, navigateToCategoryTransactions, saveDataNow, serverSyncStatus, t, tCategory, tWalletType, tWalletName, language, isAlertDismissed, dismissAlert, restoreAlert, } = useApp();
    const [activeSubTab, setActiveSubTab] = useState('CATEGORY_BUDGETS');
    const [isSavingPlanner, setIsSavingPlanner] = useState(false);
    const [plannerSavedToast, setPlannerSavedToast] = useState(false);
    // Modals
    const [budgetModalOpen, setBudgetModalOpen] = useState(false);
    const [editingBudget, setEditingBudget] = useState(null);
    const [budgetCategoryId, setBudgetCategoryId] = useState('');
    const [budgetAmount, setBudgetAmount] = useState('');
    const [goalModalOpen, setGoalModalOpen] = useState(false);
    const [editingGoal, setEditingGoal] = useState(null);
    const [goalName, setGoalName] = useState('');
    const [goalTarget, setGoalTarget] = useState('');
    const [goalCategory, setGoalCategory] = useState('');
    const [goalDeadline, setGoalDeadline] = useState('');
    const [goalColor, setGoalColor] = useState('#10b981');
    const [goalIcon, setGoalIcon] = useState('Target');
    // Deposit/Withdraw Modal
    const [depositModalOpen, setDepositModalOpen] = useState(false);
    const [selectedGoal, setSelectedGoal] = useState(null);
    const [depositAmount, setDepositAmount] = useState('');
    const [depositWalletId, setDepositWalletId] = useState(wallets[0]?.id || '');
    const [depositNote, setDepositNote] = useState('');
    const [isDepositMode, setIsDepositMode] = useState(true); // true = deposit, false = withdraw
    // Respond to deep-link navigation from Trung tâm Cảnh báo
    useEffect(() => {
        if (navTargetBudgetId) {
            setActiveSubTab('CATEGORY_BUDGETS');
            setTimeout(() => {
                const el = document.getElementById(`budget-card-${navTargetBudgetId}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 150);
        }
    }, [navTargetBudgetId]);
    // Calculate budget statuses
    const budgetStatuses = calculateBudgetStatuses(budgets, transactions, currentMonth);
    const totalBudgetLimit = budgets.reduce((sum, b) => sum + b.amount, 0);
    const totalBudgetSpent = budgetStatuses.reduce((sum, b) => sum + b.spent, 0);
    const totalBudgetRemaining = totalBudgetLimit - totalBudgetSpent;
    // Income Planner calculations
    const monthlyIncome = planner.monthlyIncome;
    const needsBudget = (monthlyIncome * (planner.needsPercent ?? 50)) / 100;
    const wantsBudget = (monthlyIncome * (planner.wantsPercent ?? 25)) / 100;
    const savingsBudget = (monthlyIncome * (planner.savingsPercent ?? 15)) / 100;
    const emergencyPercent = planner.emergencyPercent !== undefined ? planner.emergencyPercent : 10;
    const emergencyBudget = (monthlyIncome * emergencyPercent) / 100;
    const totalMonthlyBills = bills.reduce((sum, b) => sum + b.amount, 0);
    const availableFlexibleBudget = Math.max(0, monthlyIncome - totalMonthlyBills - savingsBudget - emergencyBudget);
    const totalPercent = (planner.needsPercent ?? 50) + (planner.wantsPercent ?? 25) + (planner.savingsPercent ?? 15) + emergencyPercent;
    // Save or edit budget
    const handleSaveBudget = (e) => {
        e.preventDefault();
        const amountNum = Number(budgetAmount);
        if (!budgetCategoryId || !amountNum || amountNum <= 0) {
            alert(t('qa.selectCategory', 'Vui lòng chọn danh mục và nhập hạn mức ngân sách'));
            return;
        }
        const cat = categories.find((c) => c.id === budgetCategoryId);
        if (editingBudget) {
            editBudget(editingBudget.id, {
                categoryId: budgetCategoryId,
                categoryName: cat?.name || tCategory('Khác'),
                amount: amountNum,
            });
        }
        else {
            addBudget({
                categoryId: budgetCategoryId,
                categoryName: cat?.name || tCategory('Khác'),
                amount: amountNum,
                month: currentMonth,
                alertThreshold80: true,
                alertThreshold100: true,
            });
        }
        setBudgetModalOpen(false);
        setEditingBudget(null);
    };
    // Save or edit goal
    const handleSaveGoal = (e) => {
        e.preventDefault();
        const targetNum = Number(goalTarget);
        if (!goalName.trim() || !targetNum || targetNum <= 0) {
            alert('Vui lòng nhập tên mục tiêu và số tiền');
            return;
        }
        if (editingGoal) {
            editGoal(editingGoal.id, {
                name: goalName,
                targetAmount: targetNum,
                deadline: goalDeadline,
                color: goalColor,
            });
        }
        else {
            addGoal({
                name: goalName,
                targetAmount: targetNum,
                currentAmount: 0,
                deadline: goalDeadline || '2026-12-31',
                color: goalColor,
                icon: 'PiggyBank',
            });
        }
        setGoalModalOpen(false);
        setEditingGoal(null);
    };
    // Deposit or Withdraw from goal
    const handleGoalTransaction = (e) => {
        e.preventDefault();
        if (!selectedGoal)
            return;
        const amountNum = Number(depositAmount);
        if (!amountNum || amountNum <= 0) {
            alert('Vui lòng nhập số tiền hợp lệ');
            return;
        }
        if (isDepositMode) {
            depositToGoal(selectedGoal.id, amountNum, depositWalletId, depositNote);
            // If goal reaches 100%, trigger celebration!
            if (selectedGoal.currentAmount + amountNum >= selectedGoal.targetAmount) {
                try {
                    confetti({
                        particleCount: 100,
                        spread: 70,
                        origin: { y: 0.6 },
                    });
                }
                catch {
                    // ignore
                }
            }
        }
        else {
            withdrawFromGoal(selectedGoal.id, amountNum, depositWalletId, depositNote);
        }
        setDepositModalOpen(false);
        setSelectedGoal(null);
        setDepositAmount('');
    };
    return (<div className="space-y-6 pb-12">
      {/* 1. HEADER & SUB-TABS */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
            {t('budget.title', 'Ngân Sách & Hũ Tiết Kiệm')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('budget.subtitle', 'Cài đặt hạn mức chi tiêu, cảnh báo 80%/100%, tạo budget từ thu nhập cá nhân & theo dõi hũ tích lũy')}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {activeSubTab === 'CATEGORY_BUDGETS' && (<button onClick={() => {
                setEditingBudget(null);
                setBudgetCategoryId(categories[0]?.id || '');
                setBudgetAmount('');
                setBudgetModalOpen(true);
            }} className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors">
              <Plus className="w-4 h-4"/>
              <span>{t('budget.addLimit', 'Thêm hạn mức danh mục')}</span>
            </button>)}

          {activeSubTab === 'SAVINGS_GOALS' && (<button onClick={() => {
                setEditingGoal(null);
                setGoalName('');
                setGoalTarget('');
                setGoalDeadline('2026-12-31');
                setGoalModalOpen(true);
            }} className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors">
              <Plus className="w-4 h-4"/>
              <span>{t('budget.newGoal', 'Tạo hũ tiết kiệm mới')}</span>
            </button>)}
        </div>
      </div>

      {/* SUB-TABS SELECTOR */}
      <div className="flex space-x-2 border-b border-slate-200 dark:border-slate-800 pb-1">
        <button onClick={() => setActiveSubTab('CATEGORY_BUDGETS')} className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${activeSubTab === 'CATEGORY_BUDGETS'
            ? 'bg-blue-600 text-white shadow-sm'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
          {t('budget.tabLimits', 'Hạn mức theo Danh mục')} ({budgets.length})
        </button>

        <button onClick={() => setActiveSubTab('PLANNER')} className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${activeSubTab === 'PLANNER'
            ? 'bg-blue-600 text-white shadow-sm'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
          {t('budget.tabAllocation', 'Tạo Budget từ Thu nhập (50/30/20)')}
        </button>

        <button onClick={() => setActiveSubTab('SAVINGS_GOALS')} className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${activeSubTab === 'SAVINGS_GOALS'
            ? 'bg-blue-600 text-white shadow-sm'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
          {t('budget.tabGoals', 'Hũ Tiết Kiệm & Mục tiêu')} ({goals.length})
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: HẠN MỨC DANH MỤC & CẢNH BÁO 80% / 100% */}
      {/* ========================================================================= */}
      {activeSubTab === 'CATEGORY_BUDGETS' && (<div className="space-y-6">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase">{t('budget.totalBudget', 'Tổng ngân sách thiết lập')}</span>
              <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">
                {formatCurrency(totalBudgetLimit)}
              </p>
              <span className="text-[11px] text-slate-400">{t('budget.forMonth', 'Áp dụng cho tháng')} 09/2026</span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase">{t('budget.actualSpent', 'Đã chi tiêu thực tế')}</span>
              <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                {formatCurrency(totalBudgetSpent)}
              </p>
              <span className="text-[11px] text-slate-400">
                {t('budget.usedBudget', 'Đã dùng')} {totalBudgetLimit > 0 ? Math.round((totalBudgetSpent / totalBudgetLimit) * 100) : 0}% {t('budget.totalBudget', 'tổng ngân sách')}
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase">{t('budget.remaining', 'Ngân sách còn lại')}</span>
              <p className={`text-2xl font-black mt-1 ${totalBudgetRemaining >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {formatCurrency(totalBudgetRemaining)}
              </p>
              <span className="text-[11px] text-slate-400">
                {totalBudgetRemaining >= 0 ? t('budget.canSpend', 'Có thể chi tiêu tiếp tục') : t('budget.overLimit', 'Đã chi vượt hạn mức')}
              </span>
            </div>
          </div>

          {/* Category Budgets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {budgetStatuses.map((item) => {
                const { budget, spent, remaining, percentage, status } = item;
                const cat = categories.find((c) => c.id === budget.categoryId);
                const isHighlighted = navTargetBudgetId === budget.id;
                return (<div key={budget.id} id={`budget-card-${budget.id}`} className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border transition-all relative overflow-hidden ${isHighlighted
                        ? 'ring-4 ring-rose-500/80 dark:ring-rose-400/80 shadow-2xl scale-[1.02] border-rose-500'
                        : status === 'EXCEEDED'
                            ? 'border-rose-400 dark:border-rose-800 shadow-md shadow-rose-500/10'
                            : status === 'WARNING'
                                ? 'border-amber-400 dark:border-amber-800 shadow-md shadow-amber-500/10'
                                : 'border-slate-200 dark:border-slate-800 shadow-sm'}`}>
                  {/* Top: Icon & Category name & Badge */}
                  <div className="flex items-start justify-between mb-2">
                    <div onClick={() => navigateToCategoryTransactions(budget.categoryId)} className="flex items-center space-x-3 cursor-pointer group/title" title={t('budget.viewTxTitle', 'Xem danh sách giao dịch đã chi của danh mục này')}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm group-hover/title:scale-105 transition-transform" style={{ backgroundColor: cat?.color || '#6366f1' }}>
                        <IconHelper name={cat?.icon || 'CircleDot'} size={20}/>
                      </div>
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <h3 className="text-sm font-bold text-slate-800 dark:text-white group-hover/title:text-blue-600 dark:group-hover/title:text-blue-400 transition-colors">
                            {tCategory(budget.categoryName)}
                          </h3>
                          {isHighlighted && (<span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-rose-600 text-white animate-pulse">
                              {t('notif.activeAlert', 'Đang xem cảnh báo')}
                            </span>)}
                        </div>
                        <span className="text-[11px] text-slate-400">{t('budget.monthLabel', 'Tháng')} 09/2026</span>
                      </div>
                    </div>

                    {/* Alert Badge */}
                    {status === 'EXCEEDED' && (<span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 animate-pulse">
                        <ShieldAlert className="w-3 h-3"/>
                        <span>{t('budget.overLimit', 'VƯỢT')} {percentage}%</span>
                      </span>)}

                    {status === 'WARNING' && (<span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300">
                        <AlertTriangle className="w-3 h-3"/>
                        <span>{t('budget.warning80', 'CẢNH BÁO 80%')}</span>
                      </span>)}

                    {status === 'SAFE' && (<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                        {t('budget.safe', 'An toàn')} ({percentage}%)
                      </span>)}
                  </div>

                  {/* Status Banner when Over-budget or Warning */}
                  {status === 'EXCEEDED' && (<div className="flex items-center justify-between p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 my-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-300 min-w-0 pr-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0"/>
                        <span className="truncate">
                          {t('budget.exceededAlertMsg', 'Đã vượt ngân sách')} {formatCurrency(Math.abs(remaining))}!
                        </span>
                      </div>
                      {isAlertDismissed(`budget-${budget.id}`) ? (<button type="button" onClick={(e) => {
                                e.stopPropagation();
                                restoreAlert(`budget-${budget.id}`);
                            }} className="px-2 py-0.5 bg-white dark:bg-slate-800 text-[10px] font-bold text-slate-500 hover:text-rose-600 dark:hover:text-rose-300 rounded-md border border-slate-200 dark:border-slate-700 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs shrink-0" title={t('budget.restoreAlertTip', 'Bật lại chuông cảnh báo')}>
                          <BellOff className="w-3 h-3 text-slate-400"/>
                          <span>{t('budget.muted', 'Chuông: Tắt')}</span>
                        </button>) : (<button type="button" onClick={(e) => {
                                e.stopPropagation();
                                dismissAlert(`budget-${budget.id}`);
                            }} className="px-2 py-0.5 bg-white dark:bg-slate-800 text-[10px] font-bold text-rose-600 hover:text-slate-600 dark:hover:text-slate-300 rounded-md border border-rose-200 dark:border-rose-800 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs shrink-0" title={t('budget.dismissAlertTip', 'Tắt thông báo chuông cho mục này')}>
                          <Bell className="w-3 h-3 text-rose-500"/>
                          <span>{t('budget.bellActive', 'Chuông: Bật')}</span>
                        </button>)}
                    </div>)}

                  {status === 'WARNING' && (<div className="flex items-center justify-between p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 my-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 min-w-0 pr-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0"/>
                        <span className="truncate">
                          {t('budget.warningAlertMsg', 'Sắp chạm hạn mức')} ({percentage}%)
                        </span>
                      </div>
                      {isAlertDismissed(`budget-${budget.id}`) ? (<button type="button" onClick={(e) => {
                                e.stopPropagation();
                                restoreAlert(`budget-${budget.id}`);
                            }} className="px-2 py-0.5 bg-white dark:bg-slate-800 text-[10px] font-bold text-slate-500 hover:text-amber-600 dark:hover:text-amber-300 rounded-md border border-slate-200 dark:border-slate-700 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs shrink-0" title={t('budget.restoreAlertTip', 'Bật lại chuông cảnh báo')}>
                          <BellOff className="w-3 h-3 text-slate-400"/>
                          <span>{t('budget.muted', 'Chuông: Tắt')}</span>
                        </button>) : (<button type="button" onClick={(e) => {
                                e.stopPropagation();
                                dismissAlert(`budget-${budget.id}`);
                            }} className="px-2 py-0.5 bg-white dark:bg-slate-800 text-[10px] font-bold text-amber-600 hover:text-slate-600 dark:hover:text-slate-300 rounded-md border border-amber-200 dark:border-amber-800 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs shrink-0" title={t('budget.dismissAlertTip', 'Tắt thông báo chuông cho mục này')}>
                          <Bell className="w-3 h-3 text-amber-500"/>
                          <span>{t('budget.bellActive', 'Chuông: Bật')}</span>
                        </button>)}
                    </div>)}

                  {/* Amounts Info */}
                  <div className="space-y-1.5 my-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">{t('budget.spent', 'Đã chi')}:</span>
                      <span className="font-extrabold text-slate-800 dark:text-white">
                        {formatCurrency(spent)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">{t('budget.monthlyLimit', 'Hạn mức tháng:')}</span>
                      <span className="font-semibold text-slate-600 dark:text-slate-300">
                        {formatCurrency(budget.amount)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">{t('budget.remaining', 'Còn lại')}:</span>
                      <span className={`font-black ${remaining >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {formatCurrency(remaining)}
                      </span>
                    </div>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden mb-3">
                    <div className={`h-full rounded-full transition-all duration-500 ${status === 'EXCEEDED'
                        ? 'bg-rose-500'
                        : status === 'WARNING'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, percentage)}%` }}/>
                  </div>

                  {/* Spending Advice */}
                  <div className="text-[11px] p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-slate-500 dark:text-slate-400 flex items-center justify-between mb-3">
                    <span>{t('budget.dailyAdvice', 'Gợi ý chi mỗi ngày:')}</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      {remaining > 0 ? `~${formatCurrency(Math.round(remaining / 24))}/${t('budget.day', 'ngày')}` : `0 ₫/${t('budget.day', 'ngày')} (${t('budget.exhausted', 'Đã hết')})`}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button onClick={() => navigateToCategoryTransactions(budget.categoryId)} className="px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors flex items-center gap-1 border border-slate-200 dark:border-slate-700 shadow-2xs" title={t('budget.viewTxTitle', 'Xem danh sách giao dịch đã chi của danh mục này')}>
                      <ReceiptText className="w-3.5 h-3.5"/>
                      <span>{t('notif.viewExpenses', 'Xem các khoản đã chi')}</span>
                    </button>

                    <div className="flex items-center space-x-1">
                      <button onClick={() => {
                        setEditingBudget(budget);
                        setBudgetCategoryId(budget.categoryId);
                        setBudgetAmount(String(budget.amount));
                        setBudgetModalOpen(true);
                    }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors" title={t('budget.editLimitTitle', 'Sửa hạn mức')}>
                        <Edit2 className="w-3.5 h-3.5"/>
                      </button>
                      <button onClick={() => {
                        if (confirm(t('budget.deleteBudgetConfirm', 'Xác nhận xóa ngân sách danh mục này?'))) {
                            deleteBudget(budget.id);
                        }
                    }} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors" title={t('budget.deleteBudgetTitle', 'Xóa ngân sách')}>
                        <Trash2 className="w-3.5 h-3.5"/>
                      </button>
                    </div>
                  </div>
                </div>);
            })}
          </div>
        </div>)}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: 50/30/20 Budget Planner */}
      {/* ========================================================================= */}
      {activeSubTab === 'PLANNER' && (<div className="space-y-6">
          {/* Concept explanation card */}
          <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl text-white shadow-lg">
            <div className="flex items-start space-x-3">
              <Sparkles className="w-6 h-6 text-yellow-300 shrink-0 mt-1"/>
              <div>
                <h3 className="text-lg font-bold">{t('budget.plannerHeading', 'Thêm thu nhập cá nhân → Tạo Budget khả dụng để tiêu')}</h3>
                <p className="text-xs text-blue-100 mt-1 leading-relaxed">
                  {t('budget.plannerDesc')}
                </p>
              </div>
            </div>
          </div>

          {/* Income & Allocation Form */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center space-x-2">
                <DollarSign className="w-5 h-5 text-emerald-500"/>
                <span>{t('budget.incomeAndRatios', 'Thu nhập & Tỷ lệ phân bổ')}</span>
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  {t('budget.monthlyIncome', 'Thu nhập hàng tháng (VNĐ)')}
                </label>
                <div className="relative">
                  <input type="text" inputMode="numeric" value={monthlyIncome ? formatNumberWithDots(monthlyIncome) : ''} onChange={(e) => {
                const cleaned = e.target.value.replace(/\D/g, '');
                if (cleaned.length <= 18) {
                    updatePlanner({ ...planner, monthlyIncome: cleaned ? Number(cleaned) : 0 });
                }
            }} onKeyDown={(e) => {
                if (['e', 'E', '+', '-', '.', ','].includes(e.key)) {
                    e.preventDefault();
                }
            }} placeholder="0" className="w-full text-xl font-bold pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"/>
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold pointer-events-none">₫</span>
                </div>
              </div>

              {/* Sliders for percentages */}
              <div className="space-y-3.5 pt-2">
                {/* Header with total percent indicator */}
                <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{t('budget.allocationRatios', 'Tỷ lệ phân bổ 4 quỹ:')}</span>
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-extrabold ${totalPercent === 100
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'}`}>
                    {t('tx.total', 'Tổng')}: {totalPercent}% {totalPercent === 100 ? '✓ ' + t('budget.standard', 'Chuẩn') : `(${totalPercent > 100 ? t('budget.over', 'Vượt') : t('budget.under', 'Thiếu')} ${Math.abs(100 - totalPercent)}%)`}
                  </span>
                </div>

                {/* Preset quick buttons */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-400">{t('budget.quickPresets', 'Gợi ý phân bổ nhanh:')}</span>
                  <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                    <button type="button" onClick={() => updatePlanner({ ...planner, needsPercent: 50, wantsPercent: 25, savingsPercent: 15, emergencyPercent: 10 })} className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-blue-500 text-slate-700 dark:text-slate-200 font-medium text-center transition-all">
                      50/25/15/10
                      <span className="block text-[9px] text-slate-400">{t('budget.recommended', 'Khuyên dùng')}</span>
                    </button>
                    <button type="button" onClick={() => updatePlanner({ ...planner, needsPercent: 50, wantsPercent: 20, savingsPercent: 20, emergencyPercent: 10 })} className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-blue-500 text-slate-700 dark:text-slate-200 font-medium text-center transition-all">
                      50/20/20/10
                      <span className="block text-[9px] text-slate-400">{t('budget.solid', 'Vững chắc')}</span>
                    </button>
                    <button type="button" onClick={() => updatePlanner({ ...planner, needsPercent: 50, wantsPercent: 30, savingsPercent: 15, emergencyPercent: 5 })} className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-blue-500 text-slate-700 dark:text-slate-200 font-medium text-center transition-all">
                      50/30/15/5
                      <span className="block text-[9px] text-slate-400">{t('budget.flexible', 'Linh hoạt')}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-blue-600 dark:text-blue-400">1. {t('budget.needs', 'Thiết yếu')}</span>
                    <span className="font-bold text-slate-800 dark:text-white">{planner.needsPercent}%</span>
                  </div>
                  <input type="range" min="30" max="70" value={planner.needsPercent} onChange={(e) => updatePlanner({ ...planner, needsPercent: Number(e.target.value) })} className="w-full accent-blue-600"/>
                  <span className="text-[11px] text-slate-400">{t('budget.needsSub', 'Ăn uống, thuê nhà, xăng xe, hóa đơn')}</span>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-purple-600 dark:text-purple-400">2. {t('budget.wants', 'Mong muốn')}</span>
                    <span className="font-bold text-slate-800 dark:text-white">{planner.wantsPercent}%</span>
                  </div>
                  <input type="range" min="10" max="50" value={planner.wantsPercent} onChange={(e) => updatePlanner({ ...planner, wantsPercent: Number(e.target.value) })} className="w-full accent-purple-600"/>
                  <span className="text-[11px] text-slate-400">{t('budget.wantsSub', 'Mua sắm, cafe, giải trí, du lịch')}</span>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-emerald-600 dark:text-emerald-400">3. {t('budget.savingsPillar', 'Tích lũy')}</span>
                    <span className="font-bold text-slate-800 dark:text-white">{planner.savingsPercent}%</span>
                  </div>
                  <input type="range" min="5" max="40" value={planner.savingsPercent} onChange={(e) => updatePlanner({ ...planner, savingsPercent: Number(e.target.value) })} className="w-full accent-emerald-600"/>
                  <span className="text-[11px] text-slate-400">{t('budget.savingsSub', 'Hũ tiết kiệm, đầu tư dài hạn')}</span>
                </div>

                {/* 4. Emergency / Contingency Fund */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center space-x-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-500 inline mr-0.5"/>
                      <span>4. {t('budget.emergency', 'Dự phòng')}</span>
                    </span>
                    <span className="font-bold text-slate-800 dark:text-white">{emergencyPercent}%</span>
                  </div>
                  <input type="range" min="0" max="30" value={emergencyPercent} onChange={(e) => updatePlanner({ ...planner, emergencyPercent: Number(e.target.value) })} className="w-full accent-amber-500"/>
                  <span className="text-[11px] text-slate-400">{t('budget.emergencySub', 'Quỹ khẩn cấp, y tế, sửa xe, rủi ro phát sinh')}</span>
                </div>

                {/* Save Button & Status feedback */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <button type="button" disabled={isSavingPlanner} onClick={async () => {
                setIsSavingPlanner(true);
                const ok = await saveDataNow();
                setIsSavingPlanner(false);
                if (ok) {
                    setPlannerSavedToast(true);
                    setTimeout(() => setPlannerSavedToast(false), 3500);
                }
            }} className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-sm ${plannerSavedToast
                ? 'bg-emerald-600 text-white'
                : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white'}`}>
                    {plannerSavedToast ? (<>
                        <Check className="w-4 h-4 text-white"/>
                        <span>{t('budget.planSaved', 'Đã lưu thành công vào hệ thống!')}</span>
                      </>) : isSavingPlanner ? (<span>{t('budget.saving', 'Đang lưu dữ liệu...')}</span>) : (<>
                        <Save className="w-4 h-4"/>
                        <span>{t('budget.savePlan', 'Lưu kế hoạch ngân sách')}</span>
                      </>)}
                  </button>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                    <span>{t('budget.savingStatus', 'Trạng thái lưu trữ:')}</span>
                    <span className="flex items-center space-x-1 font-semibold text-emerald-600 dark:text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"/>
                      <span>{serverSyncStatus === 'synced' ? t('budget.synced', 'Đã đồng bộ lên ổ đĩa') : serverSyncStatus === 'syncing' ? t('budget.syncing', 'Đang đồng bộ...') : t('budget.localSaved', 'Đã lưu cục bộ')}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Calculated Breakdown Cards */}
            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50">
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
                    {t('budget.needsBudget', 'Ngân sách Thiết yếu')} ({planner.needsPercent}%)
                  </span>
                  <p className="text-lg font-black text-blue-900 dark:text-blue-100 mt-1">
                    {formatCurrency(needsBudget)}
                  </p>
                  <span className="text-[10px] text-blue-600/80">{t('budget.needsPill', 'Nhu cầu sinh hoạt chính')}</span>
                </div>

                <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/50">
                  <span className="text-xs font-bold text-purple-700 dark:text-purple-300">
                    {t('budget.wantsBudget', 'Ngân sách Mong muốn')} ({planner.wantsPercent}%)
                  </span>
                  <p className="text-lg font-black text-purple-900 dark:text-purple-100 mt-1">
                    {formatCurrency(wantsBudget)}
                  </p>
                  <span className="text-[10px] text-purple-600/80">{t('budget.wantsPill', 'Hưởng thụ, sở thích')}</span>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50">
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    {t('budget.savingsBudget', 'Mục tiêu Tích lũy')} ({planner.savingsPercent}%)
                  </span>
                  <p className="text-lg font-black text-emerald-900 dark:text-emerald-100 mt-1">
                    {formatCurrency(savingsBudget)}
                  </p>
                  <span className="text-[10px] text-emerald-600/80">{t('budget.savingsPill', 'Tích lũy & đầu tư')}</span>
                </div>

                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50">
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center space-x-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600 inline mr-0.5"/>
                    <span>{t('budget.emergencyBudget', 'Khoản Dự phòng')} ({emergencyPercent}%)</span>
                  </span>
                  <p className="text-lg font-black text-amber-900 dark:text-amber-100 mt-1">
                    {formatCurrency(emergencyBudget)}
                  </p>
                  <span className="text-[10px] text-amber-600/80">{t('budget.emergencyPill', 'Phòng rủi ro & phát sinh')}</span>
                </div>
              </div>

              {/* Formula & Final Available Budget Calculation */}
              <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                  {t('budget.availableTitle', 'Dòng tiền Khả dụng Thực tế để Tiêu')}
                </h4>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">{t('budget.totalIncomeMonth', 'Tổng thu nhập tháng:')}</span>
                    <span className="font-bold text-slate-800 dark:text-white">+{formatCurrency(monthlyIncome)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">{t('budget.minusBills', 'Trừ Hóa đơn cố định tháng (tiền nhà, điện nước, internet):')}</span>
                    <span className="font-bold text-rose-600">-{formatCurrency(totalMonthlyBills)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">{t('budget.minusSavings', 'Trừ Mục tiêu tích lũy:')} ({planner.savingsPercent}%):</span>
                    <span className="font-bold text-blue-600">-{formatCurrency(savingsBudget)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 flex items-center space-x-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-500 inline"/>
                      <span>{t('budget.minusEmergency', 'Trừ Khoản trích lập dự phòng khẩn cấp & rủi ro:')} ({emergencyPercent}%):</span>
                    </span>
                    <span className="font-bold text-amber-600">-{formatCurrency(emergencyBudget)}</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 font-semibold uppercase">
                      {t('budget.flexibleAvailable', 'NGÂN SÁCH KHẢ DỤNG CHI TIÊU LINH HOẠT')}
                    </span>
                    <p className="text-2xl font-black text-emerald-400 mt-0.5">
                      {formatCurrency(availableFlexibleBudget)}
                    </p>
                  </div>
                  <div className="text-right text-xs text-slate-300">
                    <p className="font-bold">~{formatCurrency(Math.round(availableFlexibleBudget / 30))}/{t('budget.day', 'ngày')}</p>
                    <span className="text-[10px] text-slate-400">{t('budget.safeSpending', 'Chi tiêu an toàn')}</span>
                  </div>
                </div>

                {/* Connection to Savings Goals */}
                <div className="p-3.5 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                      <ShieldAlert className="w-4 h-4"/>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {t('budget.emergencySafeFund', 'Quỹ dự phòng an toàn:')} {formatCurrency(emergencyBudget)}/tháng
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {t('budget.emergencyAdvice')}
                      </p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setActiveSubTab('SAVINGS_GOALS')} className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 text-xs font-semibold rounded-lg hover:bg-amber-50 dark:hover:bg-slate-700 transition-all shrink-0 whitespace-nowrap shadow-sm">
                    {t('budget.viewEmergencyGoal', 'Xem Hũ dự phòng →')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>)}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: HŨ TIẾT KIỆM & MỤC TIÊU TÍCH LŨY (SAVINGS GOALS) */}
      {/* ========================================================================= */}
      {activeSubTab === 'SAVINGS_GOALS' && (<div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {goals.map((g) => {
                const percentage = g.targetAmount > 0 ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) : 0;
                const remaining = Math.max(0, g.targetAmount - g.currentAmount);
                const isCompleted = g.currentAmount >= g.targetAmount;
                return (<div key={g.id} className={`p-6 rounded-2xl bg-white dark:bg-slate-900 border transition-all shadow-sm ${isCompleted
                        ? 'border-emerald-500/60 dark:border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/10'
                        : 'border-slate-200 dark:border-slate-800'}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md" style={{ backgroundColor: g.color }}>
                        <Target className="w-6 h-6"/>
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-800 dark:text-white">{g.name}</h3>
                        <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
                          <Calendar className="w-3.5 h-3.5"/>
                          <span>{t('budget.goalDeadline', 'Hạn mục tiêu:')} {g.deadline}</span>
                        </div>
                      </div>
                    </div>

                    {isCompleted ? (<span className="flex items-center space-x-1 px-3 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold text-xs rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5"/>
                        <span>{t('budget.goalCompleted', 'HOÀN THÀNH 100% 🎉')}</span>
                      </span>) : (<span className="px-3 py-1 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold text-xs rounded-full">
                        {percentage}%
                      </span>)}
                  </div>

                  {/* Amounts */}
                  <div className="space-y-1.5 my-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">{t('budget.accumulated', 'Đã tích lũy được:')}</span>
                      <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                        {formatCurrency(g.currentAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">{t('budget.goalTarget', 'Mục tiêu:')}</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {formatCurrency(g.targetAmount)}
                      </span>
                    </div>
                    {!isCompleted && (<div className="flex justify-between text-xs">
                        <span className="text-slate-500">{t('budget.goalRemaining', 'Còn thiếu:')}</span>
                        <span className="font-bold text-rose-600 dark:text-rose-400">
                          {formatCurrency(remaining)}
                        </span>
                      </div>)}
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden mb-4">
                    <div className="h-full rounded-full transition-all duration-700" style={{
                        width: `${percentage}%`,
                        backgroundColor: isCompleted ? '#10b981' : g.color,
                    }}/>
                  </div>

                  {/* Deposit / Withdraw Buttons */}
                  <div className="flex items-center space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button onClick={() => {
                        setSelectedGoal(g);
                        setIsDepositMode(true);
                        setDepositAmount('');
                        setDepositNote('');
                        setDepositModalOpen(true);
                    }} className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition-colors shadow-sm">
                      <ArrowDownLeft className="w-3.5 h-3.5"/>
                      <span>{t('budget.depositToGoal', 'Nạp tiền vào hũ')}</span>
                    </button>

                    <button onClick={() => {
                        setSelectedGoal(g);
                        setIsDepositMode(false);
                        setDepositAmount('');
                        setDepositNote('');
                        setDepositModalOpen(true);
                    }} className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl transition-colors">
                      <ArrowUpRight className="w-3.5 h-3.5"/>
                      <span>{t('budget.withdrawFromGoal', 'Rút tiền')}</span>
                    </button>

                    <button onClick={() => {
                        if (confirm(t('budget.deleteGoalConfirm', 'Bạn có chắc muốn xóa hũ này?'))) {
                            deleteGoal(g.id);
                        }
                    }} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors">
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  </div>
                </div>);
            })}
          </div>
        </div>)}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT BUDGET */}
      {/* ========================================================================= */}
      {budgetModalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                {editingBudget ? t('budget.editBudgetTitle', 'Chỉnh sửa hạn mức') : t('budget.createBudgetTitle', 'Thiết lập hạn mức danh mục')}
              </h3>
              <button onClick={() => setBudgetModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5"/>
              </button>
            </div>

            <form onSubmit={handleSaveBudget} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  {t('budget.expenseCategory', 'Danh mục chi tiêu')}
                </label>
                <select value={budgetCategoryId} onChange={(e) => setBudgetCategoryId(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white">
                  {categories
                .filter((c) => c.type === 'EXPENSE')
                .map((c) => (<option key={c.id} value={c.id}>
                        {tCategory(c.name)}
                      </option>))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  {t('budget.budgetMonthlyLimit', 'Hạn mức chi tiêu tháng (VNĐ)')}
                </label>
                <input type="text" inputMode="numeric" required value={formatNumberWithDots(budgetAmount)} onChange={(e) => {
                const cleaned = e.target.value.replace(/\D/g, '');
                if (cleaned.length <= 18) {
                    setBudgetAmount(cleaned);
                }
            }} onKeyDown={(e) => {
                if (['e', 'E', '+', '-', '.', ','].includes(e.key)) {
                    e.preventDefault();
                }
            }} placeholder={t('budget.limitPlaceholder', 'Ví dụ: 5.000.000')} className="w-full text-xl font-bold px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white"/>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-xs text-blue-700 dark:text-blue-300">
                {t('budget.budgetThresholdNotice')}
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setBudgetModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
                  {t('common.cancel', 'Hủy')}
                </button>
                <button type="submit" className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm">
                  {t('common.save', 'Lưu hạn mức')}
                </button>
              </div>
            </form>
          </div>
        </div>)}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT GOAL */}
      {/* ========================================================================= */}
      {goalModalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                {editingGoal ? t('budget.editGoalTitle', 'Sửa mục tiêu tích lũy') : t('budget.createGoalTitle', 'Tạo hũ tiết kiệm mới')}
              </h3>
              <button onClick={() => setGoalModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5"/>
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  {t('budget.goalName', 'Tên mục tiêu tích lũy')}
                </label>
                <input type="text" required value={goalName} onChange={(e) => setGoalName(e.target.value)} placeholder={t('budget.goalNamePlaceholder', 'Ví dụ: Mua laptop, Quỹ du lịch Hàn Quốc...')} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white"/>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  {t('budget.goalTargetAmount', 'Số tiền mục tiêu (VNĐ)')}
                </label>
                <input type="text" inputMode="numeric" required value={formatNumberWithDots(goalTarget)} onChange={(e) => {
                const cleaned = e.target.value.replace(/\D/g, '');
                if (cleaned.length <= 18) {
                    setGoalTarget(cleaned);
                }
            }} onKeyDown={(e) => {
                if (['e', 'E', '+', '-', '.', ','].includes(e.key)) {
                    e.preventDefault();
                }
            }} placeholder={t('budget.goalTargetPlaceholder', 'Ví dụ: 30.000.000')} className="w-full text-xl font-bold px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white"/>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  {t('budget.goalExpectedDeadline', 'Hạn hoàn thành dự kiến')}
                </label>
                <input type="date" value={goalDeadline} onChange={(e) => setGoalDeadline(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white"/>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">{t('budget.goalColor', 'Màu sắc đại diện')}</label>
                <div className="flex space-x-2">
                  {['#0ea5e9', '#10b981', '#ec4899', '#8b5cf6', '#f59e0b', '#ef4444'].map((c) => (<button key={c} type="button" onClick={() => setGoalColor(c)} className={`w-7 h-7 rounded-full transition-transform ${goalColor === c ? 'scale-125 ring-2 ring-slate-400' : ''}`} style={{ backgroundColor: c }}/>))}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setGoalModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl">
                  {t('common.cancel', 'Hủy')}
                </button>
                <button type="submit" className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm">
                  {t('budget.createGoalBtn', 'Tạo hũ')}
                </button>
              </div>
            </form>
          </div>
        </div>)}

      {/* ========================================================================= */}
      {/* MODAL: DEPOSIT / WITHDRAW FROM GOAL */}
      {/* ========================================================================= */}
      {depositModalOpen && selectedGoal && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                {isDepositMode ? `${t('budget.depositModalTitle', 'Nạp tiền vào:')} ${selectedGoal.name}` : `${t('budget.withdrawModalTitle', 'Rút tiền từ:')} ${selectedGoal.name}`}
              </h3>
              <button onClick={() => setDepositModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5"/>
              </button>
            </div>

            <form onSubmit={handleGoalTransaction} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  {t('budget.depositWithdrawAmount', 'Số tiền')} ({isDepositMode ? t('budget.deposit', 'nạp') : t('budget.withdraw', 'rút')})
                </label>
                <input type="text" inputMode="numeric" required autoFocus value={formatNumberWithDots(depositAmount)} onChange={(e) => {
                const cleaned = e.target.value.replace(/\D/g, '');
                if (cleaned.length <= 18) {
                    setDepositAmount(cleaned);
                }
            }} onKeyDown={(e) => {
                if (['e', 'E', '+', '-', '.', ','].includes(e.key)) {
                    e.preventDefault();
                }
            }} placeholder="0" className="w-full text-2xl font-bold px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white"/>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  {isDepositMode ? t('budget.sourceWallet', 'Trừ từ Ví nguồn') : t('budget.destWallet', 'Chuyển về Ví đích')}
                </label>
                <select value={depositWalletId} onChange={(e) => setDepositWalletId(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white">
                  {wallets.filter((w) => w.type !== 'CREDIT').map((w) => (<option key={w.id} value={w.id}>
                      {tWalletName ? tWalletName(w.name) : w.name} ({formatCurrency(w.balance, language)})
                    </option>))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  {t('qa.note', 'Ghi chú')}
                </label>
                <input type="text" value={depositNote} onChange={(e) => setDepositNote(e.target.value)} placeholder={t('budget.depositNotePlaceholder', 'Ví dụ: Trích từ tiền thưởng dự án...')} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white"/>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setDepositModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl">
                  {t('common.cancel', 'Hủy')}
                </button>
                <button type="submit" className={`px-5 py-2 text-xs font-semibold text-white rounded-xl shadow-sm ${isDepositMode ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                  {isDepositMode ? t('budget.confirmDeposit', 'Xác nhận nạp') : t('budget.confirmWithdraw', 'Xác nhận rút')}
                </button>
              </div>
            </form>
          </div>
        </div>)}
    </div>);
};
