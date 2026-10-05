import { EquationAlgebraError } from '../core/execution';
import { iroot, ipow } from '../core/algebra/integer';
import { rational, type Rational } from '../core/algebra/rational';
import { complexDecimal, realDecimal, type ComplexRootOf, type RealRootOf } from '../core/algebraic/root-of';
import { complexIsZero } from '../core/periodic/rectangular';
import { enclose } from '../core/representation/enclosure';
import { evaluateExact, imaginaryPart, realPart, type ExactValue } from '../core/representation/evaluate';
import type { ExprId, ExpressionStore } from '../core/representation/expression';
import { realSign } from '../core/representation/real-order';
import { compareValues, type Point, type PointValue } from '../core/representation/solution-set';

/**
 * Display values for Equation answers (EQUATION-PRESENTATION1, part A).
 *
 * - Proven rewrites: a constant subexpression is replaced by a nicer form (k-th root extraction with a rationalized
 *   denominator, odd inverse functions of negative arguments) only when the core proves the two equal; anything
 *   undecided, refused or stopped keeps the original. Subexpressions with free symbols are never rewritten.
 * - Certified decimals: correctly rounded to the requested number of places from exact data or enclosures that
 *   are refined until both ends round alike; a stop gives no decimal, never a wrong digit.
 * - Order: real values ascending, then non-real values by real part, then |imaginary part|, positive first.
 * Typed resource stops are absorbed here (they mean "fall back"); every other error propagates.
 */
const stopped = (e: unknown) => e instanceof EquationAlgebraError && e.code === 'resource';
function attempt<T>(f: () => T, fallback: T): T {
  try { return f(); } catch (e) { if (stopped(e)) return fallback; throw e; }
}

// ---- proven rewrites ----

/** n = s^k·m with m free of k-th powers, by trial division to n^(1/(k+1)) and a final perfect-power test. */
export function extractPower(store: ExpressionStore, n: bigint, k: number): { s: bigint; m: bigint } {
  const ctx = store.ctx;
  let s = 1n, m = 1n, r = n;
  for (let d = 2n; ipow(ctx, d, k + 1) <= r; d += d === 2n ? 1n : 2n) {
    ctx.tick();
    let e = 0;
    while (r % d === 0n) { r /= d; e++; }
    if (e) { s *= ipow(ctx, d, Math.floor(e / k)); m *= ipow(ctx, d, e % k); }
  }
  // Every remaining prime exceeds r^(1/(k+1)), so r has at most k of them: a k-th power part means r = t^k.
  const t = iroot(ctx, r, k);
  if (r > 1n && ipow(ctx, t, k) === r) s *= t; else m *= r;
  return { s, m };
}

/** q^(±1/k) for a positive rational q as (s/b)·m^(1/k), or undefined when nothing changes. */
function rootRewrite(store: ExpressionStore, q: Rational, p: bigint, k: number): ExprId | undefined {
  const ctx = store.ctx;
  // q^(1/k) = (a·b^(k−1))^(1/k) / b;  q^(−1/k) = (b·a^(k−1))^(1/k) / a.
  const [a, b] = p > 0n ? [q.numerator, q.denominator] : [q.denominator, q.numerator];
  const { s, m } = extractPower(store, a * ipow(ctx, b, k - 1), k);
  if (s === 1n && b === 1n) return undefined;
  const radical = m === 1n ? store.integer(1) : store.pow(store.integer(m), store.fraction(1, k));
  return store.mul(store.number(rational(ctx, s, b)), radical);
}

const ODD = new Set(['asin', 'atan', 'sin', 'tan']);

/** Whether a = b is proven by the core (structurally, exactly, or by a certified zero test). */
export function provenEqual(store: ExpressionStore, a: ExprId, b: ExprId, domain: 'real' | 'complex'): boolean {
  return attempt(() => {
    const d = store.sub(a, b);
    const n = store.node(d);
    if (n.kind === 'number') return n.value.numerator === 0n;
    const e = evaluateExact(store, d, domain);
    if (e.kind === 'exact') return e.value.kind === 'rational' && e.value.value.numerator === 0n;
    if (e.kind !== 'not-exact') return false;
    if (domain === 'real') return realSign(store, d) === 0;
    return complexIsZero(store, d) === true;
  }, false);
}

