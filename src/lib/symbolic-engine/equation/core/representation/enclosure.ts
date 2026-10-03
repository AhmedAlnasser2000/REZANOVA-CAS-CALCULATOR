import type { ExecutionContext } from '../execution';
import { bitLength, imul, iroot, ipow } from '../algebra/integer';
import { rAbs, rAdd, rational, rDivide, rMultiply, rNegate, rSubtract, type Rational } from '../algebra/rational';
import { compareRational } from '../algebraic/real-roots';
import { refineReal } from '../algebraic/root-of';
import type { ExprId, ExpressionStore } from './expression';

/**
 * Certified enclosures of real number-only expressions: exact rational
 * intervals [lo, hi] that contain the true value, at a working precision of
 * `bits`. Endpoints are rounded outward to dyadic rationals; every series
 * carries a rigorous remainder bound. Widths shrink to zero as `bits` grows,
 * so callers refine by doubling `bits` until a question is decided — under
 * the budget only, never a precision cap.
 *
 * Covered: rationals, real algebraic numbers, π (Machin), exp (Taylor with
 * halving and squaring), log (atanh series with 2-power reduction), W₀ and
 * W₋₁ (certified bisection on u·eᵘ), sin and cos (reduction by π/2, alternating
 * Taylor series), tan, atan (Euler series), asin and acos (through atan),
 * field operations, integer and rational powers, abs. Non-real values are
 * reported, not guessed.
 */
export interface Bounds { readonly lo: Rational; readonly hi: Rational }
export type Enclosed =
  | ({ readonly kind: 'bounds' } & Bounds)
  /** Not decidable at this precision (e.g. a log argument whose enclosure still contains 0). */
  | { readonly kind: 'unknown' }
  | { readonly kind: 'undefined'; readonly detail: string }
  | { readonly kind: 'unsupported'; readonly detail: string };

const zero = (ctx: ExecutionContext) => rational(ctx, 0n);

function floorDiv(n: bigint, d: bigint): bigint { return n >= 0n ? n / d : -((-n + d - 1n) / d); }
function down(ctx: ExecutionContext, r: Rational, bits: number): Rational {
  ctx.tick();
  const scale = 1n << BigInt(bits);
  return rational(ctx, floorDiv(imul(ctx, r.numerator, scale), r.denominator), scale);
}
function up(ctx: ExecutionContext, r: Rational, bits: number): Rational {
  const n = rNegate(ctx, r);
  return rNegate(ctx, down(ctx, n, bits));
}
const lt = (ctx: ExecutionContext, a: Rational, b: Rational) => compareRational(ctx, a, b) < 0;
const le = (ctx: ExecutionContext, a: Rational, b: Rational) => compareRational(ctx, a, b) <= 0;
const min = (ctx: ExecutionContext, xs: Rational[]) => xs.reduce((a, b) => (lt(ctx, b, a) ? b : a));
const max = (ctx: ExecutionContext, xs: Rational[]) => xs.reduce((a, b) => (lt(ctx, a, b) ? b : a));

// ---- elementary bounds at a rational point ----

/** e^q, |q| arbitrary: Taylor at y = q/2^s with |y| ≤ 1/2, then s squarings. */
export function expBounds(ctx: ExecutionContext, q: Rational, bits: number): Bounds {
  if (q.numerator === 0n) return { lo: rational(ctx, 1n), hi: rational(ctx, 1n) };
  const s = Math.max(0, bitLength(q.numerator) - bitLength(q.denominator) + 2);
  const W = bits + s + 16;
  const y = rDivide(ctx, q, rational(ctx, 1n << BigInt(s)));
  const ay = rAbs(ctx, y), stop = rational(ctx, 1n, 1n << BigInt(W));
  let sum = rational(ctx, 1n), term = rational(ctx, 1n), k = 0;
  while (!lt(ctx, rAbs(ctx, term), stop)) {
    k++;
    term = down(ctx, rDivide(ctx, rMultiply(ctx, term, y), rational(ctx, BigInt(k))), W + 8);
    sum = rAdd(ctx, sum, term);
  }
  // Remainder ≤ 2·|y|^(k+1)/(k+1)! ≤ 2·|term|·|y|/(k+1), plus one unit per rounded term.
  const tail = rAdd(ctx, rDivide(ctx, rMultiply(ctx, rational(ctx, 2n), rMultiply(ctx, rAbs(ctx, term), ay)), rational(ctx, BigInt(k + 1))),
    rational(ctx, BigInt(2 * (k + 1)), 1n << BigInt(W + 8)));
  let lo = down(ctx, rSubtract(ctx, sum, tail), W), hi = up(ctx, rAdd(ctx, sum, tail), W);
  for (let i = 0; i < s; i++) { lo = down(ctx, rMultiply(ctx, lo, lo), W); hi = up(ctx, rMultiply(ctx, hi, hi), W); }
  return { lo: down(ctx, lo, bits), hi: up(ctx, hi, bits) };
}

