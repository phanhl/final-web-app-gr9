'use client';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
    X,
    UploadCloud,
    FileSpreadsheet,
    Download,
    CheckCircle2,
    AlertTriangle,
    ArrowDownLeft,
    ArrowUpRight,
    Wallet,
    RefreshCw,
    Filter,
    Check,
    HelpCircle,
    Info,
    Calendar,
    Tag,
    Plus,
    Building2,
    CreditCard,
    Sparkles,
} from 'lucide-react';
import { formatCurrency, formatDate, formatNumberWithDots } from '@/lib/utils';
import {
    parseBankStatementFile,
    checkDuplicates,
    downloadSampleStatementTemplate,
    SUPPORTED_BANKS,
} from '@/lib/bank-statement-parser';
import confetti from 'canvas-confetti';
import { IconHelper } from './IconHelper';

/**
 * Hàm tìm kiếm ví ngân hàng phù hợp với sao kê đã nhận diện
 */
function findMatchingWalletForBank(bank, walletsList, detectedAccountNumber) {
    if (!bank || !Array.isArray(walletsList)) return null;
    const bCode = (bank.code || '').toLowerCase();
    const bName = (bank.name || '').toLowerCase();

    // 1. Khớp theo số tài khoản nếu nhận diện được từ sao kê
    if (detectedAccountNumber) {
        const cleanAcc = detectedAccountNumber.replace(/\D/g, '');
        if (cleanAcc.length >= 4) {
            const accMatch = walletsList.find((w) => {
                if (!w.accountNumber) return false;
                const cleanWAcc = String(w.accountNumber).replace(/\D/g, '');
                return cleanWAcc && (cleanWAcc === cleanAcc || cleanWAcc.endsWith(cleanAcc) || cleanAcc.endsWith(cleanWAcc));
            });
            if (accMatch) return accMatch;
        }
    }

    // 2. Khớp theo bankName
    const bankNameMatch = walletsList.find((w) => {
        if (!w.bankName) return false;
        const wbName = w.bankName.toLowerCase();
        return wbName === bName || wbName === bCode || wbName.includes(bName) || bName.includes(wbName);
    });
    if (bankNameMatch) return bankNameMatch;

    // 3. Khớp theo tên ví (name)
    const nameMatch = walletsList.find((w) => {
        const wName = (w.name || '').toLowerCase();
        return (
            wName.includes(bName) ||
            (bCode.length >= 3 && wName.includes(bCode)) ||
            (bank.keywords && bank.keywords.some((k) => wName.includes(k)))
        );
    });
    if (nameMatch) return nameMatch;

    return null;
}

/**
 * Số dư đầu kỳ = số dư cuối kỳ - (tổng thu - tổng chi) của các giao dịch trong sao kê
 */
function computeOpeningBalance(closingBalance, items = []) {
    if (closingBalance === null || closingBalance === undefined)
        return 0;
    const net = items.reduce((sum, t) => sum + (t.type === 'INCOME' ? t.amount : -t.amount), 0);
    return Number(closingBalance) - net;
}