/**
 * The display form of `id`: constant subexpressions rewritten where proven equal. `binders` maps binder symbols to
 * their algebraic values, so constants may mention them.
 */
export function displayForm(store: ExpressionStore, id: ExprId, binders: ReadonlyMap<string, ExprId>, domain: 'real' | 'complex'): ExprId {
  const out = new Map<ExprId, ExprId>();
  const constant = (n: ExprId) => store.freeSymbols(n).every(s => binders.has(s));
  const valued = (n: ExprId) => (binders.size ? store.substitute(n, binders) : n);
  for (const n of store.postorder([id])) {
    const node = store.node(n), m = (c: ExprId) => out.get(c) as ExprId;
    let rebuilt: ExprId;
    switch (node.kind) {
      case 'add': rebuilt = store.add(...node.args.map(m)); break;
      case 'mul': rebuilt = store.mul(...node.args.map(m)); break;
      case 'pow': rebuilt = store.pow(m(node.base), m(node.exponent)); break;
      case 'apply': rebuilt = store.apply(node.fn, m(node.arg)); break;
      default: rebuilt = n;
    }
    let candidate: ExprId | undefined;
    const r = store.node(rebuilt);
    if (r.kind === 'pow') {
      const base = store.node(r.base), e = store.node(r.exponent);
      if (base.kind === 'number' && base.value.numerator > 0n && e.kind === 'number' && (e.value.numerator === 1n || e.value.numerator === -1n)
        && e.value.denominator > 1n && e.value.denominator <= 64n) {
        candidate = attempt(() => rootRewrite(store, base.value, e.value.numerator, Number(e.value.denominator)), undefined);
      }
    } else if (r.kind === 'apply' && ODD.has(r.fn)) {
      const arg = store.node(r.arg);
      const lead = arg.kind === 'number' ? arg.value : arg.kind === 'mul' ? (store.node(arg.args[0]).kind === 'number' ? (store.node(arg.args[0]) as { value: Rational }).value : undefined) : undefined;
      if (lead && lead.numerator < 0n) candidate = store.neg(store.apply(r.fn, store.neg(r.arg)));
    }
    if (candidate !== undefined && candidate !== rebuilt && constant(rebuilt) && provenEqual(store, valued(candidate), valued(rebuilt), domain)) rebuilt = candidate;
    out.set(n, rebuilt);
  }
  return out.get(id) as ExprId;
}

// ---- certified decimals ----

export interface Decimal { readonly re: string; readonly im?: string }

/** x rounded to `digits` places as text, ties away from zero (irrational values never tie). */
function rationalDecimal(q: Rational, digits: number): string {
  const scale = 10n ** BigInt(digits), negative = q.numerator < 0n;
  const n = negative ? -q.numerator : q.numerator;
  const v = (2n * n * scale + q.denominator) / (2n * q.denominator);
  const abs = v.toString().padStart(digits + 1, '0');
  const text = digits === 0 ? abs : `${abs.slice(0, -digits)}.${abs.slice(-digits)}`;
  return negative && v !== 0n ? `-${text}` : text;
}

function exactDecimal(store: ExpressionStore, v: ExactValue, digits: number): Decimal {
  const ctx = store.ctx;
  if (v.kind === 'rational') return { re: rationalDecimal(v.value, digits) };
  const root = store.roots.canonical(ctx, v.root).root;
  if (root.kind === 'real') return { re: realDecimal(ctx, root as RealRootOf, digits) };
  const c = complexDecimal(ctx, root as ComplexRootOf, digits);
  return { re: c.re, im: c.im };
}

