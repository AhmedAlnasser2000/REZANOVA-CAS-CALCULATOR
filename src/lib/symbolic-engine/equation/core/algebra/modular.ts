import { demand, type ExecutionContext } from '../execution';
import { iabs, iadd, iextgcd, imul, iquot, irem, isqrt, isub } from './integer';
import { rational, type Rational } from './rational';

/**
 * Word-sized prime arithmetic. Primes stay below 2^26 so that every product of
 * two residues is below 2^52 and exact in a JavaScript number. This is a
 * representation bound, not a solver limit: the sequence holds millions of
 * primes, and callers that could exhaust it fall back to a complete method.
 */
const WORD_PRIME_EXCLUSIVE_BOUND = 1 << 26;

export function isWordPrime(ctx: ExecutionContext, n: number): boolean {
  demand(Number.isSafeInteger(n) && n >= 0 && n < WORD_PRIME_EXCLUSIVE_BOUND, 'invalid-input', 'word prime candidate');
  if (n < 2) return false;
  if (n % 2 === 0) return n === 2;
  for (let f = 3; f * f <= n; f += 2) { ctx.tick(); if (n % f === 0) return false; }
  return true;
}

/** Deterministic descending sequence of word primes; exhaustion is reported as `null`. */
export function* wordPrimes(ctx: ExecutionContext): Generator<number, null> {
  for (let n = WORD_PRIME_EXCLUSIVE_BOUND - 1; n >= 3; n -= 2) if (isWordPrime(ctx, n)) yield n;
  return null;
}

export function mulMod(a: number, b: number, p: number): number { return (a * b) % p; }
export function addMod(a: number, b: number, p: number): number { const s = a + b; return s >= p ? s - p : s; }
export function subMod(a: number, b: number, p: number): number { const s = a - b; return s < 0 ? s + p : s; }

export function invMod(a: number, p: number): number {
  let [r0, r1, s0, s1] = [p, a % p, 0, 1];
  while (r1 !== 0) {
    const q = Math.floor(r0 / r1);
    [r0, r1] = [r1, r0 - q * r1];
    [s0, s1] = [s1, s0 - q * s1];
  }
  demand(r0 === 1, 'division-by-zero', 'residue is not invertible');
  return ((s0 % p) + p) % p;
}

/** Residue of a bigint modulo a word prime, in [0, p). */
export function residue(ctx: ExecutionContext, v: bigint, p: number): number {
  const r = irem(ctx, v, BigInt(p));
  return Number(r < 0n ? r + BigInt(p) : r);
}

/**
 * Chinese remaindering: given x ≡ a (mod m) and x ≡ b (mod p), return the
 * unique x mod m·p in [0, m·p). Checked before return.
 */
export function crtCombine(ctx: ExecutionContext, a: bigint, m: bigint, b: number, p: number): bigint {
  const mp = residue(ctx, m, p);
  const k = mulMod(subMod(b, residue(ctx, a, p), p), invMod(mp, p), p);
  const x = iadd(ctx, a, imul(ctx, m, BigInt(k)));
  demand(residue(ctx, x, p) === b && irem(ctx, isub(ctx, x, a), m) === 0n, 'verification-failed', 'chinese remainder');
  return x;
}

/** Symmetric representative in (-m/2, m/2]. */
export function symmetric(ctx: ExecutionContext, x: bigint, m: bigint): bigint {
  ctx.tick();
  let r = irem(ctx, x, m);
  if (r < 0n) r += m;
  return r * 2n > m ? r - m : r;
}

/**
 * Rational reconstruction (Wang): find n/d with |n|, d <= sqrt(m/2) and
 * n ≡ u·d (mod m). Returns null when no such fraction exists.
 */
export function rationalReconstruct(ctx: ExecutionContext, u: bigint, m: bigint): Rational | null {
  demand(m > 1n, 'invalid-input', 'reconstruction modulus');
  const bound = isqrt(ctx, iquot(ctx, m, 2n));
  let [r0, r1, t0, t1] = [m, ((irem(ctx, u, m) + m) % m), 0n, 1n];
  while (r1 > bound) {
    const q = iquot(ctx, r0, r1);
    [r0, r1] = [r1, isub(ctx, r0, imul(ctx, q, r1))];
    [t0, t1] = [t1, isub(ctx, t0, imul(ctx, q, t1))];
  }
  if (t1 === 0n || iabs(t1) > bound || iextgcd(ctx, r1, t1).g !== 1n) return null;
  const value = rational(ctx, r1, t1);
  demand(irem(ctx, isub(ctx, imul(ctx, u, value.denominator), value.numerator), m) === 0n, 'verification-failed', 'rational reconstruction');
  return value;
}