/** atanh z for 0 ≤ z ≤ 1/3: Σ z^(2k+1)/(2k+1), tail ≤ z^(2N+3)·(9/8)/(2N+3). */
function atanhBounds(ctx: ExecutionContext, z: Rational, W: number): Bounds {
  if (z.numerator === 0n) return { lo: zero(ctx), hi: zero(ctx) };
  const z2 = rMultiply(ctx, z, z), stop = rational(ctx, 1n, 1n << BigInt(W));
  let power = z, sum = zero(ctx), k = 0;
  for (;;) {
    sum = rAdd(ctx, sum, down(ctx, rDivide(ctx, power, rational(ctx, BigInt(2 * k + 1))), W + 8));
    power = down(ctx, rMultiply(ctx, power, z2), W + 8);
    k++;
    if (lt(ctx, power, stop)) break;
  }
  const tail = rAdd(ctx, rDivide(ctx, rMultiply(ctx, power, rational(ctx, 9n, 8n)), rational(ctx, BigInt(2 * k + 1))), rational(ctx, BigInt(2 * k + 2), 1n << BigInt(W + 8)));
  return { lo: down(ctx, sum, W), hi: up(ctx, rAdd(ctx, sum, tail), W) };
}

/** ln q for q > 0: q = 2^m·r with 1 ≤ r < 2, ln r = 2·atanh((r−1)/(r+1)), ln 2 = 2·atanh(1/3). */
export function logBounds(ctx: ExecutionContext, q: Rational, bits: number): Bounds {
  let m = bitLength(q.numerator) - bitLength(q.denominator);
  let r = m >= 0 ? rDivide(ctx, q, rational(ctx, 1n << BigInt(m))) : rMultiply(ctx, q, rational(ctx, 1n << BigInt(-m)));
  if (lt(ctx, r, rational(ctx, 1n))) { r = rMultiply(ctx, r, rational(ctx, 2n)); m--; }
  const W = bits + bitLength(BigInt(Math.abs(m))) + 16, two = rational(ctx, 2n);
  const z = rDivide(ctx, rSubtract(ctx, r, rational(ctx, 1n)), rAdd(ctx, r, rational(ctx, 1n)));
  const a = atanhBounds(ctx, z, W), l2 = atanhBounds(ctx, rational(ctx, 1n, 3n), W);
  const M = rational(ctx, BigInt(m));
  const ln2 = { lo: rMultiply(ctx, two, l2.lo), hi: rMultiply(ctx, two, l2.hi) };
  const scaled = m >= 0 ? { lo: rMultiply(ctx, M, ln2.lo), hi: rMultiply(ctx, M, ln2.hi) } : { lo: rMultiply(ctx, M, ln2.hi), hi: rMultiply(ctx, M, ln2.lo) };
  return { lo: down(ctx, rAdd(ctx, scaled.lo, rMultiply(ctx, two, a.lo)), bits), hi: up(ctx, rAdd(ctx, scaled.hi, rMultiply(ctx, two, a.hi)), bits) };
}

/** atan(1/k) by its alternating series: consecutive partial sums bracket the limit. */
function atanInverseBounds(ctx: ExecutionContext, k: bigint, W: number): Bounds {
  const k2 = imul(ctx, k, k), stop = rational(ctx, 1n, 1n << BigInt(W));
  let n = 0, power = k, previous = zero(ctx), sum = zero(ctx);
  for (;;) {
    const term = rational(ctx, 1n, imul(ctx, BigInt(2 * n + 1), power));
    previous = sum;
    sum = n % 2 === 0 ? rAdd(ctx, sum, term) : rSubtract(ctx, sum, term);
    if (lt(ctx, term, stop) && n > 0) break;
    power = imul(ctx, power, k2);
    n++;
  }
  return { lo: min(ctx, [previous, sum]), hi: max(ctx, [previous, sum]) };
}

/** π = 16·atan(1/5) − 4·atan(1/239) (Machin). */
export function piBounds(ctx: ExecutionContext, bits: number): Bounds {
  const W = bits + 8, a = atanInverseBounds(ctx, 5n, W), b = atanInverseBounds(ctx, 239n, W);
  const s = rational(ctx, 16n), f = rational(ctx, 4n);
  return {
    lo: down(ctx, rSubtract(ctx, rMultiply(ctx, s, a.lo), rMultiply(ctx, f, b.hi)), bits),
    hi: up(ctx, rSubtract(ctx, rMultiply(ctx, s, a.hi), rMultiply(ctx, f, b.lo)), bits),
  };
}

