import { igcd, imul, iquot } from '../algebra/integer';
import { rAdd, rInverse, rMultiply, rNegate, rational, type Rational } from '../algebra/rational';
import { add as mpolyAdd, fractionOf, multiply, scale as mpolyScale } from '../parameters/mpoly';
import { expandConstant, expandDeep } from './angles';
import { compareReal, type RealRootOf } from '../algebraic/root-of';
import { asRoot, evaluateExact, type ExactValue } from './evaluate';
import { enclose } from './enclosure';
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
 * so the value is zero exactly when ∏ αⱼ^{L·cⱼ} = e^{−L·r}. With every eᵠ written as a power of ε = e^{1/M} and
 * every other atom as its own variable, both sides are rational functions; an identity between them (checked by
 * cross-multiplying) holds for the actual values, so "true" is exact. No identity gives undefined, never "false":
 * the atoms need not be independent. ln a + ln b = 2 with ab = e², or ln(1 − e⁻²) − ln(e⁻²/(1 − e⁻²)) … are found.
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
  // Kernels: every exp of a rational becomes ε^(q·M); any other atom (function, constant, fractional power) its own variable.
  const atoms = new Map<ExprId, string>(), expArgs: Rational[] = [rMultiply(ctx, r, rational(ctx, L))];
  for (const { arg } of logs) for (const n of store.postorder([arg])) {
    const k = store.node(n);
    if (k.kind === 'apply' && k.fn === 'exp' && store.numberValue(k.arg)) expArgs.push(store.numberValue(k.arg) as Rational);
  }
  let M = 1n;
  for (const q of expArgs) M = iquot(ctx, imul(ctx, M, q.denominator), igcd(ctx, M, q.denominator));
  const EPS = 'ε', radicals: { name: string; q: number; power: ExprId }[] = [];
  const kernelized = (e: ExprId): ExprId => {
    const done = new Map<ExprId, ExprId>();
    for (const n of store.postorder([e])) {
      ctx.tick();
      const k = store.node(n), get = (c: ExprId) => done.get(c) as ExprId;
      if (k.kind === 'number') done.set(n, n);
      else if (k.kind === 'add') done.set(n, store.add(...k.args.map(get)));
      else if (k.kind === 'mul') done.set(n, store.mul(...k.args.map(get)));
      else if (k.kind === 'pow' && store.numberValue(k.exponent)?.denominator === 1n) done.set(n, store.pow(get(k.base), k.exponent));
      else if (k.kind === 'apply' && k.fn === 'exp' && store.numberValue(k.arg)) {
        const q = store.numberValue(k.arg) as Rational;
        done.set(n, store.pow(store.symbol(EPS), store.integer(iquot(ctx, imul(ctx, q.numerator, M), q.denominator))));
      } else {
        if (!atoms.has(n)) {
          // A radical atom κ = u^{p/q} (q > 1, p ≥ 1) satisfies κ^q = u^p for the principal root, for any u.
          const ex = k.kind === 'pow' ? store.numberValue(k.exponent) : undefined;
          const base = k.kind === 'pow' && ex && ex.denominator > 1n && ex.numerator > 0n ? kernelized(k.base) : undefined;
          atoms.set(n, `κ${atoms.size + 1}`);
          if (base !== undefined && ex) radicals.push({ name: atoms.get(n) as string, q: Number(ex.denominator), power: store.pow(base, store.integer(ex.numerator)) });
        }
        done.set(n, store.symbol(atoms.get(n) as string));
      }
    }
    return done.get(e) as ExprId;
  };
  const lhs = store.mul(...logs.map(({ c, arg }) => store.pow(kernelized(arg), store.integer(iquot(ctx, imul(ctx, c.numerator, L), c.denominator)))));
  const target = rMultiply(ctx, rNegate(ctx, rMultiply(ctx, r, rational(ctx, L))), rational(ctx, M));
  if (target.denominator !== 1n) return undefined;
  const rhs = store.pow(store.symbol(EPS), store.integer(target.numerator));
  const vars = [EPS, ...atoms.values()];
  const f = fractionOf(store, lhs, vars), g = fractionOf(store, rhs, vars);
  if (!f || !g) return undefined;
  let d = mpolyAdd(ctx, multiply(ctx, f.num, g.den), mpolyScale(ctx, multiply(ctx, g.num, f.den), rational(ctx, -1n)));
  // Reduce modulo the radical relations κ^q = U (U a polynomial in earlier variables), latest atom first:
  // every reduction lowers that atom's degree, so this ends; an identity modulo true relations is an identity.
  for (const rel of [...radicals].reverse()) {
    const U = fractionOf(store, rel.power, vars);
    if (!U || U.den.terms.size !== 1 || ![...U.den.terms.keys()][0].split(',').every(x => x === '0')) continue;
    const Upoly = mpolyScale(ctx, U.num, rInverse(ctx, [...U.den.terms.values()][0]));
    const at = vars.indexOf(rel.name);
    for (;;) {
      ctx.tick();
      const hit = [...d.terms].find(([k]) => Number(k.split(',')[at]) >= rel.q);
      if (!hit) break;
      const [k, c] = hit, e = k.split(',').map(Number);
      e[at] -= rel.q;
      const mono = { vars, terms: new Map([[e.join(','), c]]) };
      const rest = { vars, terms: new Map([...d.terms].filter(([kk]) => kk !== k)) };
      d = mpolyAdd(ctx, rest, multiply(ctx, mono, Upoly));
    }
  }
  return d.terms.size === 0 ? true : undefined;
}
