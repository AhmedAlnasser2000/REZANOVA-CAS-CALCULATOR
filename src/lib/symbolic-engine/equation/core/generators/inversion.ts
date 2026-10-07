import { exactPolynomial, OWNERS, rationalForm, type CPoly, type Refusal } from '../decision/rational-form';
import { zerosOf as polynomialZeros } from '../decision/univariate';
import { evaluateExact } from '../representation/evaluate';
import type { ExprId, ExpressionStore } from '../representation/expression';
import { realSign } from '../representation/real-order';
import { isZero as logLinearIsZero, parseLogLinear } from './constants';
import {
  bivariateTerms, CERTIFIED_NUMERICS, exponentialLattice, factorExpression, factorLogArgument, polynomialCoefficients,
  rationalRatio, replaceSubexpressions, scanKernels,
} from './lattice';
import { solveLambertForm } from './lambert';
import { dependsOn } from './normal-form';
import { sampleBetween } from './samples';
import type { Polynomial } from '../algebra/polynomial';
import { eliminateRadicals } from '../constraints/elimination';
import { absPiecewise, containsAbs } from '../constraints/piecewise';
import { asRadical, invertRadical, sameBaseSubstitution, type RadicalKernel } from '../constraints/radicals';
import { mergeAffineFamilies, type FamilyZeros, type Param, type PeriodicZeros } from '../periodic/families';
import { ARCS, arcSum, halfAngle, invertArc, invertTrig, parametricStep, TRIG, type Sink } from '../periodic/inversion';
import { cancelInjective } from '../composition/injective';
import { rangeZeros, type SearchBox } from '../composition/zeros';

/**
 * Complete real zero sets of target-dependent expressions built from
 * rational operations, exp, log, Lambert W, absolute values and real
 * radicals, as exact closed forms (points, and intervals where the
 * expression vanishes identically).
 *
 * A worklist of goals "H(v) = L" (L a closed-form constant; v the current
 * variable, with x = back(v)) is processed with an explicit stack, so chains
 * of any depth are solved by the same code:
 * - H rational in v: exact polynomial roots (slice 1), or, with a transcendental
 *   level, degree 1 always and degree 2 for inner equations (radicals; the
 *   discriminant sign is certified);
 * - one kernel κ: solve the rational equation in κ, then invert κ
 *   (exp, log, W₀, W₋₁, |·|, real radicals) with its range conditions;
 * - absolute values elsewhere: lazy branching on the signs of their arguments;
 * - radicals of one base: one generator t = v^{1/L}; of several bases, nested,
 *   or algebraic constants alongside: the tower norm, each candidate confirmed;
 * - trig kernels: families of zeros (periodic, or in integer parameters through
 *   further kernels), several kernels by the half-angle substitution, sums of
 *   inverse trig kernels by elimination (`periodic/inversion.ts`);
 * - a product with several target-dependent factors at level 0: the factors' zeros;
 * - several exponential kernels: the exponent lattice gives one generator;
 * - logarithmic kernels: one factor class, or several combined linearly
 *   (then exponentiated);
 * - the variable also outside kernels: the Lambert class.
 * Every step is an equivalence on the natural domain, so the list is complete.
 */
/** An interval (open end: ±∞) on which the expression is zero wherever defined. */
export interface ZeroInterval { readonly lo?: ExprId; readonly hi?: ExprId; readonly loClosed: boolean; readonly hiClosed: boolean }

export type ZeroResult =
  | {
    readonly kind: 'zeros'; readonly values: readonly ExprId[]; readonly intervals?: readonly ZeroInterval[];
    /** Affine families r + P·ℤ. */
    readonly periodic?: readonly PeriodicZeros[];
    /** Families in integer parameters with ranges. */
    readonly families?: readonly FamilyZeros[];
  }
  | { readonly kind: 'all' }
  | { readonly kind: 'refused'; readonly refusal: Refusal };

interface Goal { readonly h: ExprId; readonly level: ExprId; readonly variable: string; readonly back: ExprId; readonly top: boolean; readonly params: readonly Param[] }

class Refused { readonly refusal: Refusal; constructor(refusal: Refusal) { this.refusal = refusal; } }
const refuse = (owner: string, detail: string): never => { throw new Refused({ owner, detail }); };


