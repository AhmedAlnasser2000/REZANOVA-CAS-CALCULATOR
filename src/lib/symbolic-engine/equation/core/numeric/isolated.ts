import { demand } from '../execution';
import { rAdd, rational, rCompare, rDivide, type Rational } from '../algebra/rational';
import { derivative } from '../composition/derivative';
import { excludesZero, rangeOf, type XRange } from '../composition/range';
import { enclose, minusInverseE } from '../representation/enclosure';
import type { ExprId, ExpressionStore } from '../representation/expression';
import { realSign } from '../representation/real-order';

/**
 * Certified isolated real zeros (EQUATION-CERTIFIED-NUMERICS1): the unique zero of f in one variable x on a
 * rational interval [lo, hi], proven by
 * - definedness: every domain-sensitive kernel argument stays strictly inside its domain on [lo, hi] (log and
 *   even roots: > 0; negative and fractional powers, |u|: ≠ 0; asin/acos: in (−1, 1); tan: cos u ≠ 0;
 *   W₀: > −1/e; W₋₁: in (−1/e, 0)), so f is defined and differentiable there;
 * - a sign change: f(lo) and f(hi) have exact, opposite signs;
 * - strict monotonicity: the certified range of f′ excludes 0 with the sign of the change.
 * Ranges are coarse on wide intervals, so [lo, hi] is subdivided (at dyadic midpoints) until every part is
 * proven; an exact failure at a midpoint (a kernel outside its domain, f′ = 0 or of the wrong sign) refutes at
 * once. Subdivision runs under the budget only.
 */
const fail = (reason: string): never => demand(false, 'verification-failed', reason) as never;
const BITS = 64;

type Piece = { readonly lo: Rational; readonly hi: Rational };
const box = (p: Piece): XRange => ({ lo: p.lo, hi: p.hi, loOpen: false, hiOpen: false });

/** Kernel conditions of f in x: the argument and the open set it must stay in on the interval. */
export type Need = { readonly arg: ExprId; readonly test: (r: XRange) => boolean | undefined; readonly at: (s: -1 | 0 | 1, v: ExprId) => boolean };

/** The domain conditions of f's kernels in x, or in any of several variables (see the module comment). */
export function domainNeeds(store: ExpressionStore, f: ExprId, x: string | readonly string[]): Need[] {
  const ctx = store.ctx, out: Need[] = [], xs = typeof x === 'string' ? [x] : x;
  const positive = (r: XRange) => (r.lo !== undefined && (r.lo.numerator > 0n || (r.lo.numerator === 0n && r.loOpen)) ? true : r.hi !== undefined && r.hi.numerator <= 0n ? false : undefined);
  const nonzero = (r: XRange) => (excludesZero(r) ? true : undefined);
  const inside = (lo: Rational, hi: Rational) => (r: XRange) => (r.lo !== undefined && r.hi !== undefined && rCompare(ctx, r.lo, lo) > 0 && rCompare(ctx, r.hi, hi) < 0 ? true
    : (r.hi !== undefined && rCompare(ctx, r.hi, lo) <= 0) || (r.lo !== undefined && rCompare(ctx, r.lo, hi) >= 0) ? false : undefined);
  const e = minusInverseE(ctx, BITS);
  for (const n of store.postorder([f])) {
    if (!store.freeSymbols(n).some(s => xs.includes(s))) continue;
    const node = store.node(n);
    if (node.kind === 'pow') {
      const q = store.numberValue(node.exponent);
      if (!q || (q.denominator === 1n && q.numerator >= 0n)) continue;
      const even = q.denominator % 2n === 0n;
      out.push({ arg: node.base, test: even ? positive : nonzero, at: s => (even ? s > 0 : s !== 0) });
    } else if (node.kind === 'apply') {
      const u = node.arg;
      switch (node.fn) {
        case 'log': out.push({ arg: u, test: positive, at: s => s > 0 }); break;
        case 'abs': out.push({ arg: u, test: nonzero, at: s => s !== 0 }); break;
        case 'asin': case 'acos': {
          const one = rational(ctx, 1n), minus = rational(ctx, -1n);
          out.push({ arg: u, test: inside(minus, one), at: (_s, v) => realSign(store, store.sub(v, store.integer(1))) < 0 && realSign(store, store.add(v, store.integer(1))) > 0 });
          break;
        }
        case 'tan': { const c = store.cos(u); out.push({ arg: c, test: nonzero, at: s => s !== 0 }); break; }
        case 'lambertw': out.push({ arg: u, test: r => (r.lo !== undefined && rCompare(ctx, r.lo, e.hi) > 0 ? true : undefined), at: (_s, v) => realSign(store, store.add(v, store.exp(store.integer(-1)))) > 0 }); break;
        case 'lambertwm1': out.push({ arg: u, test: r => (r.lo !== undefined && r.hi !== undefined && rCompare(ctx, r.lo, e.hi) > 0 && r.hi.numerator < 0n ? true : undefined),
          at: (s, v) => s < 0 && realSign(store, store.add(v, store.exp(store.integer(-1)))) > 0 }); break;
        default: break;
      }
    }
  }
  return out;
}

