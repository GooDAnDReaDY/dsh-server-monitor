# Findings — dsh-server-monitor MVP

- Existing dsh-remote-workspace is the reuse source for SSH2, auth, vault and remote command lifecycle.
- New plugin must not read or depend on dsh-remote-workspace at runtime.
- Native DSH sidebar uses sidebarRightTabs and sidebar.right.pane.tab.
- Legacy BetterSidebar compatibility is optional but included in MVP plan.
- External references: WatchSSH and dockgate.
