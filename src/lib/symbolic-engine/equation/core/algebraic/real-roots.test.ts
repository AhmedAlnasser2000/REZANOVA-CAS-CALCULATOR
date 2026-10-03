import { describe, expect, it } from 'vitest';
import { context } from '../test-support';
import { ZZ } from '../algebra/domain';
import { PolynomialRing } from '../algebra/polynomial';
import { rational } from '../algebra/rational';
import { isolateRealRoots, sturmRealRootCount } from './real-roots';
import { compareReal, realDecimal, realRoots, refineReal, signAtReal } from './root-of';

const Z = () => new PolynomialRing(ZZ, 'x');

describe('real root isolation', () => {
  it('isolates the real root of x^5 - x - 1 and refines it to 50 digits', () => {
    const ctx = context(), z = Z();
    const roots = realRoots(ctx, z.fromIntegers(ctx, [-1, -1, 0, 0, 0, 1]));
    expect(roots).toHaveLength(1);
    expect(realDecimal(ctx, roots[0].root, 50)).toBe('1.16730397826141868425604589985484218072056037152549');
  });

  it('isolates all 20 roots of the Wilkinson polynomial', () => {
    const ctx = context(), z = Z();
    let w = z.one(ctx);
    for (let k = 1; k <= 20; k++) w = z.multiply(ctx, w, z.fromIntegers(ctx, [-k, 1]));
    const intervals = isolateRealRoots(ctx, z, w);
    expect(intervals).toHaveLength(20);
    const roots = realRoots(ctx, w);
    expect(roots.map(r => realDecimal(ctx, r.root, 0))).toEqual(Array.from({ length: 20 }, (_, i) => String(i + 1)));
  });

  it('finds all 50 real roots of the Chebyshev polynomial T_50', () => {
    const ctx = context(), z = Z();
    let t0 = z.one(ctx), t1 = z.fromIntegers(ctx, [0, 1]);
    for (let n = 2; n <= 50; n++) [t0, t1] = [t1, z.subtract(ctx, z.multiply(ctx, z.fromIntegers(ctx, [0, 2]), t1), t0)];
    expect(isolateRealRoots(ctx, z, t1)).toHaveLength(50);
    expect(sturmRealRootCount(ctx, z, t1)).toBe(50);
  });

  it('separates very close roots (Mignotte-style x^7 - 2(100x - 1)^2)', () => {
    const ctx = context(), z = Z();
    const sq = z.multiply(ctx, z.fromIntegers(ctx, [-1, 100]), z.fromIntegers(ctx, [-1, 100]));
    const f = z.subtract(ctx, z.fromIntegers(ctx, [0, 0, 0, 0, 0, 0, 0, 1]), z.scale(ctx, sq, 2n));
    const roots = realRoots(ctx, f);
    expect(roots.length).toBeGreaterThanOrEqual(2);
    expect(compareReal(ctx, roots[0].root, roots[1].root)).toBe(-1);
  });

  it('handles rational roots exactly, zero, and polynomials without real roots', () => {
    const ctx = context(), z = Z();
    const roots = realRoots(ctx, z.fromIntegers(ctx, [0, -1, 0, 4])); // x(4x^2 - 1): -1/2, 0, 1/2
    expect(roots.map(r => [r.root.lo.numerator, r.root.lo.denominator])).toEqual([[-1n, 2n], [0n, 1n], [1n, 2n]]);
    expect(realRoots(ctx, z.fromIntegers(ctx, [1, 0, 1]))).toHaveLength(0);
    expect(realRoots(ctx, z.fromIntegers(ctx, [-4, 4, -1])).map(r => r.multiplicity)).toEqual([2]); // -(x-2)^2
  });
});

describe('real RootOf', () => {
  it('orders, compares and signs algebraic numbers exactly', () => {
    const ctx = context(), z = Z();
    const sqrt2 = realRoots(ctx, z.fromIntegers(ctx, [-2, 0, 1]))[1].root;
    const sqrt3 = realRoots(ctx, z.fromIntegers(ctx, [-3, 0, 1]))[1].root;
    const cbrt2 = realRoots(ctx, z.fromIntegers(ctx, [-2, 0, 0, 1]))[0].root;
    expect(compareReal(ctx, sqrt2, sqrt3)).toBe(-1);
    expect(compareReal(ctx, sqrt3, sqrt2)).toBe(1);
    expect(compareReal(ctx, sqrt2, refineReal(ctx, sqrt2, rational(ctx, 1n, 1000n)))).toBe(0);
    // cbrt2 ≈ 1.26 < sqrt2 ≈ 1.414, so x^2 - 2 is negative at cbrt2.
    expect(signAtReal(ctx, z.fromIntegers(ctx, [-2, 0, 1]), cbrt2)).toBe(-1);
    expect(signAtReal(ctx, z.fromIntegers(ctx, [-4, 0, 0, 0, 0, 0, 1]), sqrt2)).toBe(1); // x^6 - 4 at sqrt2 = 4 > 0? 8-4
    expect(signAtReal(ctx, z.fromIntegers(ctx, [-4, 0, 0, 0, 1]), sqrt2)).toBe(0);   // x^4 - 4 vanishes at sqrt2
  });
});

describe('resources', () => {
  it('stops real and complex isolation on tiny budgets with typed stops and no value', async () => {
    const { EquationAlgebraError } = await import('../execution');
    const { allRoots } = await import('./root-of');
    const z = Z(), build = context();
    const f = z.fromIntegers(build, [-1, -1, 0, 0, 0, 1]);
    for (const budget of [{ work: 500 }, { allocation: 100 }]) {
      let value: unknown;
      try { value = allRoots(context(budget), f); } catch (e) {
        expect(e instanceof EquationAlgebraError && e.code).toBe('resource');
      }
      expect(value).toBeUndefined();
    }
  });
});
