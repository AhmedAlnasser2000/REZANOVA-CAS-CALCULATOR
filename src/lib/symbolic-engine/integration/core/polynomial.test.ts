import { describe, expect, it } from 'vitest';
import { exactDivide, extendedGcd, polynomialDivide, polynomialGcd, verifyBezout, verifyDivision } from './polynomial-division';
import { squareFree, verifySquareFree } from './polynomial-square-free';
import { context, poly, rationalRing } from './test-support';
import { rational } from './rational';

const ints = (p: ReturnType<typeof poly>) => p.coefficients.map(c => [c.numerator, c.denominator]);
describe('canonical polynomial algebra', () => {
  it('owns immutable arrays, trims zeros, and rejects same-name foreign rings', () => {
    const c = context(), r = rationalRing(), other = rationalRing();
    const input = [rational(c, 1), rational(c, 0)], p = r.make(c, input); input[0] = rational(c, 3);
    expect(ints(p)).toEqual([[1n, 1n]]); expect(Object.isFrozen(p.coefficients)).toBe(true);
    expect(r.degree(c, poly(c, r, [0, 0]))).toBe(-1);
    expect(() => r.add(c, p, other.one(c))).toThrowError(/domain-mismatch/);
    expect(ints(r.derivative(c, poly(c, r, [5, -3, 2])))).toEqual([[-3n, 1n], [4n, 1n]]);
  });
  it('divides with known quotient and remainder and rejects tampering', () => {
    const c = context(), r = rationalRing(), a = poly(c, r, [2, -1, 0, 1]), b = poly(c, r, [-1, 1]);
    const d = polynomialDivide(c, r, a, b);
    expect(ints(d.quotient)).toEqual([[0n, 1n], [1n, 1n], [1n, 1n]]);
    expect(ints(d.remainder)).toEqual([[2n, 1n]]);
    expect(() => verifyDivision(c, r, a, b, { ...d, remainder: r.one(c) })).toThrowError(/verification-failed/);
    expect(() => exactDivide(c, r, a, b)).toThrowError(/nonexact-division/);
    expect(() => polynomialDivide(c, r, a, r.zero(c))).toThrowError(/division-by-zero/);
    expect(ints(polynomialDivide(c, r, r.zero(c), b).quotient)).toEqual([]);
  });
  it('checks monic gcd, divisibility and Bezout independently', () => {
    const c = context(), r = rationalRing(), a = poly(c, r, [-2, 0, 2]), b = poly(c, r, [-4, 4]);
    const e = extendedGcd(c, r, a, b);
    expect(ints(e.gcd)).toEqual([[-1n, 1n], [1n, 1n]]);
    expect(() => verifyBezout(c, r, a, b, { ...e, s: r.add(c, e.s, r.one(c)) })).toThrowError(/verification-failed/);
    expect(ints(polynomialGcd(c, r, r.zero(c), r.zero(c)))).toEqual([]);
    expect(ints(polynomialGcd(c, r, a, r.zero(c)))).toEqual([[-1n, 1n], [0n, 1n], [1n, 1n]]);
    expect(ints(polynomialGcd(c, r, r.zero(c), b))).toEqual([[-1n, 1n], [1n, 1n]]);
    expect(ints(exactDivide(c, r, a, b))).toEqual([[1n, 2n], [1n, 2n]]);
  });
  it('reconstructs seeded divisions and checks distributivity', () => {
    const c = context(), r = rationalRing(); let seed = 71;
    const next = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % 11 - 5; };
    for (let i = 0; i < 25; i++) {
      const b = poly(c, r, [next(), next(), 1]), q = poly(c, r, [next(), next(), next()]), rem = poly(c, r, [next(), next()]);
      const a = r.add(c, r.multiply(c, b, q), rem), d = polynomialDivide(c, r, a, b);
      expect(r.equal(c, d.quotient, q)).toBe(true); expect(r.equal(c, d.remainder, rem)).toBe(true);
      expect(r.equal(c, r.multiply(c, b, r.add(c, q, rem)), r.add(c, r.multiply(c, b, q), r.multiply(c, b, rem)))).toBe(true);
    }
  });
  it('decomposes nonmonic repeated factors, constants, and rejects zero', () => {
    const c = context(), r = rationalRing(), f = poly(c, r, [-1, 1]), g = poly(c, r, [2, 1]);
    const a = r.scale(c, r.multiply(c, r.power(c, f, 3), r.power(c, g, 2)), rational(c, -7, 3));
    const s = squareFree(c, r, a);
    expect(s.scalar).toEqual({ numerator: -7n, denominator: 3n });
    expect(s.factors.map(x => x.multiplicity)).toEqual([2, 3]);
    expect(r.equal(c, s.factors[0].factor, g)).toBe(true); expect(r.equal(c, s.factors[1].factor, f)).toBe(true);
    expect(() => verifySquareFree(c, r, a, { ...s, factors: [{ factor: g, multiplicity: 1 }, s.factors[1]] })).toThrowError(/verification-failed/);
    expect(squareFree(c, r, poly(c, r, [4])).factors).toEqual([]);
    expect(() => squareFree(c, r, r.zero(c))).toThrowError(/invalid-input/);
  });
  it('charges verification to the same budget and enforces degree before growth', () => {
    const setup = context(), r = rationalRing(), a = poly(setup, r, [1, 0, 1]), b = poly(setup, r, [1, 1]);
    const ample = context(); polynomialDivide(ample, r, a, b);
    const required = ample.usage.work;
    expect(() => polynomialDivide(context({ work: required - 1 }), r, a, b)).toThrowError(/resource-limit: work/);
    expect(() => polynomialDivide(context({ work: required }), r, a, b)).not.toThrow();
    expect(() => r.multiply(context({ degree: 2 }), a, a)).toThrowError(/resource-limit: degree/);
    const cert = polynomialDivide(context(), r, a, b);
    expect(() => verifyDivision(context({ work: 10 }), r, a, b, cert)).toThrowError(/resource-limit/);
  });
});