/** Bounds of u·eᵘ at a rational u. */
function productExpBounds(ctx: ExecutionContext, u: Rational, bits: number): Bounds {
  const e = expBounds(ctx, u, bits + 8);
  const products = [rMultiply(ctx, u, e.lo), rMultiply(ctx, u, e.hi)];
  return { lo: down(ctx, min(ctx, products), bits + 8), hi: up(ctx, max(ctx, products), bits + 8) };
}

/**
 * W_k(K) at a rational K inside the branch domain (W₀: K ≥ −1/e; W₋₁: −1/e ≤ K < 0,
 * established by the caller): certified bisection of u·eᵘ = K on the branch.
 * A bracket end is moved only when the comparison with K is certified; an
 * ambiguous midpoint raises the working precision (u·eᵘ ≠ K at a rational
 * u ≠ W(K) unless both are 0, by Lindemann–Weierstrass).
 */
export function lambertBounds(ctx: ExecutionContext, K: Rational, branch: 0 | -1, bits: number): Bounds {
  if (K.numerator === 0n && branch === 0) return { lo: zero(ctx), hi: zero(ctx) };
  if (bits <= 24) return bisectLambert(ctx, K, branch, bits);
  // Newton on u·eᵘ − K from a coarse certified bracket, then certify a tight bracket;
  // bisection remains the fallback. Both brackets are certified the same way.
  const coarse = bisectLambert(ctx, K, branch, 16);
  const W = bits + 16, two = rational(ctx, 2n);
  let u = rDivide(ctx, rAdd(ctx, coarse.lo, coarse.hi), two);
  let previous: Rational | undefined;
  for (;;) {
    ctx.tick();
    const e = expBounds(ctx, u, W), em = rDivide(ctx, rAdd(ctx, e.lo, e.hi), two);
    const f = rSubtract(ctx, rMultiply(ctx, u, em), K), fp = rMultiply(ctx, em, rAdd(ctx, u, rational(ctx, 1n)));
    if (fp.numerator === 0n) break;
    const step = rAbs(ctx, rDivide(ctx, f, fp));
    // Stop when converged, or as soon as a step fails to contract (then certification decides).
    if (previous !== undefined && !lt(ctx, step, previous)) break;
    u = down(ctx, rSubtract(ctx, u, rDivide(ctx, f, fp)), W);
    if (lt(ctx, step, rational(ctx, 1n, 1n << BigInt(bits + 4)))) break;
    previous = step;
  }
  const delta = rational(ctx, 1n, 1n << BigInt(bits + 1));
  const a = rSubtract(ctx, u, delta), b = rAdd(ctx, u, delta);
  const fa = productExpBounds(ctx, a, W), fb = productExpBounds(ctx, b, W);
  // Increasing branch: f(a) ≤ K ≤ f(b); decreasing branch: f(a) ≥ K ≥ f(b).
  const certified = branch === 0 ? le(ctx, fa.hi, K) && le(ctx, K, fb.lo) : le(ctx, K, fa.lo) && le(ctx, fb.hi, K);
  return certified ? { lo: a, hi: b } : bisectLambert(ctx, K, branch, bits);
}

function bisectLambert(ctx: ExecutionContext, K: Rational, branch: 0 | -1, bits: number): Bounds {
  if (K.numerator === 0n && branch === 0) return { lo: zero(ctx), hi: zero(ctx) };
  const minusOne = rational(ctx, -1n), width = rational(ctx, 1n, 1n << BigInt(bits));
  let a: Rational, b: Rational;
  if (branch === 0) {
    a = minusOne;
    b = K.numerator < 0n ? zero(ctx) : max(ctx, [rational(ctx, 1n), K]);
  } else {
    b = minusOne;
    a = rational(ctx, -2n);
    let w = bits;
    for (;;) {
      ctx.tick();
      const f = productExpBounds(ctx, a, w);
      if (le(ctx, K, f.lo)) break;
      if (lt(ctx, f.hi, K)) a = rMultiply(ctx, a, rational(ctx, 2n)); else w *= 2;
    }
  }
  let w = bits;
  while (lt(ctx, width, rSubtract(ctx, b, a))) {
    ctx.tick();
    const mid = rDivide(ctx, rAdd(ctx, a, b), rational(ctx, 2n)), f = productExpBounds(ctx, mid, w);
    // Increasing branch (W₀): f(mid) ≤ K ⇒ W ≥ mid. Decreasing branch (W₋₁): f(mid) ≥ K ⇒ W ≥ mid.
    const below = le(ctx, f.hi, K), above = le(ctx, K, f.lo);
    if (!below && !above) { w *= 2; continue; }
    if (branch === 0 ? below : above) a = mid; else b = mid;
  }
  return { lo: a, hi: b };
}

// ---- trig ----

