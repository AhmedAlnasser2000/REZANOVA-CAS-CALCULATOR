import { buildCanonicalResultDocument } from '../../result-contract/current';
export function integrationError(message: string, title = 'Integration could not complete') {
  return buildCanonicalResultDocument({outcomeKind: 'error', title, error: message, warnings: []});
}
