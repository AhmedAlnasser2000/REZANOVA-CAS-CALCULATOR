import { demand, type ExecutionContext } from '../execution';
import { QQ, ZZ } from './domain';
import { fpDistinctDegree, fpFactorSquareFree, fpFromBig, fpIsSquareFree, fpMonic } from './finite-field';
import { henselLift, liftModulus } from './hensel';
import { iabs, iadd, imul, ipow, irem, isqrt } from './integer';
import { wordPrimes } from './modular';
import { PolynomialRing, type Polynomial } from './polynomial';
import { exactQuotient, integerContent, primitivePart, rationalToPrimitive } from './polynomial-division';
import { rational, rMultiply, type Rational } from './rational';
import { squareFree } from './square-free';

export interface IrreducibleFactor { readonly factor: Polynomial<bigint>; readonly multiplicity: number }
export interface Factorization { readonly unit: Rational; readonly factors: readonly IrreducibleFactor[] }

/**
 * Number of suitable primes compared when choosing the prime with the fewest
 * modular factors. A heuristic that only affects speed, never what is solvable.
 */
const PRIME_CHOICE_SAMPLES = 3;

/** Mignotte-type bound: every factor g of f satisfies |coeff(g)| <= 2^deg(f) · ||f||_2. */
function factorCoefficientBound(ctx: ExecutionContext, f: readonly bigint[]): bigint {
  const norm2 = f.reduce((acc, c) => iadd(ctx, acc, imul(ctx, c, c)), 0n);
  return imul(ctx, ipow(ctx, 2n, f.length - 1), isqrt(ctx, norm2) + 1n);
}

function symmetricRep(ctx: ExecutionContext, c: bigint, m: bigint): bigint {
  let r = irem(ctx, c, m);
  if (r < 0n) r += m;
  return r * 2n > m ? r - m : r;
}

/**
 * Factor a primitive, square-free f ∈ ℤ[x] of degree ≥ 1 into irreducibles
 * (Cantor–Zassenhaus mod p, Hensel lifting, Zassenhaus recombination).
 * Complete for every input; worst cases are exponential in the number of
 * modular factors, which only costs budget.
 */
export function factorSquareFreeZ(ctx: ExecutionContext, ring: PolynomialRing<bigint>, f: Polynomial<bigint>): Polynomial<bigint>[] {
  demand(ring.domain === ZZ, 'domain-mismatch', 'integer factorization needs Z[x]');
  const n = ring.degree(ctx, f);
  demand(n >= 1, 'invalid-input', 'factor needs degree at least one');
  if (n === 1) return [f];
  const coefficients = f.coefficients, lc = coefficients[n];
  // Choose a good prime: p ∤ lc, f square-free mod p, fewest modular factors.
  let best: { p: number; count: number } | null = null, seen = 0;
  const primes = wordPrimes(ctx);
  for (let next = primes.next(); !next.done && seen < PRIME_CHOICE_SAMPLES; next = primes.next()) {
    const p = next.value;
    if (irem(ctx, lc, BigInt(p)) === 0n) continue;
    const fp = fpMonic(ctx, fpFromBig(ctx, coefficients, p), p);
    if (fp.length - 1 !== n || !fpIsSquareFree(ctx, fp, p)) continue;
    const count = fpDistinctDegree(ctx, fp, p).reduce((acc, { poly, degree }) => acc + (poly.length - 1) / degree, 0);
    seen++;
    if (best === null || count < best.count) best = { p, count };
    if (count === 1) break;
  }
  demand(best !== null, 'verification-failed', 'no suitable prime');
  if (best.count === 1) return [f];
  const p = best.p;
  const modular = fpFactorSquareFree(ctx, fpMonic(ctx, fpFromBig(ctx, coefficients, p), p), p);
  const bound = imul(ctx, imul(ctx, 2n, iabs(lc)), factorCoefficientBound(ctx, coefficients));
  const M = liftModulus(ctx, p, bound);
  return recombine(ctx, ring, f, henselLift(ctx, coefficients, modular, p, M), M);
}

