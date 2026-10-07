import { describe as group, expect, it } from 'vitest';
import { rational, rCompare, type Rational } from '../algebra/rational';
import { rangeOverBox, WHOLE, type XRange } from '../composition/range';
import { derivative } from '../composition/derivative';
import { context } from '../test-support';
import { ExpressionStore, type ExprId } from '../representation/expression';
import { readExpression } from '../representation/mathjson';
import { contractSystem, meanValueRange } from './contract';
import { approximateInverse, fromDouble, toDouble } from './interval';

function setup() {
  const store = new ExpressionStore(context());
  const read = (json: unknown): ExprId => {
    const r = readExpression(store, json);
    if (r.kind !== 'ok') throw new Error(JSON.stringify(r));
    return r.value;
  };
  const q = (n: bigint, d = 1n) => rational(store.ctx, n, d);
  const iv = (lo: Rational, hi: Rational): XRange => ({ lo, hi, loOpen: false, hiOpen: false });
  return { store, read, q, iv };
}
const approx = (r: Rational | undefined) => (r === undefined ? undefined : toDouble(r));

group('multivariate ranges and contraction (EQUATION-CERTIFIED-NUMERICS1 PR B)', () => {
  it('ranges over a box read each variable from its own interval', () => {
    const { store, read, q, iv } = setup();
    const r = rangeOverBox(store, read(['Add', 'x', ['Multiply', 2, 'y']]), new Map([['x', iv(q(0n), q(1n))], ['y', iv(q(2n), q(3n))]]), 64);
    expect([approx(r.lo), approx(r.hi)]).toEqual([4, 7]);
  });

  it('HC4 bounds x by eˣ + sin y = 1 on the whole plane (x ≤ ln 2), leaving y unbounded', () => {
    const { store, read } = setup();
    const f = read(['Subtract', ['Add', ['Exp', 'x'], ['Sin', 'y']], 1]);
    const box = contractSystem(store, [f], new Map([['x', WHOLE], ['y', WHOLE]]), 64);
    expect(box).toBeDefined();
    const x = box?.get('x') as XRange, y = box?.get('y') as XRange;
    expect(x.lo).toBeUndefined();
    expect(Math.abs((approx(x.hi) as number) - Math.LN2)).toBeLessThan(1e-12);
    expect(y.lo === undefined && y.hi === undefined).toBe(true);
  });

  it('HC4 bounds both unknowns of a circle, and proves eˣ + y² = −1 empty', () => {
    const { store, read } = setup();
    const circle = read(['Subtract', ['Add', ['Power', 'x', 2], ['Power', 'y', 2]], 4]);
    const box = contractSystem(store, [circle], new Map([['x', WHOLE], ['y', WHOLE]]), 64);
    for (const v of ['x', 'y']) {
      const r = box?.get(v) as XRange;
      expect([Math.round(approx(r.lo) as number * 1e9) / 1e9, Math.round(approx(r.hi) as number * 1e9) / 1e9]).toEqual([-2, 2]);
    }
    const none = read(['Add', ['Exp', 'x'], ['Power', 'y', 2], 1]);
    expect(contractSystem(store, [none], new Map([['x', WHOLE], ['y', WHOLE]]), 64)).toBeUndefined();
  });

  it('the mean-value form is tighter than the natural range on a small box', () => {
    const { store, read, q, iv } = setup();
    const f = read(['Multiply', 'x', ['Subtract', 1, 'x']]);
    const box = new Map([['x', iv(q(49n, 100n), q(51n, 100n))]]);
    const natural = rangeOverBox(store, f, box, 64), mv = meanValueRange(store, f, [derivative(store, f, 'x') as ExprId], ['x'], box, 64);
    const width = (r: XRange) => (approx(r.hi) as number) - (approx(r.lo) as number);
    expect(width(mv)).toBeLessThan(width(natural));
    expect(rCompare(store.ctx, mv.hi as Rational, q(1n, 4n))).toBeGreaterThanOrEqual(0);
  });

  it('doubles convert exactly, and the approximate inverse inverts', () => {
    const { store } = setup();
    expect(fromDouble(store.ctx, 0.75)).toEqual(rational(store.ctx, 3n, 4n));
    expect(fromDouble(store.ctx, -3)).toEqual(rational(store.ctx, -3n));
    const inv = approximateInverse([[2, 1], [1, 3]]) as number[][];
    expect(inv[0][0] * 2 + inv[0][1] * 1).toBeCloseTo(1, 12);
    expect(approximateInverse([[1, 2], [2, 4]])).toBeUndefined();
  });
});
