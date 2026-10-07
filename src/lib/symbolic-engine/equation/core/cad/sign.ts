import type { ExecutionContext } from '../execution';
import { bitLength, imul } from '../algebra/integer';
import { rational } from '../algebra/rational';
import { refineReal, type RealRootOf } from '../algebraic/root-of';
import type { ExactValue } from '../representation/evaluate';
import { degrees, isZero, substitute, trueLevel, type RPoly } from './recursive';

/**
 * The exact sign of an integer polynomial at a real algebraic point (EQUATION-SEMIALGEBRAIC1): the sample points of
 * a cylindrical decomposition have real algebraic coordinates, each with its minimal polynomial and an isolating
 * interval. Rational coordinates are substituted exactly. Otherwise the value is enclosed by fixed-point interval
 * Horner evaluation at doubling precision until the enclosure excludes zero, or until it lies below Liouville's
 * lower bound for nonzero values — then the value is zero (Waldschmidt, Diophantine Approximation on Linear
 * Algebraic Groups, Prop. 3.14: for F ∈ ℤ[X₁…Xₖ] of degree Nᵢ in Xᵢ and αᵢ in a field of degree D, F(α) ≠ 0 implies
 * log|F(α)| ≥ −(D − 1)·log L(F) − D·Σ Nᵢ·h(αᵢ), L the sum of |coefficients|, h(α) ≤ log‖min α‖₂ / deg α; D is
 * bounded by the product of the coordinates' degrees, which only weakens the bound).
 */
type Box = { readonly lo: bigint; readonly hi: bigint };

const floorDiv = (n: bigint, d: bigint) => (n >= 0n ? n / d : -((-n + d - 1n) / d));
const ceilDiv = (n: bigint, d: bigint) => -floorDiv(-n, d);
const bits = (n: bigint) => BigInt(bitLength(n));

/** ⌈log₂ ‖P‖₂⌉ for an integer polynomial. */
function log2Norm(ctx: ExecutionContext, coefficients: readonly bigint[]): bigint {
  let sum = 0n;
  for (const c of coefficients) sum += imul(ctx, c, c);
  return BigInt((bitLength(sum) + 1) >> 1);
}

/** The coordinate's isolating interval in units of 2^−W (outward rounded). */
function coordinateBox(ctx: ExecutionContext, v: ExactValue, W: bigint): Box {
  const S = 1n << W;
  if (v.kind === 'rational') {
    const q = v.value;
    return { lo: floorDiv(imul(ctx, q.numerator, S), q.denominator), hi: ceilDiv(imul(ctx, q.numerator, S), q.denominator) };
  }
  const r = refineReal(ctx, v.root as RealRootOf, rational(ctx, 1n, S));
  return { lo: floorDiv(imul(ctx, r.lo.numerator, S), r.lo.denominator), hi: ceilDiv(imul(ctx, r.hi.numerator, S), r.hi.denominator) };
}

function boxMultiply(ctx: ExecutionContext, a: Box, b: Box, W: bigint): Box {
  const S = 1n << W;
  const p = [imul(ctx, a.lo, b.lo), imul(ctx, a.lo, b.hi), imul(ctx, a.hi, b.lo), imul(ctx, a.hi, b.hi)];
  const min = p.reduce((x, y) => (y < x ? y : x)), max = p.reduce((x, y) => (y > x ? y : x));
  return { lo: floorDiv(min, S), hi: ceilDiv(max, S) };
}

/** Interval Horner evaluation of a level-n polynomial over the coordinate boxes (units 2^−W). */
function evaluateBox(ctx: ExecutionContext, a: RPoly, n: number, boxes: readonly (Box | undefined)[], W: bigint): Box {
  if (n === 0) { const v = imul(ctx, a as bigint, 1n << W); return { lo: v, hi: v }; }
  const c = a as readonly RPoly[];
  if (c.length === 0) return { lo: 0n, hi: 0n };
  if (c.length === 1) return evaluateBox(ctx, c[0], n - 1, boxes, W);
  const x = boxes[n - 1] as Box;
  let acc = evaluateBox(ctx, c[c.length - 1], n - 1, boxes, W);
  for (let i = c.length - 2; i >= 0; i--) {
    ctx.tick();
    const m = boxMultiply(ctx, acc, x, W), t = evaluateBox(ctx, c[i], n - 1, boxes, W);
    acc = { lo: m.lo + t.lo, hi: m.hi + t.hi };
  }
  return acc;
}

/** log₂ of 1/T, T the Liouville bound for a polynomial in the algebraic coordinates only. */
function liouvilleBits(ctx: ExecutionContext, a: RPoly, n: number, point: readonly ExactValue[]): bigint {
  const degs = degrees(a, n);
  let L = 0n;
  const walk = (v: RPoly, k: number) => {
    if (k === 0) { L += (v as bigint) < 0n ? -(v as bigint) : (v as bigint); return; }
    for (const c of v as readonly RPoly[]) walk(c, k - 1);
  };
  walk(a, n);
  const used = degs.flatMap((d, j) => (d > 0 ? [{ d, root: (point[j] as Extract<ExactValue, { kind: 'algebraic' }>).root as RealRootOf }] : []));
  const degreeOf = (r: RealRootOf) => BigInt(r.poly.coefficients.length - 1);
  const D = used.reduce((p, u) => p * degreeOf(u.root), 1n);
  let total = D * bits(L);
  for (const u of used) total += (D / degreeOf(u.root)) * BigInt(u.d) * log2Norm(ctx, u.root.poly.coefficients);
  return total + 1n;
}

/** The sign of a (level n) at a real point whose coordinate j − 1 is xⱼ's value (at least n coordinates). */
export function signAtPoint(ctx: ExecutionContext, a: RPoly, n: number, point: readonly ExactValue[]): -1 | 0 | 1 {
  // Rational coordinates first, exactly (a positive scaling keeps the sign).
  let p = a;
  const degs = degrees(p, n);
  for (let j = 1; j <= n; j++) if (degs[j - 1] > 0 && point[j - 1].kind === 'rational') p = substitute(ctx, p, n, j, (point[j - 1] as Extract<ExactValue, { kind: 'rational' }>).value);
  const t = trueLevel(p, n);
  if (t.level === 0) return (t.poly as bigint) === 0n ? 0 : (t.poly as bigint) < 0n ? -1 : 1;
  if (isZero(p)) return 0;
  let threshold: bigint | undefined;
  const used = degrees(p, n);
  for (let W = 32n; ; W *= 2n) {
    ctx.tick();
    const boxes = point.slice(0, n).map((v, j) => (used[j] > 0 ? coordinateBox(ctx, v, W) : undefined));
    const e = evaluateBox(ctx, p, n, boxes, W);
    if (e.lo > 0n) return 1;
    if (e.hi < 0n) return -1;
    threshold ??= liouvilleBits(ctx, p, n, point);
    // |value| ≤ max(|lo|, |hi|)·2^−W < 2^−threshold means the value is zero.
    const size = -e.lo > e.hi ? -e.lo : e.hi;
    if (W > threshold && size < 1n << (W - threshold)) return 0;
  }
}
