import { getPool, withTransaction } from './db';

/**
 * Data access layer on top of MySQL.
 *
 * The client still exchanges a whole snapshot ({ wallets, transactions, ..., updatedAt }) with /api/storage.
 * Each list is stored in its own table with typed, constrained columns. Fields the schema does not model
 * (or values of an unexpected type) are kept in the row's JSON "extra" column, so a snapshot always
 * round-trips without losing data.
 */

export class StoreValidationError extends Error {
    constructor(message) {
        super(message);
        this.code = 'STORE_VALIDATION';
    }
}

const MONEY_LIMIT = 1e15; // DECIMAL(19,4)

// Field kinds:
//  id      string 1..200 chars (required for "id"); reject otherwise
//  enum    one of `values`; reject otherwise (the database has the same ENUM)
//  money   finite number within DECIMAL(19,4); `required` rejects missing/invalid values
//  num     finite number (DECIMAL(9,4) range)
//  int     integer within [min, max]
//  str     string up to `max` characters
//  text    string up to 60000 characters (TEXT column)
//  json    array / object
// Optional fields whose value does not fit the column go to "extra" unchanged instead of failing.
const F = (key, column, kind, opts = {}) => ({ key, column, kind, ...opts });

export const ENTITIES = {
    wallets: {
        table: 'wallets',
        label: 'Ví',
        fields: [
            F('id', 'id', 'id', { required: true }),
            F('name', 'name', 'text'),
            F('type', 'type', 'enum', { values: ['CASH', 'BANK', 'CREDIT', 'SAVINGS'] }),
            F('balance', 'balance', 'money', { required: true }),
            F('initialBalance', 'initial_balance', 'money', { default: 0 }),
            F('currency', 'currency', 'str', { max: 16 }),
            F('creditLimit', 'credit_limit', 'money', { min: 0 }),
            F('interestRate', 'interest_rate', 'num'),
            F('bankName', 'bank_name', 'str', { max: 255 }),
            F('accountNumber', 'account_number', 'str', { max: 64 }),
            F('color', 'color', 'str', { max: 64 }),
            F('icon', 'icon', 'str', { max: 64 }),
            F('createdAt', 'created_at', 'str', { max: 40 }),
        ],
    },
    categories: {
        table: 'categories',
        label: 'Danh mục',
        fields: [
            F('id', 'id', 'id', { required: true }),
            F('name', 'name', 'text'),
            F('type', 'type', 'enum', { values: ['INCOME', 'EXPENSE'] }),
            F('icon', 'icon', 'str', { max: 64 }),
            F('color', 'color', 'str', { max: 64 }),
        ],
    },
    transactions: {
        table: 'transactions',
        label: 'Giao dịch',
        fields: [
            F('id', 'id', 'id', { required: true }),
            F('type', 'type', 'enum', { values: ['INCOME', 'EXPENSE', 'TRANSFER'], required: true }),
            F('amount', 'amount', 'money', { required: true, min: 0, exclusiveMin: true }),
            F('fee', 'fee', 'money', { min: 0, strict: true }),
            F('date', 'date', 'str', { max: 40 }),
            F('walletId', 'wallet_id', 'id'),
            F('walletName', 'wallet_name', 'text'),
            F('toWalletId', 'to_wallet_id', 'id'),
            F('toWalletName', 'to_wallet_name', 'text'),
            F('categoryId', 'category_id', 'id'),
            F('categoryName', 'category_name', 'text'),
            F('note', 'note', 'text'),
            F('tags', 'tags', 'json'),
            F('billId', 'bill_id', 'id'),
            F('receiptImage', 'receipt_image', 'str', { max: 16_000_000 }),
            F('createdAt', 'created_at', 'str', { max: 40 }),
        ],
    },
    budgets: {
        table: 'budgets',
        label: 'Ngân sách',
        fields: [
            F('id', 'id', 'id', { required: true }),
            F('categoryId', 'category_id', 'id'),
            F('categoryName', 'category_name', 'text'),
            F('amount', 'amount', 'money', { min: 0 }),
            F('month', 'month', 'str', { max: 20 }),
        ],
    },
    bills: {
        table: 'bills',
        label: 'Hóa đơn',
        fields: [
            F('id', 'id', 'id', { required: true }),
            F('name', 'name', 'text'),
            F('amount', 'amount', 'money', { min: 0 }),
            F('categoryId', 'category_id', 'id'),
            F('categoryName', 'category_name', 'text'),
            F('walletId', 'wallet_id', 'id'),
            F('dueDay', 'due_day', 'int', { min: 1, max: 31 }),
            F('frequency', 'frequency', 'enum', { values: ['MONTHLY', 'QUARTERLY', 'YEARLY'] }),
            F('status', 'status', 'str', { max: 32 }),
            F('lastPaidDate', 'last_paid_date', 'str', { max: 40 }),
            F('lastPaymentTxId', 'last_payment_tx_id', 'id'),
            F('reminderDaysBefore', 'reminder_days_before', 'int', { min: -32768, max: 32767 }),
            F('note', 'note', 'text'),
        ],
    },
    goals: {
        table: 'goals',
        label: 'Mục tiêu',
        fields: [
            F('id', 'id', 'id', { required: true }),
            F('name', 'name', 'text'),
            F('targetAmount', 'target_amount', 'money', { min: 0 }),
            F('currentAmount', 'current_amount', 'money', { min: 0 }),
            F('deadline', 'deadline', 'str', { max: 40 }),
            F('walletId', 'wallet_id', 'id'),
            F('color', 'color', 'str', { max: 64 }),
            F('icon', 'icon', 'str', { max: 64 }),
            F('createdAt', 'created_at', 'str', { max: 40 }),
        ],
    },
    goalHistory: {
        table: 'goal_history',
        label: 'Lịch sử mục tiêu',
        fields: [
            F('id', 'id', 'id', { required: true }),
            F('date', 'date', 'str', { max: 40 }),
            F('amount', 'amount', 'money'),
            F('type', 'type', 'enum', { values: ['DEPOSIT', 'WITHDRAW'] }),
            F('walletId', 'wallet_id', 'id'),
            F('txId', 'tx_id', 'id'),
            F('note', 'note', 'text'),
        ],
    },
};

