import { igcd, imul, iquot } from '../algebra/integer';
import { rational, type Rational } from '../algebra/rational';
import { exactPolynomial, OWNERS, rationalForm, type Refusal } from '../decision/rational-form';
import { zerosOf as polynomialZeros } from '../decision/univariate';
import { CERTIFIED_NUMERICS, polynomialCoefficients, replaceSubexpressions, scanKernels } from '../generators/lattice';
import { dependsOn } from '../generators/normal-form';
import { expandConstant } from '../representation/angles';
import { evaluateExact, imaginaryPart, realPart, type ExactValue } from '../representation/evaluate';
import type { ExprId, ExpressionStore } from '../representation/expression';
import type { Condition } from '../representation/relation';
import { realSign, START_BITS } from '../representation/real-order';
import { enclose } from '../representation/enclosure';
import { linearForm } from '../generators/inversion';
import { complexForm, complexIsZero, latticeIndex, logParts, quotient, rect, valueExpression } from './rectangular';

/**
 * Complete complex zero sets of target-dependent expressions built from
 * rational operations, exp and log (after `complex-kernel-normal-form`), as
 * exact closed forms: points, affine families a + ω·k (k ∈ ℤ) and families in
 * several integer parameters with constraints.
 *
 * Goals "h(z) = level" are processed with an explicit stack:
 * - h rational in z: exact roots (slice 1); with transcendental coefficients
 *   degree ≤ 2 (principal square root), higher degree to the parameters gate;
 * - a product at level 0: the factors' zeros;
 * - exponential kernels with exponents polynomial in z: one generator
 *   t = exp(G + γ) (rational ratios of the exponents, decided exactly); each
 *   root c ≠ 0 gives G + γ = Log c + 2πik — an affine family when G is affine,
 *   otherwise a goal with the parameter k;
 * - one exponential kernel of another argument u: exp(u) = c gives the goal
 *   u = Log c + 2πik;
 * - one logarithmic kernel: log u = c (Im c ∈ (−π, π], the principal strip)
 *   gives u = e^c;
 * - several logarithmic kernels with rational coefficients (slice 5): the
 *   exponentiated rational equation, each root kept exactly when its Arg sum
 *   puts the logarithms back on the principal branch (`severalLogs`);
 * - goals with parameters: degree ≤ 2 in z, or one exponential kernel at
 *   degree 1 (constraint: the level is nonzero, an exact integer exclusion).
 * Every step is an equivalence over ℂ, so the list is complete.
 */
export interface AffineFamily {
  readonly anchor: ExprId;
  readonly period: ExprId;
  /** A real angle φ with Re(anchor/period) = φ/2π (exact boundary decisions without dividing by π). */
  readonly phase: ExprId;
}
export interface GeneralFamily { readonly value: ExprId; readonly params: readonly string[]; readonly constraints: readonly Condition[] }

export type ComplexZeros =
  | { readonly kind: 'zeros'; readonly points: readonly ExprId[]; readonly affine: readonly AffineFamily[]; readonly general: readonly GeneralFamily[] }
  | { readonly kind: 'all' }
  | { readonly kind: 'refused'; readonly refusal: Refusal };

interface Goal { readonly h: ExprId; readonly level: ExprId; readonly top: boolean; readonly params: readonly string[]; readonly constraints: readonly Condition[] }

class Refused { readonly refusal: Refusal; constructor(refusal: Refusal) { this.refusal = refusal; } }
const refuse = (owner: string, detail: string): never => { throw new Refused({ owner, detail }); };
const COMPOSITION = 'EQUATION-COMPOSITION1';

type Rooted = { kind: 'values'; values: ExprId[]; constraints?: Condition[] } | { kind: 'all' };

/** An exact value as an expression: rectangular with radical parts when both have proven forms. */
export function exactExpression(store: ExpressionStore, v: ExactValue): ExprId {
  if (v.kind === 'rational' || v.root.kind === 'real') return valueExpression(store, v);
  const ctx = store.ctx, re = valueExpression(store, realPart(ctx, v)), im = valueExpression(store, imaginaryPart(ctx, v));
  const plain = (id: ExprId) => store.node(id).kind !== 'algebraic';
  return plain(re) && plain(im) ? complexForm(store, { re, im }) : store.algebraic(v.root);
}

