import { igcd, imul, iquot } from '../algebra/integer';
import type { Polynomial } from '../algebra/polynomial';
import { rational, rDivide, type Rational } from '../algebra/rational';
import { factorQ } from '../algebra/factor';
import { ALGEBRAIC_RING } from '../algebraic/root-of';
import { QX, rationalForm, type Refusal } from '../decision/rational-form';
import { evaluateExact } from '../representation/evaluate';
import type { ExprId, ExpressionStore } from '../representation/expression';
import { parseLogLinear, ratio as logRatio } from './constants';
import { dependsOn } from './normal-form';

/**
 * Kernels and generator lattices.
 *
 * A kernel is a maximal target-dependent transcendental node: exp(u), log(v),
 * W(v), abs, trig, a radical or a power with the target in its exponent.
 *
 * Exponential lattice: kernels exp(uᵢ) with polynomial uᵢ = ρᵢ·(u₁ − β₁) + βᵢ for
 * rational ρᵢ (decided exactly) become exp(δᵢ)·t^{nᵢ} with integer nᵢ and one
 * generator t = exp(G + γ), G = (u₁ − β₁)·g/L. The shift γ is chosen so that
 * every exp(δᵢ) is algebraic when possible.
 *
 * Log lattice: each argument factors over ℚ as c·∏ fₖ^{eₖ}, and on its domain
 * (argument > 0) log v = log|c| + Σ eₖ·log|fₖ|.
 */
export interface KernelScan { readonly kernels: readonly ExprId[]; readonly variableOutside: boolean }

export function scanKernels(store: ExpressionStore, h: ExprId, x: string): KernelScan {
  const kernels = new Set<ExprId>();
  let outside = false;
  const stack = [h], seen = new Set<ExprId>();
  while (stack.length) {
    store.ctx.tick();
    const n = stack.pop() as ExprId;
    if (seen.has(n) || !dependsOn(store, n, x)) continue;
    seen.add(n);
    const node = store.node(n);
    switch (node.kind) {
      case 'symbol': outside = true; break;
      case 'add': case 'mul': stack.push(...node.args); break;
      case 'pow': {
        const e = store.numberValue(node.exponent);
        if (e && e.denominator === 1n) stack.push(node.base); else kernels.add(n);
        break;
      }
      case 'apply': kernels.add(n); break;
      default: break;
    }
  }
  return { kernels: [...kernels], variableOutside: outside };
}

/** Rebuild `h` with some subexpressions replaced (explicit stack). */
export function replaceSubexpressions(store: ExpressionStore, h: ExprId, replacements: ReadonlyMap<ExprId, ExprId>): ExprId {
  const mapped = new Map<ExprId, ExprId>();
  for (const n of store.postorder([h])) {
    const r = replacements.get(n);
    if (r !== undefined) { mapped.set(n, r); continue; }
    const node = store.node(n), m = (c: ExprId) => mapped.get(c) as ExprId;
    switch (node.kind) {
      case 'add': mapped.set(n, store.add(...node.args.map(m))); break;
      case 'mul': mapped.set(n, store.mul(...node.args.map(m))); break;
      case 'pow': mapped.set(n, store.pow(m(node.base), m(node.exponent))); break;
      case 'apply': mapped.set(n, store.apply(node.fn, m(node.arg))); break;
      default: mapped.set(n, n);
    }
  }
  return mapped.get(h) as ExprId;
}

/** Exact rational ratio a/b of two number-only expressions, when it is rational. */
export function rationalRatio(store: ExpressionStore, a: ExprId, b: ExprId): Rational | undefined {
  const direct = store.numberValue(store.div(a, b));
  if (direct) return direct;
  const e = evaluateExact(store, store.div(a, b), 'real');
  if (e.kind === 'exact') return e.value.kind === 'rational' ? e.value.value : undefined;
  const la = parseLogLinear(store, a), lb = parseLogLinear(store, b);
  return la && lb ? logRatio(store.ctx, la, lb) : undefined;
}

/** Polynomial coefficients (number-only expression ids) of u in x, or undefined. */
export function polynomialCoefficients(store: ExpressionStore, u: ExprId, x: string): ExprId[] | undefined {
  const f = rationalForm(store, u, x);
  if (!f.ok) return undefined;
  const den = f.form.den;
  if (!(den.kind === 'q' && den.c.length === 1 && den.c[0].numerator === den.c[0].denominator)) return undefined;
  const num = f.form.num;
  return num.kind === 'q' ? num.c.map(c => store.number(c)) : [...num.c];
}

