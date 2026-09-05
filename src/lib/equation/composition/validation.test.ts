import { describe, expect, it } from 'vitest';
import {
  collectOutcomeCandidates,
  matchAcceptedExactSolutions,
  validateCompositionCandidates,
} from './validation';

describe('composition candidate validation', () => {
  it('preserves accepted-root order while deduping a multi-candidate batch', () => {
    const validation = validateCompositionCandidates(
      'x^2=1',
      [1, -1, 1 + 1e-7, 3],
      [],
      'rad',
    );

    expect(validation.accepted).toEqual([-1, 1]);
    expect(validation.rejected).toEqual([{
      kind: 'rejected',
      value: 3,
      reason: 'does not satisfy the original equation after substitution',
    }]);
  });

  it.each([
    { angleUnit: 'rad' as const, candidate: Math.PI / 2 },
    { angleUnit: 'deg' as const, candidate: 90 },
    { angleUnit: 'grad' as const, candidate: 100 },
  ])('preserves composition residual handling in $angleUnit mode', ({ angleUnit, candidate }) => {
    const validation = validateCompositionCandidates(
      String.raw`\sin(x)=1`,
      [candidate],
      [],
      angleUnit,
    );

    expect(validation.accepted).toEqual([candidate]);
    expect(validation.rejected).toEqual([]);
  });

  it('preserves composition domain, undefined, residual, and tolerance rejection wording', () => {
    expect(validateCompositionCandidates('x^2=1', [-1], [{
      kind: 'positive',
      expressionLatex: 'x',
    }], 'rad').rejected[0]).toEqual({
      kind: 'rejected',
      value: -1,
      reason: expect.stringContaining('non-positive'),
    });
    expect(validateCompositionCandidates(String.raw`\frac{1}{x-1}=0`, [1], [], 'rad')
      .rejected[0]).toEqual({
        kind: 'rejected',
        value: 1,
        reason: 'produces an undefined or non-real substitution',
      });
    expect(validateCompositionCandidates('x=1', [1 + 4e-7], [], 'rad').accepted)
      .toHaveLength(1);
    expect(validateCompositionCandidates('x=1', [1 + 2e-6], [], 'rad').rejected[0]).toEqual({
      kind: 'rejected',
      value: 1 + 2e-6,
      reason: 'does not satisfy the original equation after substitution',
    });
  });

  it('prefers producer candidates and pairs their exact branches without reparsing', () => {
    const outcome = {
      kind: 'success' as const,
      title: 'Solve',
      exactLatex: String.raw`x\in\left\{-1,1\right\}`,
      approxText: 'x ~= stale',
      candidateValues: [1, -1, 1 + 1e-7],
      warnings: [],
    };
    expect(collectOutcomeCandidates(outcome)).toEqual([-1, 1]);
    expect(matchAcceptedExactSolutions(
      outcome.exactLatex,
      [-1, 1],
      undefined,
      ['1', '-1'],
    )).toEqual(['-1', '1']);
  });
});
