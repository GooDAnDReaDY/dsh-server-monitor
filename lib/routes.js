function writeJson(res, statusCode, body) {
  if (typeof res.setHeader === 'function') res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.statusCode = statusCode;
  res.end(JSON.stringify(body));
}

function trustedRequest(req) {
  const headers = req.headers || {};
  const auth = headers.authorization;
  const cookie = headers.cookie;
  const fetchSite = headers['sec-fetch-site'];
  const ip = req.socket?.remoteAddress;
  return (typeof auth === 'string' && auth.startsWith('Bearer '))
    || (typeof cookie === 'string' && (cookie.includes('token=') || cookie.includes('dsh_token=')))
    || fetchSite === 'same-origin'
    || ip === '127.0.0.1'
    || ip === '::1'
    || ip === '::ffff:127.0.0.1';
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let value = '';
    req.on('data', (chunk) => { value += chunk.toString(); });
    req.on('end', () => {
      try { resolve(value ? JSON.parse(value) : {}); } catch (error) { reject(error); }
    });
    req.on('error', reject);
  });
}

function queryValue(req, key) {
  const url = req.url || '';
  const query = url.includes('?') ? url.slice(url.indexOf('?') + 1) : '';
  return new URLSearchParams(query).get(key) || '';
}

export function createRouteHandlers(webServer, store, collector, sshService) {
  const snapshotCache = new Map();
  const snapshotIntervalMs = 15000;

  async function getSnapshot(profile) {
    const now = Date.now();
    const cached = snapshotCache.get(profile.id);
    if (cached?.inFlight) return cached.inFlight;
    if (cached && now - cached.startedAt < snapshotIntervalMs) {
      if (cached.error) throw cached.error;
      return cached.snapshot;
    }

    const entry = { startedAt: now, snapshot: null, error: null, inFlight: null };
    snapshotCache.set(profile.id, entry);
    entry.inFlight = Promise.resolve()
      .then(() => collector.collect(profile))
      .then((snapshot) => { entry.snapshot = snapshot; return snapshot; }, (error) => { entry.error = error; throw error; })
      .finally(() => { entry.inFlight = null; });
    return entry.inFlight;
  }

  const register = (path, method, handler) => webServer.register({
    kind: 'exact',
    path,
    handler: async (req, res) => {
      if (req.method !== method) return writeJson(res, 405, { ok: false, error: method + ' only' });
      try { return await handler(req, res); } catch (error) {
        return writeJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
      }
    }
  });

  register('/dsh-server-monitor/state', 'GET', async (req, res) => {
    if (!trustedRequest(req)) return writeJson(res, 403, { ok: false, error: 'Forbidden' });
    writeJson(res, 200, { ok: true, profiles: store.getProfiles(), activeId: store.getActiveId() || '' });
  });

  register('/dsh-server-monitor/snapshot', 'GET', async (req, res) => {
    if (!trustedRequest(req)) return writeJson(res, 403, { ok: false, error: 'Forbidden' });
    const id = queryValue(req, 'profileId') || store.getActiveId();
    const profile = store.getProfile(id);
    if (!profile) return writeJson(res, 404, { ok: false, error: 'Profile not found' });
    const snapshot = await getSnapshot(profile);
    writeJson(res, 200, { ok: snapshot.status !== 'offline', profileId: id, snapshot });
  });

  register('/dsh-server-monitor/profiles/save', 'POST', async (req, res) => {
    if (!trustedRequest(req)) return writeJson(res, 403, { ok: false, error: 'Forbidden' });
    const saved = await store.saveProfile(await readBody(req));
    snapshotCache.delete(saved.id);
    writeJson(res, 200, { ok: true, profile: saved });
  });

  register('/dsh-server-monitor/profiles/delete', 'POST', async (req, res) => {
    if (!trustedRequest(req)) return writeJson(res, 403, { ok: false, error: 'Forbidden' });
    const body = await readBody(req);
    if (!body.id) return writeJson(res, 400, { ok: false, error: 'Profile id is required' });
    await store.deleteProfile(body.id);
    snapshotCache.delete(body.id);
    writeJson(res, 200, { ok: true });
  });

  register('/dsh-server-monitor/profiles/active', 'POST', async (req, res) => {
    if (!trustedRequest(req)) return writeJson(res, 403, { ok: false, error: 'Forbidden' });
    const body = await readBody(req);
    await store.setActiveId(body.id || '');
    writeJson(res, 200, { ok: true, activeId: store.getActiveId() || '' });
  });

  register('/dsh-server-monitor/keys/generate', 'POST', async (req, res) => {
    if (!trustedRequest(req)) return writeJson(res, 403, { ok: false, error: 'Forbidden' });
    const body = await readBody(req);
    const keyName = body.keyName ? String(body.keyName).replace(/[^a-zA-Z0-9_-]/g, '') : 'id_ed25519_dsh';
    const keyData = sshService.generateAndStoreKey(keyName);
    writeJson(res, 200, { ok: true, ...keyData });
  });

  register('/dsh-server-monitor/test', 'POST', async (req, res) => {
    if (!trustedRequest(req)) return writeJson(res, 403, { ok: false, error: 'Forbidden' });
    const body = await readBody(req);
    const profile = body.id ? store.getProfile(body.id) : body.profile || body;
    if (!profile || !profile.host) return writeJson(res, 400, { ok: false, error: 'Invalid profile' });
    const result = await sshService.testConnection(profile);
    writeJson(res, result.success ? 200 : 502, { ok: result.success, ...result });
  });
}
