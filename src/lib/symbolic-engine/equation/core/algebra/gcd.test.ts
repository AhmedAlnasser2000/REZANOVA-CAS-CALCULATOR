import { describe, expect, it } from 'vitest';
import { EquationAlgebraError } from '../execution';
import { context, seeded } from '../test-support';
import { QQ, ZZ } from './domain';
import { PolynomialRing, type Polynomial } from './polynomial';
import { divides, primitivePart } from './polynomial-division';
import { extendedGcdQ, gcdQ, gcdZ } from './polynomial-gcd';
import { rational } from './rational';
import { squareFree } from './square-free';
import { resultantQ, resultantZ, subresultantGcdZ } from './subresultant';

const Z = () => new PolynomialRing(ZZ, 'x');
const Q = () => new PolynomialRing(QQ, 'x');

/** Independent oracle: Sylvester determinant by exact rational Gaussian elimination (test-only). */
function sylvesterDeterminant(a: bigint[], b: bigint[]): bigint {
  const m = a.length - 1, n = b.length - 1, size = m + n;
  if (size === 0) return 1n;
  const rows: bigint[][] = [];
  const ra = [...a].reverse(), rb = [...b].reverse();
  for (let i = 0; i < n; i++) rows.push(Array.from({ length: size }, (_, j) => (j - i >= 0 && j - i <= m ? ra[j - i] : 0n)));
  for (let i = 0; i < m; i++) rows.push(Array.from({ length: size }, (_, j) => (j - i >= 0 && j - i <= n ? rb[j - i] : 0n)));
  // Bareiss fraction-free determinant (independent small implementation).
  let sign = 1n, prev = 1n;
  const M = rows.map(r => [...r]);
  for (let k = 0; k < size - 1; k++) {
    if (M[k][k] === 0n) {
      const s = M.findIndex((r, i) => i > k && r[k] !== 0n);
      if (s < 0) return 0n;
      [M[k], M[s]] = [M[s], M[k]]; sign = -sign;
    }
    for (let i = k + 1; i < size; i++) for (let j = k + 1; j < size; j++) M[i][j] = (M[i][j] * M[k][k] - M[i][k] * M[k][j]) / prev;
    prev = M[k][k];
  }
  return sign * M[size - 1][size - 1];
}

const randomPoly = (rng: ReturnType<typeof seeded>, deg: number, bits: number) => {
  const c = Array.from({ length: deg + 1 }, () => rng.big(bits));
  if (c[deg] === 0n) c[deg] = 1n;
  return c;
};

describe('resultants', () => {
  it('match the Sylvester determinant oracle up to degree 6', () => {
    const ctx = context(), z = Z(), rng = seeded(21);
    for (let i = 0; i < 80; i++) {
      const a = randomPoly(rng, rng.int(1, 6), 20), b = randomPoly(rng, rng.int(1, 6), 20);
      expect(resultantZ(ctx, z, z.make(ctx, a), z.make(ctx, b))).toBe(sylvesterDeterminant(a, b));
    }
  });

  it('is zero exactly when a common factor exists, and handles constants', () => {
    const ctx = context(), z = Z();
    const f = z.fromIntegers(ctx, [-2, 1]);
    expect(resultantZ(ctx, z, z.multiply(ctx, f, z.fromIntegers(ctx, [1, 1])), z.multiply(ctx, f, z.fromIntegers(ctx, [3, 0, 1])))).toBe(0n);
    expect(resultantZ(ctx, z, z.fromIntegers(ctx, [1, 0, 1]), z.fromIntegers(ctx, [5]))).toBe(25n);
    // res(x^2+1, x-1) = 2; over Q, res((x^2+1)/2, 2x-2) = (1/2)^1 · 2^2 · 2 = 4.
    const q = Q();
    const r = resultantQ(ctx, q, q.make(ctx, [rational(ctx, 1n, 2n), rational(ctx, 0n), rational(ctx, 1n, 2n)]), q.fromIntegers(ctx, [-2, 2]));
    expect([r.numerator, r.denominator]).toEqual([4n, 1n]);
  });

  it('completes a degree-40 pair (the old 720-term determinant cap refuses degree 4+3)', () => {
    const ctx = context(), z = Z(), rng = seeded(40);
    const a = z.make(ctx, randomPoly(rng, 40, 16)), b = z.make(ctx, randomPoly(rng, 39, 16));
    const r = resultantZ(ctx, z, a, b);
    expect(typeof r).toBe('bigint');
    // Cross-check modulo the structure: res(a, b) = (-1)^(40·39) res(b, a).
    expect(resultantZ(ctx, z, b, a)).toBe(r);
  });
});

