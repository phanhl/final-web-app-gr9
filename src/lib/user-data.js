import fs from 'fs/promises';
import path from 'path';
import { getUserDataFilePath, USERS_DIR, LEGACY_DB_FILE } from './auth-server';

/**
 * Data file of a user. The host keeps data/users/admin.json, falling back to the legacy data/database.json.
 */
export async function resolveUserDataFile(user) {
    if (user.role === 'host' || user.id === 'admin') {
        const adminFile = path.join(USERS_DIR, 'admin.json');
        try {
            await fs.access(adminFile);
            return adminFile;
        } catch {
            return LEGACY_DB_FILE;
        }
    }
    return getUserDataFilePath(user.id);
}

/** Security block (PIN hash) stored in the user's data file, or null when unavailable. */
export async function readUserSecurity(user) {
    try {
        const data = JSON.parse(await fs.readFile(await resolveUserDataFile(user), 'utf-8'));
        return data?.security && typeof data.security === 'object' ? data.security : null;
    } catch {
        return null;
    }
}

// Serializes every write to user data files (storage saves, restores, account deletion) so a save that
// started before an account was deleted cannot recreate its file afterwards.
let dataWriteQueue = Promise.resolve();
export function withDataWriteQueue(fn) {
    const run = dataWriteQueue.then(fn, fn);
    dataWriteQueue = run.catch(err => {
        console.error('Data write queue operation error:', err);
    });
    return run;
}

