import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';

/**
 * MySQL connection pool and schema migrations (the tables themselves are in db/migrations/*.sql).
 *
 * Configuration (first match wins):
 *   DATABASE_URL=mysql://user:password@host:3306/database
 *   or MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE
 *
 * Design notes:
 * - Every row belongs to a user. Read-check-write sequences run in transactions that lock the user's
 *   user_state row (SELECT ... FOR UPDATE), so concurrent requests for one user are serialized.
 * - Money is DECIMAL(19,4); mysql2 is configured to return DECIMAL as JS numbers.
 */

export function getDbConfig() {
    const url = process.env.DATABASE_URL;
    if (url) {
        const u = new URL(url);
        if (!/^mysql2?:$/.test(u.protocol)) {
            throw new Error('DATABASE_URL must start with mysql://');
        }
        return {
            host: u.hostname,
            port: Number(u.port) || 3306,
            user: decodeURIComponent(u.username),
            password: decodeURIComponent(u.password),
            database: u.pathname.replace(/^\//, ''),
        };
    }
    return {
        host: process.env.MYSQL_HOST || '127.0.0.1',
        port: Number(process.env.MYSQL_PORT) || 3306,
        user: process.env.MYSQL_USER || 'fintrack',
        password: process.env.MYSQL_PASSWORD || '',
        database: process.env.MYSQL_DATABASE || 'fintrack',
    };
}

// Schema changes live in db/migrations/NNN_short_name.sql (applied in order, each once).
// Never edit a migration that has shipped: add a new file.
const MIGRATIONS_DIR = path.join(process.cwd(), 'db', 'migrations');
const MIGRATION_FILE = /^(\d+)_([a-z0-9_]+)\.sql$/;

let migrationsCache;

/** Read the migration files: [{ version, name, statements }] sorted by version */
export function loadMigrations() {
    if (migrationsCache) return migrationsCache;
    const migrations = [];
    for (const file of fs.readdirSync(MIGRATIONS_DIR)) {
        const match = MIGRATION_FILE.exec(file);
        if (!match) continue;
        const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
        // Statements end with ";" at the end of a line; "--" comment lines are dropped
        const statements = sql
            .split('\n')
            .filter((line) => !line.trim().startsWith('--'))
            .join('\n')
            .split(/;\s*$/m)
            .map((statement) => statement.trim())
            .filter(Boolean);
        migrations.push({ version: Number(match[1]), name: match[2].replace(/_/g, ' '), statements });
    }
    migrations.sort((x, y) => x.version - y.version);
    if (migrations.length === 0) throw new Error(`No schema migrations found in ${MIGRATIONS_DIR}`);
    migrations.forEach((m, i) => {
        if (i > 0 && m.version === migrations[i - 1].version) throw new Error(`Two migrations share version ${m.version}`);
    });
    migrationsCache = migrations;
    return migrations;
}

/** Latest schema version (the highest migration number) */
export function getSchemaVersion() {
    const migrations = loadMigrations();
    return migrations[migrations.length - 1].version;
}

// A database that hangs (network trouble, paused server) must fail fast enough for the app to answer
// "temporarily unavailable" instead of leaving the request waiting forever
const QUERY_TIMEOUT_MS = Number(process.env.MYSQL_QUERY_TIMEOUT_MS) || 8000;

function createPool() {
    const pool = mysql.createPool({
        ...getDbConfig(),
        connectTimeout: 5000,
        charset: 'utf8mb4_0900_ai_ci',
        connectionLimit: Number(process.env.MYSQL_POOL_SIZE) || 10,
        waitForConnections: true,
        decimalNumbers: true,
        supportBigNumbers: true,
        dateStrings: true,
        timezone: 'Z',
    });
    // Give every statement a timeout unless the caller set one (mysql2 has no pool-wide option for it)
    // Only SQL strings and plain option objects are wrapped: mysql2 itself also passes ready-made Query
    // commands to conn.query(), and those must go through untouched.
    const withTimeout = (sql) => {
        if (typeof sql === 'string') return { sql, timeout: QUERY_TIMEOUT_MS };
        if (sql && Object.getPrototypeOf(sql) === Object.prototype && sql.timeout === undefined) return { ...sql, timeout: QUERY_TIMEOUT_MS };
        return sql;
    };
    const core = pool.pool;
    const poolQuery = core.query.bind(core);
    core.query = (sql, values, cb) => poolQuery(withTimeout(sql), values, cb); // pool.query()
    core.on('connection', (conn) => { // queries inside transactions (pool.getConnection())
        const query = conn.query.bind(conn);
        conn.query = (sql, values, cb) => query(withTimeout(sql), values, cb);
    });
    return pool;
}

async function migrate(pool) {
    const conn = await pool.getConnection();
    try {
        // Only one process migrates at a time (two app instances starting together)
        const [[lock]] = await conn.query("SELECT GET_LOCK('fintrack_schema_migration', 60) AS ok");
        if (!lock.ok) throw new Error('Timed out waiting for the schema migration lock');
        try {
            await conn.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
                version    INT UNSIGNED NOT NULL PRIMARY KEY,
                name       VARCHAR(200) NOT NULL,
                applied_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`);
            const [rows] = await conn.query('SELECT version FROM schema_migrations');
            const applied = new Set(rows.map((r) => r.version));
            for (const m of loadMigrations()) {
                if (applied.has(m.version)) continue;
                // MySQL commits DDL implicitly, so a migration is not one atomic step: statements are written
                // to be re-runnable (IF NOT EXISTS) and the version row is recorded only after all of them.
                for (const sql of m.statements) {
                    await conn.query(sql);
                }
                await conn.query('INSERT INTO schema_migrations (version, name) VALUES (?, ?)', [m.version, m.name]);
                console.log(`[FinTrack] Database migrated to schema v${m.version} (${m.name})`);
            }
        } finally {
            await conn.query("SELECT RELEASE_LOCK('fintrack_schema_migration')");
        }
    } finally {
        conn.release();
    }
}

/**
 * Shared pool, migrated on first use (kept on globalThis so dev hot reloads reuse it).
 */
export async function getPool() {
    const g = globalThis;
    if (!g.__fintrackPool) {
        const pool = createPool();
        g.__fintrackPool = pool;
        g.__fintrackPoolReady = migrate(pool).catch((err) => {
            delete g.__fintrackPool;
            delete g.__fintrackPoolReady;
            pool.end().catch(() => {});
            throw err;
        });
    }
    await g.__fintrackPoolReady;
    return g.__fintrackPool;
}

/** Run a simple statement on the pool */
export async function query(sql, params) {
    const pool = await getPool();
    const [rows] = await pool.query(sql, params);
    return rows;
}

const RETRYABLE = new Set(['ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT']);

/**
 * Run fn(conn) in a transaction. Commits on success, rolls back on error, retries on deadlock.
 */
export async function withTransaction(fn, { retries = 3 } = {}) {
    const pool = await getPool();
    for (let attempt = 0; ; attempt++) {
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            const result = await fn(conn);
            await conn.commit();
            return result;
        } catch (err) {
            await conn.rollback().catch(() => {});
            if (RETRYABLE.has(err.code) && attempt < retries) continue;
            throw err;
        } finally {
            conn.release();
        }
    }
}

/** Close the pool (tests, CLI scripts) */
export async function closePool() {
    const g = globalThis;
    if (g.__fintrackPool) {
        const pool = g.__fintrackPool;
        delete g.__fintrackPool;
        delete g.__fintrackPoolReady;
        await pool.end();
    }
}
