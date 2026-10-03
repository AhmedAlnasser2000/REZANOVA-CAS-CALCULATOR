import { rational, rMultiply, type Rational } from '../algebra/rational';
import { attachForm } from '../decision/radical-forms';
import { canonicalAngle, expandConstant } from '../representation/angles';
import { enclose, type Bounds } from '../representation/enclosure';
import { evaluateExact, imaginaryPart, realPart, type ExactValue } from '../representation/evaluate';
import type { ExprId, ExpressionStore } from '../representation/expression';
import { realSign, START_BITS } from '../representation/real-order';

/**
 * Complex closed forms through their rectangular parts re + i·im, both real
 * closed forms, so that every decision about a complex constant reduces to
 * exact real signs (exact evaluation, the angle and log zero tests, then
 * certified refinement under the budget).
 *
 * - `rect`: the parts, following the principal-value semantics of the graph
 *   (Log w = ln|w| + i·Arg w with Arg ∈ (−π, π]; w^r = exp(r·Log w));
 * - `principalLog`: the canonical closed form of Log c;
 * - `complexIsZero`: an exact zero test (no division by π-multiples, so
 *   exact cancellation stays visible);
 * - `floorTurns`: ⌊θ/2π⌋ of a real angle with an exact boundary test.
 */
export interface Rect { readonly re: ExprId; readonly im: ExprId }

const isZeroId = (store: ExpressionStore, id: ExprId) => store.numberValue(id)?.numerator === 0n;

/** An exact value as an expression (a proven radical form for quadratic irrationals). */
export function valueExpression(store: ExpressionStore, v: ExactValue): ExprId {
  if (v.kind === 'rational') return store.number(v.value);
  const withForm = attachForm(store, v);
  return 'form' in withForm && withForm.form !== undefined ? withForm.form : store.algebraic(v.root);
}

/** a/b for a number-only b, with b's constant factors inverted one by one (so π·π⁻¹ and i·i⁻¹ cancel). */
export function quotient(store: ExpressionStore, a: ExprId, b: ExprId): ExprId {
  const n = store.node(b);
  const inverse = n.kind === 'mul' ? store.mul(...n.args.map(f => store.pow(f, store.integer(-1)))) : store.pow(b, store.integer(-1));
  return expandConstant(store, store.mul(a, inverse));
}

/** A real closed form replaced by its exact value's expression when it evaluates exactly. */
function simplified(store: ExpressionStore, x: ExprId): ExprId {
  const e = evaluateExact(store, x, 'real');
  return e.kind === 'exact' ? valueExpression(store, e.value) : x;
}

/** ln x for a positive real closed form, split over positive factors and powers (ln eᵃ = a for real a). */
export function realLog(store: ExpressionStore, x: ExprId): ExprId {
  const e = evaluateExact(store, x, 'real');
  if (e.kind === 'exact') return store.log(valueExpression(store, e.value));
  const n = store.node(x);
  if (n.kind === 'apply' && n.fn === 'exp' && store.isRealConstant(n.arg)) return n.arg;
  if (n.kind === 'mul' && n.args.every(a => realSign(store, a) > 0)) return store.add(...n.args.map(a => realLog(store, a)));
  if (n.kind === 'pow' && store.numberValue(n.exponent) && realSign(store, n.base) > 0) return store.mul(n.exponent, realLog(store, n.base));
  return store.log(x);
}

const sign = (store: ExpressionStore, id: ExprId) => (isZeroId(store, id) ? 0 : realSign(store, id));

/** The parts of Log w, or undefined for w = 0. */
export function logParts(store: ExpressionStore, w: Rect): Rect | undefined {
  const pi = store.constant('pi'), zero = store.integer(0);
  const sa = sign(store, w.re), sb = sign(store, w.im);
  if (sa === 0 && sb === 0) return undefined;
  if (sb === 0) return sa > 0 ? { re: realLog(store, w.re), im: zero } : { re: realLog(store, store.neg(w.re)), im: pi };
  if (sa === 0) return { re: realLog(store, sb > 0 ? w.im : store.neg(w.im)), im: store.mul(store.number(rational(store.ctx, BigInt(sb), 2n)), pi) };
  const turn = sa > 0 ? zero : sb > 0 ? pi : store.neg(pi);
  const modulus2 = expandConstant(store, store.add(store.pow(w.re, store.integer(2)), store.pow(w.im, store.integer(2))));
  return {
    re: store.mul(store.number(rational(store.ctx, 1n, 2n)), realLog(store, modulus2)),
    im: canonicalAngle(store, store.add(store.atan(simplified(store, quotient(store, w.im, w.re))), turn)),
  };
}