/** Exact zero test for closed forms we can decide; undefined when undecidable here. */
function provablyZero(store: ExpressionStore, id: ExprId): boolean | undefined {
  if (store.numberValue(id)) return store.numberValue(id)?.numerator === 0n;
  const e = evaluateExact(store, id, 'real');
  if (e.kind === 'exact') return e.value.kind === 'rational' && e.value.value.numerator === 0n;
  const ll = parseLogLinear(store, id);
  if (ll) return logLinearIsZero(store.ctx, ll);
  return undefined;
}

function liftCoefficients(store: ExpressionStore, p: CPoly): ExprId[] {
  return p.kind === 'q' ? p.c.map(c => store.number(c)) : [...p.c];
}

type Rooted = { kind: 'values'; values: ExprId[] } | { kind: 'all' };

/**
 * Zeros of H(v) − L for H rational in v. `quadratic` allows degree 2 with a
 * transcendental constant term; 'any' allows degree 2 with every coefficient
 * transcendental (the half-angle polynomials of slice 4), the signs of the
 * leading coefficient and the discriminant certified.
 */
export function solveRational(store: ExpressionStore, h: ExprId, level: ExprId, v: string, quadratic: boolean | 'any'): Rooted {
  const f = rationalForm(store, store.sub(h, level), v);
  if (!f.ok) {
    if ('undefinedEverywhere' in f) return { kind: 'values', values: [] };
    return refuse(f.refusal.owner, f.refusal.detail);
  }
  const exact = exactPolynomial(store, f.form.num, 'real');
  if (exact.kind === 'undefined') return { kind: 'values', values: [] };
  if (exact.kind === 'ok') {
    const p = exact.poly;
    if (p.kind === 'rational' ? p.poly.coefficients.length === 0 : p.coefficients.length === 0) return { kind: 'all' };
    return { kind: 'values', values: polynomialZeros(store, p, 'real').map(z => (z.kind === 'rational' ? store.number(z.value) : store.algebraic(z.root))) };
  }
  // Transcendental coefficients: closed forms for low degree only.
  const c = liftCoefficients(store, f.form.num);
  while (c.length && provablyZero(store, c[c.length - 1]) === true) c.pop();
  const d = c.length - 1;
  if (d < 0) return { kind: 'all' };
  if (d === 0) return { kind: 'values', values: [] };
  if (d === 1) return { kind: 'values', values: [store.neg(store.div(c[0], c[1]))] };
  // a·vᵈ = 0 has the single zero 0 (a ≠ 0 after trimming).
  if (c.slice(0, d).every(ci => provablyZero(store, ci) === true)) return { kind: 'values', values: [store.integer(0)] };
  if (d === 2 && quadratic && provablyZero(store, c[1]) === true) {
    // a·v² + c = 0: v = ±√(−c/a), with the sign of −c/a certified (any coefficients).
    const q = store.neg(store.div(c[0], c[2])), sq = realSign(store, q);
    if (sq < 0) return { kind: 'values', values: [] };
    if (sq === 0) return { kind: 'values', values: [store.integer(0)] };
    const r = store.sqrt(q);
    return { kind: 'values', values: [r, store.neg(r)] };
  }
  const exactLead = evaluateExact(store, c[2] ?? c[0], 'real').kind === 'exact' && evaluateExact(store, c[1] ?? c[0], 'real').kind === 'exact';
  if (d === 2 && quadratic && (exactLead || (quadratic === 'any' && realSign(store, c[2]) !== 0))) {
    if (provablyZero(store, c[1]) === true) {
      // a·v² + c = 0: v = ±√(−c/a), with the sign of −c/a certified.
      const q = store.neg(store.div(c[0], c[2])), sq = realSign(store, q);
      if (sq < 0) return { kind: 'values', values: [] };
      if (sq === 0) return { kind: 'values', values: [store.integer(0)] };
      const r = store.sqrt(q);
      return { kind: 'values', values: [r, store.neg(r)] };
    }
    const D = store.sub(store.pow(c[1], store.integer(2)), store.mul(store.integer(4), c[2], c[0]));
    const s = realSign(store, D), twoA = store.mul(store.integer(2), c[2]);
    if (s < 0) return { kind: 'values', values: [] };
    if (s === 0) return { kind: 'values', values: [store.neg(store.div(c[1], twoA))] };
    const r = store.sqrt(D);
    return { kind: 'values', values: [store.div(store.sub(r, c[1]), twoA), store.div(store.neg(store.add(r, c[1])), twoA)] };
  }
  return refuse(OWNERS.parameters, `degree-${d} equation with transcendental coefficients`);
}

