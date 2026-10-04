import { OWNERS } from '../decision/rational-form';
import type { RelationProblem } from '../representation/relation';
import { finiteSet, normalizeSet, resourceOutcome, type EquationOutcome, type SolutionSet } from '../representation/solution-set';
import { ProofLogBuilder } from '../representation/transform';
import { decideCells, type ParamCase } from './cells';
import { parametricAtoms } from './specialize';
import { decideTree } from './tree';

/**
 * Decide a polynomial or rational problem whose coefficients carry free
 * parameters: a case tree whose conditions are exact conditions on the
 * parameters and whose sets may name the parameters (design rule 8: every
 * pivot on a parameter is a case). One parameter is decided by exact cells,
 * several by sign-condition trees. The proof log is the problem itself; the
 * evidence is the verifier's specialization at samples of every case.
 */
export function decideParametricProblem(problem: RelationProblem): EquationOutcome {
  try {
    if (problem.targets.length !== 1) return { kind: 'incomplete-implementation', reason: `${OWNERS.systems}: several target variables` };
    if (problem.parameters.length === 0) return { kind: 'unsupported', reason: 'no parameters' };
    if (problem.generators.length || problem.constraints.length) return { kind: 'incomplete-implementation', reason: 'generator and constraint tables belong to other slices' };
    const atoms = parametricAtoms(problem);
    if ('owner' in atoms) return { kind: 'incomplete-implementation', reason: `${atoms.owner}: ${atoms.detail}` };
    const result = problem.parameters.length === 1 ? decideCells(problem, atoms.atoms) : decideTree(problem, atoms.atoms);
    if (result.kind === 'refused') return { kind: 'incomplete-implementation', reason: result.reason };
    return caseOutcome(problem, result.cases);
  } catch (e) {
    return resourceOutcome(e);
  }
}

const isEmpty = (s: SolutionSet) => s.kind === 'finite' && s.points.length === 0;

function caseOutcome(problem: RelationProblem, cases: readonly ParamCase[]): EquationOutcome {
  const proof = new ProofLogBuilder(problem).build(), store = problem.store;
  if (cases.every(c => isEmpty(c.set))) return { kind: 'empty', proof };
  if (cases.length === 1 && cases[0].conditions.length === 0) return { kind: 'solved', set: normalizeSet(store, cases[0].set, problem.domain), proof };
  const tree: SolutionSet = { kind: 'case-tree', cases: cases.map(c => ({ conditions: c.conditions, set: isEmpty(c.set) ? finiteSet(problem.targets, []) : c.set })) };
  return { kind: 'solved', set: normalizeSet(store, tree, problem.domain), proof };
}