/**
 * Σ tₖ for an alternating series whose terms decrease in absolute value
 * (t₀ given, tₖ₊₁ = tₖ·factor(k)), to 2^−W: the first omitted term bounds the
 * remainder; each rounded term adds at most one unit of 2^−(W+8).
 */
function alternatingBounds(ctx: ExecutionContext, first: Rational, factor: (k: number) => Rational, W: number): Bounds {
  const stop = rational(ctx, 1n, 1n << BigInt(W)), unit = W + 8;
  let sum = zero(ctx), term = first, k = 0;
  for (;;) {
    ctx.tick();
    sum = rAdd(ctx, sum, term);
    term = down(ctx, rMultiply(ctx, term, factor(k)), unit);
    k++;
    if (lt(ctx, rAbs(ctx, term), stop)) break;
  }
  const slack = rAdd(ctx, rAbs(ctx, term), rational(ctx, BigInt(2 * (k + 1)), 1n << BigInt(unit)));
  return { lo: down(ctx, rSubtract(ctx, sum, slack), W), hi: up(ctx, rAdd(ctx, sum, slack), W) };
}

/** sin y and cos y for a rational |y| ≤ 1. */
function sinSmall(ctx: ExecutionContext, y: Rational, W: number): Bounds {
  const y2 = rNegate(ctx, rMultiply(ctx, y, y));
  return alternatingBounds(ctx, y, k => rDivide(ctx, y2, rational(ctx, BigInt((2 * k + 2) * (2 * k + 3)))), W);
}
function cosSmall(ctx: ExecutionContext, y: Rational, W: number): Bounds {
  const y2 = rNegate(ctx, rMultiply(ctx, y, y));
  return alternatingBounds(ctx, rational(ctx, 1n), k => rDivide(ctx, y2, rational(ctx, BigInt((2 * k + 1) * (2 * k + 2)))), W);
}

/** q = n·π/2 + r with |r| < 1: the integer n and an enclosure of r (π enclosed at enough precision). */
function quarterTurns(ctx: ExecutionContext, q: Rational, W: number): { n: bigint; r: Bounds } {
  const extra = Math.max(0, bitLength(q.numerator) - bitLength(q.denominator)) + 8;
  const pi = piBounds(ctx, W + extra);
  const half = { lo: rDivide(ctx, pi.lo, rational(ctx, 2n)), hi: rDivide(ctx, pi.hi, rational(ctx, 2n)) };
  const t = rDivide(ctx, q, half.lo), n = floorDiv(imul(ctx, 2n, t.numerator) + t.denominator, imul(ctx, 2n, t.denominator));
  const N = rational(ctx, n), a = rSubtract(ctx, q, rMultiply(ctx, N, half.lo)), b = rSubtract(ctx, q, rMultiply(ctx, N, half.hi));
  return { n, r: { lo: min(ctx, [a, b]), hi: max(ctx, [a, b]) } };
}

/** sin or cos at a rational point. */
export function sinCosBounds(ctx: ExecutionContext, fn: 'sin' | 'cos', q: Rational, bits: number): Bounds {
  if (q.numerator === 0n) return fn === 'sin' ? { lo: zero(ctx), hi: zero(ctx) } : { lo: rational(ctx, 1n), hi: rational(ctx, 1n) };
  const W = bits + 16, { n, r } = quarterTurns(ctx, q, W);
  // sin is increasing on [−1, 1]; cos has its maximum 1 at 0.
  const sinR = { lo: sinSmall(ctx, r.lo, W).lo, hi: sinSmall(ctx, r.hi, W).hi };
  const cl = cosSmall(ctx, r.lo, W), ch = cosSmall(ctx, r.hi, W);
  const cosR = r.lo.numerator >= 0n ? { lo: ch.lo, hi: cl.hi } : r.hi.numerator <= 0n ? { lo: cl.lo, hi: ch.hi } : { lo: min(ctx, [cl.lo, ch.lo]), hi: rational(ctx, 1n) };
  const neg = (b: Bounds): Bounds => ({ lo: rNegate(ctx, b.hi), hi: rNegate(ctx, b.lo) });
  // sin(r + n·π/2) and cos(r + n·π/2) by the quadrant n mod 4.
  const m = Number(((n % 4n) + 4n) % 4n) + (fn === 'cos' ? 1 : 0);
  const box = [sinR, cosR, neg(sinR), neg(cosR)][m % 4];
  return { lo: down(ctx, box.lo, bits), hi: up(ctx, box.hi, bits) };
}

