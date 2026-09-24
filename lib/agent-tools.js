const OUTPUT_LIMIT = 8000;

export function clampTimeout(value) {
  const timeout = Number(value);
  if (!Number.isFinite(timeout)) return 20;
  return Math.min(300, Math.max(1, Math.round(timeout)));
}

export function publicHost(profile, status = {}) {
  return {
    id: profile.id,
    name: profile.name,
    host: profile.host,
    port: profile.port,
    username: profile.username,
    tags: profile.tags || [],
    proxyJump: profile.proxyJump || '',
    latencyMs: status.latencyMs ?? null,
    lastError: status.lastError || ''
  };
}

export function truncateOutput(value) {
  const text = String(value || '');
  if (text.length <= OUTPUT_LIMIT) return text;
  return `${text.slice(0, OUTPUT_LIMIT)}\n[truncated]`;
}

const renderToolText = (_args, value) => [{ type: 'text', text: String(value ?? '') }];
const toolOutput = { schema: { type: 'string' }, render: renderToolText };

export function createMonitorTools({ store, ssh, defineTool = (tool) => tool }) {
  return [
    defineTool({
      name: 'server_monitor_hosts',
      description: 'List saved Server Monitor hosts. Secrets are omitted. Filter with an optional tag.',
      parameters: {
        tag: { type: 'string', description: 'Only hosts that include this tag.' }
      },
      output: toolOutput,
      async execute(args = {}) {
        const tag = String(args.tag || '').trim();
        const hosts = store.getProfiles().map((profile) => publicHost(profile, ssh.getHostStatus?.(profile.id))).filter((profile) => !tag || profile.tags.includes(tag));
        return JSON.stringify(hosts);
      }
    }),
    defineTool({
      name: 'server_monitor_exec',
      description: 'Run one non-interactive command on a saved host. Timeout is 1 to 300 seconds. Output is truncated.',
      parameters: {
        profileId: { type: 'string', required: true, description: 'Host id from server_monitor_hosts.' },
        command: { type: 'string', required: true, description: 'Non-interactive command.' },
        timeout: { type: 'integer', description: 'Seconds, from 1 to 300. Default 20.' }
      },
      output: toolOutput,
      async execute(args = {}) {
        const command = String(args.command || '').trim();
        if (!command) return 'Command is required';
        const profile = store.getProfile(args.profileId);
        if (!profile) return 'Profile not found';
        const timeout = clampTimeout(args.timeout);
        const result = await ssh.exec(profile, command, { timeout, maxOutputBytes: OUTPUT_LIMIT });
        return truncateOutput(`code ${result.code}\n${result.stdout || ''}${result.stderr ? `\n${result.stderr}` : ''}`);
      }
    })
  ];
}

export const MONITOR_PROMPT = 'Server Monitor lists saved hosts with server_monitor_hosts and runs one non-interactive diagnostic command with server_monitor_exec. The host list never includes passwords or private keys. Set timeout between 1 and 300 seconds.';
