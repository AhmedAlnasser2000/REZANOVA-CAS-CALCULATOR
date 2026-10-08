import { describe as group, expect, it } from 'vitest';
import { DEFAULT_EQUATION_LIMITS } from '../../../../new-equation/types';
import { rational } from '../algebra/rational';
import { ExecutionContext } from '../execution';
import { lowerEquation } from '../../service/input';
import type { ExactValue } from '../representation/evaluate';
import { ExpressionStore } from '../representation/expression';
import { cadProblem } from './atoms';
import { decompose, type CadCell } from './decompose';
import { locate } from './locate';
import { regionSet } from './region';
import { describeSet } from '../decision/test-helpers';

// Cylindrical decomposition (EQUATION-SEMIALGEBRAIC1 PR A): truth at points against direct evaluation.
function cad(rows: readonly string[], targets: readonly string[]) {
  const ctx = new ExecutionContext({ ...DEFAULT_EQUATION_LIMITS });
  const store = new ExpressionStore(ctx);
  const { problem } = lowerEquation(store, { rows: [...rows], targets: [...targets], domain: 'real', limits: { ...DEFAULT_EQUATION_LIMITS }, digits: 6 });
  const p = cadProblem(problem, targets);
  if (!p) throw new Error('not polynomial');
  return { store, d: decompose(store, p) };
}
const at = (ctx: ExecutionContext, ...xs: [bigint, bigint][]): ExactValue[] => xs.map(([n, d]) => ({ kind: 'rational', value: rational(ctx, n, d) }));
function leaves(c: CadCell): CadCell[] { return c.children ? c.children.flatMap(leaves) : [c]; }

group('cylindrical decomposition', () => {
  it('the disc above the diagonal: x² + y² < 1 ∧ y > x', () => {
    const { store, d } = cad(['x^2+y^2<1', 'y>x'], ['x', 'y']);
    const truth = (...p: [bigint, bigint][]) => locate(store, d, at(store.ctx, ...p)).truth;
    expect(truth([0n, 1n], [1n, 2n])).toBe(true);
    expect(truth([1n, 2n], [0n, 1n])).toBe(false);
    expect(truth([-9n, 10n], [0n, 1n])).toBe(true);
    expect(truth([-9n, 10n], [-1n, 2n])).toBe(false);
    expect(truth([0n, 1n], [0n, 1n])).toBe(false);
    expect(truth([1n, 2n], [7n, 10n])).toBe(true);
    // The level-1 critical points are ±1, ±1/√2 and 0 (Lazard's trailing coefficient −x of y − x).
    expect((d.root.children as CadCell[]).length).toBe(11);
  });

  it('an equational constraint: the circle x² + y² = 1 with x > 0 ∧ y > 0', () => {
    const { store, d } = cad(['x^2+y^2=1', 'x>0', 'y>0'], ['x', 'y']);
    expect(d.projection.equational).toBeDefined();
    const trueLeaves = leaves(d.root).filter(c => c.truth);
    // One open arc: over 0 < x < 1, the upper root.
    expect(trueLeaves).toHaveLength(1);
    expect(locate(store, d, at(store.ctx, [3n, 5n], [4n, 5n])).truth).toBe(true);
    expect(locate(store, d, at(store.ctx, [3n, 5n], [-4n, 5n])).truth).toBe(false);
  });

  it('a ball and a plane in three variables', () => {
    const { store, d } = cad(['x^2+y^2+z^2\\le1', 'z=x+y'], ['x', 'y', 'z']);
    expect(locate(store, d, at(store.ctx, [0n, 1n], [0n, 1n], [0n, 1n])).truth).toBe(true);
    expect(locate(store, d, at(store.ctx, [1n, 2n], [1n, 2n], [1n, 1n])).truth).toBe(false);
    expect(locate(store, d, at(store.ctx, [1n, 2n], [0n, 1n], [1n, 2n])).truth).toBe(true);
  });

  it('∨ across variables and an empty region', () => {
    const { store, d } = cad(['x^2+y^2<1\\lor x>2'], ['x', 'y']);
    expect(locate(store, d, at(store.ctx, [3n, 1n], [5n, 1n])).truth).toBe(true);
    expect(locate(store, d, at(store.ctx, [3n, 2n], [0n, 1n])).truth).toBe(false);
    const empty = cad(['x^2+y^2<1', 'x+y>2'], ['x', 'y']);
    expect(leaves(empty.d.root).some(c => c.truth)).toBe(false);
  });
});

group('regions', () => {
  const text = (rows: readonly string[], targets: readonly string[]) => {
    const { store, d } = cad(rows, targets);
    const set = regionSet(store, d, targets);
    return set ? describeSet(store, set) : 'empty';
  };
  const sqrt = (inner: string) => `["Power",${inner},["Rational",1,2]]`;
  const neg = (e: string) => `["Multiply",-1,${e}]`;
  const oneMinusX2 = sqrt('["Add",1,["Multiply",-1,["Power","x",2]]]');

  it('writes Reduce-style cells with closed-form bounds, merging cells that one description covers', () => {
    expect(text(['x^2+y^2\\le1'], ['x', 'y'])).toBe(`x ∈ [-1, 1] ∧ y ∈ [${neg(oneMinusX2)}, ${oneMinusX2}]`);
    // x = ±1 hold no point of the open disc: they stay boundaries.
    expect(text(['x^2+y^2<1\\lor x>2'], ['x', 'y'])).toBe(`x ∈ (-1, 1) ∧ y ∈ (${neg(oneMinusX2)}, ${oneMinusX2}) ∨ x ∈ (2, +inf)`);
    expect(text(['x^2+y^2<1', 'y>x'], ['x', 'y'])).toBe(`x ∈ (-1, ≈-0.707107] ∧ y ∈ (${neg(oneMinusX2)}, ${oneMinusX2}) ∨ x ∈ (≈-0.707107, ≈0.707107) ∧ y ∈ ("x", ${oneMinusX2})`);
    expect(text(['x^2+y^2=1', 'x>0', 'y>0'], ['x', 'y'])).toBe(`x ∈ (0, 1) ∧ y = ${oneMinusX2}`);
    expect(text(['xy>1'], ['x', 'y'])).toBe('x ∈ (-inf, 0) ∧ y ∈ (-inf, ["Power","x",-1]) ∨ x ∈ (0, +inf) ∧ y ∈ (["Power","x",-1], +inf)');
  });

  it('gives points, the whole space and ∅ in their own kinds', () => {
    expect(text(['x^2+y^2=5', 'xy=2', 'x>0'], ['x', 'y'])).toBe('{(1, 2), (2, 1)}');
    expect(text(['x^2+y^2\\ge0'], ['x', 'y'])).toBe('x ∈ (-inf, +inf)');
    expect(text(['x^2+y^2<1', 'x+y>2'], ['x', 'y'])).toBe('empty');
  });

  it('merges across Lazard-only critical points in three variables (a disc of the plane z = x + y in the ball)', () => {
    const half = (s: number) => `["Add",["Multiply",["Rational",-1,2],"x"],["Multiply",["Rational",${s},2],${sqrt('["Add",2,["Multiply",-3,["Power","x",2]]]')}]]`;
    expect(text(['x^2+y^2+z^2\\le1', 'z=x+y'], ['x', 'y', 'z'])).toBe(`x ∈ [≈-0.816497, ≈0.816497] ∧ y ∈ [${half(-1)}, ${half(1)}] ∧ z = ["Add","y","x"]`);
  });
});
