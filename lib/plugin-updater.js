import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isTrustedRequest } from './routes.js';

const UPDATE_TIMEOUT_MS = 10 * 60_000;
const VERSION_CACHE_MS = 5 * 60_000;
let latestCache = null;

function validProfileName(value) {
  return typeof value === 'string' && value !== '' && value !== '.' && value !== '..'
    && !value.includes('/') && !value.includes('\\') && !/[\0-\x1f\x7f]/.test(value);
}

function profileNameFromArgv(argv) {
  for (let index = 2; index < argv.length; index += 1) {
    if (argv[index] === '--profile') return argv[index + 1];
    if (argv[index]?.startsWith('--profile=')) return argv[index].slice('--profile='.length);
  }
  return argv[2] === 'web' ? 'web' : undefined;
}

function findDshCliEntry() {
  const value = process.argv[1];
  if (value) {
    const entry = value.startsWith('file:') ? fileURLToPath(value) : resolve(process.cwd(), value);
    if (existsSync(entry)) {
      for (let directory = dirname(entry); ; directory = dirname(directory)) {
        const manifestPath = resolve(directory, 'package.json');
        if (existsSync(manifestPath)) {
          try {
            const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
            const bin = typeof manifest.bin === 'string'
              ? manifest.bin
              : typeof manifest.bin === 'object' && manifest.bin !== null
                ? manifest.bin.dsh
                : undefined;
            if (manifest.name === '@deepseek-ai/dsh' && typeof bin === 'string'
              && !isAbsolute(bin) && resolve(directory, bin) === resolve(entry)) return entry;
          } catch {
            // Continue searching parent package directories
          }
        }
        const parent = dirname(directory);
        if (parent === directory) break;
      }
    }
  }

  // Fallback checks for global npm dsh
  const candidate = resolve(homedir(), '.npm-global', 'bin', 'dsh');
  if (existsSync(candidate)) return candidate;

  return undefined;
}

function runtime() {
  const profileDir = resolve(process.env.DSH_PROFILE_DIR
    ?? resolve(homedir(), '.dsh', 'profiles', 'web'));
  const selected = profileNameFromArgv(process.argv);
  const profileName = validProfileName(selected)
    ? selected
    : validProfileName(basename(profileDir)) ? basename(profileDir) : 'web';
  const cliEntry = findDshCliEntry();
  return cliEntry === undefined ? { profileName, profileDir } : { profileName, profileDir, cliEntry };
}

function parseSemver(value) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(value);
  if (match === null) return undefined;
  return {
    core: [Number(match[1]), Number(match[2]), Number(match[3])],
    prerelease: match[4]?.split('.') ?? [],
  };
}

function comparePrerelease(left, right) {
  if (left.length === 0 || right.length === 0) return left.length === right.length ? 0 : left.length === 0 ? 1 : -1;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const a = left[index];
    const b = right[index];
    if (a === undefined || b === undefined) return a === b ? 0 : a === undefined ? -1 : 1;
    if (a === b) continue;
    const aNumeric = /^\d+$/.test(a);
    const bNumeric = /^\d+$/.test(b);
    if (aNumeric && bNumeric) {
      const aNumber = BigInt(a);
      const bNumber = BigInt(b);
      if (aNumber !== bNumber) return aNumber > bNumber ? 1 : -1;
      continue;
    }
    if (aNumeric !== bNumeric) return aNumeric ? -1 : 1;
    return a > b ? 1 : -1;
  }
  return 0;
}

export function isNewerVersion(currentValue, candidateValue) {
  const current = parseSemver(currentValue);
  const candidate = parseSemver(candidateValue);
  if (current === undefined || candidate === undefined) return false;
  for (let index = 0; index < 3; index += 1) {
    if (candidate.core[index] !== current.core[index]) return candidate.core[index] > current.core[index];
  }
  return comparePrerelease(candidate.prerelease, current.prerelease) > 0;
}