/** Goals that invert one kernel κ = c (range conditions applied exactly). */
function invertKernel(store: ExpressionStore, kernel: ExprId, c: ExprId): { h: ExprId; level: ExprId }[] {
  const node = store.node(kernel);
  if (node.kind !== 'apply') {
    const radical = asRadical(store, kernel);
    return radical ? invertRadical(store, radical, c) : refuse(OWNERS.generators, 'power with a non-positive base and a variable exponent');
  }
  const plusOne = () => realSign(store, store.add(c, store.integer(1)));
  if (ARCS.has(node.fn)) return invertArc(store, node.fn as 'asin' | 'acos' | 'atan', node.arg, c);
  switch (node.fn) {
    case 'abs': {
      const sc = realSign(store, c);
      return sc < 0 ? [] : sc === 0 ? [{ h: node.arg, level: c }] : [{ h: node.arg, level: c }, { h: node.arg, level: store.neg(c) }];
    }
    case 'exp': return realSign(store, c) <= 0 ? [] : [{ h: node.arg, level: store.log(c) }];
    case 'log': return [{ h: node.arg, level: store.exp(c) }];
    case 'lambertw': return plusOne() < 0 ? [] : [{ h: node.arg, level: store.mul(c, store.exp(c)) }];
    case 'lambertwm1': return plusOne() > 0 ? [] : [{ h: node.arg, level: store.mul(c, store.exp(c)) }];
    default: return refuse(OWNERS.generators, `${node.fn} of the variable`);
  }
}

function kernelFunction(store: ExpressionStore, k: ExprId): string {
  const n = store.node(k);
  if (n.kind === 'apply') return n.fn;
  const e = store.numberValue((n as { exponent: ExprId }).exponent);
  return e ? 'radical' : 'variable-exponent';
}

/** Fresh placeholder names per top-level call (shared with nested calls); they never appear in results. */
function freshNames(): (prefix: string) => string {
  let counter = 0;
  return prefix => `${prefix}${++counter}`;
}

