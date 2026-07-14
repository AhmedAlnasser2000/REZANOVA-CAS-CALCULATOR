import { describe, expect, it } from 'vitest';
import { goldenCases } from '../../__golden__/golden-cases';
import { runGoldenCase } from '../../__golden__/golden-execution';
import { HISTORY_REPLAY_FIXTURES } from '../../history-replay/fixtures';
import { executeHistoryReplayRequest } from '../../history-replay/native-execution';
import type { CanonicalRuntimeOutcome } from '../../../types/calculator';
import { buildEquationSolveResultContract } from './factory';
import { validateEquationSolveResultContract } from './validation';

function assertCarrier(outcome: CanonicalRuntimeOutcome, label: string) {
  if (outcome.kind === 'prompt') throw new Error(`${label}: unexpected prompt.`);
  const carrier = buildEquationSolveResultContract({
    document: outcome.canonicalResult,
    ...(outcome.kind === 'error'
      ? {
          controlledStop: {
            code: 'equation-runtime-error',
            message: outcome.canonicalResult.error ?? 'Equation stopped.',
            source: 'producer' as const,
          },
        }
      : {}),
  });
  expect(carrier.document, `${label} canonical authority`).toEqual(outcome.canonicalResult);
  expect(validateEquationSolveResultContract(carrier).ok, `${label} contract`).toBe(true);
  expect(structuredClone(carrier), `${label} clone parity`).toEqual(carrier);
}

describe('Equation solve result corpus coverage', () => {
  it('carries every Equation golden execution without changing canonical authority', async () => {
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