/** Zassenhaus recombination over subsets of increasing size, with lc adjustment and trial division. */
function recombine(ctx: ExecutionContext, ring: PolynomialRing<bigint>, f: Polynomial<bigint>, lifted: bigint[][], M: bigint): Polynomial<bigint>[] {
  const found: Polynomial<bigint>[] = [];
  let rest = f, pool = lifted;
  const multiplyModM = (a: readonly bigint[], b: readonly bigint[]) => {
    const out = new Array<bigint>(a.length + b.length - 1).fill(0n);
    for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) out[i + j] = irem(ctx, out[i + j] + imul(ctx, a[i], b[j]), M);
    return out;
  };
  for (let size = 1; 2 * size <= pool.length; ) {
    let progressed = false;
    for (const subset of subsets(ctx, pool.length, size)) {
      const lcRest = ring.leading(ctx, rest);
      let candidate: bigint[] = [lcRest];
      for (const i of subset) candidate = multiplyModM(candidate, pool[i]);
      const g = ring.make(ctx, candidate.map(c => symmetricRep(ctx, c, M)));
      // Cheap filter: the adjusted constant term must divide lc·rest(0).
      const g0 = g.coefficients[0] ?? 0n, r0 = imul(ctx, lcRest, rest.coefficients[0] ?? 0n);
      if (g0 === 0n ? r0 !== 0n : irem(ctx, r0, g0) !== 0n) continue;
      const pp = primitivePart(ctx, ring, g);
      let quotient: Polynomial<bigint>;
      try { quotient = exactQuotient(ctx, ring, rest, pp); } catch (e) {
        if (e instanceof Error && 'code' in e && (e as { code: string }).code === 'nonexact-division') continue;
        throw e;
      }
      found.push(pp);
      rest = quotient;
      const chosen = new Set(subset);
      pool = pool.filter((_, i) => !chosen.has(i));
      progressed = true;
      break;
    }
    if (!progressed) size++;
  }
  if (ring.degree(ctx, rest) > 0) found.push(primitivePart(ctx, ring, rest));
  return found;
}

function* subsets(ctx: ExecutionContext, n: number, k: number): Generator<number[]> {
  const idx = Array.from({ length: k }, (_, i) => i);
  for (;;) {
    ctx.tick();
    yield [...idx];
    let i = k - 1;
    while (i >= 0 && idx[i] === n - k + i) i--;
    if (i < 0) return;
    idx[i]++;
    for (let j = i + 1; j < k; j++) idx[j] = idx[j - 1] + 1;
  }
}

/**
 * Complete factorization over ℚ: a = unit · ∏ fᵢ^mᵢ with primitive irreducible
 * fᵢ ∈ ℤ[x] of positive leading coefficient. Reconstructed exactly before return.
 */
export function factorQ(ctx: ExecutionContext, ring: PolynomialRing<Rational>, a: Polynomial<Rational>,
  z: PolynomialRing<bigint> = new PolynomialRing(ZZ, ring.variable)): Factorization {
  demand(ring.domain === QQ && z.domain === ZZ, 'domain-mismatch', 'rational factorization needs Q[x] and a Z[x] result ring');
  demand(!ring.isZero(ctx, a), 'invalid-input', 'factorization of zero');
  const factors: IrreducibleFactor[] = [];
  const sf = squareFree(ctx, ring, a);
  let unit = sf.unit;
  for (const { factor, multiplicity } of sf.factors) {
    const { content, primitive } = rationalToPrimitive(ctx, z, factor);
    for (let i = 0; i < multiplicity; i++) unit = rMultiply(ctx, unit, content);
    for (const g of factorSquareFreeZ(ctx, z, primitive)) factors.push(Object.freeze({ factor: g, multiplicity }));
  }
  factors.sort((x, y) => x.multiplicity - y.multiplicity || z.degree(ctx, x.factor) - z.degree(ctx, y.factor));
  const result = Object.freeze({ unit, factors: Object.freeze(factors) });
  verifyFactorization(ctx, ring, z, a, result);
  return result;
}

/** Factor a ℤ[x] polynomial; the unit carries the integer content and sign. */
export function factorZ(ctx: ExecutionContext, ring: PolynomialRing<bigint>, a: Polynomial<bigint>): Factorization {
  demand(ring.domain === ZZ, 'domain-mismatch', 'integer factorization needs Z[x]');
  const q = new PolynomialRing(QQ, ring.variable);
  return factorQ(ctx, q, q.make(ctx, a.coefficients.map(c => rational(ctx, c))), ring);
}

export function verifyFactorization(ctx: ExecutionContext, ring: PolynomialRing<Rational>, z: PolynomialRing<bigint>, a: Polynomial<Rational>, r: Factorization): void {
  let product = ring.constant(ctx, r.unit);
  for (const { factor, multiplicity } of r.factors) {
    demand(z.degree(ctx, factor) > 0 && z.leading(ctx, factor) > 0n && integerContent(ctx, z, factor) === 1n, 'verification-failed', 'factor not primitive');
    product = ring.multiply(ctx, product, ring.power(ctx, ring.make(ctx, factor.coefficients.map(c => rational(ctx, c))), multiplicity));
  }
  demand(ring.equal(ctx, product, a), 'verification-failed', 'factorization reconstruction');
}
