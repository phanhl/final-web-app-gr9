import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.APP_BACKUP_KEY = crypto.randomBytes(32).toString('hex');
const { encryptSecureBackup, decryptSecureBackup, isValidSecureBackupId } = await import('../src/lib/secure-backup.js');

test('encrypt/decrypt round trip', () => {
    const data = { wallets: [{ id: 'w1', name: 'Ví tiền mặt' }], transactions: [] };
    const buf = encryptSecureBackup(data);
    assert.equal(buf.subarray(0, 4).toString(), 'FTBK');
    assert.ok(!buf.includes(Buffer.from('Ví tiền mặt')), 'plaintext must not appear in the backup');
    assert.deepEqual(decryptSecureBackup(buf), data);
});

test('tampered backups are rejected (AES-GCM auth tag)', () => {
    const buf = encryptSecureBackup({ a: 1 });
    buf[buf.length - 1] ^= 0xff;
    assert.throws(() => decryptSecureBackup(buf), /decrypt/i);
});

test('rejects foreign files', () => {
    assert.throws(() => decryptSecureBackup(Buffer.from('hello world')), /valid/i);
});

test('backup ids cannot be used for path traversal', () => {
    assert.ok(isValidSecureBackupId('backup-1727850000000-0f8e2c1a-1111-4222-8333-944445555666.ftbk'));
    assert.ok(!isValidSecureBackupId('../users.json'));
    assert.ok(!isValidSecureBackupId('backup-1-abc.ftbk/../../x'));
});
