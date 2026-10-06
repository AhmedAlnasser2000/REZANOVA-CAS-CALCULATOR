import type { ResultProducerDraft } from '../../../types/calculator';
import type { CurrentResultProducerDraft } from '../../../types/calculator/canonical-result-runtime';
import { requireCanonicalResultAuthority } from '../../result-contract/current';
import { attachCurrentResultToDraft } from '../../result-contract/current/producer-draft';
import { runCalculateInlineLinearAlgebra } from './inline-linear-algebra';
import { runCalculateMode as runStandardCalculateMode } from './standard';
import type { RunCalculateModeRequest } from './types';

/** Calculate entry point: typed matrix/vector literals first, then ordinary mathematics. */
export function runCalculateMode(request: RunCalculateModeRequest): CurrentResultProducerDraft | Extract<ResultProducerDraft, {kind: 'prompt'}> {
  const outcome = runCalculateInlineLinearAlgebra(request) ?? runStandardCalculateMode(request);
  if (outcome.kind === 'prompt') return outcome;
  // Both execution paths must leave this workspace with current authority.
  return attachCurrentResultToDraft(requireCanonicalResultAuthority(outcome.canonicalResult), outcome);
}