/** `search`: constant bounds on x from range rows; certified numerics only looks for roots inside them. */
export function zerosOf(store: ExpressionStore, f: ExprId, x: string, fresh = freshNames(), search: SearchBox = {}): ZeroResult {
  try {
    const values = new Map<ExprId, true>(), intervals: ZeroInterval[] = [], periodic: PeriodicZeros[] = [], families: FamilyZeros[] = [];
    const stack: Goal[] = [{ h: f, level: store.integer(0), variable: x, back: store.symbol(x), top: true, params: [] }];
    const emitFor = (goal: Goal) => (v: ExprId) => values.set(goal.back === store.symbol(goal.variable) ? v : store.substitute(goal.back, new Map([[goal.variable, v]])), true);
    const sink: Sink = {
      push: goal => stack.push(goal), value: (goal, v) => emitFor(goal)(v), periodic: z => periodic.push(z), family: fz => families.push(fz),
      refuse, fresh, solveRational: (h, level, v, quadratic) => solveRational(store, h, level, v, quadratic),
    };
    while (stack.length) {
      store.ctx.tick();
      const g = stack.pop() as Goal;
      if (g.params.length) { parametricStep(store, g, sink); continue; }
      const emit = emitFor(g);
      try {
      const push = (h: ExprId, level: ExprId) => stack.push({ h, level, variable: g.variable, back: g.back, top: false, params: [] });
      // A product of target-dependent factors vanishes where a factor does (domains are conditions of the decision).
      const product = store.node(g.h);
      if (store.numberValue(g.level)?.numerator === 0n && product.kind === 'mul' && product.args.filter(a => dependsOn(store, a, g.variable)).length > 1) {
        for (const a of product.args) if (dependsOn(store, a, g.variable)) push(a, g.level);
        continue;
      }
      const injective = store.numberValue(g.level)?.numerator === 0n ? cancelInjective(store, g.h, g.variable) : undefined;
      if (injective !== undefined) { for (const h of injective) push(h, g.level); continue; }
      const scan = scanKernels(store, g.h, g.variable);
      if (scan.kernels.length === 0) {
        const r = solveRational(store, g.h, g.level, g.variable, true);
        if (r.kind === 'all') { if (g.top) return { kind: 'all' }; refuse(OWNERS.generators, 'an inner identity'); continue; }
        r.values.forEach(emit);
        continue;
      }
      const kinds = scan.kernels.map(k => kernelFunction(store, k));
      for (const k of kinds) if (k === 'variable-exponent') refuse(OWNERS.generators, 'power with a non-positive base and a variable exponent');
      const tau = fresh('τ'), t = store.symbol(tau);
      if (!scan.variableOutside && scan.kernels.length === 1) {
        const kernel = scan.kernels[0], node = store.node(kernel);
        const r = solveRational(store, replaceSubexpressions(store, g.h, new Map([[kernel, t]])), g.level, tau, false);
        if (r.kind === 'all') { if (g.top) return { kind: 'all' }; refuse(OWNERS.generators, 'an identity in a kernel'); }
        for (const c of (r as { values: ExprId[] }).values) {
          if (node.kind === 'apply' && TRIG.has(node.fn)) invertTrig(store, g, node.fn as 'sin' | 'cos' | 'tan', node.arg, c, sink);
          else for (const goal of invertKernel(store, kernel, c)) push(goal.h, goal.level);
        }
        continue;
      }
      if (containsAbs(store, g.h, g.variable)) {
        const split = absPiecewise(store, store.sub(g.h, g.level), g.variable, e => zerosOf(store, e, g.variable, fresh), (a, b) => sampleBetween(store, a, b));
        if ('refusal' in split) throw new Refused(split.refusal);
        split.values.forEach(emit);
        if (split.periodic?.length) {
          if (g.back !== store.symbol(g.variable)) refuse('EQUATION-COMPOSITION1', 'periodic zeros behind a substitution');
          periodic.push(...split.periodic);
        }
        if (split.intervals.length) {
          if (g.back !== store.symbol(g.variable)) refuse(OWNERS.constraints, 'a zero interval behind a substitution');
          intervals.push(...split.intervals);
        }
        continue;
      }
      if (kinds.every(k => k === 'radical')) {
        const radicals = scan.kernels.map(k => asRadical(store, k) as RadicalKernel);
        const same = sameBaseSubstitution(store, g.h, radicals, g.variable, scan.variableOutside, t);
        if (same) {
          // v = τ^L with τ ≥ 0 for even L: each admissible root c gives the goal v = c^L.
          const r = solveRational(store, same.expression, g.level, tau, true);
          if (r.kind === 'all') { if (g.top) return { kind: 'all' }; refuse(OWNERS.constraints, 'an inner identity in a radical'); continue; }
          for (const c of r.values) if (same.order % 2n === 1n || realSign(store, c) >= 0) push(same.base, store.pow(c, store.integer(same.order)));
          continue;
        }
        const el = eliminateRadicals(store, store.sub(g.h, g.level), g.variable);
        if (el.kind === 'refused') throw new Refused(el.refusal);
        if (el.kind === 'all') { if (g.top) return { kind: 'all' }; refuse(OWNERS.constraints, 'an inner identity among radicals'); continue; }
        el.values.forEach(emit);
        continue;
      }
      if (kinds.every(k => k === 'exp')) {
        const lattice = exponentialLattice(store, scan.kernels, g.variable);
        if (!lattice.ok) refuse(lattice.refusal.owner, lattice.refusal.detail);
        const { exponent, shift, parts } = (lattice as { value: import('./lattice').ExponentialLattice }).value;
        const substituted = replaceSubexpressions(store, g.h, new Map([...parts].map(([k, p]) => [k, store.mul(p.coefficient, store.pow(t, store.integer(p.power)))])));
        if (!scan.variableOutside) {
          const r = solveRational(store, substituted, g.level, tau, false);
          if (r.kind === 'all') { if (g.top) return { kind: 'all' }; refuse(OWNERS.generators, 'an identity in the generator'); }
          for (const c of (r as { values: ExprId[] }).values) {
            if (realSign(store, c) > 0) push(exponent, store.sub(store.log(c), shift));
          }
          continue;
        }
        lambertExponential(store, substituted, g, tau, exponent, shift).forEach(emit);
        continue;
      }
      if (kinds.every(k => k === 'log')) {
        logGoals(store, g, scan.kernels, scan.variableOutside, stack, fresh);
        continue;
      }
      if (kinds.every(k => TRIG.has(k))) {
        const groups = halfAngle(store, g, sink);
        if (groups === 'all') { if (g.top) return { kind: 'all' }; refuse(OWNERS.periodic, 'an inner trig identity'); continue; }
        if (g.back !== store.symbol(g.variable)) refuse('EQUATION-COMPOSITION1', 'trig families behind a substitution');
        periodic.push(...groups);
        continue;
      }
      if (kinds.every(k => ARCS.has(k)) && !scan.variableOutside) {
        arcSum(store, g, scan.kernels, sink).forEach(emit);
        continue;
      }
      refuse(CERTIFIED_NUMERICS, 'mixed transcendental kernels');
      } catch (e) {
        // Composition (slice 5): the complete zero set by certified ranges, monotonicity and exact candidates.
        if (!(e instanceof Refused) || e.refusal.owner === OWNERS.parameters || e.refusal.owner === OWNERS.systems) throw e;
        const direct = g.variable === x && g.back === store.symbol(x);
        const r = rangeZeros(store, store.sub(g.h, g.level), g.variable, h => zerosOf(store, h, g.variable, fresh), direct ? search : {});
        if ('refusal' in r) throw r.refusal.specific ? new Refused(r.refusal) : e;
        r.values.forEach(emit);
      }
    }
    const merged = mergeAffineFamilies(store, [...values.keys()], families);
    return { kind: 'zeros', values: merged.values, intervals, periodic: [...periodic, ...merged.periodic], families: merged.families };
  } catch (e) {
    if (e instanceof Refused) return { kind: 'refused', refusal: e.refusal };
    throw e;
  }
}

