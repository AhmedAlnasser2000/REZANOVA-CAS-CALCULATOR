import { describe, expect, it } from 'vitest';
import { CONTRACT_GOLDEN_CASES as goldenCases } from '../__golden__/golden-cases';
import { runGoldenCase } from '../__golden__/golden-execution';
import { executeHistoryReplayRequest } from '../history-replay/native-execution';
import { HISTORY_REPLAY_FIXTURES } from '../history-replay/fixtures';
import { MATHJSON_COVERAGE_EXEMPTIONS } from './mathjson-route-registry';

async function replay(id: string) {
  const fixture = HISTORY_REPLAY_FIXTURES.find((entry) => entry.id === id);
  if (!fixture) throw new Error(`Missing History replay fixture ${id}.`);
  const execution = await executeHistoryReplayRequest(fixture.workspace, fixture.request);
  if (execution.outcome.kind === 'prompt') throw new Error(`Unexpected prompt for ${id}.`);
  return execution.outcome.canonicalResult;
}

describe('Canonical Result V2 typed supplements and Table cells', () => {
  it.each([
    ['table-partial-domain', 'outside-real-domain', 0],
    ['table-reciprocal', 'pole', 1],
  ] as const)('types %s undefined cells and preserves defined neighbors', async (id, reason, index) => {
    const document = await replay(id);
    expect(document.version).toBe(2);
    if (document.version !== 2) throw new Error(`${id} did not select V2.`);
    expect(document.table?.rows[index]?.primary).toEqual({
      kind: 'undefined',
      reason,
      presentationLatex: 'undefined',
    });
    const defined = document.table?.rows
      .filter((_row, rowIndex) => rowIndex !== index)
      .map((row) => row.primary);
    expect(defined?.every((cell) => cell.kind === 'value' && cell.value.mathJson !== undefined))
      .toBe(true);
  });

  it('migrates the golden partial-domain Table case without residual exemptions', async () => {
    const goldenCase = goldenCases.find((entry) => entry.id === 'table-partial-real-domain');
    if (!goldenCase) throw new Error('Missing partial-domain Table golden case.');
    const execution = await runGoldenCase(goldenCase);
    if (execution.outcome.kind === 'prompt') throw new Error('Unexpected Table golden prompt.');
    expect(execution.outcome.canonicalResult.version).toBe(2);
    expect(MATHJSON_COVERAGE_EXEMPTIONS).toEqual([]);
  });
});
