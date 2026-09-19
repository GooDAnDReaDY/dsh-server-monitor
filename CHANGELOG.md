# Changelog

All notable changes to `@goodandready/dsh-server-monitor` are recorded here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
