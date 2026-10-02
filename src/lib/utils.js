import * as XLSX from 'xlsx';
import { translateCategory, translateWalletName, translateTag, translateNote } from './i18n';
export function formatCurrency(amount) {
    if (typeof amount !== 'number' || isNaN(amount) || !isFinite(amount)) {
        return '0 ₫';
    }
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(amount);
}
export function formatNumberWithDots(val) {
    if (val === null || val === undefined || val === '')
        return '';
    const str = String(val).replace(/\D/g, '');
    if (!str)
        return '';
    const trimmed = str.length > 1 ? str.replace(/^0+/, '') || '0' : str;
    return trimmed.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
function readThreeDigits(nStr, isHighestGroup) {
    const padded = nStr.padStart(3, '0');
    const h = parseInt(padded[0], 10);
    const t = parseInt(padded[1], 10);
    const u = parseInt(padded[2], 10);
    if (h === 0 && t === 0 && u === 0)
        return '';
    const words = [];
    // Hundreds
    if (!isHighestGroup || h > 0) {
        words.push(DIGITS[h] + ' trăm');
    }
    // Tens
    if (t === 0) {
        if (u > 0) {
            if (!isHighestGroup || h > 0) {
                words.push('lẻ ' + (u === 5 && (h > 0 || !isHighestGroup) ? 'năm' : DIGITS[u]));
            }
            else {
                words.push(DIGITS[u]);
            }
        }
    }
    else if (t === 1) {
        words.push('mười');
        if (u === 1)
            words.push('một');
        else if (u === 5)
            words.push('lăm');
        else if (u > 0)
            words.push(DIGITS[u]);
    }
    else {
        words.push(DIGITS[t] + ' mươi');
        if (u === 1)
            words.push('mốt');
        else if (u === 4)
            words.push('tư');
        else if (u === 5)
            words.push('lăm');
        else if (u > 0)
            words.push(DIGITS[u]);
    }
    return words.join(' ');
}
export function numberToVietnameseWords(value) {
    if (value === null || value === undefined || value === '')
        return '';
    const str = String(value).trim().replace(/\D/g, '');
    if (!str)
        return '';
    const trimmed = str.replace(/^0+/, '');
    if (!trimmed)
        return 'Không đồng';
    const groups = [];
    for (let i = trimmed.length; i > 0; i -= 3) {
        const start = Math.max(0, i - 3);
        groups.unshift(trimmed.slice(start, i));
    }
    const groupCount = groups.length;
    const resultParts = [];
    for (let i = 0; i < groupCount; i++) {
        const groupStr = groups[i];
        const isHighest = i === 0;
        const groupWords = readThreeDigits(groupStr, isHighest);
        const power = groupCount - 1 - i;
        if (groupWords) {
            let unit = '';
            if (power > 0) {
                const basePower = power % 3;
                const tyLevel = Math.floor(power / 3);
                const baseUnit = ['', 'nghìn', 'triệu'][basePower];
                const tyUnit = ' tỷ'.repeat(tyLevel);
                unit = (baseUnit ? baseUnit + tyUnit : tyUnit.trim()).trim();
            }
            resultParts.push(groupWords + (unit ? ' ' + unit : ''));
        }
    }
    let finalStr = resultParts.join(' ').replace(/\s+/g, ' ').trim();
    if (!finalStr)
        return 'Không đồng';
    finalStr = finalStr.charAt(0).toUpperCase() + finalStr.slice(1) + ' đồng';
    return finalStr;
}

const EN_ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const EN_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function readThreeDigitsEn(num) {
    let str = '';
    const h = Math.floor(num / 100);
    const rest = num % 100;
    if (h > 0) {
        str += EN_ONES[h] + ' hundred';
        if (rest > 0) str += ' and ';
    }
    if (rest > 0) {
        if (rest < 20) {
            str += EN_ONES[rest];
        } else {
            const t = Math.floor(rest / 10);
            const u = rest % 10;
            str += EN_TENS[t] + (u > 0 ? '-' + EN_ONES[u] : '');
        }
    }
    return str.trim();
}

export function numberToEnglishWords(value) {
    if (value === null || value === undefined || value === '') return '';
    const num = Math.floor(Number(value));
    if (isNaN(num) || num <= 0) return 'Zero VND';
    const scales = ['', 'thousand', 'million', 'billion', 'trillion'];
    let n = num;
    const parts = [];
    let scaleIndex = 0;
    while (n > 0 && scaleIndex < scales.length) {
        const chunk = n % 1000;
        if (chunk > 0) {
            const chunkWords = readThreeDigitsEn(chunk);
            const scale = scales[scaleIndex];
            parts.unshift(scale ? `${chunkWords} ${scale}` : chunkWords);
        }
        n = Math.floor(n / 1000);
        scaleIndex++;
    }
    const res = parts.join(', ').trim();
    return res ? res.charAt(0).toUpperCase() + res.slice(1) + ' VND' : 'Zero VND';
}

export function formatAmountInWords(amount, language = 'vi') {
    return language === 'en' ? numberToEnglishWords(amount) : numberToVietnameseWords(amount);
}
export function getLocalDateString(d = new Date()) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Extracts YYYY-MM-DD in local time, preventing UTC date rollback.
 */
export function toLocalDateKey(dateStr) {
    if (!dateStr) return '';
    if (typeof dateStr === 'string' && (dateStr.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(dateStr))) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        }
    }
    return String(dateStr).split('T')[0];
}

