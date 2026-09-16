export const SNAPSHOT_COMMAND = [
  "printf '__DSH_SECTION__:identity\\n'",
  "hostname 2>/dev/null || true",
  "uname -s 2>/dev/null || true",
  "uname -r 2>/dev/null || true",
  "uname -m 2>/dev/null || true",
  "awk -F: '/^model name/{print $2; exit}' /proc/cpuinfo 2>/dev/null || true",
  "nproc 2>/dev/null || awk '/^processor/{n++} END{print n+0}' /proc/cpuinfo 2>/dev/null || true",
  "printf '__DSH_SECTION__:system\\n'",
  "cat /proc/loadavg 2>/dev/null || true",
  "uptime -p 2>/dev/null || uptime 2>/dev/null || true",
  "free -m 2>/dev/null || true",
  "printf '__DSH_SECTION__:disk\\n'",
  "df -P -k -x tmpfs -x devtmpfs 2>/dev/null || df -P -k 2>/dev/null || true",
  "printf '__DSH_SECTION__:processes\\n'",
  "ps -eo pid=,comm=,pcpu=,pmem=,user= --sort=-pcpu 2>/dev/null | head -n 13 || true",
  "printf '__DSH_SECTION__:containers\\n'",
  "if command -v docker >/dev/null 2>&1; then docker ps --format '{{json .}}' 2>/dev/null || true; elif command -v podman >/dev/null 2>&1; then podman ps --format '{{json .}}' 2>/dev/null || true; fi",
  "printf '__DSH_SECTION__:network\\n'",
  "cat /proc/net/dev 2>/dev/null || true",
  "printf '__DSH_SECTION__:ports\\n'",
  "ss -ltnupH 2>/dev/null || netstat -ltnup 2>/dev/null || true"
].join('; ');

function lines(value) {
  const source = Array.isArray(value) ? value.join('\n') : value;
  return String(source || '').split(/\r?\n/).map((line) => line.trimEnd()).filter((line) => line.trim());
}

function numberOrNull(value) {
  const number = Number.parseFloat(String(value).replace(',', '.'));
  return Number.isFinite(number) ? number : null;
}

function parseSections(text) {
  const result = {};
  let current = null;
  for (const line of String(text || '').split(/\r?\n/)) {
    const match = line.match(/^__DSH_SECTION__:(.+)$/);
    if (match) {
      current = match[1];
      result[current] = [];
    } else if (current) {
      result[current].push(line);
    }
  }
  return result;
}

function parseIdentity(raw) {
  const values = lines(raw);
  return {
    hostname: values[0] || '',
    os: values[1] || '',
    kernel: values[2] || '',
    architecture: values[3] || '',
    cpuModel: values[4] || '',
    cpuCores: Number.parseInt(values[5], 10) || 0
  };
}

function parseMemory(values) {
  const memLine = values.find((line) => /^Mem:\s+/i.test(line));
  const swapLine = values.find((line) => /^Swap:\s+/i.test(line));
  const parse = (line) => {
    if (!line) return { totalMb: 0, usedMb: 0, freeMb: 0, availableMb: 0, percent: 0 };
    const parts = line.trim().split(/\s+/).slice(1).map((item) => Number.parseInt(item, 10) || 0);
    const total = parts[0] || 0;
    const used = parts[1] || 0;
    const free = parts[2] || 0;
    const available = parts[5] || free;
    return { totalMb: total, usedMb: used, freeMb: free, availableMb: available, percent: total ? Math.round(used * 100 / total) : 0 };
  };
  return { memory: parse(memLine), swap: parse(swapLine) };
}

function parseSystem(raw) {
  const values = lines(raw);
  const load = (values[0] || '').split(/\s+/).slice(0, 3).map(numberOrNull).filter((value) => value !== null);
  const uptime = values.find((line) => /^up\b/i.test(line)) || '';
  return { uptime, loadAverage: load, ...parseMemory(values) };
}

function parseDisks(raw) {
  return lines(raw).slice(1).map((line) => {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 6) return null;
    const totalKb = Number.parseInt(parts[1], 10) || 0;
    const usedKb = Number.parseInt(parts[2], 10) || 0;
    const freeKb = Number.parseInt(parts[3], 10) || 0;
    return {
      filesystem: parts[0],
      totalMb: Math.round(totalKb / 1024),
      usedMb: Math.round(usedKb / 1024),
      freeMb: Math.round(freeKb / 1024),
      percent: Number.parseInt(parts[4], 10) || 0,
      mount: parts.slice(5).join(' ')
    };
  }).filter(Boolean);
}