export interface ExponentialLattice {
  /** G(x) with every uᵢ = nᵢ·G + βᵢ. */
  readonly exponent: ExprId;
  readonly shift: ExprId;
  /** Per kernel: integer power and coefficient exp(βᵢ − nᵢ·γ). */
  readonly parts: ReadonlyMap<ExprId, { readonly power: bigint; readonly coefficient: ExprId }>;
}

export type LatticeResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly refusal: Refusal };
const refuse = <T>(owner: string, detail: string): LatticeResult<T> => ({ ok: false, refusal: { owner, detail } });
const ONE = 'EQUATION-GENERATORS1';
export const CERTIFIED_NUMERICS = 'EQUATION-CERTIFIED-NUMERICS1';

export function exponentialLattice(store: ExpressionStore, kernels: readonly ExprId[], x: string): LatticeResult<ExponentialLattice> {
  const ctx = store.ctx;
  const args = kernels.map(k => (store.node(k) as { arg: ExprId }).arg);
  const polys = args.map(u => polynomialCoefficients(store, u, x));
  if (polys.some(p => p === undefined)) return refuse(ONE, 'exponent that is not polynomial in the variable');
  const ps = polys as ExprId[][];
  const ref = ps[0], pivot = ref.findIndex((c, k) => k > 0 && store.numberValue(c)?.numerator !== 0n);
  const rhos: Rational[] = [];
  for (const p of ps) {
    const rho = p.length === ref.length && pivot > 0 ? rationalRatio(store, p[pivot], ref[pivot]) : undefined;
    if (!rho) return refuse(CERTIFIED_NUMERICS, 'independent exponential generators');
    for (let k = 1; k < p.length; k++) {
      if (!isExactZero(store, store.sub(p[k], store.mul(store.number(rho), ref[k])))) {
        return refuse(CERTIFIED_NUMERICS, 'independent exponential generators');
      }
    }
    rhos.push(rho);
  }
  // nᵢ = ρᵢ·L/g with L = lcm of denominators and g = gcd of the scaled numerators.
  let L = 1n;
  for (const r of rhos) L = iquot(ctx, imul(ctx, L, r.denominator), igcd(ctx, L, r.denominator));
  const scaled = rhos.map(r => iquot(ctx, imul(ctx, r.numerator, L), r.denominator));
  const g = scaled.reduce((a, b) => igcd(ctx, a, b));
  const powers = scaled.map(a => iquot(ctx, a, g));
  const betas = ps.map(p => p[0] ?? store.integer(0));
  const exponent = store.mul(store.number(rational(ctx, g, L)), store.sub(args[0], betas[0]));
  // Shift: the first γ = βₖ/nₖ that makes every exp(βᵢ − nᵢγ) algebraic.
  let shift = store.integer(0);
  for (let k = 0; k < betas.length; k++) {
    const gamma = store.div(betas[k], store.number(rational(ctx, powers[k])));
    if (betas.every((b, i) => evaluateExact(store, store.exp(store.sub(b, store.mul(store.number(rational(ctx, powers[i])), gamma))), 'real').kind === 'exact')) { shift = gamma; break; }
  }
  const parts = new Map<ExprId, { power: bigint; coefficient: ExprId }>();
  kernels.forEach((k, i) => parts.set(k, { power: powers[i], coefficient: store.exp(store.sub(betas[i], store.mul(store.number(rational(ctx, powers[i])), shift))) }));
  return { ok: true, value: { exponent, shift, parts } };
}

function isExactZero(store: ExpressionStore, id: ExprId): boolean {
  if (store.numberValue(id)?.numerator === 0n) return true;
  const e = evaluateExact(store, id, 'real');
  if (e.kind === 'exact') return e.value.kind === 'rational' && e.value.value.numerator === 0n;
  return false;
}

export interface LogArgument {
  /** |c| of the argument's unit (positive rational). */
  readonly unit: Rational;
  /** Irreducible factor keys with exponents (negative for the denominator). */
  readonly factors: ReadonlyMap<string, bigint>;
}

