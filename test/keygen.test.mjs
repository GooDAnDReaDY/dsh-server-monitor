import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SshService } from '../lib/ssh-service.js';
import { createRouteHandlers } from '../lib/routes.js';

function response() {
  return { headers: {}, setHeader(key, value) { this.headers[key] = value; }, end(value) { this.body = JSON.parse(value); } };
}
function request(method, body = {}, headers = { 'sec-fetch-site': 'same-origin' }, url = '') {
  const payload = JSON.stringify(body);
  return { method, headers, url, socket: { remoteAddress: '10.0.0.2' }, on(event, handler) { if (event === 'data') handler(payload); if (event === 'end') handler(); } };
}

test('SshService.generateAndStoreKey creates Ed25519 keypair with 0600 permissions and valid install command', (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-keygen-test-'));
  t.after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

  const service = new SshService();
  const keyInfo = service.generateAndStoreKey('id_test_ed25519', tmpDir);

  assert.ok(keyInfo.publicKey.startsWith('ssh-ed25519 AAAAC3NzaC1lZDI1NTE5'), 'publicKey must be OpenSSH format');
  assert.equal(keyInfo.privateKeyPath, path.join(tmpDir, 'id_test_ed25519'));
  assert.ok(keyInfo.installCommand.includes(keyInfo.publicKey), 'installCommand must contain publicKey');
  assert.ok(keyInfo.installCommand.includes('authorized_keys'), 'installCommand must target authorized_keys');
  assert.ok(keyInfo.installCommand.includes('chmod 600 ~/.ssh/authorized_keys'));

  const privateKeyFile = path.join(tmpDir, 'id_test_ed25519');
  const publicKeyFile = path.join(tmpDir, 'id_test_ed25519.pub');
  assert.ok(fs.existsSync(privateKeyFile), 'private key file exists');
  assert.ok(fs.existsSync(publicKeyFile), 'public key file exists');

  const privStat = fs.statSync(privateKeyFile);
  assert.equal(privStat.mode & 0o777, 0o600, 'private key file must have 0600 permissions');

  // Verify that SshService.resolvePrivateKey can read this generated key
  const profileWithKey = { privateKeyPath: privateKeyFile };
  const loadedKey = service.resolvePrivateKey(profileWithKey);
  assert.ok(loadedKey.includes('BEGIN OPENSSH PRIVATE KEY'));
});

test('routes: POST /dsh-server-monitor/keys/generate requires trusted request and returns key data', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-keygen-route-'));
  t.after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

  const service = new SshService();
  // Override home directory for keys to tmpDir to avoid polluting ~/.dsh/keys during unit test
  const originalGenerate = service.generateAndStoreKey.bind(service);
  service.generateAndStoreKey = (keyName) => originalGenerate(keyName, tmpDir);

  const registered = new Map();
  createRouteHandlers({ register: (spec) => registered.set(spec.path, spec.handler) }, {}, {}, service);

  const handler = registered.get('/dsh-server-monitor/keys/generate');
  assert.ok(handler, 'route /dsh-server-monitor/keys/generate must be registered');

  // Untrusted request must be rejected with 403 Forbidden
  const forbiddenRes = response();
  await handler(request('POST', {}, {}), forbiddenRes);
  assert.equal(forbiddenRes.statusCode, 403);
  assert.equal(forbiddenRes.body.error, 'Forbidden');

  // Trusted request returns key data
  const okRes = response();
  await handler(request('POST', { keyName: 'id_ed25519_dsh' }, { 'sec-fetch-site': 'same-origin' }), okRes);
  assert.equal(okRes.statusCode, 200);
  assert.equal(okRes.body.ok, true);
  assert.ok(okRes.body.publicKey.startsWith('ssh-ed25519'));
  assert.ok(okRes.body.installCommand.includes('authorized_keys'));
});
