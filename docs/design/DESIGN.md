# DESIGN.md — dsh-server-monitor

## Product / Purpose

- Purpose: show current read-only status for user-configured Linux servers inside DSH.
- Audience: DSH users who need a compact operational view of their own servers.
- Status: MVP implementation in progress.
- Refresh: every 15 seconds while the sidebar is visible.

## User Surfaces

- Web/UI: native DSH right sidebar monitoring tab.
- Legacy UI: optional dsh-better-sidebar tab when native sidebar services are unavailable.
- Settings: settings.plugin.item card for this plugin's own server profiles.
- API: plugin-local read-only snapshot and profile-management routes.
- Actions: profile add/edit/delete/test only; monitored server actions are out of scope.
- Documentation: English and Chinese public documentation; Russian via dsh-russian-lang.

## Visual Direction

- Native DSH engineering UI: dense but readable, calm operational dashboard.
- Use DSH design tokens (--dsw-alias-*) and existing native spacing/typography.
- Use visual hierarchy, status labels and progress bars; do not introduce a CSS framework.
- Do not copy third-party branding, layouts, assets or text.

## Foundations

- Colors: DSH theme tokens for background, border, primary/secondary text and success/warning/error states.
- Typography: native DSH typography; monospaced values only for hostnames, versions and process identifiers where useful.
- Layout: responsive metric groups; no fixed desktop-only width.
- Accessibility: status must not rely on color alone; controls have labels and keyboard focus.

## Components And States

- Server list: configured hosts, online/offline badges, last update timestamp.
- Server selector: current server and all configured servers.
- Overview metrics: CPU/load, memory/swap, disks, uptime and platform.
- Detail groups: processes, containers, network and open ports.
- Settings profile card: name, host, port, username, key/password auth, key path, test and save.
- Loading: skeleton or explicit loading label while the first snapshot is pending.
- Empty: explain that no server profiles exist and provide Add server.
- Success: show timestamped current snapshot and per-section status.
- Partial: show available sections and identify unavailable sections.
- Error/offline: preserve the server entry, show last known timestamp if present and expose Retry.
- Destructive action: deleting a profile requires confirmation; it does not affect the remote server.

## User Flows

1. First run: open plugin settings, add a server profile, test connection, save.
2. Monitor: open the sidebar tab, select a server, see loading state, then current metrics.
3. Multi-server: switch servers without losing independent profile data.
4. Failure: one server or one collector section fails without blanking other servers.
5. Recovery: Retry or next polling cycle returns to success.

## Do / Don't

- Do keep credentials inside this plugin's vault and never serialize secret values to the browser.
- Do bound remote commands and cap process/container/port output.
- Do pause polling when the document is hidden.
- Don't modify, stop, restart or kill remote processes/containers.
- Don't depend on dsh-remote-workspace settings, services or installed package.
- Don't show a blank dashboard when only one metric section is unavailable.

## Locked Design Decisions

- 2026-09-16 — Separate plugin-owned profiles and credentials; reason: plugins are independent and must not share connection ownership.
- 2026-09-16 — Read-only Linux MVP with 15-second visible polling; reason: deliver safe current status before history, alerts or actions.
- 2026-09-16 — Native right sidebar primary surface with legacy compatibility; reason: use current DSH sidebar API while preserving older profiles.