/** The value of `f` at a rational point (x replaced). */
const at = (store: ExpressionStore, f: ExprId, x: string, p: Rational) => store.substitute(f, new Map([[x, store.number(p)]]));

/**
 * Check the certificate of an isolated zero of `f` in `x` on [lo, hi]; returns the sign of f at lo. A failed
 * check is a typed `verification-failed` refutation.
 */
export function certifyIsolated(store: ExpressionStore, f: ExprId, x: string, lo: Rational, hi: Rational): 1 | -1 {
  const ctx = store.ctx;
  if (rCompare(ctx, lo, hi) >= 0) fail('an isolating interval needs lo < hi');
  if (store.freeSymbols(f).some(s => s !== x)) fail('an isolated zero has one variable');
  const conditions = domainNeeds(store, f, x), df = derivative(store, f, x);
  if (df === undefined) return fail('the expression has no derivative here');
  const holdsAt = (p: Rational) => conditions.every(c => { const v = at(store, c.arg, x, p); return c.at(realSign(store, v), v); });
  if (!holdsAt(lo) || !holdsAt(hi)) fail('the expression is not defined at an end of the interval');
  const sLo = realSign(store, at(store, f, x, lo)), sHi = realSign(store, at(store, f, x, hi));
  if (sLo === 0 || sHi === 0 || sLo === sHi) fail('no sign change on the interval');
  const dir = sHi;
  const pieces: Piece[] = [{ lo, hi }];
  while (pieces.length) {
    ctx.tick();
    const p = pieces.pop() as Piece, b = box(p);
    let open = false;
    for (const c of conditions) {
      const t = c.test(rangeOf(store, c.arg, x, b, BITS));
      if (t === false) fail('the expression is not defined on the interval');
      if (t === undefined) open = true;
    }
    if (!open) {
      const d = rangeOf(store, df, x, b, BITS);
      if (excludesZero(d)) {
        const up = d.lo !== undefined && d.lo.numerator >= 0n;
        if ((up ? 1 : -1) !== dir) fail('the expression is monotone the wrong way');
        continue;
      }
    }
    const m = rDivide(ctx, rAdd(ctx, p.lo, p.hi), rational(ctx, 2n));
    if (!holdsAt(m)) fail('the expression is not defined on the interval');
    if (realSign(store, at(store, df, x, m)) !== dir) fail('the expression is not strictly monotone on the interval');
    pieces.push({ lo: p.lo, hi: m }, { lo: m, hi: p.hi });
  }
  return sLo as 1 | -1;
}

/**
 * The zero of `f` between the exact points `a` < `b` (number-only expressions), where f is defined and strictly
 * monotone on [a, b] with sign `sa` at a and −sa at b: an isolated zero on rational ends inside (a, b), or the
 * rational itself when an inner point is the zero.
 */
export function isolateZero(store: ExpressionStore, f: ExprId, x: string, a: ExprId, b: ExprId, sa: 1 | -1): ExprId {
  const ctx = store.ctx;
  let left: ExprId | Rational = a, right: ExprId | Rational = b;
  const bounds = (v: ExprId | Rational, bits: number) => {
    if (typeof v !== 'number') return { lo: v, hi: v };
    const e = enclose(store, v, bits);
    return e.kind === 'bounds' ? e : fail('an end of the interval cannot be enclosed');
  };
  while (typeof left === 'number' || typeof right === 'number') {
    ctx.tick();
    let p: Rational | undefined;
    for (let bits = BITS; p === undefined; bits *= 2) {
      ctx.tick();
      const l = bounds(left, bits).hi, r = bounds(right, bits).lo;
      if (rCompare(ctx, l, r) < 0) p = rDivide(ctx, rAdd(ctx, l, r), rational(ctx, 2n));
    }
    const s = realSign(store, at(store, f, x, p));
    if (s === 0) return store.number(p);
    if (s === sa) left = p; else right = p;
  }
  return store.isolated(f, x, left, right, sa);
}

/**
 * A range row: an order relation d < 0 or d ≤ 0 with d = a·x + b (a a nonzero number, b constant) bounds x on
 * one side: x < −b/a when a > 0, x > −b/a when a < 0. Undefined for any other relation.
 */
export function rangeBound(store: ExpressionStore, lhs: ExprId, rhs: ExprId, op: string, x: string): { side: -1 | 1; at: ExprId } | undefined {
  if (op !== 'lt' && op !== 'le') return undefined;
  const d = store.sub(lhs, rhs), dd = derivative(store, d, x), a = dd === undefined ? undefined : store.numberValue(dd);
  if (!a || a.numerator === 0n) return undefined;
  const b = store.sub(d, store.mul(store.number(a), store.symbol(x)));
  if (store.freeSymbols(b).length) return undefined;
  return { side: a.numerator > 0n ? 1 : -1, at: store.div(store.neg(b), store.number(a)) };
}
