import test from 'node:test';
import assert from 'node:assert/strict';
import { isTrustedRequest, isLoopbackAddress, getClientIp, createRouteHandlers } from '../lib/routes.js';

test('http-guard: isLoopbackAddress identifies IPv4 and IPv6 loopback', () => {
  assert.equal(isLoopbackAddress('127.0.0.1'), true);
  assert.equal(isLoopbackAddress('127.0.0.2'), true);
  assert.equal(isLoopbackAddress('::1'), true);
  assert.equal(isLoopbackAddress('::ffff:127.0.0.1'), true);
  assert.equal(isLoopbackAddress('192.168.1.111'), false);
  assert.equal(isLoopbackAddress('10.0.0.5'), false);
  assert.equal(isLoopbackAddress(null), false);
  assert.equal(isLoopbackAddress(''), false);
});

test('http-guard: getClientIp extracts remote address from socket, connection or info', () => {
  assert.equal(getClientIp({ socket: { remoteAddress: '127.0.0.1' } }), '127.0.0.1');
  assert.equal(getClientIp({ connection: { remoteAddress: '10.0.0.1' } }), '10.0.0.1');
  assert.equal(getClientIp({ info: { remoteAddress: '::1' } }), '::1');
  assert.equal(getClientIp({}), '');
});

test('http-guard: rejects request with origin null or empty', () => {
  const reqNull = {
    headers: { host: 'localhost:3080', origin: 'null' },
    socket: { remoteAddress: '127.0.0.1' }
  };
  assert.equal(isTrustedRequest(reqNull), false);

  const reqEmpty = {
    headers: { host: 'localhost:3080', origin: '' },
    socket: { remoteAddress: '127.0.0.1' }
  };
  assert.equal(isTrustedRequest(reqEmpty), false);
});

test('http-guard: rejects request with mismatched origin host', () => {
  const req = {
    headers: { host: 'localhost:3080', origin: 'http://attacker.com' },
    socket: { remoteAddress: '127.0.0.1' }
  };
  assert.equal(isTrustedRequest(req), false);
});

test('http-guard: accepts request with matching origin host', () => {
  const req = {
    headers: { host: 'localhost:3080', origin: 'http://localhost:3080', 'sec-fetch-site': 'same-origin' },
    socket: { remoteAddress: '10.0.0.5' }
  };
  assert.equal(isTrustedRequest(req), true);
});

test('http-guard: rejects request with cross-site sec-fetch-site', () => {
  const req = {
    headers: { host: 'localhost:3080', origin: 'http://localhost:3080', 'sec-fetch-site': 'cross-site' },
    socket: { remoteAddress: '127.0.0.1' }
  };
  assert.equal(isTrustedRequest(req), false);
});

test('http-guard: rejects arbitrary Bearer or cookie tokens from external IP', () => {
  const reqBearer = {
    headers: {
      host: 'localhost:3080',
      authorization: 'Bearer fake-token-123'
    },
    socket: { remoteAddress: '10.0.0.5' }
  };
  assert.equal(isTrustedRequest(reqBearer), false);

  const reqCookie = {
    headers: {
      host: 'localhost:3080',
      cookie: 'token=arbitrary-token; dsh_token=something'
    },
    socket: { remoteAddress: '10.0.0.5' }
  };
  assert.equal(isTrustedRequest(reqCookie), false);
});

test('http-guard: allows non-browser local loopback request without origin', () => {
  const req = {
    headers: { host: 'localhost:3080' },
    socket: { remoteAddress: '127.0.0.1' }
  };
  assert.equal(isTrustedRequest(req), true);
});

test('http-guard: rejects mismatched referer host', () => {
  const req = {
    headers: { host: 'localhost:3080', referer: 'http://evil-site.com/index.html' },
    socket: { remoteAddress: '127.0.0.1' }
  };
  assert.equal(isTrustedRequest(req), false);
});

test('http-guard: /keys/generate route rejects Bearer/cross-origin and accepts matching origin', async () => {
  const registered = new Map();
  const mockSshService = {
    generateAndStoreKey: () => ({ publicKey: 'pubkey', privateKeyPath: '~/.dsh/keys/id', installCommand: 'echo ok' })
  };
  createRouteHandlers({ register: (spec) => registered.set(spec.path, spec.handler) }, {}, {}, mockSshService);
  const handler = registered.get('/dsh-server-monitor/keys/generate');
  assert.ok(handler, 'missing /keys/generate route');

  function makeRes() {
    return {
      statusCode: 0,
      headers: {},
      setHeader(k, v) { this.headers[k] = v; },
      end(payload) { this.body = JSON.parse(payload); }
    };
  }

  // 1. External IP with Bearer token -> 403 Forbidden
  const bearerReq = {
    method: 'POST',
    headers: { host: '192.168.1.111:3080', authorization: 'Bearer fake-secret' },
    socket: { remoteAddress: '192.168.1.55' },
    on(event, cb) { if (event === 'end') cb(); }
  };
  const res1 = makeRes();
  await handler(bearerReq, res1);
  assert.equal(res1.statusCode, 403);
  assert.equal(res1.body.error, 'Forbidden');

  // 2. Cross-origin attacker -> 403 Forbidden
  const crossReq = {
    method: 'POST',
    headers: { host: '192.168.1.111:3080', origin: 'http://attacker.com' },
    socket: { remoteAddress: '127.0.0.1' },
    on(event, cb) { if (event === 'end') cb(); }
  };
  const res2 = makeRes();
  await handler(crossReq, res2);
  assert.equal(res2.statusCode, 403);
  assert.equal(res2.body.error, 'Forbidden');

  // 3. Same-origin request with matching host -> 200 OK
  const validReq = {
    method: 'POST',
    headers: { host: '192.168.1.111:3080', origin: 'http://192.168.1.111:3080', 'sec-fetch-site': 'same-origin' },
    socket: { remoteAddress: '192.168.1.55' },
    on(event, cb) {
      if (event === 'data') cb(JSON.stringify({ keyName: 'test_key' }));
      if (event === 'end') cb();
    }
  };
  const res3 = makeRes();
  await handler(validReq, res3);
  assert.equal(res3.statusCode, 200);
  assert.equal(res3.body.ok, true);
  assert.equal(res3.body.publicKey, 'pubkey');
});