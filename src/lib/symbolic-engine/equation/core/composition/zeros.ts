import { EquationAlgebraError } from '../execution';
import { rational, rCompare, rDivide, rMultiply, rSubtract, rAdd, type Rational } from '../algebra/rational';
import type { Refusal } from '../decision/rational-form';
import { enclose, piBounds } from '../representation/enclosure';
import type { ExprId, ExpressionStore } from '../representation/expression';
import { realCompare, realSign, START_BITS } from '../representation/real-order';
import { simplestBetween } from '../generators/samples';
import { sortedDistinct } from '../periodic/families';
import { derivative } from './derivative';
import { excludesZero, rangeOf, type XRange } from './range';
import { limit } from './limits';

/**
 * Exact zeros of a real expression in one variable whose kernels the closed
 * forms of slices 1–4 cannot invert together (mixed kernels, the variable
 * inside and outside kernels): the complete zero set, or a refusal.
 *
 * Method (`EQUATION-COMPOSITION1`):
 * - the line is cut at the exact domain breakpoints (zeros of denominators,
 *   log, radical, abs and arc arguments), so the expression is continuous and
 *   differentiable on every open piece, and its definedness is constant there;
 * - on each piece, a worklist of sub-intervals with exact signs at their ends:
 *   a certified range that excludes 0 proves no zero; a derivative range that
 *   excludes 0 proves strict monotonicity, so end signs decide, and a sign
 *   change has exactly one zero, accepted only when an exact candidate is
 *   confirmed (`realSign` = 0); otherwise the sub-interval is split at a simple
 *   rational in its middle third (internal only, never part of an answer);
 * - candidates come from structure: zeros of the additive terms and preimages
 *   of the special values of each kernel (sin/cos/tan at multiples of π/12,
 *   exp at 0, log at 1, atan/asin/acos at their special values, radicals at
 *   0 and 1, W at 0, e and −1/e);
 * - a trig kernel whose argument is unbounded on a bounded sub-interval
 *   (sin(1/x) near 0) oscillates infinitely often there: refused at once;
 *   unbounded tails are cut outward, so an oscillating tail such as eˣ + sin x
 *   as x → −∞ is refused at its first root that is not a closed form.
 *
 * Termination: every step splits a bounded sub-interval by at least a third or
 * moves a tail cut outward; a zero that is not exact and not simple could
 * only exhaust the budget (a typed resource stop), as in gate 6.
 */
export type ZeroFinder = (e: ExprId) => { kind: 'zeros'; values: readonly ExprId[]; intervals?: readonly unknown[]; periodic?: readonly unknown[]; families?: readonly unknown[] } | { kind: 'all' } | { kind: 'refused'; refusal: Refusal };

export const CERTIFIED_NUMERICS = 'EQUATION-CERTIFIED-NUMERICS1';
const TRIG = new Set(['sin', 'cos', 'tan']);

class Refused { readonly refusal: Refusal; constructor(r: Refusal) { this.refusal = r; } }
const refuse = (detail: string): never => { throw new Refused({ owner: CERTIFIED_NUMERICS, detail }); };

type End = { readonly kind: 'inf'; readonly side: -1 | 1 } | { readonly kind: 'pt'; readonly id: ExprId; readonly sign: -1 | 0 | 1 | undefined };

/** Sign of a number-only expression, or undefined where it is not defined. */
function signOf(store: ExpressionStore, id: ExprId): -1 | 0 | 1 | undefined {
  try {
    return realSign(store, id);
  } catch (e) {
    if (e instanceof EquationAlgebraError && e.code === 'invalid-input') return undefined;
    throw e;
  }
}

function boundsOf(store: ExpressionStore, id: ExprId): { lo: Rational; hi: Rational } {
  for (let bits = START_BITS; ; bits *= 2) {
    store.ctx.tick();
    const e = enclose(store, id, bits);
    if (e.kind === 'bounds') return e;
    if (e.kind !== 'unknown') return refuse('a cut point that cannot be enclosed');
  }
}

function finiteValues(z: ReturnType<ZeroFinder>, label: string): ExprId[] {
  if (z.kind === 'refused') throw new Refused(z.refusal);
  if (z.kind === 'all') return refuse(`${label} vanishing identically`);
  if (z.intervals?.length || z.periodic?.length || z.families?.length) return refuse(`infinitely many ${label}s`);
  return [...z.values];
}

