import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { WebSocketServer } from 'ws';
import { isTrustedRequest } from './routes.js';

const require = createRequire(import.meta.url);
const sockets = new WebSocketServer({ noServer: true });
const files = {
  '/dsh-server-monitor/vendor/xterm.mjs': ['@xterm/xterm/lib/xterm.mjs', 'text/javascript; charset=utf-8'],
  '/dsh-server-monitor/vendor/xterm.css': ['@xterm/xterm/css/xterm.css', 'text/css; charset=utf-8'],
  '/dsh-server-monitor/vendor/addon-fit.mjs': ['@xterm/addon-fit/lib/addon-fit.mjs', 'text/javascript; charset=utf-8']
};
const cached = new Map();

export function vendorFile(pathname) {
  if (cached.has(pathname)) return cached.get(pathname);
  const spec = files[pathname];
  if (!spec) return null;
  const file = { body: readFileSync(require.resolve(spec[0])), type: spec[1] };
  cached.set(pathname, file);
  return file;
}

export function parsePtyClientMessage(raw) {
  const text = Buffer.isBuffer(raw) ? raw.toString('utf8') : String(raw ?? '');
  if (text.startsWith('{')) {
    try {
      const value = JSON.parse(text);
      if (value?.type === 'resize') {
        const dimension = (raw, fallback, max) => {
          const number = Number(raw);
          if (!Number.isFinite(number)) return fallback;
          return Math.min(max, Math.max(1, Math.round(number)));
        };
        return { type: 'resize', cols: dimension(value.cols, 80, 500), rows: dimension(value.rows, 24, 200) };
      }
    } catch {
      return { type: 'input', data: text };
    }
  }
  return { type: 'input', data: text };
}

export async function bindShell(ws, profile, ssh) {
  const stream = await ssh.openShell(profile, { cols: 80, rows: 24 });
  stream.on('data', (chunk) => {
    if (ws.readyState === 1) ws.send(chunk);
  });
  stream.on('close', () => {
    try { ws.close(); } catch { /* already closed */ }
  });
  ws.on('message', (data) => {
    const message = parsePtyClientMessage(data);
    if (message.type === 'resize') stream.setWindow?.(message.rows, message.cols, 0, 0);
    else stream.write?.(message.data);
  });
  ws.on('close', () => {
    try { stream.end(); } catch { /* already closed */ }
  });
  return stream;
}

export function attachPty(req, socket, head, { ssh, store, upgrade = sockets }) {
  if (!isTrustedRequest(req)) {
    socket.destroy();
    return;
  }
  const profileId = new URL(req.url || '/', 'http://127.0.0.1').searchParams.get('profileId') || '';
  const profile = store.getProfile?.(profileId);
  if (!profile) {
    socket.destroy();
    return;
  }
  upgrade.handleUpgrade(req, socket, head, (ws) => {
    bindShell(ws, profile, ssh).catch(() => {
      try { ws.close(); } catch { /* already closed */ }
    });
  });
}

export function registerPty(webServer, deps) {
  for (const pathname of Object.keys(files)) {
    webServer.register({
      kind: 'exact',
      path: pathname,
      handler(req, res) {
        if (!isTrustedRequest(req)) {
          res.writeHead(403);
          res.end();
          return;
        }
        const file = vendorFile(pathname);
        res.writeHead(200, { 'content-type': file.type, 'cache-control': 'private, max-age=3600' });
        res.end(file.body);
      }
    });
  }
  webServer.registerUpgrade?.({
    path: '/dsh-server-monitor/pty',
    handler: (req, socket, head) => attachPty(req, socket, head, deps)
  });
}

