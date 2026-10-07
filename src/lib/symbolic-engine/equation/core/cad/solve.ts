import type { RelationProblem } from '../representation/relation';
import { resourceOutcome, type EquationOutcome } from '../representation/solution-set';
import { ProofLogBuilder } from '../representation/transform';
import { cadProblem } from './atoms';
import { hasQuantifier } from '../representation/formula';
import { decompose } from './decompose';
import { regionSet } from './region';
import { decideParametersByCad } from './cases';
import { parametricAtoms } from '../parameters/specialize';
import { degreeIn } from '../parameters/mpoly';

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
  return problem.domain === 'real' && (problem.targets.length >= 2 || quantified || problem.parameters.length > 0)
    && problem.generators.length === 0 && problem.constraints.length === 0 && cadProblem(problem, [...problem.parameters, ...problem.targets]) !== undefined;
}

/** One unknown with several parameters where the sign-condition tree refuses: several relations in it, or degree ≥ 3. */
function treeRefuses(problem: RelationProblem): boolean {
  if (problem.targets.length !== 1 || problem.parameters.length < 2) return false;
  const atoms = parametricAtoms(problem);
  if ('owner' in atoms) return false;
  const inX = atoms.atoms.filter(a => degreeIn(a.poly, 0) > 0);
  return inX.length > 1 || inX.some(a => degreeIn(a.poly, 0) >= 3);
}

/**
 * The problems this route owns: ∨, ∧ and ¬ rows in several unknowns, and systems with orders (relations or conditions).
 * The decision and the verifier route by this same predicate.
 */
export function routesToCad(problem: RelationProblem): boolean {
  if (!cadApplies(problem)) return false;
  const quantified = problem.formulas.some(hasQuantifier);
  const orders = problem.relations.some(r => r.op === 'lt' || r.op === 'le') || problem.conditions.some(c => c.kind === 'positive' || c.kind === 'nonnegative');
  // With parameters (PR B): what the parameters slice and the systems slice refuse.
  if (problem.parameters.length) return quantified || (problem.targets.length >= 2 && (orders || problem.formulas.length > 0)) || treeRefuses(problem);
  return problem.targets.length >= 2 || quantified ? problem.formulas.length > 0 || orders : false;
}

export function decideByCad(problem: RelationProblem): EquationOutcome {
  if (problem.parameters.length) return decideParametersByCad(problem);
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
