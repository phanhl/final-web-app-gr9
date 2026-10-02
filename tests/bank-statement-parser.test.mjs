import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { parseAmount, parseDate, checkDuplicates, detectCategoryAndTags, parseBankStatementFile } from '../src/lib/bank-statement-parser.js';
import { DEFAULT_CATEGORIES } from '../src/lib/mock-data.js';

// Minimal FileReader for Node (the parser runs in the browser)
globalThis.FileReader ??= class {
    readAsArrayBuffer(file) {
        file.arrayBuffer().then((buf) => this.onload?.({ target: { result: buf } }), (err) => this.onerror?.(err));
    }
};

test('amounts in Vietnamese, US and decorated formats', () => {
    assert.equal(parseAmount('1.250.000'), 1_250_000);
    assert.equal(parseAmount('1.250.000,50'), 1_250_000.5);
    assert.equal(parseAmount('1,250,000.00'), 1_250_000);
    assert.equal(parseAmount('1,250,000'), 1_250_000);
    assert.equal(parseAmount('500.000 VND'), 500_000);
    assert.equal(parseAmount('(200.000)'), 200_000);
    assert.equal(parseAmount('-75,000'), 75_000);
    assert.equal(parseAmount('₫ 3.000'), 3000);
    assert.equal(parseAmount(42000), 42000);
    assert.equal(parseAmount(''), 0);
    assert.equal(parseAmount('FT26184278254010'), 0, 'reference codes are not amounts');
});

test('dates: day/month order, time, ISO, Excel serials', () => {
    assert.equal(parseDate('05/09/2026'), '2026-09-05T12:00:00');
    assert.equal(parseDate('5-9-2026 08:30'), '2026-09-05T08:30:00');
    assert.equal(parseDate('2026-09-05 23:59:59'), '2026-09-05T23:59:59');
    assert.equal(parseDate(46270), '2026-09-05T12:00:00');
    assert.equal(parseDate(''), null);
});

test('impossible calendar dates are rejected instead of rolling into another month', () => {
    assert.equal(parseDate('31/02/2026'), null);
    assert.equal(parseDate('00/05/2026'), null);
    assert.equal(parseDate('2026-13-01'), null);
});

test('US month/day order is recognised when the day is > 12', () => {
    assert.equal(parseDate('09/25/2026'), '2026-09-25T12:00:00');
});

test('duplicate detection on the same wallet only', () => {
    const existing = [{ date: '2026-09-05T10:00:00', amount: 50000, type: 'EXPENSE', note: 'Grab', walletId: 'w1' }];
    const [dup, other, otherWallet] = checkDuplicates([
        { date: '2026-09-05T12:00:00', amount: 50000, type: 'EXPENSE', note: 'GRAB' },
        { date: '2026-09-05T12:00:00', amount: 60000, type: 'EXPENSE', note: 'Grab' },
        { date: '2026-09-05T12:00:00', amount: 50000, type: 'EXPENSE', note: 'Grab' },
    ].map((x, i) => ({ ...x, id: String(i) })), existing, 'w1');
    assert.equal(dup.isDuplicate, true);
    assert.equal(dup.selected, false);
    assert.equal(other.isDuplicate, false);
    assert.equal(checkDuplicates([otherWallet], existing, 'w2')[0].isDuplicate, false);
});

test('category suggestion from narrative', () => {
    const r = detectCategoryAndTags('GRAB*FOOD thanh toan', 'EXPENSE', DEFAULT_CATEGORIES);
    assert.ok(r && r.categoryId, 'returns a category');
});

test('parses a whole CSV statement', async () => {
    const csv = '﻿Ngày giao dịch,Nội dung,Ghi nợ,Ghi có,Số dư\n'
        + '05/09/2026,Thanh toan GRAB,"50.000",,"950.000"\n'
        + '06/09/2026,Luong thang 9,,"15.000.000","15.950.000"\n';
    const file = new File([csv], 'saoke.csv', { type: 'text/csv' });
    const result = await parseBankStatementFile(file, DEFAULT_CATEGORIES);
    const items = result.transactions || result.items || result;
    assert.ok(Array.isArray(items), 'returns a list of transactions');
    assert.equal(items.length, 2);
    const exp = items.find((t) => t.type === 'EXPENSE');
    const inc = items.find((t) => t.type === 'INCOME');
    assert.equal(exp.amount, 50000);
    assert.equal(inc.amount, 15_000_000);
    assert.match(exp.date, /^2026-09-05/);
});

test('parses an XLSX statement', async () => {
    const ws = XLSX.utils.aoa_to_sheet([
        ['Ngày giao dịch', 'Diễn giải', 'Số tiền ghi nợ', 'Số tiền ghi có'],
        ['07/09/2026', 'Tien dien EVN', 320000, ''],
        ['08/09/2026', 'Hoan tien', '', 20000],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const file = new File([buf], 'saoke.xlsx');
    const result = await parseBankStatementFile(file, DEFAULT_CATEGORIES);
    const items = result.transactions || result.items || result;
    assert.equal(items.length, 2);
    assert.equal(items.find((t) => t.type === 'EXPENSE').amount, 320000);
});
