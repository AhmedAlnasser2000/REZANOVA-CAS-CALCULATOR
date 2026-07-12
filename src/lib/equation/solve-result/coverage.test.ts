import { describe, expect, it } from 'vitest';
import { goldenCases } from '../../__golden__/golden-cases';
import { runGoldenCase } from '../../__golden__/golden-execution';
import { HISTORY_REPLAY_FIXTURES } from '../../history-replay/fixtures';
import { executeHistoryReplayRequest } from '../../history-replay/native-execution';
import { projectDisplayOutcomeToCanonicalResult } from '../../result-contract';
import { projectEquationDisplayOutcomeToSolveResult } from './compatibility';
import { validateEquationSolveResultContract } from './validation';

function assertCarrier(outcome: Awaited<ReturnType<typeof runGoldenCase>>['outcome'], label: string) {
  const direct = projectDisplayOutcomeToCanonicalResult(outcome);
  if (!direct.ok) {
    throw new Error(`${label}: ${direct.failure.reason}: ${direct.failure.message}`);
  }
  const projected = projectEquationDisplayOutcomeToSolveResult(outcome);
  if (!projected.ok) {
    throw new Error(`${label}: ${projected.failure.reason}`);
  }
  expect(projected.result.document, `${label} canonical document`).toEqual(direct.document);
  expect(validateEquationSolveResultContract(projected.result).ok, `${label} contract`).toBe(true);
  expect(structuredClone(projected.result), `${label} clone parity`).toEqual(projected.result);
}

describe('Equation solve result corpus coverage', () => {
  it('carries every Equation golden execution without changing the canonical document', async () => {
    const cases = goldenCases.filter((goldenCase) => goldenCase.mode === 'equation');
    expect(cases).toHaveLength(6);
    for (const goldenCase of cases) {
      assertCarrier((await runGoldenCase(goldenCase)).outcome, goldenCase.id);
    }
  }, 60_000);

  it('carries all 25 sanitized Equation replay executions', async () => {
    const fixtures = HISTORY_REPLAY_FIXTURES.filter((fixture) => fixture.workspace === 'equation');
    expect(fixtures).toHaveLength(25);
    for (const fixture of fixtures) {
      const execution = await executeHistoryReplayRequest(fixture.workspace, fixture.request);
      assertCarrier(execution.outcome, fixture.id);
    }
  }, 60_000);
});
