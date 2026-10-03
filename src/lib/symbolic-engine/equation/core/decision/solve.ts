import type { RelationProblem } from '../representation/relation';
import { normalizeSet, resourceOutcome, type EquationOutcome } from '../representation/solution-set';
import { MOVE_TO_ZERO, ProofLogBuilder, type TransformRule } from '../representation/transform';
import { OWNERS } from './rational-form';
import { NATURAL_DOMAIN, TO_POLYNOMIAL } from './rules';
import { decideLeaf } from './univariate';

/** Rules in order; the natural domain is recorded on the input and again after rewriting. */
const PIPELINE: readonly TransformRule[] = [NATURAL_DOMAIN, MOVE_TO_ZERO, NATURAL_DOMAIN, TO_POLYNOMIAL];

/** The final state of the slice's rewriting, with the steps that reached it. */
export function rewrite(problem: RelationProblem) {
  const log = new ProofLogBuilder(problem);
  let state = problem;
  for (const rule of PIPELINE) {
    const step = rule.apply(state);
    if (!step) continue;
    log.append(step);
    state = step.outputs[0];
  }
  return { log, leaf: state };
}

/**
 * Decide a univariate polynomial or rational problem over ℝ or ℂ:
 * an exact solution set or a proven empty set, both with a replayable proof
 * log; otherwise an honest refusal naming the gate that owns the problem.
 */
export function decidePolynomialProblem(problem: RelationProblem): EquationOutcome {
  try {
    if (problem.targets.length === 0) return { kind: 'unsupported', reason: 'no target variable' };
    if (problem.targets.length > 1) return { kind: 'incomplete-implementation', reason: `${OWNERS.systems}: several target variables` };
    if (problem.parameters.length) return { kind: 'incomplete-implementation', reason: `${OWNERS.parameters}: parameters ${problem.parameters.join(', ')}` };
    if (problem.generators.length || problem.constraints.length) return { kind: 'incomplete-implementation', reason: 'generator and constraint tables belong to later slices' };
    const first = decideLeaf(problem);
    if (first.kind === 'refused') return refusal(first);
    const { log, leaf } = rewrite(problem);
    const decision = decideLeaf(leaf);
    if (decision.kind === 'refused') return refusal(decision);
    const proof = log.build();
    return decision.kind === 'empty' ? { kind: 'empty', proof } : { kind: 'solved', set: normalizeSet(problem.store, decision.set, problem.domain), proof };
  } catch (e) {
    return resourceOutcome(e);
  }
}

function refusal(d: Extract<ReturnType<typeof decideLeaf>, { kind: 'refused' }>): EquationOutcome {
  const reason = `${d.refusal.owner}: ${d.refusal.detail}`;
  return d.unsupported ? { kind: 'unsupported', reason } : { kind: 'incomplete-implementation', reason };
}
