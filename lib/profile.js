const AUTH_TYPES = new Set(['key', 'password']);
export const ID_PATTERN = /^[A-Za-z0-9_-]+$/;

export function sanitizeProfileId(rawId) {
  const text = String(rawId || '').trim();
  if (ID_PATTERN.test(text)) return text;
  return text.replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
}

export function normalizeProfile(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const rawId = String(source.id || '').trim();
  const id = rawId ? sanitizeProfileId(rawId) : '';
  return {
    id,
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
  if (!ID_PATTERN.test(normalized.id)) throw new Error('Profile id may only contain letters, numbers, hyphens and underscores');
  if (!normalized.name) throw new Error('Profile name is required');
  if (!normalized.host) throw new Error('Profile host is required');
  if (!Number.isInteger(normalized.port) || normalized.port < 1 || normalized.port > 65535) {
    throw new Error('Profile port must be between 1 and 65535');
  }
  if (!normalized.username) throw new Error('Profile username is required');
  if (!AUTH_TYPES.has(normalized.authType)) throw new Error('Unsupported authType');
  return normalized;
}
