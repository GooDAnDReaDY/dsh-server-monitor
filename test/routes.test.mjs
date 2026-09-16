import test from 'node:test';
import assert from 'node:assert/strict';
import { createRouteHandlers } from '../lib/routes.js';

function response() {
  return { headers: {}, setHeader(key, value) { this.headers[key] = value; }, end(value) { this.body = JSON.parse(value); } };
}
function request(method, body = {}, headers = { 'sec-fetch-site': 'same-origin' }) {
  const payload = JSON.stringify(body);
  return { method, headers, url: '', socket: { remoteAddress: '10.0.0.2' }, on(event, handler) { if (event === 'data') handler(payload); if (event === 'end') handler(); } };
}

test('registers read-only state, snapshot and protected profile routes', () => {
  const registered = new Map();
  const store = { getProfiles: () => [{ id: 'p1', host: 'host', name: 'Host' }], getActiveId: () => 'p1', saveProfile: async () => {}, deleteProfile: async () => {}, getProfile: () => ({ id: 'p1', host: 'host' }) };
  const collector = { collect: async () => ({ status: 'ready', identity: { hostname: 'host' } }) };
  createRouteHandlers({ register: (spec) => registered.set(spec.path, spec.handler) }, store, collector, { testConnection: async () => ({ success: true, latencyMs: 1, os: 'Linux' }) });
  assert.ok(registered.has('/dsh-server-monitor/state'));
  assert.ok(registered.has('/dsh-server-monitor/snapshot'));
  assert.ok(registered.has('/dsh-server-monitor/profiles/save'));
  assert.ok(registered.has('/dsh-server-monitor/profiles/delete'));
  assert.ok(registered.has('/dsh-server-monitor/test'));
});

test('returns snapshot and rejects untrusted writes', async () => {
  const registered = new Map();
  const store = { getProfiles: () => [], getActiveId: () => 'p1', getProfile: () => ({ id: 'p1', host: 'host' }), saveProfile: async () => {}, deleteProfile: async () => {}, setActiveId: async () => {} };
  const collector = { collect: async () => ({ status: 'ready', identity: { hostname: 'host' } }) };
  createRouteHandlers({ register: (spec) => registered.set(spec.path, spec.handler) }, store, collector, { testConnection: async () => ({ success: true }) });
  const snapshotResponse = response();
  await registered.get('/dsh-server-monitor/snapshot')(request('GET'), snapshotResponse);
  assert.equal(snapshotResponse.body.snapshot.identity.hostname, 'host');
  const forbidden = response();
  await registered.get('/dsh-server-monitor/profiles/delete')(request('POST', { id: 'p1' }, {}), forbidden);
  assert.equal(forbidden.statusCode, 403);
});