/**
 * Converts a timestamp into YYYY-MM-DDTHH:mm format for datetime-local inputs.
 * Preserves user's local time without timezone shifts.
 */
export function toLocalDateTimeInput(dateInput) {
    if (!dateInput) {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        return `${y}-${m}-${d}T${hh}:${mm}`;
    }

    if (typeof dateInput === 'string' && (dateInput.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(dateInput))) {
        const d = new Date(dateInput);
        if (!isNaN(d.getTime())) {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const hh = String(d.getHours()).padStart(2, '0');
            const mm = String(d.getMinutes()).padStart(2, '0');
            return `${y}-${m}-${day}T${hh}:${mm}`;
        }
    }

    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(dateInput)) {
        return dateInput.slice(0, 16);
    }

    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day}T${hh}:${mm}`;
}

/**
 * Normalizes values from datetime-local input or date picker for local time storage.
 * Format: 'YYYY-MM-DDTHH:mm:ss' (Local ISO, without trailing Z to avoid timezone shifts)
 */
export function normalizeSaveDate(dateInput) {
    if (!dateInput) {
        return toLocalDateTimeInput() + ':00';
    }
    if (typeof dateInput === 'string') {
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dateInput)) {
            return `${dateInput}:00`;
        }
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(dateInput)) {
            return dateInput;
        }
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
            const now = new Date();
            const hh = String(now.getHours()).padStart(2, '0');
            const mm = String(now.getMinutes()).padStart(2, '0');
            const ss = String(now.getSeconds()).padStart(2, '0');
            return `${dateInput}T${hh}:${mm}:${ss}`;
        }
    }
    return toLocalDateTimeInput(dateInput) + ':00';
}
export function formatDisplayDate(dateStr, lang = 'vi') {
    if (!dateStr)
        return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [y, m, d] = dateStr.split('-');
        if (lang === 'en') {
            return `${m}/${d}/${y}`;
        }
        return `${d}/${m}/${y}`;
    }
    return formatDate(dateStr, 'dateOnly', lang);
}
export function formatDate(dateString, type = 'short', lang = 'vi') {
    try {
        if (!dateString) return '';
        let date;
        if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            const [y, m, d] = dateString.split('-').map(Number);
            date = new Date(y, m - 1, d, 12, 0, 0);
        } else {
            date = new Date(dateString);
        }
        if (isNaN(date.getTime()))
            return dateString;
        const locale = lang === 'en' ? 'en-US' : 'vi-VN';
        if (type === 'time') {
            return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
        }
        if (type === 'dateOnly') {
            return date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
        if (type === 'dateWithDay') {
            return date.toLocaleDateString(locale, {
                weekday: 'short',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        }
        if (type === 'full') {
            return date.toLocaleDateString(locale, {
                weekday: 'short',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        }
        return date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    catch {
        return dateString;
    }
}
export function calculateFinancialSummary(wallets, transactions, monthStr = '2026-09') {
    // Available balance: Cash + Bank
    const availableBalance = wallets
        .filter((w) => w.type === 'CASH' || w.type === 'BANK')
        .reduce((sum, w) => sum + w.balance, 0);
    // Credit Card debt
    const totalCreditDebt = wallets
        .filter((w) => w.type === 'CREDIT')
        .reduce((sum, w) => sum + w.balance, 0);
    // Savings
    const totalSavings = wallets
        .filter((w) => w.type === 'SAVINGS')
        .reduce((sum, w) => sum + w.balance, 0);
    // Net assets = Cash + Bank + Savings - Credit Card Debt
    const totalAssets = availableBalance + totalSavings - totalCreditDebt;
    // Monthly transactions - strictly up to today (no future transactions exist)
    const todayKey = getLocalDateString();
    const currentMonthTxs = transactions.filter((t) => {
        const d = toLocalDateKey(t.date);
        return d.startsWith(monthStr) && d <= todayKey;
    });
    const monthlyIncome = currentMonthTxs
        .filter((t) => t.type === 'INCOME')
        .reduce((sum, t) => sum + t.amount, 0);
    const monthlyExpense = currentMonthTxs
        .filter((t) => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + t.amount, 0);

    const netSavingsThisMonth = monthlyIncome - monthlyExpense;
    const savingsRate = monthlyIncome > 0 ? Math.max(0, Math.round((netSavingsThisMonth / monthlyIncome) * 100)) : 0;
    return {
        totalAssets,
        availableBalance,
        totalCreditDebt,
        totalSavings,
        monthlyIncome,
        monthlyExpense,
        netSavingsThisMonth,
        savingsRate,
    };
}
export function calculateBudgetStatuses(budgets, transactions, monthStr = '2026-09') {
    const todayKey = getLocalDateString();
    const currentMonthExpenses = transactions.filter((t) => {
        const d = toLocalDateKey(t.date);
        return t.type === 'EXPENSE' && d.startsWith(monthStr) && d <= todayKey;
    });
    return budgets.map((b) => {
        const spent = currentMonthExpenses
            .filter((t) => t.categoryId === b.categoryId)
            .reduce((sum, t) => sum + t.amount, 0);
        const percentage = b.amount > 0 ? (spent / b.amount) * 100 : 0;
        const remaining = b.amount - spent;
        let status = 'SAFE';
        if (percentage >= 100) {
            status = 'EXCEEDED';
        }
        else if (percentage >= 80) {
            status = 'WARNING';
        }
        return {
            budget: b,
            spent,
            remaining,
            percentage: Math.round(percentage * 10) / 10,
            status,
        };
    });
}
export function exportToCSV(transactions, filename = 'bao-cao-giao-dich.csv', lang = 'vi') {
    const L = (vi, en) => (lang === 'en' ? en : vi);
    const tr = (fn, v) => (v ? fn(v, lang) : v);
    const headers = [L('Mã GD', 'Tx ID'), L('Thời gian', 'Time'), L('Loại GD', 'Type'), L('Danh mục', 'Category'), L('Số tiền (VND)', 'Amount (VND)'), L('Ví nguồn', 'Source wallet'), L('Ví đích/Ghi chú', 'Destination wallet/Note'), L('Nhãn', 'Tags')];
    const rows = transactions.map((t) => [
        t.id,
        formatDate(t.date, 'full', lang),
        t.type === 'EXPENSE' ? L('Chi tiêu', 'Expense') : t.type === 'INCOME' ? L('Thu nhập', 'Income') : L('Chuyển khoản', 'Transfer'),
        tr(translateCategory, t.categoryName) || L('Không có', 'None'),
        t.amount,
        tr(translateWalletName, t.walletName) || t.walletId,
        t.type === 'TRANSFER' ? (tr(translateWalletName, t.toWalletName) || t.toWalletId || '') : translateNote(t.note || '', lang),
        (t.tags || []).map((tag) => translateTag(tag, lang)).join('; '),
    ]);
    const csvContent = '\uFEFF' +
        [headers, ...rows]
            .map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','))
            .join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 0);
}
export function exportToExcel(transactions, budgets, wallets, summary, filename = 'Bao-Cao-Tai-Chinh-Chi-Tieu.xlsx', monthStr = getLocalDateString().slice(0, 7), lang = 'vi') {
    const L = (vi, en) => (lang === 'en' ? en : vi);
    const tr = (fn, v) => (v ? fn(v, lang) : v);
    const wb = XLSX.utils.book_new();
    // Sheet 1: Transaction list
    const txData = transactions.map((t, idx) => ({
        [L('STT', 'No.')]: idx + 1,
        [L('Mã GD', 'Tx ID')]: t.id,
        [L('Thời gian', 'Time')]: formatDate(t.date, 'full', lang),
        [L('Loại giao dịch', 'Type')]: t.type === 'EXPENSE' ? L('Khoản chi', 'Expense') : t.type === 'INCOME' ? L('Khoản thu', 'Income') : L('Chuyển khoản nội bộ', 'Internal transfer'),
        [L('Danh mục', 'Category')]: tr(translateCategory, t.categoryName) || L('Khác', 'Other'),
        [L('Số tiền (₫)', 'Amount (₫)')]: t.amount,
        [L('Tài khoản / Ví', 'Account / Wallet')]: tr(translateWalletName, t.walletName) || t.walletId,
        [L('Ví đích (nếu chuyển)', 'Destination wallet (transfers)')]: tr(translateWalletName, t.toWalletName) || '',
        [L('Ghi chú', 'Note')]: translateNote(t.note || '', lang),
        [L('Nhãn phân loại', 'Tags')]: (t.tags || []).map((tag) => translateTag(tag, lang)).join(', '),
    }));
    const wsTx = XLSX.utils.json_to_sheet(txData);
    XLSX.utils.book_append_sheet(wb, wsTx, L('Sổ Giao Dịch', 'Transactions'));
    // Sheet 2: Asset summary & wallets
    const walletData = wallets.map((w) => ({
        [L('Tên Ví / Tài khoản', 'Wallet / Account')]: tr(translateWalletName, w.name),
        [L('Loại ví', 'Wallet type')]: w.type === 'CASH' ? L('Tiền mặt', 'Cash') : w.type === 'BANK' ? L('Ngân hàng', 'Bank') : w.type === 'CREDIT' ? L('Thẻ tín dụng', 'Credit card') : L('Sổ tiết kiệm', 'Savings'),
        [L('Số dư hiện tại (₫)', 'Current balance (₫)')]: w.balance,
        [L('Hạn mức (Thẻ tín dụng)', 'Credit limit')]: w.creditLimit || '-',
        [L('Lãi suất (%/năm)', 'Interest rate (%/yr)')]: w.interestRate ? `${w.interestRate}%` : '-',
        [L('Số tài khoản / Thẻ', 'Account / Card number')]: w.accountNumber || '-',
    }));
    const wsWallets = XLSX.utils.json_to_sheet(walletData);
    XLSX.utils.book_append_sheet(wb, wsWallets, L('Tài Khoản & Ví', 'Accounts & Wallets'));
    // Sheet 3: Budget report
    const budgetStatuses = calculateBudgetStatuses(budgets, transactions, monthStr);
    const budgetData = budgetStatuses.map((bs) => ({
        [L('Danh mục', 'Category')]: tr(translateCategory, bs.budget.categoryName),
        [L('Hạn mức tháng (₫)', 'Monthly limit (₫)')]: bs.budget.amount,
        [L('Đã chi tiêu (₫)', 'Spent (₫)')]: bs.spent,
        [L('Còn lại (₫)', 'Remaining (₫)')]: bs.remaining,
        [L('Tỷ lệ đã dùng (%)', 'Used (%)')]: `${bs.percentage}%`,
        [L('Tình trạng cảnh báo', 'Status')]: bs.status === 'EXCEEDED' ? L('VƯỢT 100% NGÂN SÁCH', 'OVER 100% OF BUDGET') : bs.status === 'WARNING' ? L('CẢNH BÁO (>80%)', 'WARNING (>80%)') : L('An toàn', 'Safe'),
    }));
    const wsBudgets = XLSX.utils.json_to_sheet(budgetData);
    XLSX.utils.book_append_sheet(wb, wsBudgets, L('Theo Dõi Ngân Sách', 'Budget Tracking'));
    // Sheet 4: Financial KPIs summary
    const metric = L('Chỉ tiêu', 'Metric');
    const value = L('Giá trị (₫)', 'Value (₫)');
    const kpiData = [
        [L('Tổng tài sản ròng', 'Total net worth'), summary.totalAssets],
        [L('Số dư khả dụng (Tiền mặt + Ngân hàng)', 'Available balance (Cash + Bank)'), summary.availableBalance],
        [L('Dư nợ thẻ tín dụng', 'Credit card debt'), summary.totalCreditDebt],
        [L('Tổng tiền gửi tiết kiệm', 'Total savings deposits'), summary.totalSavings],
        [L('Tổng thu nhập tháng này', 'Total income this month'), summary.monthlyIncome],
        [L('Tổng chi tiêu tháng này', 'Total spending this month'), summary.monthlyExpense],
        [L('Tích lũy ròng trong tháng', 'Net savings this month'), summary.netSavingsThisMonth],
        [L('Tỷ lệ tiết kiệm', 'Savings rate'), `${summary.savingsRate}%`],
    ].map(([k, v]) => ({ [metric]: k, [value]: v }));
    const wsKPI = XLSX.utils.json_to_sheet(kpiData);
    XLSX.utils.book_append_sheet(wb, wsKPI, L('Tổng Hợp Tài Chính', 'Financial Summary'));
    XLSX.writeFile(wb, filename);
}
export function getWalletAvailableBalance(wallet) {
    if (!wallet)
        return 0;
    if (wallet.type === 'CREDIT') {
        const limit = wallet.creditLimit || 0;
        return Math.max(0, limit - wallet.balance);
    }
    return Math.max(0, wallet.balance);
}
export function checkWalletSufficientFunds(wallet, amount, fee = 0, lang = 'vi') {
    if (!wallet) {
        return {
            isValid: false,
            availableBalance: 0,
            requiredAmount: amount + fee,
            shortfall: amount + fee,
            errorMessage: lang === 'en' ? 'Please select a valid wallet' : 'Vui lòng chọn ví hợp lệ',
        };
    }
    const numAmount = Number(amount) || 0;
    const numFee = Number(fee) || 0;
    const requiredAmount = numAmount + numFee;
    if (requiredAmount <= 0) {
        return {
            isValid: false,
            availableBalance: getWalletAvailableBalance(wallet),
            requiredAmount: 0,
            shortfall: 0,
            errorMessage: lang === 'en' ? 'Transaction amount must be greater than 0' : 'Số tiền giao dịch phải lớn hơn 0',
        };
    }
    const availableBalance = getWalletAvailableBalance(wallet);
    if (requiredAmount > availableBalance) {
        const shortfall = requiredAmount - availableBalance;
        let errorMsg;
        if (lang === 'en') {
            errorMsg = wallet.type === 'CREDIT'
                ? `Amount (${formatCurrency(requiredAmount, 'en')}) exceeds remaining limit of card ${wallet.name} (${formatCurrency(availableBalance, 'en')} remaining).`
                : `Amount (${formatCurrency(requiredAmount, 'en')}) exceeds available balance of wallet ${wallet.name} (${formatCurrency(availableBalance, 'en')} available). Overdrawing is not allowed!`;
        } else {
            errorMsg = wallet.type === 'CREDIT'
                ? `Số tiền (${formatCurrency(requiredAmount)}) vượt quá hạn mức còn lại của thẻ ${wallet.name} (còn ${formatCurrency(availableBalance)}).`
                : `Số tiền (${formatCurrency(requiredAmount)}) vượt quá số dư hiện có của ví ${wallet.name} (hiện có ${formatCurrency(availableBalance)}). Không thể giao dịch làm âm quỹ!`;
        }
        return {
            isValid: false,
            availableBalance,
            requiredAmount,
            shortfall,
            errorMessage: errorMsg,
        };
    }
    return {
        isValid: true,
        availableBalance,
        requiredAmount,
        shortfall: 0,
    };
}
export function formatCompactNumber(val, lang = 'vi') {
    if (!val || val === 0)
        return '0';
    const abs = Math.abs(val);
    const sign = val < 0 ? '-' : '';
    if (abs >= 1_000_000_000) {
        const num = abs / 1_000_000_000;
        return `${sign}${num % 1 === 0 ? num.toFixed(0) : num.toFixed(1)}${lang === 'en' ? 'B' : 'Tỷ'}`;
    }
    if (abs >= 1_000_000) {
        const num = abs / 1_000_000;
        return `${sign}${num % 1 === 0 ? num.toFixed(0) : num.toFixed(1)}${lang === 'en' ? 'M' : 'Tr'}`;
    }
    if (abs >= 1_000) {
        return `${sign}${(abs / 1_000).toFixed(0)}k`;
    }
    return `${sign}${abs}`;
}
export function formatMonthLabel(monthStr, language = 'vi') {
    if (!monthStr || monthStr === 'ALL') {
        return language === 'en' ? 'All months' : 'Tất cả các tháng';
    }
    const parts = monthStr.split('-');
    if (parts.length < 2)
        return monthStr;
    const y = parts[0];
    const m = parts[1];
    if (language === 'en') {
        const mNum = parseInt(m, 10);
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${monthNames[mNum - 1] || m} ${y}`;
    }
    return `Tháng ${m}/${y}`;
}

