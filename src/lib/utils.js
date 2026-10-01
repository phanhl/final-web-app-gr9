import * as XLSX from 'xlsx';
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
export function getLocalDateString(d = new Date()) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Trích xuất YYYY-MM-DD theo giờ địa phương, không bị lùi ngày do UTC
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
 * Chuyển đổi timestamp thành định dạng YYYY-MM-DDTHH:mm cho input datetime-local
 * Giữ nguyên chính xác giờ địa phương của người dùng, không bị lệch múi giờ.
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
 * Chuẩn hóa giá trị từ input datetime-local hoặc date picker để lưu trữ theo giờ địa phương
 * Định dạng: 'YYYY-MM-DDTHH:mm:ss' (Local ISO, không gắn Z để tránh bị lùi múi giờ)
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
export function formatDisplayDate(dateStr) {
    if (!dateStr)
        return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
    }
    return formatDate(dateStr, 'dateOnly');
}
export function formatDate(dateString, type = 'short') {
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime()))
            return dateString;
        if (type === 'time') {
            return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        }
        if (type === 'dateOnly') {
            return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
        if (type === 'full') {
            return date.toLocaleDateString('vi-VN', {
                weekday: 'short',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        }
        return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
    // Net assets (Tổng tài sản) = Tiền mặt + Ngân hàng + Tiết kiệm - Dư nợ thẻ
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
export function exportToCSV(transactions, filename = 'bao-cao-giao-dich.csv') {
    const headers = ['Mã GD', 'Thời gian', 'Loại GD', 'Danh mục', 'Số tiền (VND)', 'Ví nguồn', 'Ví đích/Ghi chú', 'Nhãn'];
    const rows = transactions.map((t) => [
        t.id,
        formatDate(t.date, 'full'),
        t.type === 'EXPENSE' ? 'Chi tiêu' : t.type === 'INCOME' ? 'Thu nhập' : 'Chuyển khoản',
        t.categoryName || 'Không có',
        t.amount,
        t.walletName || t.walletId,
        t.type === 'TRANSFER' ? (t.toWalletName || t.toWalletId || '') : (t.note || ''),
        (t.tags || []).join('; '),
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
}
export function exportToExcel(transactions, budgets, wallets, summary, filename = 'Bao-Cao-Tai-Chinh-Chi-Tieu.xlsx') {
    const wb = XLSX.utils.book_new();
    // Sheet 1: Danh sách giao dịch
    const txData = transactions.map((t, idx) => ({
        'STT': idx + 1,
        'Mã GD': t.id,
        'Thời gian': formatDate(t.date, 'full'),
        'Loại giao dịch': t.type === 'EXPENSE' ? 'Khoản chi' : t.type === 'INCOME' ? 'Khoản thu' : 'Chuyển khoản nội bộ',
        'Danh mục': t.categoryName || 'Khác',
        'Số tiền (₫)': t.amount,
        'Tài khoản / Ví': t.walletName || t.walletId,
        'Ví đích (nếu chuyển)': t.toWalletName || '',
        'Ghi chú': t.note,
        'Nhãn phân loại': (t.tags || []).join(', '),
    }));
    const wsTx = XLSX.utils.json_to_sheet(txData);
    XLSX.utils.book_append_sheet(wb, wsTx, 'Sổ Giao Dịch');
    // Sheet 2: Tổng hợp tài sản & Ví
    const walletData = wallets.map((w) => ({
        'Tên Ví / Tài khoản': w.name,
        'Loại ví': w.type === 'CASH' ? 'Tiền mặt' : w.type === 'BANK' ? 'Ngân hàng' : w.type === 'CREDIT' ? 'Thẻ tín dụng' : 'Sổ tiết kiệm',
        'Số dư hiện tại (₫)': w.balance,
        'Hạn mức (Thẻ tín dụng)': w.creditLimit || '-',
        'Lãi suất (%/năm)': w.interestRate ? `${w.interestRate}%` : '-',
        'Số tài khoản / Thẻ': w.accountNumber || '-',
    }));
    const wsWallets = XLSX.utils.json_to_sheet(walletData);
    XLSX.utils.book_append_sheet(wb, wsWallets, 'Tài Khoản & Ví');
    // Sheet 3: Báo cáo ngân sách
    const budgetStatuses = calculateBudgetStatuses(budgets, transactions);
    const budgetData = budgetStatuses.map((bs) => ({
        'Danh mục': bs.budget.categoryName,
        'Hạn mức tháng (₫)': bs.budget.amount,
        'Đã chi tiêu (₫)': bs.spent,
        'Còn lại (₫)': bs.remaining,
        'Tỷ lệ đã dùng (%)': `${bs.percentage}%`,
        'Tình trạng cảnh báo': bs.status === 'EXCEEDED' ? 'VƯỢT 100% NGÂN SÁCH' : bs.status === 'WARNING' ? 'CẢNH BÁO (>80%)' : 'An toàn',
    }));
    const wsBudgets = XLSX.utils.json_to_sheet(budgetData);
    XLSX.utils.book_append_sheet(wb, wsBudgets, 'Theo Dõi Ngân Sách');
    // Sheet 4: Chỉ số tài chính tổng quan
    const kpiData = [
        { 'Chỉ tiêu': 'Tổng tài sản ròng', 'Giá trị (₫)': summary.totalAssets },
        { 'Chỉ tiêu': 'Số dư khả dụng (Tiền mặt + Ngân hàng)', 'Giá trị (₫)': summary.availableBalance },
        { 'Chỉ tiêu': 'Dư nợ thẻ tín dụng', 'Giá trị (₫)': summary.totalCreditDebt },
        { 'Chỉ tiêu': 'Tổng tiền gửi tiết kiệm', 'Giá trị (₫)': summary.totalSavings },
        { 'Chỉ tiêu': 'Tổng thu nhập tháng này', 'Giá trị (₫)': summary.monthlyIncome },
        { 'Chỉ tiêu': 'Tổng chi tiêu tháng này', 'Giá trị (₫)': summary.monthlyExpense },
        { 'Chỉ tiêu': 'Tích lũy ròng trong tháng', 'Giá trị (₫)': summary.netSavingsThisMonth },
        { 'Chỉ tiêu': 'Tỷ lệ tiết kiệm', 'Giá trị (₫)': `${summary.savingsRate}%` },
    ];
    const wsKPI = XLSX.utils.json_to_sheet(kpiData);
    XLSX.utils.book_append_sheet(wb, wsKPI, 'Tổng Hợp Tài Chính');
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
export function checkWalletSufficientFunds(wallet, amount, fee = 0) {
    if (!wallet) {
        return {
            isValid: false,
            availableBalance: 0,
            requiredAmount: amount + fee,
            shortfall: amount + fee,
            errorMessage: 'Vui lòng chọn ví hợp lệ',
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
            errorMessage: 'Số tiền giao dịch phải lớn hơn 0',
        };
    }
    const availableBalance = getWalletAvailableBalance(wallet);
    if (requiredAmount > availableBalance) {
        const shortfall = requiredAmount - availableBalance;
        const errorMsg = wallet.type === 'CREDIT'
            ? `Số tiền (${formatCurrency(requiredAmount)}) vượt quá hạn mức còn lại của thẻ ${wallet.name} (còn ${formatCurrency(availableBalance)}).`
            : `Số tiền (${formatCurrency(requiredAmount)}) vượt quá số dư hiện có của ví ${wallet.name} (hiện có ${formatCurrency(availableBalance)}). Không thể giao dịch làm âm quỹ!`;
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
export function formatCompactNumber(val) {
    if (!val || val === 0)
        return '0';
    const abs = Math.abs(val);
    const sign = val < 0 ? '-' : '';
    if (abs >= 1_000_000_000) {
        const num = abs / 1_000_000_000;
        return `${sign}${num % 1 === 0 ? num.toFixed(0) : num.toFixed(1)}Tỷ`;
    }
    if (abs >= 1_000_000) {
        const num = abs / 1_000_000;
        return `${sign}${num % 1 === 0 ? num.toFixed(0) : num.toFixed(1)}Tr`;
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
