import type { ExecutionContext } from '../execution';
import { rAbs, rAdd, rational, rCompare, rDivide, rMultiply, rNegate, type Rational } from '../algebra/rational';
import {
  asinBounds, atanBounds, enclose, expBounds, lambertBounds, logBounds, minusInverseE, piBounds, rootBounds, sinCosBox,
} from '../representation/enclosure';
import type { ExprId, ExpressionStore } from '../representation/expression';

/**
 * Certified ranges of an expression in one real variable over an interval,
 * with extended-real ends (±∞) and open/closed flags, by interval arithmetic
 * over the expression graph (explicit stack).
 *
 * Every bound is outward: the true set of values on the interval is contained
 * in the returned range. Exact kernel ranges keep strictness: exp > 0,
 * atan ∈ (−π/2, π/2), sin, cos ∈ [−1, 1], so eˣ + sin x > −1 is decided
 * strictly on all of ℝ. Rounding only enlarges a range, so a bound computed
 * as open stays a valid strict bound.
 *
 * Constant subexpressions use the certified enclosures of `enclosure.ts`.
 * A construct without a range here (tan, a variable exponent, another symbol)
 * gives the whole line, which is still sound.
 */
export interface XRange {
  /** undefined means −∞ (for lo) or +∞ (for hi). */
  readonly lo?: Rational;
  readonly hi?: Rational;
  readonly loOpen: boolean;
  readonly hiOpen: boolean;
}

export const WHOLE: XRange = Object.freeze({ loOpen: true, hiOpen: true });

function floorDiv(n: bigint, d: bigint): bigint { return n >= 0n ? n / d : -((-n + d - 1n) / d); }
function down(ctx: ExecutionContext, r: Rational, bits: number): Rational {
  const scale = 1n << BigInt(bits);
  return rational(ctx, floorDiv(r.numerator * scale, r.denominator), scale);
}
function up(ctx: ExecutionContext, r: Rational, bits: number): Rational {
  const d = down(ctx, rNegate(ctx, r), bits);
  return rNegate(ctx, d);
}

/** Whether 0 is certainly outside the range. */
export function excludesZero(r: XRange): boolean {
  const lo = r.lo, hi = r.hi;
  if (lo !== undefined && (lo.numerator > 0n || (lo.numerator === 0n && r.loOpen))) return true;
  if (hi !== undefined && (hi.numerator < 0n || (hi.numerator === 0n && r.hiOpen))) return true;
  return false;
}

/** Whether 0 may lie in the range (closed ends included). */
function mayContainZero(r: XRange): boolean { return !excludesZero(r); }

type Ext = { readonly v: Rational } | { readonly inf: 1 | -1 };
const fin = (v: Rational): Ext => ({ v });
const sgn = (e: Ext): -1 | 0 | 1 => ('inf' in e ? e.inf : e.v.numerator === 0n ? 0 : e.v.numerator < 0n ? -1 : 1);

function cmp(ctx: ExecutionContext, a: Ext, b: Ext): number {
  if ('inf' in a || 'inf' in b) {
    const x = 'inf' in a ? a.inf * 2 : 0, y = 'inf' in b ? b.inf * 2 : 0;
    if (x !== y || x !== 0) return x - y;
  }
  return rCompare(ctx, (a as { v: Rational }).v, (b as { v: Rational }).v);
}

function ends(r: XRange): [Ext, boolean, Ext, boolean] {
  return [r.lo === undefined ? { inf: -1 } : fin(r.lo), r.loOpen, r.hi === undefined ? { inf: 1 } : fin(r.hi), r.hiOpen];
}

function make(ctx: ExecutionContext, lo: Ext, loOpen: boolean, hi: Ext, hiOpen: boolean, bits: number): XRange {
  return {
    ...('inf' in lo ? {} : { lo: down(ctx, lo.v, bits) }),
    ...('inf' in hi ? {} : { hi: up(ctx, hi.v, bits) }),
    loOpen: 'inf' in lo ? true : loOpen,
    hiOpen: 'inf' in hi ? true : hiOpen,
  };
}

function add(ctx: ExecutionContext, a: XRange, b: XRange, bits: number): XRange {
  const lo = a.lo === undefined || b.lo === undefined ? undefined : down(ctx, rAdd(ctx, a.lo, b.lo), bits);
  const hi = a.hi === undefined || b.hi === undefined ? undefined : up(ctx, rAdd(ctx, a.hi, b.hi), bits);
  return { ...(lo === undefined ? {} : { lo }), ...(hi === undefined ? {} : { hi }), loOpen: lo === undefined || a.loOpen || b.loOpen, hiOpen: hi === undefined || a.hiOpen || b.hiOpen };
}

