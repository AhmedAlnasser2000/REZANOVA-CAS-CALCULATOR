import { demand, EquationAlgebraError } from '../execution';
import { exactPolynomial, OWNERS, rationalForm, type Refusal } from '../decision/rational-form';
import { domainBases } from '../decision/rules';
import { decidePolynomialProblem } from '../decision/solve';
import { decideGeneratorProblem } from '../generators/solve';
import { sortedDistinct } from '../decision/real-set';
import type { AtomOperator } from '../decision/univariate';
import { zerosOf } from '../decision/univariate';
import { evaluateExact, type ExactValue } from '../representation/evaluate';
import type { ExprId, ExpressionStore } from '../representation/expression';
import { relationProblem, type Condition, type ProblemDomain, type RelationProblem } from '../representation/relation';
import {
  compareEndpoints, finiteSet, normalizeSet, type Endpoint, type Interval, type Point, type PointValue, type SolutionSet,
} from '../representation/solution-set';
import { fractionOf, multiply, positiveLead, type MPoly } from './mpoly';

/**
 * The parameters gate's view of a problem: every relation, condition and
 * natural-domain base as a polynomial atom P(x, p…) op 0 over ℚ, and the
 * specialization of a problem or a parametric set at given parameter values.
 */
export interface ParamAtom { readonly poly: MPoly; readonly op: AtomOperator }

const CONDITION_OPERATOR: Readonly<Record<string, AtomOperator>> = { nonzero: 'ne', positive: 'gt', nonnegative: 'ge', equal: 'eq', 'not-equal': 'ne' };

function expressions(p: RelationProblem): ExprId[] {
  return [...p.relations.flatMap(r => [r.lhs, r.rhs]), ...p.conditions.flatMap(c => ('other' in c ? [c.expr, c.other] : [c.expr]))];
}

/**
 * Atoms over the variables [target, …parameters]: e op 0 with e = n/d becomes
 * n op 0 (= and ≠) or n·d op 0 (orders); every base b of a non-positive
 * power adds num(b) ≠ 0. Anything that is not a rational function of the
 * target and the parameters is refused (part B owns kernels and constants).
 */
export function parametricAtoms(problem: RelationProblem): { readonly vars: readonly string[]; readonly atoms: readonly ParamAtom[] } | Refusal {
  const s = problem.store, vars = [problem.targets[0], ...problem.parameters], atoms: ParamAtom[] = [];
  const add = (e: ExprId, op: AtomOperator): boolean => {
    const f = fractionOf(s, e, vars);
    if (!f) return false;
    atoms.push({ poly: op === 'eq' || op === 'ne' ? positiveLead(s.ctx, f.num) : multiply(s.ctx, f.num, f.den), op });
    return true;
  };
  const refusal = { owner: OWNERS.parameters, detail: 'transcendental constants or functions of the parameters together with parameters (follow-up ledger)' };
  for (const r of problem.relations) if (!add(s.sub(r.lhs, r.rhs), r.op)) return refusal;
  for (const c of problem.conditions as readonly Condition[]) {
    if (c.kind === 'in-domain') continue;
    if (!add('other' in c ? s.sub(c.expr, c.other) : c.expr, CONDITION_OPERATOR[c.kind])) return refusal;
  }
  for (const b of domainBases(s, expressions(problem))) {
    const f = fractionOf(s, b, vars);
    if (!f) return refusal;
    atoms.push({ poly: positiveLead(s.ctx, f.num), op: 'ne' });
  }
  return { vars, atoms };
}

/** The problem with the parameters replaced by values (expressions without free symbols). */
export function specializedProblem(problem: RelationProblem, values: ReadonlyMap<string, ExprId>): RelationProblem {
  const s = problem.store, sub = (e: ExprId) => s.substitute(e, values);
  return relationProblem(s, {
    domain: problem.domain, targets: problem.targets,
    relations: problem.relations.map(r => ({ op: r.op, lhs: sub(r.lhs), rhs: sub(r.rhs) })),
    conditions: problem.conditions.map(c => ('other' in c ? { kind: c.kind, expr: sub(c.expr), other: sub(c.other) } : { kind: c.kind, expr: sub(c.expr) }) as Condition),
  });
}

export type Specialized = { readonly kind: 'set'; readonly set: SolutionSet } | { readonly kind: 'refused'; readonly reason: string };

/** Whether the target occurs inside a function, a non-integer power, or an exponent. */
export function targetInKernel(problem: RelationProblem): boolean {
  const s = problem.store, x = problem.targets[0];
  const roots = [...problem.relations.flatMap(r => [r.lhs, r.rhs]), ...problem.conditions.flatMap(c => ('other' in c ? [c.expr, c.other] : [c.expr]))];
  return s.postorder(roots).some(n => {
    const node = s.node(n);
    if (node.kind === 'apply') return s.freeSymbols(node.arg).includes(x);
    if (node.kind !== 'pow') return false;
    const e = s.numberValue(node.exponent);
    return s.freeSymbols(node.exponent).includes(x) || (s.freeSymbols(node.base).includes(x) && (e === undefined || e.denominator !== 1n));
  });
}

