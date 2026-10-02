#!/usr/bin/env node
/**
 * Reset an account password from the server machine (there is no e-mail based recovery).
 *
 *   npm run reset-password -- <username>
 *   NEW_PASSWORD='...' npm run reset-password -- <username>   (non-interactive)
 *
 * Signs the account out on every device (tokenVersion bump). Run it while the app is stopped
 * or idle: it rewrites data/users.json directly.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline';

const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');

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
        process.exit(1);
    }

    let users;
    try {
        users = JSON.parse(await fs.readFile(USERS_FILE, 'utf-8'));
    } catch (err) {
        console.error(`Cannot read ${USERS_FILE}: ${err.message}`);
        process.exit(1);
    }
    const user = users.find(u => String(u.username).toLowerCase() === username);
    if (!user) {
        console.error(`User "${username}" not found. Existing users: ${users.map(u => u.username).join(', ')}`);
        process.exit(1);
    }

    let password = process.env.NEW_PASSWORD;
    if (!password) {
        password = await askHidden(`New password for ${user.username}: `);
        const confirm = await askHidden('Confirm new password: ');
        if (password !== confirm) {
            console.error('Passwords do not match.');
            process.exit(1);
        }
    }
    if (password.length < 8 || password.length > 256) {
        console.error('Password must be 8-256 characters.');
        process.exit(1);
    }

    // Same scheme as src/lib/auth-server.js hashPassword()
    const salt = crypto.randomBytes(16).toString('hex');
    user.salt = salt;
    user.passwordHash = crypto.scryptSync(password, salt, 32).toString('hex');
    user.hasPassword = true;
    user.tokenVersion = (user.tokenVersion || 1) + 1;
    user.passwordChangedAt = new Date().toISOString();

    const tmp = `${USERS_FILE}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(users, null, 2), { encoding: 'utf-8', mode: 0o600 });
    await fs.rename(tmp, USERS_FILE);
    if (user.role === 'host') {
        await fs.unlink(path.join(process.cwd(), 'data', '.host_setup_code')).catch(() => {});
    }
    console.log(`Password for "${user.username}" has been reset. All existing sessions were signed out.`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
