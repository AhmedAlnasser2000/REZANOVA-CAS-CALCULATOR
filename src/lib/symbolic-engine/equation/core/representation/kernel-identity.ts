import { igcd, imul, iquot } from '../algebra/integer';
import { rInverse, rational, type Rational } from '../algebra/rational';
import { divide, fromMPoly, gcd, toExpression as rpolyExpression, type RPoly } from '../cad/recursive';
import { add as mpolyAdd, coefficientsIn, constant as mpolyConstant, fractionOf, multiply, scale as mpolyScale, toExpression as mpolyExpression, type MPoly } from '../parameters/mpoly';
import type { ExprId, ExpressionStore } from './expression';

/**
 * Exact identity test a = b for number-only values built from numbers, sums, products and integer powers of
 * kernels: every exponential eᵠ of a rational q becomes a power of ε = e^{1/M}, and every other atom (a function
 * value, a constant, a fractional power) its own variable κᵢ. Both sides are then rational functions; their
 * difference's numerator is reduced modulo the radical relations κ^q = u^p of the principal roots κ = u^{p/q}
 * (true for any u), latest atom first, so every step lowers that atom's degree and the reduction ends.
 *
 * A zero remainder is an identity between the actual values, so "true" is exact: the reduced numerator vanishes
 * at the actual kernel values, and the common denominator divides a product of denominators of a and b, which are
 * defined, so it does not vanish there. Anything else is undefined, never "false": the atoms need not be
 * independent.
 */
export function kernelIdentityHolds(store: ExpressionStore, a: ExprId, b: ExprId): boolean | undefined {
  const k = kernelize(store, [a, b]);
  const f = fractionOf(store, k.ids[0], k.vars), g = fractionOf(store, k.ids[1], k.vars);
  if (!f || !g) return undefined;
  const ctx = store.ctx;
  const d = k.reduce(mpolyAdd(ctx, multiply(ctx, f.num, g.den), mpolyScale(ctx, multiply(ctx, g.num, f.den), rational(ctx, -1n))));
  return d.terms.size === 0 ? true : undefined;
}

/**
 * The same value as a reduced rational function of its kernels, rebuilt with the kernels put back: numerator and
 * denominator reduced modulo the radical relations ((½ + ½√u)² − ½√u → ¼ + ¼u), then divided by their gcd in
 * ℤ[kernels]; a zero numerator gives 0. With a `nonzero` oracle, denominators are first rationalized over the
 * square-root kernels (i is the kernel √−1), so values of one field get one form: ((c + κ)/2 − 2)⁻¹ has no κ left.
 * Exact for a defined value by the argument above; undefined when the value is not a rational function of kernels.
 */
export function kernelNormalForm(store: ExpressionStore, e: ExprId, nonzero?: (id: ExprId) => boolean): ExprId | undefined {
  const ctx = store.ctx, k = kernelize(store, [e]), f = fractionOf(store, k.ids[0], k.vars);
  if (!f) return undefined;
  let num = k.reduce(f.num), den = k.reduce(f.den);
  // Rationalize: (a + b·κ)⁻¹ = (a − b·κ)/(a² − b²·u) for a square-root kernel κ = √u, latest kernel first (so a and
  // b are free of later ones), when the cofactor a − b·κ is certified nonzero (otherwise the value would change).
  for (const { at, q } of nonzero ? k.relations : []) {
    const parts = coefficientsIn(den, at);
    if (q !== 2 || parts.length !== 2) continue;
    const cofactor = mpolyAdd(ctx, parts[0], mpolyScale(ctx, multiply(ctx, parts[1], monomial(ctx, k.vars, at, 1)), rational(ctx, -1n)));
    if (!(nonzero as (id: ExprId) => boolean)(store.substitute(mpolyExpression(store, cofactor), k.back))) continue;
    num = k.reduce(multiply(ctx, num, cofactor));
    den = k.reduce(multiply(ctx, den, cofactor));
  }
  if (den.terms.size === 0) return undefined;
  if (num.terms.size === 0) return store.integer(0);
  // Cancel the gcd in ℤ[kernels]: num/den = (sD/sN)·N/D with N = sN·num and D = sD·den integral.
  const n = k.vars.length, levels = k.vars.map((_, i) => i + 1);
  const scaleOf = (p: MPoly) => { let s = 1n; for (const c of p.terms.values()) s = iquot(ctx, imul(ctx, s, c.denominator), igcd(ctx, s, c.denominator)); return s; };
  const N = fromMPoly(ctx, num, levels, n), D = fromMPoly(ctx, den, levels, n), G = gcd(ctx, N, D, n);
  const back = (p: RPoly) => store.substitute(rpolyExpression(store, p, n, k.vars), k.back);
  const factor = store.number(rational(ctx, scaleOf(den), scaleOf(num)));
  return store.mul(factor, back(divide(ctx, N, G, n)), store.pow(back(divide(ctx, D, G, n)), store.integer(-1)));
}

interface Kernels {
  readonly ids: readonly ExprId[];
  readonly vars: readonly string[];
  /** Kernel name → its value (ε → e^{1/M}, κᵢ → the atom). */
  readonly back: ReadonlyMap<string, ExprId>;
  /** The radical relations κ^q = U, latest kernel first (`at` is κ's position in `vars`). */
  readonly relations: readonly { readonly at: number; readonly q: number; readonly U: MPoly }[];
  /** A polynomial in the kernels reduced modulo the radical relations. */
  reduce(d: MPoly): MPoly;
}

