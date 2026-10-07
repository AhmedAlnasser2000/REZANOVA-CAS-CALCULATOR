import { rAdd, rational, rCompare, rMultiply, rSubtract, type Rational } from '../algebra/rational';
import { excludesZero, rangeNodes, rangeOps, rangeOverBox, WHOLE, type XRange } from '../composition/range';
import { enclose } from '../representation/enclosure';
import type { ExprId, ExpressionStore } from '../representation/expression';

/**
 * Box contraction for systems (EQUATION-CERTIFIED-NUMERICS1 PR B).
 *
 * HC4 revise: for one equation f = 0 over a box, a forward pass computes every node's certified range
 * (`rangeNodes`), then a backward pass intersects each node with what f = 0 forces on it, down to the
 * variables: a sum's term is the target minus the other terms, a product's factor the target over the other
 * factors (when they exclude 0), x = t^(1/n) for integer powers (both signs for even n), u = log t under exp,
 * u = exp t under log. Other kernels (sin, cos, atan, …) pass the whole line back, which is sound. Every step
 * keeps every point where f can vanish, so the contracted box holds every zero of f in the box; an empty
 * intersection proves there is none.
 *
 * The mean-value form f(m) + Σ ∂ᵢf(X)·(Xᵢ − mᵢ) encloses f on a bounded box more tightly than the natural
 * range when the box is small; exclusion tests intersect both.
 */
export type Box = ReadonlyMap<string, XRange>;

const { add, mul, negate, inverse, root, apply } = rangeOps;

/** The intersection of two ranges, or undefined when empty. */
export function intersect(store: ExpressionStore, a: XRange, b: XRange): XRange | undefined {
  const ctx = store.ctx;
  const [lo, loOpen] = a.lo === undefined ? [b.lo, b.loOpen] : b.lo === undefined ? [a.lo, a.loOpen]
    : rCompare(ctx, a.lo, b.lo) > 0 ? [a.lo, a.loOpen] : rCompare(ctx, a.lo, b.lo) < 0 ? [b.lo, b.loOpen] : [a.lo, a.loOpen || b.loOpen];
  const [hi, hiOpen] = a.hi === undefined ? [b.hi, b.hiOpen] : b.hi === undefined ? [a.hi, a.hiOpen]
    : rCompare(ctx, a.hi, b.hi) < 0 ? [a.hi, a.hiOpen] : rCompare(ctx, a.hi, b.hi) > 0 ? [b.hi, b.hiOpen] : [a.hi, a.hiOpen || b.hiOpen];
  if (lo !== undefined && hi !== undefined) {
    const c = rCompare(ctx, lo, hi);
    if (c > 0 || (c === 0 && (loOpen || hiOpen))) return undefined;
  }
  return { ...(lo === undefined ? {} : { lo }), ...(hi === undefined ? {} : { hi }), loOpen: lo === undefined ? true : loOpen, hiOpen: hi === undefined ? true : hiOpen };
}

const ZERO = (store: ExpressionStore): XRange => ({ lo: rational(store.ctx, 0n), hi: rational(store.ctx, 0n), loOpen: false, hiOpen: false });
const POSITIVE = (store: ExpressionStore): XRange => ({ lo: rational(store.ctx, 0n), loOpen: true, hiOpen: true });

class Empty extends Error {}

/** HC4 revise of `box` by f = 0; undefined when f has no zero in the box. */
export function contract(store: ExpressionStore, f: ExprId, box: Box, bits: number): Map<string, XRange> | undefined {
  const ctx = store.ctx, forward = rangeNodes(store, [f], box, bits);
  const target = new Map<ExprId, XRange>(), out = new Map(box);
  const narrow = (n: ExprId, r: XRange) => {
    const cur = target.get(n) ?? (forward.get(n) as XRange), next = intersect(store, cur, r);
    if (!next) throw new Empty();
    target.set(n, next);
  };
  try {
    narrow(f, ZERO(store));
    const order = store.postorder([f]).reverse();
    for (const n of order) {
      ctx.tick();
      const t = target.get(n);
      if (!t || store.freeSymbols(n).every(s => !box.has(s))) continue;
      const node = store.node(n), current = (c: ExprId) => target.get(c) ?? (forward.get(c) as XRange);
      const live = (c: ExprId) => store.freeSymbols(c).some(v => box.has(v));
      switch (node.kind) {
        case 'symbol': {
          const next = intersect(store, out.get(node.name) as XRange, t);
          if (!next) throw new Empty();
          out.set(node.name, next);
          break;
        }
        case 'add':
          node.args.forEach((a, i) => {
            if (!live(a)) return;
            const others = node.args.filter((_, j) => j !== i).map(current).reduce((p, q) => add(ctx, p, q, bits));
            narrow(a, add(ctx, t, negate(ctx, others), bits));
          });
          break;
        case 'mul':
          node.args.forEach((a, i) => {
            if (!live(a)) return;
            const others = node.args.filter((_, j) => j !== i).map(current).reduce((p, q) => mul(ctx, p, q, bits));
            if (excludesZero(others)) narrow(a, mul(ctx, t, inverse(ctx, others, bits), bits));
          });
          break;
        case 'pow': {
          const e = store.numberValue(node.exponent);
          if (!e || e.denominator !== 1n || e.numerator === 0n || store.freeSymbols(node.exponent).length) break;
          let s = t, k = e.numerator;
          if (k < 0n) {
            if (!excludesZero(s)) break;
            s = inverse(ctx, s, bits); k = -k;
          }
          if (k > BigInt(Number.MAX_SAFE_INTEGER)) break;
          if (k % 2n === 1n) { narrow(node.base, root(ctx, s, Number(k), bits)); break; }
          const nonneg = intersect(store, s, { lo: rational(ctx, 0n), loOpen: false, hiOpen: true });
          if (!nonneg) throw new Empty();
          const r = root(ctx, nonneg, Number(k), bits), b = current(node.base);
          if (excludesZero({ ...b, hi: undefined, hiOpen: true })) narrow(node.base, r);
          else if (excludesZero({ ...b, lo: undefined, loOpen: true })) narrow(node.base, negate(ctx, r));
          else narrow(node.base, r.hi === undefined ? WHOLE : { lo: rangeOps.roundDown(ctx, rSubtract(ctx, rational(ctx, 0n), r.hi), bits), hi: r.hi, loOpen: false, hiOpen: false });
          break;
        }
        case 'apply':
          if (node.fn === 'exp') {
            const p = intersect(store, t, POSITIVE(store));
            if (!p) throw new Empty();
            narrow(node.arg, apply(ctx, 'log', p, bits));
          } else if (node.fn === 'log') {
            narrow(node.arg, apply(ctx, 'exp', t, bits));
          }
          break;
        default: break;
      }
    }
  } catch (e) {
    if (e instanceof Empty) return undefined;
    throw e;
  }
  return out;
}

