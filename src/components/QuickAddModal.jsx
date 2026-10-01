'use client';
import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { X, Upload, Plus, AlertTriangle, FileSpreadsheet, Tag as TagIcon, Check } from 'lucide-react';
import { POPULAR_TAGS } from '@/lib/mock-data';
import { IconHelper } from './IconHelper';
import {
  formatCurrency,
  checkWalletSufficientFunds,
  getWalletAvailableBalance,
  formatAmountInWords,
  formatNumberWithDots,
  toLocalDateTimeInput,
  normalizeSaveDate,
  toLocalDateKey,
  getLocalDateString
} from '@/lib/utils';

export const QuickAddModal = () => {
  const {
    quickAddOpen,
    setQuickAddOpen,
    quickAddDefaultType,
    quickAddDefaultWalletId,
    openStatementModal,
    wallets,
    categories,
    currentMonth,
    setCurrentMonth,
    addTransaction,
    language,
    t,
    tCategory,
    tWalletType,
    tTag,
    tWalletName,
  } = useApp();

  const [type, setType] = useState('EXPENSE');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [walletId, setWalletId] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [tags, setTags] = useState([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [receiptImage, setReceiptImage] = useState(undefined);

  useEffect(() => {
    if (quickAddOpen) {
      const currentType = quickAddDefaultType === 'INCOME' ? 'INCOME' : 'EXPENSE';
      setType(currentType);
      setAmount('');
      const defaultCat = categories.find((c) => c.type === currentType);
      setCategoryId(defaultCat?.id || '');
      setIsCustomCategory(false);
      setCustomCategoryName('');

      const availableAssetWallets = wallets.filter((w) => w.type !== 'CREDIT' && w.type !== 'SAVINGS');
      const availableSpendableCreditWallets = wallets.filter((w) => w.type === 'CREDIT' && w.creditLimit && w.creditLimit > 0);
      const candidateWallets = currentType === 'INCOME' ? availableAssetWallets : [...availableAssetWallets, ...availableSpendableCreditWallets];

      let targetWalletId = '';
      if (quickAddDefaultWalletId && candidateWallets.some((w) => w.id === quickAddDefaultWalletId)) {
        targetWalletId = quickAddDefaultWalletId;
      } else if (availableAssetWallets.length > 0) {
        targetWalletId = availableAssetWallets[0].id;
      } else if (candidateWallets.length > 0) {
        targetWalletId = candidateWallets[0].id;
      } else {
        targetWalletId = wallets[0]?.id || '';
      }
      setWalletId(targetWalletId);
      setDate(toLocalDateTimeInput());
      setNote('');
      setTags([]);
      setCustomTagInput('');
      setReceiptImage(undefined);
    }
  }, [quickAddOpen, quickAddDefaultType, quickAddDefaultWalletId, categories, wallets]);

  if (!quickAddOpen) return null;

  const handleQuickAmount = (val) => {
    const current = Number(amount) || 0;
    setAmount(String(current + val));
  };

  const handleTagToggle = (tagKey) => {
    const displayTag = tTag(tagKey);
    if (tags.includes(tagKey) || tags.includes(displayTag)) {
      setTags(tags.filter((t) => t !== tagKey && t !== displayTag));
    } else {
      setTags([...tags, tagKey]);
    }
  };

  const handleAddCustomTag = () => {
    const clean = customTagInput.trim().replace(/^#/, '');
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
      setCustomTagInput('');
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const selectedWallet = wallets.find((w) => w.id === walletId);
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const assetWallets = wallets.filter((w) => w.type !== 'CREDIT' && w.type !== 'SAVINGS');
  const creditWallets = wallets.filter((w) => w.type === 'CREDIT');

  const numAmount = Number(amount) || 0;
  const fundValidation = checkWalletSufficientFunds(selectedWallet, numAmount, 0, language);
  const availableBalance = getWalletAvailableBalance(selectedWallet);
  const isOverdraft = type === 'EXPENSE' && numAmount > 0 && !fundValidation.isValid;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!numAmount || numAmount <= 0) {
      alert(t('qa.invalidAmount', 'Vui lòng nhập số tiền hợp lệ (> 0)'));
      return;
    }
    if (!walletId) {
      alert(t('qa.selectWallet', 'Vui lòng chọn ví nguồn'));
      return;
    }
    if (type === 'EXPENSE' && !fundValidation.isValid) {
      alert(fundValidation.errorMessage || t('qa.insufficientFunds', 'Số dư ví không đủ để thực hiện giao dịch!'));
      return;
    }

    const txDate = normalizeSaveDate(date);
    const todayKey = getLocalDateString();
    if (toLocalDateKey(txDate) > todayKey) {
      alert(t('qa.noFutureDate', 'Không thể tạo giao dịch cho ngày trong tương lai (chưa đến ngày)! Vui lòng chọn ngày hôm nay hoặc trước đó.'));
      return;
    }

    const txMonth = txDate.slice(0, 7);
    if (txMonth && txMonth !== currentMonth) {
      setCurrentMonth(txMonth);
    }

    const finalCategoryName = isCustomCategory && customCategoryName.trim()
      ? customCategoryName.trim()
      : (selectedCategory?.name || tCategory('Khác'));
    const finalCategoryId = isCustomCategory
      ? `cat-custom-${Date.now()}`
      : (categoryId || 'cat-other-exp');

    const success = addTransaction({
      type,
      amount: numAmount,
      categoryId: finalCategoryId,
      categoryName: finalCategoryName,
      walletId,
      walletName: selectedWallet?.name,
      date: txDate,
      note: note || finalCategoryName || t('tx.transaction', 'Giao dịch'),
      tags,
      receiptImage,
    });

    if (success) {
      setQuickAddOpen(false);
    }
  };

  const filteredCategories = categories.filter((c) => c.type === (type === 'INCOME' ? 'INCOME' : 'EXPENSE'));

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/60 backdrop-blur-sm overflow-hidden">
      <div className="relative w-full max-w-xl lg:max-w-2xl bg-white dark:bg-slate-900 lg:rounded-2xl lg:my-6 rounded-t-xl shadow-2xl overflow-hidden max-h-[92vh] lg:max-h-[85vh] flex flex-col border border-transparent dark:border-slate-800">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              +
            </div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">
              {t('qa.title', 'Ghi nhận giao dịch nhanh')}
            </h2>
          </div>
          <button
            onClick={() => setQuickAddOpen(false)}
            className="p-2.5 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label={t('common.close', 'Đóng')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {/* Bank Statement Upload Prompt Banner */}
          <div className="flex items-center justify-between p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/60">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-xs text-emerald-900 dark:text-emerald-200 font-medium">
                {t('qa.hasBankStatement', 'Có file sao kê Excel / CSV từ ngân hàng?')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setQuickAddOpen(false);
                openStatementModal(walletId);
              }}
              className="text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-emerald-200 underline cursor-pointer shrink-0"
            >
              {t('qa.uploadStatementBtn', 'Tải sao kê lên ➜')}
            </button>
          </div>

          {/* Type Switcher */}
          <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setType('EXPENSE');
                const cat = categories.find((c) => c.type === 'EXPENSE');
                if (cat) setCategoryId(cat.id);
                setIsCustomCategory(false);
              }}
              className={`py-2.5 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                type === 'EXPENSE'
                  ? 'bg-rose-500 text-white shadow'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('qa.expense', 'Khoản chi')}
            </button>
            <button
              type="button"
              onClick={() => {
                setType('INCOME');
                const cat = categories.find((c) => c.type === 'INCOME');
                if (cat) setCategoryId(cat.id);
                setIsCustomCategory(false);
                if (selectedWallet?.type === 'CREDIT' || selectedWallet?.type === 'SAVINGS') {
                  const firstAsset = wallets.find((w) => w.type !== 'CREDIT' && w.type !== 'SAVINGS');
                  if (firstAsset) setWalletId(firstAsset.id);
                }
              }}
              className={`py-2.5 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                type === 'INCOME'
                  ? 'bg-emerald-500 text-white shadow'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('qa.income', 'Khoản thu')}
            </button>
          </div>

          {/* Amount input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              {t('qa.amount', 'Số tiền')} (VNĐ) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                required
                autoFocus
                value={formatNumberWithDots(amount)}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, '');
                  if (cleaned.length <= 18) {
                    setAmount(cleaned);
                  }
                }}
                onKeyDown={(e) => {
                  if (['e', 'E', '+', '-', '.', ','].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
                placeholder="0"
                className="w-full text-3xl font-extrabold pl-4 pr-12 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg pointer-events-none">
                ₫
              </span>
            </div>

            {/* Real-time Amount in Words (Language-aware) */}
            {amount && Number(amount) > 0 && (
              <div className="mt-2 px-3 py-2 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/60 text-xs flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                <span className="text-blue-600 dark:text-blue-400 font-bold shrink-0 mt-0.5">
                  {t('qa.inWords', 'Bằng chữ:')}
                </span>
                <span className="font-semibold text-blue-900 dark:text-blue-200 italic break-words break-all [overflow-wrap:anywhere] leading-relaxed">
                  {formatAmountInWords(amount, language)}
                </span>
              </div>
            )}

            {/* Quick amount presets */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[50000, 100000, 200000, 500000, 1000000, 2000000, 5000000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAmount(val)}
                  className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 text-slate-600 dark:text-slate-400 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                >
                  +{val >= 1000000 ? `${val / 1000000}M` : `${val / 1000}k`}
                </button>
              ))}
              {amount && (
                <button
                  type="button"
                  onClick={() => setAmount('')}
                  className="px-2 py-1 text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors ml-auto cursor-pointer"
                >
                  {t('qa.deleteReceipt', 'Xóa')}
                </button>
              )}
            </div>
          </div>

          {/* Wallets & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Wallet Selection */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {type === 'INCOME' ? t('qa.receiveWallet', 'Ví nhận tiền') : t('qa.payWallet', 'Ví thanh toán')}{' '}
                  <span className="text-rose-500">*</span>
                </label>
                {selectedWallet && (
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    {t('qa.availableBalance', 'Khả dụng')}: {formatCurrency(availableBalance)}
                  </span>
                )}
              </div>
              <select
                value={walletId}
                onChange={(e) => setWalletId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-semibold"
              >
                <optgroup label={t('wallets.cashAndBankGroup', 'Tài khoản & Ví chi tiêu')}>
                  {assetWallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {tWalletName ? tWalletName(w.name) : w.name} ({t('wallets.balance', 'Số dư')}: {formatCurrency(w.balance)})
                    </option>
                  ))}
                </optgroup>
                {creditWallets.length > 0 && (
                  <optgroup label={t('wallets.creditDebtGroup', 'Thẻ tín dụng & Khoản nợ')}>
                    {creditWallets.map((w) => {
                      const isPureDebt = !w.creditLimit || w.creditLimit <= 0;
                      const avail = getWalletAvailableBalance(w);
                      const displayName = tWalletName ? tWalletName(w.name) : w.name;
                      return (
                        <option
                          key={w.id}
                          value={w.id}
                          disabled={type === 'EXPENSE' && isPureDebt}
                        >
                          {displayName} {isPureDebt
                            ? `(${t('wallets.debtBalance', 'Dư nợ')}: ${formatCurrency(Math.abs(w.balance))}${type === 'EXPENSE' ? ` - ${t('wallets.cannotSpendDebt', 'Khoản nợ')}` : ''})`
                            : `(${t('wallets.availableLimit', 'Hạn mức khả dụng')}: ${formatCurrency(avail)})`}
                        </option>
                      );
                    })}
                  </optgroup>
                )}
              </select>
            </div>

            {/* Category Selection */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {type === 'INCOME' ? t('qa.incomeCategory', 'Danh mục thu nhập') : t('qa.category', 'Danh mục chi tiêu')}{' '}
                  <span className="text-rose-500">*</span>
                </label>
                {isCustomCategory && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomCategory(false);
                      setCustomCategoryName('');
                    }}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    {t('common.cancel', 'Chọn từ danh sách')}
                  </button>
                )}
              </div>

              {!isCustomCategory ? (
                <select
                  value={categoryId}
                  onChange={(e) => {
                    if (e.target.value === '__CUSTOM__') {
                      setIsCustomCategory(true);
                      setCustomCategoryName('');
                    } else {
                      setCategoryId(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                >
                  {filteredCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {tCategory(c.name)}
                    </option>
                  ))}
                  <option value="__CUSTOM__">
                    ✨ + {t('qa.customCategory', 'Tự nhập danh mục khác...')}
                  </option>
                </select>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    required
                    autoFocus
                    value={customCategoryName}
                    onChange={(e) => setCustomCategoryName(e.target.value)}
                    placeholder={t('qa.enterCustomCategory', 'Nhập tên danh mục bạn muốn...')}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-blue-500 dark:border-blue-400 rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-medium"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Real-time Overdraft Warning Alert */}
          {isOverdraft && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5 animate-in fade-in min-w-0 max-w-full overflow-hidden">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="font-bold">{t('qa.exceedBalance', 'Số tiền vượt quá quỹ khả dụng!')}</p>
                <p className="mt-1 leading-relaxed break-words break-all [overflow-wrap:anywhere]">{fundValidation.errorMessage}</p>
              </div>
            </div>
          )}

          {/* Category Quick Badges */}
          {!isCustomCategory && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                {t('qa.quickSelectCategory', 'Chọn nhanh danh mục')}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {filteredCategories.slice(0, 8).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setCategoryId(cat.id);
                      setIsCustomCategory(false);
                    }}
                    className={`flex items-center space-x-2 p-2 rounded-xl border text-left text-xs font-medium transition-all cursor-pointer ${
                      categoryId === cat.id && !isCustomCategory
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold shadow-sm'
                        : 'border-slate-200 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <span
                      className="w-5 h-5 rounded-md flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: cat.color }}
                    >
                      <IconHelper name={cat.icon} size={12} />
                    </span>
                    <span className="truncate">{tCategory(cat.name)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Date & Note */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                {t('qa.dateTime', 'Ngày & Giờ')}
              </label>
              <input
                type="datetime-local"
                max={toLocalDateTimeInput()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                {t('qa.note', 'Ghi chú')}
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  type === 'INCOME'
                    ? (language === 'en' ? 'e.g. Monthly salary, bonus, dividend...' : 'Ví dụ: Lương cứng tháng, thưởng dự án...')
                    : (language === 'en' ? 'e.g. Lunch, Grab ride, groceries, utilities...' : 'Ví dụ: Ăn trưa Highlands, Tiền điện EVN...')
                }
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              {t('qa.tags', 'Nhãn (Tags)')}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_TAGS.map((rawTag) => {
                const displayTag = tTag ? tTag(rawTag) : rawTag;
                const isSelected = tags.includes(rawTag) || tags.includes(displayTag);
                return (
                  <button
                    key={rawTag}
                    type="button"
                    onClick={() => handleTagToggle(rawTag)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    #{displayTag}
                  </button>
                );
              })}

              {/* Show any extra custom tags added by the user */}
              {tags
                .filter((tg) => !POPULAR_TAGS.includes(tg) && !POPULAR_TAGS.some((p) => tTag(p) === tg))
                .map((customTag) => (
                  <button
                    key={customTag}
                    type="button"
                    onClick={() => setTags(tags.filter((t) => t !== customTag))}
                    className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-600 text-white flex items-center gap-1 cursor-pointer"
                  >
                    #{tTag ? tTag(customTag) : customTag}
                    <X className="w-3 h-3 ml-0.5" />
                  </button>
                ))}
            </div>

            {/* Custom Tag Input */}
            <div className="flex items-center gap-2 mt-2">
              <div className="relative flex-1">
                <TagIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomTag();
                    }
                  }}
                  placeholder={t('qa.addCustomTagPlaceholder', 'Nhập nhãn tùy chỉnh rồi bấm Thêm (+)...')}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <button
                type="button"
                onClick={handleAddCustomTag}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold cursor-pointer shrink-0 transition-colors"
              >
                + {t('qa.addTagBtn', 'Thêm tag')}
              </button>
            </div>
          </div>

          {/* Receipt Image Attachment */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              {t('qa.attachReceiptTitle', 'Đính kèm hóa đơn / Ảnh chụp chứng từ')}
            </label>
            {receiptImage ? (
              <div className="relative inline-block border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={receiptImage}
                  alt={t('bills.receiptAlt', 'Hóa đơn')}
                  className="h-28 object-contain bg-slate-100 dark:bg-slate-800"
                />
                <button
                  type="button"
                  onClick={() => setReceiptImage(undefined)}
                  className="absolute top-1.5 right-1.5 p-1 bg-rose-600 text-white rounded-md hover:bg-rose-700 transition-colors shadow cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex items-center space-x-3 p-3 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
                <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t('qa.uploadReceiptBtn', 'Bấm để tải ảnh hóa đơn (JPG, PNG)')}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {t('qa.receiptHelp', 'Giúp đối soát chi tiêu chính xác và tiện lợi')}
                  </p>
                </div>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            )}
          </div>

          {/* Submit buttons */}
          <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setQuickAddOpen(false)}
              className="px-5 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium text-sm transition-colors cursor-pointer"
            >
              {t('qa.cancel', 'Hủy bỏ')}
            </button>
            <button
              type="submit"
              disabled={isOverdraft || numAmount <= 0}
              className={`px-6 py-2.5 font-semibold rounded-xl text-sm transition-all shadow-md flex items-center space-x-2 ${
                isOverdraft || numAmount <= 0
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60'
                  : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-95'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>
                {isOverdraft
                  ? t('qa.insufficientFunds', 'Số dư không đủ')
                  : t('qa.save', 'Lưu giao dịch')}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
