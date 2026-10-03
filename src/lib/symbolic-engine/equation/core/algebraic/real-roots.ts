import { demand, type ExecutionContext } from '../execution';
import { ZZ } from '../algebra/domain';
import { iabs, iadd, idivmod, imul, ipow, isub } from '../algebra/integer';
import { PolynomialRing, type Polynomial } from '../algebra/polynomial';
import { pseudoDivide, primitivePart } from '../algebra/polynomial-division';
import { rational, rAdd, rMultiply, rSubtract, type Rational } from '../algebra/rational';

/** Integer coefficient arrays, ascending. */
type Coeffs = bigint[];

function trimLow(c: Coeffs): Coeffs { let i = 0; while (i < c.length - 1 && c[i] === 0n) i++; return c.slice(i); }

/** Sign variations of the nonzero coefficients. */
function variations(ctx: ExecutionContext, c: readonly bigint[]): number {
  let count = 0, last = 0;
  for (const v of c) { ctx.tick(); if (v === 0n) continue; const s = v < 0n ? -1 : 1; if (last !== 0 && s !== last) count++; last = s; }
  return count;
}

/** P(x+1), by repeated synthetic division (O(n²) additions). */
export function taylorShift1(ctx: ExecutionContext, c: readonly bigint[]): Coeffs {
  const a = [...c], n = a.length;
  ctx.allocate(n);
  for (let i = 0; i < n - 1; i++) for (let j = n - 2; j >= i; j--) a[j] = iadd(ctx, a[j], a[j + 1]);
  return a;
}

/** Descartes bound for roots of P in the open interval (0,1): variations of (x+1)^n P(1/(x+1)). */
function descartes01(ctx: ExecutionContext, c: readonly bigint[]): number {
  return variations(ctx, trimLow(taylorShift1(ctx, [...c].reverse())));
}

/** 2^n P(x/2). */
function halve(ctx: ExecutionContext, c: readonly bigint[]): Coeffs {
  const n = c.length - 1;
  return c.map((v, i) => imul(ctx, v, 1n << BigInt(n - i)));
}

/** Integer upper bound B with every real root strictly inside (−B, B): 1 + ceil(max |aᵢ| / |aₙ|). */
export function cauchyBound(ctx: ExecutionContext, c: readonly bigint[]): bigint {
  const lead = iabs(c[c.length - 1]);
  let m = 0n;
  for (const v of c.slice(0, -1)) { const a = iabs(v); if (a > m) m = a; }
  const { q, r } = idivmod(ctx, m, lead);
  return 1n + q + (r === 0n ? 0n : 1n);
}

export interface RealInterval { readonly lo: Rational; readonly hi: Rational }

/**
 * Vincent–Collins–Akritas isolation of the roots of P in (0,1) for square-free P
 * with P(0) ≠ 0 and P(1) ≠ 0. Returns intervals (a/2^k, (a+1)/2^k) or exact points.
 */
function isolate01(ctx: ExecutionContext, p: Coeffs): { a: bigint; k: number; exact: boolean }[] {
  const out: { a: bigint; k: number; exact: boolean }[] = [];
  const stack: { c: Coeffs; a: bigint; k: number }[] = [{ c: p, a: 0n, k: 0 }];
  while (stack.length) {
    ctx.tick();
    const { c, a, k } = stack.pop()!;
    const v = descartes01(ctx, c);
    if (v === 0) continue;
    if (v === 1) { out.push({ a, k, exact: false }); continue; }
    const left = halve(ctx, c);
    // 2^n·P(1/2) is the sum of the halved coefficients: zero means an exact dyadic root.
    if (left.reduce((s, x) => iadd(ctx, s, x), 0n) === 0n) out.push({ a: 2n * a + 1n, k: k + 1, exact: true });
    stack.push({ c: taylorShift1(ctx, left), a: 2n * a + 1n, k: k + 1 });
    stack.push({ c: left, a: 2n * a, k: k + 1 });
  }
  return out;
}

/** Scale x → B·x: coefficient i multiplied by B^i. */
function scale(ctx: ExecutionContext, c: readonly bigint[], b: bigint): Coeffs {
  let power = 1n;
  return c.map(v => { const r = imul(ctx, v, power); power = imul(ctx, power, b); return r; });
}

/**
 * Disjoint isolating intervals for the real roots of a square-free f ∈ ℤ[x],
 * sorted ascending. Exact roots are returned as lo = hi. Every interval has a
 * Descartes count of exactly 1 and the total matches an independent Sturm count.
 */