/** The certified decimal of a value, or undefined (not a number, not real-enclosable, or stopped). */
export function decimalOf(store: ExpressionStore, v: PointValue, digits: number, domain: 'real' | 'complex'): Decimal | undefined {
  return attempt((): Decimal | undefined => {
    if (v.kind === 'rational') return { re: rationalDecimal(v.value, digits) };
    if (v.kind === 'algebraic') return exactDecimal(store, { kind: 'algebraic', root: v.root }, digits);
    if (v.kind === 'root') return undefined;
    if (store.freeSymbols(v.id).length) return undefined;
    const exact = evaluateExact(store, v.id, domain);
    if (exact.kind === 'exact') return exactDecimal(store, exact.value, digits);
    if (exact.kind !== 'not-exact' || evaluateExact(store, v.id, 'real').kind === 'undefined') return undefined;
    if (domain === 'complex' && evaluateExact(store, v.id, 'real').kind !== 'not-exact') return undefined;
    for (let bits = 64; ; bits *= 2) {
      store.ctx.tick();
      const b = enclose(store, v.id, bits);
      if (b.kind === 'undefined') return undefined;
      if (b.kind === 'bounds') {
        const lo = rationalDecimal(b.lo, digits), hi = rationalDecimal(b.hi, digits);
        if (lo === hi) return { re: lo };
      }
    }
  }, undefined);
}

// ---- order ----

type Key = { real: true; v: PointValue } | { real: false; re: ExactValue; im: ExactValue };

function keyOf(store: ExpressionStore, v: PointValue, domain: 'real' | 'complex'): Key | undefined {
  return attempt((): Key | undefined => {
    // A parametric indexed root without bounds is already in index order; it keeps its canonical place.
    if (v.kind === 'root') return v.lo ? { real: true, v } : undefined;
    if (v.kind === 'rational') return { real: true, v };
    const exact: ExactValue | undefined = v.kind === 'algebraic' ? { kind: 'algebraic', root: v.root }
      : store.freeSymbols(v.id).length ? undefined : (() => { const e = evaluateExact(store, v.id, domain); return e.kind === 'exact' ? e.value : undefined; })();
    if (exact === undefined) return v.kind === 'expression' && domain === 'real' && !store.freeSymbols(v.id).length ? { real: true, v } : undefined;
    if (exact.kind === 'rational' || exact.root.kind === 'real') return { real: true, v };
    const ctx = store.ctx;
    return { real: false, re: realPart(ctx, exact), im: imaginaryPart(ctx, exact) };
  }, undefined);
}

function compareKeys(store: ExpressionStore, a: Key, b: Key): number {
  if (a.real !== b.real) return a.real ? -1 : 1;
  if (a.real && b.real) return compareValues(store, a.v, b.v);
  const x = a as Extract<Key, { real: false }>, y = b as Extract<Key, { real: false }>;
  const zero: ExactValue = { kind: 'rational', value: rational(store.ctx, 0n) };
  const negative = (v: ExactValue) => compareValues(store, v, zero) < 0;
  const magnitude = (v: ExactValue) => (negative(v) ? negated(store, v) : v);
  // Real part, then |imaginary part|, then the positive imaginary part first (conjugates sit together).
  return compareValues(store, x.re, y.re) || compareValues(store, magnitude(x.im), magnitude(y.im))
    || Number(negative(x.im)) - Number(negative(y.im));
}

function negated(store: ExpressionStore, v: ExactValue): ExactValue {
  if (v.kind === 'rational') return { kind: 'rational', value: rational(store.ctx, -v.value.numerator, v.value.denominator) };
  const e = evaluateExact(store, store.neg(store.algebraic(v.root)), 'complex');
  return e.kind === 'exact' ? e.value : v;
}

/**
 * Points in display order (lexicographic over coordinates). Values the core cannot place keep their canonical
 * order after the ordered ones; an undecided comparison keeps both in canonical order.
 */
export function orderPoints(store: ExpressionStore, points: readonly Point[], domain: 'real' | 'complex'): Point[] {
  const keyed = points.map((p, i) => ({ p, i, keys: p.map(v => keyOf(store, v, domain)) }));
  const placed = keyed.filter(k => k.keys.every(x => x !== undefined)), rest = keyed.filter(k => k.keys.some(x => x === undefined));
  const compare = (a: typeof keyed[number], b: typeof keyed[number]) => {
    try {
      for (let j = 0; j < a.keys.length; j++) {
        const c = compareKeys(store, a.keys[j] as Key, b.keys[j] as Key);
        if (c) return c;
      }
    } catch (e) {
      // Ordering is display only: a stop or an undecidable comparison keeps the canonical order.
      if (!(e instanceof EquationAlgebraError)) throw e;
    }
    return a.i - b.i;
  };
  return [...placed.sort(compare), ...rest].map(k => k.p);
}