export const LIST_FIELDS = ['wallets', 'categories', 'transactions', 'budgets', 'bills', 'goals'];

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * Convert one value for its column. Returns { ok: true, value } when it fits, { ok: false } when it does not.
 */
function fitValue(field, value) {
    switch (field.kind) {
        case 'id':
            return typeof value === 'string' && value.trim().length > 0 && value.length <= 200 ? { ok: true, value } : { ok: false };
        case 'enum':
            return field.values.includes(value) ? { ok: true, value } : { ok: false };
        case 'money':
        case 'num': {
            if (typeof value !== 'number' || !Number.isFinite(value)) return { ok: false };
            const limit = field.kind === 'money' ? MONEY_LIMIT : 1e5;
            if (Math.abs(value) >= limit) return { ok: false };
            if (field.min !== undefined && (field.exclusiveMin ? value <= field.min : value < field.min)) return { ok: false };
            return { ok: true, value };
        }
        case 'int':
            return Number.isInteger(value) && value >= field.min && value <= field.max ? { ok: true, value } : { ok: false };
        case 'str':
            return typeof value === 'string' && value.length <= field.max ? { ok: true, value } : { ok: false };
        case 'text':
            return typeof value === 'string' && value.length <= 60000 ? { ok: true, value } : { ok: false };
        case 'json':
            return Array.isArray(value) || isPlainObject(value) ? { ok: true, value: JSON.stringify(value) } : { ok: false };
        default:
            return { ok: false };
    }
}

/**
 * Object -> row. Throws StoreValidationError for values the schema must reject (ids, enums, required numbers).
 */
function toRow(def, obj, index) {
    if (!isPlainObject(obj)) throw new StoreValidationError(`${def.label} tại vị trí ${index} không hợp lệ`);
    const row = { position: index };
    const extra = {};
    const modeled = new Set(def.fields.map((f) => f.key));
    for (const field of def.fields) {
        const value = obj[field.key];
        if (value === undefined || value === null) {
            if (field.required) throw new StoreValidationError(`${def.label} tại vị trí ${index}: thiếu "${field.key}"`);
            if (value === null) extra[field.key] = null; // keep an explicit null
            row[field.column] = field.default ?? null;
            continue;
        }
        const fitted = fitValue(field, value);
        if (fitted.ok) {
            row[field.column] = fitted.value;
        } else if (field.required || field.kind === 'enum' || field.strict || (field.kind === 'id' && field.key === 'id')) {
            throw new StoreValidationError(`${def.label} "${obj.id ?? index}": giá trị "${field.key}" không hợp lệ`);
        } else {
            // Unexpected type/size for an optional field: keep it verbatim rather than lose it
            row[field.column] = field.default ?? null;
            extra[field.key] = value;
        }
    }
    for (const [key, value] of Object.entries(obj)) {
        if (!modeled.has(key) && value !== undefined && key !== 'history') extra[key] = value;
    }
    row.extra = Object.keys(extra).length ? JSON.stringify(extra) : null;
    return row;
}

