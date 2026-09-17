import test from 'node:test';
import assert from 'node:assert/strict';
import { SshService, stripAnsi } from '../lib/ssh-service.js';

test('strips terminal ANSI sequences and resolves bounded command output', async () => {
  assert.equal(stripAnsi('\u001b[31mred\u001b[0m'), 'red');
  const service = new SshService();
  const connection = {
    exec(_command, callback) {
      const stream = {
        stderr: { on(_event, handler) { handler(Buffer.from('warn')); } },
        on(event, handler) {
          if (event === 'data') handler(Buffer.from('\u001b[32mhello\u001b[0m'));
          if (event === 'close') queueMicrotask(() => handler(0, null));
        },
        signal() {},
        close() {}
      };
      callback(null, stream);
    }
  };
  const result = await service.execWithConnection(connection, 'printf hello', { cleanAnsi: true, maxOutputBytes: 100 });
  assert.deepEqual(result, { code: 0, signal: null, stdout: 'hello', stderr: 'warn', truncated: false });
});

test('truncates oversized remote output without throwing', async () => {
  const service = new SshService();
  const connection = { exec(_command, callback) {
    const stream = { stderr: { on() {} }, on(event, handler) { if (event === 'data') handler(Buffer.from('123456789')); if (event === 'close') queueMicrotask(() => handler(0)); }, signal() {}, close() {} };
    callback(null, stream);
  } };
  const result = await service.execWithConnection(connection, 'large', { maxOutputBytes: 4 });
  assert.equal(result.stdout, '1234');
  assert.equal(result.truncated, true);
});

test('best-effort SSH cleanup logs close failures without interrupting teardown', () => {
  const logged = [];
  const service = new SshService({ logger: { debug: (...args) => logged.push(args) } });
  assert.doesNotThrow(() => service.bestEffort('close connection', () => { throw new Error('socket closed'); }));
  assert.equal(logged.length, 1);
  assert.match(logged[0][0], /close connection/);
});
