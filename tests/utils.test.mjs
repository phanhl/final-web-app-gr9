import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    numberToVietnameseWords, numberToEnglishWords, formatNumberWithDots,
    getTxWalletDelta, recomputeWalletBalances, mergeSnapshots,
    calculateFinancialSummary, calculateBudgetStatuses, checkWalletSufficientFunds,
    getBillDueInfo, isBillPaidForCycle, toLocalDateKey, normalizeSaveDate, formatMonthLabel,
    toCsvCell, getLocalDateString,
} from '../src/lib/utils.js';

test('Vietnamese amount in words', () => {
    assert.equal(numberToVietnameseWords(0), 'Không đồng');
    assert.equal(numberToVietnameseWords(15), 'Mười lăm đồng');
    assert.equal(numberToVietnameseWords(21), 'Hai mươi mốt đồng');
    assert.equal(numberToVietnameseWords(24), 'Hai mươi tư đồng');
    assert.equal(numberToVietnameseWords(105), 'Một trăm lẻ năm đồng');
    assert.equal(numberToVietnameseWords(1_000_005), 'Một triệu không trăm lẻ năm đồng');
    assert.equal(numberToVietnameseWords(1_500_000), 'Một triệu năm trăm nghìn đồng');
    assert.equal(numberToVietnameseWords(2_000_000_000), 'Hai tỷ đồng');
    assert.equal(numberToVietnameseWords('1.250.000'), 'Một triệu hai trăm năm mươi nghìn đồng');
});

test('English amount in words', () => {
    assert.equal(numberToEnglishWords(0), 'Zero VND');
    assert.equal(numberToEnglishWords(1_250_000), 'One million, two hundred and fifty thousand VND');
});

test('thousand separators', () => {
    assert.equal(formatNumberWithDots('1500000'), '1.500.000');
    assert.equal(formatNumberWithDots('000123'), '123');
    assert.equal(formatNumberWithDots(''), '');
});

const cash = { id: 'cash', type: 'CASH', initialBalance: 1_000_000, balance: 0 };
const bank = { id: 'bank', type: 'BANK', initialBalance: 5_000_000, balance: 0 };
const card = { id: 'card', type: 'CREDIT', initialBalance: 0, balance: 0, creditLimit: 10_000_000 };

test('wallet deltas for income, expense, transfer with fee and credit cards', () => {
    assert.equal(getTxWalletDelta({ type: 'INCOME', amount: 100, walletId: 'cash' }, cash), 100);
    assert.equal(getTxWalletDelta({ type: 'EXPENSE', amount: 100, walletId: 'cash' }, cash), -100);
    const transfer = { type: 'TRANSFER', amount: 1000, fee: 10, walletId: 'bank', toWalletId: 'cash' };
    assert.equal(getTxWalletDelta(transfer, bank), -1010);
    assert.equal(getTxWalletDelta(transfer, cash), 1000);
    // Credit card: spending increases debt, paying the card reduces it
    assert.equal(getTxWalletDelta({ type: 'EXPENSE', amount: 300, walletId: 'card' }, card), 300);
    assert.equal(getTxWalletDelta({ type: 'TRANSFER', amount: 300, walletId: 'bank', toWalletId: 'card' }, card), -300);
    // Unrelated wallet
    assert.equal(getTxWalletDelta({ type: 'EXPENSE', amount: 100, walletId: 'cash' }, bank), 0);
});

test('recomputeWalletBalances is initial balance + history, and tolerates numeric strings', () => {
    const txs = [
        { id: 't1', type: 'INCOME', amount: '200000', walletId: 'cash' },
        { id: 't2', type: 'EXPENSE', amount: 50_000, walletId: 'cash' },
        { id: 't3', type: 'TRANSFER', amount: 1_000_000, fee: 3300, walletId: 'bank', toWalletId: 'cash' },
        { id: 't4', type: 'EXPENSE', amount: 400_000, walletId: 'card' },
    ];
    const [c, b, k] = recomputeWalletBalances([cash, bank, { ...card, initialBalance: '0' }], txs);
    assert.equal(c.balance, 1_000_000 + 200_000 - 50_000 + 1_000_000);
    assert.equal(b.balance, 5_000_000 - 1_003_300);
    assert.equal(k.balance, 400_000);
});

test('financial summary: net assets subtract credit debt, monthly totals exclude transfers', () => {
    const month = getLocalDateString().slice(0, 7);
    const today = `${month}-01`;
    const wallets = [{ ...cash, balance: 1_000_000 }, { ...bank, balance: 2_000_000 }, { ...card, balance: 500_000 }, { id: 's', type: 'SAVINGS', balance: 3_000_000 }];
    const txs = [
        { id: '1', type: 'INCOME', amount: 10_000_000, walletId: 'bank', date: today },
        { id: '2', type: 'EXPENSE', amount: 2_500_000, walletId: 'cash', date: today },
        { id: '3', type: 'TRANSFER', amount: 1_000_000, walletId: 'bank', toWalletId: 'cash', date: today },
        { id: '4', type: 'EXPENSE', amount: 999, walletId: 'cash', date: '2000-01-01' },
    ];
    const s = calculateFinancialSummary(wallets, txs, month);
    assert.equal(s.availableBalance, 3_000_000);
    assert.equal(s.totalSavings, 3_000_000);
    assert.equal(s.totalCreditDebt, 500_000);
    assert.equal(s.totalAssets, 5_500_000);
    assert.equal(s.monthlyIncome, 10_000_000);
    assert.equal(s.monthlyExpense, 2_500_000);
    assert.equal(s.savingsRate, 75);
});

