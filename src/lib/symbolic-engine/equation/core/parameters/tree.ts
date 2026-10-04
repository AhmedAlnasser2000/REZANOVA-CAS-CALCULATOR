import { rational } from '../algebra/rational';
import type { ExprId, ExpressionStore } from '../representation/expression';
import type { Condition, RelationProblem } from '../representation/relation';
import { finiteSet, normalizeSet, setKey, type Interval, type PointValue, type SolutionSet } from '../representation/solution-set';
import type { AtomOperator } from '../decision/univariate';
import type { CellsResult, ParamCase } from './cells';
import { coefficientsIn, degreeIn, isZero, multiply, negate, positiveLead, scale, subtract, toExpression, type MPoly } from './mpoly';
import type { ParamAtom } from './specialize';

/**
 * Several parameters: a case tree of exhaustive sign splits (design rule 8).
 * Atoms free of the target become conditions (their failure is the empty
 * set). One atom in the target of degree ≤ 2 is decided by splitting on its
 * leading coefficient (= 0 recurses on the lower degree; over ℝ an order
 * relation also splits its sign) and, for degree 2, on the discriminant.
 * Over ℂ an equation of degree ≥ 3 is the set of roots of its polynomial.
 * Each condition is a polynomial sign condition in the parameters; a branch
 * may be empty as a region of parameters (deciding that is semialgebraic).
 */
export const SEMIALGEBRAIC = 'EQUATION-SEMIALGEBRAIC1';

const holds = (store: ExpressionStore, g: MPoly, op: AtomOperator): Condition => {
  const e = toExpression(store, op === 'eq' || op === 'ne' ? positiveLead(store.ctx, g) : g), m = () => toExpression(store, negate(store.ctx, g));
  switch (op) {
    case 'eq': return { kind: 'equal', expr: e, other: store.integer(0) };
    case 'ne': return { kind: 'nonzero', expr: e };
    case 'lt': return { kind: 'positive', expr: m() };
    case 'le': return { kind: 'nonnegative', expr: m() };
    case 'gt': return { kind: 'positive', expr: e };
    case 'ge': return { kind: 'nonnegative', expr: e };
  }
};
const NEGATION: Readonly<Record<AtomOperator, AtomOperator>> = { eq: 'ne', ne: 'eq', lt: 'ge', le: 'gt', gt: 'le', ge: 'lt' };

/** The sign of a polynomial without parameters, or undefined. */
function constantSign(g: MPoly): number | undefined {
  if (isZero(g)) return 0;
  if (g.terms.size !== 1) return undefined;
  const [[k, c]] = [...g.terms];
  return k.split(',').every(e => e === '0') ? (c.numerator < 0n ? -1 : 1) : undefined;
}
const truth = (op: AtomOperator, s: number) => ({ eq: s === 0, ne: s !== 0, lt: s < 0, le: s <= 0, gt: s > 0, ge: s >= 0 })[op];

