import { igcd, imul, iquot } from '../algebra/integer';
import { rational, type Rational } from '../algebra/rational';
import { expandConstant } from './angles';
import { compareReal, type RealRootOf } from '../algebraic/root-of';
import { asRoot, evaluateExact, type ExactValue } from './evaluate';
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