export function formatWalletOptionLabel(wallet, language = 'vi') {
    if (!wallet) return '';
    if (wallet.type === 'CREDIT') {
        const debtLabel = language === 'en' ? 'Debt' : 'Dư nợ';
        const limitLabel = language === 'en' ? 'Remaining limit' : 'Hạn mức còn';
        const noLimitLabel = language === 'en' ? 'Liability, cannot spend' : 'Khoản nợ, không thể chi tiêu';
        if (wallet.creditLimit && wallet.creditLimit > 0) {
            const avail = Math.max(0, wallet.creditLimit - wallet.balance);
            return `${wallet.name} [${limitLabel}: ${formatCurrency(avail, language)} • ${debtLabel}: ${formatCurrency(wallet.balance, language)}]`;
        }
        return `${wallet.name} [${debtLabel}: ${formatCurrency(wallet.balance, language)} - ${noLimitLabel}]`;
    }
    return `${wallet.name} (${formatCurrency(wallet.balance, language)})`;
}

// Single transaction upper bound: 999 billion (safe with Number.MAX_SAFE_INTEGER)
export const MAX_TX_AMOUNT = 999_999_999_999;

/**
 * Generate unique ID, avoiding collisions during sub-millisecond operations
 */
export function generateId(prefix) {
    const rand = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID().slice(0, 8)
        : Math.random().toString(36).slice(2, 10);
    return `${prefix}-${Date.now()}-${rand}`;
}

