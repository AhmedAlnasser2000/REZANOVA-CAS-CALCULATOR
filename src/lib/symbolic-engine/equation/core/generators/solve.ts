import { NATURAL_DOMAIN } from '../decision/rules';
import { OWNERS } from '../decision/rational-form';
import type { RelationProblem } from '../representation/relation';
import { normalizeSet, resourceOutcome, type EquationOutcome } from '../representation/solution-set';
import { MOVE_TO_ZERO, ProofLogBuilder, type TransformRule } from '../representation/transform';
import { decideClosedForm } from './closed-form-set';
import { LOG_DOMAIN, REAL_POWER_NORMAL_FORM } from './normal-form';

/** Kernel domains, real normal form, kernel domains again (new logs), denominators, zero form. */
const PIPELINE: readonly TransformRule[] = [LOG_DOMAIN, REAL_POWER_NORMAL_FORM, LOG_DOMAIN, NATURAL_DOMAIN, MOVE_TO_ZERO];

export const GENERATOR_RULES: ReadonlyMap<string, TransformRule> = new Map([LOG_DOMAIN, REAL_POWER_NORMAL_FORM, NATURAL_DOMAIN, MOVE_TO_ZERO].map(r => [r.id, r]));

export function rewriteGenerators(problem: RelationProblem) {
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
 * Decide a real problem in one target whose relations involve exp, log,
 * powers with the target in the exponent, or Lambert W: an exact set (closed
 * forms) or a proven empty set with a replayable proof log, otherwise an
 * honest refusal naming the gate that owns the problem.
 */
export function decideGeneratorProblem(problem: RelationProblem): EquationOutcome {
  try {
    if (problem.targets.length !== 1) return { kind: 'incomplete-implementation', reason: `${OWNERS.systems}: several target variables` };
    if (problem.domain !== 'real') return { kind: 'incomplete-implementation', reason: `${OWNERS.periodic}: complex exponential and logarithmic equations` };
    if (problem.parameters.length) return { kind: 'incomplete-implementation', reason: `${OWNERS.parameters}: parameters ${problem.parameters.join(', ')}` };
    if (problem.generators.length || problem.constraints.length) return { kind: 'incomplete-implementation', reason: 'generator and constraint tables are filled by this slice, not given' };
    const { log, leaf } = rewriteGenerators(problem);
    const decision = decideClosedForm(leaf);
    if (decision.kind === 'refused') return { kind: 'incomplete-implementation', reason: `${decision.refusal.owner}: ${decision.refusal.detail}` };
    const proof = log.build();
    return decision.kind === 'empty' ? { kind: 'empty', proof } : { kind: 'solved', set: normalizeSet(problem.store, decision.set, 'real'), proof };
  } catch (e) {
    return resourceOutcome(e);
  }
}
