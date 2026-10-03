import { describe, expect, it } from 'vitest';
import { EquationAlgebraError } from '../execution';
import { context, seeded } from '../test-support';
import { bitLength, iexact, iextgcd, igcd, imul, ipow, isqrt } from './integer';
import { crtCombine, invMod, isWordPrime, rationalReconstruct, residue, symmetric, wordPrimes } from './modular';
import { rAdd, rCompare, rDivide, rEqual, rInverse, rMultiply, rNegate, rSubtract, rational } from './rational';

const code = (run: () => unknown) => { try { run(); } catch (e) { return e instanceof EquationAlgebraError ? e.code : 'other'; } return 'none'; };

describe('integers', () => {
  it('keeps precision beyond 2^53', () => {
    const ctx = context();
    expect(imul(ctx, 9007199254740991n, 3n)).toBe(27021597764222973n);
    expect(ipow(ctx, 2n, 200) + 1n).toBe(1606938044258990275541962092341162602522202993782792835301377n);
  });

  it('computes bit lengths exactly', () => {
    for (const [v, n] of [[0n, 0], [1n, 1], [-255n, 8], [2n ** 64n, 65], [2n ** 64n - 1n, 64], [3n * 2n ** 300n, 302]] as const) expect(bitLength(v)).toBe(n);
  });

  it('checks gcd, Bezout and exact division', () => {
    const ctx = context(), rng = seeded(11);
    for (let i = 0; i < 40; i++) {
      const a = rng.big(400), b = rng.big(300);
      const { g, s, t } = iextgcd(ctx, a, b);
      expect(s * a + t * b).toBe(g);
      expect(g).toBe(igcd(ctx, a, b));
      if (g !== 0n) { expect(a % g).toBe(0n); expect(b % g).toBe(0n); }
    }
    expect(code(() => iexact(ctx, 7n, 2n))).toBe('nonexact-division');
    expect(code(() => iexact(ctx, 7n, 0n))).toBe('division-by-zero');
  });

  it('computes floor square roots', () => {
    const ctx = context();
    expect(isqrt(ctx, 10n ** 100n)).toBe(10n ** 50n);
    expect(isqrt(ctx, 10n ** 100n - 1n)).toBe(10n ** 50n - 1n);
    expect(isqrt(ctx, 2n)).toBe(1n);
  });
});

describe('rationals', () => {
  it('normalizes sign and gcd, and rejects zero denominators', () => {
    const ctx = context();
    const r = rational(ctx, 6n, -4n);
    expect([r.numerator, r.denominator]).toEqual([-3n, 2n]);
    expect([rational(ctx, 0n, -7n).numerator, rational(ctx, 0n, -7n).denominator]).toEqual([0n, 1n]);
    expect(code(() => rational(ctx, 1n, 0n))).toBe('division-by-zero');
    expect(code(() => rational(ctx, '01'))).toBe('invalid-input');
    expect(code(() => rational(ctx, 0.5))).toBe('invalid-input');
    expect(code(() => rational(ctx, '-0'))).toBe('invalid-input');
    expect(rational(ctx, '-123456789012345678901234567890').numerator).toBe(-123456789012345678901234567890n);
  });

  it('handles 300-digit cross-cancelling fractions exactly', () => {
    const ctx = context();
    const big = 10n ** 300n + 7n, other = 10n ** 299n + 3n;
    const a = rational(ctx, big * 3n, other * 5n), b = rational(ctx, other * 10n, big * 9n);
    const p = rMultiply(ctx, a, b);
    expect([p.numerator, p.denominator]).toEqual([2n, 3n]);
  });

  it('satisfies field laws on seeded values', () => {
    const ctx = context(), rng = seeded(7);
    const r = () => rational(ctx, rng.big(120), (rng.big(90) || 1n));
    for (let i = 0; i < 60; i++) {
      const a = r(), b = r(), c = r();
      expect(rEqual(ctx, rAdd(ctx, rAdd(ctx, a, b), c), rAdd(ctx, a, rAdd(ctx, b, c)))).toBe(true);
      expect(rEqual(ctx, rMultiply(ctx, a, rAdd(ctx, b, c)), rAdd(ctx, rMultiply(ctx, a, b), rMultiply(ctx, a, c)))).toBe(true);
      expect(rEqual(ctx, rAdd(ctx, a, rNegate(ctx, a)), rational(ctx, 0n))).toBe(true);
      if (a.numerator !== 0n) expect(rEqual(ctx, rMultiply(ctx, a, rInverse(ctx, a)), rational(ctx, 1n))).toBe(true);
      expect(rEqual(ctx, rSubtract(ctx, rAdd(ctx, a, b), b), a)).toBe(true);
      if (b.numerator !== 0n) expect(rEqual(ctx, rMultiply(ctx, rDivide(ctx, a, b), b), a)).toBe(true);
    }
    expect(rCompare(ctx, rational(ctx, 1n, 3n), rational(ctx, 1n, 2n))).toBe(-1);
  });
});

describe('modular tools', () => {
  it('produces word primes and inverses', () => {
    const ctx = context();
    const it = wordPrimes(ctx);
    const first = [it.next().value, it.next().value] as number[];
    expect(first[0]).toBe(67108859);
    for (const p of first) expect(isWordPrime(ctx, p)).toBe(true);
    expect(isWordPrime(ctx, 67108863)).toBe(false);
    expect(mulInvCheck(first[0])).toBe(true);
  });

  it('combines residues by CRT and lifts symmetrically', () => {
    const ctx = context();
    const x = -123456789012345678901234567n;
    let m = 1n, a = 0n;
    for (const p of [67108859, 67108837, 67108819, 67108777]) { a = crtCombine(ctx, a, m, residue(ctx, x, p), p); m *= BigInt(p); }
    expect(symmetric(ctx, a, m)).toBe(x);
  });

  it('reconstructs rationals and refuses impossible ones', () => {
    const ctx = context();
    const m = 67108859n * 67108837n * 67108819n;
    const target = rational(ctx, -12345n, 6789n);
    const u = ((target.numerator * modInverse(target.denominator, m)) % m + m) % m;
    const back = rationalReconstruct(ctx, u, m)!;
    expect([back.numerator, back.denominator]).toEqual([-4115n, 2263n]);
    // Exhaustive over a small modulus: a returned fraction is valid; null means none exists within the bound.
    const small = 97n, bound = 6n;
    for (let u = 0n; u < small; u++) {
      const found = rationalReconstruct(ctx, u, small);
      let exists = false;
      for (let d = 1n; d <= bound && !exists; d++) for (let n = -bound; n <= bound; n++) if ((((n - u * d) % small) + small) % small === 0n) { exists = true; break; }
      if (found) expect((((found.numerator - u * found.denominator) % small) + small) % small).toBe(0n);
      else expect(exists).toBe(false);
    }
  });
});

function mulInvCheck(p: number) { for (const a of [1, 2, 12345, p - 1]) if ((a * invMod(a, p)) % p !== 1) return false; return true; }
function modInverse(a: bigint, m: bigint) {
  let [r0, r1, s0, s1] = [m, ((a % m) + m) % m, 0n, 1n];
  while (r1 !== 0n) { const q = r0 / r1; [r0, r1] = [r1, r0 - q * r1]; [s0, s1] = [s1, s0 - q * s1]; }
  return ((s0 % m) + m) % m;
}
