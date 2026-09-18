# Reuse-First Research — Issue #1

## Current codebase

- dsh-remote-workspace contains a working SSH2 connection pool, key/password authentication, vault handling, command execution, native DSH settings card and test patterns.
- dsh-cron demonstrates service reuse but is intentionally not used as a runtime integration because this plugin must remain independent.
- dsh-context-lens demonstrates native sidebarRightTabs plus sidebar.right.pane.tab, legacy BetterSidebar compatibility and a four-layout test matrix.

## Internal library

No directly applicable server-monitor package was found in /mnt/external/Project/_code_library during the initial search.

## Open source

- WatchSSH: agentless SSH monitoring using standard remote tools and structured metrics.
- Dockgate: multi-host overview with host metrics and container sections.
- These are references only; their runtimes and dependencies are not adopted.

## Decision

Adapt the proven SSH/auth/vault source from dsh-remote-workspace into this standalone package. Build only the monitoring collector and UI needed for the agreed MVP.