export async function latestVersion(packageName, registry = 'https://registry.npmjs.org') {
  if (latestCache?.packageName === packageName && latestCache.registry === registry && Date.now() < latestCache.expiresAt) {
    return latestCache.version;
  }
  try {
    const response = await fetch(`${registry.replace(/\/$/, '')}/${encodeURIComponent(packageName)}/latest`, {
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return undefined;
    const value = await response.json();
    if (typeof value?.version !== 'string' || value.version === '') return undefined;
    latestCache = { packageName, registry, version: value.version, expiresAt: Date.now() + VERSION_CACHE_MS };
    return value.version;
  } catch {
    return undefined;
  }
}

export async function currentVersion(manifestUrl) {
  try {
    const raw = await readFile(manifestUrl, 'utf8');
    const value = JSON.parse(raw);
    if (typeof value?.version !== 'string' || value.version === '') return 'unknown';
    return value.version;
  } catch {
    return 'unknown';
  }
}

export async function getUpdateStatus(options, target) {
  const current = await currentVersion(options.manifestUrl);
  const latest = await latestVersion(options.packageName, options.registry ?? 'https://registry.npmjs.org');
  const validCurrent = current !== 'unknown';
  return {
    ok: true,
    packageName: options.packageName,
    currentVersion: current,
    ...(latest === undefined ? {} : { latestVersion: latest }),
    latestCheckFailed: latest === undefined || !validCurrent,
    updateAvailable: latest !== undefined && validCurrent && isNewerVersion(current, latest),
    profileName: target.profileName,
    canAutoUpdate: target.cliEntry !== undefined,
  };
}

async function installExact(target, packageSpec, options) {
  if (target.cliEntry === undefined) throw new Error('Automatic update is unavailable in this runtime.');
  await new Promise((resolvePromise, reject) => {
    const isJsFile = target.cliEntry.endsWith('.js') || target.cliEntry.endsWith('.mjs');
    const cmd = isJsFile ? process.execPath : target.cliEntry;
    const args = isJsFile
      ? [target.cliEntry, 'plugin', '--profile', target.profileName, 'add', '--config.minimumReleaseAge=0', packageSpec, `--registry=${options.registry ?? 'https://registry.npmjs.org/'}`]
      : ['plugin', '--profile', target.profileName, 'add', '--config.minimumReleaseAge=0', packageSpec, `--registry=${options.registry ?? 'https://registry.npmjs.org/'}`];

    const child = spawn(cmd, args, {
      cwd: target.profileDir,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, NO_COLOR: '1' },
    });
    let detail = '';
    child.stdout?.on('data', (chunk) => { detail = (detail + String(chunk)).slice(-4_000); });
    child.stderr?.on('data', (chunk) => { detail = (detail + String(chunk)).slice(-4_000); });
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('Update timed out; use the normal DSH update flow.'));
    }, UPDATE_TIMEOUT_MS);
    child.once('error', (error) => { clearTimeout(timer); reject(error); });
    child.once('exit', (code) => {
      clearTimeout(timer);
      if (code === 0) resolvePromise();
      else reject(new Error(detail.trim() || `Update exited with code ${String(code)}.`));
    });
  });
}

function writeJson(res, statusCode, body) {
  if (typeof res.setHeader === 'function') res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.statusCode = statusCode;
  res.end(JSON.stringify(body));
}

export function registerPluginUpdater(ctx, options) {
  let installing = false;
  const webServer = ctx?.webServer || ctx;
  if (typeof webServer?.register !== 'function') {
    ctx?.logger?.warn?.('dsh-server-monitor: webServer service unavailable, updater skipped');
    return () => {};
  }
  return webServer.register({
    kind: 'exact',
    path: options.endpoint || '/dsh-server-monitor/update',
    handler: async (request, response) => {
      try {
        if (!isTrustedRequest(request)) {
          writeJson(response, 403, { ok: false, error: 'Forbidden' });
          return;
        }
        const target = runtime();
        if (request.method === 'GET' || request.method === 'HEAD') {
          const payload = await getUpdateStatus(options, target);
          writeJson(response, 200, payload);
          return;
        }
        if (request.method !== 'POST') {
          writeJson(response, 405, { ok: false, error: 'Method Not Allowed' });
          return;
        }
        if (installing) {
          writeJson(response, 409, { ok: false, error: 'This plugin is already updating.' });
          return;
        }
        installing = true;
        try {
          const before = await getUpdateStatus(options, target);
          if (before.latestVersion === undefined) {
            writeJson(response, 503, { ok: false, error: 'The latest version is temporarily unavailable.' });
            return;
          }
          if (!before.updateAvailable) {
            writeJson(response, 200, before);
            return;
          }
          await installExact(target, `${options.packageName}@${before.latestVersion}`, options);
          writeJson(response, 200, {
            ...before,
            ok: true,
            updatedVersion: before.latestVersion,
            restartRequired: true,
          });
        } finally {
          installing = false;
        }
      } catch (error) {
        ctx?.logger?.warn?.(`dsh-server-monitor: plugin updater failed: ${String(error)}`);
        writeJson(response, 503, { ok: false, error: 'Plugin update failed; see server logs.' });
      }
    },
  });
}