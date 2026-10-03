import type { ExecutionContext } from '../execution';
import { rAdd, rational, rDivide, rSubtract, type Rational } from '../algebra/rational';
import { compareRational } from '../algebraic/real-roots';
import { enclose } from '../representation/enclosure';
import type { ExprId, ExpressionStore } from '../representation/expression';
import { START_BITS } from '../representation/real-order';

/** Simple exact sample points between closed forms (shared by the decomposition and abs branching). */
function floorOf(r: Rational): bigint { return r.numerator >= 0n ? r.numerator / r.denominator : -((-r.numerator + r.denominator - 1n) / r.denominator); }

/**
 * The rational with the smallest denominator in the open interval (lo, hi),
 * lo < hi (continued fractions). Simple samples keep later exact evaluation
 * cheap: e^{s·ln 2} at s = 1/2 is √2, not a root of degree 2³².
 */
export function simplestBetween(ctx: ExecutionContext, lo: Rational, hi: Rational | undefined): Rational {
  ctx.tick();
  const a = floorOf(lo);
  if (hi === undefined || compareRational(ctx, rational(ctx, a + 1n), hi) < 0) return rational(ctx, a + 1n);
  // (lo, hi) ⊂ [a, a + 1]: recurse on the reciprocals of the fractional parts.
  const fracLo = rSubtract(ctx, lo, rational(ctx, a)), fracHi = rSubtract(ctx, hi, rational(ctx, a));
  const inner = simplestBetween(ctx, rDivide(ctx, rational(ctx, 1n), fracHi), fracLo.numerator === 0n ? undefined : rDivide(ctx, rational(ctx, 1n), fracLo));
  return rAdd(ctx, rational(ctx, a), rDivide(ctx, rational(ctx, 1n), inner));
}

/** A simple rational strictly between closed forms a < b (enclosures refined until they separate). */
export function rationalBetween(store: ExpressionStore, a: ExprId, b: ExprId): Rational {
  const ctx = store.ctx;
  for (let bits = START_BITS; ; bits *= 2) {
    ctx.tick();
    const ea = enclose(store, a, bits), eb = enclose(store, b, bits);
    if (ea.kind === 'bounds' && eb.kind === 'bounds' && compareRational(ctx, ea.hi, eb.lo) < 0) return simplestBetween(ctx, ea.hi, eb.lo);
  }
}

/** An integer below (side −1) or above (side +1) a closed form. */
export function outside(store: ExpressionStore, c: ExprId, side: -1 | 1): Rational {
  const ctx = store.ctx;
  for (let bits = START_BITS; ; bits *= 2) {
    const e = enclose(store, c, bits);
    if (e.kind === 'bounds') return rational(ctx, side < 0 ? floorOf(e.lo) - 1n : floorOf(e.hi) + 1n);
  }
}

/** A simple rational sample in (a, b); an open end is ±∞. */
export function sampleBetween(store: ExpressionStore, a: ExprId | undefined, b: ExprId | undefined): ExprId {
  if (a === undefined && b === undefined) return store.integer(0);
  if (a === undefined) return store.number(outside(store, b as ExprId, -1));
  if (b === undefined) return store.number(outside(store, a, 1));
  return store.number(rationalBetween(store, a, b));
}
