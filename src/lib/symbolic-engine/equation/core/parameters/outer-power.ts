import { rational } from '../algebra/rational';
import type { ExprId, ExpressionStore } from '../representation/expression';
import { relationProblem, type Condition, type RelationProblem } from '../representation/relation';
import { finiteSet, type EquationOutcome, type Point, type PointValue, type SolutionSet } from '../representation/solution-set';
import type { ParamCase } from './cells';
import { degreeIn, fractionOf } from './mpoly';

/**
 * Outer-power decomposition (polynomial decomposition with the outer component tⁿ): u(x)ⁿ = b over ℝ, with u
 * rational in the target and b free of it, is decided through u = w for a fresh parameter w instead of the
 * expanded equation of degree n·deg u:
 * - n odd: w ↦ wⁿ is a bijection of ℝ, so u = b^{1/n} (the real odd root): the cases and values of u = w with
 *   w replaced by b^{1/n};
 * - n even: b < 0 has no solutions; b = 0 is u = 0; b > 0 is u = w or u = −w with w = b^{1/n} > 0, the two case
 *   lists combined (conditions together, finite sets united).
 * Undefined when the problem is not of this shape. An inner refusal is returned as it is.
 */
export interface PowerPlan { readonly u: ExprId; readonly n: bigint; readonly b: ExprId }

export function outerPowerPlan(problem: RelationProblem): PowerPlan | undefined {
  const s = problem.store, x = problem.targets[0];
  if (problem.domain !== 'real' || problem.targets.length !== 1 || problem.relations.length !== 1 || problem.relations[0].op !== 'eq'
    || problem.conditions.some(c => c.kind !== 'in-domain' && s.freeSymbols('other' in c ? c.other : c.expr).includes(x)) || problem.formulas.length) return undefined;
  const { lhs, rhs } = problem.relations[0];
  for (const [side, other] of [[lhs, rhs], [rhs, lhs]] as const) {
    const node = s.node(side), n = node.kind === 'pow' ? s.numberValue(node.exponent) : undefined;
    if (node.kind !== 'pow' || !n || n.denominator !== 1n || n.numerator < 2n) continue;
    if (!s.freeSymbols(node.base).includes(x) || s.freeSymbols(other).includes(x)) continue;
    // Only where it helps: several parameters, and u not a polynomial of degree ≤ 1 in x (one parameter is decided by
    // exact cells, (a·x + c)ⁿ by binomial closed forms and the shift test).
    if (problem.parameters.length < 2 || affine(s, node.base, [x, ...problem.parameters])) return undefined;
    return { u: node.base, n: n.numerator, b: other };
  }
  return undefined;
}

type Inner = { conditions: readonly Condition[]; set: SolutionSet }[];

const wholeLine = (set: SolutionSet) => set.kind === 'intervals' && set.intervals.length === 1 && set.intervals[0].lo.kind === 'infinity' && set.intervals[0].hi.kind === 'infinity';

/** The inner answer as cases whose sets are finite, cofinite or the whole line (what one equation gives). */
function innerCases(out: EquationOutcome, targets: readonly string[]): Inner | undefined {
  if (out.kind === 'empty') return [{ conditions: [], set: finiteSet(targets, []) }];
  if (out.kind !== 'solved') return undefined;
  const list: Inner = out.set.kind === 'case-tree' ? [...out.set.cases] : [{ conditions: [], set: out.set }];
  return list.every(c => c.set.kind === 'finite' || c.set.kind === 'cofinite' || wholeLine(c.set)) ? list : undefined;
}

/** A ∪ B for the inner shapes, when exact without deciding parametric equalities; undefined otherwise. */
function unite(a: SolutionSet, b: SolutionSet, targets: readonly string[]): SolutionSet | undefined {
  if (wholeLine(a)) return a;
  if (wholeLine(b)) return b;
  if (a.kind === 'finite' && b.kind === 'finite') return finiteSet(targets, [...a.points, ...b.points]);
  return undefined;
}