/** √D on the principal branch, with real D handled by its sign. */
function principalSqrt(store: ExpressionStore, D: ExprId): ExprId {
  if (store.freeSymbols(D).length === 0) {
    const r = rect(store, D);
    if (r && store.numberValue(r.im)?.numerator === 0n) {
      const s = realSign(store, r.re);
      return s >= 0 ? store.sqrt(r.re) : store.mul(store.constant('i'), store.sqrt(store.neg(r.re)));
    }
  }
  return store.sqrt(D);
}

const provablyZero = (store: ExpressionStore, id: ExprId) => complexIsZero(store, id) === true;

/** Zeros of h − level, rational in v, over ℂ (a level with integer parameters: h = N/D gives N − level·D). */
function complexRoots(store: ExpressionStore, h: ExprId, level: ExprId, v: string, params: readonly string[] = []): Rooted {
  const symbolic = store.freeSymbols(level).length > 0;
  const f = rationalForm(store, symbolic ? h : store.sub(h, level), v);
  if (!f.ok) {
    if ('undefinedEverywhere' in f) return { kind: 'values', values: [] };
    return refuse(f.refusal.owner, f.refusal.detail);
  }
  const list = (p: typeof f.form.num) => (p.kind === 'q' ? p.c.map(x => store.number(x)) : [...p.c]);
  if (!symbolic) {
    const exact = exactPolynomial(store, f.form.num, 'complex');
    if (exact.kind === 'undefined') return { kind: 'values', values: [] };
    if (exact.kind === 'ok') {
      const p = exact.poly;
      if (p.kind === 'rational' ? p.poly.coefficients.length === 0 : p.coefficients.length === 0) return { kind: 'all' };
      return { kind: 'values', values: polynomialZeros(store, p, 'complex').map(z => exactExpression(store, z)) };
    }
  }
  const c = list(f.form.num);
  if (symbolic) {
    const den = list(f.form.den);
    while (c.length < den.length) c.push(store.integer(0));
    den.forEach((d, i) => { if (store.numberValue(d)?.numerator !== 0n) c[i] = expandConstant(store, store.sub(c[i], store.mul(level, d))); });
  }
  while (c.length && provablyZero(store, c[c.length - 1])) c.pop();
  const d = c.length - 1;
  if (d < 0) return { kind: 'all' };
  // A leading coefficient in the parameters may vanish at one integer: there the equation drops a degree.
  const lead = symbolic ? nonzeroConstraints(store, c[d], params) : [];
  if (lead === 'never') return refuse(COMPOSITION, 'a family with a degenerate member');
  if (lead.length) {
    // Only degree 1 survives: at the excluded integer the equation reads c₀ = 0, which must fail there.
    const k0 = lead[0] as unknown as { expr: ExprId; other: ExprId }, name = (store.node(k0.expr) as { name: string }).name;
    if (d !== 1 || complexIsZero(store, store.substitute(c[0], new Map([[name, k0.other]]))) !== false) return refuse(COMPOSITION, 'a family with a degenerate member');
  }
  if (d === 0) return { kind: 'values', values: [] };
  if (d === 1) return { kind: 'values', values: [expandConstant(store, store.neg(store.div(c[0], c[1])))], constraints: lead };
  if (d === 2 && provablyZero(store, c[1])) {
    // a·v² + c = 0: v = ±√(−c/a).
    const r = principalSqrt(store, expandConstant(store, store.neg(store.div(c[0], c[2]))));
    return { kind: 'values', values: provablyZero(store, c[0]) ? [store.integer(0)] : [r, expandConstant(store, store.neg(r))] };
  }
  if (d === 2) {
    const D = expandConstant(store, store.sub(store.pow(c[1], store.integer(2)), store.mul(store.integer(4), c[2], c[0])));
    const twoA = store.mul(store.integer(2), c[2]);
    if (provablyZero(store, D)) return { kind: 'values', values: [expandConstant(store, store.neg(store.div(c[1], twoA)))] };
    const s = principalSqrt(store, D);
    return { kind: 'values', values: [store.div(store.sub(s, c[1]), twoA), store.div(store.neg(store.add(s, c[1])), twoA)].map(x => expandConstant(store, x)) };
  }
  return refuse(OWNERS.parameters, `degree-${d} equation with transcendental coefficients`);
}

