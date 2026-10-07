import type { RelationProblem } from '../representation/relation';
import { resourceOutcome, type EquationOutcome } from '../representation/solution-set';
import { ProofLogBuilder } from '../representation/transform';
import { cadProblem } from './atoms';
import { hasQuantifier } from '../representation/formula';
import { decompose } from './decompose';
import { regionSet } from './region';

/**
 * Real polynomial problems in several unknowns with inequalities or ∨ (EQUATION-SEMIALGEBRAIC1): decided by a
 * cylindrical algebraic decomposition in the order of the unknowns, so the answer reads as cells of the first
 * unknown, then of the second over each of them, and so on. Quantified rows (PR B) are decided by quantifier
 * elimination: the free unknowns are the outer levels and the answer is the region where the quantified rows hold,
 * or True/False when every name is quantified. ℂ and non-polynomial rows are not this route's.
 */
export function cadApplies(problem: RelationProblem): boolean {
  // Quantified rows (PR B) in any number of free unknowns, including none (a decided statement).
  const quantified = problem.formulas.some(hasQuantifier);
  return problem.domain === 'real' && (problem.targets.length >= 2 || quantified) && problem.parameters.length === 0
    && problem.generators.length === 0 && problem.constraints.length === 0 && cadProblem(problem, problem.targets) !== undefined;
}

/**
 * The problems this route owns: ∨, ∧ and ¬ rows in several unknowns, and systems with orders (relations or conditions).
 * The decision and the verifier route by this same predicate.
 */
export function routesToCad(problem: RelationProblem): boolean {
  if (!cadApplies(problem)) return false;
  if (problem.formulas.length) return true;
  return problem.relations.some(r => r.op === 'lt' || r.op === 'le') || problem.conditions.some(c => c.kind === 'positive' || c.kind === 'nonnegative');
}

export function decideByCad(problem: RelationProblem): EquationOutcome {
  try {
    const store = problem.store, p = cadProblem(problem, problem.targets);
    if (!p) return { kind: 'incomplete-implementation', reason: 'EQUATION-SEMIALGEBRAIC1: not a polynomial problem' };
    const d = decompose(store, p), proof = new ProofLogBuilder(problem).build();
    // Every name quantified: the statement's truth value.
    if (d.free === 0) return { kind: 'solved', set: { kind: 'truth', value: d.root.truth === true }, proof };
    const set = regionSet(store, d, problem.targets);
    return set ? { kind: 'solved', set, proof } : { kind: 'empty', proof };
  } catch (e) {
    return resourceOutcome(e);
  }
}