/**
 * Calculate effect of a transaction on wallet balance (accounting for credit liability direction).
 * Asset wallets: positive = more funds. Credit cards: balance represents liability so expenses increase debt.
 */
export function getTxWalletDelta(tx, wallet) {
    if (!tx || !wallet)
        return 0;
    const amount = Number(tx.amount) || 0;
    const fee = Number(tx.fee) || 0;
    let assetDelta = 0;
    if (tx.type === 'EXPENSE' && tx.walletId === wallet.id) {
        assetDelta = -amount;
    }
    else if (tx.type === 'INCOME' && tx.walletId === wallet.id) {
        assetDelta = amount;
    }
    else if (tx.type === 'TRANSFER') {
        if (tx.walletId === wallet.id)
            assetDelta -= amount + fee;
        if (tx.toWalletId === wallet.id)
            assetDelta += amount;
    }
    return wallet.type === 'CREDIT' ? -assetDelta : assetDelta;
}

/**
 * Apply (sign = 1) or revert (sign = -1) a transaction against wallet list
 */
export function applyTxToWallets(wallets, tx, sign = 1) {
    return wallets.map((w) => {
        const delta = getTxWalletDelta(tx, w);
        return delta ? { ...w, balance: (Number(w.balance) || 0) + sign * delta } : w;
    });
}

