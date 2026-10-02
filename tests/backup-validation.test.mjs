import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateBackupData } from '../src/lib/backup-validation.js';

test('accepts a minimal valid backup (legacy wallets without initialBalance)', () => {
    const errors = validateBackupData({
        wallets: [{ id: 'w1', balance: 100 }],
        transactions: [{ id: 't1', type: 'INCOME', amount: 50, walletId: 'w1' }],
    });
    assert.deepEqual(errors, []);
});

test('reports structural problems', () => {
    assert.equal(validateBackupData('nope').length, 1);
    assert.ok(validateBackupData({ wallets: [] }).length > 0);
    assert.ok(validateBackupData({ wallets: [], transactions: [], budgets: {} }).length > 0);
    assert.ok(validateBackupData({ wallets: [], transactions: [], planner: [] }).length > 0);
});

test('reports invalid transactions', () => {
    const errors = validateBackupData({
        wallets: [{ id: 'w1', initialBalance: 0 }],
        transactions: [
            { id: 't1', type: 'TRANSFER', amount: 10, walletId: 'w1', toWalletId: 'w1' },
            { id: 't2', type: 'EXPENSE', amount: -5, walletId: 'w1' },
        ],
    });
    assert.equal(errors.length, 2);
});
