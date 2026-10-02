#!/usr/bin/env node
/**
 * Check the MySQL connection, create / upgrade the schema and print a short summary.
 *   npm run db:check
 * start.sh runs it before starting the app so a missing database is reported clearly.
 */
import './env.mjs';
import { getPool, getDbConfig, closePool, SCHEMA_VERSION } from '../src/lib/db.js';

try {
    const cfg = getDbConfig();
    const pool = await getPool();
    const [[version]] = await pool.query('SELECT VERSION() AS v');
    const [[counts]] = await pool.query(`SELECT
        (SELECT COUNT(*) FROM users) AS users,
        (SELECT COUNT(*) FROM transactions) AS transactions,
        (SELECT COUNT(*) FROM secure_backups) AS backups`);
    console.log(`MySQL ${version.v} at ${cfg.host}:${cfg.port}/${cfg.database} - schema v${SCHEMA_VERSION}, ${counts.users} accounts, ${counts.transactions} transactions, ${counts.backups} encrypted backups`);
} catch (err) {
    const cfg = (() => { try { return getDbConfig(); } catch { return {}; } })();
    console.error(`Cannot use MySQL at ${cfg.host}:${cfg.port}/${cfg.database}: ${err.code || ''} ${err.message}`);
    console.error('Start it with "docker compose up -d db" (see README) and check DATABASE_URL in .env.');
    process.exitCode = 1;
} finally {
    await closePool();
}
