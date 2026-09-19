window.__ModuleLoader__.load({
  id: '@goodandready/dsh-server-monitor',
  factory: (require) => {
    var module = { exports: {} };
    const React = require('react');
    const NS = 'dsh-server-monitor';
    const API = '/dsh-server-monitor';
    // Settings surface address for the current DSH core. The Plugins page opens a
    // per-plugin page via its "configure" control and resolves the entry by
    // `rowConfigKey(pkg, rowId)` = `<package name>#<id of the row in cordis.patch.yml>`.
    const PKG = '@goodandready/dsh-server-monitor';
    const ROW_ID = 'dsh-server-monitor';
    const ROW_CONFIG_KEY = PKG + '#' + ROW_ID;

    const en = {
      title: 'Server Monitor', subtitle: 'Read-only Linux server status',
      servers: 'Servers', guideDescription: 'Read-only Linux server status',
      add: 'Add server', save: 'Save server', delete: 'Delete', test: 'Test connection',
      refresh: 'Refresh', active: 'Active', connected: 'Online', offline: 'Offline', partial: 'Partial',
      noServers: 'No servers configured yet.', noSnapshot: 'No snapshot available.',
      name: 'Name', host: 'Host', port: 'Port', username: 'Username', auth: 'Authentication',
      key: 'Private key', password: 'Password', passphrase: 'Key passphrase', keyPath: 'Key path',
      keyHint: 'The key is stored only in this plugin vault.', keepSecret: 'Leave empty to keep stored value',
      system: 'System', resources: 'Resources', disks: 'Disks', processes: 'Top processes', containers: 'Containers',
      network: 'Network', ports: 'Listening ports', hostname: 'Hostname', os: 'OS', kernel: 'Kernel',
      architecture: 'Architecture', cpu: 'CPU', uptime: 'Uptime', load: 'Load average', memory: 'Memory', swap: 'Swap',
      used: 'used', available: 'available', filesystem: 'Filesystem', mount: 'Mount', command: 'Command',
      state: 'State', image: 'Image', interface: 'Interface', rx: 'RX', tx: 'TX', protocol: 'Protocol',
      address: 'Address', error: 'Error', loading: 'Loading…', unavailable: 'Unavailable', saved: 'Saved', confirmDelete: 'Delete this server profile?', cancel: 'Cancel',
      saving: 'Saving…', testing: 'Testing…', select: 'Select server',
      keygenSection: 'SSH Key Setup', generateKey: 'Generate SSH key', generating: 'Generating…',
      copyInstallCmd: 'Copy server setup command', copied: 'Copied!',
      testAfterInstall: 'Command ran — test connection',
      shareWorkspaceHint: 'Saved to ~/.dsh/keys/id_ed25519_dsh (compatible with Remote Workspace)',
      version: 'Version', updateChecking: 'Checking updates…', updateAvailable: 'Update available: v{v}',
      upToDate: 'Up to date', updateNow: 'Update Now', updating: 'Updating…',
      updateSuccess: 'Updated to v{v}. Restart DSH service to apply changes.',
      updateFailed: 'Update failed: {msg}', checkUpdateFailed: 'Check failed'
    };
    const zh = {
      title: '服务器监控', subtitle: '只读 Linux 服务器状态',
      servers: '服务器', guideDescription: '只读 Linux 服务器状态',
      add: '添加服务器', save: '保存服务器', delete: '删除', test: '测试连接',
      refresh: '刷新', active: '当前', connected: '在线', offline: '离线', partial: '部分可用',
      noServers: '尚未配置服务器。', noSnapshot: '暂无状态快照。',
      name: '名称', host: '主机', port: '端口', username: '用户名', auth: '认证方式',
      key: '私钥', password: '密码', passphrase: '密钥口令', keyPath: '密钥路径',
      keyHint: '密钥只存储在此插件的保险库中。', keepSecret: '留空以保留已存储的值',
      system: '系统', resources: '资源', disks: '磁盘', processes: '高负载进程', containers: '容器',
      network: '网络', ports: '监听端口', hostname: '主机名', os: '操作系统', kernel: '内核',
      architecture: '架构', cpu: 'CPU', uptime: '运行时间', load: '平均负载', memory: '内存', swap: '交换分区',
      used: '已用', available: '可用', filesystem: '文件系统', mount: '挂载点', command: '命令',
      state: '状态', image: '镜像', interface: '接口', rx: '接收', tx: '发送', protocol: '协议',
      address: '地址', error: '错误', loading: '加载中…', unavailable: '不可用', saved: '已保存', confirmDelete: '删除此服务器配置？', cancel: '取消',
      saving: '保存中…', testing: '测试中…', select: '选择服务器',
      keygenSection: 'SSH 密钥配置', generateKey: '生成 SSH 密钥', generating: '生成中…',
      copyInstallCmd: '复制服务器配置命令', copied: '已复制！',
      testAfterInstall: '已执行命令 — 测试连接',
      shareWorkspaceHint: '已保存在 ~/.dsh/keys/id_ed25519_dsh（与 Remote Workspace 兼容）',
      version: '版本', updateChecking: '正在检查更新…', updateAvailable: '发现新版本: v{v}',
      upToDate: '已是最新版本', updateNow: '立即更新', updating: '正在更新…',
      updateSuccess: '已更新至 v{v}。请重启 DSH 服务以生效变更。',
      updateFailed: '更新失败: {msg}', checkUpdateFailed: '检查更新失败'
    };

    function labels(ctx) {
      const translate = ctx?.locale?.bind ? ctx.locale.bind(NS) : (key) => en[key] || key;
      return new Proxy({}, { get: (_target, key) => typeof key === 'symbol' ? undefined : translate(String(key)) });
    }
    function text(value, fallback = '—') { return value === undefined || value === null || value === '' ? fallback : String(value); }
    function pct(value) { return `${Math.round(Number(value) || 0)}%`; }
    function formatMb(value) { const mb = Number(value) || 0; return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`; }
    async function request(path, options = {}) {
      const response = await fetch(API + path, { credentials: 'same-origin', ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body.ok === false) throw new Error(body.error || `HTTP ${response.status}`);
      return body;
    }
    function ensureCss() {
      if (typeof document === 'undefined' || document.getElementById('dsh-server-monitor-css')) return;
      const style = document.createElement('style');
      style.id = 'dsh-server-monitor-css';
      style.setAttribute('data-dsh-plugin', NS);
      style.textContent = `
.dsm-page{display:block}
.dsm-page .dsm-root{padding:0}
.dsm-root{display:flex;flex-direction:column;gap:12px;padding:8px;box-sizing:border-box;font-family:inherit;font-size:12px;color:var(--dsw-alias-label-primary)}
.dsm-card{background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:8px}
.dsm-head{display:flex;justify-content:space-between;align-items:center;gap:8px}
.dsm-title{font-size:14px;font-weight:600}
.dsm-sub{font-size:11px;color:var(--dsw-alias-label-secondary)}
.dsm-section-title{font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary);text-transform:uppercase;letter-spacing:.05em}
.dsm-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px}
.dsm-stat{background:var(--dsw-alias-bg-layer-3);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:8px}
.dsm-val{font-size:13px;font-weight:600}
.dsm-label{font-size:11px;color:var(--dsw-alias-label-secondary);margin-top:2px}
.dsm-badge{display:inline-flex;align-items:center;padding:2px 7px;border-radius:999px;font-size:10px;font-weight:600}
.dsm-ok{background:var(--dsw-alias-state-success-layer-1);color:var(--dsw-alias-state-success-primary)}
.dsm-warn{background:var(--dsw-alias-state-warning-layer-1);color:var(--dsw-alias-state-warning-primary)}
.dsm-err{background:var(--dsw-alias-state-error-layer-1);color:var(--dsw-alias-state-error-primary)}
.dsm-muted{color:var(--dsw-alias-label-secondary);font-size:11px}
.dsm-table{width:100%;border-collapse:collapse;font-size:11px}
.dsm-table th{text-align:left;color:var(--dsw-alias-label-secondary);padding:4px 6px;border-bottom:1px solid var(--dsw-alias-border-l2)}
.dsm-table td{padding:4px 6px;border-bottom:1px solid var(--dsw-alias-border-l3)}
.dsm-btn{appearance:none;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);border-radius:7px;padding:5px 9px;font:inherit;font-size:11px;cursor:pointer}.dsm-btn:disabled{opacity:.55;cursor:not-allowed}
.dsm-btn-primary{background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-3);border-color:transparent}
.dsm-btn-success{background:var(--dsw-alias-state-success-layer-1);color:var(--dsw-alias-state-success-primary);border-color:var(--dsw-alias-state-success-primary)}
.dsm-row{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
.dsm-field{display:flex;flex-direction:column;gap:4px;min-width:140px;flex:1}
.dsm-field label{font-size:11px;color:var(--dsw-alias-label-secondary)}
.dsm-input{height:30px;box-sizing:border-box;width:100%;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);border-radius:7px;padding:0 8px;font:inherit;font-size:12px}
.dsm-input:focus{outline:none;border-color:var(--dsw-alias-state-brand-primary)}
.dsm-form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:9px}
.dsm-error{padding:8px;border:1px solid var(--dsw-alias-state-error-primary);border-radius:7px;color:var(--dsw-alias-state-error-primary);font-size:11px}
.dsm-progress{height:5px;background:var(--dsw-alias-bg-layer-1);border-radius:4px;overflow:hidden;margin-top:5px}
.dsm-progress>span{display:block;height:100%;background:var(--dsw-alias-state-brand-primary)}
.dsm-code-block{background:var(--dsw-alias-bg-layer-3);border:1px solid var(--dsw-alias-border-l2);border-radius:6px;padding:8px;font-family:monospace;font-size:11px;word-break:break-all;user-select:all}
`;
      document.head.appendChild(style);
    }
    function useMonitor(ctx) {
      const [state, setState] = React.useState({ profiles: [], activeId: '', snapshot: null, loading: true, error: '' });
      const refresh = React.useCallback(async (profileId) => {
        try {
          const selected = profileId || state.activeId;
          const base = await request('/state');
          const id = selected || base.activeId || base.profiles[0]?.id || '';
          const snapshot = id ? (await request(`/snapshot?profileId=${encodeURIComponent(id)}`)).snapshot : null;
          setState({ profiles: base.profiles || [], activeId: id, snapshot, loading: false, error: '' });
        } catch (error) { setState((old) => ({ ...old, loading: false, error: error.message })); }
      }, [state.activeId]);
      React.useEffect(() => { const doc = typeof document === 'undefined' ? null : document; refresh(); const tick = () => { if (!doc || !doc.hidden) refresh(); }; const timer = setInterval(tick, 15000); const onVisibility = () => { if (!doc?.hidden) refresh(); }; doc?.addEventListener?.('visibilitychange', onVisibility); return () => { clearInterval(timer); doc?.removeEventListener?.('visibilitychange', onVisibility); }; }, []);
      return { state, refresh };
    }
    function Badge({ status, t }) { const cls = status === 'ready' ? 'dsm-ok' : status === 'partial' ? 'dsm-warn' : 'dsm-err'; const label = status === 'ready' ? t.connected : status === 'partial' ? t.partial : t.offline; return React.createElement('span', { className: `dsm-badge ${cls}` }, label); }
    function Stat({ label, value }) { return React.createElement('div', { className: 'dsm-stat' }, React.createElement('div', { className: 'dsm-val' }, text(value)), React.createElement('div', { className: 'dsm-label' }, label)); }
    function ResourceBar({ label, resource }) { const percent = resource?.percent || 0; return React.createElement('div', { className: 'dsm-stat' }, React.createElement('div', { className: 'dsm-val' }, `${formatMb(resource?.usedMb)} / ${formatMb(resource?.totalMb)}`), React.createElement('div', { className: 'dsm-label' }, `${label} · ${pct(percent)}`), React.createElement('div', { className: 'dsm-progress' }, React.createElement('span', { style: { width: `${Math.min(100, Math.max(0, percent))}%` } })) ); }
    function SnapshotView({ snapshot, t }) {
      if (!snapshot) return React.createElement('div', { className: 'dsm-muted' }, t.noSnapshot);
      const i = snapshot.identity || {}; const s = snapshot.system || {};
      return React.createElement(React.Fragment, null,
        React.createElement('div', { className: 'dsm-card' }, React.createElement('div', { className: 'dsm-head' }, React.createElement('div', null, React.createElement('div', { className: 'dsm-title' }, t.system), React.createElement('div', { className: 'dsm-sub' }, text(i.hostname), ' · ', snapshot.timestamp ? new Date(snapshot.timestamp).toLocaleTimeString() : '—')), React.createElement(Badge, { status: snapshot.status, t })), React.createElement('div', { className: 'dsm-grid' }, React.createElement(Stat, { label: t.os, value: i.os }), React.createElement(Stat, { label: t.kernel, value: i.kernel }), React.createElement(Stat, { label: t.architecture, value: i.architecture }), React.createElement(Stat, { label: t.cpu, value: `${text(i.cpuModel)} · ${i.cpuCores || 0}` }), React.createElement(Stat, { label: t.uptime, value: text(s.uptime) }), React.createElement(Stat, { label: t.load, value: (s.loadAverage || []).join(' · ') || '—' }))),
        React.createElement('div', { className: 'dsm-card' }, React.createElement('div', { className: 'dsm-section-title' }, t.resources), React.createElement('div', { className: 'dsm-grid' }, React.createElement(ResourceBar, { label: t.memory, resource: s.memory }), React.createElement(ResourceBar, { label: t.swap, resource: s.swap }))),
        React.createElement(ListSection, { title: t.disks, rows: snapshot.disks, columns: [t.filesystem, t.mount, t.used], render: (row) => [row.filesystem, row.mount, `${formatMb(row.usedMb)} / ${formatMb(row.totalMb)} (${pct(row.percent)})`] }),
        React.createElement(ListSection, { title: t.processes, rows: snapshot.processes, columns: ['PID', t.command, 'CPU', 'RAM'], render: (row) => [row.pid, row.command, pct(row.cpuPercent), pct(row.memoryPercent)] }),
        React.createElement(ListSection, { title: t.containers, rows: snapshot.containers, columns: [t.name, t.image, t.state], render: (row) => [row.name, row.image, row.state || row.status], empty: t.unavailable }),
        React.createElement(ListSection, { title: t.network, rows: snapshot.network?.interfaces, columns: [t.interface, t.rx, t.tx], render: (row) => [row.name, `${row.rxBytes} B`, `${row.txBytes} B`] }),
        React.createElement(ListSection, { title: t.ports, rows: snapshot.ports, columns: [t.protocol, t.address, t.port], render: (row) => [row.protocol, row.address, row.port] })
      );
    }
    function ListSection({ title, rows = [], columns, render, empty = '—' }) { return React.createElement('div', { className: 'dsm-card dsm-section' }, React.createElement('div', { className: 'dsm-section-title' }, title), rows.length ? React.createElement('table', { className: 'dsm-table' }, React.createElement('thead', null, React.createElement('tr', null, columns.map((item) => React.createElement('th', { key: item }, item)))), React.createElement('tbody', null, rows.slice(0, 10).map((row, index) => React.createElement('tr', { key: row.id || row.pid || row.name || index }, render(row).map((item, itemIndex) => React.createElement('td', { key: itemIndex }, text(item))))))) : React.createElement('div', { className: 'dsm-muted' }, empty)); }
    function MonitorPane({ ctx }) {
      ensureCss();
      const t = labels(ctx);
      const { state, refresh } = useMonitor(ctx);
      const [selected, setSelected] = React.useState('');
      const id = selected || state.activeId;
      const profile = state.profiles.find((item) => item.id === id);
      const header = React.createElement('div', { className: 'dsm-card' },
        React.createElement('div', { className: 'dsm-head' },
          React.createElement('div', null,
            React.createElement('div', { className: 'dsm-title' }, t.title),
            React.createElement('div', { className: 'dsm-sub' }, profile ? `${profile.name} · ${profile.username}@${profile.host}` : t.noServers)
          ),
          React.createElement('button', { className: 'dsm-btn', type: 'button', onClick: () => refresh(id) }, t.refresh)
        ),
        state.profiles.length ? React.createElement('select', {
          className: 'dsm-input', value: id,
          onChange: (event) => { setSelected(event.target.value); refresh(event.target.value); }
        }, state.profiles.map((item) => React.createElement('option', { key: item.id, value: item.id }, `${item.name} (${item.username}@${item.host})`))) : null
      );
      const body = state.loading ? React.createElement('div', { className: 'dsm-muted' }, t.loading)
        : state.error ? React.createElement('div', { className: 'dsm-error' }, state.error)
          : React.createElement(SnapshotView, { snapshot: state.snapshot, t });
      return React.createElement('div', { className: 'dsm-root' }, header, body);
    }
    let ChevronIcon = null;
    try {
      if (typeof require === 'function') {
        const primitives = require('@deepseek-ai/dsh-client-ui-primitives');
        ChevronIcon = primitives?.IconChevronDownOutline14 || null;
      }
    } catch {
      ChevronIcon = null;
    }
    function SettingsCard({ ctx }) {
      ensureCss();
      const t = labels(ctx);
      const [state, setState] = React.useState({ profiles: [], activeId: '' });
      const [draft, setDraft] = React.useState(null);
      const [busy, setBusy] = React.useState(false);
      const [keyBusy, setKeyBusy] = React.useState(false);
      const [generatedKeyInfo, setGeneratedKeyInfo] = React.useState(null);
      const [copied, setCopied] = React.useState(false);
      const [error, setError] = React.useState('');
      const [testResult, setTestResult] = React.useState('');
      const [updateState, setUpdateState] = React.useState({
        checking: false,
        updateAvailable: false,
        currentVersion: '',
        latestVersion: '',
        updating: false,
        notice: '',
        error: ''
      });
      const load = React.useCallback(() => request('/state').then(setState).catch((e) => setError(e.message)), []);
      React.useEffect(() => { load(); }, [load]);
      React.useEffect(() => {
        let cancelled = false;
        (async () => {
          setUpdateState((s) => ({ ...s, checking: true, error: '', notice: '' }));
          try {
            const data = await request('/update');
            if (cancelled) return;
            setUpdateState((s) => ({
              ...s,
              checking: false,
              currentVersion: data.currentVersion || '',
              latestVersion: data.latestVersion || '',
              updateAvailable: Boolean(data.updateAvailable)
            }));
          } catch {
            if (cancelled) return;
            setUpdateState((s) => ({ ...s, checking: false, error: t.checkUpdateFailed }));
          }
        })();
        return () => { cancelled = true; };
      }, []);
      const onTriggerUpdate = async () => {
        if (updateState.updating) return;
        setUpdateState((s) => ({ ...s, updating: true, error: '', notice: '' }));
        try {
          const data = await request('/update', { method: 'POST', headers: { 'x-dsh-plugin-update': '1' } });
          const newVer = data.updatedVersion || updateState.latestVersion;
          setUpdateState((s) => ({
            ...s,
            updating: false,
            updateAvailable: false,
            currentVersion: newVer,
            notice: (t.updateSuccess || '').replace('{v}', newVer)
          }));
        } catch (err) {
          setUpdateState((s) => ({
            ...s,
            updating: false,
            error: (t.updateFailed || '').replace('{msg}', err.message || String(err))
          }));
        }
      };
      const edit = (profile) => {
        setDraft({ ...(profile || { id: '', name: '', host: '', port: 22, username: 'root', authType: 'key', privateKeyPath: '' }), password: '', privateKey: '', passphrase: '' });
        setGeneratedKeyInfo(null);
        setCopied(false);
        setTestResult('');
      };
      const field = (key, label, type = 'text') => React.createElement('div', { className: 'dsm-field' },
        React.createElement('label', null, label),
        React.createElement('input', { className: 'dsm-input', type, value: draft?.[key] ?? '', onChange: (event) => setDraft((old) => ({ ...old, [key]: type === 'number' ? Number(event.target.value) : event.target.value })) })
      );
      const save = async () => {
        setBusy(true); setError('');
        try { await request('/profiles/save', { method: 'POST', body: JSON.stringify(draft) }); setDraft(null); await load(); }
        catch (e) { setError(e.message); } finally { setBusy(false); }
      };
      const testConnection = async () => {
        setBusy(true); setError(''); setTestResult('');
        try { const result = await request('/test', { method: 'POST', body: JSON.stringify({ profile: draft }) }); setTestResult(`${t.connected}: ${result.os || ''} · ${result.latencyMs || 0} ms`); }
        catch (e) { setError(e.message); } finally { setBusy(false); }
      };
      const generateSshKey = async () => {
        setKeyBusy(true); setError('');
        try {
          const res = await request('/keys/generate', { method: 'POST', body: JSON.stringify({ keyName: 'id_ed25519_dsh' }) });
          setGeneratedKeyInfo(res);
          setDraft((old) => ({ ...old, authType: 'key', privateKeyPath: res.privateKeyPath }));
        } catch (e) { setError(e.message); } finally { setKeyBusy(false); }
      };
      const copyCommand = () => {
        if (!generatedKeyInfo?.installCommand || typeof navigator === 'undefined') return;
        navigator.clipboard?.writeText?.(generatedKeyInfo.installCommand);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      };
      const profileRows = state.profiles.map((profile) => React.createElement('div', { className: 'dsm-row', key: profile.id },
        React.createElement('button', { className: 'dsm-btn', type: 'button', onClick: () => edit(profile) },
          profile.name,
          ChevronIcon
            ? React.createElement(ChevronIcon, { style: { width: 14, height: 14, verticalAlign: 'middle', marginLeft: 4 } })
            : React.createElement('span', { style: { fontSize: 10, marginLeft: 4 } }, '▾')
        ),
        React.createElement('span', { className: 'dsm-muted' }, `${profile.username}@${profile.host}:${profile.port}`),
        state.activeId === profile.id ? React.createElement('span', { className: 'dsm-badge dsm-ok' }, t.active) : null,
        React.createElement('button', { className: 'dsm-btn', type: 'button', onClick: async () => { if (typeof window !== 'undefined' && !window.confirm(`${t.confirmDelete} ${profile.name}`)) return; await request('/profiles/delete', { method: 'POST', body: JSON.stringify({ id: profile.id }) }); load(); } }, t.delete)
      ));
      const keygenBlock = React.createElement('div', { className: 'dsm-card', style: { marginTop: 8, background: 'var(--dsw-alias-bg-layer-1)' } },
        React.createElement('div', { className: 'dsm-head' },
          React.createElement('div', { className: 'dsm-section-title' }, t.keygenSection),
          React.createElement('button', { className: 'dsm-btn', type: 'button', disabled: keyBusy, onClick: generateSshKey }, keyBusy ? t.generating : t.generateKey)
        ),
        generatedKeyInfo ? React.createElement(React.Fragment, null,
          React.createElement('div', { className: 'dsm-muted' }, t.shareWorkspaceHint),
          React.createElement('div', { className: 'dsm-code-block' }, generatedKeyInfo.installCommand),
          React.createElement('div', { className: 'dsm-row' },
            React.createElement('button', { className: 'dsm-btn', type: 'button', onClick: copyCommand }, copied ? t.copied : t.copyInstallCmd),
            React.createElement('button', { className: 'dsm-btn dsm-btn-success', type: 'button', disabled: busy, onClick: testConnection }, busy ? t.testing : t.testAfterInstall)
          )
        ) : null
      );
      const updaterBlock = React.createElement('div', {
        className: 'dsm-card',
        style: {
          marginTop: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
          background: 'var(--dsw-alias-bg-layer-1)'
        }
      },
        React.createElement('div', { style: { fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 } },
          React.createElement('span', { className: 'dsm-muted' }, `${t.version}: ${updateState.currentVersion || (updateState.checking ? '…' : '—')}`),
          updateState.checking && React.createElement('span', { className: 'dsm-muted' }, t.updateChecking),
          !updateState.checking && updateState.updateAvailable && React.createElement('span', { className: 'dsm-badge dsm-warn' }, (t.updateAvailable || '').replace('{v}', updateState.latestVersion)),
          !updateState.checking && !updateState.updateAvailable && !updateState.error && React.createElement('span', { className: 'dsm-badge dsm-ok' }, `✓ ${t.upToDate}`),
          updateState.error && React.createElement('span', { className: 'dsm-badge dsm-err' }, updateState.error)
        ),
        updateState.updateAvailable && React.createElement('button', {
          className: 'dsm-btn dsm-btn-primary',
          type: 'button',
          onClick: onTriggerUpdate,
          disabled: updateState.updating
        }, updateState.updating ? t.updating : t.updateNow)
      );
      const noticeBlock = updateState.notice ? React.createElement('div', {
        className: 'dsm-muted',
        style: { marginTop: 6, color: 'var(--dsw-alias-status-success)' }
      }, updateState.notice) : null;
      const form = draft ? React.createElement('div', { className: 'dsm-card' },
        React.createElement('div', { className: 'dsm-section-title' }, t.add),
        React.createElement('div', { className: 'dsm-form-grid' },
          field('name', t.name), field('host', t.host), field('port', t.port, 'number'), field('username', t.username),
          field('privateKeyPath', t.keyPath), field('privateKey', t.key, 'password'), field('passphrase', t.passphrase, 'password'), field('password', t.password, 'password'), React.createElement('div', { className: 'dsm-field' }, React.createElement('label', null, t.auth), React.createElement('select', { className: 'dsm-input', value: draft?.authType || 'key', onChange: (event) => setDraft((old) => ({ ...old, authType: event.target.value })) }, React.createElement('option', { value: 'key' }, t.key), React.createElement('option', { value: 'password' }, t.password)))
        ),
        keygenBlock,
        React.createElement('div', { className: 'dsm-muted' }, t.keyHint, ' · ', t.keepSecret),
        React.createElement('div', { className: 'dsm-row' },
          React.createElement('button', { className: 'dsm-btn', type: 'button', disabled: busy, onClick: testConnection }, busy ? t.testing : t.test),
          React.createElement('button', { className: 'dsm-btn dsm-btn-primary', type: 'button', disabled: busy, onClick: save }, busy ? t.saving : t.save),
          React.createElement('button', { className: 'dsm-btn', type: 'button', onClick: () => setDraft(null) }, t.cancel)
        ),
        testResult ? React.createElement('div', { className: 'dsm-muted' }, testResult) : null
      ) : null;
      return React.createElement('div', { className: 'dsm-root' },
        React.createElement('div', { className: 'dsm-card' },
          React.createElement('div', { className: 'dsm-head' },
            React.createElement('div', null, React.createElement('div', { className: 'dsm-title' }, t.title), React.createElement('div', { className: 'dsm-sub' }, t.subtitle)),
            React.createElement('button', { className: 'dsm-btn dsm-btn-primary', type: 'button', onClick: () => edit(null) }, t.add)
          ),
          state.profiles.length ? profileRows : React.createElement('div', { className: 'dsm-muted' }, t.noServers)
        ),
        updaterBlock,
        noticeBlock,
        form,
        error ? React.createElement('div', { className: 'dsm-error' }, error) : null
      );
    }
    // Settings surface for the current DSH core (#25). The page owns title, icon,
    // breadcrumb and paddings, so the form is rendered bare: no second card frame
    // around the existing SettingsCard. `view:'summary'` is the one-liner shown
    // under the plugin title, `view:'page'` is the settings form itself.
    function PluginConfigView(props) {
      React.useEffect(() => { ensureCss(); }, []);
      const ctx = (props && props.ctx) || null;
      if (props && props.view === 'summary') {
        return React.createElement('div', { className: 'dsm-sub' }, labels(ctx).subtitle);
      }
      return React.createElement('div', { className: 'dsm-page' }, React.createElement(SettingsCard, { ctx }));
    }
    function register(ctx) {
      const registerLocale = () => ctx.locale?.register?.(NS, { en, zh });
      if (ctx.effect) ctx.effect(registerLocale, 'dsh-server-monitor: dictionaries');
      else registerLocale();
      const registerRowConfig = () => ctx.slots?.register?.({ name: 'plugins.row.config', key: ROW_CONFIG_KEY, locale: NS, inject: () => ({ ctx }) }, PluginConfigView);
      try { if (ctx.slots?.inject) ctx.slots.inject('plugins.row.config', registerRowConfig); else registerRowConfig(); } catch (error) { console.warn('[dsh-server-monitor] row config slot registration failed', error); }
      // Plugins page list seat (`plugins.item`, DSH 0.1.6-alpha.2+): the page lists
      // this entry as a card of its own and opens the settings form from it, which
      // is the only seat the current core renders a configure control for. The
      // label is a static string on purpose: reading ctx.t inside a slot label
      // throws and takes the whole client batch down.
      const registerPluginItem = () => ctx.slots?.register?.({ name: 'plugins.item', id: ROW_ID, order: 60, label: () => 'Server Monitor', locale: NS, inject: () => ({ ctx }) }, PluginConfigView);
      try { if (ctx.slots?.inject) ctx.slots.inject('plugins.item', registerPluginItem); else registerPluginItem(); } catch (error) { console.warn('[dsh-server-monitor] plugins.item slot registration failed', error); }
      const registerSettings = () => ctx.slots?.register?.({ name: 'settings.plugin.item', key: NS, locale: NS, inject: () => ({ ctx }) }, SettingsCard);
      try { if (ctx.slots?.inject) ctx.slots.inject('settings.plugin.item', registerSettings); else registerSettings(); } catch (error) { console.warn('[dsh-server-monitor] settings slot registration failed', error); }
      try { ctx.inject?.(['sidebarRightTabs'], (sctx) => { const tabs = sctx?.sidebarRightTabs; if (!tabs?.register) return; const t = labels(ctx); const definition = { id: '@goodandready/dsh-server-monitor', kind: 'server-monitor', priority: 'extension', title: () => t.servers, guide: [{ order: 40, title: () => t.title, description: () => t.guideDescription, icon: () => React.createElement('span', null, '◫') }] }; const registerTab = () => tabs.register(definition); if (sctx.effect) sctx.effect(registerTab); else registerTab(); const registerPane = () => ctx.slots?.register?.({ name: 'sidebar.right.pane.tab', key: '@goodandready/dsh-server-monitor', locale: NS, inject: () => ({ ctx }) }, MonitorPane); if (ctx.slots?.inject) ctx.slots.inject('sidebar.right.pane.tab', registerPane); else registerPane(); }); } catch (error) { console.warn('[dsh-server-monitor] native sidebar registration failed', error); }
      try { ctx.inject?.(['betterSidebar'], (sctx) => { const service = sctx?.betterSidebar; if (!service?.registerTab) return; const registerTab = () => service.registerTab({ id: 'dsh-server-monitor:tab', title: () => labels(ctx).servers, icon: () => React.createElement('span', null, '◫'), order: 40, component: ({ scope }) => React.createElement(MonitorPane, { ctx, scope }) }); if (sctx.effect) sctx.effect(registerTab); else registerTab(); }); } catch (error) { console.warn('[dsh-server-monitor] legacy sidebar registration failed', error); }
    }
    module.exports.inject = ['slots', 'locale'];
    module.exports.apply = register;
    module.exports._test = { en, zh, labels, register, PKG, ROW_ID, ROW_CONFIG_KEY, PluginConfigView };
    return module.exports;
  }
});
