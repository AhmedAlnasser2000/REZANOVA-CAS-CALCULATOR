import type { ResultProducerDraft } from '../../../types/calculator';
import { requireCanonicalResultAuthority } from '../../result-contract';

export function requireNativeEquationResult(
  outcome: ResultProducerDraft,
): ResultProducerDraft {
  return requireCanonicalResultAuthority(outcome, 'Equation');
}
