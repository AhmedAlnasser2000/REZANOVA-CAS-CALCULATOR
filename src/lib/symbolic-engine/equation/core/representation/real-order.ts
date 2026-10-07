import { demand, type ExecutionContext } from '../execution';
import { rational } from '../algebra/rational';
import { compareRational } from '../algebraic/real-roots';
import { compareReal, type RealRootOf } from '../algebraic/root-of';
import { enclose, minusInverseE } from './enclosure';
import { angleLinearIsZero } from './angles';
import { algebraicLogIsZero } from './log-zero';
import { asRoot, evaluateExact, type ExactValue } from './evaluate';
import { ISOLATED_VARIABLE, type ExprId, type ExpressionStore } from './expression';

/**
 * Exact signs and order of real number-only expressions.
 *
 * Exact evaluation decides algebraic values. Otherwise certified enclosures are
 * refined (precision doubling) until 0 is excluded, which terminates for every
 * nonzero value and runs only under the budget. Callers must ask only about
 * values that are provably nonzero by structure or by transcendence theorems
 * (Lindemann–Weierstrass, Gelfond–Schneider, Baker); a zero that is not
 * recognized exactly would refine until the typed `resource` stop.
 */
export const START_BITS = 32;

export function exactSign(ctx: ExecutionContext, v: ExactValue): -1 | 0 | 1 {
  if (v.kind === 'rational') return v.value.numerator === 0n ? 0 : v.value.numerator < 0n ? -1 : 1;
  demand(v.root.kind === 'real', 'invalid-input', 'sign of a non-real value');
  return compareReal(ctx, v.root, asRoot(ctx, { kind: 'rational', value: rational(ctx, 0n) }) as RealRootOf) as -1 | 1;
}

/** Signs are pure, exact facts of an expression: kept per store. */
const SIGNS = new WeakMap<ExpressionStore, Map<ExprId, -1 | 0 | 1>>();

export function realSign(store: ExpressionStore, id: ExprId): -1 | 0 | 1 {
  let known = SIGNS.get(store);
  if (!known) { known = new Map(); SIGNS.set(store, known); }
  const cached = known.get(id);
  if (cached !== undefined) return cached;
  const s = computeSign(store, id);
  known.set(id, s);
  return s;
}

/**
 * The sign of c·z + t where z is an isolated zero (certified numerics) and t a number-only value without
 * isolated zeros, decided exactly: compare −t/c with the isolating interval, and inside it the sign of f(−t/c)
 * against f's sign at the low end (f is strictly monotone there). Undefined when `id` is not of that form.
 */
function isolatedSign(store: ExpressionStore, id: ExprId): -1 | 0 | 1 | undefined {
  const isolated = (e: ExprId) => store.postorder([e]).some(n => store.node(n).kind === 'isolated');
  if (!isolated(id)) return undefined;
  const node = store.node(id), terms = node.kind === 'add' ? node.args : [id];
  const holders = terms.filter(isolated);
  if (holders.length !== 1) return undefined;
  const h = store.node(holders[0]);
  const [c, z] = h.kind === 'isolated' ? [store.integer(1), holders[0]]
    : h.kind === 'mul' && h.args.length === 2 && store.numberValue(h.args[0]) && store.node(h.args[1]).kind === 'isolated' ? [h.args[0], h.args[1]] : [undefined, undefined];
  if (c === undefined || z === undefined) return undefined;
  const iso = store.node(z) as Extract<ReturnType<ExpressionStore['node']>, { kind: 'isolated' }>;
  const cs = Math.sign(Number((store.numberValue(c) as { numerator: bigint }).numerator)) as -1 | 1;
  const point = store.div(store.neg(store.add(...terms.filter(t => t !== holders[0]))), c);
  // z vs the point p: z > p ⇔ c·z + t has the sign of c.
  let zVsP: -1 | 0 | 1;
  if (realSign(store, store.sub(store.number(iso.lo), point)) >= 0) zVsP = 1;
  else if (realSign(store, store.sub(store.number(iso.hi), point)) <= 0) zVsP = -1;
  else {
    const s = realSign(store, store.substitute(iso.expr, new Map([[ISOLATED_VARIABLE, point]])));
    zVsP = s === 0 ? 0 : s === iso.loSign ? 1 : -1;
  }
  return (zVsP * cs) as -1 | 0 | 1;
}

function computeSign(store: ExpressionStore, id: ExprId): -1 | 0 | 1 {
  const ctx = store.ctx;
  const isolatedExact = isolatedSign(store, id);
  if (isolatedExact !== undefined) return isolatedExact;
  const e = evaluateExact(store, id, 'real');
  if (e.kind === 'exact') return exactSign(ctx, e.value);
  demand(e.kind === 'not-exact' && e.reason !== 'free-symbol', 'invalid-input', `sign of an undefined or symbolic value: ${'detail' in e ? e.detail : ''}`);
  // Exact zeros that exact evaluation cannot see (π-multiples and arcs of algebraic numbers) are recognized
  // before refining, unless a first enclosure already excludes 0.
  let tested = false;
  for (let bits = START_BITS; ; bits *= 2) {
    ctx.tick();
    if (bits > START_BITS && !tested) {
      tested = true;
      if (angleLinearIsZero(store, id) === true || algebraicLogIsZero(store, id) === true) return 0;
    }
    const b = enclose(store, id, bits);
    if (b.kind === 'bounds') {
      if (b.lo.numerator > 0n) return 1;
      if (b.hi.numerator < 0n) return -1;
      continue;
    }
    if (b.kind === 'unknown') continue;
    return demand(false, 'invalid-input', `cannot enclose: ${b.detail}`) as never;
  }
}

export function realCompare(store: ExpressionStore, a: ExprId, b: ExprId): -1 | 0 | 1 {
  return a === b ? 0 : realSign(store, store.sub(a, b));
}

/** Position of a real value relative to −1/e (never equal for algebraic values, by Lindemann–Weierstrass). */
export function compareWithMinusInverseE(store: ExpressionStore, id: ExprId): -1 | 1 {
  const ctx = store.ctx;
  for (let bits = START_BITS; ; bits *= 2) {
    ctx.tick();
    const b = enclose(store, id, bits), t = minusInverseE(ctx, bits);
    if (b.kind === 'bounds') {
      if (compareRational(ctx, b.hi, t.lo) < 0) return -1;
      if (compareRational(ctx, t.hi, b.lo) < 0) return 1;
      continue;
    }
    if (b.kind === 'unknown') continue;
    return demand(false, 'invalid-input', `cannot enclose: ${b.detail}`) as never;
  }
}