test('budget status thresholds', () => {
    const month = getLocalDateString().slice(0, 7);
    const date = `${month}-01`;
    const budgets = [{ id: 'b1', categoryId: 'food', amount: 1000 }, { id: 'b2', categoryId: 'fun', amount: 1000 }, { id: 'b3', categoryId: 'x', amount: 1000 }];
    const txs = [
        { type: 'EXPENSE', categoryId: 'food', amount: 850, date },
        { type: 'EXPENSE', categoryId: 'fun', amount: 1200, date },
        { type: 'INCOME', categoryId: 'x', amount: 5000, date },
    ];
    const [food, fun, x] = calculateBudgetStatuses(budgets, txs, month);
    assert.equal(food.status, 'WARNING');
    assert.equal(fun.status, 'EXCEEDED');
    assert.equal(fun.remaining, -200);
    assert.equal(x.status, 'SAFE');
});

test('sufficient funds: no overdraft, credit limit respected', () => {
    assert.equal(checkWalletSufficientFunds({ ...cash, balance: 100 }, 100).isValid, true);
    assert.equal(checkWalletSufficientFunds({ ...cash, balance: 100 }, 90, 20).isValid, false);
    assert.equal(checkWalletSufficientFunds({ ...card, balance: 9_500_000 }, 600_000).isValid, false);
    assert.equal(checkWalletSufficientFunds({ ...cash, balance: 100 }, 0).isValid, false);
});

test('three-way merge keeps both devices\' edits and recomputes balances', () => {
    const base = { wallets: [cash], transactions: [{ id: 'a', type: 'EXPENSE', amount: 10, walletId: 'cash' }], planner: { x: 1 } };
    const local = { ...base, transactions: [...base.transactions, { id: 'l', type: 'EXPENSE', amount: 5, walletId: 'cash' }] };
    const remote = { ...base, transactions: [{ id: 'a', type: 'EXPENSE', amount: 20, walletId: 'cash' }, { id: 'r', type: 'INCOME', amount: 100, walletId: 'cash' }], planner: { x: 2 } };
    const merged = mergeSnapshots(base, local, remote);
    assert.deepEqual(merged.transactions.map(t => t.id).sort(), ['a', 'l', 'r']);
    assert.equal(merged.transactions.find(t => t.id === 'a').amount, 20, 'remote edit kept when local did not touch it');
    assert.deepEqual(merged.planner, { x: 2 });
    assert.equal(merged.wallets[0].balance, 1_000_000 - 20 - 5 + 100);
    // Local deletion wins over an untouched remote copy
    const deleted = mergeSnapshots(base, { ...base, transactions: [] }, base);
    assert.equal(deleted.transactions.length, 0);
});

test('bill cycles', () => {
    const bill = { dueDay: 31, frequency: 'MONTHLY', status: 'PENDING' };
    const feb = getBillDueInfo(bill, '2026-02-10');
    assert.equal(feb.dueDate.getDate(), 28, 'due day clamps to the end of February');
    assert.equal(feb.diffDays, 18);
    const paid = { ...bill, status: 'PAID', lastPaidDate: '2026-02-20' };
    assert.equal(isBillPaidForCycle(paid, '2026-02-25'), true);
    assert.equal(isBillPaidForCycle(paid, '2026-03-01'), false, 'new month = new cycle');
    assert.equal(getBillDueInfo(paid, '2026-02-25').dueDate.getMonth(), 2);
    const yearly = { dueDay: 5, frequency: 'YEARLY', status: 'PAID', lastPaidDate: '2026-01-05' };
    assert.equal(isBillPaidForCycle(yearly, '2026-11-30'), true);
});

test('dates stay in local time', () => {
    assert.equal(toLocalDateKey('2026-09-30T23:30:00'), '2026-09-30');
    assert.match(normalizeSaveDate('2026-09-30T08:15'), /^2026-09-30T08:15:00$/);
    assert.equal(formatMonthLabel('2026-09'), 'Tháng 09/2026');
    assert.equal(formatMonthLabel('2026-09', 'en'), 'Sep 2026');
});

test('CSV cells cannot smuggle spreadsheet formulas', () => {
    assert.equal(toCsvCell('=HYPERLINK("http://evil","x")'), `"'=HYPERLINK(""http://evil"",""x"")"`);
    assert.equal(toCsvCell('+1+1'), `"'+1+1"`);
    assert.equal(toCsvCell('@SUM(A1)'), `"'@SUM(A1)"`);
    assert.equal(toCsvCell('Ăn trưa'), '"Ăn trưa"');
    assert.equal(toCsvCell(-50000), '"-50000"', 'numbers stay numeric');
    assert.equal(toCsvCell(undefined), '""');
});

test('legacy wallets without initialBalance are not double counted', () => {
    const txs = [{ id: 't1', type: 'INCOME', amount: 200_000, walletId: 'w' }, { id: 't2', type: 'EXPENSE', amount: 50_000, walletId: 'w' }];
    const [w] = recomputeWalletBalances([{ id: 'w', type: 'CASH', balance: 1_150_000 }], txs);
    assert.equal(w.balance, 1_150_000);
    assert.equal(w.initialBalance, 1_000_000);
    // Idempotent: recomputing again keeps the same numbers
    const [again] = recomputeWalletBalances([w], txs);
    assert.equal(again.balance, 1_150_000);
});

test('signed amounts never show "+0" or "-0"', async () => {
    const { formatSignedCurrency, formatCurrency } = await import('../src/lib/utils.js');
    assert.equal(formatSignedCurrency(0, '-'), formatCurrency(0));
    assert.equal(formatSignedCurrency(0, '+'), formatCurrency(0));
    assert.equal(formatSignedCurrency(1500, '+'), `+${formatCurrency(1500)}`);
    assert.equal(formatSignedCurrency(-1500, '-'), `-${formatCurrency(1500)}`);
});
