# Changelog

## [0.1.14] - 2026-09-30

### Fixed
- **DSH 0.2.0-rc.1 Settings Contract** (#72):
  - Added `.volatile()` flags to user-editable leaves: `profiles` array, `activeProfileId`, `pollIntervalSec` in `Config` schema, ensuring DSH `volatileForm()` discovers and serves the settings form live while keeping secrets out of the volatile schema.
  - Added `configForms` to client inject (`['slots', 'locale', 'configForms']`).
  - Wired `SettingsCard` to live snapshot and subscription via `ctx.configForms.get('dsh-server-monitor')` with fallback to `/state`.
  - Gated plugin slots inside `ctx.configForms.whileServed(['dsh-server-monitor'], ...)`.
  - Retired dead `settings.plugin.item` slot and replaced legacy `settings.register` with `settings.configure({ auto: false })` and `loader/volatile-update` / `settings/document-updated` event sync.

## [0.1.12] - 2026-09-30

### Added
- **AI Incident Doctor** (#83): Added `server_monitor_diagnose` agent tool and `diagnoseIncident(profile, type)` in `lib/ssh-service.js`. Provides targeted diagnostic recipes for `disk`, `cpu`/`load`, `memory`/`ram`, and system summary to investigate incidents in a single non-interactive step.
- **Systemd Services Management** (#84): Added `listServices(profile)` and `manageService(profile, service, action)` in `lib/ssh-service.js`, REST routes `/dsh-server-monitor/services` and `/dsh-server-monitor/services/action`, agent tools `server_monitor_services` and `server_monitor_service`, and interactive services section in dashboard displaying active/failed units with one-click restart.
- **Process Explorer & Safe Process Termination** (#85): Added `listProcesses(profile, { limit, sortBy })` and `killProcess(profile, pid, signal)` in `lib/ssh-service.js`, REST endpoints `/dsh-server-monitor/processes` and `/dsh-server-monitor/processes/kill`, agent tools `server_monitor_processes` and `server_monitor_kill`, and termination buttons in dashboard with PID <= 1 kernel protection.

## 0.1.10

### Fixed
- **Peer gate on DSH 0.2.0-rc.1** (#58): DSH skips a profile bundle whose `peerDependencies` exclude the running version, so this plugin was absent from the profile with no error in the UI. Every `@deepseek-ai/dsh-*` peer now names both the 0.1.7-rc.2 and 0.2.0-rc.1 lines, because semver does not admit a prerelease of the next minor into a range that does not name it.

All notable changes to `@goodandready/dsh-server-monitor` are recorded here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.9]

### Fixed
- **SSH Stream & WebSocket Error Handling**: Added explicit `'error'` event listeners on SSH channel streams and WebSockets in `bindShell` to prevent Node.js `uncaughtException` crashes when connections are interrupted or dropped (#73).
- **Corrupted Metric Store Resilience**: Wrapped JSON parsing of `.jsonl` points, aggregate files, and monthly bandwidth data in `try/catch` handlers to prevent persistent 500 errors and crash loops from corrupted or truncated metric files (#74).
- **Concurrent Polling & Disk Error Isolation**: `MetricRecorder.tick()` now polls remote servers concurrently using `Promise.allSettled()`, avoiding poll interval delays caused by unreachable servers, and separates local disk write errors from server online status (#75).
- **Agent Tool Exception Handling**: `server_monitor_exec` agent tool now catches SSH execution errors and returns structured error descriptions to LLM agents rather than causing unhandled promise rejections (#76).
- **Terminal UI Clean Lifecycle & Error Feedback**: Added `data-dsh-plugin` attributes to injected terminal styles/links and attached `onerror`/`onclose` handlers to the browser terminal WebSocket for clear visual feedback (#77).
- **Profile ID Character Sanitization**: Enforced alphanumeric and hyphen/underscore safe ID pattern (`/^[A-Za-z0-9_-]+$/`) across `profile.js` and `MetricStore`, automatically sanitizing imported hostnames containing dots or colons (#78).

## [0.1.8]

### Fixed
- **Plugin lifecycle route cleanup**: HTTP routes, PTY WebSocket upgrade handlers, and updater endpoints are now registered as effect-owned disposers (`sctx.effect(...)` and `sctx.on('dispose', ...)`). Disposing the plugin cleanly unregisters all endpoints from `webServer` and terminates active PTY WebSocket connections, preventing route and port collisions on plugin reload or configuration re-apply (#70).

## [0.1.7]

### Added
- SSH profiles for Linux, macOS, BSD, and Windows OpenSSH. A POSIX probe falls back to PowerShell once when the remote host has no usable `sh`.
- Tags and text search for the server list.
- A jump host: one saved profile can connect through another saved profile. A cycle is rejected.
- Import of concrete hosts from the local SSH config. Wildcard and git hosts are skipped.
- Sparklines for the last hour and stored history for CPU, memory, disk, and network. A one-time `sar` backfill runs when `sar` is installed.
- Month traffic from positive counter deltas. A reboot does not subtract.
- A Terminal button that opens one interactive SSH session in the browser. The session is accepted only from loopback.
- Agent tools that list saved hosts and run one bounded command. Host listings omit passwords and private keys.

### Fixed
- The plugin settings page keeps its own SSH-import state, so opening the plugin no longer throws a missing-state error.
- The terminal socket dependency is the patched `ws` release.

### Changed
- Background probes stay read-only. The terminal is an explicit interactive session.
- CPU history is a percent of the core count when the core count is known.

## [0.1.6]

### Fixed
- **UI profile selection retention**: use `useRef` to track active server profile across polling intervals, eliminating race conditions where background timer reset dropdown selection back to default (#30).
- **Redundant polling requests**: background 15s timer now polls only `/snapshot` instead of issuing sequential `/state` and `/snapshot` requests (#30).
- **Manual refresh cache bypass**: clicking "Refresh" in the monitor UI passes `force=1` to bypass the 15-second cache and trigger an immediate fresh metrics collection (#35).
- **Request body size enforcement**: `readBody` now strictly limits incoming payload size to `256 KB` (`MAX_BODY_BYTES`), returning HTTP 413 Payload Too Large on excess to prevent heap exhaustion and OOM DoS (#31).
- **SSH connection handshake race condition**: concurrent calls to `SshService.getConnection` for the same profile now coalesce onto a single in-flight connection promise, preventing duplicate TCP sockets and socket leaks (#33).

### Added
- **SSH connection idle reaper**: cached SSH connections now automatically disconnect after 2 minutes (`120_000 ms`) of inactivity, freeing remote sshd sessions and avoiding persistent background TCP keepalives when the monitor is closed (#34).

### Performance
- **Vault credential caching**: `VaultService.readAll` now caches parsed credentials in memory with write-through invalidation, eliminating redundant synchronous `chmodSync`, `statSync`, and `readFileSync` calls during profile listing (#32).
- **Linear SSH streaming**: `execWithConnection` streams remote command output using incremental byte counting and chunk subarrays, eliminating quadratic $\mathcal{O}(N^2)$ string re-allocations and UTF-8 byte recounting on every chunk (#36).

## [0.1.5]

### Fixed
- **Settings reachable again on the plugin's own page**: the current DSH core
  (0.1.6-alpha.2) renders a plugin's configuration page only for entries registered
  in the plugin-list seat `plugins.item` — that is how `dsh-agentrouter` and
  `dsh-agent-orchestrator` show their settings. The view-aware card is now registered
  there as well (`id: 'dsh-server-monitor'`, order 60, static label), with the row
  seat and the legacy card kept as fallbacks.
- The row-seat test file gained a case asserting the new registration (`id`, `order`,
  static `label`, component and `inject`).

## [0.1.4]

### Added

- Settings surface for the current DSH core: the plugin's settings form now opens
  on its own page under **Plugins** through the `plugins.row.config` slot, with the
  slot key `@goodandready/dsh-server-monitor#dsh-server-monitor` built from
  `package.json` and the row id in `cordis.patch.yml`.
- A `view`-aware entry: `summary` renders the one-line description under the plugin
  title, `page` renders the settings form bare (the page owns title, icon,
  breadcrumb and paddings, so no second card frame is drawn).
- Guard test `test/row-config.test.mjs`: pins the slot key to the package name and
  the `cordis.patch.yml` row id, checks that the row slot is wired first, that the
  legacy placement survives as a fallback, and that both views render as designed.

### Changed

- `settings.plugin.item` is no longer the only settings surface: it stays
  registered as a fallback for older cores, after the new row slot.

## [0.1.3]

- Previous public release.
