import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function expandHome(value, home) {
  const text = String(value || '').trim().replace(/^["']|["']$/g, '');
  if (text.startsWith('~/')) return path.join(home, text.slice(2));
  if (text === '~') return home;
  return text;
}

function blankHost(name, defaults) {
  return {
    name,
    host: name,
    port: 22,
    username: defaults.username || '',
    privateKeyPath: defaults.privateKeyPath || '',
    proxyJump: defaults.proxyJump || ''
  };
}

export function parseSshConfig(text, home = os.homedir()) {
  const defaults = { username: '', privateKeyPath: '', proxyJump: '' };
  const hosts = [];
  let targets = null;
  for (const rawLine of String(text || '').split(/\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;
    const parts = line.split(/\s+/);
    const key = parts[0].toLowerCase();
    const value = parts.slice(1).join(' ');
    if (key === 'host') {
      const tokens = parts.slice(1);
      const concrete = tokens.filter((token) => token && !/[*?]/.test(token));
      targets = concrete.length ? concrete.map((token) => blankHost(token, defaults)) : [defaults];
      if (concrete.length) hosts.push(...targets);
      continue;
    }
    if (!targets) continue;
    for (const target of targets) {
      if (key === 'hostname' && target !== defaults) target.host = value;
      else if (key === 'user') target.username = value;
      else if (key === 'port' && target !== defaults) target.port = Number(value) || 22;
      else if (key === 'identityfile') target.privateKeyPath = expandHome(value, home);
      else if (key === 'proxyjump') target.proxyJump = value.split(',')[0].trim();
    }
  }
  return hosts.filter((item) => item.host && item.username !== 'git' && !/(^|\.)github\.com$/i.test(item.host) && !/[*?]/.test(item.host));
}

export function readSshConfig(filePath = path.join(os.homedir(), '.ssh', 'config')) {
  if (!fs.existsSync(filePath)) return [];
  return parseSshConfig(fs.readFileSync(filePath, 'utf8'));
}