/**
 * `cases` when decided, `refused` with the inner typed refusal, `fallback` when the decomposition cannot express the
 * answer (the slice then takes the route it would have taken without it, so nothing that was decided is lost).
 */
export type PowerResult = { readonly cases: ParamCase[] } | { readonly refused: EquationOutcome } | { readonly fallback: true };

export function decideOuterPower(problem: RelationProblem, decide: (p: RelationProblem) => EquationOutcome): PowerResult | undefined {
  const plan = outerPowerPlan(problem);
  if (!plan) return undefined;
  const s = problem.store, used = new Set([...problem.targets, ...problem.parameters]);
  let name = 'ϖ';
  for (let i = 1; used.has(name); i++) name = `ϖ${i}`;
  const w = s.symbol(name), root = s.pow(plan.b, s.number(rational(s.ctx, 1n, plan.n)));
  const inner = (level: ExprId, conditions: Condition[] = []) => decide(relationProblem(s, { domain: 'real', targets: problem.targets, relations: [{ op: 'eq', lhs: plan.u, rhs: level }], conditions }));
  const settle = (out: EquationOutcome): PowerResult => (out.kind === 'solved' || out.kind === 'empty' ? { fallback: true } : { refused: out });
  const point = (p: Point): Point => p.map(v => substituteValue(s, v, name, root));
  const mapSet = (set: SolutionSet): SolutionSet => (set.kind === 'cofinite' ? { ...set, except: set.except.map(point) } : set.kind === 'finite' ? { ...set, points: set.points.map(point) } : set);
  const back = (cs: Inner, extra: Condition[]): ParamCase[] => cs.map(c => ({ conditions: [...extra, ...c.conditions.map(k => substituteCondition(s, k, name, root))], set: mapSet(c.set) }));
  if (plan.n % 2n === 1n) {
    const out = inner(w), cs = innerCases(out, problem.targets);
    return cs ? { cases: back(cs, []) } : settle(out);
  }
  const positive: Condition = { kind: 'positive', expr: w };
  const plus = inner(w, [positive]), minus = inner(s.neg(w), [positive]), zero = inner(s.integer(0));
  const [p, m, z] = [innerCases(plus, problem.targets), innerCases(minus, problem.targets), innerCases(zero, problem.targets)];
  if (!p) return settle(plus);
  if (!m) return settle(minus);
  if (!z) return settle(zero);
  // u = w or u = −w, case by case.
  const both: Inner = [];
  for (const a of p) for (const c of m) {
    const set = unite(a.set, c.set, problem.targets);
    if (!set) return { fallback: true };
    both.push({ conditions: [...a.conditions, ...c.conditions], set });
  }
  return {
    cases: [
      { conditions: [{ kind: 'positive', expr: s.neg(plan.b) }], set: finiteSet(problem.targets, []) },
      ...back(z, [{ kind: 'equal', expr: plan.b, other: s.integer(0) }]),
      ...back(both, [{ kind: 'positive', expr: plan.b }]),
    ],
  };
}

function substituteCondition(s: ExpressionStore, c: Condition, name: string, value: ExprId): Condition {
  const at = (e: ExprId) => s.substitute(e, new Map([[name, value]]));
  return ('other' in c ? { ...c, expr: at(c.expr), other: at(c.other) } : { ...c, expr: at(c.expr) }) as Condition;
}

function substituteValue(s: ExpressionStore, v: PointValue, name: string, value: ExprId): PointValue {
  if (v.kind === 'expression') return { kind: 'expression', id: s.substitute(v.id, new Map([[name, value]])) };
  if (v.kind === 'root') return { ...v, poly: s.substitute(v.poly, new Map([[name, value]])) };
  return v;
}

function affine(s: ExpressionStore, u: ExprId, vars: readonly string[]): boolean {
  const f = fractionOf(s, u, vars);
  return f !== undefined && [...f.den.terms.keys()].every(k => k.split(',').every(e => e === '0')) && degreeIn(f.num, 0) <= 1;
}
