# DESIGN.md — dsh-server-monitor

## Product / Purpose

- Purpose: show current read-only status for user-configured Linux servers inside DSH.
- Audience: DSH users who need a compact operational view of their own servers.
- Status: MVP implementation complete; SSH keygen and verification workflow added.
- Refresh: every 15 seconds while the sidebar is visible.

## User Surfaces

- Web/UI: native DSH right sidebar monitoring tab.
- Legacy UI: optional dsh-better-sidebar tab when native sidebar services are unavailable.
- Settings: settings.plugin.item card for this plugin's own server profiles, including integrated SSH key generation and one-click remote setup command.
- API: trusted same-origin snapshot reads, profile-management routes, and protected key generation endpoint (`POST /dsh-server-monitor/keys/generate`). Snapshot collection is single-flight and capped at one start per profile per 15 seconds; save/delete invalidates that profile cache.
- Actions: profile add/edit/delete/test and SSH key generation; monitored server actions are out of scope.
- Documentation: English, Chinese, and Russian project guides; UI is English/Chinese with Russian translations supplied by dsh-russian-lang.

## Visual Direction

- Native DSH engineering UI: dense but readable, calm operational dashboard.
- Use DSH design tokens (--dsw-alias-*) and existing native spacing/typography.
- Use visual hierarchy, status labels and progress bars; do not introduce a CSS framework.
- Dynamic styles injected into DOM carry the required `data-dsh-plugin="dsh-server-monitor"` attribute.
- Do not copy third-party branding, layouts, assets or text.

## Foundations

- Colors: DSH theme tokens for background, border, primary/secondary text and success/warning/error states.
- Typography: native DSH typography; monospaced values only for hostnames, versions, process identifiers, code blocks and SSH commands where useful.
- Layout: responsive metric groups; no fixed desktop-only width.
- Accessibility: status must not rely on color alone; controls have labels and keyboard focus.

## Components And States

- Server list: configured hosts, online/offline badges, last update timestamp.
- Server selector: current server and all configured servers.
- Overview metrics: CPU/load, memory/swap, disks, uptime and platform.
- Detail groups: processes, containers, network and open ports.
- Settings profile card: name, host, port, username, key/password auth, key path, test and save.
- SSH Key Setup block:
  - Generate SSH key button: creates an Ed25519 keypair and saves it with `0600` permissions to `~/.dsh/keys/id_ed25519_dsh`.
  - Copy server setup command button: copies single-line authorized_keys command with visual "Copied!" confirmation.
  - "Command ran — test connection" button: immediately verifies SSH connectivity with the remote server.
- Loading: skeleton or explicit loading label while the first snapshot is pending.
- Empty: explain that no server profiles exist and provide Add server.
- Success: show timestamped current snapshot and per-section status.
- Partial: show available sections and identify unavailable sections.
- Error/offline: preserve the server entry, show last known timestamp if present and expose Retry.
- Destructive action: deleting a profile requires confirmation; it does not affect the remote server.

## User Flows

1. First run: open plugin settings, add a server profile, click "Generate SSH key", copy the one-line setup command, run it on the remote host, click "Command ran — test connection", verify success, save.
2. Monitor: open the sidebar tab, select a server, see loading state, then current metrics.
3. Multi-server: switch servers without losing independent profile data.
4. Failure: one server or one collector section fails without blanking other servers.
5. Recovery: Retry or next polling cycle returns to success.

## Do / Don't

- Do keep credentials inside this plugin's vault or `~/.dsh/keys/`, verify POSIX mode `0600`, and never serialize private keys to the browser.
- Do provide a ready-to-copy one-line setup command for authorized_keys deployment.
- Do register locale dictionaries inside a Cordis effect and dispose them with the plugin lifecycle. Use the DSH locale binding for every visible UI label so external locale packs can translate the plugin.
- Do bound remote commands and cap process/container/port output.
- Do pause polling when the document is hidden.
- Don't modify, stop, restart or kill remote processes/containers.
- Don't require `dsh-remote-workspace` to be installed, but store generated keys in the shared path `~/.dsh/keys/id_ed25519_dsh` so Remote Workspace profiles can reuse them seamlessly.
- Don't show a blank dashboard when only one metric section is unavailable.

## API And Security

