import { describe as group, expect, it } from 'vitest';
import { DEFAULT_EQUATION_LIMITS } from '../../../../new-equation/types';
import { rational } from '../algebra/rational';
import { lowerEquation } from '../../service/input';
import { decideEquation, verifyEquationOutcome } from '../decide';
import { EquationAlgebraError, ExecutionContext } from '../execution';
import { ExpressionStore } from '../representation/expression';
import type { EquationOutcome, RegionCell, SolutionSet } from '../representation/solution-set';
import { decodeOutcome, encodeOutcome } from '../representation/wire';
import { describe } from '../decision/test-helpers';

// Evidence for decomposition answers (EQUATION-SEMIALGEBRAIC1 PR A, A3): samples of the claimed cells, and a
// decomposition in the reversed variable order.
function solve(rows: readonly string[], targets: readonly string[]) {
  const ctx = new ExecutionContext({ ...DEFAULT_EQUATION_LIMITS });
  const store = new ExpressionStore(ctx);
  const { problem } = lowerEquation(store, { rows: [...rows], targets: [...targets], domain: 'real', limits: { ...DEFAULT_EQUATION_LIMITS }, digits: 6 });
  return { store, problem, outcome: decideEquation(problem) };
}
function rejects(f: () => void, reason: RegExp) {
  let caught: unknown;
  try { f(); } catch (e) { caught = e; }
  expect(caught).toBeInstanceOf(EquationAlgebraError);
  expect((caught as EquationAlgebraError).reason).toMatch(reason);
}
type Solved = Extract<EquationOutcome, { kind: 'solved' }>;
const region = (o: EquationOutcome) => (o as Solved).set as Extract<SolutionSet, { kind: 'cylindrical' }>;
const withCells = (o: EquationOutcome, cells: readonly RegionCell[]): EquationOutcome => ({ ...(o as Solved), set: { ...region(o), cells } });

group('decomposition answers are verified', () => {
  it('verifies regions in two and three unknowns, points, and ∅', { timeout: 60_000 }, () => {
    for (const [rows, targets] of [
      [['x^2+y^2<1', 'y>x'], ['x', 'y']],
      [['x^2+y^2<4', 'x^2+y^2>1'], ['x', 'y']],
      [['x^2+y^2<1\\lor x>2'], ['x', 'y']],
      [['x^2+y^2=5', 'xy=2', 'x>0'], ['x', 'y']],
      [['x^2+y^2<1', 'x+y>2'], ['x', 'y']],
      [['x^2+y^2+z^2\\le1', 'z=x+y'], ['x', 'y', 'z']],
      [['y^3+xy+1<0'], ['x', 'y']],
      // A disc minus a line, a quartic with root-function bounds, a cubic curve with a range row, the heart curve.
      [['x^2+y^2<1', 'x\\ne y'], ['x', 'y']],
      [['x^4+y^4-4xy<0'], ['x', 'y']],
      [['y^2\\le x^3-x', 'x\\le2'], ['x', 'y']],
      [['(x^2+y^2-1)^3<x^2y^3'], ['x', 'y']],
      [['x^2+y^2+z^2<1', 'x+y+z>1', 'xyz>0'], ['x', 'y', 'z']],
    ] as const) {
      const r = solve(rows, targets);
      expect(['solved', 'empty']).toContain(r.outcome.kind);
      verifyEquationOutcome(r.problem, r.outcome);
    }
  });

  it('round-trips a region through the wire', () => {
    const r = solve(['x^2+y^2<4', 'x^2+y^2>1'], ['x', 'y']);
    const back = decodeOutcome(r.store.ctx, encodeOutcome(r.store, r.outcome), r.store);
    expect(describe(r.store, back.outcome)).toBe(describe(r.store, r.outcome));
  });

  it('rejects a dropped cell, a moved bound, a closed end that should be open and an extra cell', () => {
    const r = solve(['x^2+y^2<4', 'x^2+y^2>1'], ['x', 'y']), cells = region(r.outcome).cells;
    const check = (o: EquationOutcome) => () => verifyEquationOutcome(r.problem, o);
    rejects(check(withCells(r.outcome, cells.slice(1))), /another variable order/);
    const q = (n: bigint, d = 1n) => ({ kind: 'rational' as const, value: rational(r.store.ctx, n, d) });
    rejects(check(withCells(r.outcome, [{ ...cells[0], lo: q(-3n) }, ...cells.slice(1)])), /does not satisfy|another variable order/);
    // The outer circle y = √(4 − x²) is not part of the open annulus.
    const first = cells[0], inner = (first.children as RegionCell[])[0];
    rejects(check(withCells(r.outcome, [{ ...first, children: [{ ...inner, hiClosed: true }] }, ...cells.slice(1)])), /another variable order/);
    rejects(check(withCells(r.outcome, [...cells, { lo: q(5n), hi: q(6n), loClosed: false, hiClosed: false }])), /does not satisfy/);
  });
});
