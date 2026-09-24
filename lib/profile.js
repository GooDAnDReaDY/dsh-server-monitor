const AUTH_TYPES = new Set(['key', 'password']);

export function normalizeProfile(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  return {
    id: String(source.id || '').trim(),
    name: String(source.name || source.host || '').trim(),
    host: String(source.host || '').trim(),
    port: Number(source.port || 22),
    username: String(source.username || 'root').trim(),
    authType: source.authType === undefined || source.authType === null || source.authType === '' ? 'key' : String(source.authType).trim(),
    privateKeyPath: String(source.privateKeyPath || '').trim(),
    networkInterface: String(source.networkInterface || '').trim(),
    shell: source.shell === 'powershell' ? 'powershell' : 'posix',
    tags: (Array.isArray(source.tags) ? source.tags : String(source.tags || '').split(',')).map((item) => String(item).trim()).filter(Boolean),
    proxyJump: String(source.proxyJump || '').trim()
  };
}

export function validateProfile(profile) {
  const normalized = normalizeProfile(profile);
  if (!normalized.id) throw new Error('Profile id is required');
  if (!normalized.name) throw new Error('Profile name is required');
  if (!normalized.host) throw new Error('Profile host is required');
  if (!Number.isInteger(normalized.port) || normalized.port < 1 || normalized.port > 65535) {
    throw new Error('Profile port must be between 1 and 65535');
  }
  if (!normalized.username) throw new Error('Profile username is required');
  if (!AUTH_TYPES.has(normalized.authType)) throw new Error('Unsupported authType');
  return normalized;
}
