import { buildCanonicalResultDocumentV2 } from '../../result-contract/producer-v2';
import { requireCanonicalResultAuthority } from '../../result-contract/native-result';
export function integrationError(message: string, title = 'Integration could not complete') {
  const canonicalResult = buildCanonicalResultDocumentV2({outcomeKind: 'error', title, error: message, warnings: []});
  return requireCanonicalResultAuthority({kind: 'error', title, error: message, warnings: [], canonicalResult}, 'New Integration').canonicalResult;
}
