import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProfile, validateProfile } from '../lib/profile.js';

test('normalizes a valid key profile without secret fields', () => {
  const profile = normalizeProfile({
    id: 'prod-1',
    name: 'Production',
    host: 'server.example',
    port: '22',
    username: 'monitor',
    authType: 'key',
    privateKeyPath: '~/.ssh/id_ed25519',
    password: 'must-not-be-stored-in-profile'
  });

  assert.deepEqual(profile, {
    id: 'prod-1',
    name: 'Production',
    host: 'server.example',
    port: 22,
    username: 'monitor',
    authType: 'key',
    privateKeyPath: '~/.ssh/id_ed25519'
  });
});

test('rejects invalid host and authentication type', () => {
  assert.throws(
    () => validateProfile({ id: 'x', name: 'X', host: '', port: 22, username: 'u', authType: 'key' }),
    /host/i
  );
  assert.throws(
    () => validateProfile({ id: 'x', name: 'X', host: 'h', port: 22, username: 'u', authType: 'token' }),
    /authType/i
  );
});

test('defaults a profile to key authentication and port 22', () => {
  assert.deepEqual(normalizeProfile({ id: 'x', name: 'X', host: 'h', username: 'u' }), {
    id: 'x',
    name: 'X',
    host: 'h',
    port: 22,
    username: 'u',
    authType: 'key',
    privateKeyPath: ''
  });
});
