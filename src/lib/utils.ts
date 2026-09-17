import { Wallet, Transaction, Budget, FinancialSummary, RecurringBill } from '@/types';
import * as XLSX from 'xlsx';

export function formatCurrency(amount: number): string {
  if (typeof amount !== 'number' || isNaN(amount) || !isFinite(amount)) {
    return '0 ₫';
  }
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumberWithDots(val: string | number | null | undefined): string {
  if (val === null || val === undefined || val === '') return '';
  const str = String(val).replace(/\D/g, '');
  if (!str) return '';
  const trimmed = str.length > 1 ? str.replace(/^0+/, '') || '0' : str;
  return trimmed.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

function readThreeDigits(nStr: string, isHighestGroup: boolean): string {
  const padded = nStr.padStart(3, '0');
  const h = parseInt(padded[0], 10);
  const t = parseInt(padded[1], 10);
  const u = parseInt(padded[2], 10);

  if (h === 0 && t === 0 && u === 0) return '';

  const words: string[] = [];

  // Hundreds
  if (!isHighestGroup || h > 0) {
    words.push(DIGITS[h] + ' trăm');
  }

  // Tens
  if (t === 0) {
    if (u > 0) {
      if (!isHighestGroup || h > 0) {
        words.push('lẻ ' + (u === 5 && (h > 0 || !isHighestGroup) ? 'năm' : DIGITS[u]));
      } else {
        words.push(DIGITS[u]);
      }
    }
  } else if (t === 1) {
    words.push('mười');
    if (u === 1) words.push('một');
    else if (u === 5) words.push('lăm');
    else if (u > 0) words.push(DIGITS[u]);
  } else {
    words.push(DIGITS[t] + ' mươi');
    if (u === 1) words.push('mốt');
    else if (u === 4) words.push('tư');
    else if (u === 5) words.push('lăm');
    else if (u > 0) words.push(DIGITS[u]);
  }

  return words.join(' ');
}

export function numberToVietnameseWords(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  const str = String(value).trim().replace(/\D/g, '');
  if (!str) return '';

  const trimmed = str.replace(/^0+/, '');
  if (!trimmed) return 'Không đồng';

  const groups: string[] = [];
  for (let i = trimmed.length; i > 0; i -= 3) {
    const start = Math.max(0, i - 3);
    groups.unshift(trimmed.slice(start, i));
  }

  const groupCount = groups.length;
  const resultParts: string[] = [];

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
  if (!finalStr) return 'Không đồng';

  finalStr = finalStr.charAt(0).toUpperCase() + finalStr.slice(1) + ' đồng';
  return finalStr;
}

export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDisplayDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }
  return formatDate(dateStr, 'dateOnly');
}

export function formatDate(dateString: string, type: 'short' | 'full' | 'time' | 'dateOnly' = 'short'): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

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
  } catch {
    return dateString;
  }
}

export function calculateFinancialSummary(
  wallets: Wallet[],
  transactions: Transaction[],
  monthStr: string = '2026-09'
): FinancialSummary {
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

  // Monthly transactions
  const currentMonthTxs = transactions.filter((t) => t.date.startsWith(monthStr));

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

export interface BudgetStatusItem {
  budget: Budget;
  spent: number;
  remaining: number;
  percentage: number;
  status: 'SAFE' | 'WARNING' | 'EXCEEDED';
}

export function calculateBudgetStatuses(
  budgets: Budget[],
  transactions: Transaction[],
  monthStr: string = '2026-09'
): BudgetStatusItem[] {
  const currentMonthExpenses = transactions.filter(
    (t) => t.type === 'EXPENSE' && t.date.startsWith(monthStr)
  );

  return budgets.map((b) => {
    const spent = currentMonthExpenses
      .filter((t) => t.categoryId === b.categoryId)
      .reduce((sum, t) => sum + t.amount, 0);

    const percentage = b.amount > 0 ? (spent / b.amount) * 100 : 0;
    const remaining = b.amount - spent;

    let status: 'SAFE' | 'WARNING' | 'EXCEEDED' = 'SAFE';
    if (percentage >= 100) {
      status = 'EXCEEDED';
    } else if (percentage >= 80) {
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

export function exportToCSV(transactions: Transaction[], filename = 'bao-cao-giao-dich.csv'): void {
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

  const csvContent =
    '\uFEFF' +
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

export function exportToExcel(
  transactions: Transaction[],
  budgets: Budget[],
  wallets: Wallet[],
  summary: FinancialSummary,
  filename = 'Bao-Cao-Tai-Chinh-Chi-Tieu.xlsx'
): void {
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

export interface WalletFundValidation {
  isValid: boolean;
  availableBalance: number;
  requiredAmount: number;
  shortfall: number;
  errorMessage?: string;
}

export function getWalletAvailableBalance(wallet?: Wallet): number {
  if (!wallet) return 0;
  if (wallet.type === 'CREDIT') {
    const limit = wallet.creditLimit || 0;
    return Math.max(0, limit - wallet.balance);
  }
  return Math.max(0, wallet.balance);
}

export function checkWalletSufficientFunds(
  wallet: Wallet | undefined,
  amount: number,
  fee: number = 0
): WalletFundValidation {
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
    const errorMsg =
      wallet.type === 'CREDIT'
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