function parseJson(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') {
        try { return JSON.parse(value); } catch { return null; }
    }
    return value; // mysql2 already parses JSON columns
}

/** Row -> object (modeled fields first, then everything kept in "extra") */
function fromRow(def, row) {
    const obj = {};
    for (const field of def.fields) {
        const value = row[field.column];
        if (value === null || value === undefined) continue;
        obj[field.key] = field.kind === 'json' ? parseJson(value) : value;
    }
    const extra = parseJson(row.extra);
    if (isPlainObject(extra)) Object.assign(obj, extra);
    return obj;
}

function columnsOf(def) {
    return ['user_id', 'position', ...def.fields.map((f) => f.column), 'extra'];
}

async function insertRows(conn, def, userId, rows, prefixColumns = []) {
    if (!rows.length) return;
    const columns = [...prefixColumns.map((c) => c.column), ...columnsOf(def)];
    const values = rows.map((row) => [
        ...prefixColumns.map((c) => row[c.column]),
        userId,
        row.position,
        ...def.fields.map((f) => row[f.column]),
        row.extra,
    ]);
    const sqlColumns = columns.map((c) => `\`${c}\``).join(', ');
    // Chunked multi-row inserts keep each packet well below max_allowed_packet
    for (let i = 0; i < values.length; i += 200) {
        await conn.query(`INSERT INTO \`${def.table}\` (${sqlColumns}) VALUES ?`, [values.slice(i, i + 200)]);
    }
}

/**
 * Validate a snapshot against the schema without writing (throws StoreValidationError).
 */
export function snapshotToRows(snapshot) {
    const out = {};
    for (const key of LIST_FIELDS) {
        const list = Array.isArray(snapshot[key]) ? snapshot[key] : [];
        const def = ENTITIES[key];
        const seen = new Set();
        out[key] = list.map((obj, i) => {
            const row = toRow(def, obj, i);
            if (seen.has(row.id)) throw new StoreValidationError(`${def.label} bị trùng ID: ${row.id}`);
            seen.add(row.id);
            return row;
        });
    }
    // Goal history lives in its own table, keyed by goal
    out.goalHistory = [];
    (Array.isArray(snapshot.goals) ? snapshot.goals : []).forEach((goal) => {
        const history = Array.isArray(goal?.history) ? goal.history : [];
        const seen = new Set();
        history.forEach((item, i) => {
            const row = toRow(ENTITIES.goalHistory, item, i);
            if (seen.has(row.id)) throw new StoreValidationError(`Lịch sử mục tiêu "${goal.id}" bị trùng ID: ${row.id}`);
            seen.add(row.id);
            row.goal_id = goal.id;
            out.goalHistory.push(row);
        });
    });
    // References between lists (also enforced by foreign keys)
    const walletIds = new Set(out.wallets.map((w) => w.id));
    for (const tx of out.transactions) {
        for (const col of ['wallet_id', 'to_wallet_id']) {
            if (tx[col] !== null && !walletIds.has(tx[col])) {
                throw new StoreValidationError(`Giao dịch ${tx.id} tham chiếu ví không tồn tại`);
            }
        }
        if (tx.type === 'TRANSFER' && (!tx.wallet_id || !tx.to_wallet_id || tx.wallet_id === tx.to_wallet_id)) {
            throw new StoreValidationError(`Giao dịch chuyển khoản ${tx.id} cần ví nguồn và ví đích khác nhau`);
        }
    }
    return out;
}

const DELETE_ORDER = ['goal_history', 'goals', 'transactions', 'budgets', 'bills', 'categories', 'wallets'];

async function replaceEntities(conn, userId, rows) {
    // Children before parents (transactions reference wallets, history references goals)
    for (const table of DELETE_ORDER) {
        await conn.query(`DELETE FROM \`${table}\` WHERE user_id = ?`, [userId]);
    }
    for (const key of ['wallets', 'categories', 'transactions', 'budgets', 'bills', 'goals']) {
        await insertRows(conn, ENTITIES[key], userId, rows[key]);
    }
    await insertRows(conn, ENTITIES.goalHistory, userId, rows.goalHistory, [{ column: 'goal_id' }]);
}

