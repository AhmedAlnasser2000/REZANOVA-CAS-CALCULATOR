import { rational } from '../algebra/rational';
import type { ExprId, ExpressionStore } from '../representation/expression';
import { relationProblem, type Condition, type RelationProblem } from '../representation/relation';
import { normalizeSet, valueExpression, type EquationOutcome, type PointValue, type SolutionSet } from '../representation/solution-set';
import { ProofLogBuilder } from '../representation/transform';
import { coefficientsIn, constantValue, fractionOf, toExpression, type MPoly } from './mpoly';

/**
 * The shift test (polynomial decomposition with a linear inner component, P = f∘(x + s)): for a polynomial
 * equation P(x) = 0 of degree n ≥ 3 whose coefficients carry several parameters, with a rational leading coefficient
 * aₙ, the substitution x = t − s with s = aₙ₋₁/(n·aₙ) removes the tⁿ⁻¹ term (Tschirnhaus). When Q(t) = P(t − s) has
 * at most one parameter left ((x + a)¹³ − b → t¹³ − b, decided by exact cells at any degree), Q is decided instead and every value maps back by x = t − s, which is
 * increasing: a closed form v becomes v − s, and the i-th real root of Q the i-th real root of P. Cases are
 * conditions on the parameters only, so they carry over. Undefined when the test does not apply or does not reduce
 * the parameters; the verifier checks the outcome against the original problem like any other.
 */
export interface ShiftPlan { readonly sub: RelationProblem; readonly s: ExprId; readonly P: ExprId }

/** The shifted problem when the test applies and leaves at most one parameter (decided by exact cells). */
export function shiftPlan(problem: RelationProblem): ShiftPlan | undefined {
  const store = problem.store, ctx = store.ctx, x = problem.targets[0];
  if (problem.targets.length !== 1 || problem.parameters.length < 2 || problem.relations.length !== 1 || problem.relations[0].op !== 'eq'
    || problem.conditions.length || problem.formulas.length || problem.generators.length || problem.constraints.length) return undefined;
  const P = store.sub(problem.relations[0].lhs, problem.relations[0].rhs), vars = [x, ...problem.parameters];
  const f = fractionOf(store, P, vars);
  const constant = (m: MPoly) => [...m.terms.keys()].every(k => k.split(',').every(e => e === '0'));
  if (!f || !constant(f.den)) return undefined;
  const c = coefficientsIn(f.num, 0), n = c.length - 1;
  if (n < 3 || c[n].terms.size === 0 || !constant(c[n]) || c[n - 1].terms.size === 0) return undefined;
  // s = aₙ₋₁/(n·aₙ), a polynomial in the parameters (aₙ is a nonzero rational).
  const an = constantValue(ctx, c[n]);
  const s = store.mul(store.number(rational(ctx, an.denominator, an.numerator * BigInt(n))), toExpression(store, c[n - 1]));
  const shifted = fractionOf(store, store.substitute(P, new Map([[x, store.sub(store.symbol(x), s)]])), vars);
  if (!shifted) return undefined;
  const sub = relationProblem(store, { domain: problem.domain, targets: problem.targets, relations: [{ op: 'eq', lhs: toExpression(store, shifted.num), rhs: store.integer(0) }] });
  return sub.parameters.length <= 1 ? { sub, s, P } : undefined;
}

export function decideShifted(problem: RelationProblem, decide: (p: RelationProblem) => EquationOutcome): EquationOutcome | undefined {
  const plan = shiftPlan(problem);
  if (!plan) return undefined;
  const store = problem.store, out = decide(plan.sub), proof = new ProofLogBuilder(problem).build();
  if (out.kind === 'empty') return { kind: 'empty', proof };
  if (out.kind !== 'solved') return undefined;
  const mapped = mapSet(store, out.set, v => back(store, v, plan.s, plan.P, problem.targets[0]));
  return mapped ? { kind: 'solved', set: normalizeSet(store, mapped, problem.domain), proof } : undefined;
}

function back(store: ExpressionStore, v: PointValue, s: ExprId, P: ExprId, x: string): PointValue | undefined {
  if (v.kind === 'root') return v.variable === x ? { kind: 'root', poly: P, variable: x, index: v.index } : undefined;
  const id = v.kind === 'expression' ? v.id : valueExpression(store, v);
  return { kind: 'expression', id: store.sub(id, s) };
}

function mapSet(store: ExpressionStore, set: SolutionSet, f: (v: PointValue) => PointValue | undefined): SolutionSet | undefined {
  if (set.kind === 'finite') {
    const points = set.points.map(p => p.map(f));
    return points.every(p => p.every(v => v !== undefined)) ? { ...set, points: points as PointValue[][] } : undefined;
  }
  if (set.kind === 'case-tree') {
    const cases = set.cases.map(k => ({ conditions: k.conditions as readonly Condition[], set: mapSet(store, k.set, f) }));
    return cases.every(k => k.set !== undefined) ? { kind: 'case-tree', cases: cases as { conditions: readonly Condition[]; set: SolutionSet }[] } : undefined;
  }
  return undefined;
}
