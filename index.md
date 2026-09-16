# dsh-server-monitor

Standalone @goodandready/dsh-server-monitor plugin for a read-only Linux server dashboard in DeepSeek Harness.

## Status

- Status: active development
- Scope: MVP, issue #1
- Publication: not published
- DEV: /mnt/external/Project/DEV/dhsplugins/dsh-server-monitor
- Worktree: .worktrees/codex-issue-1-server-monitor-mvp
- OPT: not configured

## Documentation

- Design contract: docs/design/DESIGN.md
- Architecture baseline: docs/architecture/baseline.md
- ADR-0001: docs/adr/0001-standalone-credentials.md
- MVP plan: docs/plans/1-server-monitor-mvp.md
- Reuse research: docs/research/reuse-first.md
- Testing matrix: docs/testing/mvp-matrix.md

## Commands

## Verified commands

```bash
node --check lib/client.js
npm test
npm pack --dry-run
npm audit --omit=dev
```

The package is intentionally unpublished until the isolated MiniPC verification is complete and the owner explicitly approves publication.
