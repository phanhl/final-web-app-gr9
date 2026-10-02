#!/usr/bin/env node
/**
 * Reset an account password from the server machine (there is no e-mail based recovery).
 *
 *   npm run reset-password -- <username>
 *   NEW_PASSWORD='...' npm run reset-password -- <username>   (non-interactive)
 *
 * Signs the account out on every device (token_version + 1). Safe while the app is running.
 */
import './env.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline';
import { query, closePool } from '../src/lib/db.js';

function askHidden(question) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
        rl.stdoutMuted = false;
        rl._writeToOutput = function (str) {
            if (rl.stdoutMuted && !str.includes(question)) return;
            rl.output.write(str);
        };
        rl.question(question, (answer) => {
            rl.close();
            process.stdout.write('\n');
            resolve(answer);
        });
        rl.stdoutMuted = true;
    });
}

async function main() {
    const username = String(process.argv[2] || '').trim().toLowerCase();
    if (!username) {
        console.error('Usage: npm run reset-password -- <username>');
        process.exitCode = 1;
        return;
    }
    const [user] = await query('SELECT id, username, role FROM users WHERE username = ?', [username]);
    if (!user) {
        const all = await query('SELECT username FROM users ORDER BY username');
        console.error(`User "${username}" not found. Existing users: ${all.map((u) => u.username).join(', ')}`);
        process.exitCode = 1;
        return;
    }

    let password = process.env.NEW_PASSWORD;
    if (!password) {
        password = await askHidden(`New password for ${user.username}: `);
        const confirm = await askHidden('Confirm new password: ');
        if (password !== confirm) {
            console.error('Passwords do not match.');
            process.exitCode = 1;
            return;
        }
    }
    if (password.length < 8 || password.length > 256) {
        console.error('Password must be 8-256 characters.');
        process.exitCode = 1;
        return;
    }

    // Same scheme as src/lib/auth-server.js hashPassword()
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 32).toString('hex');
    await query(
        `UPDATE users SET password_salt = ?, password_hash = ?, has_password = 1, token_version = token_version + 1,
            password_changed_at = ? WHERE id = ?`,
        [salt, hash, new Date().toISOString(), user.id],
    );
    if (user.role === 'host') {
        await fs.unlink(path.join(process.cwd(), 'data', '.host_setup_code')).catch(() => {});
    }
    console.log(`Password for "${user.username}" has been reset. All existing sessions were signed out.`);
}

main()
    .catch((err) => {
        console.error(err.code === 'ECONNREFUSED' ? 'Cannot reach MySQL: check DATABASE_URL / that the database is running.' : err);
        process.exitCode = 1;
    })
    .finally(() => closePool());