/** (v + s)ⁿ·τ^{j₁}·c + d·τ^{j₂} = 0 with τ = exp(μ·v + γ): the Lambert class in v. */
function lambertExponential(store: ExpressionStore, substituted: ExprId, g: Goal, tau: string, exponent: ExprId, shift: ExprId): ExprId[] {
  const mu = polynomialCoefficients(store, exponent, g.variable);
  if (!mu || mu.length !== 2) return refuse(CERTIFIED_NUMERICS, 'variable outside a non-affine exponential');
  const terms = bivariateTerms(store, store.sub(substituted, g.level), g.variable, tau);
  if (!terms) return refuse(CERTIFIED_NUMERICS, 'variable outside the exponential generator in a non-polynomial way');
  const byJ = new Map<number, Map<number, ExprId>>();
  for (const [k, c] of terms) {
    const [i, j] = k.split(',').map(Number);
    if (!byJ.has(j)) byJ.set(j, new Map());
    (byJ.get(j) as Map<number, ExprId>).set(i, c);
  }
  const groups = [...byJ.entries()];
  const polyOf = (m: Map<number, ExprId>) => {
    const n = Math.max(...m.keys());
    return Array.from({ length: n + 1 }, (_, i) => m.get(i) ?? store.integer(0));
  };
  if (groups.length === 1) {
    // A(v)·τ^j = 0 with τ > 0: A(v) = 0.
    const a = polyOf(groups[0][1]), v = store.symbol(g.variable);
    const r = solveRational(store, store.add(...a.map((c, i) => store.mul(c, store.pow(v, store.integer(i))))), store.integer(0), g.variable, true);
    if (r.kind === 'all') return refuse(OWNERS.generators, 'an identity');
    return r.values;
  }
  if (groups.length !== 2) return refuse(CERTIFIED_NUMERICS, 'more than two exponential terms with the variable outside');
  const constantGroup = groups.find(([, m]) => m.size === 1 && m.has(0));
  const polyGroup = groups.find(gr => gr !== constantGroup);
  if (!constantGroup || !polyGroup) return refuse(CERTIFIED_NUMERICS, 'variable in two exponential terms');
  const [j1, aMap] = polyGroup, [j2, dMap] = constantGroup;
  const a = polyOf(aMap), n = a.length - 1, d = dMap.get(0) as ExprId;
  if (n < 1) return refuse(CERTIFIED_NUMERICS, 'unexpected support');
  // A must be cₙ·(v + s)ⁿ with s = c_{n−1}/(n·cₙ).
  const cn = a[n], s = store.div(a[n - 1], store.mul(store.integer(n), cn));
  let binom = 1n;
  for (let i = n; i >= 0; i--) {
    const expected = store.mul(store.integer(binom), cn, ...(n - i > 0 ? [store.pow(s, store.integer(n - i))] : []));
    if (provablyZero(store, store.sub(a[i], expected)) !== true) return refuse(CERTIFIED_NUMERICS, 'polynomial factor is not a power of a linear form');
    binom = (binom * BigInt(i)) / BigInt(n - i + 1);
  }
  // (v + s)ⁿ·τ^{m} = k with τ^m = exp(m·μ·v + m·γ).
  const m = store.integer(j1 - j2), k = store.neg(store.div(d, cn));
  return solveLambertForm(store, s, n, store.mul(m, mu[1]), store.mul(m, shift), k);
}

