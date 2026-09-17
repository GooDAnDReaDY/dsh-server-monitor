import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8');

function clientTestExports() {
  let definition;
  vm.runInNewContext(source, { window: { __ModuleLoader__: { load(value) { definition = value; } } } });
  return definition.factory((name) => {
    if (name === 'react') return { Fragment: Symbol('Fragment'), createElement() {} };
    throw new Error(`Unexpected client dependency: ${name}`);
  })._test;
}

test('client registers the native right sidebar pane and legacy compatibility tab', () => {
  assert.match(source, /sidebarRightTabs/);
  assert.match(source, /sidebar\.right\.pane\.tab/);
  assert.match(source, /betterSidebar/);
  assert.match(source, /dsh-server-monitor/);
});

test('client contains matching English/Chinese labels and refreshes every 15 seconds', () => {
  assert.match(source, /setInterval\(tick, 15000\)/);
  assert.doesNotMatch(source, /getSnapshot\(\)\?\.active/);
  const { en, zh } = clientTestExports();
  assert.deepEqual(Object.keys(en).sort(), Object.keys(zh).sort());
});

test('locale dictionaries register in effect, clean up, and support external Russian translation', () => {
  const { register, labels, en, zh } = clientTestExports();
  const dictionaries = new Map();
  const cleanups = [];
  const ctx = {
    locale: {
      register(namespace, values) {
        dictionaries.set(namespace, { ...values });
        return () => dictionaries.delete(namespace);
      },
      bind(namespace) {
        return (key) => dictionaries.get(namespace)?.ru?.[key] ?? dictionaries.get(namespace)?.en?.[key] ?? key;
      }
    },
    effect(callback, name) {
      assert.equal(name, 'dsh-server-monitor: dictionaries');
      cleanups.push(callback());
    },
    inject() {}
  };
  register(ctx);
  assert.deepEqual(Object.keys(dictionaries.get('dsh-server-monitor').en).sort(), Object.keys(en).sort());
  assert.deepEqual(Object.keys(dictionaries.get('dsh-server-monitor').zh).sort(), Object.keys(zh).sort());
  dictionaries.get('dsh-server-monitor').ru = { title: 'Монитор серверов' };
  assert.equal(labels(ctx).title, 'Монитор серверов');
  cleanups.pop()();
  assert.equal(dictionaries.has('dsh-server-monitor'), false);
  register(ctx);
  assert.equal(labels(ctx).title, en.title);
  cleanups.pop()();
});
