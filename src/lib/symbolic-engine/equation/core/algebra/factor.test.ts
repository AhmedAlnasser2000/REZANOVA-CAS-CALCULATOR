import { describe, expect, it } from 'vitest';
import { EquationAlgebraError } from '../execution';
import { context, seeded } from '../test-support';
import { QQ, ZZ } from './domain';
import { fpFactorSquareFree, fpMul } from './finite-field';
import { factorQ, factorZ } from './factor';
import { PolynomialRing } from './polynomial';
import { rational } from './rational';

const Z = () => new PolynomialRing(ZZ, 'x');
const shape = (f: ReturnType<typeof factorZ>) =>
  f.factors.map(x => `${x.multiplicity}:${x.factor.coefficients.join(',')}`).sort();

describe('finite field factorization', () => {
  it('splits a product of distinct irreducibles modulo p', () => {
    const ctx = context(), p = 67108859;
    const a = [1, 1, 1], b = [3, 0, 1, 1], c = [p - 5, 1]; // irreducibility not assumed; product check only
    const f = fpMul(ctx, fpMul(ctx, a, b, p), c, p);
    const parts = fpFactorSquareFree(ctx, f, p);
    expect(parts.reduce((acc, x) => fpMul(ctx, acc, x, p), [1])).toEqual(f);
    expect(parts.every(x => x[x.length - 1] === 1)).toBe(true);
  });
});

describe('factorization over Z and Q', () => {
  it('factors cyclotomic products x^n - 1', () => {
    const ctx = context(), z = Z();
    const xn = (n: number) => z.make(ctx, [-1n, ...Array<bigint>(n - 1).fill(0n), 1n]);
    expect(factorZ(ctx, z, xn(12)).factors).toHaveLength(6); // divisors of 12
    expect(factorZ(ctx, z, xn(60)).factors).toHaveLength(12);
    const f105 = factorZ(ctx, z, xn(105));
    expect(f105.factors).toHaveLength(8);
    const phi105 = f105.factors.find(f => z.degree(ctx, f.factor) === 48)!;
    expect(phi105.factor.coefficients).toContain(-2n); // the famous coefficient
  });

  it('factors repeated and mixed factors with exact reconstruction', () => {
    const ctx = context(), z = Z();
    const p = z.multiply(ctx, z.multiply(ctx, z.power(ctx, z.fromIntegers(ctx, [-1, 1]), 3), z.power(ctx, z.fromIntegers(ctx, [1, 0, 1]), 2)), z.fromIntegers(ctx, [-1, -1, 0, 0, 0, 1]));
    const f = factorZ(ctx, z, z.scale(ctx, p, -6n));
    expect(shape(f)).toEqual(['1:-1,-1,0,0,0,1', '2:1,0,1', '3:-1,1']);
    expect([f.unit.numerator, f.unit.denominator]).toEqual([-6n, 1n]);
  });

  it('reports x^4+1 and the Swinnerton-Dyer polynomial S3 irreducible', () => {
    const ctx = context(), z = Z();
    expect(factorZ(ctx, z, z.fromIntegers(ctx, [1, 0, 0, 0, 1])).factors).toHaveLength(1);
    // S3 = minimal polynomial of sqrt2+sqrt3+sqrt5 (degree 8)
    const s3 = z.fromIntegers(ctx, [576, 0, -960, 0, 352, 0, -40, 0, 1]);
    const f = factorZ(ctx, z, s3);
    expect(f.factors).toHaveLength(1);
    expect(f.factors[0].factor.coefficients).toEqual(s3.coefficients);
  });

  it('recovers random degree-10 factors with 100-bit coefficients', () => {
    const ctx = context(), z = Z(), rng = seeded(10);
    const parts = Array.from({ length: 3 }, () => z.make(ctx, [...Array.from({ length: 10 }, () => rng.big(100) || 1n), 1n + (rng.big(20) < 0n ? 2n : 3n)]));
    const product = parts.reduce((acc, x) => z.multiply(ctx, acc, x), z.one(ctx));
    const f = factorZ(ctx, z, product);
    expect(f.factors.reduce((acc, x) => acc + z.degree(ctx, x.factor) * x.multiplicity, 0)).toBe(30);
    expect(f.factors.length).toBeGreaterThanOrEqual(3);
  });

  it('factors over Q with rational content', () => {
    const ctx = context(), q = new PolynomialRing(QQ, 'x');
    const a = q.make(ctx, [rational(ctx, -1n, 2n), rational(ctx, 0n), rational(ctx, 1n, 8n)]); // (x^2 - 4)/8
    const f = factorQ(ctx, q, a);
    expect(f.factors.map(x => x.factor.coefficients.join(',')).sort()).toEqual(['-2,1', '2,1']);
    expect([f.unit.numerator, f.unit.denominator]).toEqual([1n, 8n]);
  });

  it('stops on a tiny budget with a typed stop', () => {
    const ctx = context({ work: 2_000 }), z = Z();
    try { factorZ(ctx, z, z.fromIntegers(ctx, [576, 0, -960, 0, 352, 0, -40, 0, 1])); throw new Error('expected stop'); } catch (e) {
      expect(e instanceof EquationAlgebraError && e.stop).toBe('work');
    }
  });
});
