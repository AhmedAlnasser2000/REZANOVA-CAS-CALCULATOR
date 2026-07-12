import type { CanonicalResultDocumentV1 } from '../../../types/calculator';

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

function equationTrustEvidence(source: unknown): InternalEquationEvidence[] {
  const evidence = (source as { [EQUATION_ANALYSIS_EVIDENCE]?: unknown } | null | undefined)
    ?.[EQUATION_ANALYSIS_EVIDENCE];
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

function trustSummaryFromEvidence(source: unknown) {
  const trustEvidence = equationTrustEvidence(source);
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

function detailLineText(line: NonNullable<CanonicalResultDocumentV1['details']>[number]['lines'][number]) {
  return line.map((part) => part.kind === 'math' ? part.math.canonicalLatex : part.text).join('');
}

function numericConfidenceLines(document: CanonicalResultDocumentV1) {
  return document.outcomeKind === 'success'
    ? document.details?.find((section) => section.title === 'Numeric Confidence')
      ?.lines.map(detailLineText) ?? []
    : [];
}

function searchedIntervalText(document: CanonicalResultDocumentV1) {
  for (const section of document.details ?? []) {
    for (const parts of section.lines) {
      const line = detailLineText(parts);
      const match = line.match(/Searched real interval\s*(\[[^\]]+\])/u);
      if (match?.[1]) {
        return match[1];
      }
    }
  }
  return null;
}

export function trustSummaryForCanonicalResult(
  document: CanonicalResultDocumentV1,
  equationEvidenceSource?: unknown,
): string | undefined {
  if (document.outcomeKind !== 'success') {
    return undefined;
  }

  const metadata = document.metadata;
  if (metadata?.sourceMode === 'matrix' || metadata?.sourceMode === 'vector') {
    return undefined;
  }

  const evidenceSummary = trustSummaryFromEvidence(equationEvidenceSource);
  if (evidenceSummary) {
    return evidenceSummary;
  }

  const confidenceLines = numericConfidenceLines(document);
  if (confidenceLines.some((line) => /All real polynomial roots certified/iu.test(line))) {
    return 'Certified polynomial roots';
  }

  if (confidenceLines.some((line) => /All roots in this interval/iu.test(line))) {
    const interval = searchedIntervalText(document);
    return interval ? `Local numeric roots in ${interval}` : 'Local numeric roots';
  }

  if (confidenceLines.some((line) => /Validated roots from bounded search/iu.test(line))) {
    return 'Validated approximate roots from bounded search';
  }

  if (confidenceLines.some((line) => /roots found in this complex region/iu.test(line))) {
    return 'Region-local complex roots';
  }

  if (
    metadata?.resultOrigin === 'symbolic'
    || (metadata?.solutionKind !== 'approximate-numeric' && document.branchReadback)
    || (document.primaryMath && !metadata?.solutionKind && document.title === 'Symbolic')
  ) {
    return 'Exact roots';
  }

  return undefined;
}
