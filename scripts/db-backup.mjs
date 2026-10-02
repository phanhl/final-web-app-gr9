#!/usr/bin/env node
/**
 * Full logical backup of the FinTrack database to a gzip-compressed SQL file (no mysqldump needed).
 *   npm run db:backup                      -> backups/fintrack-<timestamp>.sql.gz
 *   npm run db:backup -- path/to/file.sql.gz
 * Restore:  gunzip -c file.sql.gz | mysql -h 127.0.0.1 -u fintrack -p fintrack
 * The dump is consistent: it is read inside one REPEATABLE READ snapshot.
 */
import './env.mjs';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import mysql from 'mysql2/promise';
import { getPool, closePool, getDbConfig } from '../src/lib/db.js';

// Parents before children so the file also restores with foreign key checks on
const TABLES = ['schema_migrations', 'app_meta', 'users', 'user_state', 'wallets', 'categories', 'transactions',
    'budgets', 'bills', 'goals', 'goal_history', 'secure_backups'];

const out = process.argv[2] || path.join('backups', `fintrack-${new Date().toISOString().replace(/[:.]/g, '-')}.sql.gz`);

async function* dump(conn) {
    const cfg = getDbConfig();
    yield `-- FinTrack Pro database backup\n-- database: ${cfg.database}\n-- created: ${new Date().toISOString()}\n`;
    yield 'SET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS = 0;\n\n';
    for (const table of TABLES) {
        const [[create]] = await conn.query(`SHOW CREATE TABLE \`${table}\``);
        yield `DROP TABLE IF EXISTS \`${table}\`;\n${create['Create Table']};\n\n`;
        const [cols] = await conn.query(`SHOW COLUMNS FROM \`${table}\``);
        // Generated columns are recomputed by MySQL and cannot be inserted
        const writable = cols.filter((c) => !/\b(VIRTUAL|STORED) GENERATED\b/i.test(c.Extra)).map((c) => c.Field);
        const jsonCols = new Set(cols.filter((c) => c.Type === 'json').map((c) => c.Field));
        const [rows] = await conn.query(`SELECT ${writable.map((c) => `\`${c}\``).join(', ')} FROM \`${table}\``);
        for (let i = 0; i < rows.length; i += 100) {
            const values = rows.slice(i, i + 100).map((row) => writable.map((c) => {
                const v = row[c];
                return jsonCols.has(c) && v !== null && typeof v === 'object' ? JSON.stringify(v) : v;
            }));
            yield mysql.format(`INSERT INTO \`${table}\` (${writable.map((c) => `\`${c}\``).join(', ')}) VALUES ?;\n`, [values]);
        }
        yield '\n';
    }
    yield 'SET FOREIGN_KEY_CHECKS = 1;\n';
}

try {
    const pool = await getPool();
    const conn = await pool.getConnection();
    try {
        await conn.query('SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ');
        await conn.query('START TRANSACTION WITH CONSISTENT SNAPSHOT');
        fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true, mode: 0o700 });
        await pipeline(Readable.from(dump(conn)), zlib.createGzip(), fs.createWriteStream(out, { mode: 0o600 }));
        await conn.query('COMMIT');
    } finally {
        conn.release();
    }
    console.log(`Backup written to ${out} (${fs.statSync(out).size} bytes)`);
} catch (err) {
    console.error('Backup failed:', err.message);
    process.exitCode = 1;
} finally {
    await closePool();
}
