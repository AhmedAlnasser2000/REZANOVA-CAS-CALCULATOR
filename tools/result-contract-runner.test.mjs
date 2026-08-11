import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Writable } from 'node:stream';
import {
  resultContractVitestArgs,
  runResultContractCommand,
} from './result-contract-runner-core.mjs';

function sink() {
  return new Writable({ write(_chunk, _encoding, callback) { callback(); } });
}

test('defaults the result-contract suite to four workers and forwards caller arguments', () => {
  assert.deepEqual(
    resultContractVitestArgs(['--reporter=dot']),
    [
      'node_modules/vitest/vitest.mjs',
      'run',
      'src/lib/result-contract',
      '--maxWorkers=4',
      '--reporter=dot',
    ],
  );
  assert.deepEqual(
    resultContractVitestArgs(['--maxWorkers=1']),
    [
      'node_modules/vitest/vitest.mjs',
      'run',
      'src/lib/result-contract',
      '--maxWorkers=1',
    ],
  );
});

test('fails a successful child when either output stream contains a compilation fallback', async () => {
  for (const script of [
    "process.stdout.write('Compilation fallback for formal operator')",
    "process.stderr.write('Compilation fallback for formal operator')",
  ]) {
    const status = await runResultContractCommand({
      callerArgs: [],
      command: process.execPath,
      commandArgs: ['-e', script],
      stdout: sink(),
      stderr: sink(),
    });
    assert.equal(status, 1);
  }
});

test('preserves a successful child status when no fallback is emitted', async () => {
  const status = await runResultContractCommand({
    callerArgs: [],
    command: process.execPath,
    commandArgs: ['-e', "process.stdout.write('all clear')"],
    stdout: sink(),
    stderr: sink(),
  });
  assert.equal(status, 0);
});
