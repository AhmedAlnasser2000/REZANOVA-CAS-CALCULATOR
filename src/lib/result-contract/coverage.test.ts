import { describe, expect, it } from 'vitest';
import { goldenCases } from '../__golden__/golden-cases';
import { runGoldenCase, type GoldenExecution } from '../__golden__/golden-execution';
import {
  collectCanonicalRuntimeMathFragments,
  collectTableResponseMathFragments,
  normalizePrintHygieneValue,
} from '../display/print-hygiene';
import { HISTORY_REPLAY_FIXTURES } from '../history-replay/fixtures';
import { executeHistoryReplayRequest } from '../history-replay/native-execution';
import type { HistoryReplayExecution } from '../history-replay/fixture-contract';
import { validateCanonicalRuntimeOutcome } from './runtime-outcome';

const REMOVED_RESULT_KEYS = [
  'title',
  'exactLatex',
  'primaryMath',
  'answerRows',
  'branchReadback',
  'systemReadback',
  'periodicFamily',
  'exactSupplementLatex',
  'approxText',
  'detailSections',
  'warnings',
  'answerMode',
  'answerDomain',
  'solutionKind',
  'solveSummaryParts',
] as const;

function stableMathValues(execution: GoldenExecution | HistoryReplayExecution) {
  return [
    ...collectCanonicalRuntimeMathFragments(execution.outcome),
    ...collectTableResponseMathFragments(execution.tableResponse),
  ]
    .filter((fragment) => fragment.kind !== 'action')
    .map((fragment) => normalizePrintHygieneValue(fragment.value));
}

function assertCanonicalExecution(
  execution: GoldenExecution | HistoryReplayExecution,
  label: string,
) {
  const validation = validateCanonicalRuntimeOutcome(execution.outcome);
  expect(validation.ok, label).toBe(true);
  if (!validation.ok) throw new Error(`${label}: ${validation.failure.message}`);
  expect(structuredClone(validation.validated.value), `${label} clone parity`)
    .toEqual(validation.validated.value);
  expect(stableMathValues({ ...execution, outcome: validation.validated.value }), `${label} math parity`)
    .toEqual(stableMathValues(execution));

  if (execution.outcome.kind !== 'prompt') {
    const record = execution.outcome as unknown as Record<string, unknown>;
    for (const key of REMOVED_RESULT_KEYS) {
      expect(record, `${label} removed top-level ${key}`).not.toHaveProperty(key);
    }
  }
}

describe('canonical runtime corpus coverage', () => {
  it('carries all 46 golden executions without compatibility result fields', async () => {
    expect(goldenCases).toHaveLength(46);
    for (const goldenCase of goldenCases) {
      assertCanonicalExecution(await runGoldenCase(goldenCase), goldenCase.id);
    }
  }, 60_000);

  it('carries all 100 deterministic History replay executions without compatibility result fields', async () => {
    expect(HISTORY_REPLAY_FIXTURES).toHaveLength(100);
    for (const fixture of HISTORY_REPLAY_FIXTURES) {
      assertCanonicalExecution(
        await executeHistoryReplayRequest(fixture.workspace, fixture.request),
        fixture.id,
      );
    }
  }, 120_000);
});