/** re + i·im, without a 0·i term (i is undefined over ℝ, so the store keeps 0·i). */
export function complexForm(store: ExpressionStore, r: Rect): ExprId {
  return isZeroId(store, r.im) ? r.re : store.add(r.re, store.mul(store.constant('i'), r.im));
}

/** A real angle reduced into (−π, π] by whole turns (exact boundary decisions). */
export function principalAngle(store: ExpressionStore, b: ExprId): ExprId {
  if (isZeroId(store, b)) return b;
  const n = floorTurns(store, expandConstant(store, store.sub(store.constant('pi'), b)));
  return n === 0n ? b : expandConstant(store, store.add(b, store.mul(store.integer(2n * n), store.constant('pi'))));
}

/** The canonical closed form ln|c| + i·Arg c of the principal logarithm; undefined for c = 0 or a form without parts. */
export function principalLog(store: ExpressionStore, c: ExprId): ExprId | undefined {
  const r = rect(store, c), parts = r && logParts(store, r);
  return parts && complexForm(store, parts);
}

/** Rectangular parts of a number-only expression; undefined when a part is not available here. */
export function rect(store: ExpressionStore, id: ExprId): Rect | undefined {
  const ctx = store.ctx, zero = store.integer(0), one = store.integer(1), half = store.number(rational(ctx, 1n, 2n));
  const z = (x: ExprId) => isZeroId(store, x);
  const real = (x: ExprId): Rect => ({ re: x, im: zero });
  const times = (x: Rect, y: Rect): Rect => {
    if (z(x.im) && z(y.im)) return real(store.mul(x.re, y.re));
    if (z(x.im)) return { re: store.mul(x.re, y.re), im: store.mul(x.re, y.im) };
    if (z(y.im)) return { re: store.mul(x.re, y.re), im: store.mul(x.im, y.re) };
    return { re: store.sub(store.mul(x.re, y.re), store.mul(x.im, y.im)), im: store.add(store.mul(x.re, y.im), store.mul(x.im, y.re)) };
  };
  const inverse = (x: Rect): Rect => {
    if (z(x.im)) return real(store.pow(x.re, store.integer(-1)));
    const m = store.add(store.pow(x.re, store.integer(2)), store.pow(x.im, store.integer(2)));
    return { re: store.div(x.re, m), im: store.neg(store.div(x.im, m)) };
  };
  const power = (x: Rect, n: bigint): Rect => {
    let base = n < 0n ? inverse(x) : x, e = n < 0n ? -n : n, out: Rect = real(one);
    while (e > 0n) {
      ctx.tick();
      if (e & 1n) out = times(out, base);
      e >>= 1n;
      if (e > 0n) base = times(base, base);
    }
    return out;
  };
  const expOf = (u: Rect): Rect => {
    if (z(u.im)) return real(store.exp(u.re));
    const m = z(u.re) ? one : store.exp(u.re);
    return { re: store.mul(m, store.cos(u.im)), im: store.mul(m, store.sin(u.im)) };
  };
  const hyperbolic = (b: ExprId) => ({
    cosh: store.mul(half, store.add(store.exp(b), store.exp(store.neg(b)))),
    sinh: store.mul(half, store.sub(store.exp(b), store.exp(store.neg(b)))),
  });
  const done = new Map<ExprId, Rect | undefined>();
  for (const n of store.postorder([id])) {
    ctx.tick();
    if (store.freeSymbols(n).length) { done.set(n, undefined); continue; }
    if (store.isRealConstant(n)) { done.set(n, real(n)); continue; }
    const node = store.node(n), get = (c: ExprId) => done.get(c);
    let out: Rect | undefined;
    switch (node.kind) {
      case 'constant': out = node.name === 'i' ? { re: zero, im: one } : undefined; break;
      case 'algebraic': {
        const v = evaluateExact(store, n, 'complex');
        if (v.kind === 'exact') out = { re: valueExpression(store, realPart(ctx, v.value)), im: valueExpression(store, imaginaryPart(ctx, v.value)) };
        break;
      }
      case 'add': {
        const parts = node.args.map(get);
        if (parts.every(p => p !== undefined)) out = { re: store.add(...(parts as Rect[]).map(p => p.re)), im: store.add(...(parts as Rect[]).map(p => p.im)) };
        break;
      }
      case 'mul': {
        const parts = node.args.map(get);
        if (parts.every(p => p !== undefined)) out = (parts as Rect[]).reduce(times);
        break;
      }
      case 'pow': {
        // (B^r)^n = B^(r·n) for an integer n under the principal value ((e^w)ⁿ = e^{n·w}).
        const inner = store.node(node.base), r = inner.kind === 'pow' ? store.numberValue(inner.exponent) : undefined, en = store.numberValue(node.exponent);
        if (inner.kind === 'pow' && r && en && en.denominator === 1n) {
          const folded = store.pow(inner.base, store.number(rMultiply(ctx, r, en)));
          if (store.node(folded).kind !== 'pow' || folded !== n) { const sub = rect(store, folded); if (sub) { out = sub; break; } }
        }
        const b = get(node.base), e = store.numberValue(node.exponent);
        if (b === undefined) break;
        if (e && e.denominator === 1n) { out = power(b, e.numerator); break; }
        if (e) {
          if (z(b.im)) {
            const s = sign(store, b.re);
            if (s > 0) out = real(store.pow(b.re, node.exponent));
            else if (s === 0) out = e.numerator > 0n ? real(zero) : undefined;
            else {
              const m = store.pow(store.neg(b.re), node.exponent), angle = store.mul(node.exponent, store.constant('pi'));
              out = { re: store.mul(m, store.cos(angle)), im: store.mul(m, store.sin(angle)) };
            }
            break;
          }
          const m2 = store.add(store.pow(b.re, store.integer(2)), store.pow(b.im, store.integer(2)));
          if (e.numerator === 1n && e.denominator === 2n) {
            // Principal square root: √((|w| + a)/2) + i·sgn(b)·√((|w| − a)/2).
            const m = store.sqrt(m2), sb = sign(store, b.im);
            out = { re: store.sqrt(store.mul(half, store.add(m, b.re))), im: store.mul(store.integer(sb), store.sqrt(store.mul(half, store.sub(m, b.re)))) };
            break;
          }
          const L = logParts(store, b);
          if (L === undefined) break;
          const m = store.pow(m2, store.mul(half, node.exponent)), angle = store.mul(node.exponent, L.im);
          out = { re: store.mul(m, store.cos(angle)), im: store.mul(m, store.sin(angle)) };
          break;
        }
        const u = get(node.exponent), L = logParts(store, b);
        if (u !== undefined && L !== undefined) out = expOf(times(u, L));
        break;
      }
      case 'apply': {
        const u = get(node.arg);
        if (u === undefined) break;
        switch (node.fn) {
          case 'exp': out = expOf(u); break;
          case 'log': {
            // Log(e^v) = Re v + i·(Im v reduced into (−π, π]): structural, so no identity has to be refined.
            const inner = store.node(node.arg);
            const v = inner.kind === 'apply' && inner.fn === 'exp' ? get(inner.arg) : undefined;
            out = v === undefined ? logParts(store, u) : { re: v.re, im: principalAngle(store, v.im) };
            break;
          }
          case 'sin': case 'cos': case 'tan': {
            if (z(u.im)) { out = real(store.apply(node.fn, u.re)); break; }
            const { cosh, sinh } = hyperbolic(u.im);
            const s: Rect = { re: store.mul(store.sin(u.re), cosh), im: store.mul(store.cos(u.re), sinh) };
            const c: Rect = { re: store.mul(store.cos(u.re), cosh), im: store.neg(store.mul(store.sin(u.re), sinh)) };
            out = node.fn === 'sin' ? s : node.fn === 'cos' ? c : times(s, inverse(c));
            break;
          }
          case 'abs': out = real(z(u.im) ? store.abs(u.re) : store.sqrt(store.add(store.pow(u.re, store.integer(2)), store.pow(u.im, store.integer(2))))); break;
          default: out = undefined;
        }
        break;
      }
      default: out = undefined;
    }
    done.set(n, out);
  }
  const r = done.get(id);
  return r && { re: expandConstant(store, r.re), im: expandConstant(store, r.im) };
}