const jsonOrNull = (v) => (isPlainObject(v) || Array.isArray(v) ? JSON.stringify(v) : null);

/**
 * Next sync version: an ISO timestamp strictly greater than the previous one, so two saves in the
 * same millisecond never share a version (the client compares versions for equality).
 */
function nextVersion(previous) {
    let next = Date.now();
    const prev = previous ? Date.parse(previous) : NaN;
    if (Number.isFinite(prev) && next <= prev) next = prev + 1;
    return new Date(next).toISOString();
}

async function readSnapshot(conn, userId, { lock = false } = {}) {
    const [[state]] = await conn.query(
        `SELECT updated_at, current_month, planner, simulator_config, user_profile, pin_enabled, pin_salt, pin_hash
         FROM user_state WHERE user_id = ?${lock ? ' FOR UPDATE' : ''}`,
        [userId],
    );
    if (!state) return null;
    const snapshot = {};
    for (const key of LIST_FIELDS) {
        const def = ENTITIES[key];
        const [rows] = await conn.query(`SELECT * FROM \`${def.table}\` WHERE user_id = ? ORDER BY position`, [userId]);
        snapshot[key] = rows.map((r) => fromRow(def, r));
    }
    const [historyRows] = await conn.query('SELECT * FROM goal_history WHERE user_id = ? ORDER BY goal_id, position', [userId]);
    const historyByGoal = new Map();
    for (const r of historyRows) {
        if (!historyByGoal.has(r.goal_id)) historyByGoal.set(r.goal_id, []);
        historyByGoal.get(r.goal_id).push(fromRow(ENTITIES.goalHistory, r));
    }
    snapshot.goals = snapshot.goals.map((g) => ({ ...g, history: historyByGoal.get(g.id) || [] }));
    const planner = parseJson(state.planner);
    const simulatorConfig = parseJson(state.simulator_config);
    const userProfile = parseJson(state.user_profile);
    if (planner) snapshot.planner = planner;
    if (state.current_month !== null) snapshot.currentMonth = state.current_month;
    if (userProfile) snapshot.userProfile = userProfile;
    if (simulatorConfig) snapshot.simulatorConfig = simulatorConfig;
    snapshot.updatedAt = state.updated_at;
    snapshot.security = {
        pinEnabled: Boolean(state.pin_enabled),
        pinSalt: state.pin_salt || undefined,
        pinHash: state.pin_hash || undefined,
    };
    return snapshot;
}

/** Full snapshot of a user's data, or null when nothing was saved yet */
export async function loadSnapshot(userId) {
    const pool = await getPool();
    return readSnapshot(pool, userId);
}

/**
 * Save a full snapshot atomically.
 * - expectedUpdatedAt: optimistic concurrency. When the stored version differs, nothing is written and
 *   { conflict: true, current } is returned (checked under a row lock, so no lost updates).
 * - force: skip the version check (restore from backup, first-time defaults handled by ensureSnapshot).
 * - security: replace the PIN settings; when omitted the stored PIN settings are kept.
 */
export async function saveSnapshot(userId, snapshot, { expectedUpdatedAt, force = false, security } = {}) {
    const rows = snapshotToRows(snapshot);
    return withTransaction(async (conn) => {
        const [[state]] = await conn.query('SELECT updated_at, pin_enabled, pin_salt, pin_hash FROM user_state WHERE user_id = ? FOR UPDATE', [userId]);
        if (state && !force && expectedUpdatedAt !== state.updated_at) {
            return { conflict: true, current: await readSnapshot(conn, userId) };
        }
        const updatedAt = nextVersion(state?.updated_at);
        const sec = security ?? (state ? { pinEnabled: Boolean(state.pin_enabled), pinSalt: state.pin_salt, pinHash: state.pin_hash } : {});
        const values = [
            updatedAt,
            typeof snapshot.currentMonth === 'string' ? snapshot.currentMonth.slice(0, 20) : null,
            jsonOrNull(snapshot.planner),
            jsonOrNull(snapshot.simulatorConfig),
            jsonOrNull(snapshot.userProfile),
            sec.pinEnabled && sec.pinHash ? 1 : 0,
            sec.pinHash ? sec.pinSalt : null,
            sec.pinHash || null,
        ];
        await conn.query(
            `INSERT INTO user_state (user_id, updated_at, current_month, planner, simulator_config, user_profile, pin_enabled, pin_salt, pin_hash)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE updated_at = VALUES(updated_at), current_month = VALUES(current_month), planner = VALUES(planner),
                simulator_config = VALUES(simulator_config), user_profile = VALUES(user_profile), pin_enabled = VALUES(pin_enabled),
                pin_salt = VALUES(pin_salt), pin_hash = VALUES(pin_hash)`,
            [userId, ...values],
        );
        await replaceEntities(conn, userId, rows);
        return { updatedAt };
    });
}