/** atan at a rational point: odd; π/2 − atan(1/q) above 1; Euler's series Σ tₖ, tₖ₊₁ = tₖ·y·(2k+2)/(2k+3), y = q²/(1+q²) ≤ 1/2, below. */
export function atanBounds(ctx: ExecutionContext, q: Rational, bits: number): Bounds {
  if (q.numerator === 0n) return { lo: zero(ctx), hi: zero(ctx) };
  if (q.numerator < 0n) { const b = atanBounds(ctx, rNegate(ctx, q), bits); return { lo: rNegate(ctx, b.hi), hi: rNegate(ctx, b.lo) }; }
  const W = bits + 16;
  if (lt(ctx, rational(ctx, 1n), q)) {
    const inner = atanBounds(ctx, rDivide(ctx, rational(ctx, 1n), q), W), pi = piBounds(ctx, W);
    const two = rational(ctx, 2n);
    return { lo: down(ctx, rSubtract(ctx, rDivide(ctx, pi.lo, two), inner.hi), bits), hi: up(ctx, rSubtract(ctx, rDivide(ctx, pi.hi, two), inner.lo), bits) };
  }
  const q2 = rMultiply(ctx, q, q), d = rAdd(ctx, rational(ctx, 1n), q2), y = rDivide(ctx, q2, d);
  const stop = rational(ctx, 1n, 1n << BigInt(W)), unit = W + 8;
  let term = down(ctx, rDivide(ctx, q, d), unit), sum = zero(ctx), k = 0;
  for (;;) {
    ctx.tick();
    sum = rAdd(ctx, sum, term);
    term = down(ctx, rDivide(ctx, rMultiply(ctx, rMultiply(ctx, term, y), rational(ctx, BigInt(2 * k + 2))), rational(ctx, BigInt(2 * k + 3))), unit);
    k++;
    if (lt(ctx, term, stop)) break;
  }
  // Positive terms with ratio ≤ y ≤ 1/2: the tail is at most twice the first omitted term; rounding adds one unit per term.
  const err = rational(ctx, BigInt(2 * (k + 2)), 1n << BigInt(unit));
  return { lo: down(ctx, sum, bits), hi: up(ctx, rAdd(ctx, rAdd(ctx, sum, rMultiply(ctx, rational(ctx, 2n), term)), err), bits) };
}

/** asin at a rational point of [−1, 1]: ±π/2 at the ends, else 2·atan(q/(1 + √(1 − q²))). */
export function asinBounds(ctx: ExecutionContext, q: Rational, bits: number): Bounds {
  const W = bits + 16, one = rational(ctx, 1n), two = rational(ctx, 2n);
  if (rAbs(ctx, q).numerator === rAbs(ctx, q).denominator) {
    const pi = piBounds(ctx, W), h = { lo: rDivide(ctx, pi.lo, two), hi: rDivide(ctx, pi.hi, two) };
    return q.numerator > 0n ? { lo: down(ctx, h.lo, bits), hi: up(ctx, h.hi, bits) } : { lo: down(ctx, rNegate(ctx, h.hi), bits), hi: up(ctx, rNegate(ctx, h.lo), bits) };
  }
  const s = rootBounds(ctx, rSubtract(ctx, one, rMultiply(ctx, q, q)), 2, W);
  const a = rDivide(ctx, q, rAdd(ctx, one, s.hi)), b = rDivide(ctx, q, rAdd(ctx, one, s.lo));
  const lo = atanBounds(ctx, min(ctx, [a, b]), W).lo, hi = atanBounds(ctx, max(ctx, [a, b]), W).hi;
  return { lo: down(ctx, rMultiply(ctx, two, lo), bits), hi: up(ctx, rMultiply(ctx, two, hi), bits) };
}

/** sin or cos over an interval: endpoint values, plus ±1 wherever an extremum k·π/2 may lie inside. */
function sinCosBox(ctx: ExecutionContext, fn: 'sin' | 'cos', a: Box, bits: number): Box {
  if (rSubtract(ctx, a.hi, a.lo).numerator === 0n) return sinCosBounds(ctx, fn, a.lo, bits);
  const one = rational(ctx, 1n), minusOne = rational(ctx, -1n);
  if (lt(ctx, rational(ctx, 4n), rSubtract(ctx, a.hi, a.lo))) return { lo: minusOne, hi: one };
  const values = [sinCosBounds(ctx, fn, a.lo, bits), sinCosBounds(ctx, fn, a.hi, bits)];
  const pi = piBounds(ctx, bits + 8), two = rational(ctx, 2n);
  const ratios = [a.lo, a.hi].flatMap(x => [rDivide(ctx, rMultiply(ctx, two, x), pi.lo), rDivide(ctx, rMultiply(ctx, two, x), pi.hi)]);
  const from = floorDiv(min(ctx, ratios).numerator, min(ctx, ratios).denominator), to = -floorDiv(-max(ctx, ratios).numerator, max(ctx, ratios).denominator);
  for (let m = from; m <= to; m++) {
    ctx.tick();
    // Only where m·π/2 may lie inside the interval.
    const M = rational(ctx, m), ends = [rDivide(ctx, rMultiply(ctx, M, pi.lo), two), rDivide(ctx, rMultiply(ctx, M, pi.hi), two)];
    if (lt(ctx, a.hi, min(ctx, ends)) || lt(ctx, max(ctx, ends), a.lo)) continue;
    const r = Number(((m % 4n) + 4n) % 4n);
    // sin peaks at m ≡ 1 (+1) and m ≡ 3 (−1); cos at m ≡ 0 (+1) and m ≡ 2 (−1), with x = m·π/2.
    if (fn === 'sin' && r % 2 === 1) values.push(r === 1 ? pointBox(one) : pointBox(minusOne));
    if (fn === 'cos' && r % 2 === 0) values.push(r === 0 ? pointBox(one) : pointBox(minusOne));
  }
  return { lo: min(ctx, values.map(v => v.lo)), hi: max(ctx, values.map(v => v.hi)) };
}