/**
 * Whether a number-only expression is exactly 0: exact evaluation first, then
 * the exact signs of its rectangular parts. Undefined values are reported as
 * 'undefined'; forms without parts as 'unknown'.
 */
export function complexIsZero(store: ExpressionStore, id: ExprId): boolean | 'undefined' | 'unknown' {
  const e = evaluateExact(store, id, 'complex');
  if (e.kind === 'exact') return e.value.kind === 'rational' && e.value.value.numerator === 0n;
  if (e.kind === 'undefined') return 'undefined';
  const r = rect(store, id);
  if (r === undefined) return 'unknown';
  return sign(store, r.re) === 0 && sign(store, r.im) === 0;
}

/** Certified enclosures of both parts at the given precision (undefined when a part cannot be enclosed). */
export function complexBounds(store: ExpressionStore, id: ExprId, bits: number): { re: Bounds; im: Bounds } | undefined {
  const r = rect(store, id);
  if (r === undefined) return undefined;
  const re = enclose(store, r.re, bits), im = enclose(store, r.im, bits);
  return re.kind === 'bounds' && im.kind === 'bounds' ? { re, im } : undefined;
}

function floorOf(r: Rational): bigint { return r.numerator >= 0n ? r.numerator / r.denominator : -((-r.numerator + r.denominator - 1n) / r.denominator); }

