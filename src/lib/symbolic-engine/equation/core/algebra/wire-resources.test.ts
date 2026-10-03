import { describe, expect, it } from 'vitest';
import { EquationAlgebraError } from '../execution';
import { context, seeded } from '../test-support';
import { QQ, ZZ } from './domain';
import { PolynomialRing } from './polynomial';
import { gcdZ } from './polynomial-gcd';
import { rational } from './rational';
import { resultantZ } from './subresultant';
import { decodePolynomial, decodeRational, encodePolynomial } from './wire';

const failure = (run: () => unknown) => {
  try { run(); } catch (e) { return e instanceof EquationAlgebraError ? `${e.code}${e.stop ? `:${e.stop}` : ''}` : 'other'; }
  return 'none';
};

describe('wire codec', () => {
  it('round-trips large exact values through JSON', () => {
    const ctx = context(), q = new PolynomialRing(QQ, 'x'), z = new PolynomialRing(ZZ, 'x');
    const big = 10n ** 80n + 1n;
    const qp = q.make(ctx, [rational(ctx, big, 7n), rational(ctx, -3n, 1n), rational(ctx, 1n, big)]);
    const back = decodePolynomial(ctx, q, JSON.parse(JSON.stringify(encodePolynomial(ctx, q, qp))));
    expect(q.equal(ctx, back, qp)).toBe(true);
    const zp = z.make(ctx, [big, -big, 0n, 5n]);
    expect(z.equal(ctx, decodePolynomial(ctx, z, JSON.parse(JSON.stringify(encodePolynomial(ctx, z, zp)))), zp)).toBe(true);
  });

  it('rejects malformed, noncanonical and mismatched data', () => {
    const ctx = context(), q = new PolynomialRing(QQ, 'x'), z = new PolynomialRing(ZZ, 'x');
    expect(failure(() => decodeRational(ctx, ['2', '4']))).toBe('invalid-input');
    expect(failure(() => decodeRational(ctx, ['1', '-2']))).toBe('invalid-input');
    expect(failure(() => decodeRational(ctx, ['01', '2']))).toBe('invalid-input');
    expect(failure(() => decodeRational(ctx, [1, '2']))).toBe('invalid-input');
    const good = { version: 1, domain: 'ZZ', variable: 'x', coefficients: ['1', '2'] };
    expect(failure(() => decodePolynomial(ctx, z, { ...good, coefficients: ['1', '0'] }))).toBe('invalid-input');
    expect(failure(() => decodePolynomial(ctx, z, { ...good, extra: 1 }))).toBe('invalid-input');
    expect(failure(() => decodePolynomial(ctx, z, { ...good, variable: 'y' }))).toBe('domain-mismatch');
    expect(failure(() => decodePolynomial(ctx, q, good))).toBe('domain-mismatch');
    expect(failure(() => decodePolynomial(ctx, z, { ...good, version: 2 }))).toBe('invalid-input');
    expect(failure(() => decodePolynomial(ctx, z, Object.defineProperty({ ...good }, 'domain', { get: () => 'ZZ', enumerable: true })))).toBe('invalid-input');
  });
});

describe('resources', () => {
  const pair = () => {
    const ctx = context(), z = new PolynomialRing(ZZ, 'x'), rng = seeded(4);
    const g = z.make(ctx, Array.from({ length: 21 }, () => rng.big(64) || 1n));
    const a = z.multiply(ctx, g, z.make(ctx, Array.from({ length: 31 }, () => rng.big(64) || 1n)));
    const b = z.multiply(ctx, g, z.make(ctx, Array.from({ length: 26 }, () => rng.big(64) || 1n)));
    return { z, a, b };
  };

  it('a tiny shared budget stops nested work with a typed stop and no partial value', () => {
    const { z, a, b } = pair();
    const tiny = context({ work: 5_000 });
    let value: unknown = undefined;
    expect(failure(() => { value = gcdZ(tiny, z, a, b); })).toBe('resource:work');
    expect(value).toBeUndefined();
    expect(failure(() => gcdZ(tiny, z, a, b))).toBe('resource:work');
    expect(failure(() => resultantZ(context({ allocation: 200 }), z, a, b))).toBe('resource:allocation');
  });

  it('a larger budget computes the identical exact value', () => {
    const { z, a, b } = pair();
    const r1 = gcdZ(context(), z, a, b), r2 = gcdZ(context(), z, a, b);
    expect(r1.coefficients).toEqual(r2.coefficients);
    expect(z.degree(context(), r1)).toBeGreaterThanOrEqual(20);
  });

  it('cancellation stops at the next charge', () => {
    const { z, a, b } = pair();
    let calls = 0;
    const ctx = context({}, () => ++calls > 1_000);
    expect(failure(() => resultantZ(ctx, z, a, b))).toBe('resource:cancelled');
  });
});