export function isolateRealRoots(ctx: ExecutionContext, ring: PolynomialRing<bigint>, f: Polynomial<bigint>): RealInterval[] {
  demand(ring.domain === ZZ, 'domain-mismatch', 'real isolation needs Z[x]');
  demand(!ring.isZero(ctx, f), 'invalid-input', 'real isolation of zero');
  let c = [...f.coefficients];
  const intervals: RealInterval[] = [];
  if (c.length > 1 && c[0] === 0n) {
    intervals.push({ lo: rational(ctx, 0n), hi: rational(ctx, 0n) });
    c = trimLow(c);
    demand(c[0] !== 0n, 'invalid-input', 'real isolation needs a square-free polynomial');
  }
  if (c.length > 1) {
    const B = cauchyBound(ctx, c);
    for (const sign of [1n, -1n]) {
      const oriented = sign === 1n ? c : c.map((v, i) => (i % 2 === 1 ? -v : v));
      for (const { a, k, exact } of isolate01(ctx, scale(ctx, oriented, B))) {
        const den = 1n << BigInt(k);
        const lo = rational(ctx, imul(ctx, a, B), den), hi = exact ? lo : rational(ctx, imul(ctx, a + 1n, B), den);
        intervals.push(sign === 1n ? { lo, hi } : { lo: rational(ctx, -hi.numerator, hi.denominator), hi: rational(ctx, -lo.numerator, lo.denominator) });
      }
    }
  }
  intervals.sort((x, y) => compareRational(ctx, x.lo, y.lo));
  demand(intervals.length === sturmRealRootCount(ctx, ring, f), 'verification-failed', 'real root count differs from the Sturm count');
  return intervals;
}

export function compareRational(ctx: ExecutionContext, a: Rational, b: Rational): number {
  const d = isub(ctx, imul(ctx, a.numerator, b.denominator), imul(ctx, b.numerator, a.denominator));
  return d === 0n ? 0 : d < 0n ? -1 : 1;
}

/** Number of distinct real roots by a Sturm sequence of primitive pseudo-remainders (sign-correct). */
export function sturmRealRootCount(ctx: ExecutionContext, ring: PolynomialRing<bigint>, f: Polynomial<bigint>): number {
  const seq: Polynomial<bigint>[] = [f, ring.derivative(ctx, f)];
  while (!ring.isZero(ctx, seq[seq.length - 1])) {
    const a = seq[seq.length - 2], b = seq[seq.length - 1];
    const { remainder, multiplier } = pseudoDivide(ctx, ring, a, b);
    if (ring.isZero(ctx, remainder)) break;
    // −rem(a, b) up to a positive factor: −sign(multiplier)·prem, then primitive part (positive content).
    const signed = multiplier < 0n ? remainder : ring.negate(ctx, remainder);
    const pp = primitivePart(ctx, ring, signed);
    seq.push(ring.leading(ctx, signed) < 0n === ring.leading(ctx, pp) < 0n ? pp : ring.negate(ctx, pp));
  }
  const signsAt = (atPlus: boolean) => seq.map(p => {
    const d = ring.degree(ctx, p), lc = ring.leading(ctx, p);
    const s = lc < 0n ? -1n : 1n;
    return atPlus || d % 2 === 0 ? s : -s;
  });
  const changes = (signs: bigint[]) => signs.reduce((acc, s, i) => acc + (i > 0 && s !== signs[i - 1] ? 1 : 0), 0);
  return changes(signsAt(false)) - changes(signsAt(true));
}

/** Exact value of f at a rational point. */
export function evaluateAt(ctx: ExecutionContext, f: Polynomial<bigint>, x: Rational): Rational {
  // Horner with a common denominator: Σ cᵢ nⁱ d^(n−i) / dⁿ.
  const c = f.coefficients, n = c.length - 1;
  if (n < 0) return rational(ctx, 0n);
  let acc = 0n;
  for (let i = n; i >= 0; i--) acc = iadd(ctx, imul(ctx, acc, x.numerator), imul(ctx, c[i], ipow(ctx, x.denominator, n - i)));
  return rational(ctx, acc, ipow(ctx, x.denominator, n));
}

/** Descartes upper bound for the number of roots of f in the open interval (lo, hi). */
export function rootsInIntervalBound(ctx: ExecutionContext, f: Polynomial<bigint>, lo: Rational, hi: Rational): number {
  // g(t) = f(lo + (hi − lo)·t) with cleared denominators, then Descartes on (0,1).
  const width = rSubtract(ctx, hi, lo);
  let g: Rational[] = [rational(ctx, 0n)];
  for (let i = f.coefficients.length - 1; i >= 0; i--) {
    // g ← g·(lo + width·t) + cᵢ
    const next: Rational[] = Array.from({ length: g.length + 1 }, () => rational(ctx, 0n));
    g.forEach((v, j) => { next[j] = rAdd(ctx, next[j], rMultiply(ctx, v, lo)); next[j + 1] = rAdd(ctx, next[j + 1], rMultiply(ctx, v, width)); });
    next[0] = rAdd(ctx, next[0], rational(ctx, f.coefficients[i]));
    g = next;
  }
  let lcm = 1n;
  for (const v of g) lcm = imul(ctx, lcm, v.denominator) / gcdBig(lcm, v.denominator);
  const ints = g.map(v => imul(ctx, v.numerator, lcm / v.denominator));
  while (ints.length > 1 && ints[ints.length - 1] === 0n) ints.pop();
  return descartes01(ctx, ints);
}

function gcdBig(a: bigint, b: bigint): bigint { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; }
