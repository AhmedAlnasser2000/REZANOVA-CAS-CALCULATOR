import type { DisplayOutcome, TableResponse } from '../../types/calculator';
import { resolveCanonicalResultForStorage } from './storage';

function detailSectionsCarryMath(
  sections: Extract<DisplayOutcome, { kind: 'error' }>['detailSections'],
) {
  return sections?.some((section) => section.lines.some((_, lineIndex) =>
    section.lineParts?.[lineIndex]?.some((part) => part.kind === 'math')
    || (section.lineKinds?.[lineIndex] ?? section.lineKind) === 'math')) ?? false;
}

export function isMathBearingControlledError(
  outcome: Extract<DisplayOutcome, { kind: 'error' }>,
) {
  return Boolean(
    outcome.canonicalResult
    || outcome.exactLatex
    || outcome.canonicalMath
    || outcome.branchReadback
    || outcome.periodicFamily
    || outcome.exactSupplementLatex?.length
    || outcome.transformSummaryLatex
    || outcome.resolvedInputLatex
    || outcome.solveSummaryParts?.some((line) => line.some((part) => part.kind === 'math'))
    || detailSectionsCarryMath(outcome.detailSections),
  );
}

export function requireCanonicalResultAuthority(
  outcome: DisplayOutcome,
  owner: string,
  options: { tableResponse?: TableResponse } = {},
): DisplayOutcome {
  if (
    outcome.kind === 'prompt'
    || (outcome.kind === 'error' && !isMathBearingControlledError(outcome))
  ) {
    return outcome;
  }
  const resolution = resolveCanonicalResultForStorage(outcome, options);
  if (resolution.ok && resolution.source === 'native') {
    return outcome;
  }
  const reason = resolution.ok
    ? `resolved through ${resolution.source}`
    : resolution.message;
  const resultKind = outcome.kind === 'success' ? 'success' : 'math-bearing error';
  throw new Error(`${owner} ${resultKind} is missing native canonical authority: ${reason}`);
}
