import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8');

test('client registers the native right sidebar pane and legacy compatibility tab', () => {
  assert.match(source, /sidebarRightTabs/);
  assert.match(source, /sidebar\.right\.pane\.tab/);
  assert.match(source, /betterSidebar/);
  assert.match(source, /dsh-server-monitor/);
});

test('client contains English and Chinese labels and refreshes every 15 seconds', () => {
  assert.match(source, /const en =/);
  assert.match(source, /const zh =/);
  assert.match(source, /setInterval\(tick, 15000\)/);
});
