# @goodandready/dsh-server-monitor

适用于 DeepSeek Harness 侧边栏的独立、只读 Linux 服务器监控插件。插件自行管理服务器配置和凭据，不依赖 `dsh-remote-workspace`，也不会复用其他插件的连接配置。

## MVP 范围

- 添加和管理多个 Linux SSH 配置。
- 支持 SSH 私钥（内联内容或 DSH 主机上的密钥路径）以及密码认证。
- 显示主机、CPU、内存、交换空间、磁盘、进程、容器、网络和监听端口的当前状态。
- 侧边栏可见时每 15 秒刷新一次。
- 只读监控：不会管理远程服务、进程或容器。历史记录、图表和告警不属于 MVP。

## 凭据边界

凭据由此插件独立管理，存储在 DSH 主机的 `~/.dsh/secrets/dsh-server-monitor.env`。在 POSIX 主机上，插件会强制设置并验证 `0600` 权限；无法确保权限时会停止操作。密钥不会写入 DSH 设置，也不会通过 API 返回给浏览器；配置接口只返回掩码和是否已保存的信息。私钥路径在 DSH 主机上读取。

## 开发测试

执行与 Gitea Actions 相同的检查：

```sh
npm ci
npm test
```

测试使用模拟 SSH 连接，不会连接真实服务器。Gitea Actions 会在推送和拉取请求时执行这些命令。获得发布批准并完成测试前，本仓库保持未发布状态；届时再补充安装和发布说明。

## 语言

界面内置英语和中文词典，并使用 DSH locale 服务，以便由 `dsh-russian-lang` 提供俄语翻译。另见 [README.md](README.md) 和 [README.ru.md](README.ru.md)。
