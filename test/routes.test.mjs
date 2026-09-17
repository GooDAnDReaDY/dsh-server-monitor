import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRouteHandlers } from '../lib/routes.js';
import { VaultService } from '../lib/vault-service.js';

function response() {
  return { headers: {}, setHeader(key, value) { this.headers[key] = value; }, end(value) { this.body = JSON.parse(value); } };
}
function request(method, body = {}, headers = { 'sec-fetch-site': 'same-origin' }, url = '') {
  const payload = JSON.stringify(body);
  return { method, headers, url, socket: { remoteAddress: '10.0.0.2' }, on(event, handler) { if (event === 'data') handler(payload); if (event === 'end') handler(); } };
}
function setup(options) {
  const { store, collector } = options;
  const sshService = options.sshService || { testConnection: async () => ({ success: true, latencyMs: 1, os: 'Linux' }) };
  const registered = new Map();
  createRouteHandlers({ register: (spec) => registered.set(spec.path, spec.handler) }, store, collector, sshService);
  return registered;
}
const profile = { id: 'p1', host: 'host', name: 'Host' };

function storeDefaults(overrides = {}) {
  return {
    getProfiles: () => [{ ...profile }], getActiveId: () => 'p1', getProfile: () => ({ ...profile }),
    saveProfile: async (value) => ({ ...profile, ...value }), deleteProfile: async () => {}, setActiveId: async () => {},
    ...overrides
  };
}

test('registers state, snapshot and protected profile routes', () => {
  const routes = setup({ store: storeDefaults(), collector: { collect: async () => ({ status: 'ready' }) } });
  for (const route of ['state', 'snapshot', 'profiles/save', 'profiles/delete', 'profiles/active', 'test']) {
    assert.ok(routes.has(`/dsh-server-monitor/${route}`), `missing ${route} route`);
  }
});

test('rejects untrusted state and snapshot reads without touching profile data or SSH', async () => {
  let reads = 0;
  let collections = 0;
  const store = storeDefaults({ getProfiles() { reads++; return []; }, getProfile() { reads++; return profile; } });
  const routes = setup({ store, collector: { async collect() { collections++; return { status: 'ready' }; } } });
  for (const route of ['state', 'snapshot']) {
    const res = response();
    await routes.get(`/dsh-server-monitor/${route}`)(request('GET', {}, {}), res);
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.error, 'Forbidden');
  }
  assert.equal(reads, 0);
  assert.equal(collections, 0);
});

test('returns a snapshot and rejects untrusted writes', async () => {
  const routes = setup({ store: storeDefaults(), collector: { collect: async () => ({ status: 'ready', identity: { hostname: 'host' } }) } });
  const snapshotResponse = response();
  await routes.get('/dsh-server-monitor/snapshot')(request('GET'), snapshotResponse);
  assert.equal(snapshotResponse.body.snapshot.identity.hostname, 'host');
  const forbidden = response();
  await routes.get('/dsh-server-monitor/profiles/delete')(request('POST', { id: 'p1' }, {}), forbidden);
  assert.equal(forbidden.statusCode, 403);
});

test('shares in-flight collection and serves the latest snapshot for 15 seconds', async () => {
  let calls = 0;
  let release;
  const routes = setup({
    store: storeDefaults(),
    collector: { collect() { calls++; return new Promise((resolve) => { release = resolve; }); } }
  });
  const handler = routes.get('/dsh-server-monitor/snapshot');
  const firstRes = response();
  const secondRes = response();
  const first = handler(request('GET'), firstRes);
  const second = handler(request('GET'), secondRes);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls, 1);
  release({ status: 'ready', identity: { hostname: 'host' } });
  await Promise.all([first, second]);
  const thirdRes = response();
  await handler(request('GET'), thirdRes);
  assert.equal(calls, 1);
  assert.equal(thirdRes.body.snapshot.identity.hostname, 'host');
});

test('caches collector failures for the same 15-second interval', async () => {
  let calls = 0;
  const routes = setup({ store: storeDefaults(), collector: { async collect() { calls++; throw new Error('collector unavailable'); } } });
  for (let i = 0; i < 2; i++) {
    const res = response();
    await routes.get('/dsh-server-monitor/snapshot')(request('GET'), res);
    assert.equal(res.statusCode, 500);
    assert.match(res.body.error, /collector unavailable/);
  }
  assert.equal(calls, 1);
});

test('profile save invalidates cache and delete removes its cached profile snapshot', async () => {
  let current = { ...profile };
  let calls = 0;
  const store = storeDefaults({
    getProfile: () => current,
    async saveProfile(value) { current = { ...current, ...value }; return current; },
    async deleteProfile() { current = undefined; }
  });
  const routes = setup({ store, collector: { async collect() { calls++; return { status: 'ready', sequence: calls }; } } });
  const getSnapshot = routes.get('/dsh-server-monitor/snapshot');
  await getSnapshot(request('GET'), response());
  const saved = response();
  await routes.get('/dsh-server-monitor/profiles/save')(request('POST', { name: 'Updated' }), saved);
  assert.equal(saved.statusCode, 200);
  const updated = response();
  await getSnapshot(request('GET'), updated);
  assert.equal(updated.body.snapshot.sequence, 2);
  const deleted = response();
  await routes.get('/dsh-server-monitor/profiles/delete')(request('POST', { id: 'p1' }), deleted);
  assert.equal(deleted.statusCode, 200);
  const missing = response();
  await getSnapshot(request('GET'), missing);
  assert.equal(missing.statusCode, 404);
  assert.equal(calls, 2);
});

test('state and snapshot responses never contain stored credential material', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-server-monitor-routes-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const vault = new VaultService(path.join(dir, 'secrets.env'));
  const secrets = { password: 'test-password-value', privateKey: 'test-private-key-material', passphrase: 'test-passphrase-value' };
  vault.setProfileSecrets('p1', secrets);
  const routes = setup({
    store: storeDefaults({ getProfiles: () => [vault.sanitizeProfile(profile)], getProfile: () => vault.hydrateProfile(profile) }),
    collector: { async collect(internalProfile) { assert.equal(internalProfile.password, secrets.password); return { status: 'ready', identity: { hostname: 'host' } }; } }
  });
  const state = response();
  await routes.get('/dsh-server-monitor/state')(request('GET'), state);
  const snapshot = response();
  await routes.get('/dsh-server-monitor/snapshot')(request('GET'), snapshot);
  for (const value of [state.body, snapshot.body]) {
    const serialized = JSON.stringify(value);
    for (const secret of Object.values(secrets)) assert.equal(serialized.includes(secret), false);
  }
  assert.equal(state.body.profiles[0].password, VaultService.mask);
  assert.equal(state.body.profiles[0].hasStoredPrivateKey, true);
});

test('enforces the 15-second collection interval independently for each profile', async (t) => {
  let now = 1000;
  t.mock.method(Date, 'now', () => now);
  let calls = 0;
  const routes = setup({
    store: storeDefaults({ getProfile: (id) => ({ ...profile, id }) }),
    collector: { async collect() { calls++; return { status: 'ready', sequence: calls }; } }
  });
  const handler = routes.get('/dsh-server-monitor/snapshot');
  const read = (id) => handler(request('GET', {}, { 'sec-fetch-site': 'same-origin' }, `?profileId=${id}`), response());
  await read('p1');
  await read('p1');
  assert.equal(calls, 1);
  await read('p2');
  assert.equal(calls, 2);
  now = 15999;
  await read('p1');
  assert.equal(calls, 2);
  now = 16000;
  await read('p1');
  assert.equal(calls, 3);
  await read('p2');
  assert.equal(calls, 4);
});
