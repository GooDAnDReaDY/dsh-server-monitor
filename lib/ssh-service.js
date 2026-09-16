import { Client } from 'ssh2';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export function stripAnsi(value) {
  if (!value) return '';
  return String(value).replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
}

export class SshService {
  constructor(ctx = null, vaultService = null) {
    this.ctx = ctx;
    this.vaultService = vaultService;
    this.connections = new Map();
  }

  resolvePrivateKey(profile) {
    if (profile.privateKey && String(profile.privateKey).trim()) return profile.privateKey;
    if (!profile.privateKeyPath) return undefined;
    let keyPath = String(profile.privateKeyPath).trim();
    if (keyPath.startsWith('~')) keyPath = path.join(os.homedir(), keyPath.slice(1));
    try {
      return fs.existsSync(keyPath) ? fs.readFileSync(keyPath, 'utf8') : undefined;
    } catch {
      return undefined;
    }
  }

  async getConnection(rawProfile) {
    const profile = this.vaultService ? this.vaultService.hydrateProfile(rawProfile) : rawProfile;
    const id = profile.id;
    const existing = this.connections.get(id);
    if (existing && existing._sock && !existing._sock.destroyed) return existing;
    this.connections.delete(id);

    return new Promise((resolve, reject) => {
      const client = new Client();
      const config = {
        host: profile.host,
        port: profile.port || 22,
        username: profile.username || 'root',
        keepaliveInterval: 15000,
        keepaliveCountMax: 3,
        readyTimeout: 20000
      };
      if (profile.authType === 'password') {
        config.password = profile.password || '';
      } else {
        const privateKey = this.resolvePrivateKey(profile);
        if (privateKey) {
          config.privateKey = privateKey;
          if (profile.passphrase) config.passphrase = profile.passphrase;
        } else if (profile.password) {
          config.password = profile.password;
        } else if (process.env.SSH_AUTH_SOCK) {
          config.agent = process.env.SSH_AUTH_SOCK;
        }
      }
      client.once('ready', () => {
        this.connections.set(id, client);
        resolve(client);
      });
      client.once('error', (error) => {
        this.connections.delete(id);
        reject(error);
      });
      client.once('close', () => this.connections.delete(id));
      client.connect(config);
    });
  }

  async testConnection(profile) {
    const started = Date.now();
    this.disconnect(profile.id);
    const connection = await this.getConnection(profile);
    const result = await this.execWithConnection(connection, 'uname -s -r -m || ver', { timeout: 10 });
    return {
      success: result.code === 0,
      latencyMs: Date.now() - started,
      os: String(result.stdout || '').trim() || 'Unknown',
      error: result.code === 0 ? undefined : String(result.stderr || '').trim()
    };
  }

  async exec(profile, command, options = {}) {
    const connection = await this.getConnection(profile);
    return this.execWithConnection(connection, command, options);
  }

  async execWithConnection(connection, command, options = {}) {
    const timeoutMs = Number(options.timeout || 0) * 1000;
    const maxOutputBytes = Number(options.maxOutputBytes || 1024 * 1024);
    const cleanAnsi = Boolean(options.cleanAnsi);
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      let truncated = false;
      let timer = null;
      const append = (target, chunk) => {
        const next = target + chunk;
        if (Buffer.byteLength(next, 'utf8') <= maxOutputBytes) return next;
        truncated = true;
        return next.slice(0, maxOutputBytes);
      };
      connection.exec(command, (error, stream) => {
        if (error) return reject(error);
        if (timeoutMs > 0) {
          timer = setTimeout(() => {
            try { stream.signal('SIGTERM'); } catch {}
            try { stream.close(); } catch {}
            const timeoutError = new Error('Command timed out');
            timeoutError.code = 'ETIMEDOUT';
            reject(timeoutError);
          }, timeoutMs);
        }
        stream.on('data', (chunk) => { stdout = append(stdout, chunk.toString()); });
        if (stream.stderr) stream.stderr.on('data', (chunk) => { stderr = append(stderr, chunk.toString()); });
        stream.on('close', (code, signal) => {
          if (timer) clearTimeout(timer);
          resolve({
            code: code == null ? 0 : code,
            signal,
            stdout: cleanAnsi ? stripAnsi(stdout) : stdout,
            stderr: cleanAnsi ? stripAnsi(stderr) : stderr,
            truncated
          });
        });
      });
    });
  }

  disconnect(profileId) {
    const connection = this.connections.get(profileId);
    if (!connection) return;
    try { connection.end(); } catch {}
    this.connections.delete(profileId);
  }

  disconnectAll() {
    for (const id of this.connections.keys()) this.disconnect(id);
  }
}
