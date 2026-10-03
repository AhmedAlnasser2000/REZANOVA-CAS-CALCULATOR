import { describe, expect, it } from 'vitest';
import { EquationAlgebraError } from '../execution';
import { context, seeded } from '../test-support';
import { QQ, ZZ } from './domain';
import { PolynomialRing, multiplyArrays } from './polynomial';
import {
  divideWithRemainder, divides, exactQuotient, integerContent, integerToRational, monic, primitivePart, pseudoDivide, rationalToPrimitive,
} from './polynomial-division';
import { rational } from './rational';

const code = (run: () => unknown) => { try { run(); } catch (e) { return e instanceof EquationAlgebraError ? e.code : 'other'; } return 'none'; };
const Z = () => new PolynomialRing(ZZ, 'x');
const Q = () => new PolynomialRing(QQ, 'x');

function schoolbookReference(a: bigint[], b: bigint[]) {
  const out = Array<bigint>(a.length + b.length - 1).fill(0n);
  a.forEach((x, i) => b.forEach((y, j) => { out[i + j] += x * y; }));
  while (out.length && out[out.length - 1] === 0n) out.pop();
  return out;
}

describe('polynomials', () => {
  it('canonicalizes coefficients and keeps ring identity', () => {
    const ctx = context(), z = Z(), other = Z();
    const p = z.fromIntegers(ctx, [1, 2, 0, 0]);
    expect(p.coefficients).toEqual([1n, 2n]);
    expect(z.degree(ctx, z.zero(ctx))).toBe(-1);
    expect(code(() => other.add(ctx, p, p))).toBe('domain-mismatch');
    expect(code(() => z.leading(ctx, z.zero(ctx)))).toBe('invalid-input');
  });

  it('multiplies by Karatsuba exactly, matching a reference product', () => {
    const ctx = context(), rng = seeded(3);
    for (const [na, nb] of [[1, 1], [5, 9], [24, 24], [60, 41], [130, 7], [257, 300]]) {
      const a = Array.from({ length: na }, () => rng.big(70)), b = Array.from({ length: nb }, () => rng.big(70));
      const got = multiplyArrays(ZZ, ctx, a, b);
      while (got.length && got[got.length - 1] === 0n) got.pop();
      expect(got).toEqual(schoolbookReference(a, b));
    }
  });

  it('satisfies ring laws, derivative and evaluation identities', () => {
    const ctx = context(), z = Z(), rng = seeded(5);
    const r = () => z.fromIntegers(ctx, Array.from({ length: rng.int(0, 12) }, () => rng.big(40)));
    for (let i = 0; i < 30; i++) {
      const a = r(), b = r(), c = r();
      expect(z.equal(ctx, z.multiply(ctx, a, z.add(ctx, b, c)), z.add(ctx, z.multiply(ctx, a, b), z.multiply(ctx, a, c)))).toBe(true);
      expect(z.equal(ctx, z.multiply(ctx, a, b), z.multiply(ctx, b, a))).toBe(true);
      // (ab)' = a'b + ab'
      expect(z.equal(ctx, z.derivative(ctx, z.multiply(ctx, a, b)),
        z.add(ctx, z.multiply(ctx, z.derivative(ctx, a), b), z.multiply(ctx, a, z.derivative(ctx, b))))).toBe(true);
      const x = rng.big(20);
      expect(z.evaluate(ctx, z.multiply(ctx, a, b), x)).toBe(z.evaluate(ctx, a, x) * z.evaluate(ctx, b, x));
    }
    expect(z.power(ctx, z.fromIntegers(ctx, [1, 1]), 5).coefficients).toEqual([1n, 5n, 10n, 10n, 5n, 1n]);
  });
});

describe('division', () => {
  it('divides over Q with a checked identity', () => {
    const ctx = context(), q = Q();
    const a = q.fromIntegers(ctx, [-4, 0, -2, 1]), b = q.fromIntegers(ctx, [-3, 1]);
    const { quotient, remainder } = divideWithRemainder(ctx, q, a, b);
    expect(quotient.coefficients.map(c => c.numerator)).toEqual([3n, 1n, 1n]);
    expect(remainder.coefficients.map(c => c.numerator)).toEqual([5n]);
    expect(code(() => divideWithRemainder(ctx, q, a, q.zero(ctx)))).toBe('division-by-zero');
    expect(code(() => divideWithRemainder(ctx, Z(), Z().one(ctx), Z().one(ctx)))).toBe('domain-mismatch');
  });

  it('pseudo-divides over Z with the exact multiplier', () => {
    const ctx = context(), z = Z(), rng = seeded(9);
    for (let i = 0; i < 25; i++) {
      const a = z.fromIntegers(ctx, Array.from({ length: rng.int(1, 15) }, () => rng.big(30)));
      const b = z.fromIntegers(ctx, [...Array.from({ length: rng.int(0, 6) }, () => rng.big(30)), rng.big(10) || 3n]);
      if (z.isZero(ctx, a)) continue;
      const { quotient, remainder, multiplier } = pseudoDivide(ctx, z, a, b);
      const steps = Math.max(0, z.degree(ctx, a) - z.degree(ctx, b) + 1);
      expect(multiplier).toBe(z.leading(ctx, b) ** BigInt(steps));
      expect(z.equal(ctx, z.scale(ctx, a, multiplier), z.add(ctx, z.multiply(ctx, quotient, b), remainder))).toBe(true);
    }
  });

  it('computes exact quotients and rejects inexact ones', () => {
    const ctx = context(), z = Z();
    const f = z.fromIntegers(ctx, [2, -3, 1]), g = z.fromIntegers(ctx, [5, 0, 7, 3]);
    expect(z.equal(ctx, exactQuotient(ctx, z, z.multiply(ctx, f, g), f), g)).toBe(true);
    expect(code(() => exactQuotient(ctx, z, z.add(ctx, z.multiply(ctx, f, g), z.one(ctx)), f))).toBe('nonexact-division');
    expect(divides(ctx, z, f, z.multiply(ctx, f, g))).toBe(true);
    expect(divides(ctx, z, z.fromIntegers(ctx, [1, 2]), z.fromIntegers(ctx, [1, 1]))).toBe(false);
  });

  it('splits content and primitive parts across Z and Q', () => {
    const ctx = context(), z = Z(), q = Q();
    const p = z.fromIntegers(ctx, [-6, 12, -18]);
    expect(integerContent(ctx, z, p)).toBe(6n);
    expect(primitivePart(ctx, z, p).coefficients).toEqual([1n, -2n, 3n]);
    const qp = q.make(ctx, [rational(ctx, 1n, 2n), rational(ctx, -3n, 4n), rational(ctx, 5n, 6n)]);
    const { content, primitive } = rationalToPrimitive(ctx, z, qp);
    expect(primitive.coefficients).toEqual([6n, -9n, 10n]);
    expect([content.numerator, content.denominator]).toEqual([1n, 12n]);
    expect(q.equal(ctx, q.scale(ctx, integerToRational(ctx, q, primitive), content), qp)).toBe(true);
    expect(monic(ctx, q, qp).coefficients.at(-1)!.numerator).toBe(1n);
  });
});