function parseProcesses(raw) {
  return lines(raw).map((line) => {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 5) return null;
    return {
      pid: Number.parseInt(parts[0], 10) || 0,
      command: parts[1],
      cpuPercent: numberOrNull(parts[2]) || 0,
      memoryPercent: numberOrNull(parts[3]) || 0,
      user: parts[4]
    };
  }).filter((item) => item && item.pid);
}

function parseContainers(raw) {
  return lines(raw).map((line) => {
    try {
      const item = JSON.parse(line);
      return {
        id: item.ID || item.Id || '',
        name: item.Names || item.Name || '',
        image: item.Image || '',
        status: item.Status || '',
        state: String(item.State || '').toLowerCase(),
        ports: item.Ports || ''
      };
    } catch {
      return null;
    }
  }).filter((item) => item && (item.id || item.name));
}

function parseNetwork(raw) {
  return lines(raw).filter((line) => line.includes(':')).map((line) => {
    const index = line.indexOf(':');
    const name = line.slice(0, index).trim();
    const values = line.slice(index + 1).trim().split(/\s+/).map((item) => Number.parseInt(item, 10) || 0);
    return { name, rxBytes: values[0] || 0, rxPackets: values[1] || 0, txBytes: values[8] || 0, txPackets: values[9] || 0 };
  }).filter((item) => item.name);
}

function parsePorts(raw) {
  return lines(raw).map((line) => {
    const parts = line.split(/\s+/);
    const local = parts[4] || parts[3] || '';
    const colon = local.lastIndexOf(':');
    const portValue = colon >= 0 ? local.slice(colon + 1) : '';
    return {
      protocol: parts[0] || '',
      address: colon >= 0 ? local.slice(0, colon) : local,
      port: Number.parseInt(portValue, 10) || 0,
      process: parts.slice(6).join(' ')
    };
  }).filter((item) => item.port);
}

export function parseSnapshot(text) {
  const raw = parseSections(text);
  const snapshot = {
    timestamp: Date.now(),
    status: 'error',
    identity: parseIdentity(raw.identity),
    system: parseSystem(raw.system),
    disks: parseDisks(raw.disk),
    processes: parseProcesses(raw.processes),
    containers: parseContainers(raw.containers),
    network: { interfaces: parseNetwork(raw.network) },
    ports: parsePorts(raw.ports)
  };
  const statuses = {
    identity: sectionStatus(snapshot.identity),
    system: sectionStatus(snapshot.system),
    disks: sectionStatus(snapshot.disks),
    processes: sectionStatus(snapshot.processes),
    containers: raw.containers && raw.containers.some((line) => line.trim()) ? sectionStatus(snapshot.containers) : 'unavailable',
    network: sectionStatus(snapshot.network.interfaces),
    ports: sectionStatus(snapshot.ports)
  };
  snapshot.sections = statuses;
  const ready = Object.values(statuses).filter((status) => status === 'ready').length;
  snapshot.status = ready === Object.keys(statuses).length ? 'ready' : (ready > 0 ? 'partial' : 'error');
  return snapshot;
}

export function sectionStatus(value) {
  if (Array.isArray(value)) return value.length ? 'ready' : 'unavailable';
  if (!value || typeof value !== 'object') return 'unavailable';
  if (value.hostname || value.cpuCores || value.uptime || value.memory?.totalMb || value.loadAverage?.length) return 'ready';
  if (value.interfaces && value.interfaces.length) return 'ready';
  return 'unavailable';
}

export class LinuxCollector {
  constructor(sshService, options = {}) {
    this.sshService = sshService;
    this.timeoutSeconds = options.timeoutSeconds || 20;
  }

  async collect(profile) {
    const started = Date.now();
    try {
      const result = await this.sshService.exec(profile, SNAPSHOT_COMMAND, {
        timeout: this.timeoutSeconds,
        cleanAnsi: true,
        maxOutputBytes: 1024 * 1024
      });
      if (!result.stdout) {
        return { status: 'offline', timestamp: Date.now(), latencyMs: Date.now() - started, error: result.stderr || 'No snapshot data' };
      }
      const snapshot = parseSnapshot(result.stdout);
      snapshot.latencyMs = Date.now() - started;
      if (result.code !== 0 && snapshot.status === 'error') {
        snapshot.status = 'offline';
        snapshot.error = result.stderr || 'Remote collector failed';
      }
      return snapshot;
    } catch (error) {
      return {
        status: 'offline',
        timestamp: Date.now(),
        latencyMs: Date.now() - started,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