describe('gcd', () => {
  const build = (ctx: ReturnType<typeof context>, z: PolynomialRing<bigint>, ...parts: bigint[][]) =>
    parts.reduce<Polynomial<bigint>>((acc, p) => z.multiply(ctx, acc, z.make(ctx, p)), z.one(ctx));

  it('modular and subresultant gcds agree and divide both inputs', () => {
    const ctx = context(), z = Z(), rng = seeded(33);
    for (let i = 0; i < 30; i++) {
      const g = randomPoly(rng, rng.int(0, 6), 30);
      const a = build(ctx, z, g, randomPoly(rng, rng.int(0, 7), 30)), b = build(ctx, z, g, randomPoly(rng, rng.int(0, 7), 30));
      const modular = gcdZ(ctx, z, a, b), prs = subresultantGcdZ(ctx, z, a, b);
      expect(z.equal(ctx, modular, prs)).toBe(true);
      expect(divides(ctx, z, modular, a) && divides(ctx, z, modular, b)).toBe(true);
      expect(divides(ctx, z, primitivePart(ctx, z, z.make(ctx, g)), modular)).toBe(true);
    }
  });

  it('includes integer content and handles zero and coprime inputs', () => {
    const ctx = context(), z = Z();
    const a = z.fromIntegers(ctx, [6, 12]), b = z.fromIntegers(ctx, [-4, -8]);
    expect(gcdZ(ctx, z, a, b).coefficients).toEqual([2n, 4n]);
    expect(gcdZ(ctx, z, z.fromIntegers(ctx, [1, 1]), z.fromIntegers(ctx, [1, -1])).coefficients).toEqual([1n]);
    expect(gcdZ(ctx, z, z.zero(ctx), z.fromIntegers(ctx, [-3, -6])).coefficients).toEqual([3n, 6n]);
  });

  it('survives unlucky primes (gcd degree drops modulo p)', () => {
    const ctx = context(), z = Z();
    const p = 67108859n;
    // a and b differ by p in one coefficient so they share an extra factor modulo p only.
    const a = build(ctx, z, [1n, 1n], [p + 2n, 1n]), b = build(ctx, z, [1n, 1n], [2n, 1n]);
    expect(gcdZ(ctx, z, a, b).coefficients).toEqual([1n, 1n]);
  });

  it('handles degree 200 with 500-bit coefficients', () => {
    const ctx = context(), z = Z(), rng = seeded(200);
    const g = randomPoly(rng, 50, 500);
    const a = build(ctx, z, g, randomPoly(rng, 150, 500)), b = build(ctx, z, g, randomPoly(rng, 140, 500));
    const result = gcdZ(ctx, z, a, b);
    expect(z.degree(ctx, result)).toBeGreaterThanOrEqual(50);
    expect(divides(ctx, z, primitivePart(ctx, z, z.make(ctx, g)), result)).toBe(true);
    expect(divides(ctx, z, result, a) && divides(ctx, z, result, b)).toBe(true);
  });

  it('computes monic rational gcds and checked Bezout cofactors', () => {
    const ctx = context(), q = Q(), rng = seeded(8);
    for (let i = 0; i < 20; i++) {
      const a = q.fromIntegers(ctx, randomPoly(rng, rng.int(1, 8), 20)), b = q.fromIntegers(ctx, randomPoly(rng, rng.int(1, 8), 20));
      const g = gcdQ(ctx, q, a, b), e = extendedGcdQ(ctx, q, a, b);
      expect(q.equal(ctx, g, e.gcd)).toBe(true);
      expect(q.equal(ctx, q.add(ctx, q.multiply(ctx, e.s, a), q.multiply(ctx, e.t, b)), e.gcd)).toBe(true);
    }
  });
});

describe('square-free decomposition', () => {
  it('reconstructs (x-1)^3 (x+2)^2 with multiplicities', () => {
    const ctx = context(), q = Q(), z = Z();
    const a = q.fromIntegers(ctx, z.multiply(ctx, z.power(ctx, z.fromIntegers(ctx, [-1, 1]), 3), z.power(ctx, z.fromIntegers(ctx, [2, 1]), 2)).coefficients);
    const r = squareFree(ctx, q, q.scale(ctx, a, rational(ctx, -5n, 3n)));
    expect(r.factors.map(f => [f.multiplicity, f.factor.coefficients.map(c => c.numerator)])).toEqual([[2, [2n, 1n]], [3, [-1n, 1n]]]);
    expect([r.unit.numerator, r.unit.denominator]).toEqual([-5n, 3n]);
  });

  it('handles constants, already square-free input, and rejects zero', () => {
    const ctx = context(), q = Q();
    expect(squareFree(ctx, q, q.fromIntegers(ctx, [7])).factors).toHaveLength(0);
    expect(squareFree(ctx, q, q.fromIntegers(ctx, [-2, 0, 1])).factors.map(f => f.multiplicity)).toEqual([1]);
    expect(() => squareFree(ctx, q, q.zero(ctx))).toThrow(EquationAlgebraError);
  });

  it('decomposes degree-100 inputs with high multiplicities', () => {
    const ctx = context(), q = Q(), z = Z();
    // (x^3 - 2)^10 · (x^2 + x + 7)^20 · (x - 5)^30: degree 30 + 40 + 30 = 100
    const p = z.multiply(ctx, z.multiply(ctx, z.power(ctx, z.fromIntegers(ctx, [-2, 0, 0, 1]), 10), z.power(ctx, z.fromIntegers(ctx, [7, 1, 1]), 20)), z.power(ctx, z.fromIntegers(ctx, [-5, 1]), 30));
    const r = squareFree(ctx, q, q.fromIntegers(ctx, p.coefficients));
    expect(r.factors.map(f => [f.multiplicity, q.degree(ctx, f.factor)])).toEqual([[10, 3], [20, 2], [30, 1]]);
  });
});
