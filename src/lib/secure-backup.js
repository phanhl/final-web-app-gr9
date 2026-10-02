import crypto from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';

const MAGIC = Buffer.from('FTBK');
const VERSION = 1;

const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

let backupKeyCache = null;

function getDataDir() {
    if (process.env.VERCEL) {
        return '/tmp/data';
    }
    return path.join(process.cwd(), 'data');
}

function getBackupKey() {
    const rawKey = process.env.APP_BACKUP_KEY;

    if (rawKey) {
        if (!/^[0-9a-fA-F]{64}$/.test(rawKey)) {
            throw new Error(
                'APP_BACKUP_KEY must be a 64-character hexadecimal string (32 bytes)'
            );
        }
        return Buffer.from(rawKey, 'hex');
    }

    if (backupKeyCache) {
        return backupKeyCache;
    }

    // Auto-generate or read persistent key from data/.backup_key
    const dataDir = getDataDir();
    const keyFile = path.join(dataDir, '.backup_key');
    try {
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        if (fs.existsSync(keyFile)) {
            const saved = fs.readFileSync(keyFile, 'utf8').trim();
            if (/^[0-9a-fA-F]{64}$/.test(saved)) {
                backupKeyCache = Buffer.from(saved, 'hex');
                return backupKeyCache;
            }
        }
        const newKey = crypto.randomBytes(32).toString('hex');
        fs.writeFileSync(keyFile, newKey, { mode: 0o600 });
        backupKeyCache = Buffer.from(newKey, 'hex');
        return backupKeyCache;
    } catch {
        backupKeyCache = crypto.createHash('sha256').update('fintrack_pro_secure_backup_key_2026').digest();
        return backupKeyCache;
    }
}

export function encryptSecureBackup(data) {
    const key = getBackupKey();
    const json = JSON.stringify(data);
    const compressed = gzipSync(Buffer.from(json, 'utf8'), { level: 6 });

    // Fresh random IV for each backup
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const encrypted = Buffer.concat([
        cipher.update(compressed),
        cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return Buffer.concat([
        MAGIC,
        Buffer.from([VERSION, iv.length, authTag.length]),
        iv,
        authTag,
        encrypted,
    ]);
}

export function decryptSecureBackup(buffer) {
    const key = getBackupKey();

    if (!Buffer.isBuffer(buffer)) {
        throw new Error('Backup is not a binary buffer');
    }

    if (buffer.length < 7 || !buffer.subarray(0, 4).equals(MAGIC)) {
        throw new Error('Not a valid FinTrack Secure Backup file');
    }

    const version = buffer[4];
    const ivLength = buffer[5];
    const authTagLength = buffer[6];

    if (version !== VERSION) {
        throw new Error(`Unsupported Secure Backup version: ${version}`);
    }

    if (ivLength !== IV_LENGTH || authTagLength !== AUTH_TAG_LENGTH) {
        throw new Error('Corrupted Secure Backup header');
    }

    const ivStart = 7;
    const ivEnd = ivStart + ivLength;
    const tagStart = ivEnd;
    const tagEnd = tagStart + authTagLength;
    const cipherStart = tagEnd;

    if (buffer.length <= cipherStart) {
        throw new Error('Secure Backup contains no encrypted payload');
    }

    const iv = buffer.subarray(ivStart, ivEnd);
    const authTag = buffer.subarray(tagStart, tagEnd);
    const encrypted = buffer.subarray(cipherStart);

    try {
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);
        const compressed = Buffer.concat([
            decipher.update(encrypted),
            decipher.final(),
        ]);
        const json = gunzipSync(compressed).toString('utf8');
        return JSON.parse(json);
    } catch {
        throw new Error('Failed to decrypt Secure Backup. The file may be corrupted or the encryption key is incorrect.');
    }
}

export function isValidSecureBackupId(id) {
    return (
        typeof id === 'string' &&
        /^backup-\d+-[0-9a-f-]+\.ftbk$/i.test(id)
    );
}
