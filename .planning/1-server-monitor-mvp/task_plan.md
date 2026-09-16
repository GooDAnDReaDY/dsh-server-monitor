# Task Plan — dsh-server-monitor MVP

## Goal

Complete issue #1 as a standalone, tested, unpublished DSH plugin.

## Current Phase

Phase 3 — implementation and verification

## Phases

- [done] Baseline, issue, worktree, design and architecture docs
- [done] TDD for profile schema, vault and SSH service
- [done] TDD for Linux snapshot collector and API
- [done] Native/legacy sidebar UI and localization
- [in_progress] Full verification and package audit
- [pending] MiniPC isolated install, visual QA and cleanup
- [pending] PR/merge/deploy readiness report

## Next Step

Run isolated MiniPC package installation, DSH smoke checks and visual acceptance; then commit and push the completed candidate.

## Decisions

- Independent profiles, vault and connections.
- Copy/adapt SSH/auth/vault code from dsh-remote-workspace.
- Linux read-only MVP, 15-second polling, no charts/alerts/actions.
- No publication without explicit later approval.

## Errors Encountered

| Error | Attempt | Resolution |
|---|---:|---|
| Invalid literal git-agent command | 1 | Corrected to /home/vadim/.ssh/bin/git-codex. |
| Attempted branch deletion after checkout | 1 | Branch was unborn and did not exist; no repository data was affected. |