/** sin or cos of q·π for a rational q. */
export function piMultipleBounds(ctx: ExecutionContext, fn: 'sin' | 'cos', q: Rational, bits: number): Bounds {
  const pi = piBounds(ctx, bits + Math.max(0, bitLength(q.numerator) - bitLength(q.denominator)) + 16);
  const ends = [rMultiply(ctx, q, pi.lo), rMultiply(ctx, q, pi.hi)];
  return sinCosBox(ctx, fn, { lo: min(ctx, ends), hi: max(ctx, ends) }, bits);
}

function trigBox(ctx: ExecutionContext, fn: string, a: Box, bits: number): Box | Exclude<Enclosed, { kind: 'bounds' }> {
  const one = rational(ctx, 1n), minusOne = rational(ctx, -1n);
  switch (fn) {
    case 'sin': case 'cos': return sinCosBox(ctx, fn, a, bits);
    case 'tan': {
      const s = sinCosBox(ctx, 'sin', a, bits + 8), c = boxInverse(ctx, sinCosBox(ctx, 'cos', a, bits + 8), bits + 8);
      return c === 'zero' ? { kind: 'undefined', detail: 'tan at a pole' } : c === 'unknown' ? { kind: 'unknown' } : boxMul(ctx, s, c, bits);
    }
    case 'atan': return { lo: atanBounds(ctx, a.lo, bits).lo, hi: atanBounds(ctx, a.hi, bits).hi };
    case 'asin': case 'acos': {
      if (lt(ctx, a.hi, minusOne) || lt(ctx, one, a.lo)) return { kind: 'undefined', detail: `${fn} outside [−1, 1]` };
      if (lt(ctx, a.lo, minusOne) || lt(ctx, one, a.hi)) return { kind: 'unknown' };
      const s = { lo: asinBounds(ctx, a.lo, bits + 8).lo, hi: asinBounds(ctx, a.hi, bits + 8).hi };
      if (fn === 'asin') return { lo: down(ctx, s.lo, bits), hi: up(ctx, s.hi, bits) };
      const pi = piBounds(ctx, bits + 8), two = rational(ctx, 2n);
      return { lo: down(ctx, rSubtract(ctx, rDivide(ctx, pi.lo, two), s.hi), bits), hi: up(ctx, rSubtract(ctx, rDivide(ctx, pi.hi, two), s.lo), bits) };
    }
    default: return { kind: 'unsupported', detail: `${fn} is not enclosed` };
  }
}

/**
 * Exact integer roots are used for small root indices; beyond this crossover
 * exp(x·log b) is cheaper. An algorithm choice, not a limit.
 */
const ROOT_CROSSOVER = 64n;

/** Floor and ceiling bounds of r^(1/q) for r ≥ 0, q ≥ 2, at `bits` (exact integer roots). */
function rootBounds(ctx: ExecutionContext, r: Rational, q: number, bits: number): Bounds {
  if (r.numerator === 0n) return { lo: zero(ctx), hi: zero(ctx) };
  const scale = 1n << BigInt(bits);
  const radicand = imul(ctx, imul(ctx, r.numerator, ipow(ctx, r.denominator, q - 1)), ipow(ctx, scale, q));
  const f = iroot(ctx, radicand, q), den = imul(ctx, r.denominator, scale);
  return { lo: rational(ctx, f, den), hi: rational(ctx, f + 1n, den) };
}

// ---- interval operations ----

type Box = Bounds;
const pointBox = (r: Rational): Box => ({ lo: r, hi: r });

function boxMul(ctx: ExecutionContext, a: Box, b: Box, bits: number): Box {
  const p = [rMultiply(ctx, a.lo, b.lo), rMultiply(ctx, a.lo, b.hi), rMultiply(ctx, a.hi, b.lo), rMultiply(ctx, a.hi, b.hi)];
  return { lo: down(ctx, min(ctx, p), bits), hi: up(ctx, max(ctx, p), bits) };
}