function specialValues(store: ExpressionStore, fn: string): ExprId[] {
  const q = (n: number, d = 1) => store.fraction(n, d), s = (k: number) => store.sqrt(store.integer(k));
  switch (fn) {
    case 'exp': return [q(0)];
    case 'log': return [q(1)];
    case 'atan': return [q(0), q(1), q(-1), s(3), store.neg(s(3)), store.div(s(3), store.integer(3)), store.neg(store.div(s(3), store.integer(3)))];
    case 'asin': case 'acos': return [q(0), q(1, 2), q(-1, 2), q(1), q(-1), store.div(s(2), store.integer(2)), store.neg(store.div(s(2), store.integer(2))), store.div(s(3), store.integer(2)), store.neg(store.div(s(3), store.integer(2)))];
    case 'abs': return [q(0)];
    case 'lambertw': case 'lambertwm1': return [q(0), store.exp(store.integer(1)), store.neg(store.exp(store.integer(-1)))];
    case 'radical': return [q(0), q(1)];
    default: return [];
  }
}

export function rangeZeros(store: ExpressionStore, f: ExprId, x: string, zeros: ZeroFinder): { values: ExprId[] } | { refusal: Refusal } {
  try {
    if (store.freeSymbols(f).some(s => s !== x)) return { refusal: { owner: 'EQUATION-PARAMETERS1', detail: 'symbols besides the variable' } };
    const ctx = store.ctx, depends = (id: ExprId) => store.freeSymbols(id).includes(x);
    const at = (id: ExprId, p: ExprId) => store.substitute(id, new Map([[x, p]]));
    // Domain breakpoints and kernels.
    const cuts: ExprId[] = [], kernels: { fn: string; u: ExprId }[] = [];
    for (const n of store.postorder([f])) {
      if (!depends(n)) continue;
      const node = store.node(n);
      if (node.kind === 'pow') {
        const e = store.numberValue(node.exponent);
        if (!e) return refuse('a power with a variable exponent');
        if (e.numerator < 0n || e.denominator > 1n) cuts.push(...finiteValues(zeros(node.base), 'domain breakpoint'));
        if (e.denominator > 1n) kernels.push({ fn: 'radical', u: node.base });
      }
      if (node.kind !== 'apply') continue;
      const u = node.arg;
      kernels.push({ fn: node.fn, u });
      switch (node.fn) {
        case 'tan': return refuse('tan inside a mixed expression');
        case 'log': case 'abs': cuts.push(...finiteValues(zeros(u), 'domain breakpoint')); break;
        case 'asin': case 'acos':
          cuts.push(...finiteValues(zeros(store.sub(u, store.integer(1))), 'domain breakpoint'), ...finiteValues(zeros(store.add(u, store.integer(1))), 'domain breakpoint'));
          break;
        case 'lambertw': case 'lambertwm1':
          cuts.push(...finiteValues(zeros(store.add(u, store.exp(store.integer(-1)))), 'domain breakpoint'));
          if (node.fn === 'lambertwm1') cuts.push(...finiteValues(zeros(u), 'domain breakpoint'));
          break;
        default: break;
      }
    }
    const df = derivative(store, f, x);
    const found = new Map<ExprId, true>();
    const breakpoints = sortedDistinct(store, cuts);
    const ends: End[] = breakpoints.map(p => ({ kind: 'pt', id: p, sign: signOf(store, at(f, p)) }));
    for (const e of ends) if (e.kind === 'pt' && e.sign === 0) found.set(e.id, true);
    // Candidates (exact points), filtered per sub-interval.
    let structural: ExprId[] | undefined;
    const candidates = (lo: End, hi: End, box: XRange): ExprId[] => {
      if (structural === undefined) {
        structural = [];
        // Additive terms of f, through a constant factor (never f itself: that is the problem being solved).
        let core = f;
        const outer = store.node(f);
        if (outer.kind === 'mul') { const dep = outer.args.filter(depends); if (dep.length === 1) core = dep[0]; }
        const node = store.node(core);
        if (node.kind === 'add') for (const t of node.args) if (depends(t) && t !== f) { const z = zeros(t); if (z.kind === 'zeros') structural.push(...z.values); }
        for (const k of kernels) for (const s of specialValues(store, k.fn)) { const z = zeros(store.sub(k.u, s)); if (z.kind === 'zeros') structural.push(...z.values); }
      }
      const list = [...structural];
      for (const k of kernels) {
        if (!TRIG.has(k.fn)) continue;
        const u = rangeOf(store, k.u, x, box, 64);
        if (u.lo === undefined || u.hi === undefined) continue;
        // Multiples of π/12 inside the argument range.
        const pi = piBounds(ctx, 64), twelve = rational(ctx, 12n);
        const ratios = [u.lo, u.hi].flatMap(v => [rDivide(ctx, rMultiply(ctx, v, twelve), pi.lo), rDivide(ctx, rMultiply(ctx, v, twelve), pi.hi)]);
        const from = ratios.map(floor).reduce((a, b) => (a < b ? a : b)) - 1n, to = ratios.map(floor).reduce((a, b) => (a > b ? a : b)) + 1n;
        ctx.allocate(Number(to - from + 1n));
        for (let m = from; m <= to; m++) {
          const z = zeros(store.sub(k.u, store.mul(store.fraction(Number(m), 12), store.constant('pi'))));
          if (z.kind === 'zeros') list.push(...z.values);
        }
      }
      return list.filter(c => inside(c, lo, hi));
    };
    const inside = (c: ExprId, lo: End, hi: End) => (lo.kind === 'inf' || realCompare(store, lo.id, c) < 0) && (hi.kind === 'inf' || realCompare(store, c, hi.id) < 0);
    const boxOf = (lo: End, hi: End): XRange => {
      const l = lo.kind === 'inf' ? undefined : store.numberValue(lo.id) ?? boundsOf(store, lo.id).lo;
      const h = hi.kind === 'inf' ? undefined : store.numberValue(hi.id) ?? boundsOf(store, hi.id).hi;
      return { ...(l === undefined ? {} : { lo: l }), ...(h === undefined ? {} : { hi: h }), loOpen: lo.kind === 'inf' || store.numberValue(lo.id) !== undefined, hiOpen: hi.kind === 'inf' || store.numberValue(hi.id) !== undefined };
    };
    const point = (r: Rational): End => {
      const id = store.number(r), s = signOf(store, at(f, id));
      if (s === 0) found.set(id, true);
      return { kind: 'pt', id, sign: s };
    };
    const middle = (lo: End, hi: End): Rational => {
      if (lo.kind === 'inf' || hi.kind === 'inf') {
        const base = lo.kind === 'pt' ? boundsOf(store, lo.id).hi : hi.kind === 'pt' ? boundsOf(store, hi.id).lo : rational(ctx, 0n);
        const w = rCompare(ctx, abs(base), rational(ctx, 1n)) > 0 ? abs(base) : rational(ctx, 1n);
        const t = lo.kind === 'inf' && hi.kind === 'inf' ? rational(ctx, 0n) : lo.kind === 'pt' ? rAdd(ctx, base, w) : rSubtract(ctx, base, w);
        return simplestBetween(ctx, rSubtract(ctx, t, rational(ctx, 1n, 2n)), rAdd(ctx, t, rational(ctx, 1n, 2n)));
      }
      const a = boundsOf(store, lo.id).hi, b = boundsOf(store, hi.id).lo, third = rDivide(ctx, rSubtract(ctx, b, a), rational(ctx, 3n));
      return simplestBetween(ctx, rAdd(ctx, a, third), rSubtract(ctx, b, third));
    };
    const abs = (r: Rational) => (r.numerator < 0n ? rational(ctx, -r.numerator, r.denominator) : r);
    // Pieces between breakpoints (open), each analysed only where the expression is defined.
    const bounds: End[] = [{ kind: 'inf', side: -1 }, ...ends, { kind: 'inf', side: 1 }];
    // Bounded sub-intervals are processed before tails (tails sit at the bottom of the stack), so a tail is cut
    // outward only when everything bounded is decided.
    const work: [End, End][] = [];
    const push = (lo: End, hi: End) => { if (lo.kind === 'inf' || hi.kind === 'inf') work.unshift([lo, hi]); else work.push([lo, hi]); };
    for (let i = 0; i + 1 < bounds.length; i++) {
      const lo = bounds[i], hi = bounds[i + 1], m = point(middle(lo, hi));
      if (m.kind === 'pt' && m.sign === undefined) continue; // undefined on the whole piece
      // Not identically zero on the piece (then its zeros are isolated): a second sample when the first is a zero.
      if (m.kind === 'pt' && m.sign === 0) {
        const second = point(middle(lo, m));
        if (second.kind === 'pt' && second.sign === 0) refuse('an expression that may vanish on an interval');
      }
      push(lo, m); push(m, hi);
    }
    while (work.length) {
      ctx.tick();
      const [lo, hi] = work.pop() as [End, End];
      const box = boxOf(lo, hi), r = rangeOf(store, f, x, box, 64);
      if (excludesZero(r)) continue;
      // A trig kernel whose argument is unbounded on a bounded sub-interval oscillates infinitely often there.
      if (lo.kind === 'pt' && hi.kind === 'pt') {
        for (const k of kernels) {
          if (!TRIG.has(k.fn)) continue;
          const u = rangeOf(store, k.u, x, box, 64);
          if (u.lo === undefined || u.hi === undefined) refuse('a trig kernel oscillating infinitely often near a point');
        }
      }
      // Monotone sub-intervals. On an open piece the expression is real-analytic and not identically zero
      // (checked per piece), so its zeros are isolated: a derivative range ≥ 0 (or ≤ 0) already makes it
      // strictly monotone there, and f lies strictly between its end values (or limits).
      const d = df === undefined ? undefined : rangeOf(store, df, x, box, 64);
      const dir = d === undefined ? 0 : d.lo !== undefined && d.lo.numerator >= 0n ? 1 : d.hi !== undefined && d.hi.numerator <= 0n ? -1 : 0;
      if (dir !== 0 && ((lo.kind === 'inf') !== (hi.kind === 'inf'))) {
        // A tail: the limit at infinity plays the part of the missing end value.
        const fin = (lo.kind === 'pt' ? lo : hi) as Extract<End, { kind: 'pt' }>;
        const lim = limit(store, f, x, { inf: lo.kind === 'inf' ? -1 : 1 }, store.number(middle(lo, hi)));
        const limSign = lim === undefined ? undefined : 'inf' in lim ? lim.inf : realSign(store, lim.v);
        const sl = lo.kind === 'inf' ? limSign : fin.sign, sh = hi.kind === 'inf' ? limSign : fin.sign;
        if ((dir > 0 && ((sl !== undefined && sl >= 0) || (sh !== undefined && sh <= 0))) || (dir < 0 && ((sl !== undefined && sl <= 0) || (sh !== undefined && sh >= 0)))) continue;
      }
      if (dir !== 0 && lo.kind === 'pt' && hi.kind === 'pt') {
        const sl = lo.sign, sh = hi.sign;
        if ((dir > 0 && ((sl !== undefined && sl >= 0) || (sh !== undefined && sh <= 0))) || (dir < 0 && ((sl !== undefined && sl <= 0) || (sh !== undefined && sh >= 0)))) continue;
        if (sl !== undefined && sh !== undefined) {
          // Opposite signs: exactly one zero inside, accepted only as an exact candidate.
          const root = candidates(lo, hi, box).find(c => signOf(store, at(f, c)) === 0);
          if (root === undefined) refuse('a root that is not a closed form');
          found.set(root as ExprId, true);
          continue;
        }
      }
      const m = point(middle(lo, hi));
      // Exact zeros at both ends and in the middle: the expression may vanish on an interval (not decided here).
      if (lo.kind === 'pt' && hi.kind === 'pt' && lo.sign === 0 && hi.sign === 0 && m.kind === 'pt' && m.sign === 0) refuse('an expression that may vanish on an interval');
      push(lo, m); push(m, hi);
    }
    return { values: sortedDistinct(store, [...found.keys()]) };
  } catch (e) {
    if (e instanceof Refused) return { refusal: e.refusal };
    throw e;
  }
}

function floor(r: Rational): bigint { return r.numerator >= 0n ? r.numerator / r.denominator : -((-r.numerator + r.denominator - 1n) / r.denominator); }
