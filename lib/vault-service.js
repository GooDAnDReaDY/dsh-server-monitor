import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const MASK = '••••••••';

export class VaultService {
  constructor(customPath = null) {
    this.envPath = customPath || path.join(os.homedir(), '.dsh', 'secrets', 'dsh-server-monitor.env');
    this.ensureEnvFile();
  }

  ensureEnvFile() {
    const parent = path.dirname(this.envPath);
    fs.mkdirSync(parent, { recursive: true, mode: 0o700 });
    if (!fs.existsSync(this.envPath)) {
      fs.writeFileSync(this.envPath, '# DSH Server Monitor secrets\n', { encoding: 'utf8', mode: 0o600 });
    }
    this.secureEnvFile();
  }

  secureEnvFile() {
    try {
      fs.chmodSync(this.envPath, 0o600);
      const mode = fs.statSync(this.envPath).mode & 0o777;
      if (mode !== 0o600) throw new Error('Unexpected permissions');
    } catch {
      throw new Error('Unable to secure credential vault file permissions (expected mode 0600)');
    }
  }

  readAll() {
    this.ensureEnvFile();
    const values = {};
    let currentKey = null;
    let currentValue = '';
    for (const rawLine of fs.readFileSync(this.envPath, 'utf8').split('\n')) {
      if (currentKey) {
        if (rawLine.endsWith('"')) {
          currentValue += rawLine.slice(0, -1);
          values[currentKey] = currentValue.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
          currentKey = null;
          currentValue = '';
        } else {
          currentValue += rawLine + '\n';
        }
        continue;
      }
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const index = rawLine.indexOf('=');
      if (index < 1) continue;
      const key = rawLine.slice(0, index).trim();
      const value = rawLine.slice(index + 1);
      if (value.startsWith('"') && !value.endsWith('"')) {
        currentKey = key;
        currentValue = value.slice(1) + '\n';
      } else if (value.startsWith('"') && value.endsWith('"')) {
        values[key] = value.slice(1, -1).replace(/\\n/g, '\n').replace(/\\r/g, '\r');
      } else {
        values[key] = value;
      }
    }
    return values;
  }

  writeAll(values) {
    this.ensureEnvFile();
    const lines = ['# DSH Server Monitor secrets - generated', ''];
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined || value === null || value === '') continue;
      const text = String(value);
      if (text.includes('\n') || text.includes('"') || text.includes('=')) {
        const escaped = text.replace(/"/g, '\\"').replace(/\r/g, '\\r').replace(/\n/g, '\\n');
        lines.push(key + '="' + escaped + '"');
      } else {
        lines.push(key + '=' + text);
      }
    }
    lines.push('');
    fs.writeFileSync(this.envPath, lines.join('\n'), { encoding: 'utf8', mode: 0o600 });
    this.secureEnvFile();
  }

  keyPrefix(profileId) {
    return 'DSM_' + String(profileId).replace(/[^a-zA-Z0-9_]/g, '_').toUpperCase();
  }

  getProfileSecrets(profileId) {
    if (!profileId) return {};
    const all = this.readAll();
    const prefix = this.keyPrefix(profileId);
    return {
      password: all[prefix + '_PASSWORD'] || '',
      privateKey: all[prefix + '_PRIVATE_KEY'] || '',
      passphrase: all[prefix + '_PASSPHRASE'] || ''
    };
  }

  setProfileSecrets(profileId, secrets = {}) {
    if (!profileId) return;
    const all = this.readAll();
    const prefix = this.keyPrefix(profileId);
    for (const [field, suffix] of [['password', 'PASSWORD'], ['privateKey', 'PRIVATE_KEY'], ['passphrase', 'PASSPHRASE']]) {
      if (secrets[field] === undefined) continue;
      const key = prefix + '_' + suffix;
      if (secrets[field]) all[key] = String(secrets[field]);
      else delete all[key];
    }
    this.writeAll(all);
  }

  deleteProfileSecrets(profileId) {
    const all = this.readAll();
    const prefix = this.keyPrefix(profileId);
    for (const suffix of ['PASSWORD', 'PRIVATE_KEY', 'PASSPHRASE']) delete all[prefix + '_' + suffix];
    this.writeAll(all);
  }

  hydrateProfile(profile) {
    if (!profile || !profile.id) return profile;
    return { ...profile, ...this.getProfileSecrets(profile.id) };
  }

  sanitizeProfile(profile) {
    if (!profile) return profile;
    const secrets = this.getProfileSecrets(profile.id);
    const has = {
      password: Boolean(secrets.password),
      privateKey: Boolean(secrets.privateKey),
      passphrase: Boolean(secrets.passphrase)
    };
    return {
      ...profile,
      password: has.password ? MASK : '',
      privateKey: has.privateKey ? MASK : '',
      passphrase: has.passphrase ? MASK : '',
      hasStoredPassword: has.password,
      hasStoredPrivateKey: has.privateKey,
      hasStoredPassphrase: has.passphrase
    };
  }

  static get mask() {
    return MASK;
  }
}
