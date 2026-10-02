import mysql from 'mysql2/promise';

/**
 * MySQL connection pool and schema migrations.
 *
 * Configuration (first match wins):
 *   DATABASE_URL=mysql://user:password@host:3306/database
 *   or MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE
 *
 * Design notes:
 * - InnoDB + utf8mb4. Identifiers use a binary collation (exact match); usernames use the default
 *   case-insensitive collation so "Admin" and "admin" cannot both exist.
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

const ID = 'VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin';
const TABLE_OPTIONS = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci';

/** Ordered schema migrations. Never edit a shipped migration: append a new one. */
const MIGRATIONS = [
    {
        version: 1,
        name: 'initial schema',
        statements: [
            `CREATE TABLE IF NOT EXISTS users (
                id                  VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
                username            VARCHAR(64) NOT NULL,
                role                ENUM('host', 'guest') NOT NULL,
                display_name        VARCHAR(100) NULL,
                password_salt       VARCHAR(64) NULL,
                password_hash       VARCHAR(128) NULL,
                has_password        TINYINT(1) NOT NULL DEFAULT 0,
                token_version       INT UNSIGNED NOT NULL DEFAULT 1,
                created_at          VARCHAR(40) NOT NULL,
                password_changed_at VARCHAR(40) NULL,
                host_marker         TINYINT AS (IF(role = 'host', 1, NULL)) STORED,
                PRIMARY KEY (id),
                UNIQUE KEY users_username (username),
                UNIQUE KEY users_single_host (host_marker),
                CONSTRAINT users_password_set CHECK (has_password = 0 OR (password_salt IS NOT NULL AND password_hash IS NOT NULL)),
                CONSTRAINT users_token_version CHECK (token_version >= 1)
            ) ${TABLE_OPTIONS}`,

            // One row per user: sync version, settings and the App PIN
            `CREATE TABLE IF NOT EXISTS user_state (
                user_id          VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
                updated_at       VARCHAR(40) NOT NULL,
                current_month    VARCHAR(20) NULL,
                planner          JSON NULL,
                simulator_config JSON NULL,
                user_profile     JSON NULL,
                pin_enabled      TINYINT(1) NOT NULL DEFAULT 0,
                pin_salt         VARCHAR(64) NULL,
                pin_hash         VARCHAR(128) NULL,
                PRIMARY KEY (user_id),
                CONSTRAINT user_state_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                CONSTRAINT user_state_pin CHECK (pin_enabled = 0 OR (pin_salt IS NOT NULL AND pin_hash IS NOT NULL))
            ) ${TABLE_OPTIONS}`,

            // Entity tables: typed columns for what the app relies on, "extra" (JSON) keeps any other field
            // so nothing the client sends is lost; "position" preserves the client's list order.
            `CREATE TABLE IF NOT EXISTS wallets (
                user_id         VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
                id              ${ID} NOT NULL,
                position        INT UNSIGNED NOT NULL,
                name            TEXT NULL,
                type            ENUM('CASH', 'BANK', 'CREDIT', 'SAVINGS') NULL,
                balance         DECIMAL(19,4) NOT NULL,
                initial_balance DECIMAL(19,4) NOT NULL DEFAULT 0,
                currency        VARCHAR(16) NULL,
                credit_limit    DECIMAL(19,4) NULL,
                interest_rate   DECIMAL(9,4) NULL,
                bank_name       VARCHAR(255) NULL,
                account_number  VARCHAR(64) NULL,
                color           VARCHAR(64) NULL,
                icon            VARCHAR(64) NULL,
                created_at      VARCHAR(40) NULL,
                extra           JSON NULL,
                PRIMARY KEY (user_id, id),
                CONSTRAINT wallets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                CONSTRAINT wallets_credit_limit CHECK (credit_limit IS NULL OR credit_limit >= 0)
            ) ${TABLE_OPTIONS}`,

            `CREATE TABLE IF NOT EXISTS categories (
                user_id  VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
                id       ${ID} NOT NULL,
                position INT UNSIGNED NOT NULL,
                name     TEXT NULL,
                type     ENUM('INCOME', 'EXPENSE') NULL,
                icon     VARCHAR(64) NULL,
                color    VARCHAR(64) NULL,
                extra    JSON NULL,
                PRIMARY KEY (user_id, id),
                CONSTRAINT categories_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ${TABLE_OPTIONS}`,

            // Transactions reference wallets of the same user. NO ACTION (not CASCADE) because MySQL does not
            // allow CHECK constraints on columns used by cascading foreign keys; deletes run in explicit order.
            `CREATE TABLE IF NOT EXISTS transactions (
                user_id        VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
                id             ${ID} NOT NULL,
                position       INT UNSIGNED NOT NULL,
                type           ENUM('INCOME', 'EXPENSE', 'TRANSFER') NOT NULL,
                amount         DECIMAL(19,4) NOT NULL,
                fee            DECIMAL(19,4) NULL,
                date           VARCHAR(40) NULL,
                wallet_id      ${ID} NULL,
                wallet_name    TEXT NULL,
                to_wallet_id   ${ID} NULL,
                to_wallet_name TEXT NULL,
                category_id    ${ID} NULL,
                category_name  TEXT NULL,
                note           TEXT NULL,
                tags           JSON NULL,
                bill_id        ${ID} NULL,
                receipt_image  MEDIUMTEXT NULL,
                created_at     VARCHAR(40) NULL,
                extra          JSON NULL,
                PRIMARY KEY (user_id, id),
                KEY transactions_by_date (user_id, date),
                KEY transactions_by_wallet (user_id, wallet_id),
                KEY transactions_by_to_wallet (user_id, to_wallet_id),
                CONSTRAINT transactions_wallet FOREIGN KEY (user_id, wallet_id) REFERENCES wallets(user_id, id),
                CONSTRAINT transactions_to_wallet FOREIGN KEY (user_id, to_wallet_id) REFERENCES wallets(user_id, id),
                CONSTRAINT transactions_amount CHECK (amount > 0),
                CONSTRAINT transactions_fee CHECK (fee IS NULL OR fee >= 0),
                CONSTRAINT transactions_transfer CHECK (type <> 'TRANSFER' OR (wallet_id IS NOT NULL AND to_wallet_id IS NOT NULL AND wallet_id <> to_wallet_id))
            ) ${TABLE_OPTIONS}`,

            `CREATE TABLE IF NOT EXISTS budgets (
                user_id       VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
                id            ${ID} NOT NULL,
                position      INT UNSIGNED NOT NULL,
                category_id   ${ID} NULL,
                category_name TEXT NULL,
                amount        DECIMAL(19,4) NULL,
                month         VARCHAR(20) NULL,
                extra         JSON NULL,
                PRIMARY KEY (user_id, id),
                CONSTRAINT budgets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                CONSTRAINT budgets_amount CHECK (amount IS NULL OR amount >= 0)
            ) ${TABLE_OPTIONS}`,

            `CREATE TABLE IF NOT EXISTS bills (
                user_id              VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
                id                   ${ID} NOT NULL,
                position             INT UNSIGNED NOT NULL,
                name                 TEXT NULL,
                amount               DECIMAL(19,4) NULL,
                category_id          ${ID} NULL,
                category_name        TEXT NULL,
                wallet_id            ${ID} NULL,
                due_day              TINYINT UNSIGNED NULL,
                frequency            ENUM('MONTHLY', 'QUARTERLY', 'YEARLY') NULL,
                status               VARCHAR(32) NULL,
                last_paid_date       VARCHAR(40) NULL,
                last_payment_tx_id   ${ID} NULL,
                reminder_days_before SMALLINT NULL,
                note                 TEXT NULL,
                extra                JSON NULL,
                PRIMARY KEY (user_id, id),
                CONSTRAINT bills_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                CONSTRAINT bills_amount CHECK (amount IS NULL OR amount >= 0),
                CONSTRAINT bills_due_day CHECK (due_day IS NULL OR due_day BETWEEN 1 AND 31)
            ) ${TABLE_OPTIONS}`,

            `CREATE TABLE IF NOT EXISTS goals (
                user_id        VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
                id             ${ID} NOT NULL,
                position       INT UNSIGNED NOT NULL,
                name           TEXT NULL,
                target_amount  DECIMAL(19,4) NULL,
                current_amount DECIMAL(19,4) NULL,
                deadline       VARCHAR(40) NULL,
                wallet_id      ${ID} NULL,
                color          VARCHAR(64) NULL,
                icon           VARCHAR(64) NULL,
                created_at     VARCHAR(40) NULL,
                extra          JSON NULL,
                PRIMARY KEY (user_id, id),
                CONSTRAINT goals_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                CONSTRAINT goals_amounts CHECK ((target_amount IS NULL OR target_amount >= 0) AND (current_amount IS NULL OR current_amount >= 0))
            ) ${TABLE_OPTIONS}`,

            `CREATE TABLE IF NOT EXISTS goal_history (
                user_id   VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
                goal_id   ${ID} NOT NULL,
                id        ${ID} NOT NULL,
                position  INT UNSIGNED NOT NULL,
                date      VARCHAR(40) NULL,
                amount    DECIMAL(19,4) NULL,
                type      ENUM('DEPOSIT', 'WITHDRAW') NULL,
                wallet_id ${ID} NULL,
                tx_id     ${ID} NULL,
                note      TEXT NULL,
                extra     JSON NULL,
                PRIMARY KEY (user_id, goal_id, id),
                CONSTRAINT goal_history_goal FOREIGN KEY (user_id, goal_id) REFERENCES goals(user_id, id) ON DELETE CASCADE
            ) ${TABLE_OPTIONS}`,

            // Encrypted (AES-256-GCM) snapshots; the blob is opaque to the database
            `CREATE TABLE IF NOT EXISTS secure_backups (
                id         VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
                user_id    VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
                created_at VARCHAR(40) NOT NULL,
                size       INT UNSIGNED NOT NULL,
                data       LONGBLOB NOT NULL,
                PRIMARY KEY (id),
                KEY secure_backups_by_user (user_id, created_at),
                CONSTRAINT secure_backups_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ${TABLE_OPTIONS}`,

            `CREATE TABLE IF NOT EXISTS app_meta (
                \`key\`  VARCHAR(64) NOT NULL,
                value  TEXT NOT NULL,
                PRIMARY KEY (\`key\`)
            ) ${TABLE_OPTIONS}`,
        ],
    },
];

export const SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;

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
            ) ${TABLE_OPTIONS}`);
            const [rows] = await conn.query('SELECT version FROM schema_migrations');
            const applied = new Set(rows.map((r) => r.version));
            for (const m of MIGRATIONS) {
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
