# @goodandready/dsh-server-monitor

A standalone, read-only Linux server monitor for the DeepSeek Harness sidebar. This package owns its server profiles and credentials; it does not depend on `dsh-remote-workspace` or reuse another plugin’s connection settings.

## MVP scope

- Add and manage multiple Linux SSH profiles.
- Connect with an SSH private key (inline or server-side key path) or password authentication.
- Show current host, CPU, memory, swap, disk, process, container, network, and listening-port data.
- Refresh every 15 seconds while the sidebar is visible.
- Read-only monitoring: the plugin does not manage remote services, processes, or containers. History, charts, and alerts are not part of the MVP.

## Credential boundary

Credentials belong to this plugin and are stored on the DSH host in `~/.dsh/secrets/dsh-server-monitor.env`. On POSIX hosts the plugin enforces and verifies mode `0600`, and stops if that permission cannot be established. Secret values are not written to DSH settings or returned to the browser; profile APIs expose only masked values and presence flags. A configured private-key path is read on the DSH host.

## Development checks

Run the same checks used by Gitea Actions:

```sh
npm ci
npm test
```

Tests use mocked SSH connections and do not connect to real servers. The Gitea Actions workflow runs these commands for pushes and pull requests. Package installation/publication instructions will be added when a release is approved; this repository remains unpublished until the complete test cycle is accepted.

## Languages

The plugin UI ships English and Chinese dictionaries and uses the DSH locale service, allowing `dsh-russian-lang` to supply Russian translations. See [README.zh.md](README.zh.md) and [README.ru.md](README.ru.md).
