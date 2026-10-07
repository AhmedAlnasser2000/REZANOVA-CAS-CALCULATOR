import { demand } from '../execution';
import { SEMIALGEBRAIC } from '../parameters/tree';
import { disjunctiveForm, hasQuantifier } from '../representation/formula';
import { withChanges, type RelationProblem } from '../representation/relation';
import {
  assertOutcome, finiteSet, normalizeSet, setKey, unionSet, type EquationOutcome, type SolutionSet,
} from '../representation/solution-set';
import { ProofLogBuilder } from '../representation/transform';

/**
 * Rows with ∧, ∨ and ¬ (EQUATION-SEMIALGEBRAIC1). A formula without quantifiers is the union of the conjunctions of
 * its disjunctive form: each conjunction, together with the problem's plain rows, is an ordinary problem decided
 * by its own slice, and the answer is the union of their sets (normalized: intervals joined, points merged).
 * Nothing partial: any disjunct that is not decided (a refusal or a typed stop) is the whole problem's outcome.
 * Quantifiers go to cylindrical algebraic decomposition.
 */
type Decide = (p: RelationProblem) => EquationOutcome;
type Verify = (p: RelationProblem, o: EquationOutcome) => void;

const fail = (reason: string): never => demand(false, 'verification-failed', reason) as never;

/** The problem's disjuncts as ordinary problems (plain rows plus one conjunction each). */
export function disjunctProblems(problem: RelationProblem): RelationProblem[] {
  return disjunctiveForm(problem.store, problem.formulas).map(d => withChanges(problem, { relations: [...problem.relations, ...d], formulas: [] }));
}

export function decideFormulas(problem: RelationProblem, decide: Decide): EquationOutcome {
  if (problem.formulas.some(hasQuantifier)) {
    return { kind: 'incomplete-implementation', reason: `${SEMIALGEBRAIC}: quantifiers (∀, ∃) are decided by the stage's second part` };
  }
  const sets: SolutionSet[] = [];
  for (const sub of disjunctProblems(problem)) {
    problem.store.ctx.tick();
    const o = decide(sub);
    if (o.kind === 'empty') continue;
    if (o.kind !== 'solved') return o;
    sets.push(o.set);
  }
  const proof = new ProofLogBuilder(problem).build();
  if (!sets.length) return { kind: 'empty', proof };
  const set = normalizeSet(problem.store, sets.length === 1 ? sets[0] : unionSet(sets), problem.domain);
  return set.kind === 'finite' && set.points.length === 0 ? { kind: 'empty', proof } : { kind: 'solved', set, proof };
}

/**
 * Evidence: every disjunct is decided again and its outcome verified by its own slice's verifier; the claimed
 * answer must be the union of those (as a normalized set).
 */
export function verifyFormulaOutcome(problem: RelationProblem, outcome: EquationOutcome, decide: Decide, verify: Verify): void {
  assertOutcome(outcome);
  if (outcome.kind !== 'solved' && outcome.kind !== 'empty') return;
  if (outcome.proof.root !== problem.hash) fail('proof does not start from the problem');
  const store = problem.store, sets: SolutionSet[] = [];
  for (const sub of disjunctProblems(problem)) {
    const o = decide(sub);
    if (o.kind !== 'solved' && o.kind !== 'empty') return fail('a disjunct is not decided');
    verify(sub, o);
    if (o.kind === 'solved') sets.push(o.set);
  }
  const expected = sets.length ? normalizeSet(store, sets.length === 1 ? sets[0] : unionSet(sets), problem.domain) : finiteSet(problem.targets, []);
  const claimed = outcome.kind === 'solved' ? normalizeSet(store, outcome.set, problem.domain) : finiteSet(problem.targets, []);
  if (setKey(store, claimed) !== setKey(store, expected)) fail('the answer differs from the union of its disjuncts');
}
