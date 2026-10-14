import { igcd, imul, iquot } from '../algebra/integer';
import { rAdd, rMultiply, rNegate, rational, type Rational } from '../algebra/rational';
import { expandConstant, expandDeep } from './angles';
import { compareReal, type RealRootOf } from '../algebraic/root-of';
import { asRoot, evaluateExact, type ExactValue } from './evaluate';
import { enclose } from './enclosure';
import { kernelIdentityHolds } from './kernel-identity';
import type { ExprId, ExpressionStore } from './expression';

/**
 * Exact zero test of a + Σ cⱼ·ln αⱼ with a real algebraic, rational cⱼ and real
 * algebraic αⱼ > 0 (slice 5; extends the gate-6 test for rational αⱼ):
 * - a ≠ 0: never zero — e^{−a} is transcendental (Lindemann–Weierstrass) while
 *   ∏ αⱼ^{cⱼ} is algebraic;
 * - a = 0: zero exactly when ∏ αⱼ^{L·cⱼ} = 1 (L the lcm of the denominators),
 *   since ln is injective on the positive reals — decided by exact algebraic
 *   arithmetic.
 * Undefined when the value is not of that form.
 */
const cache = new WeakMap<ExpressionStore, Map<ExprId, boolean | undefined>>();

export function algebraicLogIsZero(store: ExpressionStore, id: ExprId): boolean | undefined {
  let c = cache.get(store);
  if (!c) { c = new Map(); cache.set(store, c); }
  if (c.has(id)) return c.get(id);
  const z = test(store, id);
  c.set(id, z);
  return z;
}

const isZero = (v: ExactValue) => v.kind === 'rational' && v.value.numerator === 0n;
const isOne = (v: ExactValue) => v.kind === 'rational' && v.value.numerator === 1n && v.value.denominator === 1n;

function test(store: ExpressionStore, raw: ExprId): boolean | undefined {
  const ctx = store.ctx, id = expandConstant(store, raw), node = store.node(id);
  const exact = (e: ExprId) => { const v = evaluateExact(store, e, 'real'); return v.kind === 'exact' ? v.value : undefined; };
  const algebraic: ExprId[] = [], logs: { c: Rational; arg: ExprId }[] = [];
  for (const t of node.kind === 'add' ? node.args : [id]) {
    ctx.tick();
    if (exact(t) !== undefined) { algebraic.push(t); continue; }
    const tn = store.node(t);
    const [coefficient, rest] = tn.kind === 'mul' && tn.args.length === 2 && store.numberValue(tn.args[0]) ? [store.numberValue(tn.args[0]) as Rational, tn.args[1]] : [undefined, t];
    const r = store.node(rest);
    if (r.kind !== 'apply' || r.fn !== 'log') return undefined;
    const v = exact(r.arg);
    const positive = v !== undefined && (v.kind === 'rational' ? v.value.numerator > 0n : v.root.kind === 'real' && compareReal(ctx, v.root, asRoot(ctx, { kind: 'rational', value: rational(ctx, 0n) }) as RealRootOf) > 0);
    if (!positive) return undefined;
    logs.push({ c: coefficient ?? rational(ctx, 1n), arg: r.arg });
  }
  if (logs.length === 0) return undefined;
  const a = exact(store.add(...algebraic, store.integer(0)));
  if (a === undefined) return undefined;
  if (!isZero(a)) return false;
  let L = 1n;
  for (const { c } of logs) L = iquot(ctx, imul(ctx, L, c.denominator), igcd(ctx, L, c.denominator));
  const product = store.mul(...logs.map(({ c, arg }) => store.pow(arg, store.integer(iquot(ctx, imul(ctx, c.numerator, L), c.denominator)))));
  const p = exact(product);
  return p === undefined ? undefined : isOne(p);
}

/**
 * Exact zero test of r + Σ cⱼ·ln αⱼ with rational r and cⱼ and real αⱼ > 0 given by any closed forms built from
 * numbers, sums, products and integer powers of kernels (exponentials eᵠ with rational q, and other atoms). On the
 * positive reals the logs combine, ln ∏ αⱼ^{L·cⱼ} = −L·r (L the lcm of the cⱼ denominators), and ln is injective,
 * so the value is zero exactly when ∏ αⱼ^{L·cⱼ} = e^{−L·r}, decided as a kernel identity (kernel-identity.ts):
 * "true" is exact; no identity gives undefined, never "false". ln a + ln b = 2 with ab = e², or ln(1 − e⁻²) − ln(e⁻²/(1 − e⁻²)) … are found.
 */
export function logCombinationIsZero(store: ExpressionStore, raw: ExprId, positive: (id: ExprId) => boolean): boolean | undefined {
  const ctx = store.ctx, id = expandDeep(store, raw), node = store.node(id);
  let r = rational(ctx, 0n);
  const logs: { c: Rational; arg: ExprId }[] = [];
  for (const t of node.kind === 'add' ? node.args : [id]) {
    ctx.tick();
    const v = store.numberValue(t);
    if (v) { r = rAdd(ctx, r, v); continue; }
    const tn = store.node(t);
    const [coefficient, inner] = tn.kind === 'mul' && tn.args.length === 2 && store.numberValue(tn.args[0]) ? [store.numberValue(tn.args[0]) as Rational, tn.args[1]] : [rational(ctx, 1n), t];
    const a = store.node(inner);
    if (!(a.kind === 'apply' && a.fn === 'log' && store.freeSymbols(a.arg).length === 0 && enclose(store, a.arg, 64).kind === 'bounds' && positive(a.arg))) return undefined;
    logs.push({ c: coefficient, arg: a.arg });
  }
  if (logs.length === 0) return undefined;
  let L = 1n;
  for (const { c } of logs) L = iquot(ctx, imul(ctx, L, c.denominator), igcd(ctx, L, c.denominator));
  const lhs = store.mul(...logs.map(({ c, arg }) => store.pow(arg, store.integer(iquot(ctx, imul(ctx, c.numerator, L), c.denominator)))));
  return kernelIdentityHolds(store, lhs, store.exp(store.number(rMultiply(ctx, rNegate(ctx, r), rational(ctx, L)))));
}
