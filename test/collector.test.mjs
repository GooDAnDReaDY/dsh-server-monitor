import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSnapshot, sectionStatus } from '../lib/linux-collector.js';

const fixture = [
  '__DSH_SECTION__:identity',
  'node-a',
  'Linux',
  '6.8.0',
  'x86_64',
  'AMD EPYC 7B13',
  '8',
  '__DSH_SECTION__:system',
  '0.10 0.20 0.30 1/250 12345',
  'up 3 days, 2 hours',
  '              total        used        free      shared  buff/cache   available',
  'Mem:           16000        4000        8000         100         4000       11500',
  'Swap:           2048           0        2048',
  '__DSH_SECTION__:disk',
  'Filesystem 1024-blocks Used Available Capacity Mounted on',
  '/dev/sda1 100000000 40000000 60000000 40% /',
  '__DSH_SECTION__:processes',
  '100 node 12.3 4.5 app',
  '200 nginx 2.0 1.2 root',
  '__DSH_SECTION__:containers',
  '{"ID":"abc","Names":"web","Image":"nginx:latest","Status":"Up 2 hours","State":"running"}',
  '__DSH_SECTION__:network',
  '  eth0: 1000 10 20 0 0 0 0 0 2000 30 40 0 0 0 0 0',
  '__DSH_SECTION__:ports',
  'tcp LISTEN 0 128 0.0.0.0:22 0.0.0.0:* users:(("sshd",pid=1,fd=3))'
].join('\n');

test('parses a complete Linux snapshot into normalized sections', () => {
  const snapshot = parseSnapshot(fixture);
  assert.equal(snapshot.identity.hostname, 'node-a');
  assert.equal(snapshot.identity.cpuCores, 8);
  assert.equal(snapshot.system.memory.totalMb, 16000);
  assert.equal(snapshot.system.memory.usedMb, 4000);
  assert.equal(snapshot.disks[0].mount, '/');
  assert.equal(snapshot.processes[0].pid, 100);
  assert.equal(snapshot.containers[0].name, 'web');
  assert.equal(snapshot.network.interfaces[0].name, 'eth0');
  assert.equal(snapshot.ports[0].port, 22);
});

test('marks missing or empty sections unavailable without failing the snapshot', () => {
  const snapshot = parseSnapshot('__DSH_SECTION__:identity\nnode-a\nLinux\n6.8\nx86_64\nCPU\n2\n__DSH_SECTION__:system\n');
  assert.equal(sectionStatus(snapshot.identity), 'ready');
  assert.equal(sectionStatus(snapshot.system), 'unavailable');
  assert.equal(snapshot.status, 'partial');
});
