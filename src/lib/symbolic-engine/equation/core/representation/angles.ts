import { igcd } from '../algebra/integer';
import { rAdd, rational, rMultiply, type Rational } from '../algebra/rational';
import { cyclotomic, eulerPhi } from '../algebraic/cyclotomic';
import { refineComplex, type ComplexRootOf } from '../algebraic/root-of';
import { enclose, piMultipleBounds } from './enclosure';
import { addValues, diskMeetsBox, evaluateExact, unitValue, type ExactValue } from './evaluate';
import type { ExprId, ExpressionStore } from './expression';

/**
 * Exact reasoning about real angles θ = a + Σ nⱼ·arcⱼ(cⱼ) + q·π (a and cⱼ real
 * algebraic, arcs asin/acos/atan, nⱼ integers, q rational) through the unit
 * point W = e^{iθ} of the angle part, which is algebraic.
 *
 * - Zero test: a ≠ 0 makes θ ≠ 0 (if a = −(angle part), e^{−ia} = W would be
 *   algebraic, contradicting Lindemann–Weierstrass); with a = 0, θ = 0 exactly
 *   when W = 1 and an enclosure puts θ within π of 0.
 * - Rational multiples of π: W is a root of unity exactly when its minimal
 *   polynomial is a cyclotomic Φₙ (φ(n) = deg W, so n ≤ 2·deg²).
 */
const q = (r: Rational): ExactValue => ({ kind: 'rational', value: r });

function exactOrUndefined(store: ExpressionStore, id: ExprId): ExactValue | undefined {
  const e = evaluateExact(store, id, 'real');
  return e.kind === 'exact' ? e.value : undefined;
}

const unitCache = new WeakMap<ExpressionStore, Map<ExprId, ExactValue | undefined>>();

/** e^{iθ} exactly, for an angle with an algebraic unit point (memoized per store: ids are immutable). */
export function unitPoint(store: ExpressionStore, theta: ExprId): ExactValue | undefined {
  let cache = unitCache.get(store);
  if (!cache) { cache = new Map(); unitCache.set(store, cache); }
  if (cache.has(theta)) return cache.get(theta);
  const w = unitValue(store, theta, id => exactOrUndefined(store, id));
  cache.set(theta, w);
  return w;
}

function sameCoefficients(a: readonly bigint[], b: readonly bigint[]): boolean {
  return a.length === b.length && (a.every((v, i) => v === b[i]) || a.every((v, i) => v === -b[i]));
}

/** t with W = e^{2πi·t}, t ∈ [0, 1), when W is a root of unity; undefined otherwise. */
export function rootOfUnityTurns(store: ExpressionStore, w: ExactValue): Rational | undefined {
  const ctx = store.ctx;
  if (w.kind === 'rational') {
    const v = w.value;
    return v.denominator !== 1n || (v.numerator !== 1n && v.numerator !== -1n) ? undefined : rational(ctx, v.numerator === 1n ? 0n : 1n, v.numerator === 1n ? 1n : 2n);
  }
  if (w.root.kind !== 'complex') return undefined;
  const c = w.root.poly.coefficients, d = c.length - 1;
  // Cyclotomic polynomials are monic, with constant term 1 and palindromic for n > 2.
  if ((c[d] !== 1n && c[d] !== -1n) || (c[0] !== 1n && c[0] !== -1n) || !c.every((v, i) => v === c[d - i] || v === -c[d - i])) return undefined;
  const D = BigInt(d);
  for (let n = 3n; n <= 2n * D * D + 2n; n++) {
    ctx.tick();
    if (eulerPhi(ctx, n) !== D || !sameCoefficients(c, cyclotomic(ctx, n).coefficients)) continue;
    // W is a primitive n-th root: find the exponent a (gcd(a, n) = 1) whose point meets W's disk.
    let root = w.root as ComplexRootOf;
    const exponents: bigint[] = [];
    for (let a = 1n; a < n; a++) if (igcd(ctx, a, n) === 1n) exponents.push(a);
    for (let bits = 32; ; bits *= 2) {
      const hits = exponents.filter(a => {
        const turn = rational(ctx, 2n * a, n);
        const re = piMultipleBounds(ctx, 'cos', turn, bits), im = piMultipleBounds(ctx, 'sin', turn, bits);
        return diskMeetsBox(ctx, root, re, im);
      });
      if (hits.length === 1) return rational(ctx, hits[0], n);
      root = refineComplex(ctx, root, rational(ctx, 1n, 1n << BigInt(bits)));
    }
  }
  return undefined;
}

/** The integer m with θ ∈ (m·2π − π, m·2π + π], from enclosures (θ is never an odd multiple of π here). */
function turnsNear(store: ExpressionStore, theta: ExprId): bigint {
  const ctx = store.ctx;
  const ratio = store.div(theta, store.mul(store.integer(2), store.constant('pi')));
  for (let bits = 32; ; bits *= 2) {
    ctx.tick();
    const e = enclose(store, ratio, bits);
    if (e.kind !== 'bounds') continue;
    const half = rational(ctx, 1n, 2n);
    const lo = rAdd(ctx, e.lo, half), hi = rAdd(ctx, e.hi, half);
    const floorOf = (r: Rational) => (r.numerator >= 0n ? r.numerator / r.denominator : -((-r.numerator + r.denominator - 1n) / r.denominator));
    if (floorOf(lo) === floorOf(hi)) return floorOf(lo);
  }
}

