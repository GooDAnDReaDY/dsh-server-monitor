import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ID_PATTERN = /^[A-Za-z0-9_-]+$/;

export function profileMetricsRoot(rootDir) {
  return rootDir || path.join(os.homedir(), '.dsh', 'server-monitor-metrics');
}

export function removeProfileMetrics(profileId, rootDir) {
  const safe = String(profileId || '');
  if (!ID_PATTERN.test(safe)) return false;
  fs.rmSync(path.join(profileMetricsRoot(rootDir), safe), { recursive: true, force: true });
  return true;
}