/** ⌊θ/2π⌋ for a real angle θ, with an exact test of θ − 2πm at the candidate boundary (no division by π). */
export function floorTurns(store: ExpressionStore, theta: ExprId): bigint {
  const ctx = store.ctx, twoPi = store.mul(store.integer(2), store.constant('pi'));
  const ratio = store.mul(theta, store.pow(twoPi, store.integer(-1)));
  for (let bits = START_BITS; ; bits *= 2) {
    ctx.tick();
    const e = enclose(store, ratio, bits);
    if (e.kind !== 'bounds') continue;
    const a = floorOf(e.lo), b = floorOf(e.hi);
    if (b - a > 1n) continue;
    if (a === b && !(e.lo.numerator === a * e.lo.denominator)) return a;
    const s = realSign(store, expandConstant(store, store.sub(theta, store.mul(store.integer(b), twoPi))));
    return s >= 0 ? b : b - 1n;
  }
}

/**
 * The integer m with p = a + m·ω exactly, if any: a candidate from enclosures
 * of (p − a)/ω, confirmed by the exact zero test of p − a − m·ω.
 */
export function latticeIndex(store: ExpressionStore, p: ExprId, a: ExprId, omega: ExprId): bigint | undefined {
  const ctx = store.ctx, d = expandConstant(store, store.sub(p, a));
  const parts = rect(store, quotient(store, d, omega));
  if (parts === undefined) return undefined;
  for (let bits = START_BITS; ; bits *= 2) {
    ctx.tick();
    const re = enclose(store, parts.re, bits), im = enclose(store, parts.im, bits);
    if (re.kind === 'unknown' || im.kind === 'unknown') continue;
    if (re.kind !== 'bounds' || im.kind !== 'bounds') return undefined;
    const box = { re, im };
    const lo = floorOf(box.re.lo), hi = floorOf(box.re.hi);
    const imZeroPossible = box.im.lo.numerator <= 0n && box.im.hi.numerator >= 0n;
    if (!imZeroPossible) return undefined;
    if (hi - lo > 1n) continue;
    // Candidates: the integers in [lo, hi + 1]; each decided exactly.
    const candidates = [lo, lo + 1n, hi, hi + 1n].filter((m, i, all) => all.indexOf(m) === i)
      .filter(m => box.re.lo.numerator <= m * box.re.lo.denominator && m * box.re.hi.denominator <= box.re.hi.numerator);
    if (candidates.length > 1) continue;
    if (candidates.length === 0) return undefined;
    const m = candidates[0];
    return complexIsZero(store, store.sub(d, store.mul(store.integer(m), omega))) === true ? m : undefined;
  }
}
