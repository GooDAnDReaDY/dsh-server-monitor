import z from '@deepseek-ai/schemastery';
import { randomUUID } from 'node:crypto';
import { normalizeProfile, validateProfile } from './profile.js';
import { VaultService } from './vault-service.js';
import { SshService } from './ssh-service.js';
import { LinuxCollector } from './linux-collector.js';
import { createRouteHandlers } from './routes.js';
import { MetricRecorder, resolvePollIntervalMs } from './metric-recorder.js';
import { MetricStore, sampleFromSnapshot } from './metric-store.js';
import { backfillFromSar } from './sar-backfill.js';
import { registerPluginUpdater } from './plugin-updater.js';
import { createMonitorTools, MONITOR_PROMPT } from './agent-tools.js';
import { registerPty } from './pty-bridge.js';

export const name = '@goodandready/dsh-server-monitor';
const NS = 'dsh-server-monitor';

export const inject = ['tools', 'systemPrompt'];

export const Config = z.object({
  profiles: z.array(z.object({
    id: z.string().default(''),
    name: z.string().default(''),
    host: z.string().default(''),
    port: z.number().default(22),
    username: z.string().default('root'),
    authType: z.string().default('key'),
    privateKeyPath: z.string().default(''),
    networkInterface: z.string().default(''),
    shell: z.string().default('posix'),
    tags: z.array(z.string()).default([]),
    proxyJump: z.string().default('')
  })).default([]),
  activeProfileId: z.string().default(''),
  pollIntervalSec: z.number().default(30)
});

export function apply(ctx, config = {}) {
  const vault = new VaultService();
  const ssh = new SshService(ctx, vault);
  const collector = new LinuxCollector(ssh);
  let settingsApi = null;
  let current = {
    profiles: Array.isArray(config.profiles) ? config.profiles.map(normalizeProfile) : [],
    activeProfileId: config.activeProfileId || ''
  };

  const persist = async () => {
    if (settingsApi?.replace) await settingsApi.replace(Config(current));
  };

  const store = {
    vault,
    getProfiles() {
      return current.profiles.map((profile) => vault.sanitizeProfile(profile));
    },
    getActiveId() {
      return current.activeProfileId;
    },
    getProfile(id) {
      const profile = current.profiles.find((item) => item.id === id);
      return profile ? vault.hydrateProfile(profile) : undefined;
    },
    async saveProfile(input) {
      const body = input && typeof input === 'object' ? input : {};
      const normalized = normalizeProfile({ ...body, id: body.id || randomUUID() });
      validateProfile(normalized);
      vault.setProfileSecrets(normalized.id, {
        password: body.password && body.password !== VaultService.mask ? body.password : undefined,
        privateKey: body.privateKey && body.privateKey !== VaultService.mask ? body.privateKey : undefined,
        passphrase: body.passphrase && body.passphrase !== VaultService.mask ? body.passphrase : undefined
      });
      const index = current.profiles.findIndex((item) => item.id === normalized.id);
      current.profiles = index >= 0
        ? current.profiles.map((item, itemIndex) => itemIndex === index ? normalized : item)
        : [...current.profiles, normalized];
      if (!current.activeProfileId) current.activeProfileId = normalized.id;
      ssh.disconnect(normalized.id);
      await persist();
      return vault.sanitizeProfile(normalized);
    },
    async deleteProfile(id) {
      current.profiles = current.profiles.filter((profile) => profile.id !== id);
      if (current.activeProfileId === id) current.activeProfileId = current.profiles[0]?.id || '';
      vault.deleteProfileSecrets(id);
      ssh.disconnect(id);
      await persist();
    },
    async setActiveId(id) {
      current.activeProfileId = current.profiles.some((profile) => profile.id === id) ? id : '';
      await persist();
    }
  };

  ssh.resolveProfile = (id) => store.getProfile(id);
  let toolsRegistered = false;
  const registerTools = async (tools) => {
    if (toolsRegistered || typeof tools?.register !== 'function') return;
    const { defineTool } = await import('@deepseek-ai/dsh-tools');
    for (const tool of createMonitorTools({ store, ssh, defineTool })) {
      try {
        tools.register(tool);
      } catch (error) {
        if (!/already registered/i.test(String(error?.message || error))) throw error;
        ctx.logger?.warn?.('[' + NS + '] tool already registered', tool.name);
      }
    }
    toolsRegistered = true;
  };
  if (ctx.tools) registerTools(ctx.tools).catch((error) => ctx.logger?.warn?.('[' + NS + '] tool registration failed', error));
  ctx.inject?.(['tools'], (sctx) => {
    const tools = sctx.tools || sctx.get?.('tools');
    registerTools(tools).catch((error) => ctx.logger?.warn?.('[' + NS + '] tool registration failed', error));
  });
  ctx.inject?.(['systemPrompt'], (sctx) => {
    sctx.systemPrompt?.section?.({ name: 'dsh-server-monitor', order: 80, text: MONITOR_PROMPT });
  });
  const metricStore = new MetricStore();
  const recorder = new MetricRecorder({ store, collector, intervalMs: resolvePollIntervalMs(config.pollIntervalSec) });
  const backfilled = new Set();
  recorder.onSample = (profile, snapshot) => {
    const sample = sampleFromSnapshot(snapshot, snapshot.timestamp);
    metricStore.append(profile.id, sample);
    metricStore.applyTraffic(profile.id, sample);
    if (!profile?.id || backfilled.has(profile.id) || snapshot?.status === 'offline') return;
    backfilled.add(profile.id);
    backfillFromSar(ssh, profile).then((points) => metricStore.insertHistorical(profile.id, points)).catch((error) => {
      ctx.logger?.warn?.('[' + NS + '] sar backfill failed', error);
    });
  };
  recorder.start();

  if (typeof ctx.inject === 'function') {
    ctx.inject(['settings'], (sctx) => {
      const settings = sctx.get ? (sctx.get('settings') ?? sctx.settings) : sctx.settings;
      if (!settings?.register) return;
      settingsApi = settings.register(NS, Config, { base: config });
      const snapshot = settingsApi.get?.();
      if (snapshot?.profiles) current.profiles = snapshot.profiles.map(normalizeProfile);
      if (snapshot?.activeProfileId !== undefined) current.activeProfileId = snapshot.activeProfileId;
      sctx.effect?.(() => () => { settingsApi = null; });
    });
    ctx.inject(['webServer'], (sctx) => {
      const server = sctx.get ? (sctx.get('webServer') ?? sctx.webServer) : sctx.webServer;
      if (server?.register) {
        createRouteHandlers(server, store, collector, ssh, recorder, metricStore);
        registerPty(server, { ssh, store });
        registerPluginUpdater(sctx, {
          endpoint: '/dsh-server-monitor/update',
          packageName: name,
          manifestUrl: new URL('../package.json', import.meta.url),
        });
      }
    });
  }

  for (const serviceName of ['serverMonitorSsh', 'serverMonitorCollector']) {
    try {
      ctx.provide?.(serviceName);
    } catch (error) {
      const message = `[${NS}] unable to provide ${serviceName}`;
      if (typeof ctx.logger?.warn === 'function') ctx.logger.warn(message, error);
      else throw new Error(message, { cause: error });
    }
  }
  ctx.serverMonitorSsh = ssh;
  ctx.serverMonitorCollector = collector;
  ctx.on?.('dispose', () => { recorder.stop(); ssh.disconnectAll(); });
}