function mul(ctx: ExecutionContext, a: XRange, b: XRange, bits: number): XRange {
  const [al, alo, ah, aho] = ends(a), [bl, blo, bh, bho] = ends(b);
  const zeroPoint = (r: XRange) => r.lo?.numerator === 0n && r.hi?.numerator === 0n && !r.loOpen && !r.hiOpen;
  if (zeroPoint(a) || zeroPoint(b)) return { lo: rational(ctx, 0n), hi: rational(ctx, 0n), loOpen: false, hiOpen: false };
  const products: { e: Ext; open: boolean }[] = [];
  for (const [x, xo] of [[al, alo], [ah, aho]] as [Ext, boolean][]) {
    for (const [y, yo] of [[bl, blo], [bh, bho]] as [Ext, boolean][]) {
      const sx = sgn(x), sy = sgn(y);
      if (('inf' in x && sy === 0) || ('inf' in y && sx === 0)) return WHOLE; // 0·∞: conservative
      const e: Ext = 'inf' in x || 'inf' in y ? { inf: (sx * sy) as 1 | -1 } : fin(rMultiply(ctx, (x as { v: Rational }).v, (y as { v: Rational }).v));
      // A product that is exactly 0 because of a closed zero end is attained.
      const open = (sx === 0 && !xo) || (sy === 0 && !yo) ? false : xo || yo;
      products.push({ e, open });
    }
  }
  const pick = (better: (c: number) => boolean) => products.reduce((p, q) => {
    const c = cmp(ctx, q.e, p.e);
    return better(c) ? q : c === 0 ? { e: p.e, open: p.open && q.open } : p;
  });
  const lo = pick(c => c < 0), hi = pick(c => c > 0);
  return make(ctx, lo.e, lo.open, hi.e, hi.open, bits);
}

function negate(ctx: ExecutionContext, a: XRange): XRange {
  return { ...(a.hi === undefined ? {} : { lo: rNegate(ctx, a.hi) }), ...(a.lo === undefined ? {} : { hi: rNegate(ctx, a.lo) }), loOpen: a.hiOpen, hiOpen: a.loOpen };
}

function inverse(ctx: ExecutionContext, a: XRange, bits: number): XRange {
  if (mayContainZero(a)) return WHOLE;
  const positive = excludesZero({ ...a, hi: undefined, hiOpen: true });
  const p = positive ? a : negate(ctx, a);
  // p > 0: 1/p ∈ [1/hi, 1/lo] with 1/∞ = 0 (open) and 1/0⁺ = +∞.
  const lo: Ext = p.hi === undefined ? fin(rational(ctx, 0n)) : fin(rDivide(ctx, rational(ctx, 1n), p.hi));
  const hi: Ext = p.lo === undefined || p.lo.numerator === 0n ? { inf: 1 } : fin(rDivide(ctx, rational(ctx, 1n), p.lo));
  const r = make(ctx, lo, p.hi === undefined ? true : p.hiOpen, hi, p.loOpen, bits);
  return positive ? r : negate(ctx, r);
}

/** A monotone map applied end by end (increasing, or decreasing when `decreasing`). */
function monotone(ctx: ExecutionContext, a: XRange, at: (e: Ext, side: 'lo' | 'hi') => Ext, bits: number, decreasing = false): XRange {
  const [l, lo, h, ho] = ends(a);
  if (!decreasing) return make(ctx, at(l, 'lo'), lo, at(h, 'hi'), ho, bits);
  return make(ctx, at(h, 'lo'), ho, at(l, 'hi'), lo, bits);
}

function powInt(ctx: ExecutionContext, a: XRange, n: bigint, bits: number): XRange {
  if (n === 0n) return { lo: rational(ctx, 1n), hi: rational(ctx, 1n), loOpen: false, hiOpen: false };
  if (n < 0n) return powInt(ctx, inverse(ctx, a, bits), -n, bits);
  const pw = (e: Ext): Ext => ('inf' in e ? { inf: (n % 2n === 0n ? 1 : e.inf) as 1 | -1 } : fin(rational(ctx, e.v.numerator ** n, e.v.denominator ** n)));
  if (n % 2n === 1n) return monotone(ctx, a, pw, bits);
  if (excludesZero({ ...a, hi: undefined, hiOpen: true })) return monotone(ctx, a, pw, bits);
  if (excludesZero({ ...a, lo: undefined, loOpen: true })) return monotone(ctx, a, pw, bits, true);
  // Contains 0 (or touches it): [0, max(|lo|, |hi|)ⁿ].
  const [l, lo, h, ho] = ends(a), L = pw(l), H = pw(h), c = cmp(ctx, L, H);
  const top = c > 0 ? { e: L, open: lo } : c < 0 ? { e: H, open: ho } : { e: H, open: lo && ho };
  return make(ctx, fin(rational(ctx, 0n)), false, top.e, top.open, bits);
}