/** Exact rational value of a number-only expression, if it is one. */
export function rationalValue(store: ExpressionStore, id: ExprId): Rational | undefined {
  const v = store.numberValue(id);
  if (v) return v;
  const e = evaluateExact(store, id, 'complex');
  return e.kind === 'exact' && e.value.kind === 'rational' ? e.value.value : undefined;
}

interface Lattice { readonly G: ExprId; readonly gamma: ExprId; readonly parts: ReadonlyMap<ExprId, { readonly power: bigint; readonly coefficient: ExprId }> }

/** One generator for exponential kernels whose exponents are polynomial in v with rational ratios; undefined for other exponents. */
function complexLattice(store: ExpressionStore, kernels: readonly ExprId[], v: string): Lattice | undefined {
  const ctx = store.ctx, args = kernels.map(k => (store.node(k) as { arg: ExprId }).arg);
  const polys = args.map(u => polynomialCoefficients(store, u, v));
  if (polys.some(p => p === undefined)) return undefined;
  const ps = polys as ExprId[][], ref = ps[0];
  const pivot = ref.findIndex((c, k) => k > 0 && !provablyZero(store, c));
  const rhos: Rational[] = [];
  for (const p of ps) {
    const rho = p.length === ref.length && pivot > 0 ? rationalValue(store, quotient(store, p[pivot], ref[pivot])) : undefined;
    if (!rho) return refuse(CERTIFIED_NUMERICS, 'independent exponential generators');
    for (let k = 1; k < p.length; k++) if (!provablyZero(store, store.sub(p[k], store.mul(store.number(rho), ref[k])))) return refuse(CERTIFIED_NUMERICS, 'independent exponential generators');
    rhos.push(rho);
  }
  let L = 1n;
  for (const r of rhos) L = iquot(ctx, imul(ctx, L, r.denominator), igcd(ctx, L, r.denominator));
  const scaled = rhos.map(r => iquot(ctx, imul(ctx, r.numerator, L), r.denominator));
  const g = scaled.reduce((a, b) => igcd(ctx, a, b));
  let powers = scaled.map(a => iquot(ctx, a, g));
  const betas = ps.map(p => p[0] ?? store.integer(0));
  let G = expandConstant(store, store.mul(store.number(rational(ctx, g, L)), store.sub(args[0], betas[0])));
  let gamma = store.integer(0);
  for (let k = 0; k < betas.length; k++) {
    const candidate = store.div(betas[k], store.integer(powers[k]));
    if (betas.every((b, i) => evaluateExact(store, store.exp(store.sub(b, store.mul(store.integer(powers[i]), candidate))), 'complex').kind === 'exact')) { gamma = expandConstant(store, candidate); break; }
  }
  // Orientation: the frequency of an affine G points into the upper half-plane (or along the positive reals).
  const G1 = polynomialCoefficients(store, G, v);
  if (G1 && G1.length === 2) {
    const r = rect(store, G1[1]);
    if (r) {
      const si = realSign(store, r.im), sr = realSign(store, r.re);
      if (si < 0 || (si === 0 && sr < 0)) { G = store.neg(G); gamma = store.neg(gamma); powers = powers.map(p => -p); }
    }
  }
  const parts = new Map<ExprId, { power: bigint; coefficient: ExprId }>();
  kernels.forEach((k, i) => parts.set(k, { power: powers[i], coefficient: store.exp(expandConstant(store, store.sub(betas[i], store.mul(store.integer(powers[i]), gamma)))) }));
  return { G, gamma, parts };
}

