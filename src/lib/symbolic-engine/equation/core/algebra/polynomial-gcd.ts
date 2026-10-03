import { demand, type ExecutionContext } from '../execution';
import { QQ, ZZ } from './domain';
import { igcd } from './integer';
import { crtCombine, invMod, mulMod, residue, subMod, symmetric, wordPrimes } from './modular';
import { PolynomialRing, type Polynomial } from './polynomial';
import { divideWithRemainder, divides, integerContent, integerToRational, monic, primitivePart, rationalToPrimitive } from './polynomial-division';
import type { Rational } from './rational';
import { checkCommonDivisor, subresultantGcdZ } from './subresultant';

/** Monic gcd of residue arrays modulo a word prime (ascending, no trailing zeros). */
function gcdModP(ctx: ExecutionContext, a: number[], b: number[], p: number): number[] {
  const trim = (v: number[]) => { while (v.length && v[v.length - 1] === 0) v.pop(); return v; };
  let r0 = trim([...a]), r1 = trim([...b]);
  while (r1.length) {
    const inv = invMod(r1[r1.length - 1], p);
    while (r0.length >= r1.length) {
      ctx.tick(r1.length);
      const c = mulMod(r0[r0.length - 1], inv, p), shift = r0.length - r1.length;
      for (let j = 0; j < r1.length; j++) r0[shift + j] = subMod(r0[shift + j], mulMod(c, r1[j], p), p);
      trim(r0);
    }
    [r0, r1] = [r1, r0];
  }
  if (!r0.length) return r0;
  const inv = invMod(r0[r0.length - 1], p);
  return r0.map(c => mulMod(c, inv, p));
}

/**
 * GCD in ℤ[x] by Brown's modular algorithm. Unlucky primes are detected by
 * degree; termination is by exact trial division, so a returned gcd is always
 * verified. If the word-prime supply were ever exhausted the subresultant PRS,
 * a complete method, takes over. Result has positive leading coefficient.
 */
export function gcdZ(ctx: ExecutionContext, ring: PolynomialRing<bigint>, a: Polynomial<bigint>, b: Polynomial<bigint>): Polynomial<bigint> {
  demand(ring.domain === ZZ, 'domain-mismatch', 'integer gcd needs Z[x]');
  if (ring.isZero(ctx, a) || ring.isZero(ctx, b)) return subresultantGcdZ(ctx, ring, a, b);
  const d = igcd(ctx, integerContent(ctx, ring, a), integerContent(ctx, ring, b));
  const A = primitivePart(ctx, ring, a), B = primitivePart(ctx, ring, b);
  if (ring.degree(ctx, A) === 0 || ring.degree(ctx, B) === 0) return ring.constant(ctx, d);
  const lcA = ring.leading(ctx, A), lcB = ring.leading(ctx, B), gamma = igcd(ctx, lcA, lcB);
  let modulus = 1n, accumulated: bigint[] | null = null, bestDegree = Infinity, previous: bigint[] | null = null;
  const primes = wordPrimes(ctx);
  for (let next = primes.next(); !next.done; next = primes.next()) {
    const p = next.value;
    if (residue(ctx, lcA, p) === 0 || residue(ctx, lcB, p) === 0) continue;
    const gp = gcdModP(ctx, A.coefficients.map(c => residue(ctx, c, p)), B.coefficients.map(c => residue(ctx, c, p)), p);
    const e = gp.length - 1;
    if (e === 0) return ring.constant(ctx, d);
    if (e > bestDegree) continue; // unlucky prime
    const scaled = gp.map(c => mulMod(c, residue(ctx, gamma, p), p));
    if (e < bestDegree) {
      bestDegree = e; modulus = BigInt(p); accumulated = scaled.map(BigInt); previous = null;
    } else {
      accumulated = accumulated!.map((c, i) => crtCombine(ctx, c, modulus, scaled[i], p));
      modulus *= BigInt(p);
    }
    const lifted = accumulated!.map(c => symmetric(ctx, c, modulus));
    const stable = previous !== null && lifted.every((c, i) => c === previous![i]);
    previous = lifted;
    if (!stable) continue;
    const candidate = primitivePart(ctx, ring, ring.make(ctx, lifted));
    if (divides(ctx, ring, candidate, A) && divides(ctx, ring, candidate, B)) {
      const result = ring.scale(ctx, candidate, d);
      checkCommonDivisor(ctx, ring, result, a, b);
      return result;
    }
  }
  return subresultantGcdZ(ctx, ring, a, b);
}

/** Monic gcd in ℚ[x]; gcd(0, 0) = 0. Verified as a common divisor. */
export function gcdQ(ctx: ExecutionContext, ring: PolynomialRing<Rational>, a: Polynomial<Rational>, b: Polynomial<Rational>): Polynomial<Rational> {
  demand(ring.domain === QQ, 'domain-mismatch', 'rational gcd needs Q[x]');
  if (ring.isZero(ctx, a) && ring.isZero(ctx, b)) return a;
  if (ring.isZero(ctx, a)) return monic(ctx, ring, b);
  if (ring.isZero(ctx, b)) return monic(ctx, ring, a);
  const z = new PolynomialRing(ZZ, ring.variable);
  const g = gcdZ(ctx, z, rationalToPrimitive(ctx, z, a).primitive, rationalToPrimitive(ctx, z, b).primitive);
  const result = monic(ctx, ring, integerToRational(ctx, ring, g));
  checkCommonDivisor(ctx, ring, result, a, b);
  return result;
}

export interface ExtendedGcd<E> { readonly gcd: Polynomial<E>; readonly s: Polynomial<E>; readonly t: Polynomial<E> }

/** s·a + t·b = gcd (monic) over ℚ[x], checked before return. */
export function extendedGcdQ(ctx: ExecutionContext, ring: PolynomialRing<Rational>, a: Polynomial<Rational>, b: Polynomial<Rational>): ExtendedGcd<Rational> {
  demand(ring.domain === QQ, 'domain-mismatch', 'extended gcd needs Q[x]');
  let [r0, r1] = [a, b];
  let [s0, s1] = [ring.one(ctx), ring.zero(ctx)];
  let [t0, t1] = [ring.zero(ctx), ring.one(ctx)];
  while (!ring.isZero(ctx, r1)) {
    const { quotient, remainder } = divideWithRemainder(ctx, ring, r0, r1);
    [r0, r1] = [r1, remainder];
    [s0, s1] = [s1, ring.subtract(ctx, s0, ring.multiply(ctx, quotient, s1))];
    [t0, t1] = [t1, ring.subtract(ctx, t0, ring.multiply(ctx, quotient, t1))];
  }
  if (!ring.isZero(ctx, r0)) {
    const inv = QQ.inverse(ctx, ring.leading(ctx, r0));
    r0 = ring.scale(ctx, r0, inv); s0 = ring.scale(ctx, s0, inv); t0 = ring.scale(ctx, t0, inv);
  }
  demand(ring.equal(ctx, ring.add(ctx, ring.multiply(ctx, s0, a), ring.multiply(ctx, t0, b)), r0), 'verification-failed', 'polynomial Bezout identity');
  checkCommonDivisor(ctx, ring, r0, a, b);
  return { gcd: r0, s: s0, t: t0 };
}

// Exported for tests that compare modular and PRS paths on residues.
export const internal = { gcdModP };
