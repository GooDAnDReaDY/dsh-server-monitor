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
        try {
          const result = await ssh.exec(profile, command, { timeout, maxOutputBytes: OUTPUT_LIMIT });
          return truncateOutput(`code ${result.code}\n${result.stdout || ''}${result.stderr ? `\n${result.stderr}` : ''}`);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return `Error: ${message}`;
        }
      }
    }),
    defineTool({
      name: 'server_monitor_diagnose',
      description: 'Run targeted system diagnostics for an incident (e.g. disk space alert, high CPU/load, memory exhaustion, or general health check) on a saved host.',
      parameters: {
        profileId: { type: 'string', required: true, description: 'Host id from server_monitor_hosts.' },
        type: { type: 'string', description: 'Diagnostic type: "disk", "cpu", "memory", or "general". Default is "general".' }
      },
      output: toolOutput,
      async execute(args = {}) {
        const profile = store.getProfile(args.profileId);
        if (!profile) return 'Profile not found';
        const type = String(args.type || 'general').trim().toLowerCase();
        try {
          const report = await ssh.diagnoseIncident(profile, type);
          return truncateOutput(report);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return `Error: ${message}`;
        }
      }
    }),
    defineTool({
      name: 'server_monitor_services',
      description: 'List system services or failed services on a saved host.',
      parameters: {
        profileId: { type: 'string', required: true, description: 'Host id from server_monitor_hosts.' },
        failedOnly: { type: 'boolean', description: 'If true, only lists failed services. Default false.' }
      },
      output: toolOutput,
      async execute(args = {}) {
        const profile = store.getProfile(args.profileId);
        if (!profile) return 'Profile not found';
        try {
          const data = await ssh.listServices(profile);
          const list = args.failedOnly ? data.failed : (data.failed.length ? { failed: data.failed, active: data.services } : data.services);
          return truncateOutput(JSON.stringify(list, null, 2));
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return `Error: ${message}`;
        }
      }
    }),
    defineTool({
      name: 'server_monitor_processes',
      description: 'List running processes on a saved host with filtering and sorting by cpu or memory.',
      parameters: {
        profileId: { type: 'string', required: true, description: 'Host id from server_monitor_hosts.' },
        sortBy: { type: 'string', description: 'Sort by "cpu" or "mem". Default is "cpu".' },
        limit: { type: 'number', description: 'Maximum number of processes (1-100, default 30).' }
      },
      output: toolOutput,
      async execute(args = {}) {
        const profile = store.getProfile(args.profileId);
        if (!profile) return 'Profile not found';
        try {
          const list = await ssh.listProcesses(profile, { limit: args.limit || 30, sortBy: args.sortBy || 'cpu' });
          return truncateOutput(JSON.stringify(list, null, 2));
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return `Error: ${message}`;
        }
      }
    }),
    defineTool({
      name: 'server_monitor_kill',
      description: 'Terminate or send a signal to a process by PID on a saved host (PID <= 1 protected).',
      parameters: {
        profileId: { type: 'string', required: true, description: 'Host id from server_monitor_hosts.' },
        pid: { type: 'number', required: true, description: 'Process PID to terminate (must be > 1).' },
        signal: { type: 'string', description: 'Signal name (e.g. "TERM", "KILL", "HUP"). Default is "TERM".' }
      },
      output: toolOutput,
      async execute(args = {}) {
        const profile = store.getProfile(args.profileId);
        if (!profile) return 'Profile not found';
        const pid = Number.parseInt(args.pid, 10);
        if (!Number.isInteger(pid) || pid <= 1) return 'Error: Invalid or protected PID';
        try {
          const result = await ssh.killProcess(profile, pid, args.signal || 'TERM');
          return truncateOutput(`Process ${pid} signal ${result.signal} [code ${result.code}]:\n${result.output || 'OK'}`);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return `Error: ${message}`;
        }
      }
    }),
    defineTool({
      name: 'server_monitor_service',
      description: 'Check status or manage a system service (status, start, stop, restart) on a saved host.',
      parameters: {
        profileId: { type: 'string', required: true, description: 'Host id from server_monitor_hosts.' },
        service: { type: 'string', required: true, description: 'Service unit name, e.g. "nginx", "docker", "sshd".' },
        action: { type: 'string', description: 'Action: "status", "start", "stop", or "restart". Default is "status".' }
      },
      output: toolOutput,
      async execute(args = {}) {
        const profile = store.getProfile(args.profileId);
        if (!profile) return 'Profile not found';
        const action = String(args.action || 'status').trim().toLowerCase();
        const service = String(args.service || '').trim();
        if (!service) return 'Service name is required';
        try {
          const result = await ssh.manageService(profile, service, action);
          return truncateOutput(`Service ${service} ${action} [code ${result.code}]:
${result.output || 'OK'}`);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return `Error: ${message}`;
        }
      }
    })
  ];
}

export const MONITOR_PROMPT = 'Server Monitor lists saved hosts with server_monitor_hosts, runs diagnostic commands with server_monitor_exec, and runs targeted incident diagnostics with server_monitor_diagnose. The host list never includes passwords or private keys. Set timeout between 1 and 300 seconds.';
