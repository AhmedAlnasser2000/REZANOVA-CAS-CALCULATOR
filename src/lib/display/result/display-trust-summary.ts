import type { DisplayOutcome } from '../../../types/calculator';

function numericConfidenceLines(outcome: DisplayOutcome) {
  return outcome.kind === 'success'
    ? outcome.detailSections?.find((section) => section.title === 'Numeric Confidence')?.lines ?? []
    : [];
}

function searchedIntervalText(outcome: DisplayOutcome) {
  if (outcome.kind !== 'success') {
    return null;
  }
  for (const section of outcome.detailSections ?? []) {
    for (const line of section.lines) {
      const match = line.match(/Searched real interval\s*(\[[^\]]+\])/u);
      if (match?.[1]) {
        return match[1];
      }
    }
  }
  return null;
}

export function trustSummaryForDisplayOutcome(outcome: DisplayOutcome): string | undefined {
  if (outcome.kind !== 'success') {
    return undefined;
  }

  const confidenceLines = numericConfidenceLines(outcome);
  if (confidenceLines.some((line) => /All real polynomial roots certified/iu.test(line))) {
    return 'Certified polynomial roots';
  }

  if (confidenceLines.some((line) => /All roots in this interval/iu.test(line))) {
    const interval = searchedIntervalText(outcome);
    return interval ? `Local numeric roots in ${interval}` : 'Local numeric roots';
  }

  if (confidenceLines.some((line) => /Validated roots from bounded search/iu.test(line))) {
    return 'Validated approximate roots from bounded search';
  }

  if (confidenceLines.some((line) => /roots found in this complex region/iu.test(line))) {
    return 'Region-local complex roots';
  }

  if (
    outcome.resultOrigin === 'symbolic'
    || outcome.branchReadback
    || (outcome.exactLatex && !outcome.solutionKind && outcome.title === 'Symbolic')
  ) {
    return 'Exact roots';
  }

  return undefined;
}
