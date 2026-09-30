'use client';
import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Plus, ArrowRightLeft, Banknote, Building2, CreditCard, PiggyBank, Edit2, Trash2, DollarSign, X, ArrowLeft, ArrowDownLeft, ArrowUpRight, TrendingUp, TrendingDown, Search, Receipt, Inbox, FileSpreadsheet } from 'lucide-react';
import { formatCurrency, formatDate, formatNumberWithDots } from '@/lib/utils';
import { IconHelper } from './IconHelper';
import { VIETNAMESE_BANKS } from '@/lib/mock-data';
import { ReceiptModal } from './ReceiptModal';
export const WalletsView = () => {
    const { wallets, transactions, financialSummary, addWallet, editWallet, deleteWallet, deleteTransaction, recalculateWalletBalances, openQuickAdd, openStatementModal, t, tCategory, tWalletType, language, } = useApp();
    // Selected Wallet for viewing detailed cash flow
    const [selectedWalletId, setSelectedWalletId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('ALL');
    const [receiptModalImage, setReceiptModalImage] = useState(null);
    // Modals state
    const [walletModalOpen, setWalletModalOpen] = useState(false);
    const [editingWallet, setEditingWallet] = useState(null);
    const [walletName, setWalletName] = useState('');
    const [walletType, setWalletType] = useState('BANK');
    const [walletBalance, setWalletBalance] = useState('');
    const [walletBankName, setWalletBankName] = useState('Vietcombank');
    const [walletAccountNumber, setWalletAccountNumber] = useState('');
    const [walletCreditLimit, setWalletCreditLimit] = useState('');
    const [walletInterestRate, setWalletInterestRate] = useState('');
    const [walletColor, setWalletColor] = useState('#0ea5e9');
    // Groups
    const cashWallets = wallets.filter((w) => w.type === 'CASH');
    const bankWallets = wallets.filter((w) => w.type === 'BANK');
    const creditWallets = wallets.filter((w) => w.type === 'CREDIT');
    const savingsWallets = wallets.filter((w) => w.type === 'SAVINGS');
    // Start Edit Wallet Modal with prefilled values
    const handleStartEditWallet = (w, e) => {
        if (e)
            e.stopPropagation();
        setEditingWallet(w);
        setWalletName(w.name);
        setWalletType(w.type);
        setWalletBalance(String(w.balance));
        setWalletBankName(w.bankName || 'Vietcombank');
        setWalletAccountNumber(w.accountNumber || '');
        setWalletCreditLimit(w.creditLimit ? String(w.creditLimit) : '');
        setWalletInterestRate(w.interestRate ? String(w.interestRate) : '');
        setWalletColor(w.color || '#0ea5e9');
        setWalletModalOpen(true);
    };
    // Start Create Wallet
    const handleStartCreateWallet = () => {
        setEditingWallet(null);
        setWalletName('');
        setWalletType('BANK');
        setWalletBalance('');
        setWalletBankName('Vietcombank');
        setWalletAccountNumber('');
        setWalletCreditLimit('');
        setWalletInterestRate('');
        setWalletColor('#0ea5e9');
        setWalletModalOpen(true);
    };
    // Save Wallet (Add or Edit)
    const handleSaveWallet = (e) => {
        e.preventDefault();
        if (!walletName.trim()) {
            alert('Vui lòng nhập tên ví');
            return;
        }
        const bal = Number(walletBalance) || 0;
        const limit = Number(walletCreditLimit) || 0;
        const interest = Number(walletInterestRate) || 0;
        let icon = 'Wallet';
        if (walletType === 'CASH')
            icon = 'Banknote';
        if (walletType === 'BANK')
            icon = 'Building2';
        if (walletType === 'CREDIT')
            icon = 'CreditCard';
        if (walletType === 'SAVINGS')
            icon = 'PiggyBank';
        if (editingWallet) {
            editWallet(editingWallet.id, {
                name: walletName,
                type: walletType,
                balance: bal,
                bankName: walletType !== 'CASH' ? walletBankName : undefined,
                accountNumber: walletAccountNumber,
                creditLimit: walletType === 'CREDIT' ? limit : undefined,
                interestRate: walletType === 'SAVINGS' ? interest : undefined,
                color: walletColor,
                icon,
            });
        }
        else {
            addWallet({
                name: walletName,
                type: walletType,
                balance: bal,
                initialBalance: bal,
                currency: 'VND',
                bankName: walletType !== 'CASH' ? walletBankName : undefined,
                accountNumber: walletAccountNumber,
                creditLimit: walletType === 'CREDIT' ? limit : undefined,
                interestRate: walletType === 'SAVINGS' ? interest : undefined,
                color: walletColor,
                icon,
            });
        }
        setWalletModalOpen(false);
        setEditingWallet(null);
    };
    const handleDeleteWalletWithConfirm = (w) => {
        if (!w) return;
        if (confirm(`${t('wallets.deleteWalletConfirm', 'Bạn có chắc muốn xóa ví')} "${w.name}"? Toàn bộ giao dịch liên quan đến ví này cũng sẽ được xóa khỏi hệ thống để không làm sai lệch thu chi.`)) {
            deleteWallet(w.id);
            if (selectedWalletId === w.id) {
                setSelectedWalletId(null);
            }
        }
    };
    const selectedWallet = wallets.find((w) => w.id === selectedWalletId);
    // If a wallet is selected, compute its transactions & summary
    const walletTransactions = selectedWallet
        ? transactions.filter((t) => t.walletId === selectedWallet.id || t.toWalletId === selectedWallet.id)
        : [];
    const totalInflow = walletTransactions.reduce((sum, t) => {
        if (selectedWallet && t.type === 'INCOME' && t.walletId === selectedWallet.id)
            return sum + t.amount;
        if (selectedWallet && t.type === 'TRANSFER' && t.toWalletId === selectedWallet.id)
            return sum + t.amount;
        return sum;
    }, 0);
    const totalOutflow = walletTransactions.reduce((sum, t) => {
        if (selectedWallet && t.type === 'EXPENSE' && t.walletId === selectedWallet.id)
            return sum + t.amount;
        if (selectedWallet && t.type === 'TRANSFER' && t.walletId === selectedWallet.id)
            return sum + t.amount + (t.fee || 0);
        return sum;
    }, 0);
    const netCashFlow = totalInflow - totalOutflow;
    const countExpense = walletTransactions.filter((t) => t.type === 'EXPENSE').length;
    const countIncome = walletTransactions.filter((t) => t.type === 'INCOME').length;
    const filteredWalletTransactions = walletTransactions
        .filter((t) => {
        if (filterType === 'ALL')
            return true;
        return t.type === filterType;
    })
        .filter((t) => {
        if (!searchQuery.trim())
            return true;
        const q = searchQuery.toLowerCase();
        const matchNote = t.note?.toLowerCase().includes(q);
        const matchCat = t.categoryName?.toLowerCase().includes(q);
        const matchWallet = t.walletName?.toLowerCase().includes(q) || t.toWalletName?.toLowerCase().includes(q);
        const matchAmount = String(t.amount).includes(q);
        const matchTags = t.tags?.some((tag) => tag.toLowerCase().includes(q));
        return Boolean(matchNote || matchCat || matchWallet || matchAmount || matchTags);
    })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return (<div className="space-y-6 pb-12">
      {/* ========================================================================= */}
      {/* 1. SCENARIO A: WALLET DETAIL */}
      {/* ========================================================================= */}
      {selectedWallet ? (<div className="space-y-6">
          {/* Back button & Breadcrumb */}
          <div className="flex items-center justify-between">
            <button onClick={() => setSelectedWalletId(null)} className="flex items-center space-x-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors cursor-pointer">
              <ArrowLeft className="w-4 h-4"/>
              <span>{t('wallets.backToAll', 'Quay lại tất cả các ví')}</span>
            </button>

            <span className="text-xs px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
              {t('wallets.viewDetailFlow', 'Đang xem chi tiết nguồn tiền')}
            </span>
          </div>

          {/* Main Wallet Header Banner */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-start sm:items-center space-x-4">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0" style={{ backgroundColor: selectedWallet.color }}>
                  <IconHelper name={selectedWallet.icon} size={32}/>
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                      {selectedWallet.name}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {tWalletType(selectedWallet.type)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {selectedWallet.bankName ? `${selectedWallet.bankName} • STK: ${selectedWallet.accountNumber || t('wallets.notUpdated', 'Chưa cập nhật')}` : t('wallets.personalCash', 'Tiền mặt tại ví cá nhân')}
                  </p>
                  {selectedWallet.type === 'CREDIT' && selectedWallet.creditLimit && (<p className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-0.5">
                      {t('wallets.creditLimit', 'Hạn mức tín dụng:')} {formatCurrency(selectedWallet.creditLimit)} • {t('qa.availableBalance', 'Khả dụng')}: {formatCurrency(Math.max(0, selectedWallet.creditLimit - selectedWallet.balance))}
                    </p>)}
                  {selectedWallet.type === 'SAVINGS' && selectedWallet.interestRate && (<p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                      {t('wallets.depositInterest', 'Lãi suất tiền gửi:')} {selectedWallet.interestRate}% {t('wallets.perYear', '/ năm')}
                    </p>)}
                </div>
              </div>

              {/* Action Buttons Toolbar for this wallet */}
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => openQuickAdd('INCOME', selectedWallet.id)} className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer">
                  <Plus className="w-4 h-4"/>
                  <span>{t('wallets.inFromWallet', 'Nạp / Thu vào ví')}</span>
                </button>

                <button onClick={() => openQuickAdd('EXPENSE', selectedWallet.id)} className="flex items-center space-x-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer">
                  <DollarSign className="w-4 h-4"/>
                  <span>{t('wallets.outFromWallet', 'Chi tiền từ ví')}</span>
                </button>

                <button onClick={(e) => handleStartEditWallet(selectedWallet, e)} className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer">
                  <Edit2 className="w-4 h-4"/>
                  <span>{t('wallets.editBtn', 'Sửa ví')}</span>
                </button>

                <button onClick={() => openStatementModal(selectedWallet.id)} className="flex items-center space-x-1.5 px-3.5 py-2 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer" title="Tải sao kê ngân hàng cho ví này">
                  <FileSpreadsheet className="w-4 h-4 text-blue-600 dark:text-blue-400"/>
                  <span>Tải sao kê</span>
                </button>

                <button onClick={() => handleDeleteWalletWithConfirm(selectedWallet)} className="flex items-center space-x-1.5 px-3.5 py-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-semibold transition-colors cursor-pointer" title="Xóa ví và toàn bộ giao dịch liên quan">
                  <Trash2 className="w-4 h-4"/>
                  <span>{t('wallets.deleteBtn', 'Xóa ví')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* 4 Financial KPI cards for THIS specific wallet */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Current Balance */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase">
                {selectedWallet.type === 'CREDIT' ? t('wallets.currentDebt', 'Dư nợ cần trả') : t('wallets.currentBalance', 'Số dư hiện tại')}
              </span>
              <p className={`text-2xl font-black mt-1 ${selectedWallet.type === 'CREDIT' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                {formatCurrency(selectedWallet.balance)}
              </p>
              <span className="text-[11px] text-slate-400">
                {selectedWallet.type === 'CREDIT' ? t('wallets.creditSpent', 'Đã chi tiêu bằng thẻ') : t('wallets.readyMoney', 'Tiền thực tế sẵn sàng sử dụng')}
              </span>
            </div>

            {/* Total Inflow */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase">{t('wallets.totalIncomeIn', 'Tổng tiền thu / nạp vào')}</span>
                <TrendingUp className="w-4 h-4 text-emerald-500"/>
              </div>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                +{formatCurrency(totalInflow)}
              </p>
              <span className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80">
                {t('wallets.fromIncomeTransfers', 'Từ các khoản thu & nhận chuyển khoản')}
              </span>
            </div>

            {/* Total Outflow */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase">{t('wallets.totalExpenseOut', 'Tổng tiền chi / rút ra')}</span>
                <TrendingDown className="w-4 h-4 text-rose-500"/>
              </div>
              <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                -{formatCurrency(totalOutflow)}
              </p>
              <span className="text-[11px] text-rose-600/80 dark:text-rose-400/80">
                {t('wallets.fromExpensesTransfers', 'Từ các khoản chi & chuyển sang ví khác')}
              </span>
            </div>

            {/* Net Cash Flow */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase">{t('wallets.cashflowDiff', 'Chênh lệch dòng tiền')}</span>
              <p className={`text-2xl font-black mt-1 ${netCashFlow >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {netCashFlow >= 0 ? `+${formatCurrency(netCashFlow)}` : formatCurrency(netCashFlow)}
              </p>
              <span className="text-[11px] text-slate-400">
                {t('wallets.incomeMinusExpense', 'Tổng thu trừ tổng chi qua ví này')}
              </span>
            </div>
          </div>

          {/* Transactions Filter & Search Toolbar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Filter Tabs */}
              <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
                {[
                { id: 'ALL', label: `${t('common.all', 'Tất cả')} (${walletTransactions.length})` },
                { id: 'EXPENSE', label: `${t('dashboard.expense', 'Chi tiêu')} (${countExpense})` },
                { id: 'INCOME', label: `${t('dashboard.income', 'Thu nhập')} (${countIncome})` },
            ].map((f) => (<button key={f.id} onClick={() => setFilterType(f.id)} className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${filterType === f.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                    {f.label}
                  </button>))}
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t('wallets.searchTxPlaceholder', 'Tìm kiếm giao dịch của ví...')} className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                {searchQuery && (<button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600">
                    ×
                  </button>)}
              </div>
            </div>
          </div>

          {/* Transactions List */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                {t('wallets.walletHistory', 'Lịch Sử Thu Chi Của Ví')} ({filteredWalletTransactions.length} {t('nav.transactionsCount', 'giao dịch')})
              </h3>
              <p className="text-xs text-slate-400">
                {t('wallets.sortByNewest', 'Sắp xếp theo ngày mới nhất')}
              </p>
            </div>

            {filteredWalletTransactions.length === 0 ? (<div className="text-center py-16 px-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
                  <Inbox className="w-7 h-7"/>
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                  {t('wallets.noTxFound', 'Chưa có giao dịch nào phù hợp')}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  {searchQuery
                    ? `${t('wallets.noTxFound', 'Không tìm thấy giao dịch nào khớp với từ khóa')} "${searchQuery}"`
                    : t('wallets.noTxEmpty', 'Ví này chưa ghi nhận khoản thu hoặc chi nào. Hãy thêm giao dịch đầu tiên để bắt đầu theo dõi!')}
                </p>
                <button onClick={() => openQuickAdd('EXPENSE', selectedWallet.id)} className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer">
                  {t('wallets.addTxForWallet', '+ Thêm giao dịch cho ví này')}
                </button>
              </div>) : (<div className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredWalletTransactions.map((tx) => {
                    const isExpense = tx.type === 'EXPENSE';
                    const isIncome = tx.type === 'INCOME';
                    const isTransfer = tx.type === 'TRANSFER';
                    // Determine direction for transfer relative to this wallet
                    const isOutgoingTransfer = isTransfer && tx.walletId === selectedWallet.id;
                    const isIncomingTransfer = isTransfer && tx.toWalletId === selectedWallet.id;
                    return (<div key={tx.id} className="p-4 sm:px-6 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors flex items-center justify-between gap-4">
                      <div className="flex items-center space-x-3 min-w-0">
                        {/* Transaction Icon */}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 ${isIncome || isIncomingTransfer
                            ? 'bg-emerald-500'
                            : isOutgoingTransfer
                                ? 'bg-blue-500'
                                : 'bg-rose-500'}`}>
                          {isIncome && <ArrowDownLeft className="w-5 h-5"/>}
                          {isExpense && <ArrowUpRight className="w-5 h-5"/>}
                          {isTransfer && <ArrowRightLeft className="w-5 h-5"/>}
                        </div>

                        {/* Title & Info */}
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                              {isTransfer
                            ? isOutgoingTransfer
                                ? `${t('tx.transferTo', 'Chuyển sang:')} ${tx.toWalletName || t('wallets.transferToOther', 'Ví khác')}`
                                : `${t('wallets.receivedFrom', 'Nhận từ:')} ${tx.walletName || t('wallets.transferToOther', 'Ví khác')}`
                            : tCategory(tx.categoryName || 'Khác')}
                            </h4>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isIncome || isIncomingTransfer
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : isOutgoingTransfer
                                ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                                : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'}`}>
                              {isIncome
                            ? t('wallets.incomeTag', 'Thu nhập')
                            : isExpense
                                ? t('wallets.expenseTag', 'Khoản chi')
                                : isOutgoingTransfer
                                    ? t('wallets.transferOutTag', 'Chuyển đi')
                                    : t('wallets.transferInTag', 'Nhận tiền')}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            <span>{formatDate(tx.date, 'full')}</span>
                            {tx.note && (<>
                                <span>•</span>
                                <span className="truncate max-w-xs text-slate-600 dark:text-slate-300">
                                  {tx.note}
                                </span>
                              </>)}
                            {tx.tags && tx.tags.length > 0 && (<div className="flex items-center space-x-1">
                                {tx.tags.map((t) => (<span key={t} className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500">
                                    #{t}
                                  </span>))}
                              </div>)}
                          </div>
                        </div>
                      </div>

                      {/* Right side: Amount and actions */}
                      <div className="flex items-center space-x-3 shrink-0">
                        <div className="text-right">
                          <p className={`text-base font-black ${isIncome || isIncomingTransfer
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'}`}>
                            {isIncome || isIncomingTransfer ? '+' : '-'}
                            {formatCurrency(tx.amount)}
                          </p>
                          {isOutgoingTransfer && tx.fee && tx.fee > 0 ? (<p className="text-[10px] text-slate-400">
                              {t('wallets.feeLabel', 'Phí:')} {formatCurrency(tx.fee)}
                            </p>) : null}
                        </div>

                        {/* View Receipt Image */}
                        {tx.receiptImage && (<button onClick={() => setReceiptModalImage(tx.receiptImage || null)} className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer" title={t('wallets.viewReceiptTitle', 'Xem ảnh chứng từ')}>
                            <Receipt className="w-4 h-4"/>
                          </button>)}

                        {/* Delete Transaction */}
                        <button onClick={() => {
                            if (confirm(t('wallets.deleteTxConfirm', 'Bạn có chắc muốn xóa giao dịch này? Số dư ví sẽ được tự động hoàn tác.'))) {
                                deleteTransaction(tx.id);
                            }
                        }} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer" title={t('wallets.deleteTxTitle', 'Xóa giao dịch')}>
                          <Trash2 className="w-4 h-4"/>
                        </button>
                      </div>
                    </div>);
                })}
              </div>)}
          </div>
        </div>) : (
        /* ========================================================================= */
        /* 2. SCENARIO B: DANH SÁCH TẤT CẢ CÁC VÍ (ALL WALLETS OVERVIEW)             */
        /* ========================================================================= */
        <div className="space-y-6">
          {/* 1. HEADER & ACTIONS */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
                {t('wallets.title', 'Quản Lý Tài Khoản & Ví')}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('wallets.subtitle', 'Bấm vào từng ví để xem chi tiết thu - chi và dòng tiền. Quản lý tiền mặt, ngân hàng, thẻ tín dụng và tiết kiệm')}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button onClick={handleStartCreateWallet} className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer">
                <Plus className="w-4 h-4"/>
                <span>{t('wallets.createNew', 'Tạo ví mới')}</span>
              </button>
            </div>
          </div>

          {/* 2. NET WORTH & ASSETS KPI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-lg">
              <span className="text-xs font-bold text-slate-400 uppercase">TỔNG TÀI SẢN RÒNG</span>
              <p className="text-2xl font-black mt-1 text-white">
                {formatCurrency(financialSummary.totalAssets)}
              </p>
              <span className="text-[11px] text-slate-300">{t('wallets.netWorthSub', 'Toàn bộ tài sản trừ nợ thẻ')}</span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase">{t('wallets.availableBalance', 'Số dư khả dụng')}</span>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(financialSummary.availableBalance)}
              </p>
              <span className="text-[11px] text-slate-400">{t('wallets.availableSub', 'Tiền mặt + Tài khoản ngân hàng')}</span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase">{t('wallets.savingsTotal', 'Tiền gửi tiết kiệm')}</span>
              <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                {formatCurrency(financialSummary.totalSavings)}
              </p>
              <span className="text-[11px] text-slate-400">{t('wallets.savingsSub', 'Đang sinh lãi tại các ngân hàng')}</span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase">{t('wallets.creditDebt', 'Dư nợ thẻ tín dụng')}</span>
              <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                {formatCurrency(financialSummary.totalCreditDebt)}
              </p>
              <span className="text-[11px] text-rose-500 font-semibold">{t('wallets.creditSub', 'Cần thanh toán đúng kỳ sao kê')}</span>
            </div>
          </div>

          {/* 3. WALLETS LIST BY GROUP */}
          <div className="space-y-6">
            {/* Group 1: Cash */}
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <Banknote className="w-5 h-5 text-emerald-500"/>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                  1. {t('wallets.cashGroup', 'Tiền Mặt')} ({cashWallets.length})
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cashWallets.map((w) => (<WalletCard key={w.id} wallet={w} onViewDetail={() => setSelectedWalletId(w.id)} onEdit={(e) => handleStartEditWallet(w, e)} onDelete={() => handleDeleteWalletWithConfirm(w)}/>))}
              </div>
            </div>

            {/* Group 2: Bank */}
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <Building2 className="w-5 h-5 text-blue-500"/>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                  2. {t('wallets.bankGroup', 'Tài Khoản Ngân Hàng')} ({bankWallets.length})
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {bankWallets.map((w) => (<WalletCard key={w.id} wallet={w} onViewDetail={() => setSelectedWalletId(w.id)} onEdit={(e) => handleStartEditWallet(w, e)} onDelete={() => handleDeleteWalletWithConfirm(w)}/>))}
              </div>
            </div>

            {/* Nhóm 3: {t('wallets.creditWallets', 'Thẻ tín dụng')} */}
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <CreditCard className="w-5 h-5 text-purple-500"/>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                  3. {t('wallets.creditGroup', 'Thẻ Tín Dụng')} ({creditWallets.length})
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {creditWallets.map((w) => (<WalletCard key={w.id} wallet={w} onViewDetail={() => setSelectedWalletId(w.id)} onEdit={(e) => handleStartEditWallet(w, e)} onDelete={() => handleDeleteWalletWithConfirm(w)}/>))}
              </div>
            </div>

            {/* Group 4: Savings */}
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <PiggyBank className="w-5 h-5 text-amber-500"/>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                  4. {t('wallets.savingsGroup', 'Sổ Tiết Kiệm')} ({savingsWallets.length})
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savingsWallets.map((w) => (<WalletCard key={w.id} wallet={w} onViewDetail={() => setSelectedWalletId(w.id)} onEdit={(e) => handleStartEditWallet(w, e)} onDelete={() => handleDeleteWalletWithConfirm(w)}/>))}
              </div>
            </div>
          </div>
        </div>)}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT WALLET                                                  */}
      {/* ========================================================================= */}
      {walletModalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                {editingWallet ? t('wallets.editWalletModal', 'Chỉnh sửa ví / tài khoản') : t('wallets.newWalletModal', 'Tạo nguồn tiền mới')}
              </h3>
              <button onClick={() => setWalletModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer">
                <X className="w-5 h-5"/>
              </button>
            </div>

            <form onSubmit={handleSaveWallet} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  {t('wallets.fundingType', 'Loại nguồn tiền')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                { type: 'CASH', label: t('wallets.cashGroup', 'Tiền mặt') },
                { type: 'BANK', label: t('wallets.bankGroup', 'Ngân hàng') },
                { type: 'CREDIT', label: t('wallets.creditGroup', 'Thẻ tín dụng') },
                { type: 'SAVINGS', label: t('wallets.savingsGroup', 'Sổ tiết kiệm') },
            ].map((t) => (<button key={t.type} type="button" 
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onClick={() => setWalletType(t.type)} className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${walletType === t.type
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}>
                      {t.label}
                    </button>))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  {t('wallets.walletNameLabel', 'Tên hiển thị của Ví')}
                </label>
                <input type="text" required value={walletName} onChange={(e) => setWalletName(e.target.value)} placeholder={t('wallets.walletNamePlaceholder', 'Ví dụ: Techcombank Priority, Tiền mặt ví tay...')} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"/>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  {walletType === 'CREDIT' ? t('wallets.creditDebtLabel', 'Dư nợ hiện tại (VNĐ)') : t('wallets.balanceLabel', 'Số dư hiện tại (VNĐ)')}
                </label>
                <input type="text" inputMode="numeric" value={formatNumberWithDots(walletBalance)} onChange={(e) => {
                const cleaned = e.target.value.replace(/\D/g, '');
                if (cleaned.length <= 18) {
                    setWalletBalance(cleaned);
                }
            }} onKeyDown={(e) => {
                if (['e', 'E', '+', '-', '.', ','].includes(e.key)) {
                    e.preventDefault();
                }
            }} placeholder="0" className="w-full text-xl font-bold px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"/>
              </div>

              {walletType !== 'CASH' && (<div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      {t('wallets.bankLabel', 'Ngân hàng')}
                    </label>
                    <select value={walletBankName} onChange={(e) => setWalletBankName(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white">
                      {VIETNAMESE_BANKS.map((b) => (<option key={b.code} value={b.name}>
                          {b.name}
                        </option>))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      {t('wallets.accountNumberLabel', 'Số tài khoản / 4 số cuối')}
                    </label>
                    <input type="text" value={walletAccountNumber} onChange={(e) => setWalletAccountNumber(e.target.value)} placeholder="1903..." className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"/>
                  </div>
                </div>)}

              {walletType === 'CREDIT' && (<div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    {t('wallets.creditLimitLabel', 'Hạn mức thẻ tín dụng (VNĐ)')}
                  </label>
                  <input type="text" inputMode="numeric" value={walletCreditLimit ? formatNumberWithDots(walletCreditLimit) : ''} onChange={(e) => {
                    const cleaned = e.target.value.replace(/\D/g, '');
                    if (cleaned.length <= 18) {
                        setWalletCreditLimit(cleaned);
                    }
                }} onKeyDown={(e) => {
                    if (['e', 'E', '+', '-', '.', ','].includes(e.key)) {
                        e.preventDefault();
                    }
                }} placeholder={t('wallets.creditLimitPlaceholder', 'Ví dụ: 30000000')} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"/>
                </div>)}

              {walletType === 'SAVINGS' && (<div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    {t('wallets.interestRateLabel', 'Lãi suất gửi (%/năm)')}
                  </label>
                  <input type="number" step="0.1" value={walletInterestRate} onChange={(e) => setWalletInterestRate(e.target.value)} placeholder={t('wallets.ratePlaceholder', 'Ví dụ: 6.2')} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"/>
                </div>)}

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{t('wallets.colorLabel', 'Màu sắc nhận diện')}</label>
                <div className="flex space-x-2">
                  {['#0ea5e9', '#10b981', '#ef4444', '#8b5cf6', '#007a33', '#f59e0b', '#3b82f6'].map((c) => (<button key={c} type="button" onClick={() => setWalletColor(c)} className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${walletColor === c ? 'scale-125 ring-2 ring-slate-400' : ''}`} style={{ backgroundColor: c }}/>))}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setWalletModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer">
                  {t('common.cancel', 'Hủy')}
                </button>
                <button type="submit" className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm cursor-pointer">
                  {t('wallets.saveWalletBtn', 'Lưu ví')}
                </button>
              </div>
            </form>
          </div>
        </div>)}

      {/* ========================================================================= */}
      {/* MODAL: VIEW RECEIPT */}
      {/* ========================================================================= */}
      <ReceiptModal isOpen={Boolean(receiptModalImage)} imageUrl={receiptModalImage || undefined} onClose={() => setReceiptModalImage(null)} title={t('wallets.receiptModalTitle', 'Chứng từ / Hóa đơn giao dịch')}/>
    </div>);
};
const WalletCard = ({ wallet, onEdit, onDelete, onViewDetail }) => {
    const { t } = useApp();
    return (<div onClick={onViewDetail} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative group hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0" style={{ backgroundColor: wallet.color }}>
              <IconHelper name={wallet.icon} size={20}/>
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {wallet.name}
              </h4>
              <p className="text-[11px] text-slate-400">
                {wallet.bankName ? `${wallet.bankName} • ${wallet.accountNumber || ''}` : t('wallets.cashWallets', 'Tiền mặt')}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
            <button onClick={onEdit} title={t('wallets.editBtn', 'Chỉnh sửa')} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer">
              <Edit2 className="w-3.5 h-3.5"/>
            </button>
            <button onClick={onDelete} title={t('common.delete', 'Xóa ví')} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer">
              <Trash2 className="w-3.5 h-3.5"/>
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[10px] uppercase font-semibold text-slate-400">
            {wallet.type === 'CREDIT' ? t('sim.colDebtPay', 'Dư nợ') : t('wallets.currentBalance', 'Số dư')}
          </span>
          <p className={`text-xl font-black mt-0.5 ${wallet.type === 'CREDIT' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-white'}`}>
            {formatCurrency(wallet.balance)}
          </p>

          {wallet.type === 'CREDIT' && wallet.creditLimit && (<div className="flex justify-between text-[11px] text-slate-400 mt-2">
              <span>{t('wallets.creditLimit', 'Hạn mức')}: {formatCurrency(wallet.creditLimit)}</span>
              <span className="text-emerald-500 font-semibold">
                {t('wallets.available', 'Còn lại')}: {formatCurrency(Math.max(0, wallet.creditLimit - wallet.balance))}
              </span>
            </div>)}

          {wallet.type === 'SAVINGS' && wallet.interestRate && (<div className="flex justify-between text-[11px] text-slate-400 mt-2">
              <span>{t('wallets.interest', 'Lãi suất')}:</span>
              <span className="text-emerald-500 font-bold">{wallet.interestRate}% / {t('common.year', 'năm')}</span>
            </div>)}
        </div>
      </div>

      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
        <span>{t('wallets.detailView', 'Xem chi tiết thu & chi')}</span>
        <span className="group-hover:translate-x-1 transition-transform">→</span>
      </div>
    </div>);
};
