# Architecture Baseline — dsh-server-monitor

## Goal

Provide a standalone DSH plugin that connects to user-configured Linux hosts over SSH and renders current read-only operational data.

## Boundaries

DSH host:
- plugin settings namespace: dsh-server-monitor
- plugin vault: dsh-server-monitor
- ConnectionPool / SshService
- SnapshotCollector
- API routes
- Browser client with native sidebar.right.pane.tab and optional betterSidebar adapter

Remote Linux host:
- standard read-only commands executed through bounded SSH channels

dsh-remote-workspace is a source of proven implementation patterns only. It is not a runtime dependency and its settings, profiles and vault are not read.

## Configuration

The plugin stores non-secret profile fields in dsh-server-monitor settings. Passwords, private key material and passphrases are stored in a plugin-specific owner-only vault. The browser receives only masked secret presence flags.

## Snapshot contract

Each poll returns:
- server identity: hostname, OS, kernel, architecture, CPU model and core count;
- system: uptime, load average, CPU usage estimate, RAM and swap;
- storage: mounted filesystems with total/used/free/percent;
- processes: capped top entries by CPU and memory;
- containers: Docker or Podman availability and capped container list;
- network: interfaces and traffic counters when available;
- ports: capped listening port list when available;
- metadata: timestamp, latency, overall status and per-section statuses.

Each section may be ready, unavailable or error without invalidating other sections.

## Security

- Commands are fixed templates; user input is validated and never concatenated into shell commands without an allowlist.
- SSH connection timeout, command timeout and output limits are mandatory.
- No remote write command is used by the collector.
- API mutations use same-origin/trusted-request protection.
- Secrets never appear in settings snapshots, API responses, logs, tests or package documentation.

## Risks

- Remote systems may lack optional utilities; every section needs a fallback or explicit unavailable state.
- SSH permissions may prevent Docker/Podman, /proc, ss or journal access.
- A slow host must not block other configured servers.
- Native and legacy sidebar APIs may both be present or absent.

## Success Criteria

- A user can add an independent profile and see a current snapshot.
- One failed host does not block others.
- Plugin works without dsh-remote-workspace.
- All applicable tests pass and the exact candidate is verified on MiniPC.
