/**
 * Integration tests for the MySQL data layer. They need a disposable database:
 *   TEST_DATABASE_URL=mysql://fintrack:...@127.0.0.1:3306/fintrack_test npm test
 * Every table in that database is DROPPED first. Without TEST_DATABASE_URL these tests are skipped.
 */
import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const URL_ = process.env.TEST_DATABASE_URL;
const skip = !URL_ && 'set TEST_DATABASE_URL to a disposable MySQL database to run these tests';

let db, store, legacy;

before(async () => {
    if (skip) return;
    process.env.DATABASE_URL = URL_;
    const mysql = (await import('mysql2/promise')).default;
    // Start from an empty database
    const conn = await mysql.createConnection(URL_);
    const [tables] = await conn.query('SHOW TABLES');
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const row of tables) await conn.query(`DROP TABLE \`${Object.values(row)[0]}\``);
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    await conn.end();
    db = await import('../src/lib/db.js');
    store = await import('../src/lib/store.js');
    legacy = await import('../src/lib/legacy-import.js');
    await db.getPool();
});

after(async () => {
    if (!skip) await db.closePool();
});

let seq = 0;
const newUser = (over = {}) => ({
    id: `usr_test_${++seq}_${crypto.randomBytes(2).toString('hex')}`,
    username: `user${seq}${crypto.randomBytes(2).toString('hex')}`,
    role: 'guest',
    hasPassword: true,
    salt: 'aa'.repeat(16),
    passwordHash: 'bb'.repeat(32),
    tokenVersion: 1,
    createdAt: new Date().toISOString(),
    ...over,
});

const richSnapshot = () => ({
    wallets: [
        { id: 'w-cash', name: 'Tiền mặt 💵', type: 'CASH', balance: 1250000.5, initialBalance: 1000000, currency: 'VND', color: '#10b981', icon: 'Banknote', createdAt: '2026-01-01T00:00:00.000Z' },
        { id: 'w-card', name: 'Visa', type: 'CREDIT', balance: 300000, initialBalance: 0, creditLimit: 20000000, bankName: 'VCB', accountNumber: '1234', customFlag: true },
    ],
    categories: [{ id: 'cat-food', name: 'Ăn uống', type: 'EXPENSE', icon: 'Utensils', color: '#f97316' }],
    transactions: [
        { id: 't1', type: 'INCOME', amount: 250000.5, walletId: 'w-cash', walletName: 'Tiền mặt 💵', categoryId: 'cat-salary', categoryName: 'Lương', date: '2026-10-01T23:45:00', note: 'Thưởng "tháng" 10', tags: ['Lương', 'Thưởng'], createdAt: '2026-10-01T16:45:00.000Z' },
        { id: 't2', type: 'EXPENSE', amount: 300000, walletId: 'w-card', categoryId: 'cat-food', date: '2026-10-02T12:00:00', receiptImage: 'data:image/jpeg;base64,' + 'A'.repeat(5000), billId: 'b1' },
        { id: 't3', type: 'TRANSFER', amount: 100, fee: 0, walletId: 'w-cash', toWalletId: 'w-card', note: null, someFutureField: { nested: [1, 2, 3] } },
    ],
    budgets: [{ id: 'bud1', categoryId: 'cat-food', categoryName: 'Ăn uống', amount: 3000000 }],
    bills: [{ id: 'b1', name: 'Tiền điện', amount: 650000, dueDay: 15, frequency: 'MONTHLY', status: 'PAID', lastPaidDate: '2026-10-02', lastPaymentTxId: 't2', reminderDaysBefore: 3, walletId: 'w-card' }],
    goals: [{ id: 'g1', name: 'Laptop', targetAmount: 30000000, currentAmount: 1000000, deadline: '2026-12-31', history: [{ id: 'gh1', date: '2026-10-01', amount: 1000000, type: 'DEPOSIT', walletId: 'w-cash', txId: 't9', note: 'Nạp' }] }],
    planner: { monthlyIncome: 20000000, needsPercent: 50, notes: 'Kế hoạch' },
    currentMonth: '2026-10',
    userProfile: { name: 'Người Dùng', email: '' },
    simulatorConfig: { projectionMonths: 12, externalLoans: [] },
});

