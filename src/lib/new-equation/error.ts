import { buildCanonicalResultDocumentV2 } from '../result-contract/producer-v2';
import { requireCanonicalResultAuthority } from '../result-contract/native-result';

/** A canonical V2 error document for New Equation (input that cannot be solved as entered, or a failed run). */
export function equationError(message: string, title = 'Equation could not be solved') {
  const canonicalResult = buildCanonicalResultDocumentV2({ outcomeKind: 'error', title, error: message, warnings: [] });
  return requireCanonicalResultAuthority({ kind: 'error', title, error: message, warnings: [], canonicalResult }, 'New Equation').canonicalResult;
}