/** The integer exclusions of a level that must be nonzero (one parameter, degree ≤ 1); refuses otherwise. */
function nonzeroConstraints(store: ExpressionStore, level: ExprId, params: readonly string[]): Condition[] | 'never' {
  const used = params.filter(p => dependsOn(store, level, p));
  if (used.length === 0) return provablyZero(store, level) ? 'never' : [];
  if (used.length > 1) return refuse(COMPOSITION, 'a nested family in several parameters');
  const k = used[0], coefficients = polynomialCoefficients(store, level, k);
  if (!coefficients || coefficients.length > 2) return refuse(COMPOSITION, 'a nested family whose level is not affine in its parameter');
  if (coefficients.length === 1) return provablyZero(store, coefficients[0]) ? 'never' : [];
  const k0 = latticeIndex(store, store.neg(store.div(coefficients[0], coefficients[1])), store.integer(0), store.integer(1));
  return k0 === undefined ? [] : [{ kind: 'not-equal', expr: store.symbol(k), other: store.integer(k0) }];
}

export function complexZeros(store: ExpressionStore, f: ExprId, x: string, fresh: (prefix: string) => string): ComplexZeros {
  try {
    const points = new Map<ExprId, true>(), affine: AffineFamily[] = [], general: GeneralFamily[] = [];
    const stack: Goal[] = [{ h: f, level: store.integer(0), top: true, params: [], constraints: [] }];
    const twoPiI = store.mul(store.integer(2), store.constant('pi'), store.constant('i'));
    while (stack.length) {
      store.ctx.tick();
      const g = stack.pop() as Goal;
      const push = (h: ExprId, level: ExprId, params = g.params, constraints = g.constraints) => stack.push({ h, level, top: false, params, constraints });
      const parametric = g.params.some(p => dependsOn(store, g.level, p));
      const product = store.node(g.h);
      if (!parametric && store.numberValue(g.level)?.numerator === 0n && product.kind === 'mul' && product.args.filter(a => dependsOn(store, a, x)).length > 1) {
        for (const a of product.args) if (dependsOn(store, a, x)) push(a, g.level);
        continue;
      }
      const scan = scanKernels(store, g.h, x);
      if (scan.kernels.length === 0) {
        const r = complexRoots(store, g.h, g.level, x, g.params);
        if (r.kind === 'all') { if (g.top) return { kind: 'all' }; refuse(OWNERS.generators, 'an inner identity'); continue; }
        if (parametric) for (const v of r.values) general.push({ value: v, params: g.params, constraints: [...g.constraints, ...(r.constraints ?? [])] });
        else for (const v of r.values) points.set(v, true);
        continue;
      }
      const fns = scan.kernels.map(k => { const n = store.node(k); return n.kind === 'apply' ? n.fn : 'power'; });
      if (fns.some(fn => fn !== 'exp' && fn !== 'log')) {
        const other = fns.find(fn => fn !== 'exp' && fn !== 'log') as string;
        if (other === 'power') refuse(CERTIFIED_NUMERICS, 'a power with the variable in its base and exponent');
        refuse(other.startsWith('lambert') ? CERTIFIED_NUMERICS : COMPOSITION, `${other} of the variable over ℂ`);
      }
      if (scan.variableOutside) refuse(CERTIFIED_NUMERICS, 'the variable outside exponential or logarithmic kernels over ℂ (Lambert class)');
      const tau = fresh('τ'), t = store.symbol(tau);
      if (fns.every(fn => fn === 'log')) {
        if (parametric) refuse(COMPOSITION, 'a logarithm behind a family');
        if (scan.kernels.length > 1) {
          for (const p of severalLogs(store, store.sub(g.h, g.level), scan.kernels, x, fresh)) points.set(p, true);
          continue;
        }
        const kernel = scan.kernels[0], u = (store.node(kernel) as { arg: ExprId }).arg;
        const r = complexRoots(store, replaceSubexpressions(store, g.h, new Map([[kernel, t]])), g.level, tau);
        if (r.kind === 'all') { if (g.top) return { kind: 'all' }; refuse(OWNERS.generators, 'an identity in the logarithm'); continue; }
        for (const c of r.values) {
          // log u = c needs c in the principal strip −π < Im c ≤ π.
          const parts = rect(store, c);
          if (parts === undefined) refuse(COMPOSITION, 'a logarithm level without rectangular parts');
          const pi = store.constant('pi'), im = (parts as { im: ExprId }).im;
          if (realSign(store, expandConstant(store, store.sub(im, pi))) > 0 || realSign(store, expandConstant(store, store.add(im, pi))) <= 0) continue;
          push(u, store.exp(c));
        }
        continue;
      }
      if (fns.some(fn => fn === 'log')) refuse(CERTIFIED_NUMERICS, 'exponential and logarithmic kernels together over ℂ');
      // Exponential kernels.
      const lattice = parametric ? undefined : complexLattice(store, scan.kernels, x);
      if (lattice === undefined) {
        if (scan.kernels.length > 1) refuse(parametric ? COMPOSITION : CERTIFIED_NUMERICS, parametric ? 'several exponentials behind a family' : 'exponentials of non-polynomial arguments');
        const kernel = scan.kernels[0], u = (store.node(kernel) as { arg: ExprId }).arg;
        const r = complexRoots(store, replaceSubexpressions(store, g.h, new Map([[kernel, t]])), g.level, tau, g.params);
        if (r.kind === 'all') { if (g.top) return { kind: 'all' }; refuse(OWNERS.generators, 'an identity in the exponential'); continue; }
        if (parametric && r.values.length > 1) refuse(COMPOSITION, 'a nested family of degree above 1');
        for (const c of r.values) {
          const exclusions = nonzeroConstraints(store, c, g.params);
          if (exclusions === 'never') continue;
          const k = fresh('κ'), level = store.add(parametric ? store.log(c) : logOf(store, c), store.mul(twoPiI, store.symbol(k)));
          push(u, level, [...g.params, k], [...g.constraints, ...(r.constraints ?? []), ...exclusions]);
        }
        continue;
      }
      const substituted = replaceSubexpressions(store, g.h, new Map([...lattice.parts].map(([k, p]) => [k, store.mul(p.coefficient, store.pow(t, store.integer(p.power)))])));
      const r = complexRoots(store, substituted, g.level, tau);
      if (r.kind === 'all') { if (g.top) return { kind: 'all' }; refuse(OWNERS.generators, 'an identity in the generator'); continue; }
      const G = polynomialCoefficients(store, lattice.G, x) as ExprId[];
      const gammaParts = rect(store, lattice.gamma);
      for (const c of r.values) {
        const zero = complexIsZero(store, c);
        if (zero === true || zero === 'undefined') continue; // t = exp(…) ≠ 0
        const cParts = rect(store, c), L = cParts && logParts(store, cParts);
        if (L === undefined || gammaParts === undefined) { refuse(COMPOSITION, 'a generator root without rectangular parts'); continue; }
        const log = complexForm(store, L);
        if (G.length === 2) {
          // G₁·z + G₀ + γ = Log c + 2πik.
          const anchor = quotient(store, store.sub(store.sub(log, lattice.gamma), G[0]), G[1]);
          const period = quotient(store, twoPiI, G[1]);
          const shiftParts = rect(store, G[0]);
          if (shiftParts === undefined) { refuse(COMPOSITION, 'a shift without rectangular parts'); continue; }
          affine.push({ anchor, period, phase: expandConstant(store, store.sub(store.sub(L.im, gammaParts.im), shiftParts.im)) });
          continue;
        }
        const k = fresh('κ');
        push(lattice.G, store.add(store.sub(log, lattice.gamma), store.mul(twoPiI, store.symbol(k))), [k], []);
      }
    }
    return { kind: 'zeros', points: [...points.keys()], affine, general };
  } catch (e) {
    if (e instanceof Refused) return { kind: 'refused', refusal: e.refusal };
    throw e;
  }
}

