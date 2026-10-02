import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePayload, normalizeSnapshotNumbers } from '../src/lib/storage-validation.js';

const wallet = (id, extra = {}) => ({ id, name: id, balance: 0, ...extra });
const tx = (id, extra = {}) => ({ id, type: 'EXPENSE', amount: 1000, walletId: 'w1', ...extra });
const base = (extra = {}) => ({ wallets: [wallet('w1'), wallet('w2')], transactions: [tx('t1')], ...extra });

test('accepts a well-formed snapshot', () => {
    assert.equal(validatePayload(base()), null);
});

test('rejects non-object payloads and missing core arrays', () => {
    assert.ok(validatePayload(null));
    assert.ok(validatePayload([]));
    assert.ok(validatePayload({ wallets: [] }));
    assert.ok(validatePayload({ transactions: [] }));
});

test('rejects duplicate wallet and transaction ids', () => {
    assert.match(validatePayload(base({ wallets: [wallet('w1'), wallet('w1')] })), /trùng/);
    assert.match(validatePayload(base({ transactions: [tx('t1'), tx('t1')] })), /trùng/);
});

test('rejects invalid amounts and balances', () => {
    assert.ok(validatePayload(base({ transactions: [tx('t1', { amount: 0 })] })));
    assert.ok(validatePayload(base({ transactions: [tx('t1', { amount: 'abc' })] })));
    assert.ok(validatePayload(base({ wallets: [wallet('w1', { balance: null })] , transactions: [] })));
    assert.ok(validatePayload(base({ wallets: [wallet('w1', { balance: Infinity })], transactions: [] })));
});

test('rejects unknown transaction types and dangling wallet references', () => {
    assert.ok(validatePayload(base({ transactions: [tx('t1', { type: 'GIFT' })] })));
    assert.ok(validatePayload(base({ transactions: [tx('t1', { walletId: 'missing' })] })));
});

test('validates transfers', () => {
    assert.equal(validatePayload(base({ transactions: [tx('t1', { type: 'TRANSFER', toWalletId: 'w2', fee: 0 })] })), null);
    assert.ok(validatePayload(base({ transactions: [tx('t1', { type: 'TRANSFER', toWalletId: 'w1' })] })));
    assert.ok(validatePayload(base({ transactions: [tx('t1', { type: 'TRANSFER' })] })));
    assert.ok(validatePayload(base({ transactions: [tx('t1', { type: 'TRANSFER', toWalletId: 'w2', fee: -1 })] })));
});

test('object fields must be objects', () => {
    assert.ok(validatePayload(base({ planner: 'x' })));
    assert.ok(validatePayload(base({ userProfile: [] })));
    assert.ok(validatePayload(base({ simulatorConfig: 5 })));
    assert.equal(validatePayload(base({ planner: {}, userProfile: {}, simulatorConfig: {} })), null);
    assert.ok(validatePayload(base({ currentMonth: 42 })));
});

test('numeric strings are stored as numbers', () => {
    const out = normalizeSnapshotNumbers({
        wallets: [{ id: 'w1', balance: '100', initialBalance: '50', name: '123' }],
        transactions: [{ id: 't', amount: '2500.5', fee: '', note: '42' }],
        goals: [{ id: 'g', targetAmount: '1e6' }],
        planner: { a: '1' },
    });
    assert.equal(out.wallets[0].balance, 100);
    assert.equal(out.wallets[0].initialBalance, 50);
    assert.equal(out.wallets[0].name, '123', 'non-numeric fields untouched');
    assert.equal(out.transactions[0].amount, 2500.5);
    assert.equal(out.transactions[0].fee, '', 'empty strings untouched');
    assert.equal(out.transactions[0].note, '42');
    assert.equal(out.goals[0].targetAmount, 1_000_000);
    assert.deepEqual(out.planner, { a: '1' });
});
