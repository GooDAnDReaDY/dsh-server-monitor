# Project Instructions — dsh-server-monitor

This file supplements the shared /mnt/external/Project/DEV/AGENTS.md.

## Product

- Project: dsh-server-monitor
- Package: @goodandready/dsh-server-monitor
- DEV root: /mnt/external/Project/DEV/dhsplugins/dsh-server-monitor
- Purpose: standalone read-only Linux server monitoring for DeepSeek Harness.
- Runtime dependency on dsh-remote-workspace: none.
- Credentials and SSH profiles: owned exclusively by this plugin.
- Publication: prohibited until explicit owner approval after all verification.

## Architecture

- The plugin owns its settings namespace, vault namespace, connection pool and lifecycle.
- Proven SSH/auth/vault implementation is adapted from dsh-remote-workspace; only the required code is reused.
- The monitor collector is read-only and returns normalized snapshots with bounded timeouts.
- UI primary surface is native sidebar.right.pane.tab; legacy BetterSidebar is optional compatibility.
- Public source locale is English and Chinese. Russian is supplied by dsh-russian-lang.

## Constraints

- Linux targets only for MVP.
- No history, charts, alerts or management actions in MVP.
- No hardcoded paths, hosts, credentials or private addresses.
- Do not modify dsh-remote-workspace in this task.
- Do not change DSH profiles or deploy to OPT without explicit approval.
- Work only in .worktrees/codex-issue-1-server-monitor-mvp; root checkout is read-only.

## Essential files

- index.md — project navigation and verified commands.
- docs/design/DESIGN.md — UX/UI contract.
- docs/architecture/baseline.md — architecture and boundaries.
- docs/adr/0001-standalone-credentials.md — credential ownership decision.
- docs/plans/1-server-monitor-mvp.md — implementation plan.
- docs/research/reuse-first.md — reuse analysis.
- docs/testing/mvp-matrix.md — verification matrix.

## Definition of Ready

- Scope and ownership are approved by the owner.
- Reuse-first research is recorded.
- Design and architecture baselines exist.
- Test matrix covers SSH/vault, collector parsing, API, UI states and sidebar compatibility.

## Definition of Done

- All MVP code and documentation are committed and pushed through the issue branch.
- Applicable unit, integration, package and visual checks pass.
- Exact package is installed and verified in the isolated MiniPC test profile, then removed.
- No npm/GitHub publication has occurred.
