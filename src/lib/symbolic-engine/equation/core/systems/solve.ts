import { OWNERS } from '../decision/rational-form';
import type { ExprId } from '../representation/expression';
import type { RelationProblem } from '../representation/relation';
import { resourceOutcome, type EquationOutcome } from '../representation/solution-set';
import { caseOutcome, simplifyCases } from '../parameters/solve';
import { parametricAtoms } from '../parameters/specialize';
import { SEMIALGEBRAIC } from '../parameters/tree';
import { decideLinear, isLinear } from './linear';
import { decideEquation } from '../decide';
import { decideByElimination } from './eliminate';
import { decidePolynomialSystem } from './polynomial';
import { systemRanges } from '../numeric/systems';

/**
 * Decide a system: several target variables, over ℝ or ℂ, possibly with
 * parameters. Equations and ≠ conditions only (orders inside a system are
 * semialgebraic), except range rows on single targets in systems with kernels,
 * which bound the certified numeric search (EQUATION-CERTIFIED-NUMERICS1 PR B). Linear systems are decided by fraction-free Gauss–Jordan
 * elimination with case splits on parameter pivots; the answer is a point, a
 * parametric set in the free targets, or ∅, per case.
 */
export function decideSystem(problem: RelationProblem): EquationOutcome {
  try {
    if (problem.targets.length < 2) return { kind: 'unsupported', reason: 'a system needs several targets' };
    if (problem.generators.length || problem.constraints.length) return { kind: 'incomplete-implementation', reason: 'generator and constraint tables belong to other slices' };
    if (targetsInKernel(problem) && !problem.parameters.length) {
      // Range rows (constant bounds on one target) bound a system with kernels; other inequalities are semialgebraic.
      const { ranges, rows, other } = systemRanges(problem.store, problem.relations, problem.targets);
      if (other.some(r => r.op !== 'ne') || problem.conditions.some(c => c.kind === 'positive' || c.kind === 'nonnegative')) {
        return { kind: 'incomplete-implementation', reason: `${SEMIALGEBRAIC}: inequalities in a system` };
      }
      if (problem.conditions.length || other.length) return { kind: 'incomplete-implementation', reason: `${OWNERS.systems}: conditions in a system with kernels (follow-up ledger)` };
      const r = decideByElimination(problem, one => decideEquation(one), ranges, rows);
      return r.kind === 'refused' ? { kind: 'incomplete-implementation', reason: r.reason } : caseOutcome(problem, r.cases);
    }
    if (problem.relations.some(r => r.op !== 'eq' && r.op !== 'ne') || problem.conditions.some(c => c.kind === 'positive' || c.kind === 'nonnegative')) {
      return { kind: 'incomplete-implementation', reason: `${SEMIALGEBRAIC}: inequalities in a system` };
    }
    if (targetsInKernel(problem)) return { kind: 'incomplete-implementation', reason: `${OWNERS.systems}: kernels of the targets with parameters in a system (follow-up ledger)` };
    const atoms = parametricAtoms(problem);
    if ('owner' in atoms) return { kind: 'incomplete-implementation', reason: `${atoms.owner}: ${atoms.detail}` };
    const n = problem.targets.length;
    if (!atoms.atoms.filter(a => a.op === 'eq').every(a => isLinear(a, n))) {
      if (problem.parameters.length) return { kind: 'incomplete-implementation', reason: `${OWNERS.systems}: a nonlinear system with parameters (follow-up ledger)` };
      const r = decidePolynomialSystem(problem, atoms.atoms);
      return r.kind === 'refused' ? { kind: 'incomplete-implementation', reason: r.reason } : caseOutcome(problem, r.cases);
    }
    const cases = decideLinear(problem, atoms.vars, atoms.atoms);
    return caseOutcome(problem, problem.parameters.length ? simplifyCases(problem.store, cases) : cases);
  } catch (e) {
    return resourceOutcome(e);
  }
}

/** Whether some target occurs inside a function, a non-integer power, or an exponent. */
export function targetsInKernel(problem: RelationProblem): boolean {
  const s = problem.store, xs = problem.targets;
  const roots = [...problem.relations.flatMap(r => [r.lhs, r.rhs]), ...problem.conditions.flatMap(c => ('other' in c ? [c.expr, c.other] : [c.expr]))];
  const has = (id: ExprId) => s.freeSymbols(id).some(v => xs.includes(v));
  return s.postorder(roots).some(n => {
    const node = s.node(n);
    if (node.kind === 'apply') return has(node.arg);
    if (node.kind !== 'pow') return false;
    const e = s.numberValue(node.exponent);
    return has(node.exponent) || (has(node.base) && (e === undefined || e.denominator !== 1n));
  });
}
