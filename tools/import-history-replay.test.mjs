import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

test('imports allowlisted sanitized candidates only beneath .task_tmp', async () => {
  const cwd = await mkdtemp(resolve(tmpdir(), 'history-replay-import-'));
  const input = resolve(cwd, 'history.json');
  await writeFile(input, JSON.stringify({ history: [{
    id: 'private-id',
    mode: 'calculate',
    inputLatex: '2+2',
    resultLatex: '4',
    timestamp: 'private-time',
    replaySnapshot: { version: 1, ansLatex: '0' },
  }] }));
  const result = spawnSync(process.execPath, [resolve('tools/import-history-replay.mjs'), '--input', input], {
    cwd,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(await readFile(
    resolve(cwd, '.task_tmp/history-replay-import/candidates.json'),
    'utf8',
  ));
  assert.deepEqual(output.candidates, [{
    candidateId: 'candidate-0001',
    mode: 'calculate',
    inputLatex: '2+2',
    replaySnapshot: { version: 1, ansLatex: '0' },
  }]);
});