/**
 * Snapshot of the user, creating it from defaults() the first time. Safe under concurrent first requests.
 */
export async function ensureSnapshot(userId, defaults) {
    const existing = await loadSnapshot(userId);
    if (existing) return existing;
    const result = await saveSnapshot(userId, defaults(), { expectedUpdatedAt: undefined });
    if (result.conflict) return result.current;
    return loadSnapshot(userId);
}

/** Update only the App PIN settings (does not change the sync version) */
export async function setSecurity(userId, { pinEnabled, pinSalt, pinHash }) {
    const pool = await getPool();
    const [res] = await pool.query(
        'UPDATE user_state SET pin_enabled = ?, pin_salt = ?, pin_hash = ? WHERE user_id = ?',
        [pinEnabled && pinHash ? 1 : 0, pinHash ? pinSalt : null, pinHash || null, userId],
    );
    return res.affectedRows === 1;
}

export async function getSecurity(userId) {
    const pool = await getPool();
    const [[row]] = await pool.query('SELECT pin_enabled, pin_salt, pin_hash FROM user_state WHERE user_id = ?', [userId]);
    if (!row) return null;
    return { pinEnabled: Boolean(row.pin_enabled), pinSalt: row.pin_salt || undefined, pinHash: row.pin_hash || undefined };
}

// ---------------------------------------------------------------- users

function userFromRow(r) {
    if (!r) return null;
    return {
        id: r.id,
        username: r.username,
        role: r.role,
        displayName: r.display_name || undefined,
        salt: r.password_salt || '',
        passwordHash: r.password_hash || '',
        hasPassword: Boolean(r.has_password),
        tokenVersion: r.token_version,
        createdAt: r.created_at,
        passwordChangedAt: r.password_changed_at || undefined,
    };
}

export async function getUserById(id) {
    const pool = await getPool();
    const [[row]] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    return userFromRow(row);
}

export async function getUserByUsername(username) {
    const pool = await getPool();
    const [[row]] = await pool.query('SELECT * FROM users WHERE username = ?', [String(username)]);
    return userFromRow(row);
}

export async function getHostUser() {
    const pool = await getPool();
    const [[row]] = await pool.query("SELECT * FROM users WHERE role = 'host'");
    return userFromRow(row);
}

export async function countUsers() {
    const pool = await getPool();
    const [[row]] = await pool.query('SELECT COUNT(*) AS n FROM users');
    return row.n;
}

async function insertUser(conn, user) {
    await conn.query(
        `INSERT INTO users (id, username, role, display_name, password_salt, password_hash, has_password, token_version, created_at, password_changed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            user.id,
            user.username,
            user.role,
            user.displayName ? String(user.displayName).slice(0, 100) : null,
            user.hasPassword ? user.salt : null,
            user.hasPassword ? user.passwordHash : null,
            user.hasPassword ? 1 : 0,
            Math.max(1, Number(user.tokenVersion) || 1),
            user.createdAt || new Date().toISOString(),
            user.passwordChangedAt || null,
        ],
    );
}

/**
 * Create a user together with its first snapshot in one transaction.
 * Returns null when the username (case-insensitive) or the single host slot is already taken.
 */
export async function createUserWithData(user, snapshot) {
    const rows = snapshotToRows(snapshot);
    try {
        return await withTransaction(async (conn) => {
            await insertUser(conn, user);
            await conn.query(
                `INSERT INTO user_state (user_id, updated_at, current_month, planner, simulator_config, user_profile)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    user.id,
                    nextVersion(snapshot.updatedAt),
                    typeof snapshot.currentMonth === 'string' ? snapshot.currentMonth.slice(0, 20) : null,
                    jsonOrNull(snapshot.planner),
                    jsonOrNull(snapshot.simulatorConfig),
                    jsonOrNull(snapshot.userProfile),
                ],
            );
            await replaceEntities(conn, user.id, rows);
            return user;
        });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return null;
        throw err;
    }
}