function containsZero(ctx: ExecutionContext, a: Box): boolean { return le(ctx, a.lo, zero(ctx)) && le(ctx, zero(ctx), a.hi); }

function boxInverse(ctx: ExecutionContext, a: Box, bits: number): Box | 'unknown' | 'zero' {
  if (a.lo.numerator === 0n && a.hi.numerator === 0n) return 'zero';
  if (containsZero(ctx, a)) return 'unknown';
  const x = rDivide(ctx, rational(ctx, 1n), a.hi), y = rDivide(ctx, rational(ctx, 1n), a.lo);
  return { lo: down(ctx, min(ctx, [x, y]), bits), hi: up(ctx, max(ctx, [x, y]), bits) };
}

function boxIntegerPower(ctx: ExecutionContext, a: Box, n: number, bits: number): Box {
  const pw = (r: Rational) => rational(ctx, ipow(ctx, r.numerator, n), ipow(ctx, r.denominator, n));
  const x = pw(a.lo), y = pw(a.hi);
  if (n % 2 === 0 && containsZero(ctx, a)) return { lo: zero(ctx), hi: up(ctx, max(ctx, [x, y]), bits) };
  return { lo: down(ctx, min(ctx, [x, y]), bits), hi: up(ctx, max(ctx, [x, y]), bits) };
}

/** −1/e enclosure. */
export function minusInverseE(ctx: ExecutionContext, bits: number): Bounds {
  const e = expBounds(ctx, rational(ctx, 1n), bits + 4);
  return { lo: down(ctx, rNegate(ctx, rDivide(ctx, rational(ctx, 1n), e.lo)), bits), hi: up(ctx, rNegate(ctx, rDivide(ctx, rational(ctx, 1n), e.hi)), bits) };
}

/** Enclose a real number-only expression at working precision `bits` (explicit stack). */
export function enclose(store: ExpressionStore, id: ExprId, bits: number): Enclosed {
  const ctx = store.ctx, boxes = new Map<ExprId, Box>();
  const fail = (e: Exclude<Enclosed, { kind: 'bounds' }>) => e;
  for (const n of store.postorder([id])) {
    ctx.tick();
    const node = store.node(n), get = (c: ExprId) => boxes.get(c) as Box;
    let box: Box | Exclude<Enclosed, { kind: 'bounds' }>;
    switch (node.kind) {
      case 'number': box = pointBox(node.value); break;
      case 'symbol': return fail({ kind: 'unsupported', detail: `free symbol ${node.name}` });
      case 'constant': box = node.name === 'pi' ? piBounds(ctx, bits) : { kind: 'unsupported', detail: 'non-real constant i' }; break;
      case 'algebraic': {
        const r = node.root;
        if (r.kind !== 'real') { box = { kind: 'unsupported', detail: 'non-real algebraic number' }; break; }
        const t = r.poly.coefficients.length === 2 ? r : refineReal(ctx, r, rational(ctx, 1n, 1n << BigInt(bits)));
        box = { lo: t.lo, hi: t.hi };
        break;
      }
      case 'add': {
        const parts = node.args.map(get);
        box = { lo: down(ctx, parts.reduce((s, p) => rAdd(ctx, s, p.lo), zero(ctx)), bits), hi: up(ctx, parts.reduce((s, p) => rAdd(ctx, s, p.hi), zero(ctx)), bits) };
        break;
      }
      case 'mul': box = node.args.map(get).reduce((a, b) => boxMul(ctx, a, b, bits)); break;
      case 'pow': box = powerBox(store, get(node.base), node.exponent, get(node.exponent), bits); break;
      case 'apply': box = applyBox(ctx, node.fn, get(node.arg), bits); break;
    }
    if (!('lo' in box)) return box;
    boxes.set(n, box);
  }
  const b = boxes.get(id) as Box;
  return { kind: 'bounds', lo: b.lo, hi: b.hi };
}