- State, snapshot, profile management, testing, key generation, and updater routes require a strict fail-closed check (`isTrustedRequest`): `Origin` ↔ `Host` and `Referer` ↔ `Host` matching, `Sec-Fetch-Site` (`same-origin` or `none`), and local loopback verification. Arbitrary bearer tokens or unverified cookie substrings are rejected.
- Key generation route `POST /dsh-server-monitor/keys/generate` returns only the public key, the POSIX path to the private key, and the installation command; the private key is never returned over HTTP.
- Snapshot responses contain metrics only; secrets remain inside the server-side vault and collector boundary.
- Per-profile snapshots and collector failures are cached for 15 seconds from collection start; concurrent requests share one in-flight collection.
- Secret-vault and key writes require verified owner-only POSIX permissions (`0600`) and fail visibly when enforcement fails.
- Plugin update route `GET /dsh-server-monitor/update` provides current and latest versions; `POST /dsh-server-monitor/update` initiates atomic CLI upgrade with execution timeout.

## Dependencies And Runtime Requirements

- **Runtime Dependency (`ssh2`)**: Unlike most DSH plugins that only declare `peerDependencies` provided by the DSH host kernel, `dsh-server-monitor` declares a direct runtime dependency on `ssh2` (`^1.17.0`).
  - *Purpose*: Handles SSH2 protocol connections, stream multiplexing, bounded command execution, and modern Ed25519 keypair generation via `ssh2.utils.generateKeyPairSync`.
  - *Pure JavaScript Fallback*: `ssh2` contains optional native bindings (`cpu-features`, `sshcrypto`) for crypto performance optimization. On hosts lacking build tools (gcc/clang, make, python), npm/pnpm skips native compilation and `ssh2` executes reliably in pure JavaScript mode. No build tools are mandated on the host.
  - *Packaging Boundary*: In accordance with standard npm packaging, `package.json` specifies `"files": ["lib/", "cordis.patch.yml", "README.md", "README.zh.md", "README.ru.md", "LICENSE"]`. `node_modules` is excluded from the published tarball; dependencies are resolved and fetched from the registry at install time.
  - *Offline / Air-Gapped Strategy*: For air-gapped DSH installations, `ssh2` and its transitive dependencies must be pre-populated in the local pnpm/npm store or provided by a private artifact repository.

## Locked Design Decisions

- 2026-09-16 — Separate plugin-owned profiles and credentials; reason: plugins are independent and must not share connection ownership.
- 2026-09-16 — Read-only Linux MVP with 15-second visible polling; reason: deliver safe current status before history, alerts or actions.
- 2026-09-16 — Native right sidebar primary surface with legacy compatibility; reason: use current DSH sidebar API while preserving older profiles.
- 2026-09-18 — Внутренние служебные материалы (AGENTS.md, index.md, docs/plans/, docs/research/, docs/testing/, docs/architecture/, .planning/) сохраняются локально на диске разработчика/агента, но снимаются с отслеживания git (`git rm --cached`) и закрываются правилами `.gitignore`. В git отслеживаются только дизайн-контракт `docs/design/` и архитектурные решения `docs/adr/`. При этом файлы никогда не удаляются физически с диска («исключать из индекса, но не удалять с диска»).
- 2026-09-18 — Интегрированная генерация SSH-ключа в UI: создание пары Ed25519 на хосте DSH с сохранением приватного ключа в `~/.dsh/keys/id_ed25519_dsh` (0600), вывод команды настройки `authorized_keys` и кнопка немедленной проверки подключения прямо в карточке настроек.
- 2026-09-18 — Строгая fail-closed защита маршрутов (isTrustedRequest): обязательное совпадение `Origin` ↔ `Host` и `Referer` ↔ `Host`, ограничение `Sec-Fetch-Site` (`same-origin`/`none`) и допуск локального loopback. Произвольные bearer-токены и подстроки кук удалены, исключена возможность межсайтового или сетевого обхода.
- 2026-09-18 — One-click обновление из карточки настроек: модуль registerPluginUpdater с проверкой версии через registry npm, fail-closed защита POST-запроса через isTrustedRequest, отображение версий и статуса в карточке настроек.
- 2026-09-18 — Runtime-зависимость ssh2 с pure JS fallback: ssh2 объявлена прямой runtime-зависимостью (dependencies, а не peer) для управления SSH-сессиями и генерации ключей Ed25519. Не требует сборочного инструментария на хосте благодаря прозрачному фоллбеку на чистый JavaScript. Для офлайн-контуров зависимости кэшируются в локальном реестре.