function root(ctx: ExecutionContext, a: XRange, q: number, bits: number): XRange {
  const r = (e: Ext, side: 'lo' | 'hi'): Ext => {
    if ('inf' in e) return e;
    const neg = e.v.numerator < 0n, b = rootBounds(ctx, rAbs(ctx, e.v), q, bits + 4);
    const v = side === 'lo' ? (neg ? rNegate(ctx, b.hi) : b.lo) : (neg ? rNegate(ctx, b.lo) : b.hi);
    return fin(v);
  };
  // Even roots: the values in the domain are ≥ 0, so a range reaching below 0 is clipped there (closed).
  const base = q % 2 === 0 && mayContainZero({ ...a, hi: undefined, hiOpen: true }) ? { ...a, lo: rational(ctx, 0n), loOpen: false } : a;
  return monotone(ctx, base, r, bits);
}

function trigBounded(ctx: ExecutionContext, fn: 'sin' | 'cos', a: XRange, bits: number): XRange {
  const unit: XRange = { lo: rational(ctx, -1n), hi: rational(ctx, 1n), loOpen: false, hiOpen: false };
  if (a.lo === undefined || a.hi === undefined) return unit;
  if (rCompare(ctx, rAdd(ctx, a.hi, rNegate(ctx, a.lo)), rational(ctx, 4n)) > 0) return unit;
  const b = sinCosBox(ctx, fn, { lo: a.lo, hi: a.hi }, bits);
  return { lo: b.lo, hi: b.hi, loOpen: false, hiOpen: false };
}

function apply(ctx: ExecutionContext, fn: string, a: XRange, bits: number): XRange {
  const halfPi = () => { const p = piBounds(ctx, bits + 4); return { lo: rDivide(ctx, p.lo, rational(ctx, 2n)), hi: rDivide(ctx, p.hi, rational(ctx, 2n)) }; };
  switch (fn) {
    case 'exp': return monotone(ctx, a, (e, side) => ('inf' in e ? (e.inf < 0 ? fin(rational(ctx, 0n)) : e) : fin(side === 'lo' ? expBounds(ctx, e.v, bits).lo : expBounds(ctx, e.v, bits).hi)), bits);
    case 'log': {
      // Values in the domain are > 0; a range reaching 0 or below gives −∞ there.
      const at = (e: Ext, side: 'lo' | 'hi'): Ext => ('inf' in e ? e : e.v.numerator <= 0n ? { inf: -1 } : fin(side === 'lo' ? logBounds(ctx, e.v, bits).lo : logBounds(ctx, e.v, bits).hi));
      return monotone(ctx, a, at, bits);
    }
    case 'atan': {
      const h = halfPi();
      return monotone(ctx, a, (e, side) => ('inf' in e ? fin(e.inf < 0 ? rNegate(ctx, h.hi) : h.hi) : fin(side === 'lo' ? atanBounds(ctx, e.v, bits).lo : atanBounds(ctx, e.v, bits).hi)), bits);
    }
    case 'sin': case 'cos': return trigBounded(ctx, fn, a, bits);
    case 'asin': case 'acos': {
      const one = rational(ctx, 1n), minusOne = rational(ctx, -1n);
      const clip = (v: Rational | undefined, d: Rational) => (v === undefined ? d : rCompare(ctx, v, minusOne) < 0 ? minusOne : rCompare(ctx, v, one) > 0 ? one : v);
      const lo = clip(a.lo, minusOne), hi = clip(a.hi, one);
      const s = { lo: asinBounds(ctx, lo, bits).lo, hi: asinBounds(ctx, hi, bits).hi };
      const r: XRange = { lo: s.lo, hi: s.hi, loOpen: false, hiOpen: false };
      if (fn === 'asin') return r;
      const h = halfPi();
      return { lo: down(ctx, rAdd(ctx, h.lo, rNegate(ctx, s.hi)), bits), hi: up(ctx, rAdd(ctx, h.hi, rNegate(ctx, s.lo)), bits), loOpen: false, hiOpen: false };
    }
    case 'abs': {
      if (excludesZero({ ...a, hi: undefined, hiOpen: true })) return a;
      if (excludesZero({ ...a, lo: undefined, loOpen: true })) return negate(ctx, a);
      const [l, lo, h, ho] = ends(a), L: Ext = 'inf' in l ? { inf: 1 } : fin(rAbs(ctx, l.v)), H: Ext = 'inf' in h ? { inf: 1 } : fin(rAbs(ctx, h.v));
      const c = cmp(ctx, L, H), top = c > 0 ? { e: L, open: lo } : c < 0 ? { e: H, open: ho } : { e: H, open: lo && ho };
      return make(ctx, fin(rational(ctx, 0n)), false, top.e, top.open, bits);
    }
    case 'lambertw': {
      const t = minusInverseE(ctx, bits);
      const lo = a.lo === undefined || rCompare(ctx, a.lo, t.hi) <= 0 ? rational(ctx, -1n) : lambertBounds(ctx, a.lo, 0, bits).lo;
      const hi = a.hi === undefined ? undefined : rCompare(ctx, a.hi, t.hi) <= 0 ? rational(ctx, -1n) : lambertBounds(ctx, a.hi, 0, bits).hi;
      return { lo, ...(hi === undefined ? {} : { hi }), loOpen: false, hiOpen: hi === undefined };
    }
    case 'lambertwm1': {
      const t = minusInverseE(ctx, bits);
      const lo = a.hi === undefined || a.hi.numerator >= 0n ? undefined : lambertBounds(ctx, a.hi, -1, bits).lo;
      const hi = a.lo === undefined || rCompare(ctx, a.lo, t.hi) <= 0 ? rational(ctx, -1n) : lambertBounds(ctx, a.lo, -1, bits).hi;
      return { ...(lo === undefined ? {} : { lo }), hi, loOpen: lo === undefined, hiOpen: false };
    }
    default: return WHOLE;
  }
}