/** Whether `a` is narrower than `b` by a useful margin (a tenth of b's width, or a newly finite end). */
function shrank(store: ExpressionStore, a: XRange, b: XRange): boolean {
  if ((a.lo !== undefined) !== (b.lo !== undefined) || (a.hi !== undefined) !== (b.hi !== undefined)) return true;
  if (a.lo === undefined || a.hi === undefined || b.lo === undefined || b.hi === undefined) {
    // Half-bounded: the finite end moved.
    return (a.lo !== undefined && b.lo !== undefined && rCompare(store.ctx, a.lo, b.lo) !== 0) || (a.hi !== undefined && b.hi !== undefined && rCompare(store.ctx, a.hi, b.hi) !== 0);
  }
  const ctx = store.ctx, wa = rSubtract(ctx, a.hi, a.lo), wb = rSubtract(ctx, b.hi, b.lo);
  return rCompare(ctx, rMultiply(ctx, wa, rational(ctx, 10n)), rMultiply(ctx, wb, rational(ctx, 9n))) < 0;
}

/** HC4 over every equation, repeated while some variable shrinks usefully; undefined when the box has no zero. */
export function contractSystem(store: ExpressionStore, fs: readonly ExprId[], box: Box, bits: number): Map<string, XRange> | undefined {
  let cur = new Map(box);
  for (let changed = true; changed;) {
    store.ctx.tick();
    changed = false;
    for (const f of fs) {
      const next = contract(store, f, cur, bits);
      if (!next) return undefined;
      for (const [v, r] of next) if (shrank(store, r, cur.get(v) as XRange)) changed = true;
      cur = next;
    }
  }
  return cur;
}

/** The midpoint of a bounded box. */
export function midpoint(store: ExpressionStore, box: Box): Map<string, Rational> {
  const ctx = store.ctx, half = rational(ctx, 1n, 2n);
  return new Map([...box].map(([v, r]) => [v, rMultiply(ctx, rAdd(ctx, r.lo as Rational, r.hi as Rational), half)] as const));
}

/** The mean-value enclosure of f on a bounded box, intersected with the natural range. */
export function meanValueRange(store: ExpressionStore, f: ExprId, gradient: readonly ExprId[], vars: readonly string[], box: Box, bits: number): XRange {
  const ctx = store.ctx, natural = rangeOverBox(store, f, box, bits);
  if (vars.some(v => box.get(v)?.lo === undefined || box.get(v)?.hi === undefined)) return natural;
  const m = midpoint(store, box);
  const fm = enclose(store, store.substitute(f, new Map(vars.map(v => [v, store.number(m.get(v) as Rational)] as const))), bits);
  if (fm.kind !== 'bounds') return natural;
  let r: XRange = { lo: fm.lo, hi: fm.hi, loOpen: false, hiOpen: false };
  vars.forEach((v, i) => {
    const g = rangeOverBox(store, gradient[i], box, bits), x = box.get(v) as XRange, c = m.get(v) as Rational;
    const dx: XRange = { lo: rSubtract(ctx, x.lo as Rational, c), hi: rSubtract(ctx, x.hi as Rational, c), loOpen: false, hiOpen: false };
    r = add(ctx, r, mul(ctx, g, dx, bits), bits);
  });
  return intersect(store, natural, r) ?? natural;
}