/**
 * θ as an exact rational multiple of π when its unit point is a root of unity
 * (asin(√3/2) → π/3, 2·atan(2 + √3) → 5π/6); undefined otherwise.
 */
export function piMultiple(store: ExpressionStore, theta: ExprId): Rational | undefined {
  const ctx = store.ctx, w = unitPoint(store, theta);
  if (w === undefined) return undefined;
  const t = rootOfUnityTurns(store, w);
  if (t === undefined) return undefined;
  // θ = 2π·(t + m) with t ∈ [0, 1): choose m from an enclosure of θ/2π − t.
  const shifted = store.sub(theta, store.mul(store.number(rMultiply(ctx, t, rational(ctx, 2n))), store.constant('pi')));
  const m = turnsNear(store, shifted);
  return rMultiply(ctx, rAdd(ctx, t, rational(ctx, m)), rational(ctx, 2n));
}

/** The canonical closed form of an angle: q·π when it is a rational multiple of π, else the angle itself. */
export function canonicalAngle(store: ExpressionStore, theta: ExprId): ExprId {
  const m = piMultiple(store, theta);
  return m === undefined ? theta : store.mul(store.number(m), store.constant('pi'));
}

/** Structurally an angle with an algebraic unit point: π-multiples, integer multiples, sums, arcs of real algebraic numbers. */
function isAngleForm(store: ExpressionStore, id: ExprId): boolean {
  const stack = [id];
  while (stack.length) {
    store.ctx.tick();
    const n = store.node(stack.pop() as ExprId);
    if (n.kind === 'constant' && n.name === 'pi') continue;
    if (n.kind === 'add') { stack.push(...n.args); continue; }
    if (n.kind === 'mul' && n.args.length === 2) {
      const c = store.numberValue(n.args[0]), rest = store.node(n.args[1]);
      if (c && rest.kind === 'constant' && rest.name === 'pi') continue;
      if (c && c.denominator === 1n) { stack.push(n.args[1]); continue; }
      return false;
    }
    if (n.kind === 'apply' && (n.fn === 'asin' || n.fn === 'acos' || n.fn === 'atan')) {
      const u = exactOrUndefined(store, n.arg);
      if (u !== undefined && (u.kind === 'rational' || u.root.kind === 'real')) continue;
    }
    return false;
  }
  return true;
}

/**
 * Exact zero test of a + θ with a real algebraic and θ an angle form;
 * undefined when the value is not of that form (then only refinement decides).
 */
const zeroCache = new WeakMap<ExpressionStore, Map<ExprId, boolean | undefined>>();

export function angleLinearIsZero(store: ExpressionStore, id: ExprId): boolean | undefined {
  let cache = zeroCache.get(store);
  if (!cache) { cache = new Map(); zeroCache.set(store, cache); }
  if (cache.has(id)) return cache.get(id);
  const z = angleZero(store, id);
  cache.set(id, z);
  return z;
}

/**
 * A number-only expression with products distributed over sums (π·(a − b)/π
 * → a − b), so cancellations become visible to the canonical builder. Function
 * arguments are left as they are.
 */
export function expandConstant(store: ExpressionStore, id: ExprId): ExprId {
  const done = new Map<ExprId, ExprId>();
  for (const n of store.postorder([id])) {
    store.ctx.tick();
    const node = store.node(n), get = (c: ExprId) => done.get(c) as ExprId;
    if (node.kind === 'add') { done.set(n, store.add(...node.args.map(get))); continue; }
    if (node.kind !== 'mul') { done.set(n, n); continue; }
    let terms: ExprId[] = [store.integer(1)];
    for (const a of node.args.map(get)) {
      const f = store.node(a), parts = f.kind === 'add' ? f.args : [a];
      store.ctx.allocate(terms.length * parts.length);
      terms = terms.flatMap(t => parts.map(p => store.mul(t, p)));
    }
    done.set(n, store.add(...terms));
  }
  return done.get(id) as ExprId;
}

function angleZero(store: ExpressionStore, raw: ExprId): boolean | undefined {
  const id = expandConstant(store, raw), ctx = store.ctx, node = store.node(id);
  if (store.numberValue(id)) return store.numberValue(id)?.numerator === 0n;
  const terms = node.kind === 'add' ? node.args : [id];
  let algebraic: ExactValue = q(rational(ctx, 0n));
  const angleTerms: ExprId[] = [];
  for (const t of terms) {
    const v = exactOrUndefined(store, t);
    if (v !== undefined) { algebraic = addValues(ctx, algebraic, v); continue; }
    if (!isAngleForm(store, t)) return undefined;
    angleTerms.push(t);
  }
  if (angleTerms.length === 0) return algebraic.kind === 'rational' && algebraic.value.numerator === 0n;
  if (!(algebraic.kind === 'rational' && algebraic.value.numerator === 0n)) return false;
  const angle = store.add(...angleTerms), w = unitPoint(store, angle);
  if (w === undefined) return undefined;
  if (!(w.kind === 'rational' && w.value.numerator === 1n && w.value.denominator === 1n)) return false;
  return turnsNear(store, angle) === 0n;
}