export function decideTree(problem: RelationProblem, atoms: readonly ParamAtom[]): CellsResult {
  const store = problem.store, ctx = store.ctx, x = problem.targets[0], real = problem.domain === 'real';
  const inX = atoms.filter(a => degreeIn(a.poly, 0) > 0), free = atoms.filter(a => degreeIn(a.poly, 0) <= 0);
  if (inX.length > 1) return { kind: 'refused', reason: `${SEMIALGEBRAIC}: a conjunction of several relations in the target with several parameters` };
  const none = finiteSet([x], []);
  const all: SolutionSet = real ? { kind: 'intervals', variables: [x], intervals: [{ lo: { kind: 'infinity', sign: -1 }, hi: { kind: 'infinity', sign: 1 }, loClosed: false, hiClosed: false }] } : { kind: 'cofinite', variables: [x], except: [] };
  const cases: ParamCase[] = [];
  const emit = (conditions: readonly Condition[], set: SolutionSet): void => { cases.push({ conditions, set: set.kind === 'finite' || set.kind === 'cofinite' ? normalizeSet(store, set, problem.domain) : set }); };
  const val = (e: ExprId): PointValue => ({ kind: 'expression', id: e });
  const iv = (lo: PointValue | null, hi: PointValue | null, closed: boolean): Interval => ({
    lo: lo ?? { kind: 'infinity', sign: -1 }, hi: hi ?? { kind: 'infinity', sign: 1 }, loClosed: closed && lo !== null, hiClosed: closed && hi !== null,
  });
  const intervals = (...list: Interval[]): SolutionSet => ({ kind: 'intervals', variables: [x], intervals: list });
  const except = (...points: PointValue[]): SolutionSet => ({ kind: 'cofinite', variables: [x], except: points.map(p => [p]) });
  let refusal: string | undefined;

  /** The sign-of-leading-coefficient branches for degree d ≥ 1. */
  const generic = (conds: readonly Condition[], cs: readonly MPoly[], op: AtomOperator, s: number) => {
    const d = cs.length - 1, c = cs.map(k => toExpression(store, k));
    if (d === 1) {
      const r = val(store.div(store.neg(c[0]), c[1]));
      if (op === 'eq') return emit(conds, finiteSet([x], [[r]]));
      if (op === 'ne') return emit(conds, except(r));
      return emit(conds, intervals(s > 0 ? iv(null, r, op === 'le') : iv(r, null, op === 'le')));
    }
    if (d >= 3) {
      if (!real && op === 'eq') return emit(conds, { kind: 'root-set', variables: [x], poly: toExpression(store, coefficientsSum(cs)) });
      refusal = `${SEMIALGEBRAIC}: ${real ? 'real roots of degree ≥ 3' : 'excluding roots of degree ≥ 3'} with several parameters`;
      return;
    }
    const D = subtract(ctx, multiply(ctx, cs[1], cs[1]), scale(ctx, multiply(ctx, cs[2], cs[0]), rational(ctx, 4n)));
    const De = toExpression(store, D), twoA = store.mul(store.integer(2), c[2]);
    const r0 = val(store.div(store.neg(c[1]), twoA));
    const r = (sign: number) => val(store.div(store.add(store.neg(c[1]), store.mul(store.integer(sign), store.sqrt(De))), twoA));
    const setFor = (sd: number): SolutionSet => {
      if (op === 'eq') return sd < 0 ? none : sd === 0 ? finiteSet([x], [[r0]]) : finiteSet([x], [[r(-1)], [r(1)]]);
      if (op === 'ne') return sd < 0 ? all : sd === 0 ? except(r0) : except(r(-1), r(1));
      const lo = r(-s), hi = r(s), closed = op === 'le';
      if (s > 0) return sd < 0 ? none : sd === 0 ? (closed ? finiteSet([x], [[r0]]) : none) : intervals(iv(lo, hi, closed));
      return sd < 0 ? all : sd === 0 ? (closed ? all : except(r0)) : intervals(iv(null, lo, closed), iv(hi, null, closed));
    };
    const known = constantSign(D);
    if (known !== undefined) return emit(conds, setFor(real ? known : known === 0 ? 0 : 1));
    const branches: [number, Condition[], SolutionSet][] = real
      ? [[-1, [holds(store, D, 'lt')], setFor(-1)], [0, [holds(store, D, 'eq')], setFor(0)], [1, [holds(store, D, 'gt')], setFor(1)]]
      : [[0, [holds(store, D, 'eq')], setFor(0)], [1, [holds(store, D, 'ne')], setFor(1)]];
    const key = (b: [number, Condition[], SolutionSet]) => setKey(store, b[2]);
    if (branches.every(b => key(b) === key(branches[0]))) return emit(conds, branches[0][2]);
    if (real && key(branches[0]) === key(branches[1])) return (emit([...conds, holds(store, D, 'le')], setFor(-1)), emit([...conds, ...branches[2][1]], setFor(1)));
    if (real && key(branches[1]) === key(branches[2])) return (emit([...conds, ...branches[0][1]], setFor(-1)), emit([...conds, holds(store, D, 'ge')], setFor(1)));
    for (const [, extra, set] of branches) emit([...conds, ...extra], set);
  };

  const coefficientsSum = (cs: readonly MPoly[]): MPoly => cs.reduce((acc, k, i) => (i === 0 ? k : addX(acc, k, i)), cs[0]);
  const addX = (acc: MPoly, k: MPoly, i: number): MPoly => {
    const terms = new Map(acc.terms);
    for (const [key, v] of k.terms) {
      const e = key.split(',').map(Number); e[0] += i;
      terms.set(e.join(','), v);
    }
    return { vars: acc.vars, terms };
  };

  const solve = (conds: readonly Condition[], coefficients: readonly MPoly[], op: AtomOperator): void => {
    const cs = [...coefficients];
    while (cs.length && isZero(cs[cs.length - 1])) cs.pop();
    ctx.tick();
    if (cs.length <= 1) {
      const c0 = cs[0] ?? { vars: atoms[0].poly.vars, terms: new Map() }, k = constantSign(c0);
      if (k !== undefined) return emit(conds, truth(op, k) ? all : none);
      emit([...conds, holds(store, c0, op)], all);
      return emit([...conds, holds(store, c0, NEGATION[op])], none);
    }
    const lc = cs[cs.length - 1], k = constantSign(lc);
    if (k === undefined) solve([...conds, holds(store, lc, 'eq')], cs.slice(0, -1), op);
    const ordered = real && op !== 'eq' && op !== 'ne';
    if (k !== undefined) return generic(conds, cs, op, k);
    if (!ordered) return generic([...conds, holds(store, lc, 'ne')], cs, op, 0);
    generic([...conds, holds(store, lc, 'gt')], cs, op, 1);
    generic([...conds, holds(store, lc, 'lt')], cs, op, -1);
  };

  const params = (i: number, conds: readonly Condition[]): void => {
    if (i === free.length) {
      if (inX.length === 0) return emit(conds, all);
      let { poly, op } = inX[0];
      if (op === 'gt' || op === 'ge') { poly = negate(ctx, poly); op = op === 'gt' ? 'lt' : 'le'; }
      return solve(conds, coefficientsIn(poly, 0), op);
    }
    const { poly, op } = free[i], k = constantSign(poly);
    if (k !== undefined) return truth(op, k) ? params(i + 1, conds) : emit(conds, none);
    params(i + 1, [...conds, holds(store, poly, op)]);
    emit([...conds, holds(store, poly, NEGATION[op])], none);
  };
  params(0, []);
  return refusal ? { kind: 'refused', reason: refusal } : { kind: 'cases', cases };
}
