import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { VaultService } from '../lib/vault-service.js';

function tempVault() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-server-monitor-')), 'secrets.env');
}

test('stores and hydrates secrets while sanitizing browser output', () => {
  const vault = new VaultService(tempVault());
  const profile = { id: 'p1', host: 'host', password: '', privateKeyPath: '' };

  vault.setProfileSecrets('p1', {
    password: 'secret',
    privateKey: 'PRIVATE KEY',
    passphrase: 'phrase'
  });

  assert.deepEqual(vault.hydrateProfile(profile), {
    ...profile,
    password: 'secret',
    privateKey: 'PRIVATE KEY',
    passphrase: 'phrase'
  });

  const sanitized = vault.sanitizeProfile(profile);
  assert.equal(sanitized.password, '••••••••');
  assert.equal(sanitized.privateKey, '••••••••');
  assert.equal(sanitized.passphrase, '••••••••');
  assert.equal(sanitized.hasStoredPassword, true);
  assert.equal(sanitized.hasStoredPrivateKey, true);
  assert.equal(sanitized.hasStoredPassphrase, true);
  assert.equal(JSON.stringify(sanitized).includes('secret'), false);
});

test('creates an owner-only vault file', () => {
  const file = tempVault();
  const vault = new VaultService(file);
  vault.setProfileSecrets('p1', { password: 'secret' });
  assert.equal(fs.statSync(file).mode & 0o777, 0o600);
});