/**
 * Zeros of Σ cⱼ·Log uⱼ(z) + R with rational cⱼ (slice 5). With L the lcm of the
 * denominators, every zero satisfies ∏ uⱼ^{L·cⱼ} = e^{−L·R} (exp(n·Log u) = uⁿ for
 * integer n), a rational equation with exact roots. At such a root the sum is
 * 2πi·m/L for an integer m, so it vanishes exactly when the Arg sum gives m = 0;
 * m is an integer, so enclosures fix it without any transcendental zero test.
 */
function severalLogs(store: ExpressionStore, h: ExprId, kernels: readonly ExprId[], x: string, fresh: (prefix: string) => string): ExprId[] {
  const ctx = store.ctx, symbols = kernels.map(() => store.symbol(fresh('λ')));
  const lin = linearForm(store, replaceSubexpressions(store, h, new Map(kernels.map((k, i) => [k, symbols[i]]))), symbols);
  if (!lin) return refuse(COMPOSITION, 'logarithms combined non-linearly over ℂ');
  if (dependsOn(store, lin.constant, x)) return refuse(CERTIFIED_NUMERICS, 'the variable outside the logarithms over ℂ');
  const cs = symbols.map(sy => rationalValue(store, lin.coefficients.get(sy) ?? store.integer(0)));
  if (cs.some(c => c === undefined)) return refuse(OWNERS.parameters, 'a non-rational multiple of a logarithm over ℂ');
  let L = 1n;
  for (const c of cs as Rational[]) L = iquot(ctx, imul(ctx, L, c.denominator), igcd(ctx, L, c.denominator));
  const n = (cs as Rational[]).map(c => iquot(ctx, imul(ctx, c.numerator, L), c.denominator));
  const args = kernels.map(k => (store.node(k) as { arg: ExprId }).arg);
  const product = store.mul(...args.map((u, j) => store.pow(u, store.integer(n[j]))));
  const r = complexRoots(store, product, store.exp(store.neg(store.mul(store.integer(L), lin.constant))), x);
  if (r.kind === 'all') return refuse(OWNERS.generators, 'an identity among logarithms over ℂ');
  const R = rect(store, lin.constant);
  if (R === undefined) return refuse(COMPOSITION, 'a constant without rectangular parts');
  const twoPi = store.mul(store.integer(2), store.constant('pi'));
  const out: ExprId[] = [];
  for (const z of r.values) {
    const at = args.map(u => store.substitute(u, new Map([[x, z]])));
    if (at.some(u => complexIsZero(store, u) !== false)) continue;
    const parts = at.map(u => { const p = rect(store, u); return p && logParts(store, p); });
    if (parts.some(p => p === undefined)) return refuse(COMPOSITION, 'a logarithm argument without rectangular parts');
    const turns = store.add(...parts.map((p, j) => store.mul(store.integer(n[j]), (p as { im: ExprId }).im)), store.mul(store.integer(L), R.im));
    if (nearestInteger(store, store.div(turns, twoPi)) === 0n) out.push(z);
  }
  return out;
}

/** The integer a real closed form is known to equal, from enclosures. */
function nearestInteger(store: ExpressionStore, id: ExprId): bigint {
  for (let bits = START_BITS; ; bits *= 2) {
    store.ctx.tick();
    const e = enclose(store, id, bits);
    if (e.kind !== 'bounds') { if (e.kind === 'unknown') continue; return refuse(COMPOSITION, 'an Arg sum that cannot be enclosed'); }
    const round = (q: Rational) => { const t = q.numerator * 2n + q.denominator, d = 2n * q.denominator; return t >= 0n ? t / d : -((-t + d - 1n) / d); };
    const a = round(e.lo), b = round(e.hi);
    if (a === b) return a;
  }
}

/** The canonical principal logarithm of a nonzero constant. */
function logOf(store: ExpressionStore, c: ExprId): ExprId {
  const parts = rect(store, c), L = parts && logParts(store, parts);
  if (L === undefined) return refuse(COMPOSITION, 'a logarithm without rectangular parts');
  return complexForm(store, L);
}
