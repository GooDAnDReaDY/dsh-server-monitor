const CPU_LINE = /^(\d{2}):(\d{2}):(\d{2})\s*(AM|PM)?\s+all\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/;
const RAM_LINE = /^(\d{2}):(\d{2}):(\d{2})\s*(AM|PM)?\s+(.*)$/;

function stamp(header, hour, minute, second, meridiem, now) {
  const match = String(header || '').match(/(\d{2})\/(\d{2})\/(\d{2,4})/);
  const base = match
    ? new Date(Date.UTC(Number(match[3].length === 2 ? `20${match[3]}` : match[3]), Number(match[1]) - 1, Number(match[2])))
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  let hours = Number(hour);
  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  const at = Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), hours, Number(minute), Number(second));
  return at > now.getTime() ? at - 24 * 60 * 60 * 1000 : at;
}

export function parseSar(cpuText, ramText, now = new Date()) {
  const cpu = new Map();
  for (const line of String(cpuText || '').split(/\n/)) {
    const match = line.trim().match(CPU_LINE);
    if (!match || line.includes('Average')) continue;
    const idle = Number(match[10]);
    cpu.set(stamp(cpuText, match[1], match[2], match[3], match[4], now), Math.max(0, Math.round((100 - idle) * 10) / 10));
  }
  const ramHeader = String(ramText || '').split(/\n/).find((line) => line.includes('%memused'));
  const headerTokens = ramHeader ? ramHeader.trim().split(/\s+/) : [];
  const usedIndex = headerTokens.indexOf('%memused');
  const prefix = headerTokens.findIndex((token) => token.startsWith('kb') || token.startsWith('%'));
  const ram = new Map();
  if (usedIndex >= 0 && prefix >= 0) {
    for (const line of String(ramText || '').split(/\n/)) {
      const match = line.trim().match(RAM_LINE);
      if (!match || line.includes('Average') || line.includes('%memused')) continue;
      const values = match[5].trim().split(/\s+/);
      const used = Number(values[usedIndex - prefix]);
      if (!Number.isFinite(used)) continue;
      ram.set(stamp(ramText, match[1], match[2], match[3], match[4], now), used);
    }
  }
  return [...new Set([...cpu.keys(), ...ram.keys()])].sort((a, b) => a - b).map((t) => ({
    t, cpu: cpu.get(t) || 0, ram: ram.get(t) || 0, disk: 0, rx: 0, tx: 0
  }));
}

export async function backfillFromSar(sshService, profile) {
  const result = await sshService.exec(profile, "LC_ALL=C sar -u 2>/dev/null; printf '\\n__DSH_SAR__\\n'; LC_ALL=C sar -r 2>/dev/null", { timeout: 20 });
  const stdout = String(result?.stdout || '');
  if (!stdout.includes('__DSH_SAR__') || /command not found/.test(String(result?.stderr || ''))) return [];
  const [cpu, ram] = stdout.split('__DSH_SAR__');
  return parseSar(cpu, ram);
}
