import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadMigrations, getSchemaVersion } from '../src/lib/db.js';

test('schema migrations are read from db/migrations in version order', () => {
    const migrations = loadMigrations();
    assert.equal(migrations[0].version, 1);
    assert.equal(migrations[0].name, 'initial schema');
    migrations.forEach((m, i) => i > 0 && assert.ok(m.version > migrations[i - 1].version));
    assert.equal(getSchemaVersion(), migrations[migrations.length - 1].version);
});

test('the initial migration creates the 11 app tables, one statement each, comments dropped', () => {
    const [initial] = loadMigrations();
    const tables = initial.statements.map((sql) => /^CREATE TABLE IF NOT EXISTS (\w+) \(/.exec(sql)?.[1]);
    assert.deepEqual(tables, ['users', 'user_state', 'wallets', 'categories', 'transactions', 'budgets', 'bills',
        'goals', 'goal_history', 'secure_backups', 'app_meta']);
    for (const sql of initial.statements) {
        assert.ok(!sql.includes('--'), 'no comment text sent to MySQL');
        assert.ok(!sql.endsWith(';'));
    }
});
