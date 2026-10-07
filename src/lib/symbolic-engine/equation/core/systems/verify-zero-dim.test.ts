import { describe as group, expect, it } from 'vitest';
import { DEFAULT_EQUATION_LIMITS } from '../../../../new-equation/types';
import { lowerEquation } from '../../service/input';
import { decideEquation, verifyEquationOutcome } from '../decide';
import { EquationAlgebraError, ExecutionContext } from '../execution';
import { ExpressionStore } from '../representation/expression';
import type { EquationOutcome, SolutionSet } from '../representation/solution-set';

// NEW-EQUATION-RESPONSIVE1: x³y² + x = 4y, x + y = 7 − x² took 11 s (ℝ) and 66 s (ℂ) to verify by substituting
// points whose coordinates are separate degree-7 algebraic numbers; in one number field it takes well under 1 s.
const ROWS = ['x^3y^2+x=4y', 'x+y=7-x^2'];
function setup(domain: 'real' | 'complex', work: number) {
  const ctx = new ExecutionContext({ ...DEFAULT_EQUATION_LIMITS, work });
  const store = new ExpressionStore(ctx);
  const { problem } = lowerEquation(store, { rows: ROWS, targets: ['x', 'y'], domain, limits: { ...DEFAULT_EQUATION_LIMITS }, digits: 6 });
  const outcome = decideEquation(problem) as Extract<EquationOutcome, { kind: 'solved' }>;
  if (outcome.kind !== 'solved' || outcome.set.kind !== 'finite') throw new Error(outcome.kind);
  return { problem, outcome, set: outcome.set, ctx };
}
const rejects = (f: () => void, reason: RegExp) => {
  let caught: unknown;
  try { f(); } catch (e) { caught = e; }
  expect(caught).toBeInstanceOf(EquationAlgebraError);
  expect((caught as EquationAlgebraError).reason).toMatch(reason);
};

group('finite system points verified in one number field', () => {
  it('verifies the degree-7 system over ℝ and ℂ within a small work budget', () => {
    // Deciding takes about 0.35M (ℝ) and 4.5M (ℂ) work units and verifying about 0.2M and 0.45M; the old
    // substitution spent tens of seconds in composed resultants.
    for (const [domain, budget, count] of [['real', 2_000_000, 1], ['complex', 8_000_000, 7]] as const) {
      const { problem, outcome, set } = setup(domain, budget);
      expect(set.kind === 'finite' && set.points.length).toBe(count);
      verifyEquationOutcome(problem, outcome);
    }
  });

  it('rejects a coordinate from another solution, a conjugate swapped in and a missing point', () => {
    const { problem, outcome, set } = setup('complex', 20_000_000);
    if (set.kind !== 'finite') throw new Error(set.kind);
    const claim = (s: SolutionSet) => () => verifyEquationOutcome(problem, { ...outcome, set: s });
    const [a, b] = set.points;
    rejects(claim({ ...set, points: [[a[0], b[1]], ...set.points.slice(1)] }), /does not satisfy/);
    const complex = set.points.findIndex(p => p[1].kind === 'algebraic' && p[1].root.kind === 'complex');
    const partner = set.points.findIndex((p, i) => i !== complex && p[1].kind === 'algebraic' && p[1].root.kind === 'complex');
    const mixed = set.points.map((p, i) => (i === complex ? [p[0], set.points[partner][1]] : p));
    rejects(claim({ ...set, points: mixed }), /does not satisfy/);
    rejects(claim({ ...set, points: set.points.slice(1) }), /number of points/);
  });
});