/** First-time host password: only succeeds while the host still has no password (atomic) */
export async function setHostPasswordIfUnset(userId, salt, hash) {
    const pool = await getPool();
    const [res] = await pool.query(
        `UPDATE users SET password_salt = ?, password_hash = ?, has_password = 1, token_version = token_version + 1,
            password_changed_at = ? WHERE id = ? AND role = 'host' AND has_password = 0`,
        [salt, hash, new Date().toISOString(), userId],
    );
    return res.affectedRows === 1;
}

/**
 * Replace the password and sign out every session (token_version + 1).
 * expectedTokenVersion makes it a compare-and-set: a concurrent change makes this one fail.
 */
export async function changePassword(userId, expectedTokenVersion, salt, hash) {
    const pool = await getPool();
    const [res] = await pool.query(
        `UPDATE users SET password_salt = ?, password_hash = ?, has_password = 1, token_version = token_version + 1,
            password_changed_at = ? WHERE id = ? AND token_version = ?`,
        [salt, hash, new Date().toISOString(), userId, expectedTokenVersion],
    );
    return res.affectedRows === 1;
}

export async function bumpTokenVersion(userId) {
    const pool = await getPool();
    await pool.query('UPDATE users SET token_version = token_version + 1 WHERE id = ?', [userId]);
}

/** Delete a user and everything that belongs to them (explicit order, then the user row) */
export async function deleteUser(userId) {
    return withTransaction(async (conn) => {
        for (const table of DELETE_ORDER) {
            await conn.query(`DELETE FROM \`${table}\` WHERE user_id = ?`, [userId]);
        }
        await conn.query('DELETE FROM secure_backups WHERE user_id = ?', [userId]);
        await conn.query('DELETE FROM user_state WHERE user_id = ?', [userId]);
        const [res] = await conn.query('DELETE FROM users WHERE id = ?', [userId]);
        return res.affectedRows === 1;
    });
}

// ---------------------------------------------------------------- encrypted backups

export const MAX_SECURE_BACKUPS = 20;

/** Store an encrypted backup and keep only the newest MAX_SECURE_BACKUPS for this user */
export async function insertSecureBackup(userId, id, encrypted) {
    const createdAt = new Date().toISOString();
    await withTransaction(async (conn) => {
        await conn.query('INSERT INTO secure_backups (id, user_id, created_at, size, data) VALUES (?, ?, ?, ?, ?)',
            [id, userId, createdAt, encrypted.length, encrypted]);
        const [old] = await conn.query(
            'SELECT id FROM secure_backups WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 18446744073709551615 OFFSET ?',
            [userId, MAX_SECURE_BACKUPS],
        );
        if (old.length) {
            await conn.query('DELETE FROM secure_backups WHERE user_id = ? AND id IN (?)', [userId, old.map((r) => r.id)]);
        }
    });
    return { id, createdAt, size: encrypted.length };
}

export async function listSecureBackups(userId) {
    const pool = await getPool();
    const [rows] = await pool.query(
        'SELECT id, created_at, size FROM secure_backups WHERE user_id = ? ORDER BY created_at DESC, id DESC',
        [userId],
    );
    return rows.map((r) => ({ id: r.id, createdAt: r.created_at, size: r.size }));
}

export async function getSecureBackupData(userId, id) {
    const pool = await getPool();
    const [[row]] = await pool.query('SELECT data FROM secure_backups WHERE user_id = ? AND id = ?', [userId, id]);
    return row ? row.data : null;
}

export async function deleteSecureBackup(userId, id) {
    const pool = await getPool();
    const [res] = await pool.query('DELETE FROM secure_backups WHERE user_id = ? AND id = ?', [userId, id]);
    return res.affectedRows === 1;
}

// ---------------------------------------------------------------- app metadata

export async function getMeta(key) {
    const pool = await getPool();
    const [[row]] = await pool.query('SELECT value FROM app_meta WHERE `key` = ?', [key]);
    return row ? row.value : null;
}

export async function setMeta(key, value) {
    const pool = await getPool();
    await pool.query('INSERT INTO app_meta (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)', [key, String(value)]);
}

// Exposed for the one-time JSON import, which writes many users in a single transaction
export const internal = { insertUser, replaceEntities, snapshotToRows, nextVersion, jsonOrNull };