/** Decide the specialized problem with the slice that owns it: its canonical set (the empty set as finite {}). */
export function decideAt(problem: RelationProblem, values: ReadonlyMap<string, ExprId>): Specialized {
  const sp = specializedProblem(problem, values);
  if (sp.parameters.length) return { kind: 'refused', reason: 'specialization left free symbols' };
  const o = targetInKernel(sp) ? decideGeneratorProblem(sp) : decidePolynomialProblem(sp);
  if (o.kind === 'resource') {
    // The context keeps its stop: re-raise it unchanged.
    problem.store.ctx.checkCancelled();
    demand(false, 'verification-failed', 'a resource outcome without a stopped context');
  }
  if (o.kind === 'empty') return { kind: 'set', set: finiteSet(problem.targets, []) };
  if (o.kind !== 'solved') return { kind: 'refused', reason: o.reason };
  return { kind: 'set', set: canonical(problem.store, o.set, problem.domain) };
}

/** Normal form for comparisons: an empty or all-point interval union becomes a finite set. */
export function canonical(store: ExpressionStore, set: SolutionSet, domain: ProblemDomain): SolutionSet {
  let n = normalizeSet(store, set, domain);
  if (n.kind === 'cofinite' && domain === 'real') {
    // ℝ minus sorted points: the open gaps between them.
    const ends: Endpoint[] = [{ kind: 'infinity', sign: -1 }, ...n.except.map(p => p[0]), { kind: 'infinity', sign: 1 }];
    n = normalizeSet(store, { kind: 'intervals', variables: n.variables, intervals: ends.slice(1).map((hi, i) => ({ lo: ends[i], hi, loClosed: false, hiClosed: false })) }, domain);
  }
  if (n.kind === 'intervals' && n.intervals.every(i => i.loClosed && i.hiClosed && compareEndpoints(store, i.lo, i.hi) === 0)) {
    return normalizeSet(store, finiteSet(n.variables, n.intervals.map(i => [i.lo as PointValue])), domain);
  }
  return n;
}

class Mismatch extends Error {}

/** Distinct zeros in x of a polynomial expression after substitution, sorted when real. */
function rootsAt(store: ExpressionStore, poly: ExprId, variable: string, values: ReadonlyMap<string, ExprId>, domain: ProblemDomain): ExactValue[] {
  const r = rationalForm(store, store.substitute(poly, values), variable);
  if (!r.ok) throw new Mismatch();
  const e = exactPolynomial(store, r.form.num, domain);
  if (e.kind !== 'ok') throw new Mismatch();
  if (e.poly.kind === 'rational' ? e.poly.poly.coefficients.length === 0 : e.poly.coefficients.length === 0) throw new Mismatch();
  const zs = zerosOf(store, e.poly, domain);
  return domain === 'real' ? sortedDistinct(store, zs) : zs;
}

/**
 * A parametric set at given parameter values, in canonical form; undefined
 * when it is not defined there (a vanishing denominator, a missing root index,
 * a reversed interval). Root-sets become their finite sets of roots.
 */
export function instantiate(store: ExpressionStore, set: SolutionSet, values: ReadonlyMap<string, ExprId>, domain: ProblemDomain): SolutionSet | undefined {
  const value = (v: PointValue): PointValue => {
    if (v.kind === 'root') {
      const zs = rootsAt(store, v.poly, v.variable, values, 'real');
      if (v.index > zs.length) throw new Mismatch();
      return zs[v.index - 1];
    }
    if (v.kind !== 'expression') return v;
    const id = store.substitute(v.id, values), e = evaluateExact(store, id, domain);
    if (e.kind === 'exact') return e.value;
    // A closed form that is not algebraic (ln 2, asin(1/3)) stays an expression; it must still be defined.
    if (e.kind === 'not-exact' && e.reason === 'transcendental' && store.freeSymbols(id).length === 0) return { kind: 'expression', id };
    throw new Mismatch();
  };
  const end = (e: Endpoint): Endpoint => (e.kind === 'infinity' ? e : value(e));
  const point = (p: Point): Point => p.map(value);
  const walk = (s: SolutionSet): SolutionSet => {
    switch (s.kind) {
      case 'finite': return { ...s, points: s.points.map(point) };
      case 'cofinite': return { ...s, except: s.except.map(point) };
      case 'intervals': return { ...s, intervals: s.intervals.map((i): Interval => ({ ...i, lo: end(i.lo), hi: end(i.hi) })) };
      case 'union': return { kind: 'union', sets: s.sets.map(walk) };
      case 'root-set': return finiteSet(s.variables, rootsAt(store, s.poly, s.variables[0], values, domain).map(v => [v]));
      case 'periodic-set': return { ...s, period: value(s.period), components: s.components.map((i): Interval => ({ ...i, lo: end(i.lo), hi: end(i.hi) })), range: { ...s.range, lo: end(s.range.lo), hi: end(s.range.hi) } };
      default: throw new Mismatch();
    }
  };
  try {
    return canonical(store, walk(set), domain);
  } catch (e) {
    if (e instanceof Mismatch || (e instanceof EquationAlgebraError && e.code !== 'resource')) return undefined;
    throw e;
  }
}