/** Logarithmic kernels: one factor class (polynomial in log|f|), several combined linearly, or the Lambert class via f = ±e^ξ. */
function logGoals(store: ExpressionStore, g: Goal, kernels: readonly ExprId[], outside: boolean, stack: Goal[], fresh: (prefix: string) => string): void {
  const catalog = new Map<string, Polynomial<bigint>>();
  const args = kernels.map(k => factorLogArgument(store, (store.node(k) as { arg: ExprId }).arg, g.variable, catalog));
  if (args.some(a => a === undefined)) refuse(OWNERS.generators, 'log of an argument with irrational coefficients');
  const parsed = args as NonNullable<(typeof args)[number]>[];
  const keys = [...new Set(parsed.flatMap(a => [...a.factors.keys()]))];
  const push = (h: ExprId, level: ExprId, variable = g.variable, back = g.back) => stack.push({ h, level, variable, back, top: false, params: [] });
  if (keys.length === 1) {
    const f = factorExpression(store, catalog.get(keys[0]) as Polynomial<bigint>, g.variable);
    const xi = fresh('ξ'), y = store.symbol(xi);
    const logOf = (i: number) => store.add(store.log(store.number(parsed[i].unit)), store.mul(store.integer(parsed[i].factors.get(keys[0]) ?? 0n), y));
    const replaced = replaceSubexpressions(store, g.h, new Map(kernels.map((k, i) => [k, logOf(i)])));
    if (!outside) {
      // Polynomial in y = log|f|: then |f| = e^y, f = ±e^y.
      const r = solveRational(store, replaced, g.level, xi, false);
      if (r.kind === 'all') refuse(OWNERS.generators, 'an identity in the logarithm');
      for (const c of (r as { values: ExprId[] }).values) { push(f, store.exp(c)); push(f, store.neg(store.exp(c))); }
      return;
    }
    // Lambert class: f linear, f = σ·e^ξ for σ = ±1.
    const fc = polynomialCoefficients(store, f, g.variable);
    if (!fc || fc.length !== 2) refuse(CERTIFIED_NUMERICS, 'variable outside a logarithm of a non-linear factor');
    const [b0, a0] = fc as ExprId[];
    for (const sigma of [1, -1]) {
      const xOf = store.div(store.sub(store.mul(store.integer(sigma), store.exp(y)), b0), a0);
      const h = store.substitute(replaced, new Map([[g.variable, xOf]]));
      const back = store.substitute(g.back, new Map([[g.variable, xOf]]));
      push(h, g.level, xi, back);
    }
    return;
  }
  if (outside) refuse(CERTIFIED_NUMERICS, 'variable outside several logarithms');
  // Several factors: H − L must be affine in the logarithms with rational coefficients.
  const symbols = kernels.map(() => store.symbol(fresh('λ')));
  const affine = replaceSubexpressions(store, store.sub(g.h, g.level), new Map(kernels.map((k, i) => [k, symbols[i]])));
  const lin = linearForm(store, affine, symbols);
  if (!lin) return refuse(CERTIFIED_NUMERICS, 'logarithms combined non-linearly');
  const rest = lin.constant, coefficient = lin.coefficients;
  // Σⱼ aⱼ·log vⱼ = −rest; log vⱼ = log uⱼ + Σₖ eⱼₖ log|fₖ|.
  const a = symbols.map(sy => coefficient.get(sy) ?? store.integer(0));
  const ra = a.map(c => store.numberValue(c) ?? rationalRatio(store, c, store.integer(1)));
  if (ra.some(r => r === undefined)) refuse(OWNERS.parameters, 'non-rational multiple of a logarithm');
  let constant = store.neg(rest);
  parsed.forEach((p, j) => { constant = store.sub(constant, store.mul(a[j], store.log(store.number(p.unit)))); });
  const exponents = keys.map(key => parsed.reduce((acc, p, j) => store.add(acc, store.mul(a[j], store.integer(p.factors.get(key) ?? 0n))), store.integer(0)));
  const rationalExp = exponents.map(e => store.numberValue(e));
  if (rationalExp.every(e => e?.numerator === 0n)) {
    const z = provablyZero(store, constant);
    if (z === undefined) refuse(OWNERS.parameters, 'undecidable constant');
    if (z) refuse(OWNERS.generators, 'an identity among logarithms');
    return;
  }
  let lcm = 1n;
  for (const e of rationalExp) if (e) lcm = lcm * e.denominator / gcdBig(lcm, e.denominator);
  const product = store.mul(...keys.map((key, i) => store.pow(factorExpression(store, catalog.get(key) as Polynomial<bigint>, g.variable), store.integer((rationalExp[i] as { numerator: bigint; denominator: bigint }).numerator * (lcm / (rationalExp[i] as { denominator: bigint }).denominator)))));
  const K = store.exp(store.mul(store.integer(lcm), constant));
  push(product, K);
  push(product, store.neg(K));
}

