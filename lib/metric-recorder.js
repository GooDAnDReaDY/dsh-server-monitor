const ALLOWED_INTERVALS_MS = new Set([10_000, 30_000, 60_000, 300_000]);

export function resolvePollIntervalMs(seconds) {
  const ms = Number(seconds) * 1000;
  return ALLOWED_INTERVALS_MS.has(ms) ? ms : 30_000;
}

export class MetricRecorder {
  constructor({ store, collector, intervalMs = 30_000 } = {}) {
    this.store = store;
    this.collector = collector;
    this.intervalMs = intervalMs;
    this.snapshots = new Map();
    this.timer = null;
    this.running = false;
  }

  start() {
    if (this.timer) return;
    this.tick();
    this.timer = setInterval(() => { this.tick(); }, this.intervalMs);
    this.timer.unref?.();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  remember(profileId, snapshot) {
    this.snapshots.set(profileId, { snapshot, at: Date.now() });
  }

  getFreshSnapshot(profileId, now = Date.now()) {
    const entry = this.snapshots.get(profileId);
    if (!entry) return null;
    if (now - entry.at >= this.intervalMs) return null;
    return entry.snapshot;
  }

  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      const profiles = this.store?.getProfiles?.() || [];
      for (const summary of profiles) {
        const profile = this.store.getProfile?.(summary.id) || summary;
        try {
          const snapshot = await this.collector.collect(profile);
          this.remember(profile.id, snapshot);
          this.onSample?.(profile, snapshot);
        } catch (error) {
          this.remember(profile.id, {
            status: 'offline',
            timestamp: Date.now(),
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    } finally {
      this.running = false;
    }
  }
}
