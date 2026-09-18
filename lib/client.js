window.__ModuleLoader__.load({
  id: '@goodandready/dsh-server-monitor',
  factory: (require) => {
    var module = { exports: {} };
    const React = require('react');
    const NS = 'dsh-server-monitor';
    const API = '/dsh-server-monitor';

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
      saving: 'Saving…', testing: 'Testing…', select: 'Select server'
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
      saving: '保存中…', testing: '测试中…', select: '选择服务器'
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
      style.dataset.dshPlugin = NS;
      style.textContent = `
.dsm-root{display:flex;flex-direction:column;gap:12px;padding:4px 0 18px;color:var(--dsw-alias-label-primary)}
.dsm-card{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:10px}
.dsm-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}.dsm-title{font-size:15px;font-weight:700}.dsm-sub{font-size:11px;color:var(--dsw-alias-label-secondary);margin-top:3px}
.dsm-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:7px}.dsm-stat{border:1px solid var(--dsw-alias-border-l2);border-radius:7px;padding:8px;background:var(--dsw-alias-bg-layer-2);min-width:0}.dsm-val{font-size:13px;font-weight:650;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dsm-label{font-size:10px;color:var(--dsw-alias-label-secondary);margin-top:3px}
.dsm-section{display:flex;flex-direction:column;gap:6px}.dsm-section-title{font-size:12px;font-weight:650}.dsm-table{width:100%;border-collapse:collapse;font-size:11px}.dsm-table th,.dsm-table td{text-align:left;padding:5px 4px;border-bottom:1px solid var(--dsw-alias-border-l2);vertical-align:top}.dsm-table th{color:var(--dsw-alias-label-secondary);font-weight:550}.dsm-muted{color:var(--dsw-alias-label-secondary);font-size:11px}.dsm-badge{font-size:10px;border:1px solid var(--dsw-alias-border-l2);border-radius:999px;padding:2px 7px;white-space:nowrap}.dsm-ok{color:var(--dsw-alias-state-success-primary)}.dsm-warn{color:var(--dsw-alias-state-warning-primary)}.dsm-err{color:var(--dsw-alias-state-error-primary)}
.dsm-btn{appearance:none;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);border-radius:7px;padding:5px 9px;font:inherit;font-size:11px;cursor:pointer}.dsm-btn:disabled{opacity:.55;cursor:not-allowed}.dsm-btn-primary{background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-3);border-color:transparent}.dsm-row{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.dsm-field{display:flex;flex-direction:column;gap:4px;min-width:140px;flex:1}.dsm-field label{font-size:11px;color:var(--dsw-alias-label-secondary)}.dsm-input{height:30px;box-sizing:border-box;width:100%;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);border-radius:7px;padding:0 8px;font:inherit;font-size:12px}.dsm-input:focus{outline:none;border-color:var(--dsw-alias-state-brand-primary)}.dsm-form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:9px}.dsm-error{padding:8px;border:1px solid var(--dsw-alias-state-error-primary);border-radius:7px;color:var(--dsw-alias-state-error-primary);font-size:11px}.dsm-progress{height:5px;background:var(--dsw-alias-bg-layer-1);border-radius:4px;overflow:hidden;margin-top:5px}.dsm-progress>span{display:block;height:100%;background:var(--dsw-alias-state-brand-primary)}
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
        }, state.profiles.map((item) => React.createElement('option', { key: item.id, value: item.id }, item.name))) : null
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
      const [error, setError] = React.useState('');
      const [testResult, setTestResult] = React.useState('');
      const load = React.useCallback(() => request('/state').then(setState).catch((e) => setError(e.message)), []);
      React.useEffect(() => { load(); }, [load]);
      const edit = (profile) => setDraft({ ...(profile || { id: '', name: '', host: '', port: 22, username: 'root', authType: 'key', privateKeyPath: '' }), password: '', privateKey: '', passphrase: '' });
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
      const form = draft ? React.createElement('div', { className: 'dsm-card' },
        React.createElement('div', { className: 'dsm-section-title' }, t.add),
        React.createElement('div', { className: 'dsm-form-grid' },
          field('name', t.name), field('host', t.host), field('port', t.port, 'number'), field('username', t.username),
          field('privateKeyPath', t.keyPath), field('privateKey', t.key, 'password'), field('passphrase', t.passphrase, 'password'), field('password', t.password, 'password'), React.createElement('div', { className: 'dsm-field' }, React.createElement('label', null, t.auth), React.createElement('select', { className: 'dsm-input', value: draft?.authType || 'key', onChange: (event) => setDraft((old) => ({ ...old, authType: event.target.value })) }, React.createElement('option', { value: 'key' }, t.key), React.createElement('option', { value: 'password' }, t.password)))
        ),
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
        form,
        error ? React.createElement('div', { className: 'dsm-error' }, error) : null
      );
    }
    function register(ctx) {
      const registerLocale = () => ctx.locale?.register?.(NS, { en, zh });
      if (ctx.effect) ctx.effect(registerLocale, 'dsh-server-monitor: dictionaries');
      else registerLocale();
      const registerSettings = () => ctx.slots?.register?.({ name: 'settings.plugin.item', key: NS, locale: NS, inject: () => ({ ctx }) }, SettingsCard);
      try { if (ctx.slots?.inject) ctx.slots.inject('settings.plugin.item', registerSettings); else registerSettings(); } catch (error) { console.warn('[dsh-server-monitor] settings slot registration failed', error); }
      try { ctx.inject?.(['sidebarRightTabs'], (sctx) => { const tabs = sctx?.sidebarRightTabs; if (!tabs?.register) return; const t = labels(ctx); const definition = { id: '@goodandready/dsh-server-monitor', kind: 'server-monitor', priority: 'extension', title: () => t.servers, guide: [{ order: 40, title: () => t.title, description: () => t.guideDescription, icon: () => React.createElement('span', null, '◫') }] }; const registerTab = () => tabs.register(definition); if (sctx.effect) sctx.effect(registerTab); else registerTab(); const registerPane = () => ctx.slots?.register?.({ name: 'sidebar.right.pane.tab', key: '@goodandready/dsh-server-monitor', locale: NS, inject: () => ({ ctx }) }, MonitorPane); if (ctx.slots?.inject) ctx.slots.inject('sidebar.right.pane.tab', registerPane); else registerPane(); }); } catch (error) { console.warn('[dsh-server-monitor] native sidebar registration failed', error); }
      try { ctx.inject?.(['betterSidebar'], (sctx) => { const service = sctx?.betterSidebar; if (!service?.registerTab) return; const registerTab = () => service.registerTab({ id: 'dsh-server-monitor:tab', title: () => labels(ctx).servers, icon: () => React.createElement('span', null, '◫'), order: 40, component: ({ scope }) => React.createElement(MonitorPane, { ctx, scope }) }); if (sctx.effect) sctx.effect(registerTab); else registerTab(); }); } catch (error) { console.warn('[dsh-server-monitor] legacy sidebar registration failed', error); }
    }
    module.exports.inject = ['slots', 'locale'];
    module.exports.apply = register;
    module.exports._test = { en, zh, labels, register };
    return module.exports;
  }
});