/** Factor a log argument over ℚ (rational coefficients only). */
export function factorLogArgument(store: ExpressionStore, v: ExprId, x: string, catalog: Map<string, Polynomial<bigint>>): LogArgument | undefined {
  const ctx = store.ctx, f = rationalForm(store, v, x);
  if (!f.ok || f.form.num.kind !== 'q' || f.form.den.kind !== 'q') return undefined;
  const factors = new Map<string, bigint>();
  const units: Rational[] = [];
  for (const [part, sign] of [[f.form.num.c, 1n], [f.form.den.c, -1n]] as const) {
    const poly = QX.make(ctx, part);
    if (QX.degree(ctx, poly) < 0) return undefined;
    const fz = factorQ(ctx, QX, poly, ALGEBRAIC_RING);
    units.push(fz.unit.numerator < 0n ? rational(ctx, -fz.unit.numerator, fz.unit.denominator) : fz.unit);
    for (const { factor, multiplicity } of fz.factors) {
      const key = factor.coefficients.join(',');
      catalog.set(key, factor);
      factors.set(key, (factors.get(key) ?? 0n) + sign * BigInt(multiplicity));
    }
  }
  for (const [k, e] of factors) if (e === 0n) factors.delete(k);
  return { unit: rDivide(ctx, units[0], units[1]), factors };
}

/** Polynomial expression of an integer factor in x. */
export function factorExpression(store: ExpressionStore, factor: Polynomial<bigint>, x: string): ExprId {
  const v = store.symbol(x);
  return store.add(...factor.coefficients.map((c, i) => (i === 0 ? store.integer(c) : store.mul(store.integer(c), store.pow(v, store.integer(i))))));
}

/**
 * Sparse expansion Σ cᵢⱼ·xⁱ·tʲ (j may be negative) of an expression polynomial
 * in x and Laurent in t with number-only coefficients, or undefined.
 */
export function bivariateTerms(store: ExpressionStore, h: ExprId, x: string, t: string): Map<string, ExprId> | undefined {
  const terms = new Map<ExprId, Map<string, ExprId>>();
  const add = (a: Map<string, ExprId>, b: Map<string, ExprId>) => {
    const out = new Map(a);
    for (const [k, c] of b) out.set(k, out.has(k) ? store.add(out.get(k) as ExprId, c) : c);
    return out;
  };
  const mul = (a: Map<string, ExprId>, b: Map<string, ExprId>) => {
    const out = new Map<string, ExprId>();
    for (const [ka, ca] of a) for (const [kb, cb] of b) {
      store.ctx.tick();
      const [ia, ja] = ka.split(',').map(Number), [ib, jb] = kb.split(',').map(Number);
      const k = `${ia + ib},${ja + jb}`, c = store.mul(ca, cb);
      out.set(k, out.has(k) ? store.add(out.get(k) as ExprId, c) : c);
    }
    return out;
  };
  for (const n of store.postorder([h])) {
    const node = store.node(n), get = (c: ExprId) => terms.get(c) as Map<string, ExprId>;
    const vars = store.freeSymbols(n);
    if (!vars.includes(x) && !vars.includes(t)) { terms.set(n, new Map([['0,0', n]])); continue; }
    switch (node.kind) {
      case 'symbol': terms.set(n, new Map([[node.name === x ? '1,0' : '0,1', store.integer(1)]])); break;
      case 'add': terms.set(n, node.args.map(get).reduce(add)); break;
      case 'mul': terms.set(n, node.args.map(get).reduce(mul)); break;
      case 'pow': {
        const e = store.numberValue(node.exponent);
        if (!e || e.denominator !== 1n) return undefined;
        const base = get(node.base);
        if (e.numerator < 0n) {
          // Only a monomial c·tʲ may be inverted.
          if (base.size !== 1) return undefined;
          const [[k, c]] = [...base];
          const [i, j] = k.split(',').map(Number);
          if (i !== 0) return undefined;
          const m = Number(-e.numerator);
          terms.set(n, new Map([[`0,${-j * m}`, store.pow(c, store.integer(-m))]]));
          break;
        }
        let acc = new Map([['0,0', store.integer(1)]]);
        for (let i = 0n; i < e.numerator; i++) acc = mul(acc, base);
        terms.set(n, acc);
        break;
      }
      default: return undefined;
    }
  }
  const out = new Map<string, ExprId>();
  for (const [k, c] of terms.get(h) as Map<string, ExprId>) if (!isExactZero(store, c)) out.set(k, c);
  return out;
}
