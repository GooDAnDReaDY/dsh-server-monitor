# Changelog

All notable changes to `@goodandready/dsh-server-monitor` are recorded here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
