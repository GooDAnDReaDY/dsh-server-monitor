import test from 'node:test';
import assert from 'node:assert/strict';
import { isNewerVersion, currentVersion, registerPluginUpdater } from '../lib/plugin-updater.js';

test('plugin-updater: semver comparison isNewerVersion handles core versions and prereleases', () => {
  assert.equal(isNewerVersion('0.1.2', '0.1.3'), true);
  assert.equal(isNewerVersion('0.1.2', '0.1.2'), false);
  assert.equal(isNewerVersion('0.1.3', '0.1.2'), false);
  assert.equal(isNewerVersion('0.1.2', '0.2.0'), true);
  assert.equal(isNewerVersion('0.1.9', '1.0.0'), true);
  assert.equal(isNewerVersion('0.1.0-alpha.1', '0.1.0-alpha.2'), true);
  assert.equal(isNewerVersion('0.1.0-alpha.2', '0.1.0'), true);
  assert.equal(isNewerVersion('invalid', '0.1.0'), false);
});

test('plugin-updater: currentVersion reads version from manifest', async () => {
  const manifestUrl = new URL('../package.json', import.meta.url);
  const version = await currentVersion(manifestUrl);
  assert.match(version, /^\d+\.\d+\.\d+/);
});

test('plugin-updater: registerPluginUpdater registers endpoint and enforces HTTP guard', async () => {
  const registered = new Map();
  const mockWebServer = {
    register(spec) {
      registered.set(spec.path, spec.handler);
      return () => registered.delete(spec.path);
    }
  };

  const cleanup = registerPluginUpdater(mockWebServer, {
    endpoint: '/dsh-server-monitor/update',
    packageName: '@goodandready/dsh-server-monitor',
    manifestUrl: new URL('../package.json', import.meta.url),
  });

  const handler = registered.get('/dsh-server-monitor/update');
  assert.ok(handler, 'endpoint /dsh-server-monitor/update must be registered');

  function makeRes() {
    return {
      statusCode: 0,
      headers: {},
      setHeader(k, v) { this.headers[k] = v; },
      end(payload) { if (payload) this.body = JSON.parse(payload); }
    };
  }

  // 1. GET with loopback address returns update status
  const getReq = {
    method: 'GET',
    headers: { host: 'localhost:3080' },
    socket: { remoteAddress: '127.0.0.1' }
  };
  const getRes = makeRes();
  await handler(getReq, getRes);
  assert.equal(getRes.statusCode, 200);
  assert.equal(getRes.body.packageName, '@goodandready/dsh-server-monitor');
  assert.ok(getRes.body.currentVersion);

  // 2. POST from untrusted external IP without same-origin returns 403 Forbidden
  const untrustedPost = {
    method: 'POST',
    headers: { host: 'localhost:3080' },
    socket: { remoteAddress: '192.168.1.50' }
  };
  const resForbidden = makeRes();
  await handler(untrustedPost, resForbidden);
  assert.equal(resForbidden.statusCode, 403);
  assert.equal(resForbidden.body.error, 'Forbidden');

  cleanup();
  assert.equal(registered.has('/dsh-server-monitor/update'), false);
});