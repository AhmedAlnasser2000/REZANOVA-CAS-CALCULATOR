import type { DisplayOutcome } from '../../../types/calculator';

type InternalEquationEvidence = {
  category?: string;
  classification?: string;
  text?: string;
  interval?: {
    start?: string;
    end?: string;
  };
};

const EQUATION_ANALYSIS_EVIDENCE = Symbol.for('calcwiz.equation.analysisEvidence');

function equationTrustEvidence(outcome: DisplayOutcome): InternalEquationEvidence[] {
  const evidence = (outcome as { [EQUATION_ANALYSIS_EVIDENCE]?: unknown })[EQUATION_ANALYSIS_EVIDENCE];
  return Array.isArray(evidence)
    ? evidence.filter((entry): entry is InternalEquationEvidence =>
      Boolean(entry)
      && typeof entry === 'object'
      && (entry as InternalEquationEvidence).category === 'trust')
    : [];
}

function intervalTextFromEvidence(entry: InternalEquationEvidence) {
  return entry.interval?.start && entry.interval.end
    ? `[${entry.interval.start}, ${entry.interval.end}]`
    : null;
}

function trustSummaryFromEvidence(outcome: DisplayOutcome) {
  const trustEvidence = equationTrustEvidence(outcome);
  for (const entry of trustEvidence) {
    switch (entry.classification) {
      case 'exact-roots':
        return 'Exact roots';
      case 'certified-polynomial-roots':
        return 'Certified polynomial roots';
      case 'local-numeric-roots': {
        const interval = intervalTextFromEvidence(entry);
        return entry.text && entry.text !== 'Local numeric roots'
          ? entry.text
          : interval
            ? `Local numeric roots in ${interval}`
            : 'Local numeric roots';
      }
      case 'bounded-search-approximate-roots':
        return 'Validated approximate roots from bounded search';
      case 'global-complex-polynomial-roots':
        return 'Global complex polynomial roots';
      case 'global-complex-rational-roots':
        return 'Global complex rational roots';
      case 'region-local-complex-roots':
        return 'Region-local complex roots';
      default:
        break;
    }
  }
  return undefined;
}

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

  if (outcome.sourceMode === 'matrix' || outcome.sourceMode === 'vector') {
    return undefined;
  }

  const evidenceSummary = trustSummaryFromEvidence(outcome);
  if (evidenceSummary) {
    return evidenceSummary;
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
    || (outcome.solutionKind !== 'approximate-numeric' && outcome.branchReadback)
    || (outcome.exactLatex && !outcome.solutionKind && outcome.title === 'Symbolic')
  ) {
    return 'Exact roots';
  }

  return undefined;
}
