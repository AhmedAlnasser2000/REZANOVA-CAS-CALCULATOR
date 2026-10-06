import { buildCanonicalResultDocument } from '../result-contract/current';

/** Ordinary controlled error in the current contract; no completed Equation decision is asserted. */
export function equationError(message: string, title = 'Equation could not be solved') {
  return buildCanonicalResultDocument({ outcomeKind: 'error', title, error: message, warnings: [] });
}