/**
 * The range of `f` for x in `box`. `box` itself is an outward enclosure of the
 * interval (open ends where the interval excludes them).
 */
export function rangeOf(store: ExpressionStore, f: ExprId, x: string, box: XRange, bits: number): XRange {
  return rangeOverBox(store, f, new Map([[x, box]]), bits);
}

/** The range of `f` with every variable in its own interval of `box` (a variable outside `box` gives the whole line). */
export function rangeOverBox(store: ExpressionStore, f: ExprId, box: ReadonlyMap<string, XRange>, bits: number): XRange {
  return rangeNodes(store, [f], box, bits).get(f) as XRange;
}

/** The ranges of every node below `roots` over `box` (the forward pass of contraction reuses them). */
export function rangeNodes(store: ExpressionStore, roots: readonly ExprId[], box: ReadonlyMap<string, XRange>, bits: number): Map<ExprId, XRange> {
  const ctx = store.ctx, done = new Map<ExprId, XRange>();
  for (const n of store.postorder([...roots])) {
    ctx.tick();
    const node = store.node(n), get = (c: ExprId) => done.get(c) as XRange;
    const free = store.freeSymbols(n);
    let out: XRange;
    if (free.length === 0) {
      const e = enclose(store, n, bits);
      out = e.kind === 'bounds' ? { lo: e.lo, hi: e.hi, loOpen: false, hiOpen: false } : WHOLE;
      done.set(n, out);
      continue;
    }
    if (free.some(s => !box.has(s))) { done.set(n, WHOLE); continue; }
    switch (node.kind) {
      case 'symbol': out = box.get(node.name) as XRange; break;
      case 'add': out = node.args.map(get).reduce((a, b) => add(ctx, a, b, bits)); break;
      case 'mul': out = node.args.map(get).reduce((a, b) => mul(ctx, a, b, bits)); break;
      case 'pow': {
        const e = store.numberValue(node.exponent);
        if (!e || free.length === 0 || store.freeSymbols(node.exponent).length) { out = WHOLE; break; }
        const q = Number(e.denominator);
        out = e.denominator === 1n ? powInt(ctx, get(node.base), e.numerator, bits)
          : Number.isSafeInteger(q) ? powInt(ctx, root(ctx, get(node.base), q, bits), e.numerator, bits) : WHOLE;
        break;
      }
      case 'apply': out = apply(ctx, node.fn, get(node.arg), bits); break;
      default: out = WHOLE;
    }
    done.set(n, out);
  }
  return done;
}

/** Interval operations on extended ranges, outward at `bits` (for contraction and the systems solver). */
export const rangeOps = { add, mul, negate, inverse, powInt, root, apply, roundDown: down, roundUp: up };
