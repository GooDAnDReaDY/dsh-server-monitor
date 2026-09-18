# Task plan — Server Monitor issues #6 and #10

## Goal
Correct the incomplete handling of issue #6 by restoring its nine deleted internal
files on disk while keeping them outside Git/publication, and document the
preservation rule. Work is one related issue batch, one branch, one PR.

## Current status
- Phase 1: in_progress
- Phase 2: pending
- Phase 3: pending
- Phase 4: pending

## Phases
1. **Preflight and recovery source** — inspect Gitea issues/comments/PRs,
   branch/worktree ownership, project instructions, and the exact pre-deletion
   file blobs. Confirm current main and a clean assigned worktree.
2. **Restore without tracking** — restore the nine files from history, retain
   them locally as ignored files, and ensure the restored AGENTS.md does not
   preserve a stale branch-specific worktree instruction.
3. **Policy and verification** — update DESIGN.md with the preservation rule;
   check exact on-disk/tracked status, ignore rules, npm archive allowlist,
   current tree and reachable history for sensitive material, and run tests.
4. **Gitea delivery** — record evidence in both issues, commit only intended
   tracked changes, push the branch, and open one PR. Do not merge, deploy, or
   publish without the separately required user approval.

## Next Step