export const BankStatementModal = () => {
    const {
        statementModalOpen,
        closeStatementModal,
        statementDefaultWalletId,
        wallets,
        categories,
        transactions,
        addWallet,
        importBankStatementTransactions,
        t,
        tCategory,
        tWalletName,
        tTag,
        language,
    } = useApp();

    const [selectedWalletId, setSelectedWalletId] = useState('');
    const [file, setFile] = useState(null);
    const [isParsing, setIsParsing] = useState(false);
    const [parseError, setParseError] = useState(null);

    // Dữ liệu sau khi parse
    const [parsedItems, setParsedItems] = useState([]);
    const [detectedClosingBalance, setDetectedClosingBalance] = useState(null);
    const [balanceAdjustmentMode, setBalanceAdjustmentMode] = useState('NET_CHANGE'); // 'NET_CHANGE' | 'SET_EXACT'

    // Nhận diện ngân hàng & trạng thái liên kết ví
    const [detectedBank, setDetectedBank] = useState(null);
    const [detectedAccountNumber, setDetectedAccountNumber] = useState(null);
    const [detectedAccountHolder, setDetectedAccountHolder] = useState(null);
    const [walletMatchStatus, setWalletMatchStatus] = useState('MANUAL'); // 'MATCHED' | 'NOT_FOUND' | 'MANUAL'

    // Modal tạo ví nhanh cho ngân hàng được nhận diện
    const [showCreateWalletModal, setShowCreateWalletModal] = useState(false);
    const [customWalletName, setCustomWalletName] = useState('');
    const [customWalletBalance, setCustomWalletBalance] = useState('0');
    const [customWalletAccNum, setCustomWalletAccNum] = useState('');

    // Bộ lọc xem trước
    const [activeFilterTab, setActiveFilterTab] = useState('ALL'); // 'ALL' | 'INCOME' | 'EXPENSE' | 'DUPLICATE' | 'SELECTED'
    const [searchFilter, setSearchFilter] = useState('');

    // Trạng thái thành công
    const [importSuccessResult, setImportSuccessResult] = useState(null);

    const fileInputRef = useRef(null);

    // Khởi tạo ví mặc định khi mở modal
    useEffect(() => {
        if (statementModalOpen) {
            const targetWallet = statementDefaultWalletId
                ? wallets.find(w => w.id === statementDefaultWalletId)
                : wallets.find(w => w.type === 'BANK') || wallets[0];
            setSelectedWalletId(targetWallet ? targetWallet.id : (wallets[0]?.id || ''));
            setFile(null);
            setParsedItems([]);
            setParseError(null);
            setDetectedClosingBalance(null);
            setDetectedBank(null);
            setDetectedAccountNumber(null);
            setDetectedAccountHolder(null);
            setWalletMatchStatus('MANUAL');
            setBalanceAdjustmentMode('NET_CHANGE');
            setImportSuccessResult(null);
            setActiveFilterTab('ALL');
            setSearchFilter('');
            setShowCreateWalletModal(false);
        }
        // Chỉ reset khi MỞ modal. Không phụ thuộc `wallets`: tạo ví / nạp sao kê / đồng bộ từ thiết bị khác
        // đều làm `wallets` đổi và trước đây xóa sạch dữ liệu đã đọc + màn hình thành công.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statementModalOpen, statementDefaultWalletId]);

    // Khi người dùng đổi ví đích, cập nhật lại việc kiểm tra trùng lặp
    useEffect(() => {
        if (parsedItems.length > 0 && selectedWalletId) {
            setParsedItems(prev => checkDuplicates(prev, transactions, selectedWalletId));
        }
    }, [selectedWalletId, transactions]);

    const currentWallet = wallets.find(w => w.id === selectedWalletId);

    // Xử lý khi chọn file
    const handleFileProcess = async (uploadedFile) => {
        if (!uploadedFile) return;
        setFile(uploadedFile);
        setIsParsing(true);
        setParseError(null);
        setImportSuccessResult(null);

        try {
            const result = await parseBankStatementFile(uploadedFile, categories);
            setDetectedClosingBalance(result.detectedClosingBalance);
            setDetectedBank(result.detectedBank);
            setDetectedAccountNumber(result.detectedAccountNumber);
            setDetectedAccountHolder(result.detectedAccountHolder);

            // Kiểm tra phân biệt ngân hàng của sao kê và khớp ví
            if (result.detectedBank) {
                const matchedWallet = findMatchingWalletForBank(result.detectedBank, wallets, result.detectedAccountNumber);
                if (matchedWallet) {
                    setSelectedWalletId(matchedWallet.id);
                    setWalletMatchStatus('MATCHED');
                    setParsedItems(checkDuplicates(result.transactions, transactions, matchedWallet.id));
                } else {
                    // Chưa có ví ngân hàng này -> YÊU CẦU TẠO VÍ!
                    setSelectedWalletId('');
                    setWalletMatchStatus('NOT_FOUND');
                    setCustomWalletName(`${result.detectedBank.name} Chi tiêu`);
                    setCustomWalletBalance(String(Math.max(0, computeOpeningBalance(result.detectedClosingBalance, result.transactions))));
                    setCustomWalletAccNum(result.detectedAccountNumber || '');
                    setParsedItems(checkDuplicates(result.transactions, transactions, ''));
                }
            } else {
                setWalletMatchStatus('MANUAL');
                const targetWallet = statementDefaultWalletId
                    ? wallets.find(w => w.id === statementDefaultWalletId)
                    : wallets.find(w => w.type === 'BANK') || wallets[0];
                const fallbackId = targetWallet ? targetWallet.id : (wallets[0]?.id || '');
                setSelectedWalletId(fallbackId);
                setParsedItems(checkDuplicates(result.transactions, transactions, fallbackId));
            }
        } catch (err) {
            console.error('Error parsing bank statement:', err);
            setParseError(err.message || 'Không thể đọc nội dung file sao kê. Vui lòng kiểm tra lại định dạng tệp.');
            setParsedItems([]);
        } finally {
            setIsParsing(false);
        }
    };

    // Tạo ví ngân hàng tự động (1-Click) hoặc tùy chỉnh
    const handleQuickCreateBankWallet = (customData = null) => {
        if (!detectedBank) return;
        // Số dư ban đầu của ví mới = số dư ĐẦU KỲ của sao kê (trước các giao dịch sẽ nạp),
        // nếu không sau khi nạp sẽ bị cộng/trừ 2 lần các giao dịch đã nằm sẵn trong số dư cuối kỳ.
        const initialBal = customData
            ? (Number(customData.balance) || 0)
            : Math.max(0, computeOpeningBalance(detectedClosingBalance, parsedItems));
        const accNum = customData?.accountNumber || detectedAccountNumber || '';
        const wName = customData?.name?.trim() || `${detectedBank.name} Chi tiêu`;

        const newWalletData = {
            name: wName,
            type: 'BANK',
            bankName: detectedBank.name,
            accountNumber: accNum,
            balance: initialBal,
            initialBalance: initialBal,
            currency: 'VND',
            color: detectedBank.color || '#0047BA',
            icon: detectedBank.icon || 'CreditCard',
        };

        const createdWallet = addWallet(newWalletData);
        setSelectedWalletId(createdWallet.id);
        setWalletMatchStatus('MATCHED');
        setShowCreateWalletModal(false);

        confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 },
        });

        // Cập nhật lại duplicate check với ví mới tạo
        setParsedItems(prev => checkDuplicates(prev, transactions, createdWallet.id));
    };

    const handleFileDrop = (e) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile) {
            handleFileProcess(droppedFile);
        }
    };

    // Chọn / Bỏ chọn một giao dịch
    const toggleSelectItem = (tempId) => {
        setParsedItems(prev => prev.map(item => {
            if (item.tempId === tempId) {
                return { ...item, selected: !item.selected };
            }
            return item;
        }));
    };

    // Chọn / Bỏ chọn tất cả
    const toggleSelectAll = (selectVal) => {
        setParsedItems(prev => prev.map(item => ({ ...item, selected: selectVal })));
    };

    // Bỏ chọn tất cả giao dịch trùng lặp
    const deselectAllDuplicates = () => {
        setParsedItems(prev => prev.map(item => {
            if (item.isDuplicate) {
                return { ...item, selected: false };
            }
            return item;
        }));
    };

    // Cập nhật danh mục cho một dòng giao dịch
    const handleCategoryChange = (tempId, newCategoryId) => {
        const cat = categories.find(c => c.id === newCategoryId);
        if (!cat) return;
        setParsedItems(prev => prev.map(item => {
            if (item.tempId === tempId) {
                return {
                    ...item,
                    categoryId: cat.id,
                    categoryName: cat.name,
                };
            }
            return item;
        }));
    };

    // Thống kê tính toán rõ ràng theo bản sao kê
    const selectedItems = parsedItems.filter(item => item.selected);
    const totalSelectedIncome = selectedItems
        .filter(item => item.type === 'INCOME')
        .reduce((sum, item) => sum + item.amount, 0);
    const totalSelectedExpense = selectedItems
        .filter(item => item.type === 'EXPENSE')
        .reduce((sum, item) => sum + item.amount, 0);
    const netSelectedChange = totalSelectedIncome - totalSelectedExpense;

    const duplicateCount = parsedItems.filter(item => item.isDuplicate).length;
    const incomeCount = parsedItems.filter(item => item.type === 'INCOME').length;
    const expenseCount = parsedItems.filter(item => item.type === 'EXPENSE').length;

    // Dự kiến số dư ví
    const currentBalance = currentWallet?.balance || 0;
    let projectedBalance = currentBalance;
    if (balanceAdjustmentMode === 'SET_EXACT' && detectedClosingBalance !== null) {
        projectedBalance = detectedClosingBalance;
    } else {
        if (currentWallet?.type === 'CREDIT') {
            projectedBalance = currentBalance + totalSelectedExpense - totalSelectedIncome;
        } else {
            projectedBalance = currentBalance + netSelectedChange;
        }
    }

    // Danh sách hiển thị theo bộ lọc
    const displayedItems = useMemo(() => {
        return parsedItems.filter(item => {
            if (activeFilterTab === 'INCOME' && item.type !== 'INCOME') return false;
            if (activeFilterTab === 'EXPENSE' && item.type !== 'EXPENSE') return false;
            if (activeFilterTab === 'DUPLICATE' && !item.isDuplicate) return false;
            if (activeFilterTab === 'SELECTED' && !item.selected) return false;

            if (searchFilter.trim()) {
                const term = searchFilter.toLowerCase();
                const matchNote = item.note.toLowerCase().includes(term);
                const matchCat = item.categoryName.toLowerCase().includes(term);
                const matchAmt = String(item.amount).includes(term);
                if (!matchNote && !matchCat && !matchAmt) return false;
            }
            return true;
        });
    }, [parsedItems, activeFilterTab, searchFilter]);

    // Thực hiện Import
    const handleExecuteImport = () => {
        if (selectedItems.length === 0) {
            alert('Vui lòng chọn ít nhất 1 giao dịch để nạp vào hệ thống.');
            return;
        }

        const result = importBankStatementTransactions({
            transactionsToImport: selectedItems,
            walletId: selectedWalletId,
            balanceAdjustmentMode,
            exactClosingBalance: detectedClosingBalance,
        });

        if (result.success) {
            confetti({
                particleCount: 90,
                spread: 70,
                origin: { y: 0.6 },
            });
            setImportSuccessResult(result);
        } else {
            alert(result.message || 'Có lỗi xảy ra khi nạp giao dịch');
        }
    };

    if (!statementModalOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                
                {/* 1. MODAL HEADER */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-sm">
                            <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span>Tải Sao Kê Ngân Hàng Tự Động</span>
                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                    Excel / CSV
                                </span>
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Nhận diện dòng tiền vào/ra, cộng trừ minh bạch và kiểm tra chống trùng lặp.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={closeStatementModal}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* 2. BODY CONTENT */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">

                    {/* MÀN HÌNH THÔNG BÁO THÀNH CÔNG */}
                    {importSuccessResult ? (
                        <div className="py-8 text-center space-y-5 max-w-md mx-auto">
                            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                                <CheckCircle2 className="w-9 h-9" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                    Nạp Sao Kê Thành Công!
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Đã ghi nhận an toàn <strong>{importSuccessResult.count} giao dịch</strong> vào ví <strong>{importSuccessResult.walletName}</strong>.
                                    {importSuccessResult.skipped > 0 && (
                                        <> Bỏ qua <strong>{importSuccessResult.skipped}</strong> giao dịch không hợp lệ (ngày trong tương lai hoặc số tiền sai).</>
                                    )}
                                </p>
                            </div>

                            {/* Bảng tổng kết số dư sau nạp */}
                            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-left space-y-2.5 text-xs">
                                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                                    <span>Tổng tiền vào (+):</span>
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                        +{formatCurrency(importSuccessResult.totalIncome)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                                    <span>Tổng tiền ra (-):</span>
                                    <span className="font-bold text-rose-600 dark:text-rose-400">
                                        -{formatCurrency(importSuccessResult.totalExpense)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-slate-700 dark:text-slate-200 pt-2 border-t border-slate-200 dark:border-slate-700">
                                    <span>Biến động số dư ròng:</span>
                                    <span className={`font-bold ${importSuccessResult.netChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {importSuccessResult.netChange >= 0 ? '+' : ''}{formatCurrency(importSuccessResult.netChange)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-slate-800 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-700 font-semibold">
                                    <span>Số dư ví hiện tại:</span>
                                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                        {formatCurrency(importSuccessResult.newBalance)}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={closeStatementModal}
                                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
                            >
                                Hoàn tất & Xem Sổ Giao Dịch
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* BƯỚC 1: KHUNG NHẬN DIỆN NGÂN HÀNG & LIÊN KẾT VÍ TRỪ TIỀN */}
                            {parsedItems.length > 0 && (
                                <div className="space-y-3">
                                    {/* TRƯỜNG HỢP 1: ĐÃ NHẬN DIỆN VÀ KHỚP ĐƯỢC VÍ NGÂN HÀNG CÓ SẴN */}
                                    {walletMatchStatus === 'MATCHED' && detectedBank && (
                                        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 border border-emerald-300 dark:border-emerald-700/60 shadow-xs">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <div className="flex items-center space-x-3.5 min-w-0">
                                                    <div
                                                        className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0"
                                                        style={{ backgroundColor: detectedBank.color || '#007A33' }}
                                                    >
                                                        <IconHelper name={detectedBank.icon || 'Building2'} size={22} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-xs font-black text-emerald-900 dark:text-emerald-200 uppercase tracking-wide">
                                                                Sao kê ngân hàng: {detectedBank.name}
                                                            </span>
                                                            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-100 flex items-center gap-1 shadow-2xs">
                                                                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-300" />
                                                                Đã khớp ví ngân hàng
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                                                            Khoản chi/thu sẽ được <strong>trừ/cộng trực tiếp vào ví:</strong> <strong className="underline decoration-emerald-500 font-bold">{currentWallet?.name}</strong> (Số dư hiện tại: {formatCurrency(currentWallet?.balance || 0)})
                                                            {detectedAccountNumber ? ` • Số TK: ${detectedAccountNumber}` : ''}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Dropdown đổi ví nếu người dùng có nhiều tài khoản cùng ngân hàng */}
                                                <div className="sm:w-60 shrink-0">
                                                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                                                        {t('bs.changeBankWallet', 'Đổi ví ngân hàng trừ tiền:')}
                                                    </label>
                                                    <select
                                                        value={selectedWalletId}
                                                        onChange={(e) => setSelectedWalletId(e.target.value)}
                                                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white shadow-xs focus:ring-2 focus:ring-emerald-500"
                                                    >
                                                        {wallets.map((w) => (
                                                            <option key={w.id} value={w.id}>
                                                                {tWalletName ? tWalletName(w.name) : w.name} ({formatCurrency(w.balance, language)})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* TRƯỜNG HỢP 2: NHẬN DIỆN ĐƯỢC NGÂN HÀNG NHƯNG CHƯA CÓ VÍ TRONG HỆ THỐNG (YÊU CẦU TẠO VÍ) */}
                                    {walletMatchStatus === 'NOT_FOUND' && detectedBank && (
                                        <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 border-2 border-amber-300 dark:border-amber-700 shadow-md space-y-3.5 animate-in fade-in duration-300">
                                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3.5">
                                                <div className="flex items-start space-x-3.5">
                                                    <div
                                                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0"
                                                        style={{ backgroundColor: detectedBank.color || '#0047BA' }}
                                                    >
                                                        <IconHelper name={detectedBank.icon || 'Building2'} size={24} />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <h4 className="text-sm font-black text-amber-950 dark:text-amber-100 uppercase tracking-wide">
                                                                {t('bs.detectedStatement', 'Phát hiện sao kê')}: {detectedBank.name}
                                                            </h4>
                                                            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 flex items-center gap-1 border border-amber-300 dark:border-amber-700">
                                                                <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                                                {t('bs.noWalletForBank', 'Chưa có ví ngân hàng này')}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-amber-900 dark:text-amber-200 mt-1 leading-relaxed max-w-xl">
                                                            {language === 'en'
                                                                ? `System detected this statement is from ${detectedBank.fullName || detectedBank.name}. To debit transactions properly from ${detectedBank.name}, please create a wallet for this bank first.`
                                                                : `Hệ thống xác định đây là bản sao kê của ${detectedBank.fullName || detectedBank.name}. Để các khoản chi/thu được trừ đúng vào ngân hàng ${detectedBank.name} và không làm sai lệch số dư các ví khác, bạn cần tạo ví mới cho ngân hàng này trước khi nạp.`}
                                                        </p>
                                                        {detectedAccountNumber && (
                                                            <div className="mt-2 inline-flex items-center gap-3 text-[11px] font-semibold text-amber-900 dark:text-amber-200 bg-amber-100/70 dark:bg-amber-900/40 px-2.5 py-1 rounded-lg">
                                                                <span>{t('bs.statementAccNum', 'Số TK sao kê')}: <strong>{detectedAccountNumber}</strong></span>
                                                                {detectedAccountHolder && <span>{t('bs.accHolder', 'Chủ TK')}: <strong>{detectedAccountHolder}</strong></span>}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Nút hành động tạo ví */}
                                                <div className="flex flex-col sm:items-end gap-2 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleQuickCreateBankWallet()}
                                                        className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer hover:shadow-lg active:scale-95"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                        <span>{language === 'en' ? `Create ${detectedBank.name} Wallet (1-Click)` : `Tạo ví ${detectedBank.name} ngay (1-Click)`}</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowCreateWalletModal(true)}
                                                        className="text-[11px] font-bold text-amber-700 dark:text-amber-300 hover:underline text-center cursor-pointer"
                                                    >
                                                        {t('bs.customWalletPrompt', 'Tùy chỉnh tên ví & số dư ban đầu...')}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Lựa chọn gộp ví khác nếu người dùng muốn */}
                                            <div className="pt-2 border-t border-amber-200/60 dark:border-amber-800/40 flex items-center justify-between flex-wrap gap-2 text-[11px] text-amber-800 dark:text-amber-300">
                                                <span>{language === 'en' ? `* Create ${detectedBank.name} wallet or choose an existing wallet to proceed.` : `* Yêu cầu tạo ví ${detectedBank.name} hoặc chỉ định một ví sẵn có để tiếp tục nạp.`}</span>
                                                <div className="flex items-center gap-1.5">
                                                    <span>{t('bs.orUseExisting', 'Hoặc dùng ví sẵn có:')}</span>
                                                    <select
                                                        value={selectedWalletId}
                                                        onChange={(e) => {
                                                            setSelectedWalletId(e.target.value);
                                                            if (e.target.value) setWalletMatchStatus('MATCHED');
                                                        }}
                                                        className="px-2 py-0.5 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-white"
                                                    >
                                                        <option value="">{t('bs.selectOtherWallet', '-- Chọn ví khác --')}</option>
                                                        {wallets.map((w) => (
                                                            <option key={w.id} value={w.id}>
                                                                {tWalletName ? tWalletName(w.name) : w.name} ({formatCurrency(w.balance, language)})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* TRƯỜNG HỢP 3: KHÔNG NHẬN DIỆN ĐƯỢC NGÂN HÀNG CỤ THỂ TỪ FILE */}
                                    {walletMatchStatus === 'MANUAL' && (
                                        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                            <div className="flex items-center gap-2.5">
                                                 <Info className="w-4 h-4 text-blue-500 shrink-0" />
                                                <span className="text-slate-600 dark:text-slate-300">
                                                    {t('bs.manualWalletPrompt', 'Chưa nhận diện được ngân hàng cụ thể từ file. Vui lòng chọn ví nhận giao dịch:')}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={selectedWalletId}
                                                    onChange={(e) => setSelectedWalletId(e.target.value)}
                                                    className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white"
                                                >
                                                    {wallets.map((w) => (
                                                        <option key={w.id} value={w.id}>
                                                            {tWalletName ? tWalletName(w.name) : w.name} ({formatCurrency(w.balance, language)})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* KHI CHƯA CHỌN FILE: HƯỚNG DẪN & NÚT TẢI FILE MẪU */}
                            {parsedItems.length === 0 && (
                                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/40 text-xs">
                                    <div className="flex items-center gap-2 text-blue-900 dark:text-blue-300">
                                        <Info className="w-4 h-4 text-blue-500 shrink-0" />
                                        <span>
                                            {t('bs.autoDetectInfo', 'Hệ thống tự động nhận diện ngân hàng (Techcombank, Vietcombank, MB Bank, VPBank...) và tự động khớp ví tương ứng để trừ tiền.')}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={downloadSampleStatementTemplate}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        <span>Tải file mẫu Techcombank (.xlsx)</span>
                                    </button>
                                </div>
                            )}

                            {/* KHUNG KÉO THẢ / CHỌN FILE */}
                            {parsedItems.length === 0 ? (
                                <div
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={handleFileDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`p-8 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 ${
                                        isParsing
                                            ? 'border-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20'
                                            : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 bg-slate-50/50 dark:bg-slate-800/20'
                                    }`}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".xlsx,.xls,.csv"
                                        className="hidden"
                                        onChange={(e) => {
                                            const f = e.target.files?.[0];
                                            if (f) handleFileProcess(f);
                                        }}
                                    />
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                                        {isParsing ? (
                                            <RefreshCw className="w-6 h-6 animate-spin" />
                                        ) : (
                                            <UploadCloud className="w-6 h-6" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800 dark:text-white">
                                            {isParsing ? 'Đang phân tích bảng sao kê...' : 'Kéo thả file sao kê vào đây hoặc bấm để chọn'}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                            Hỗ trợ định dạng Excel (.xlsx, .xls) và CSV (.csv) từ Vietcombank, Techcombank, MB, VPBank, ACB...
                                        </p>
                                    </div>
                                </div>
                            ) : null}

                            {/* BÁO LỖI NẾU CÓ */}
                            {parseError && (
                                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3 text-xs text-rose-800 dark:text-rose-300">
                                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold">Lỗi đọc file sao kê</p>
                                        <p className="mt-0.5">{parseError}</p>
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="mt-2 text-rose-700 dark:text-rose-200 underline font-semibold cursor-pointer"
                                        >
                                            Thử tải lại file khác
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* BƯỚC 2: BẢNG ĐỐI SOÁT & XEM TRƯỚC MINH BẠCH */}
                            {parsedItems.length > 0 && (
                                <div className="space-y-4">
                                    {/* 4 Thẻ thống kê cộng trừ rõ ràng */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        {/* Tiền vào */}
                                        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40">
                                            <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 mb-1">
                                                <span className="text-[11px] font-bold">Tổng Tiền Vào (+)</span>
                                                <ArrowDownLeft className="w-4 h-4" />
                                            </div>
                                            <div className="text-base font-bold text-emerald-700 dark:text-emerald-300">
                                                +{formatCurrency(totalSelectedIncome)}
                                            </div>
                                            <div className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
                                                {selectedItems.filter(i => i.type === 'INCOME').length} giao dịch thu
                                            </div>
                                        </div>

                                        {/* Tiền ra */}
                                        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40">
                                            <div className="flex items-center justify-between text-rose-700 dark:text-rose-400 mb-1">
                                                <span className="text-[11px] font-bold">Tổng Tiền Ra (-)</span>
                                                <ArrowUpRight className="w-4 h-4" />
                                            </div>
                                            <div className="text-base font-bold text-rose-700 dark:text-rose-300">
                                                -{formatCurrency(totalSelectedExpense)}
                                            </div>
                                            <div className="text-[10px] text-rose-600/80 dark:text-rose-400/80 mt-0.5">
                                                {selectedItems.filter(i => i.type === 'EXPENSE').length} giao dịch chi
                                            </div>
                                        </div>

                                        {/* Biến động ròng */}
                                        <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40">
                                            <div className="flex items-center justify-between text-blue-700 dark:text-blue-400 mb-1">
                                                <span className="text-[11px] font-bold">Biến Động Ròng</span>
                                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                                                    Thu - Chi
                                                </span>
                                            </div>
                                            <div className={`text-base font-bold ${netSelectedChange >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                {netSelectedChange >= 0 ? '+' : ''}{formatCurrency(netSelectedChange)}
                                            </div>
                                            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                {netSelectedChange >= 0 ? 'Tăng số dư' : 'Giảm số dư'}
                                            </div>
                                        </div>

                                        {/* Số dư ví sau nạp */}
                                        <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                            <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 mb-1">
                                                <span className="text-[11px] font-bold">Số Dư Sau Nạp</span>
                                                <Wallet className="w-4 h-4 text-indigo-500" />
                                            </div>
                                            <div className="text-base font-bold text-indigo-600 dark:text-indigo-400">
                                                {formatCurrency(projectedBalance)}
                                            </div>
                                            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                                Ví: {currentWallet?.name}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Cảnh báo trùng lặp (nếu có) */}
                                    {duplicateCount > 0 && (
                                        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-center justify-between flex-wrap gap-2 text-xs">
                                            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                                                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                                <span>
                                                    Phát hiện <strong>{duplicateCount} giao dịch trùng lặp</strong> đã có trong hệ thống (đã tự động bỏ chọn để tránh cộng trừ 2 lần).
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={deselectAllDuplicates}
                                                className="px-2.5 py-1 bg-amber-200 dark:bg-amber-900 hover:bg-amber-300 text-amber-900 dark:text-amber-100 font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
                                            >
                                                Bỏ chọn tất cả trùng lặp
                                            </button>
                                        </div>
                                    )}

                                    {/* Tùy chọn khớp số dư nếu sao kê có số dư cuối */}
                                    {detectedClosingBalance !== null && (
                                        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                            <div className="flex items-center gap-2">
                                                <Info className="w-4 h-4 text-blue-500" />
                                                <span>
                                                    Phát hiện số dư cuối trên sao kê: <strong>{formatCurrency(detectedClosingBalance)}</strong>
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <label className="flex items-center gap-1.5 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="balanceMode"
                                                        checked={balanceAdjustmentMode === 'NET_CHANGE'}
                                                        onChange={() => setBalanceAdjustmentMode('NET_CHANGE')}
                                                        className="text-emerald-600 focus:ring-emerald-500"
                                                    />
                                                    <span>Cộng trừ theo biến động ròng</span>
                                                </label>
                                                <label className="flex items-center gap-1.5 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="balanceMode"
                                                        checked={balanceAdjustmentMode === 'SET_EXACT'}
                                                        onChange={() => setBalanceAdjustmentMode('SET_EXACT')}
                                                        className="text-emerald-600 focus:ring-emerald-500"
                                                    />
                                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                                        Khớp chuẩn số dư ngân hàng
                                                    </span>
                                                </label>
                                            </div>
                                        </div>
                                    )}

                                    {/* THANH ĐIỀU HƯỚNG VÀ LỌC BẢNG */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                                        {/* Tabs */}
                                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
                                            <button
                                                type="button"
                                                onClick={() => setActiveFilterTab('ALL')}
                                                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                                                    activeFilterTab === 'ALL'
                                                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                                }`}
                                            >
                                                {t('common.all', 'Tất cả')} ({parsedItems.length})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setActiveFilterTab('INCOME')}
                                                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                                                    activeFilterTab === 'INCOME'
                                                        ? 'bg-emerald-600 text-white'
                                                        : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                                                }`}
                                            >
                                                {language === 'en' ? 'Income' : 'Tiền vào'} ({incomeCount})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setActiveFilterTab('EXPENSE')}
                                                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                                                    activeFilterTab === 'EXPENSE'
                                                        ? 'bg-rose-600 text-white'
                                                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100'
                                                }`}
                                            >
                                                {language === 'en' ? 'Expense' : 'Tiền ra'} ({expenseCount})
                                            </button>
                                            {duplicateCount > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveFilterTab('DUPLICATE')}
                                                    className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                                                        activeFilterTab === 'DUPLICATE'
                                                            ? 'bg-amber-600 text-white'
                                                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
                                                    }`}
                                                >
                                                    {language === 'en' ? 'Duplicates' : 'Trùng lặp'} ({duplicateCount})
                                                </button>
                                            )}
                                        </div>

                                        {/* Tìm kiếm nhanh */}
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                placeholder="Lọc nội dung hoặc số tiền..."
                                                value={searchFilter}
                                                onChange={(e) => setSearchFilter(e.target.value)}
                                                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full sm:w-48"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer shrink-0"
                                                title="Đổi file khác"
                                            >
                                                Đổi file
                                            </button>
                                        </div>
                                    </div>

                                    {/* BẢNG CHI TIẾT GIAO DỊCH */}
                                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
                                        <div className="max-h-72 overflow-y-auto">
                                            <table className="w-full text-left text-xs border-collapse">
                                                <thead className="bg-slate-100 dark:bg-slate-800/80 sticky top-0 z-10 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                                                    <tr>
                                                        <th className="p-3 w-10 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedItems.length > 0 && selectedItems.length === parsedItems.length}
                                                                onChange={(e) => toggleSelectAll(e.target.checked)}
                                                                className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                                            />
                                                        </th>
                                                        <th className="p-3 w-28">Ngày</th>
                                                        <th className="p-3 w-28">Loại</th>
                                                        <th className="p-3 w-32 text-right">Số tiền</th>
                                                        <th className="p-3 w-40">Danh mục</th>
                                                        <th className="p-3">Nội dung chi tiết</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
                                                    {displayedItems.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={6} className="p-8 text-center text-slate-400">
                                                                Không có giao dịch nào khớp với bộ lọc
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        displayedItems.map((item) => (
                                                            <tr
                                                                key={item.tempId}
                                                                className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                                                                    item.isDuplicate ? 'bg-amber-50/40 dark:bg-amber-950/10' : ''
                                                                } ${!item.selected ? 'opacity-50' : ''}`}
                                                            >
                                                                {/* Checkbox */}
                                                                <td className="p-3 text-center">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={item.selected}
                                                                        onChange={() => toggleSelectItem(item.tempId)}
                                                                        className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                                                    />
                                                                </td>

                                                                {/* Ngày */}
                                                                <td className="p-3 whitespace-nowrap text-slate-600 dark:text-slate-300 font-medium">
                                                                    {formatDate(item.date, 'short', language)}
                                                                </td>

                                                                {/* Loại GD */}
                                                                <td className="p-3 whitespace-nowrap">
                                                                    <span
                                                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                                            item.type === 'INCOME'
                                                                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                                                                : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                                                                        }`}
                                                                    >
                                                                        {item.type === 'INCOME' ? (
                                                                            <ArrowDownLeft className="w-3 h-3" />
                                                                        ) : (
                                                                            <ArrowUpRight className="w-3 h-3" />
                                                                        )}
                                                                        {item.type === 'INCOME' ? (language === 'en' ? 'Income' : 'Tiền vào') : (language === 'en' ? 'Expense' : 'Tiền ra')}
                                                                    </span>
                                                                </td>

                                                                {/* Số tiền */}
                                                                <td
                                                                    className={`p-3 whitespace-nowrap text-right font-bold ${
                                                                        item.type === 'INCOME'
                                                                            ? 'text-emerald-600 dark:text-emerald-400'
                                                                            : 'text-rose-600 dark:text-rose-400'
                                                                    }`}
                                                                >
                                                                    {item.type === 'INCOME' ? '+' : '-'}{formatCurrency(item.amount, language)}
                                                                </td>

                                                                {/* Danh mục */}
                                                                <td className="p-3">
                                                                    <select
                                                                        value={item.categoryId}
                                                                        onChange={(e) => handleCategoryChange(item.tempId, e.target.value)}
                                                                        className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-[11px] text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                                                    >
                                                                        {categories
                                                                            .filter((c) => c.type === item.type)
                                                                            .map((cat) => (
                                                                                <option key={cat.id} value={cat.id}>
                                                                                    {tCategory(cat.name)}
                                                                                </option>
                                                                            ))}
                                                                    </select>
                                                                </td>

                                                                {/* Nội dung chi tiết */}
                                                                <td className="p-3">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-slate-800 dark:text-slate-200 font-normal line-clamp-1" title={item.note}>
                                                                            {item.note}
                                                                        </span>
                                                                        {item.isDuplicate && (
                                                                            <span
                                                                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-bold shrink-0"
                                                                                title={item.duplicateReason}
                                                                            >
                                                                                <AlertTriangle className="w-2.5 h-2.5" />
                                                                                Trùng
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                </div>

                {/* 3. MODAL FOOTER */}
                {!importSuccessResult && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                            {parsedItems.length > 0 ? (
                                <span>
                                    {language === 'en' ? 'Selected: ' : 'Đã chọn: '}<strong className="text-slate-800 dark:text-white">{selectedItems.length}</strong> / {parsedItems.length} {language === 'en' ? 'transactions' : 'giao dịch'}
                                </span>
                            ) : (
                                <span>{language === 'en' ? 'Select an Excel or CSV file to start' : 'Chọn file Excel hoặc CSV để bắt đầu'}</span>
                            )}
                        </div>

                        <div className="flex items-center gap-2.5">
                            <button
                                type="button"
                                onClick={closeStatementModal}
                                className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                            >
                                {t('common.cancel', 'Hủy bỏ')}
                            </button>

                            {parsedItems.length > 0 && (
                                <button
                                    type="button"
                                    onClick={handleExecuteImport}
                                    disabled={selectedItems.length === 0 || !selectedWalletId}
                                    className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all ${
                                        selectedItems.length === 0 || !selectedWalletId
                                            ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                                            : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95'
                                    }`}
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>
                                        {selectedWalletId
                                            ? (language === 'en'
                                                ? `Confirm import ${selectedItems.length} transactions into ${currentWallet ? (tWalletName ? tWalletName(currentWallet.name) : currentWallet.name) : 'wallet'}`
                                                : `Xác nhận nạp ${selectedItems.length} giao dịch vào ví ${currentWallet ? (tWalletName ? tWalletName(currentWallet.name) : currentWallet.name) : ''}`)
                                            : (language === 'en'
                                                ? `Create or select wallet for ${detectedBank?.name || 'bank'} to import`
                                                : `Yêu cầu tạo hoặc chọn ví ${detectedBank?.name || 'ngân hàng'} để nạp`)}
                                    </span>
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* MODAL NHỎ: TÙY CHỈNH THÔNG TIN TẠO VÍ NGÂN HÀNG MỚI */}
                {showCreateWalletModal && detectedBank && (
                    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex items-center space-x-2.5">
                                    <div
                                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-xs"
                                        style={{ backgroundColor: detectedBank.color || '#0047BA' }}
                                    >
                                        <IconHelper name={detectedBank.icon || 'Building2'} size={18} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                                            Tạo Ví Ngân Hàng {detectedBank.name}
                                        </h4>
                                        <span className="text-[10px] text-slate-400">
                                            Liên kết trừ tiền sao kê tự động
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowCreateWalletModal(false)}
                                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleQuickCreateBankWallet({
                                        name: customWalletName,
                                        balance: customWalletBalance,
                                        accountNumber: customWalletAccNum,
                                    });
                                }}
                                className="space-y-3.5"
                            >
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                        Tên ví ngân hàng
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={customWalletName}
                                        onChange={(e) => setCustomWalletName(e.target.value)}
                                        placeholder={`Ví dụ: ${detectedBank.name} Chi tiêu`}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                        Số tài khoản ngân hàng
                                    </label>
                                    <input
                                        type="text"
                                        value={customWalletAccNum}
                                        onChange={(e) => setCustomWalletAccNum(e.target.value)}
                                        placeholder="Số TK ngân hàng (nếu có)"
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                        Số dư đầu kỳ (trước các giao dịch trong sao kê, VNĐ)
                                    </label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={formatNumberWithDots(customWalletBalance)}
                                        onChange={(e) => {
                                            const cleaned = e.target.value.replace(/\D/g, '');
                                            setCustomWalletBalance(cleaned);
                                        }}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-black text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                                    />
                                </div>

                                <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateWalletModal(false)}
                                        className="px-3.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium cursor-pointer"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-1.5 text-xs bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl font-bold shadow-sm cursor-pointer"
                                    >
                                        Tạo và liên kết ví ngay
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};
