import { describe as group, expect, it } from 'vitest';
import { rational } from '../algebra/rational';
import { EquationAlgebraError, ExecutionContext } from '../execution';
import { enclose } from '../representation/enclosure';
import { ExpressionStore } from '../representation/expression';
import { decodeExpression, encodeExpression } from '../representation/wire';
import { realSign } from '../representation/real-order';
import { certifyIsolated, isolateZero } from './isolated';

const setup = () => {
  const ctx = new ExecutionContext({ work: 50_000_000, allocation: 1_000_000_000 });
  const store = new ExpressionStore(ctx), x = store.symbol('x');
  return { ctx, store, x, q: (n: bigint, d = 1n) => rational(ctx, n, d) };
};
const rejects = (f: () => unknown, reason: RegExp) => {
  let caught: unknown;
  try { f(); } catch (e) { caught = e; }
  expect(caught).toBeInstanceOf(EquationAlgebraError);
  expect((caught as EquationAlgebraError).reason).toMatch(reason);
};

group('certified isolated zeros', () => {
  it('certifies, isolates and encloses the zero of cos x − x (0.7390851332151606…)', () => {
    const { store, x, q } = setup();
    const f = store.sub(store.cos(x), x);
    expect(certifyIsolated(store, f, 'x', q(0n), q(1n))).toBe(1);
    const z = isolateZero(store, f, 'x', store.integer(0), store.integer(1), 1);
    expect(store.node(z).kind).toBe('isolated');
    const b = enclose(store, z, 64);
    if (b.kind !== 'bounds') throw new Error(b.kind);
    const ref = 0.7390851332151606;
    expect(Number(b.lo.numerator) / Number(b.lo.denominator)).toBeCloseTo(ref, 15);
    expect(Number(b.hi.numerator) / Number(b.hi.denominator)).toBeCloseTo(ref, 15);
    // Exact comparisons, including with closed forms near the zero.
    expect(realSign(store, store.sub(z, store.fraction(3, 4)))).toBe(-1);
    expect(realSign(store, store.sub(z, store.fraction(739, 1000)))).toBe(1);
    expect(realSign(store, store.sub(store.mul(store.integer(-2), z), store.integer(-1)))).toBe(-1);
  });

  it('finds an exact rational zero instead of a numeric one', () => {
    const { store, x } = setup();
    // 2x − 1 = 0 between 0 and 1: the first inner point is 1/2.
    const z = isolateZero(store, store.sub(store.mul(store.integer(2), x), store.integer(1)), 'x', store.integer(0), store.integer(1), -1);
    expect(store.numberValue(z)).toEqual(rational(store.ctx, 1n, 2n));
  });

  it('rejects intervals without a sign change, with two zeros, or where the expression is undefined', () => {
    const { store, x, q } = setup();
    rejects(() => certifyIsolated(store, store.sub(store.cos(x), x), 'x', q(0n), q(1n, 2n)), /no sign change/);
    // sin x − x/2 has three zeros in [−3, 3]: the end signs differ, but it is not monotone.
    rejects(() => certifyIsolated(store, store.sub(store.sin(x), store.div(x, store.integer(2))), 'x', q(-3n), q(3n)), /monotone/);
    rejects(() => certifyIsolated(store, store.sub(store.log(x), store.integer(1)), 'x', q(-1n), q(3n)), /not defined/);
    rejects(() => certifyIsolated(store, store.sub(store.cos(x), x), 'x', q(1n), q(0n)), /lo < hi/);
  });

  it('round-trips through the expression wire as the same node', () => {
    const { ctx, store, x } = setup();
    const z = isolateZero(store, store.sub(store.cos(x), x), 'x', store.integer(0), store.integer(1), 1);
    const e = store.add(z, store.integer(1));
    const back = decodeExpression(ctx, JSON.parse(JSON.stringify(encodeExpression(store, e))));
    expect(back.store.digest(back.id)).toBe(store.digest(e));
  });
});