function monomial(ctx: ExpressionStore['ctx'], vars: readonly string[], at: number, e: number): MPoly {
  return { vars, terms: new Map([[vars.map((_, i) => (i === at ? e : 0)).join(','), rational(ctx, 1n)]]) };
}

function kernelize(store: ExpressionStore, exprs: readonly ExprId[]): Kernels {
  const ctx = store.ctx;
  const expArgs: Rational[] = [];
  for (const n of store.postorder([...exprs])) {
    const k = store.node(n);
    if (k.kind === 'apply' && k.fn === 'exp' && store.numberValue(k.arg)) expArgs.push(store.numberValue(k.arg) as Rational);
  }
  const lcm = (qs: Iterable<Rational>) => { let m = 1n; for (const q of qs) m = iquot(ctx, imul(ctx, m, q.denominator), igcd(ctx, m, q.denominator)); return m; };
  const M = lcm(expArgs);
  // Exponentials of other constants, grouped by direction: exp(a) and exp(b) share a base when a/b is rational (its
  // normal form is a number: (2 + 2i)/(1 + i) = 2), so exp(2 + 2i) = exp(1 + i)².
  const groups: { base: ExprId; name: string; members: Map<ExprId, Rational>; M: bigint }[] = [];
  for (const n of store.postorder([...exprs])) {
    const k = store.node(n);
    if (k.kind !== 'apply' || k.fn !== 'exp' || store.numberValue(k.arg) || store.freeSymbols(k.arg).length) continue;
    const home = groups.find(g => { const r = kernelNormalForm(store, store.div(k.arg, g.base)); const q = r === undefined ? undefined : store.numberValue(r); if (q) g.members.set(n, q); return q !== undefined; });
    if (!home) groups.push({ base: k.arg, name: `η${groups.length + 1}`, members: new Map([[n, rational(ctx, 1n)]]), M: 1n });
  }
  for (const g of groups) g.M = lcm(g.members.values());
  const EPS = 'ε', atoms = new Map<ExprId, string>(), radicals: { name: string; q: number; power: ExprId }[] = [];
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
      } else if (groups.some(g => g.members.has(n))) {
        const g = groups.find(h => h.members.has(n)) as (typeof groups)[number], q = g.members.get(n) as Rational;
        done.set(n, store.pow(store.symbol(g.name), store.integer(iquot(ctx, imul(ctx, q.numerator, g.M), q.denominator))));
      } else {
        if (!atoms.has(n)) {
          // A radical atom κ = u^{p/q} (q > 1, p ≥ 1) satisfies κ^q = u^p for the principal root, for any u.
          const ex = k.kind === 'pow' ? store.numberValue(k.exponent) : undefined;
          const base = k.kind === 'pow' && ex && ex.denominator > 1n && ex.numerator > 0n ? kernelized(k.base) : undefined;
          atoms.set(n, `κ${atoms.size + 1}`);
          if (k.kind === 'constant' && k.name === 'i') radicals.push({ name: atoms.get(n) as string, q: 2, power: store.integer(-1) });
          if (base !== undefined && ex) radicals.push({ name: atoms.get(n) as string, q: Number(ex.denominator), power: store.pow(base, store.integer(ex.numerator)) });
        }
        done.set(n, store.symbol(atoms.get(n) as string));
      }
    }
    return done.get(e) as ExprId;
  };
  const ids = exprs.map(kernelized), vars = [EPS, ...groups.map(g => g.name), ...atoms.values()];
  const back = new Map<string, ExprId>([[EPS, store.exp(store.number(rational(ctx, 1n, M)))],
    ...groups.map(g => [g.name, store.exp(store.mul(store.number(rational(ctx, 1n, g.M)), g.base))] as [string, ExprId]),
    ...[...atoms].map(([atom, name]) => [name, atom] as [string, ExprId])]);
  // Reduce modulo the radical relations κ^q = U (U a polynomial in earlier variables), latest atom first.
  const relations = [...radicals].reverse().flatMap(rel => {
    const U = fractionOf(store, rel.power, vars);
    if (!U || U.den.terms.size !== 1 || ![...U.den.terms.keys()][0].split(',').every(x => x === '0')) return [];
    return [{ at: vars.indexOf(rel.name), q: rel.q, U: mpolyScale(ctx, U.num, rInverse(ctx, [...U.den.terms.values()][0])) }];
  });
  // d = Σ cⱼ·κʲ becomes Σ cⱼ·κ^{j mod q}·U^{⌊j/q⌋}: one pass per relation, with the powers of U kept.
  const reduce = (input: MPoly): MPoly => {
    let d = input;
    for (const { at, q, U } of relations) {
      ctx.tick();
      const coefficients = coefficientsIn(d, at);
      if (coefficients.length <= q) continue;
      const powers: MPoly[] = [mpolyConstant(vars, rational(ctx, 1n))];
      let out: MPoly = mpolyConstant(vars, rational(ctx, 0n));
      coefficients.forEach((c, j) => {
        if (c.terms.size === 0) return;
        const m = Math.floor(j / q);
        while (powers.length <= m) powers.push(multiply(ctx, powers[powers.length - 1], U));
        out = mpolyAdd(ctx, out, multiply(ctx, multiply(ctx, c, monomial(ctx, vars, at, j % q)), powers[m]));
      });
      d = out;
    }
    return d;
  };
  return { ids, vars, back, relations, reduce };
}
