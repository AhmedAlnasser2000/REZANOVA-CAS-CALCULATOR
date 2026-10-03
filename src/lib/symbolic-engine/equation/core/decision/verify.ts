import { demand } from '../execution';
import type { ExactValue } from '../representation/evaluate';
import type { RelationProblem } from '../representation/relation';
import {
  assertOutcome, normalizeSet, setKey, type Endpoint, type EquationOutcome, type PointValue, type SolutionSet,
} from '../representation/solution-set';
import { MOVE_TO_ZERO, verifyProofLog } from '../representation/transform';
import { formMatches } from './radical-forms';
import { NATURAL_DOMAIN, POLYNOMIAL_RULES, TO_POLYNOMIAL } from './rules';
import { decideLeaf, problemAtoms, satisfiesAll } from './univariate';

/**
 * Independent check of a slice-1 outcome against its problem:
 * - the proof log replays (hashes, continuity, bookkeeping, measures, rule checkers);
 * - it has one leaf, already in final polynomial form;
 * - re-deciding that leaf gives the same canonical set (or empty);
 * - every finite point satisfies every atom of the leaf, exactly;
 * - every attached radical form evaluates exactly to its root.
 * Refusal outcomes carry no certificate and are only shape-checked.
 */
export function verifyOutcome(problem: RelationProblem, outcome: EquationOutcome): void {
  assertOutcome(outcome);
  if (outcome.kind !== 'solved' && outcome.kind !== 'empty') return;
  const fail = (reason: string): never => demand(false, 'verification-failed', reason) as never;
  const proof = outcome.proof;
  if (proof.root !== problem.hash) fail('proof does not start from the problem');
  const report = verifyProofLog(proof, POLYNOMIAL_RULES);
  if (report.leaves.length !== 1) fail('expected exactly one leaf');
  const leaf = proof.states.get(report.leaves[0]) ?? fail('leaf state missing');
  if ([NATURAL_DOMAIN, MOVE_TO_ZERO, TO_POLYNOMIAL].some(r => r.apply(leaf) !== null)) fail('leaf is not in final polynomial form');
  const decision = decideLeaf(leaf);
  if (decision.kind === 'refused') fail('leaf is not decidable by this slice');
  const store = problem.store, domain = problem.domain;
  if (outcome.kind === 'empty') {
    if (decision.kind !== 'empty') fail('claimed empty, but the leaf has solutions');
    return;
  }
  if (decision.kind !== 'set') return fail('claimed solutions, but the leaf is empty');
  const claimed = normalizeSet(store, outcome.set, domain);
  if (setKey(store, claimed) !== setKey(store, normalizeSet(store, decision.set, domain))) fail('solution set differs from the re-derived set');
  if (claimed.kind === 'finite') {
    const atoms = problemAtoms(leaf);
    for (const [v] of claimed.points) if (v.kind === 'expression' || !satisfiesAll(store, atoms, v as ExactValue, domain)) fail('a point does not satisfy the leaf');
  }
  for (const v of values(outcome.set)) {
    if (v.kind === 'algebraic' && 'form' in v && v.form !== undefined && !formMatches(store, v.form, v.root)) fail('radical form does not match its root');
  }
}

function values(set: SolutionSet): PointValue[] {
  const ends = (e: Endpoint): PointValue[] => (e.kind === 'infinity' ? [] : [e]);
  switch (set.kind) {
    case 'finite': return set.points.flat();
    case 'cofinite': return set.except.flat();
    case 'intervals': return set.intervals.flatMap(i => [...ends(i.lo), ...ends(i.hi)]);
    default: return [];
  }
}
