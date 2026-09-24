import fs from 'node:fs';
import path from 'node:path';
import { profileMetricsRoot } from './profile-metrics.js';

const ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const FIELDS = ['cpu', 'ram', 'disk', 'rx', 'tx'];
const LEVELS = {
  raw: { file: 'raw.jsonl', span: 60_000, keep: 3 * 60 * 60 * 1000, next: 'm1' },
  m1: { file: 'm1.jsonl', span: 15 * 60_000, keep: 24 * 60 * 60 * 1000, next: 'm15' },
  m15: { file: 'm15.jsonl', span: 60 * 60_000, keep: 7 * 24 * 60 * 60 * 1000, next: 'h1' },
  h1: { file: 'h1.jsonl', span: 0, keep: 31 * 24 * 60 * 60 * 1000, next: null }
};


export function monthKey(now = new Date()) {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function accumulateMonth(previous, sample, now = new Date()) {
  const month = monthKey(now);
  const rx = Number(sample?.rx) || 0;
  const tx = Number(sample?.tx) || 0;
  if (!previous || previous.month !== month) return { month, rx: 0, tx: 0, lastRx: rx, lastTx: tx };
  const rxDelta = rx >= Number(previous.lastRx) ? rx - Number(previous.lastRx) : 0;
  const txDelta = tx >= Number(previous.lastTx) ? tx - Number(previous.lastTx) : 0;
  return {
    month,
    rx: Number(previous.rx) + rxDelta,
    tx: Number(previous.tx) + txDelta,
    lastRx: rx,
    lastTx: tx
  };
}

export function sampleFromSnapshot(snapshot, at = Date.now()) {
  const disks = Array.isArray(snapshot?.disks) ? snapshot.disks : [];
  const interfaces = snapshot?.network?.interfaces || [];
  const cores = Number(snapshot?.identity?.cpuCores) || 0;
  const load = Number(snapshot?.system?.loadAverage?.[0] ?? 0);
  const cpu = cores > 0 ? Math.min(100, Math.round((load / cores) * 1000) / 10) : load;
  return {
    t: at,
    cpu,
    ram: Number(snapshot?.system?.memory?.percent ?? 0),
    disk: disks.reduce((max, row) => Math.max(max, Number(row.percent) || 0), 0),
    rx: interfaces.reduce((sum, row) => sum + (Number(row.rxBytes) || 0), 0),
    tx: interfaces.reduce((sum, row) => sum + (Number(row.txBytes) || 0), 0)
  };
}

function readPoints(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split(/\n/).filter(Boolean).map((line) => JSON.parse(line));
}

function writePoints(file, points) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const body = points.map((point) => JSON.stringify(point)).join('\n');
  fs.writeFileSync(file, body ? `${body}\n` : '');
}

function average(points) {
  const first = points[0];
  const result = { t: first.t };
  for (const field of FIELDS) {
    const values = points.map((point) => Number(point[field]) || 0);
    result[field] = Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 1000) / 1000;
  }
  return result;
}

export class MetricStore {
  constructor(rootDir) {
    this.rootDir = rootDir;
    this.lastCompact = new Map();
  }

  directory(profileId) {
    const safe = String(profileId || '');
    if (!ID_PATTERN.test(safe)) return null;
    return path.join(profileMetricsRoot(this.rootDir), safe);
  }

  append(profileId, point, now = Date.now()) {
    const dir = this.directory(profileId);
    if (!dir) return false;
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    fs.appendFileSync(path.join(dir, 'raw.jsonl'), `${JSON.stringify(point)}\n`);
    if (now - (this.lastCompact.get(profileId) || 0) >= 5 * 60_000) this.compact(profileId, now);
    return true;
  }

  compact(profileId, now = Date.now()) {
    const dir = this.directory(profileId);
    if (!dir) return false;
    const levels = {};
    for (const [name, spec] of Object.entries(LEVELS)) {
      levels[name] = readPoints(path.join(dir, spec.file)).filter((point) => now - point.t <= spec.keep);
    }
    for (const [name, spec] of Object.entries(LEVELS)) {
      if (!spec.next || !spec.span) continue;
      const target = levels[spec.next];
      const buckets = new Map();
      for (const point of levels[name]) {
        const bucket = Math.floor(point.t / spec.span) * spec.span;
        if (now < bucket + spec.span) continue;
        if (target.some((item) => Math.floor(item.t / spec.span) * spec.span === bucket)) continue;
        buckets.set(bucket, [...(buckets.get(bucket) || []), point]);
      }
      for (const points of buckets.values()) target.push(average(points));
      target.sort((a, b) => a.t - b.t);
    }
    for (const [name, spec] of Object.entries(LEVELS)) writePoints(path.join(dir, spec.file), levels[name]);
    this.lastCompact.set(profileId, now);
    return true;
  }


  readMonth(profileId) {
    const dir = this.directory(profileId);
    if (!dir) return { month: monthKey(), rx: 0, tx: 0 };
    const file = path.join(dir, 'net-month.json');
    if (!fs.existsSync(file)) return { month: monthKey(), rx: 0, tx: 0 };
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return parsed.month === monthKey() ? parsed : { month: monthKey(), rx: 0, tx: 0, lastRx: 0, lastTx: 0 };
  }

  applyTraffic(profileId, sample, now = new Date()) {
    const dir = this.directory(profileId);
    if (!dir) return null;
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    const file = path.join(dir, 'net-month.json');
    const previous = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
    const next = accumulateMonth(previous, sample, now);
    fs.writeFileSync(file, JSON.stringify(next));
    return next;
  }

  insertHistorical(profileId, points, now = Date.now()) {
    const dir = this.directory(profileId);
    if (!dir || !Array.isArray(points) || !points.length) return 0;
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    const files = {
      raw: readPoints(path.join(dir, 'raw.jsonl')),
      m1: readPoints(path.join(dir, 'm1.jsonl'))
    };
    let added = 0;
    for (const point of points) {
      const level = now - point.t <= LEVELS.raw.keep ? 'raw' : 'm1';
      const span = level === 'raw' ? 60_000 : LEVELS.raw.span;
      const bucket = Math.floor(point.t / span);
      if (files[level].some((item) => Math.floor(item.t / span) === bucket)) continue;
      files[level].push(point);
      added += 1;
    }
    for (const [level, rows] of Object.entries(files)) {
      rows.sort((a, b) => a.t - b.t);
      writePoints(path.join(dir, LEVELS[level].file), rows.filter((point) => now - point.t <= LEVELS[level].keep));
    }
    return added;
  }

  query(profileId, { from = 0, to = Date.now(), field = 'cpu' } = {}) {
    const dir = this.directory(profileId);
    if (!dir || !FIELDS.includes(field)) return { resolution: null, points: [] };
    const span = Math.max(0, Number(to) - Number(from));
    const resolution = span <= LEVELS.raw.keep ? 'raw' : span <= LEVELS.m1.keep ? 'm1' : span <= LEVELS.m15.keep ? 'm15' : 'h1';
    const points = readPoints(path.join(dir, LEVELS[resolution].file))
      .filter((point) => point.t >= Number(from) && point.t <= Number(to))
      .map((point) => ({ t: point.t, value: Number(point[field]) || 0 }));
    return { resolution, points };
  }
}
