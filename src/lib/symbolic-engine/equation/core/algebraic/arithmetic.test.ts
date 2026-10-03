import { describe, expect, it } from 'vitest';
import { context } from '../test-support';
import { ZZ } from '../algebra/domain';
import { PolynomialRing } from '../algebra/polynomial';
import { add, inverse, multiply, negate, subtract } from './arithmetic';
import { allRoots, compareReal, realDecimal, type ComplexRootOf, type RealRootOf, type RootOf } from './root-of';

const Z = () => new PolynomialRing(ZZ, 'x');
const poly = (r: RootOf) => r.poly.coefficients.join(',');

describe('RootOf arithmetic', () => {
  const setup = () => {
    const ctx = context(), z = Z();
    const pos = (c: number[]) => allRoots(ctx, z.fromIntegers(ctx, c)).map(r => r.root).filter((r): r is RealRootOf => r.kind === 'real').at(-1)!;
    return { ctx, z, sqrt2: pos([-2, 0, 1]), sqrt3: pos([-3, 0, 1]), cbrt2: pos([-2, 0, 0, 1]) };
  };

  it('sqrt2 + sqrt3 has minimal polynomial x^4 - 10x^2 + 1', () => {
    const { ctx, sqrt2, sqrt3 } = setup();
    const s = add(ctx, sqrt2, sqrt3) as RealRootOf;
    expect(poly(s)).toBe('1,0,-10,0,1');
    expect(realDecimal(ctx, s, 15)).toBe('3.146264369941972');
  });

  it('sqrt2 · sqrt3 = sqrt6 and sqrt2 − sqrt2 = 0', () => {
    const { ctx, sqrt2, sqrt3 } = setup();
    const p = multiply(ctx, sqrt2, sqrt3) as RealRootOf;
    expect(poly(p)).toBe('-6,0,1');
    expect(compareReal(ctx, p, allRoots(ctx, Z().fromIntegers(ctx, [-6, 0, 1]))[1].root as RealRootOf)).toBe(0);
    expect(poly(subtract(ctx, sqrt2, sqrt2))).toBe('0,1');
  });

  it('1/sqrt2 = sqrt2/2, negation, and cbrt2 + cbrt2 = 2·cbrt2', () => {
    const { ctx, sqrt2, cbrt2 } = setup();
    const inv = inverse(ctx, sqrt2) as RealRootOf;
    expect(poly(inv)).toBe('-1,0,2');
    expect(realDecimal(ctx, inv, 12)).toBe('0.707106781187');
    expect(realDecimal(ctx, negate(ctx, sqrt2) as RealRootOf, 6)).toBe('-1.414214');
    const doubled = add(ctx, cbrt2, cbrt2) as RealRootOf;
    expect(poly(doubled)).toBe('-16,0,0,1');
  });

  it('(sqrt2 + i)(sqrt2 − i) = 3', () => {
    const { ctx, z } = setup();
    // x^4 - 2x^2 + 9 has roots ±sqrt2 ± i.
    const roots = allRoots(ctx, z.fromIntegers(ctx, [9, 0, -2, 0, 1])).map(r => r.root as ComplexRootOf);
    const plus = roots.find(r => r.re.numerator > 0n && r.im.numerator > 0n)!;
    const minus = roots.find(r => r.re.numerator > 0n && r.im.numerator < 0n)!;
    const product = multiply(ctx, plus, minus);
    expect(product.kind).toBe('real');
    expect(poly(product)).toBe('-3,1');
  });
});