describe('MySQL store', { skip }, () => {
    test('schema is versioned and migrations are idempotent', async () => {
        await db.closePool();
        const pool = await db.getPool(); // runs migrate() again on a fresh pool
        const [rows] = await pool.query('SELECT version FROM schema_migrations');
        assert.deepEqual(rows.map((r) => r.version), [db.SCHEMA_VERSION]);
    });

    test('a full snapshot round-trips exactly (typed columns + extra fields)', async () => {
        const user = newUser();
        const snap = richSnapshot();
        assert.ok(await store.createUserWithData(user, snap));
        const loaded = await store.loadSnapshot(user.id);
        for (const key of ['wallets', 'categories', 'transactions', 'budgets', 'bills', 'goals']) {
            assert.deepEqual(loaded[key], snap[key], key);
        }
        assert.deepEqual(loaded.planner, snap.planner);
        assert.equal(loaded.currentMonth, '2026-10');
        assert.deepEqual(loaded.userProfile, snap.userProfile);
        assert.deepEqual(loaded.simulatorConfig, snap.simulatorConfig);
        assert.match(loaded.updatedAt, /^\d{4}-\d{2}-\d{2}T/);
        assert.deepEqual(loaded.security, { pinEnabled: false, pinSalt: undefined, pinHash: undefined });
    });

    test('usernames are unique case-insensitively, and there is a single host', async () => {
        const a = newUser({ username: 'MixedCase' });
        assert.ok(await store.createUserWithData(a, richSnapshot()));
        assert.equal(await store.createUserWithData(newUser({ username: 'mixedcase' }), richSnapshot()), null);
        assert.equal((await store.getUserByUsername('MIXEDCASE')).id, a.id);
        assert.ok(await store.createUserWithData(newUser({ role: 'host' }), richSnapshot()));
        assert.equal(await store.createUserWithData(newUser({ role: 'host' }), richSnapshot()), null, 'second host refused');
    });

    test('optimistic sync: stale versions conflict, versions always increase', async () => {
        const user = newUser();
        await store.createUserWithData(user, richSnapshot());
        const v1 = (await store.loadSnapshot(user.id)).updatedAt;
        const stale = await store.saveSnapshot(user.id, richSnapshot(), { expectedUpdatedAt: 'not-the-version' });
        assert.equal(stale.conflict, true);
        assert.equal(stale.current.updatedAt, v1, 'nothing written on conflict');
        const missing = await store.saveSnapshot(user.id, richSnapshot(), {});
        assert.equal(missing.conflict, true, 'no version = stale, never "overwrite"');
        const ok = await store.saveSnapshot(user.id, richSnapshot(), { expectedUpdatedAt: v1 });
        assert.ok(ok.updatedAt > v1);
        const again = await store.saveSnapshot(user.id, richSnapshot(), { expectedUpdatedAt: ok.updatedAt });
        assert.ok(again.updatedAt > ok.updatedAt, 'even within the same millisecond');
    });

    test('two devices saving from the same version at the same moment: exactly one wins', async () => {
        const user = newUser();
        await store.createUserWithData(user, richSnapshot());
        const v = (await store.loadSnapshot(user.id)).updatedAt;
        const a = richSnapshot(); a.transactions = a.transactions.slice(0, 1);
        const b = richSnapshot(); b.transactions = b.transactions.slice(0, 2);
        const results = await Promise.all([
            store.saveSnapshot(user.id, a, { expectedUpdatedAt: v }),
            store.saveSnapshot(user.id, b, { expectedUpdatedAt: v }),
        ]);
        assert.equal(results.filter((r) => r.updatedAt).length, 1);
        assert.equal(results.filter((r) => r.conflict).length, 1);
        const final = await store.loadSnapshot(user.id);
        assert.ok([1, 2].includes(final.transactions.length));
    });

    test('schema rules reject invalid data before anything is written', async () => {
        const user = newUser();
        await store.createUserWithData(user, richSnapshot());
        const v = (await store.loadSnapshot(user.id)).updatedAt;
        const bad = (mut) => { const s = richSnapshot(); mut(s); return s; };
        const cases = [
            bad((s) => { s.transactions[0].type = 'GIFT'; }),
            bad((s) => { s.transactions[0].amount = 0; }),
            bad((s) => { s.transactions[0].walletId = 'missing-wallet'; }),
            bad((s) => { s.transactions[2].toWalletId = 'w-cash'; }),
            bad((s) => { s.wallets[0].type = 'CRYPTO'; }),
            bad((s) => { s.wallets.push({ ...s.wallets[0] }); }),
            bad((s) => { s.bills[0].frequency = 'WEEKLY'; }),
            bad((s) => { s.wallets[0].id = 'x'.repeat(201); }),
        ];
        for (const snap of cases) {
            await assert.rejects(store.saveSnapshot(user.id, snap, { expectedUpdatedAt: v }), store.StoreValidationError);
        }
        assert.equal((await store.loadSnapshot(user.id)).updatedAt, v, 'nothing was written');
    });

    test('the database itself enforces constraints (even if the app check were bypassed)', async () => {
        const user = newUser();
        await store.createUserWithData(user, richSnapshot());
        const pool = await db.getPool();
        const insertTx = (over) => pool.query('INSERT INTO transactions SET ?', [{ user_id: user.id, id: crypto.randomUUID(), position: 99, type: 'EXPENSE', amount: 1, ...over }]);
        await assert.rejects(insertTx({ amount: -5 }), /check constraint/i);
        await assert.rejects(insertTx({ wallet_id: 'nope' }), /foreign key/i);
        await assert.rejects(insertTx({ type: 'TRANSFER', wallet_id: 'w-cash', to_wallet_id: 'w-cash' }), /check constraint/i);
        await assert.rejects(pool.query('INSERT INTO wallets SET ?', [{ user_id: 'ghost-user', id: 'w', position: 0, balance: 0 }]), /foreign key/i);
    });

    test('PIN settings change without touching the sync version', async () => {
        const user = newUser();
        await store.createUserWithData(user, richSnapshot());
        const before = await store.loadSnapshot(user.id);
        assert.equal(await store.setSecurity(user.id, { pinEnabled: true, pinSalt: 'cd'.repeat(16), pinHash: 'ef'.repeat(32) }), true);
        const after = await store.loadSnapshot(user.id);
        assert.equal(after.updatedAt, before.updatedAt);
        assert.deepEqual(after.security, { pinEnabled: true, pinSalt: 'cd'.repeat(16), pinHash: 'ef'.repeat(32) });
        // A normal save keeps the PIN
        await store.saveSnapshot(user.id, richSnapshot(), { expectedUpdatedAt: after.updatedAt });
        assert.equal((await store.getSecurity(user.id)).pinEnabled, true);
    });

    test('password change is compare-and-set on the token version', async () => {
        const user = newUser();
        await store.createUserWithData(user, richSnapshot());
        assert.equal(await store.changePassword(user.id, 1, '11'.repeat(16), '22'.repeat(32)), true);
        assert.equal(await store.changePassword(user.id, 1, '33'.repeat(16), '44'.repeat(32)), false, 'stale version');
        const u = await store.getUserById(user.id);
        assert.equal(u.tokenVersion, 2);
        assert.equal(u.passwordHash, '22'.repeat(32));
    });

    test('first host password can be set only once', async () => {
        const existing = await store.getHostUser();
        if (existing) await store.deleteUser(existing.id);
        const host = newUser({ role: 'host', hasPassword: false, salt: '', passwordHash: '' });
        await store.createUserWithData(host, richSnapshot());
        const [first, second] = await Promise.all([
            store.setHostPasswordIfUnset(host.id, '55'.repeat(16), '66'.repeat(32)),
            store.setHostPasswordIfUnset(host.id, '77'.repeat(16), '88'.repeat(32)),
        ]);
        assert.equal(first !== second, true, 'exactly one of two simultaneous claims succeeds');
    });

    test('encrypted backups: newest 20 kept per user, scoped by user', async () => {
        const user = newUser();
        const other = newUser();
        await store.createUserWithData(user, richSnapshot());
        await store.createUserWithData(other, richSnapshot());
        for (let i = 0; i < 22; i++) {
            await store.insertSecureBackup(user.id, `backup-${1000 + i}-${crypto.randomUUID()}.ftbk`, Buffer.from(`blob-${i}`));
        }
        const list = await store.listSecureBackups(user.id);
        assert.equal(list.length, store.MAX_SECURE_BACKUPS);
        const data = await store.getSecureBackupData(user.id, list[0].id);
        assert.ok(Buffer.isBuffer(data));
        assert.equal(await store.getSecureBackupData(other.id, list[0].id), null, 'another user cannot read it');
        assert.equal(await store.deleteSecureBackup(other.id, list[0].id), false, 'nor delete it');
        assert.equal(await store.deleteSecureBackup(user.id, list[0].id), true);
    });

    test('deleting a user removes every row they own', async () => {
        const user = newUser();
        await store.createUserWithData(user, richSnapshot());
        await store.insertSecureBackup(user.id, `backup-1-${crypto.randomUUID()}.ftbk`, Buffer.from('x'));
        assert.equal(await store.deleteUser(user.id), true);
        const pool = await db.getPool();
        for (const table of ['users', 'user_state', 'wallets', 'categories', 'transactions', 'budgets', 'bills', 'goals', 'goal_history', 'secure_backups']) {
            const col = table === 'users' ? 'id' : 'user_id';
            const [[{ n }]] = await pool.query(`SELECT COUNT(*) AS n FROM \`${table}\` WHERE ${col} = ?`, [user.id]);
            assert.equal(n, 0, table);
        }
    });

    test('ensureSnapshot creates the default data once, even when called concurrently', async () => {
        const user = newUser();
        const pool = await db.getPool();
        await pool.query('INSERT INTO users SET ?', [{ id: user.id, username: user.username, role: 'guest', created_at: user.createdAt }]);
        let calls = 0;
        const defaults = () => { calls++; return richSnapshot(); };
        const results = await Promise.all([1, 2, 3, 4].map(() => store.ensureSnapshot(user.id, defaults)));
        const versions = new Set(results.map((r) => r.updatedAt));
        assert.equal(versions.size, 1, 'everyone sees the same single snapshot');
        assert.ok(calls >= 1);
    });
});

