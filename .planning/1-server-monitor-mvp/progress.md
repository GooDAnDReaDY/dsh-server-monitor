# Progress — dsh-server-monitor MVP

## 2026-09-16

- Confirmed product scope and independent credential ownership with the user.
- Created Gitea repository goodandready/dsh-server-monitor.
- Created issue #1 and labels.
- Initialized DEV root checkout from origin/main.
- Created worktree codex-issue-1-server-monitor-mvp.
- Started baseline documentation.

- Implemented standalone package skeleton with own settings model, vault, SSH pool, Linux collector, protected routes and web client.
- Added native right sidebar registration, legacy BetterSidebar compatibility, EN/ZH labels, visible-only 15-second polling and profile management UI.
- RED→GREEN verification completed: 13/13 Node tests pass; client syntax check passes; package export import passes; npm pack dry-run contains 12 intended files (15.1 kB); npm audit reports 0 vulnerabilities.
- Added `package-lock.json` after a normal `npm install --ignore-scripts`; no publication or deployment performed.

- MiniPC isolated verification completed: exact 0.1.0 tgz installed into `/home/vadim/.dsh-test` via `dsh plugin --profile web add`, profile dump contained `dsh-server-monitor`, authenticated web bootstrap returned HTTP 200, plugin-local `/dsh-server-monitor/state` returned HTTP 200 with an empty profile list, and the temporary plugin plus tgz were removed. `dsh-lanmode` remained installed.
- DSH boot emitted an existing `dsh-lanmode` CA-near-expiration regeneration notice and its existing port-3082-in-use notice; no dsh-lanmode files or settings were edited by this task.
- Added profile connection-test action to settings UI; reran all checks: 13/13 tests, client syntax, pack dry-run and audit all pass.
