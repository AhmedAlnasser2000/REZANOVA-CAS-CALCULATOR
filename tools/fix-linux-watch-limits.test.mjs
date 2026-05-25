import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyLinuxWatchLimitFix,
  buildLinuxWatchLimitFixInstructions,
  calcwizInotifyConfig,
  calcwizInotifyConfigPath,
} from './fix-linux-watch-limits.mjs';

test('watch-limit fix instructions point to the npm repair command', () => {
  const instructions = buildLinuxWatchLimitFixInstructions();

  assert.match(instructions, /npm run fix:linux-watch-limits/);
  assert.match(instructions, new RegExp(calcwizInotifyConfigPath.replaceAll('.', '\\.')));
  assert.match(instructions, /sudo sysctl --system/);
});

test('watch-limit fix writes the expected sysctl file and reloads sysctl', () => {
  const calls = [];
  const result = applyLinuxWatchLimitFix({
    platform: 'linux',
    execFile: (command, args, options) => {
      calls.push({ command, args, input: options?.input });
    },
  });

  assert.equal(result.ok, true);
  assert.deepEqual(calls, [
    {
      command: 'sudo',
      args: ['tee', calcwizInotifyConfigPath],
      input: calcwizInotifyConfig,
    },
    {
      command: 'sudo',
      args: ['sysctl', '--system'],
      input: undefined,
    },
  ]);
});

test('watch-limit fix is Linux-only', () => {
  const result = applyLinuxWatchLimitFix({
    platform: 'darwin',
    execFile: () => {
      throw new Error('should not run');
    },
  });

  assert.equal(result.ok, false);
  assert.match(result.message, /only needed on Linux/);
});