/**
 * Total net effect of transaction history on a wallet (excluding initial balance)
 */
export function sumWalletTxEffect(wallet, transactions) {
    return transactions.reduce((sum, tx) => sum + getTxWalletDelta(tx, wallet), 0);
}

/**
 * Recalculate wallet balances = initial balance + cumulative transaction effect
 */
export function recomputeWalletBalances(wallets, transactions) {
    return wallets.map((w) => ({ ...w, balance: (Number(w.initialBalance) || 0) + sumWalletTxEffect(w, transactions) }));
}

/**
 * Three-way array merge by ID: base = server base snapshot, local = client snapshot, remote = latest server snapshot.
 * Local changes (add/edit/delete vs base) take precedence; remaining changes adopted from remote.
 */
function mergeArrayById(base = [], local = [], remote = []) {
    const key = (x) => x?.id;
    const baseMap = new Map(base.map((x) => [key(x), JSON.stringify(x)]));
    const localMap = new Map(local.map((x) => [key(x), x]));
    const remoteMap = new Map(remote.map((x) => [key(x), x]));
    const result = [];
    const seen = new Set();
    const pick = (id) => {
        if (seen.has(id))
            return;
        seen.add(id);
        const inBase = baseMap.has(id);
        const l = localMap.get(id);
        const r = remoteMap.get(id);
        const localChanged = inBase ? (!l || JSON.stringify(l) !== baseMap.get(id)) : !!l;
        if (localChanged) {
            if (l)
                result.push(l); // local added or modified
            return; // local deleted -> discard
        }
        if (r)
            result.push(r); // keep remote version (including edits); remote deleted -> discard
    };
    // Preserve local ordering first, append novel remote elements
    local.forEach((x) => pick(key(x)));
    remote.forEach((x) => pick(key(x)));
    base.forEach((x) => pick(key(x)));
    return result;
}

