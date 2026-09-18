import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('..', import.meta.url);
const source = fs.readFileSync(new URL('lib/client.js', root), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('package.json', root), 'utf8'));
const patch = fs.readFileSync(new URL('cordis.patch.yml', root), 'utf8');

// The row id the loader mounts this plugin under; the core builds the settings
// key as `rowConfigKey(bundle, rowId)` = `<package name>#<row id>`.
function rowIdFromPatch(text) {
  const match = /^\s*-\s*id:\s*(\S+)\s*$/m.exec(text);
  return match ? match[1] : '';
}

function loadClient() {
  let definition;
  vm.runInNewContext(source, { window: { __ModuleLoader__: { load(value) { definition = value; } } } });
  return definition.factory((name) => {
    if (name === 'react') {
      return {
        Fragment: Symbol('Fragment'),
        createElement(type, props, ...children) { return { type, props: props || {}, children }; },
        useEffect(fn) { fn(); },
      };
    }
    throw new Error(`Unexpected client dependency: ${name}`);
  });
}

function capture() {
  const registered = [];
  const injected = [];
  const ctx = {
    locale: { register() {} },
    effect(fn) { fn(); return () => {}; },
    slots: {
      inject(name, cb) { injected.push(name); cb(); },
      register(options, component) { registered.push({ options, component }); return { dispose() {} }; },
    },
  };
  return { ctx, registered, injected };
}

test('settings surface is registered into plugins.row.config under <package>#<row id>', () => {
  const client = loadClient();
  const { ctx, registered, injected } = capture();
  client._test.register(ctx);

  const rowId = rowIdFromPatch(patch);
  assert.equal(rowId, 'dsh-server-monitor', 'cordis.patch.yml row id');
  assert.equal(client._test.ROW_CONFIG_KEY, `${pkg.name}#${rowId}`);
  assert.equal(pkg.name, '@goodandready/dsh-server-monitor');

  assert.equal(injected[0], 'plugins.row.config', 'the row settings slot is wired first');
  const row = registered.find((entry) => entry.options.name === 'plugins.row.config');
  assert.ok(row, 'plugins.row.config must be registered');
  assert.equal(row.options.key, client._test.ROW_CONFIG_KEY);
  assert.equal(row.options.locale, 'dsh-server-monitor');
  assert.equal(typeof row.component, 'function');
  assert.equal(typeof row.options.inject, 'function');
  assert.equal(row.options.inject().ctx, ctx);
});

test('legacy placements are preserved as fallback', () => {
  const client = loadClient();
  const { ctx, registered, injected } = capture();
  client._test.register(ctx);

  assert.ok(injected.includes('settings.plugin.item'), 'legacy settings.plugin.item stays wired');
  const legacy = registered.find((entry) => entry.options.name === 'settings.plugin.item');
  assert.ok(legacy, 'legacy settings.plugin.item stays registered');
  assert.equal(legacy.options.key, 'dsh-server-monitor');
});

test('row view renders a summary line and a bare page form', () => {
  const client = loadClient();
  const View = client._test.PluginConfigView;

  const summary = View({ view: 'summary', ctx: null });
  assert.equal(summary.type, 'div');
  assert.equal(summary.props.className, 'dsm-sub');
  assert.equal(summary.children[0], client._test.en.subtitle);

  const page = View({ view: 'page', ctx: null });
  assert.equal(page.props.className, 'dsm-page', 'the page supplies its own frame and paddings');
  assert.equal(typeof page.children[0].type, 'function', 'the settings form component is reused');
  assert.doesNotMatch(source, /dsm-page .*dsm-card\{/, 'no extra card frame is drawn around the form');
});
