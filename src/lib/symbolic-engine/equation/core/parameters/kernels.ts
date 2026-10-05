import { rational } from '../algebra/rational';
import { OWNERS } from '../decision/rational-form';
import type { AtomOperator } from '../decision/univariate';
import { realSign } from '../representation/real-order';
import { isSymbolName, type ExprId, type ExpressionStore } from '../representation/expression';
import type { Condition, RelationProblem } from '../representation/relation';
import { finiteSet, type Interval, type PointValue, type SolutionSet } from '../representation/solution-set';
import type { CellsResult, ParamCase } from './cells';
import { add, coefficientsIn, degreeIn, fractionOf, multiply, negate, scale, subtract, toExpression, type MPoly } from './mpoly';
import { constantSign, holds } from './tree';

/**
 * One kernel of the target with parameters, over ℝ: c₁·f(L) + c₀ op 0 with
 * f ∈ {exp, log, sin, cos, |·|, u^{1/q}}, L = (α·x + β)/δ affine in x, and every
 * coefficient a polynomial (or quotient) in the parameters.
 *
 * The case tree splits, in order: the denominators (≠ 0); α (= 0 makes the
 * relation free of x: its truth, possibly transcendental, is the condition);
 * the level coefficient a₁ (= 0: the domain of f(L) or ∅; for an order its
 * sign orients t = f(L) against τ = −a₀/a₁); the range of f at τ, through
 * polynomial conditions on a₀, a₁ (τ > 0 ⇔ −a₀·a₁ > 0, |τ| < 1 ⇔ a₀² < a₁²,
 * τ = ±1 ⇔ a₀ ± a₁ = 0); and sign(α·δ), which orients intervals and fixes the
 * period 2π·|δ/α| of trig families. Equations and ≠ invert every kernel;
 * inequalities invert the monotone ones (exp, log, roots) and |·|.
 */
type Range = 'eq' | 'ne' | 'lt' | 'le' | 'gt' | 'ge';
/** A set in L-space: values are expressions in the parameters. */
type LSet =
  | { readonly kind: 'none' } | { readonly kind: 'all' }
  | { readonly kind: 'points'; readonly values: readonly ExprId[] }
  | { readonly kind: 'except'; readonly values: readonly ExprId[] }
  | { readonly kind: 'intervals'; readonly list: readonly (readonly [ExprId | null, ExprId | null, boolean, boolean])[] }
  /** {ℓ₁ < … < ℓₖ} + 2πℤ, or (arcs) its complement. */
  | { readonly kind: 'family' | 'arcs'; readonly values: readonly ExprId[] };

const KERNELS = new Set(['exp', 'log', 'sin', 'cos', 'abs']);
const refusal = (detail: string): CellsResult => ({ kind: 'refused', reason: `${OWNERS.parameters}: ${detail}` });

function replaceNode(store: ExpressionStore, root: ExprId, target: ExprId, by: ExprId): ExprId {
  const mapped = new Map<ExprId, ExprId>();
  for (const n of store.postorder([root])) {
    const node = store.node(n), m = (c: ExprId) => mapped.get(c) as ExprId;
    let out: ExprId = n;
    if (n === target) out = by;
    else if (node.kind === 'add') out = store.add(...node.args.map(m));
    else if (node.kind === 'mul') out = store.mul(...node.args.map(m));
    else if (node.kind === 'pow') out = store.pow(m(node.base), m(node.exponent));
    else if (node.kind === 'apply') out = store.apply(node.fn, m(node.arg));
    mapped.set(n, out);
  }
  return mapped.get(root) as ExprId;
}