/**
 * e = c₀ + Σ cᵢ·σᵢ with number-only cᵢ, for the given symbols σᵢ (explicit stack),
 * distributing numeric and constant factors over sums; undefined when not linear.
 */
export function linearForm(store: ExpressionStore, e: ExprId, symbols: readonly ExprId[]): { constant: ExprId; coefficients: Map<ExprId, ExprId> } | undefined {
  type Form = { constant: ExprId; coefficients: Map<ExprId, ExprId> };
  const forms = new Map<ExprId, Form | null>();
  const isSymbol = new Set(symbols);
  const scale = (f: Form, c: ExprId): Form => ({ constant: store.mul(c, f.constant), coefficients: new Map([...f.coefficients].map(([k, v]) => [k, store.mul(c, v)])) });
  for (const n of store.postorder([e])) {
    store.ctx.tick();
    const node = store.node(n), get = (c: ExprId) => forms.get(c) as Form | null;
    if (isSymbol.has(n)) { forms.set(n, { constant: store.integer(0), coefficients: new Map([[n, store.integer(1)]]) }); continue; }
    if (!store.freeSymbols(n).some(name => symbols.includes(store.symbol(name)))) {
      forms.set(n, store.freeSymbols(n).length ? null : { constant: n, coefficients: new Map() });
      continue;
    }
    if (node.kind === 'add') {
      const parts = node.args.map(get);
      if (parts.some(p => p === null)) { forms.set(n, null); continue; }
      const out: Form = { constant: store.integer(0), coefficients: new Map() };
      for (const p of parts as Form[]) {
        out.constant = store.add(out.constant, p.constant);
        for (const [k, v] of p.coefficients) out.coefficients.set(k, store.add(out.coefficients.get(k) ?? store.integer(0), v));
      }
      forms.set(n, out);
    } else if (node.kind === 'mul') {
      const parts = node.args.map(get);
      const linear = parts.filter(p => p !== null && p.coefficients.size > 0);
      if (parts.some(p => p === null) || linear.length !== 1) { forms.set(n, null); continue; }
      const factor = store.mul(...node.args.filter((_, i) => parts[i] !== linear[0]));
      forms.set(n, scale(linear[0] as Form, factor));
    } else forms.set(n, null);
  }
  return forms.get(e) ?? undefined;
}

function gcdBig(a: bigint, b: bigint): bigint { while (b) [a, b] = [b, a % b]; return a < 0n ? -a : a; }
