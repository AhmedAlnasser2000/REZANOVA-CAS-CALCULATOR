import { describe, expect, it } from 'vitest';
import { proseSolveSummary } from '../../display/result-detail-lines';
import { mergeEquationStageCarriers } from '../guarded/merge';
import {
  consumeCandidateValidatedReadbackPermission,
  grantCandidateValidatedReadbackPermission,
} from '../candidate-validated-readback';
import { createEquationResultOutcome } from './producer';
import {
  buildEquationStageResultCarrier,
  readEquationStageResultCarrier,
} from './stage-carrier';
import { validateEquationSolveResultContract } from './validation';

function solved(exactLatex: string) {
  return createEquationResultOutcome({
    kind: 'success',
    title: 'Solve',
    exactLatex,
    warnings: [],
    resultOrigin: 'symbolic',
    plannerBadges: [],
    solveBadges: [],
    ...proseSolveSummary('Solved through a guarded branch.'),
  });
}

describe('Equation stage result carrier', () => {
  it('round-trips a canonical result through clone-safe Equation evidence', () => {
    const carrier = buildEquationStageResultCarrier(solved('x=1'));
    const cloned = structuredClone(carrier);

    expect(validateEquationSolveResultContract(cloned).ok).toBe(true);
    expect(readEquationStageResultCarrier(cloned)).toMatchObject({
      kind: 'success',
      exactLatex: 'x=1',
      solveSummaryParts: [[{ kind: 'text', text: 'Solved through a guarded branch.' }]],
    });
  });

  it('moves candidate-validated readback permission without serializing or duplicating it', () => {
    const carrier = buildEquationStageResultCarrier(
      grantCandidateValidatedReadbackPermission(solved('x\\approx1'), 'same-base-log-equality'),
    );

    expect(JSON.stringify(carrier)).not.toContain('candidate-validated');
    const outcome = readEquationStageResultCarrier(carrier);
    expect(consumeCandidateValidatedReadbackPermission(outcome, 'same-base-log-equality')).toBe(true);
    expect(consumeCandidateValidatedReadbackPermission(outcome, 'same-base-log-equality')).toBe(false);

    const clonedCarrier = structuredClone(buildEquationStageResultCarrier(
      grantCandidateValidatedReadbackPermission(solved('x\\approx2'), 'same-base-log-equality'),
    ));
    const clonedOutcome = readEquationStageResultCarrier(clonedCarrier);
    expect(consumeCandidateValidatedReadbackPermission(clonedOutcome, 'same-base-log-equality')).toBe(false);
  });

  it('merges guarded branches without transporting Display outcomes', () => {
    const merged = mergeEquationStageCarriers(
      [solved('x=1'), solved('x=2')].map(buildEquationStageResultCarrier),
      ['Nested Recursion'],
      proseSolveSummary('Merged two guarded branches.'),
    );

    expect(readEquationStageResultCarrier(merged)).toMatchObject({
      kind: 'success',
      exactLatex: 'x\\in\\left\\{1, 2\\right\\}',
      solveBadges: ['Nested Recursion'],
    });
  });

  it('rejects prompt control flow', () => {
    expect(() => buildEquationStageResultCarrier({
      kind: 'prompt',
      title: 'Solve',
      message: 'Choose a target.',
      targetMode: 'equation',
      carryLatex: 'x=1',
      warnings: [],
    })).toThrow('Equation stage carrier rejected');
  });
});