const MERGE_ARRAY_FIELDS = ['wallets', 'transactions', 'categories', 'budgets', 'bills', 'goals'];

export function mergeSnapshots(base, local, remote) {
    const merged = { ...remote };
    const safeBase = base || {};
    for (const field of MERGE_ARRAY_FIELDS) {
        merged[field] = mergeArrayById(safeBase[field], local[field], remote[field]);
    }
    for (const field of ['planner', 'currentMonth', 'userProfile', 'simulatorConfig']) {
        const localChanged = JSON.stringify(local[field]) !== JSON.stringify(safeBase[field]);
        merged[field] = localChanged ? local[field] : remote[field];
    }
    // Balances are derived data -> recompute from transaction history post-merge to avoid double counting
    merged.wallets = recomputeWalletBalances(merged.wallets, merged.transactions);
    return merged;
}

/**
 * Compress receipt image before saving (prevents database bloat / quota exhaustion)
 */
export function compressImageFile(file, maxSize = 1024, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Could not read image'));
        reader.onload = () => {
            const img = new Image();
            img.onerror = () => reject(new Error('Invalid image'));
            img.onload = () => {
                const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(img.width * scale);
                canvas.height = Math.round(img.height * scale);
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}
// -------------------------------------------------------------
// BILL & CYCLE HELPERS (Fixes Issue 6 & 12: Cycle Reset & Month/Year boundaries)
// -------------------------------------------------------------
// Number of months in a bill cycle
function billPeriodMonths(frequency) {
    const freq = String(frequency || 'MONTHLY').toUpperCase();
    if (freq === 'QUARTERLY')
        return 3;
    if (freq === 'YEARLY')
        return 12;
    return 1;
}
// Parse 'YYYY-MM-DD' in local time (new Date('YYYY-MM-DD') evaluates to UTC -> offset in negative timezones)
function parseLocalDate(value) {
    if (value instanceof Date)
        return new Date(value.getTime());
    const m = typeof value === 'string' && value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m)
        return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return new Date(value);
}
// Payment cycle key: month / quarter / year
function billPeriodKey(date, frequency) {
    const months = billPeriodMonths(frequency);
    if (months === 12)
        return `${date.getFullYear()}`;
    if (months === 3)
        return `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3)}`;
    return `${date.getFullYear()}-${date.getMonth()}`;
}
// Due date clamped to days in month (e.g., day 31 -> 30/28)
function dueDateInMonth(year, month, dueDay) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return new Date(year, month, Math.min(dueDay, daysInMonth));
}
export function isBillPaidForCycle(bill, referenceDate = new Date()) {
    if (!bill || bill.status !== 'PAID' || !bill.lastPaidDate)
        return false;
    const ref = parseLocalDate(referenceDate);
    const paid = parseLocalDate(bill.lastPaidDate);
    if (isNaN(ref.getTime()) || isNaN(paid.getTime()))
        return false;
    return billPeriodKey(paid, bill.frequency) === billPeriodKey(ref, bill.frequency);
}
export function getBillDueInfo(bill, referenceDate = new Date()) {
    const ref = parseLocalDate(referenceDate);
    ref.setHours(0, 0, 0, 0);
    const dueDay = Math.min(31, Math.max(1, Number(bill?.dueDay) || 1));
    const dayMs = 1000 * 60 * 60 * 24;
    if (isBillPaidForCycle(bill, ref)) {
        // Next cycle = paid month + cycle interval (1 / 3 / 12 months)
        const paid = parseLocalDate(bill.lastPaidDate);
        const nextDueDate = dueDateInMonth(paid.getFullYear(), paid.getMonth() + billPeriodMonths(bill.frequency), dueDay);
        return {
            diffDays: Math.round((nextDueDate.getTime() - ref.getTime()) / dayMs),
            dueDate: nextDueDate,
            isPaid: true,
            isOverdue: false,
            isDueToday: false,
        };
    }
    const dueDate = dueDateInMonth(ref.getFullYear(), ref.getMonth(), dueDay);
    const diffDays = Math.round((dueDate.getTime() - ref.getTime()) / dayMs);
    return {
        diffDays,
        dueDate,
        isPaid: false,
        isOverdue: diffDays < 0,
        isDueToday: diffDays === 0,
    };
}

// -------------------------------------------------------------
// IMAGE COMPRESSION (Fixes Issue 13: Receipt Base64 Database Bloat)
// -------------------------------------------------------------
export async function compressImage(file, maxWidth = 900, maxHeight = 900, quality = 0.65) {
    if (typeof window === 'undefined' || !file) return null;
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const rawResult = e.target?.result;
            if (!rawResult || typeof rawResult !== 'string') {
                resolve(null);
                return;
            }
            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;
                if (width > maxWidth || height > maxHeight) {
                    if (width / height > maxWidth / maxHeight) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    } else {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(rawResult);
                    return;
                }
                ctx.drawImage(img, 0, 0, width, height);
                const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(compressedDataUrl);
            };
            img.onerror = () => resolve(rawResult);
            img.src = rawResult;
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
    });
}