function powerBox(store: ExpressionStore, base: Box, exponentId: ExprId, exponent: Box, bits: number): Box | Exclude<Enclosed, { kind: 'bounds' }> {
  const ctx = store.ctx, e = store.numberValue(exponentId);
  if (e && e.denominator === 1n) {
    const n = Number(e.numerator);
    if (!Number.isSafeInteger(n)) return { kind: 'unsupported', detail: 'exponent beyond enclosure' };
    if (n >= 0) {
      if (n === 0 && base.lo.numerator === 0n && base.hi.numerator === 0n) return { kind: 'undefined', detail: '0^0' };
      if (n === 0) return containsZero(ctx, base) ? { kind: 'unknown' } : pointBox(rational(ctx, 1n));
      return boxIntegerPower(ctx, base, n, bits);
    }
    const inv = boxInverse(ctx, base, bits);
    if (inv === 'zero') return { kind: 'undefined', detail: 'negative power of zero' };
    if (inv === 'unknown') return { kind: 'unknown' };
    return boxIntegerPower(ctx, inv, -n, bits);
  }
  if (e && e.denominator <= ROOT_CROSSOVER) {
    // Rational exponent p/q: real q-th root (odd q allows a negative base), then the integer power p.
    const q = Number(e.denominator), p = Number(e.numerator);
    if (!Number.isSafeInteger(q) || !Number.isSafeInteger(p)) return { kind: 'unsupported', detail: 'exponent beyond enclosure' };
    if (containsZero(ctx, base) && !(base.lo.numerator === 0n && base.hi.numerator === 0n)) return { kind: 'unknown' };
    const negative = base.hi.numerator < 0n;
    if (negative && q % 2 === 0) return { kind: 'undefined', detail: 'even root of a negative number' };
    const abs = negative ? { lo: rNegate(ctx, base.hi), hi: rNegate(ctx, base.lo) } : base;
    const lo = rootBounds(ctx, abs.lo, q, bits), hi = rootBounds(ctx, abs.hi, q, bits);
    const root = negative ? { lo: rNegate(ctx, hi.hi), hi: rNegate(ctx, lo.lo) } : { lo: lo.lo, hi: hi.hi };
    return powerBox(store, root, store.integer(p), pointBox(rational(ctx, BigInt(p))), bits);
  }
  if (e && base.hi.numerator < 0n) {
    // Large odd denominator, negative base: −|b|^{p/q}·(−1)^p through exp/log.
    if (e.denominator % 2n === 0n) return { kind: 'undefined', detail: 'even root of a negative number' };
    const abs = { lo: rNegate(ctx, base.hi), hi: rNegate(ctx, base.lo) };
    const mag = powerBox(store, abs, exponentId, exponent, bits) as Box;
    return e.numerator % 2n === 0n ? mag : { lo: rNegate(ctx, mag.hi), hi: rNegate(ctx, mag.lo) };
  }
  // General exponent: base > 0, b^x = exp(x·log b).
  if (!lt(ctx, zero(ctx), base.lo)) return containsZero(ctx, base) ? { kind: 'unknown' } : { kind: 'unsupported', detail: 'non-positive base with a non-rational exponent' };
  const logBox = { lo: logBounds(ctx, base.lo, bits).lo, hi: logBounds(ctx, base.hi, bits).hi };
  const product = boxMul(ctx, logBox, exponent, bits);
  return { lo: expBounds(ctx, product.lo, bits).lo, hi: expBounds(ctx, product.hi, bits).hi };
}

function applyBox(ctx: ExecutionContext, fn: string, a: Box, bits: number): Box | Exclude<Enclosed, { kind: 'bounds' }> {
  switch (fn) {
    case 'exp': return { lo: expBounds(ctx, a.lo, bits).lo, hi: expBounds(ctx, a.hi, bits).hi };
    case 'log':
      if (le(ctx, a.hi, zero(ctx))) return { kind: 'undefined', detail: 'log of a non-positive number' };
      if (le(ctx, a.lo, zero(ctx))) return { kind: 'unknown' };
      return { lo: logBounds(ctx, a.lo, bits).lo, hi: logBounds(ctx, a.hi, bits).hi };
    case 'abs': {
      if (containsZero(ctx, a)) return { lo: zero(ctx), hi: max(ctx, [rAbs(ctx, a.lo), rAbs(ctx, a.hi)]) };
      const x = rAbs(ctx, a.lo), y = rAbs(ctx, a.hi);
      return { lo: min(ctx, [x, y]), hi: max(ctx, [x, y]) };
    }
    case 'lambertw': case 'lambertwm1': {
      const threshold = minusInverseE(ctx, bits);
      if (lt(ctx, a.hi, threshold.lo)) return { kind: 'undefined', detail: 'Lambert W below −1/e' };
      if (fn === 'lambertwm1' && le(ctx, zero(ctx), a.lo)) return { kind: 'undefined', detail: 'W₋₁ needs a negative argument' };
      if (lt(ctx, a.lo, threshold.hi)) return { kind: 'unknown' };
      if (fn === 'lambertw') return { lo: lambertBounds(ctx, a.lo, 0, bits).lo, hi: lambertBounds(ctx, a.hi, 0, bits).hi };
      if (le(ctx, zero(ctx), a.hi)) return { kind: 'unknown' };
      return { lo: lambertBounds(ctx, a.hi, -1, bits).lo, hi: lambertBounds(ctx, a.lo, -1, bits).hi };
    }
    default: return trigBox(ctx, fn, a, bits);
  }
}