export function decideKernels(problem: RelationProblem): CellsResult {
  const store = problem.store, ctx = store.ctx, x = problem.targets[0], params = problem.parameters;
  if (problem.domain !== 'real') return refusal('kernels of the target with parameters over ℂ (follow-up ledger)');
  if (problem.relations.length !== 1 || problem.conditions.length) return refusal('a conjunction with a kernel of the target and parameters (follow-up ledger)');
  const r = problem.relations[0], E = store.sub(r.lhs, r.rhs), op = r.op as AtomOperator;
  // The kernel: one distinct function or root of the target, with the target nowhere else.
  const kernels = new Set<ExprId>();
  for (const n of store.postorder([E])) {
    const node = store.node(n);
    if (node.kind === 'apply' && store.freeSymbols(node.arg).includes(x)) {
      if (!KERNELS.has(node.fn)) return refusal(`${node.fn} of the target with parameters (follow-up ledger)`);
      kernels.add(n);
    }
    if (node.kind === 'pow' && store.freeSymbols(node.exponent).includes(x)) return refusal('the target in an exponent with parameters (follow-up ledger)');
    if (node.kind === 'pow' && store.freeSymbols(node.base).includes(x)) {
      const e = store.numberValue(node.exponent);
      if (e && e.denominator !== 1n) {
        if (e.numerator !== 1n) return refusal('a non-unit rational power of the target with parameters (follow-up ledger)');
        kernels.add(n);
      }
    }
  }
  if (kernels.size !== 1) return refusal('mixed or nested kernels of the target with parameters (follow-up ledger)');
  const [K] = kernels, kn = store.node(K);
  const f = kn.kind === 'apply' ? kn.fn : 'root', q = kn.kind === 'pow' ? (store.numberValue(kn.exponent) as { denominator: bigint }).denominator : 1n;
  const Lid = kn.kind === 'apply' ? kn.arg : (kn as { base: ExprId }).base;
  let t = 't';
  for (let i = 1; !isSymbolName(t) || store.freeSymbols(E).includes(t) || t === x || params.includes(t); i++) t = `t${i}`;
  const level = fractionOf(store, replaceNode(store, E, K, store.symbol(t)), [t, ...params]);
  if (!level) return refusal('the target outside its kernel with parameters (mixed kernels, follow-up ledger)');
  if (degreeIn(level.den, 0) > 0 || degreeIn(level.num, 0) > 1) return refusal('a kernel level of degree ≥ 2 with parameters (follow-up ledger)');
  const arg = fractionOf(store, Lid, [x, ...params]);
  if (!arg || degreeIn(arg.den, 0) > 0 || degreeIn(arg.num, 0) > 1) return refusal('a kernel argument that is not affine in the target (follow-up ledger)');
  if ((f === 'sin' || f === 'cos') && op !== 'eq' && op !== 'ne') return refusal('sin/cos inequalities with parameters (follow-up ledger)');

  const zeroOf = (vars: readonly string[]): MPoly => ({ vars, terms: new Map() });
  const [C0 = zeroOf(level.num.vars), A = zeroOf(level.num.vars)] = coefficientsIn(level.num, 0), D = level.den;
  const [beta = zeroOf(arg.num.vars), alpha = zeroOf(arg.num.vars)] = coefficientsIn(arg.num, 0), delta = arg.den;
  const ordered = op === 'lt' || op === 'le';
  const a1 = ordered ? multiply(ctx, A, D) : A, a0 = ordered ? multiply(ctx, C0, D) : C0;
  const P = (g: MPoly) => toExpression(store, g), alphaE = P(alpha), betaE = P(beta), deltaE = P(delta);
  const tau = store.div(store.neg(P(a0)), P(a1));
  /** sign(τ − c) = sign((−a₀ − c·a₁)·a₁). */
  const tauVs = (c: bigint) => multiply(ctx, subtract(ctx, negate(ctx, a0), scale(ctx, a1, rational(ctx, c))), a1);

  const cases: ParamCase[] = [];
  const none = finiteSet([x], []);
  const line: Interval = { lo: { kind: 'infinity', sign: -1 }, hi: { kind: 'infinity', sign: 1 }, loClosed: false, hiClosed: false };
  const all: SolutionSet = { kind: 'intervals', variables: [x], intervals: [line] };
  const emit = (conditions: readonly Condition[], set: SolutionSet): void => { cases.push({ conditions, set }); };
  const GROUP_OP: Readonly<Record<string, AtomOperator | undefined>> = { '-1': 'lt', '0': 'eq', '1': 'gt', '-1,0': 'le', '0,1': 'ge', '-1,1': 'ne', '-1,0,1': undefined };
  /** Branch on the sign of g, one branch per group of signs (groups partition the possible signs). */
  const bySign = (conds: readonly Condition[], g: MPoly, groups: readonly (readonly number[])[], then: (conds: readonly Condition[], group: number) => void) => {
    const k = constantSign(g);
    groups.forEach((group, i) => {
      if (k !== undefined) { if (group.includes(k)) then(conds, i); return; }
      const cop = GROUP_OP[group.join(',')];
      then(cop ? [...conds, holds(store, g, cop)] : conds, i);
    });
  };

  // ---- from L-space to x ----
  const xOf = (l: ExprId) => store.div(store.sub(store.mul(deltaE, l), betaE), alphaE);
  const val = (e: ExprId): PointValue => ({ kind: 'expression', id: e });
  const mapToX = (conds: readonly Condition[], set: LSet): void => {
    if (set.kind === 'none') return emit(conds, none);
    if (set.kind === 'all') return emit(conds, all);
    if (set.kind === 'points') return emit(conds, finiteSet([x], set.values.map(v => [val(xOf(v))])));
    if (set.kind === 'except') return emit(conds, { kind: 'cofinite', variables: [x], except: set.values.map(v => [val(xOf(v))]) });
    bySign(conds, multiply(ctx, alpha, delta), [[1], [-1]], (c, i) => {
      const up = i === 0;
      if (set.kind === 'intervals') {
        const ends = set.list.map(([lo, hi, lc, hc]): Interval => {
          const a = lo === null ? null : val(xOf(lo)), b = hi === null ? null : val(xOf(hi));
          const [l, h, lcl, hcl] = up ? [a, b, lc, hc] : [b, a, hc, lc];
          return { lo: l ?? { kind: 'infinity', sign: -1 }, hi: h ?? { kind: 'infinity', sign: 1 }, loClosed: l !== null && lcl, hiClosed: h !== null && hcl };
        });
        return emit(c, { kind: 'intervals', variables: [x], intervals: up ? ends : [...ends].reverse() });
      }
      const period = store.mul(store.integer(up ? 2 : -2), store.constant('pi'), store.div(deltaE, alphaE));
      const pts = set.values.map(xOf);
      const components: Interval[] = set.kind === 'family'
        ? pts.map(v => ({ lo: val(v), hi: val(v), loClosed: true, hiClosed: true }))
        : set.values.map((v, j) => {
          const next = j + 1 < set.values.length ? set.values[j + 1] : store.add(set.values[0], store.mul(store.integer(2), store.constant('pi')));
          const [l, h] = up ? [xOf(v), xOf(next)] : [xOf(next), xOf(v)];
          return { lo: val(l), hi: val(h), loClosed: false, hiClosed: false };
        });
      emit(c, { kind: 'periodic-set', variables: [x], period: val(period), components, range: line });
    });
  };

  // ---- inversion of f(L) rel τ ----
  const domain: LSet = f === 'log' ? { kind: 'intervals', list: [[store.integer(0), null, false, false]] }
    : f === 'root' && q % 2n === 0n ? { kind: 'intervals', list: [[store.integer(0), null, true, false]] } : { kind: 'all' };
  const interval = (lo: ExprId | null, hi: ExprId | null, lc: boolean, hc: boolean): LSet => ({ kind: 'intervals', list: [[lo, hi, lc, hc]] });
  const invert = (conds: readonly Condition[], rel: Range): void => {
    const closed = rel === 'le' || rel === 'ge', below = rel === 'lt' || rel === 'le';
    const positive = tauVs(0n);
    switch (f) {
      case 'exp': {
        const l = store.log(tau);
        return bySign(conds, positive, [[1], [-1, 0]], (c, i) => mapToX(c, i === 1
          ? { kind: rel === 'ne' || rel === 'gt' || rel === 'ge' ? 'all' : 'none' }
          : rel === 'eq' ? { kind: 'points', values: [l] } : rel === 'ne' ? { kind: 'except', values: [l] } : below ? interval(null, l, false, closed) : interval(l, null, closed, false)));
      }
      case 'log': {
        const l = store.exp(tau), z = store.integer(0);
        return mapToX(conds, rel === 'eq' ? { kind: 'points', values: [l] } : rel === 'ne' ? { kind: 'intervals', list: [[z, l, false, false], [l, null, false, false]] }
          : below ? interval(z, l, false, closed) : interval(l, null, closed, false));
      }
      case 'root': {
        const l = store.pow(tau, store.integer(q)), z = store.integer(0);
        if (q % 2n === 1n) {
          return mapToX(conds, rel === 'eq' ? { kind: 'points', values: [l] } : rel === 'ne' ? { kind: 'except', values: [l] } : below ? interval(null, l, false, closed) : interval(l, null, closed, false));
        }
        // Even root: t = L^{1/q} ≥ 0 on L ≥ 0.
        return bySign(conds, positive, [[1], [0], [-1]], (c, i) => {
          const sign = [1, 0, -1][i];
          if (rel === 'eq') return mapToX(c, sign >= 0 ? { kind: 'points', values: [l] } : { kind: 'none' });
          if (rel === 'ne') return mapToX(c, sign > 0 ? { kind: 'intervals', list: [[z, l, true, false], [l, null, false, false]] } : sign === 0 ? interval(z, null, false, false) : domain);
          if (below) return mapToX(c, sign > 0 ? interval(z, l, true, closed) : sign === 0 && closed ? { kind: 'points', values: [z] } : { kind: 'none' });
          return mapToX(c, sign > 0 ? interval(l, null, closed, false) : sign === 0 ? interval(z, null, closed, false) : domain);
        });
      }
      case 'abs': {
        const m = store.neg(tau), z = store.integer(0);
        return bySign(conds, positive, [[1], [0], [-1]], (c, i) => {
          const sign = [1, 0, -1][i];
          if (rel === 'eq') return mapToX(c, sign > 0 ? { kind: 'points', values: [m, tau] } : sign === 0 ? { kind: 'points', values: [z] } : { kind: 'none' });
          if (rel === 'ne') return mapToX(c, sign > 0 ? { kind: 'except', values: [m, tau] } : sign === 0 ? { kind: 'except', values: [z] } : { kind: 'all' });
          if (below) return mapToX(c, sign > 0 ? interval(m, tau, closed, closed) : sign === 0 && closed ? { kind: 'points', values: [z] } : { kind: 'none' });
          return mapToX(c, sign > 0 ? { kind: 'intervals', list: [[null, m, false, closed], [tau, null, closed, false]] } : sign === 0 && !closed ? { kind: 'except', values: [z] } : { kind: 'all' });
        });
      }
      default: {
        // sin, cos: = and ≠ only. |τ| < 1, τ = 1, τ = −1, |τ| > 1 partition the reals.
        const pi = store.constant('pi'), half = store.mul(store.fraction(1, 2), pi);
        const inside = subtract(ctx, multiply(ctx, a0, a0), multiply(ctx, a1, a1));
        const fam = (values: ExprId[]): LSet => ({ kind: rel === 'eq' ? 'family' : 'arcs', values });
        const outside: LSet = { kind: rel === 'eq' ? 'none' : 'all' };
        const arc = f === 'sin' ? store.apply('asin', tau) : store.apply('acos', tau);
        bySign(conds, inside, [[-1], [1]], (c, i) => mapToX(c, i === 0 ? fam(f === 'sin' ? [arc, store.sub(pi, arc)] : [store.neg(arc), arc]) : outside));
        // τ = 1 ⇔ a₀ + a₁ = 0 and τ = −1 ⇔ a₀ − a₁ = 0 (given a₁ ≠ 0; each implies a₀² = a₁²).
        const at = (g: MPoly, value: ExprId) => {
          const k = constantSign(g);
          if (k !== undefined) { if (k === 0) mapToX(conds, fam([value])); return; }
          mapToX([...conds, holds(store, g, 'eq')], fam([value]));
        };
        at(add(ctx, a0, a1), f === 'sin' ? half : store.integer(0));
        at(subtract(ctx, a0, a1), f === 'sin' ? store.neg(half) : pi);
      }
    }
  };

  // ---- the tree ----
  const level0 = (conds: readonly Condition[]) => {
    // a₁ = 0: the relation reads a₀ op 0; true gives the domain of the kernel.
    const opFor: AtomOperator = op;
    bySign(conds, a0, [[0], [-1], [1]], (c, i) => {
      const sign = [0, -1, 1][i];
      const holdsHere = { eq: sign === 0, ne: sign !== 0, lt: sign < 0, le: sign <= 0, gt: sign > 0, ge: sign >= 0 }[opFor];
      if (holdsHere) mapToX(c, domain); else emit(c, none);
    });
  };
  const leveled = (conds: readonly Condition[]) => {
    bySign(conds, a1, ordered ? [[0], [1], [-1]] : [[0], [-1, 1]], (c, i) => {
      if (i === 0) return level0(c);
      const flip = ordered && i === 2;
      const rel: Range = !ordered ? (op as Range) : flip ? (op === 'lt' ? 'gt' : 'ge') : (op as Range);
      invert(c, rel);
    });
  };
  const xFree = (conds: readonly Condition[]) => {
    // α = 0: L = β/δ, so the relation does not involve the target.
    const E0 = store.substitute(E, new Map([[x, store.integer(0)]]));
    const relCond: Condition = op === 'eq' ? { kind: 'equal', expr: E0, other: store.integer(0) } : op === 'ne' ? { kind: 'nonzero', expr: E0 }
      : op === 'lt' ? { kind: 'positive', expr: store.neg(E0) } : { kind: 'nonnegative', expr: store.neg(E0) };
    const negCond: Condition = op === 'eq' ? { kind: 'nonzero', expr: E0 } : op === 'ne' ? { kind: 'equal', expr: E0, other: store.integer(0) }
      : op === 'lt' ? { kind: 'nonnegative', expr: E0 } : { kind: 'positive', expr: E0 };
    const bd = multiply(ctx, beta, delta);
    const domainCond = f === 'log' ? holds(store, bd, 'gt') : f === 'root' && q % 2n === 0n ? holds(store, bd, 'ge') : undefined;
    const known = store.freeSymbols(E0).length === 0 && (domainCond === undefined || constantSign(bd) !== undefined) ? exactTruth(store, E0, op) : undefined;
    const withDomain = (more: readonly Condition[]) => (domainCond ? [...conds, domainCond, ...more] : [...conds, ...more]);
    if (known !== undefined) {
      const inDomain = domainCond === undefined || (f === 'log' ? (constantSign(bd) as number) > 0 : (constantSign(bd) as number) >= 0);
      return emit(conds, known && inDomain ? all : none);
    }
    emit(withDomain([relCond]), all);
    emit(withDomain([negCond]), none);
    if (domainCond) emit([...conds, holds(store, bd, f === 'log' ? 'le' : 'lt')], none);
  };

  const denominators = [D, delta];
  const nonzero = (i: number, conds: readonly Condition[]): void => {
    if (i === denominators.length) {
      return bySign(conds, alpha, [[0], [-1, 1]], (c, j) => (j === 0 ? xFree(c) : leveled(c)));
    }
    bySign(conds, denominators[i], [[-1, 1], [0]], (c, j) => (j === 0 ? nonzero(i + 1, c) : emit(c, none)));
  };
  nonzero(0, []);
  ctx.tick();
  return { kind: 'cases', cases };
}

/** The truth of e op 0 for a number-only expression, by certified sign. */
function exactTruth(store: ExpressionStore, e: ExprId, op: AtomOperator): boolean {
  const s = realSign(store, e);
  return { eq: s === 0, ne: s !== 0, lt: s < 0, le: s <= 0, gt: s > 0, ge: s >= 0 }[op];
}
