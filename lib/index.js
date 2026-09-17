import z from '@deepseek-ai/schemastery';
import { randomUUID } from 'node:crypto';
import { normalizeProfile, validateProfile } from './profile.js';
import { VaultService } from './vault-service.js';
import { SshService } from './ssh-service.js';
import { LinuxCollector } from './linux-collector.js';
import { createRouteHandlers } from './routes.js';

export const name = '@goodandready/dsh-server-monitor';
const NS = 'dsh-server-monitor';

export const inject = ['tools'];

export const Config = z.object({
  profiles: z.array(z.object({
    id: z.string().default(''),
    name: z.string().default(''),
    host: z.string().default(''),
    port: z.number().default(22),
    username: z.string().default('root'),
    authType: z.string().default('key'),
    privateKeyPath: z.string().default('')
  })).default([]),
  activeProfileId: z.string().default('')
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
      if (server?.register) createRouteHandlers(server, store, collector, ssh);
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
  ctx.on?.('dispose', () => ssh.disconnectAll());
}
