import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { withTransaction } from './db';
import { internal, countUsers, getMeta, setMeta } from './store';
import { normalizeSnapshotNumbers, validatePayload } from './storage-validation';
import { recomputeWalletBalances } from './utils';

/**
 * One-time import of the former JSON storage into MySQL:
 *   data/users.json                      accounts
 *   data/users/<id>.json                 each user's data (host: admin.json, or the older data/database.json)
 *   data/secure-backups/*.ftbk           host's encrypted backups
 *   data/users/<id>/secure-backups/*     guests' encrypted backups
 *
 * Everything is written in ONE transaction: if any account fails validation nothing is imported, the JSON
 * files stay where they are and the error explains what to fix. After a successful import the JSON files are
 * moved (not deleted) to data/legacy-json-<timestamp>/ so they are kept as a backup.
 */
const META_KEY = 'legacy_json_import';
const BACKUP_ID = /^backup-\d+-[0-9a-f-]+\.ftbk$/i;

async function readJson(file) {
    try {
        return JSON.parse(await fs.readFile(file, 'utf-8'));
    } catch (err) {
        if (err.code === 'ENOENT') return undefined;
        throw new Error(`Không đọc được ${path.basename(file)}: ${err.message}`);
    }
}

async function exists(file) {
    return fs.access(file).then(() => true, () => false);
}

function safeId(id) {
    return String(id).replace(/[^a-zA-Z0-9_-]/g, '');
}

// Legacy PINs were stored in plaintext ("pinCode"): hash them on the way in
function legacySecurity(sec) {
    const s = sec && typeof sec === 'object' ? sec : {};
    let { pinSalt, pinHash } = s;
    if (!pinHash && s.pinCode) {
        pinSalt = crypto.randomBytes(16).toString('hex');
        pinHash = crypto.scryptSync(String(s.pinCode), pinSalt, 32).toString('hex');
    }
    return { pinEnabled: Boolean(s.pinEnabled) && Boolean(pinHash), pinSalt: pinHash ? pinSalt : null, pinHash: pinHash || null };
}

async function readBackups(dir) {
    const names = await fs.readdir(dir).catch(() => []);
    const out = [];
    for (const name of names) {
        if (!BACKUP_ID.test(name)) continue;
        const file = path.join(dir, name);
        const stat = await fs.stat(file).catch(() => null);
        if (!stat?.isFile()) continue;
        out.push({ id: name, createdAt: (stat.birthtimeMs ? stat.birthtime : stat.mtime).toISOString(), data: await fs.readFile(file) });
    }
    return out;
}

/**
 * Import if there is JSON data and it was not imported yet. Returns a short report (or null when nothing to do).
 */
