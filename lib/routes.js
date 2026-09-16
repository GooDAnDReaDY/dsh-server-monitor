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

  register('/dsh-server-monitor/state', 'GET', async (_req, res) => {
    writeJson(res, 200, { ok: true, profiles: store.getProfiles(), activeId: store.getActiveId() || '' });
  });

  register('/dsh-server-monitor/snapshot', 'GET', async (req, res) => {
    const id = queryValue(req, 'profileId') || store.getActiveId();
    const profile = store.getProfile(id);
    if (!profile) return writeJson(res, 404, { ok: false, error: 'Profile not found' });
    const snapshot = await collector.collect(profile);
    writeJson(res, 200, { ok: snapshot.status !== 'offline', profileId: id, snapshot });
  });

  register('/dsh-server-monitor/profiles/save', 'POST', async (req, res) => {
    if (!trustedRequest(req)) return writeJson(res, 403, { ok: false, error: 'Forbidden' });
    const saved = await store.saveProfile(await readBody(req));
    writeJson(res, 200, { ok: true, profile: saved });
  });

  register('/dsh-server-monitor/profiles/delete', 'POST', async (req, res) => {
    if (!trustedRequest(req)) return writeJson(res, 403, { ok: false, error: 'Forbidden' });
    const body = await readBody(req);
    if (!body.id) return writeJson(res, 400, { ok: false, error: 'Profile id is required' });
    await store.deleteProfile(body.id);
    writeJson(res, 200, { ok: true });
  });

  register('/dsh-server-monitor/profiles/active', 'POST', async (req, res) => {
    if (!trustedRequest(req)) return writeJson(res, 403, { ok: false, error: 'Forbidden' });
    const body = await readBody(req);
    await store.setActiveId(body.id || '');
    writeJson(res, 200, { ok: true, activeId: store.getActiveId() || '' });
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