describe('legacy JSON import', { skip }, () => {
    const defaultUserData = (name) => ({ ...richSnapshot(), userProfile: { name } });

    async function makeDataDir(users, files) {
        const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'fintrack-legacy-'));
        await fs.mkdir(path.join(dir, 'users'), { recursive: true });
        await fs.writeFile(path.join(dir, 'users.json'), JSON.stringify(users));
        for (const [name, content] of Object.entries(files)) {
            const file = path.join(dir, name);
            await fs.mkdir(path.dirname(file), { recursive: true });
            await fs.writeFile(file, Buffer.isBuffer(content) ? content : JSON.stringify(content));
        }
        return dir;
    }

    async function emptyDatabase() {
        const pool = await db.getPool();
        await pool.query('SET FOREIGN_KEY_CHECKS = 0');
        for (const t of ['goal_history', 'goals', 'transactions', 'budgets', 'bills', 'categories', 'wallets', 'secure_backups', 'user_state', 'users', 'app_meta']) {
            await pool.query(`DELETE FROM \`${t}\``);
        }
        await pool.query('SET FOREIGN_KEY_CHECKS = 1');
    }

    test('an invalid account aborts the whole import and leaves the JSON files untouched', async () => {
        await emptyDatabase();
        const bad = richSnapshot();
        bad.transactions[0].walletId = 'missing';
        const dir = await makeDataDir(
            [{ id: 'admin', username: 'admin', role: 'host', hasPassword: false, createdAt: '2026-01-01T00:00:00Z' },
                { id: 'usr_bad', username: 'bad', role: 'guest', hasPassword: true, salt: 'aa', passwordHash: 'bb', createdAt: '2026-01-01T00:00:00Z' }],
            { 'users/admin.json': richSnapshot(), 'users/usr_bad.json': bad },
        );
        await assert.rejects(legacy.importLegacyJsonIfNeeded(dir, { defaultUserData }), /bad/);
        assert.equal(await store.countUsers(), 0, 'nothing imported');
        await fs.access(path.join(dir, 'users.json'));
        await fs.access(path.join(dir, 'users', 'admin.json'));
    });

    test('imports accounts, data, plaintext PINs and encrypted backups, then archives the JSON', async () => {
        await emptyDatabase();
        const hostData = { ...richSnapshot(), security: { pinEnabled: true, pinCode: '2468' } };
        const guestData = { wallets: [{ id: 'w1', name: 'Ví cũ', type: 'CASH', balance: '1150000' }],
            transactions: [{ id: 'o1', type: 'INCOME', amount: '200000', walletId: 'w1', date: '2026-09-01T10:00:00' },
                { id: 'o2', type: 'EXPENSE', amount: 50000, walletId: 'w1', date: '2026-09-02T10:00:00' }] };
        const backupName = `backup-1700000000000-${crypto.randomUUID()}.ftbk`;
        const dir = await makeDataDir(
            [{ id: 'admin', username: 'admin', role: 'host', hasPassword: true, salt: 'aa'.repeat(16), passwordHash: 'bb'.repeat(32), tokenVersion: 3, createdAt: '2026-01-01T00:00:00Z' },
                { id: 'usr_old', username: 'olduser', role: 'guest', hasPassword: true, salt: 'cc'.repeat(16), passwordHash: 'dd'.repeat(32), displayName: 'Cũ', createdAt: '2026-02-01T00:00:00Z' }],
            { 'users/admin.json': hostData, 'users/usr_old.json': guestData, [`users/usr_old/secure-backups/${backupName}`]: Buffer.from('encrypted') },
        );
        const report = await legacy.importLegacyJsonIfNeeded(dir, { defaultUserData });
        assert.match(report, /2 tài khoản/);
        const host = await store.getUserByUsername('admin');
        assert.equal(host.tokenVersion, 3, 'sessions stay valid');
        const hostSnap = await store.loadSnapshot('admin');
        assert.equal(hostSnap.security.pinEnabled, true);
        assert.ok(hostSnap.security.pinHash && !JSON.stringify(hostSnap).includes('2468'), 'plaintext PIN hashed');
        const guest = await store.loadSnapshot('usr_old');
        assert.equal(guest.wallets[0].balance, 1150000, 'legacy wallet not double counted');
        assert.equal(guest.wallets[0].initialBalance, 1000000);
        assert.equal(typeof guest.transactions[0].amount, 'number');
        assert.equal((await store.listSecureBackups('usr_old'))[0].id, backupName);
        // JSON archived, not deleted
        await assert.rejects(fs.access(path.join(dir, 'users.json')));
        const archived = (await fs.readdir(dir)).find((n) => n.startsWith('legacy-json-'));
        assert.ok(archived);
        await fs.access(path.join(dir, archived, 'users.json'));
        // Runs only once
        assert.equal(await legacy.importLegacyJsonIfNeeded(dir, { defaultUserData }), null);
    });
});
