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
 * W₋₁ (certified bisection on u·eᵘ), field operations, integer and rational
 * powers, abs. Non-real values, trig and inverse trig are reported, not guessed.
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
    default: return { kind: 'unsupported', detail: `${fn} is not enclosed by this gate` };
  }
}