export async function importLegacyJsonIfNeeded(dataDir, { defaultUserData }) {
    if (await getMeta(META_KEY)) return null;

    const usersFile = path.join(dataDir, 'users.json');
    const legacyDb = path.join(dataDir, 'database.json');
    let users = await readJson(usersFile);
    const legacyHostData = await readJson(legacyDb);
    if (users === undefined && legacyHostData === undefined) {
        await setMeta(META_KEY, JSON.stringify({ at: new Date().toISOString(), users: 0, note: 'no JSON data found' }));
        return null;
    }
    if ((await countUsers()) > 0) {
        // The database is already in use: never mix an old JSON copy into it
        console.warn('[FinTrack] JSON data found in data/ but the database already has accounts: JSON import skipped.');
        await setMeta(META_KEY, JSON.stringify({ at: new Date().toISOString(), skipped: 'database not empty' }));
        return null;
    }
    if (users !== undefined && !Array.isArray(users)) throw new Error('data/users.json không phải là danh sách tài khoản');
    // Very old single-user installs only had data/database.json
    if (!users) users = [{ id: 'admin', username: 'admin', role: 'host', hasPassword: false, createdAt: new Date().toISOString() }];

    const prepared = [];
    for (const u of users) {
        if (!u || typeof u.id !== 'string' || typeof u.username !== 'string') {
            throw new Error('data/users.json có tài khoản thiếu id hoặc username');
        }
        const isHost = u.role === 'host' || u.id === 'admin';
        const dataFile = isHost ? path.join(dataDir, 'users', 'admin.json') : path.join(dataDir, 'users', `${safeId(u.id)}.json`);
        let data = await readJson(dataFile);
        if (data === undefined && isHost) data = legacyHostData;
        if (data === undefined) data = defaultUserData(u.displayName || u.username);

        const snapshot = normalizeSnapshotNumbers({ ...defaultUserData(u.displayName || u.username), ...data });
        snapshot.wallets = recomputeWalletBalances(snapshot.wallets || [], snapshot.transactions || []);
        const problem = validatePayload(snapshot);
        if (problem) throw new Error(`Dữ liệu của tài khoản "${u.username}" không hợp lệ: ${problem}`);
        const rows = internal.snapshotToRows(snapshot); // schema checks (throws with a clear message)

        const backupsDir = isHost ? path.join(dataDir, 'secure-backups') : path.join(dataDir, 'users', safeId(u.id), 'secure-backups');
        prepared.push({
            user: {
                id: u.id,
                username: u.username,
                role: isHost ? 'host' : 'guest',
                displayName: u.displayName,
                hasPassword: Boolean(u.hasPassword && u.salt && u.passwordHash),
                salt: u.salt,
                passwordHash: u.passwordHash,
                tokenVersion: u.tokenVersion || 1,
                createdAt: u.createdAt,
                passwordChangedAt: u.passwordChangedAt,
            },
            snapshot,
            rows,
            security: legacySecurity(data.security),
            backups: await readBackups(backupsDir),
        });
    }

    await withTransaction(async (conn) => {
        for (const p of prepared) {
            await internal.insertUser(conn, p.user);
            await conn.query(
                `INSERT INTO user_state (user_id, updated_at, current_month, planner, simulator_config, user_profile, pin_enabled, pin_salt, pin_hash)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    p.user.id,
                    typeof p.snapshot.updatedAt === 'string' && p.snapshot.updatedAt.length <= 40 ? p.snapshot.updatedAt : internal.nextVersion(),
                    typeof p.snapshot.currentMonth === 'string' ? p.snapshot.currentMonth.slice(0, 20) : null,
                    internal.jsonOrNull(p.snapshot.planner),
                    internal.jsonOrNull(p.snapshot.simulatorConfig),
                    internal.jsonOrNull(p.snapshot.userProfile),
                    p.security.pinEnabled ? 1 : 0,
                    p.security.pinSalt,
                    p.security.pinHash,
                ],
            );
            await internal.replaceEntities(conn, p.user.id, p.rows);
            for (const b of p.backups) {
                await conn.query('INSERT INTO secure_backups (id, user_id, created_at, size, data) VALUES (?, ?, ?, ?, ?)',
                    [b.id, p.user.id, b.createdAt, b.data.length, b.data]);
            }
        }
        await conn.query('INSERT INTO app_meta (`key`, value) VALUES (?, ?)', [META_KEY, JSON.stringify({
            at: new Date().toISOString(),
            users: prepared.length,
            transactions: prepared.reduce((n, p) => n + p.rows.transactions.length, 0),
            backups: prepared.reduce((n, p) => n + p.backups.length, 0),
        })]);
    });

    // Keep the JSON files as a backup, out of the way of the app
    const archive = path.join(dataDir, `legacy-json-${new Date().toISOString().replace(/[:.]/g, '-')}`);
    await fs.mkdir(archive, { recursive: true, mode: 0o700 });
    for (const name of ['users.json', 'users', 'database.json', 'secure-backups']) {
        const from = path.join(dataDir, name);
        if (await exists(from)) await fs.rename(from, path.join(archive, name));
    }
    const report = `${prepared.length} tài khoản, ${prepared.reduce((n, p) => n + p.rows.transactions.length, 0)} giao dịch, ${prepared.reduce((n, p) => n + p.backups.length, 0)} bản sao lưu`;
    console.log(`[FinTrack] Đã chuyển dữ liệu JSON sang MySQL: ${report}. File JSON cũ được giữ trong ${path.basename(archive)}/`);
    return report;
}
