import type { ExecutionContext } from '../execution';
import { rAdd, rational, rDivide, rSubtract, type Rational } from '../algebra/rational';
import { compareRational } from '../algebraic/real-roots';
import { bisectReal, type RealRootOf } from '../algebraic/root-of';
import type { ExactValue } from '../representation/evaluate';
import type { ExpressionStore } from '../representation/expression';
import { compareValues, type Endpoint, type Interval } from '../representation/solution-set';

/**
 * One-dimensional sign decomposition. Sorted distinct critical points c₁ < … < cₖ
 * split ℝ into pieces (−∞, c₁), {c₁}, (c₁, c₂), …, {cₖ}, (cₖ, ∞). A predicate
 * that can change truth only at critical points is constant on each open
 * piece, so it is decided at one exact rational sample per piece. The true
 * pieces are merged into a canonical interval union.
 */
export type Piece = { readonly kind: 'open'; readonly sample: Rational } | { readonly kind: 'point'; readonly value: ExactValue };

function lower(v: ExactValue): Rational { return v.kind === 'rational' ? v.value : (v.root as RealRootOf).lo; }
function upper(v: ExactValue): Rational { return v.kind === 'rational' ? v.value : (v.root as RealRootOf).hi; }

function refined(ctx: ExecutionContext, v: ExactValue): ExactValue {
  return v.kind === 'rational' || v.root.kind !== 'real' || v.root.poly.coefficients.length === 2 ? v : { kind: 'algebraic', root: bisectReal(ctx, v.root) };
}

/** A rational strictly between real values a < b (refining both until their regions separate). */
export function rationalBetween(ctx: ExecutionContext, a: ExactValue, b: ExactValue): Rational {
  let x = a, y = b;
  while (compareRational(ctx, upper(x), lower(y)) >= 0) {
    ctx.tick();
    x = refined(ctx, x); y = refined(ctx, y);
  }
  return rDivide(ctx, rAdd(ctx, upper(x), lower(y)), rational(ctx, 2n));
}

/** Sort and deduplicate exact real values. */
export function sortedDistinct(store: ExpressionStore, values: readonly ExactValue[]): ExactValue[] {
  const sorted = [...values].sort((a, b) => compareValues(store, a, b));
  return sorted.filter((v, i) => i === 0 || compareValues(store, sorted[i - 1], v) !== 0);
}

export function pieces(store: ExpressionStore, critical: readonly ExactValue[]): Piece[] {
  const ctx = store.ctx, one = rational(ctx, 1n);
  ctx.allocate(2 * critical.length + 1);
  if (critical.length === 0) return [{ kind: 'open', sample: rational(ctx, 0n) }];
  const out: Piece[] = [{ kind: 'open', sample: rSubtract(ctx, lower(critical[0]), one) }];
  critical.forEach((c, i) => {
    out.push({ kind: 'point', value: c });
    out.push({ kind: 'open', sample: i + 1 < critical.length ? rationalBetween(ctx, c, critical[i + 1]) : rAdd(ctx, upper(c), one) });
  });
  return out;
}

/** Merge true pieces into disjoint, non-touching intervals. */
export function assemble<T extends Endpoint>(critical: readonly T[], truth: readonly boolean[]): Interval[] {
  const intervals: Interval[] = [];
  // Piece 2i is the open piece before critical[i] (2i−1 is the point critical[i−1]).
  const leftOf = (p: number) => (p === 0 ? { kind: 'infinity' as const, sign: -1 as const } : critical[(p - 1) >> 1]);
  const rightOf = (p: number) => (p === truth.length - 1 ? { kind: 'infinity' as const, sign: 1 as const } : critical[p >> 1]);
  let p = 0;
  while (p < truth.length) {
    if (!truth[p]) { p++; continue; }
    const start = p;
    while (p + 1 < truth.length && truth[p + 1]) p++;
    const startsAtPoint = start % 2 === 1, endsAtPoint = p % 2 === 1;
    intervals.push(Object.freeze({
      lo: startsAtPoint ? critical[(start - 1) >> 1] : leftOf(start),
      hi: endsAtPoint ? critical[(p - 1) >> 1] : rightOf(p),
      loClosed: startsAtPoint, hiClosed: endsAtPoint,
    }));
    p++;
  }
  return intervals;
}
