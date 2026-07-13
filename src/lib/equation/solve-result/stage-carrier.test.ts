import { describe, expect, it } from 'vitest';
import { proseSolveSummary } from '../../display/result-detail-lines';
import { mergeEquationStageCarriers } from '../guarded/merge';
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
