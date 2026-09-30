import { describe, expect, it } from 'vitest';
import { setup } from './differential-test-support';
import { positiveIntegerRoots, verifyIntegerRoots } from './rde-integer-roots';
import { ExecutionContext } from './execution';

describe('verified positive integer roots', () => {
  it('handles repeated, negative, fractional and endpoint roots', () => {
    const { ctx, f, c } = setup(), r = f.fractions!.ring;
    const linear = (a: number, b = 1) => r.make(ctx, [c(a), c(b)]);
    let p = r.multiply(ctx, r.power(ctx, linear(-1), 3), linear(-3));
    p = r.multiply(ctx, p, r.multiply(ctx, linear(2), linear(-5, 2)));
    const proof = positiveIntegerRoots(ctx, r, p);
    expect(proof.roots).toEqual([1n, 3n]); verifyIntegerRoots(ctx, r, p, proof);
    expect(Object.isFrozen(proof.intervals)).toBe(true);
  });
  it('checks constants, zero, no-real-root and noninteger-only polynomials', () => {
    const { ctx, f, c } = setup(), r = f.fractions!.ring;
    for (const coefficients of [[1], [1, 0, 1], [-1, 2], [1, 1]]) {
      expect(positiveIntegerRoots(ctx, r, r.make(ctx, coefficients.map(n => c(n)))).roots).toEqual([]);
    }
    expect(() => positiveIntegerRoots(ctx, r, r.zero(ctx))).toThrow('invalid-input');
  });
  it('bisects enormous integer bounds without enumerating the integers', () => {
    const { ctx, f, c } = setup(), r = f.fractions!.ring, n = 10n ** 25n;
    const yes = positiveIntegerRoots(ctx, r, r.make(ctx, [c(-n), c(1)]));
    expect(yes.roots).toEqual([n]); expect(yes.intervals.length).toBeLessThan(100);
    const no = positiveIntegerRoots(ctx, r, r.make(ctx, [c(-2n * n - 1n), c(2)]));
    expect(no.roots).toEqual([]); expect(no.intervals.length).toBeLessThan(100);
  });
  it('rejects missing intervals/roots, altered bounds, Sturm signs and valuations', () => {
    const { ctx, f, c } = setup(), r = f.fractions!.ring, p = r.make(ctx, [c(2), c(-3), c(1)]);
    const proof = positiveIntegerRoots(ctx, r, p);
    for (const bad of [
      { ...proof, roots: [] }, { ...proof, bound: proof.bound + 1n },
      { ...proof, intervals: proof.intervals.slice(1) },
      { ...proof, sturm: [proof.sturm[0], r.negate(ctx, proof.sturm[1]), ...proof.sturm.slice(2)] },
      { ...proof, intervals: proof.intervals.map((v, i) => i === 0 ? { ...v, leftVariation: v.leftVariation + 1 } : v) },
      { ...proof, divisions: proof.divisions.slice(1) },
    ]) expect(() => verifyIntegerRoots(ctx, r, p, bad)).toThrow('verification-failed');
  });
  it('charges construction and final replay under the supplied context', () => {
    const { ctx, f, c } = setup(), r = f.fractions!.ring, p = r.make(ctx, [c(-3), c(1)]);
    const proof = positiveIntegerRoots(ctx, r, p), measured = new ExecutionContext(ctx.limits);
    verifyIntegerRoots(measured, r, p, proof);
    const low = new ExecutionContext({ ...ctx.limits, work: measured.usage.work - 1 });
    expect(() => verifyIntegerRoots(low, r, p, proof)).toThrow('resource-limit');
    expect(() => positiveIntegerRoots(new ExecutionContext({ ...ctx.limits, work: 0 }), r, p)).toThrow('resource-limit');
  });
});
