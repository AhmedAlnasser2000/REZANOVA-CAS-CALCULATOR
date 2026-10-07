import { describe, expect, it } from 'vitest';
import { PolynomialRing } from './polynomial';
import { RationalFunctionField, type RationalFunction } from './rational-function';
import type { Rational } from './rational';
import { exactDivide, extendedGcd, polynomialDivide } from './polynomial-division';
import { squareFree } from './polynomial-square-free';
import { context, poly, rationalRing } from './test-support';

describe('recursive Q(t) coefficients', () => {
  it('normalizes cancellation, denominator sign and zero; differentiates exactly', () => {
    const c = context(), r = rationalRing('t'), f = new RationalFunctionField(r);
    const a = f.make(c, poly(c, r, [-1, 0, 1]), poly(c, r, [-1, 1]));
    const b = f.make(c, poly(c, r, [-2, -2]), poly(c, r, [-2]));
    expect(f.equal(c, a, b)).toBe(true);
    expect(f.equal(c, f.derivative(c, a), f.fromInteger(c, 1n))).toBe(true);
    const invT = f.make(c, r.one(c), poly(c, r, [0, 1]));
    const expected = f.make(c, poly(c, r, [-1]), poly(c, r, [0, 0, 1]));
    expect(f.equal(c, f.derivative(c, invT), expected)).toBe(true);
    const zero = f.make(c, r.zero(c), poly(c, r, [2, 3]));
    expect(r.equal(c, zero.denominator, r.one(c))).toBe(true);
    expect(() => f.inverse(c, zero)).toThrowError(/division-by-zero/);
    expect(() => f.make(c, r.one(c), r.zero(c))).toThrowError(/division-by-zero/);
    expect(Object.isFrozen(a)).toBe(true);
  });
  it('divides and computes gcd of x-polynomials over Q(t)', () => {
    const c = context(), tRing = rationalRing('t'), f = new RationalFunctionField(tRing), x = new PolynomialRing<RationalFunction<Rational>>(f, 'x');
    const t = f.make(c, poly(c, tRing, [0, 1]), tRing.one(c)), one = f.fromInteger(c, 1n);
    const minus = x.make(c, [f.negate(c, t), one]), plus = x.make(c, [t, one]);
    const product = x.multiply(c, minus, plus);
    expect(x.equal(c, exactDivide(c, x, product, minus), plus)).toBe(true);
    expect(x.equal(c, extendedGcd(c, x, product, minus).gcd, minus)).toBe(true);
    const d = polynomialDivide(c, x, plus, minus);
    expect(f.equal(c, d.remainder.coefficients[0], f.add(c, t, t))).toBe(true);
    expect(x.equal(c, x.derivative(c, minus), x.one(c))).toBe(true);
    // The nested verified square-free workload has its own explicit test budget.
    const recursive = context({ work: 100_000_000, allocation: 1_000_000_000 });
    const repeated = squareFree(recursive, x, x.multiply(recursive, x.power(recursive, minus, 2), plus));
    expect(repeated.factors.map(entry => entry.multiplicity)).toEqual([1, 2]);
    expect(x.equal(c, repeated.factors[1].factor, minus)).toBe(true);
    const tiny = context({ work: 200 });
    expect(() => exactDivide(tiny, x, product, minus)).toThrowError(/resource-limit/);
    const other = new RationalFunctionField(tRing);
    expect(() => f.add(c, t, other.fromInteger(c, 1n))).toThrowError(/domain-mismatch/);
  });
});

describe('verified rational arithmetic shortcuts', () => {
  it('preserves exact identities, immutability and ownership for zero, one and shared denominators', () => {
    const c = context(), r = rationalRing(), f = new RationalFunctionField(r);
    const a = f.make(c, poly(c, r, [1, 2]), poly(c, r, [3, 0, 1]));
    const zero = f.fromInteger(c, 0n), one = f.fromInteger(c, 1n);
    expect(f.add(c, a, zero)).toBe(a); expect(f.add(c, zero, a)).toBe(a);
    expect(f.multiply(c, a, one)).toBe(a); expect(f.multiply(c, one, a)).toBe(a);
    expect(f.multiply(c, a, zero)).toBe(zero); expect(f.multiply(c, zero, a)).toBe(zero);
    const double = f.make(c, poly(c, r, [2, 4]), poly(c, r, [3, 0, 1]));
    expect(f.equal(c, f.add(c, a, a), double)).toBe(true);
    expect(Object.isFrozen(a)).toBe(true); expect(Object.isFrozen(a.numerator.coefficients)).toBe(true);
    const foreign = new RationalFunctionField(r).fromInteger(c, 0n);
    expect(() => f.add(c, one, foreign)).toThrow(/domain-mismatch/);
    expect(() => f.multiply(c, zero, foreign)).toThrow(/domain-mismatch/);
    expect(() => f.multiply(context({ work: 0 }), one, a)).toThrow(/resource-limit/);
  });
});
