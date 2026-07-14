import type { NormalizedCanonicalResult } from '../../result-contract';

type CanonicalTrustEvidence = NonNullable<
  NonNullable<NormalizedCanonicalResult['semantics']['metadata']>['trustEvidence']
>[number];

function intervalTextFromEvidence(entry: CanonicalTrustEvidence) {
  return entry.interval?.start && entry.interval.end
    ? '[' + entry.interval.start + ', ' + entry.interval.end + ']'
    : null;
}

function trustSummaryFromEvidence(result: NormalizedCanonicalResult) {
  const trustEvidence = result.semantics.metadata?.trustEvidence ?? [];
  for (const entry of trustEvidence) {
    switch (entry.classification) {
      case 'certified-polynomial-roots':
        return 'Certified polynomial roots';
      case 'local-numeric-roots': {
        const interval = intervalTextFromEvidence(entry);
        return entry.text && entry.text !== 'Local numeric roots'
          ? entry.text
          : interval
            ? 'Local numeric roots in ' + interval
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

function detailLineText(
  line: NonNullable<NormalizedCanonicalResult['presentation']['details']>[number]['lines'][number],
) {
  return line.map((part) => part.kind === 'math' ? part.latex : part.text).join('');
}

function numericConfidenceLines(result: NormalizedCanonicalResult) {
  return result.presentation.outcomeKind === 'success'
    ? result.presentation.details?.find((section) => section.title === 'Numeric Confidence')
      ?.lines.map(detailLineText) ?? []
    : [];
}

function searchedIntervalText(result: NormalizedCanonicalResult) {
  for (const section of result.presentation.details ?? []) {
    for (const parts of section.lines) {
      const line = detailLineText(parts);
      const match = line.match(/Searched real interval\s*(\[[^\]]+\])/u);
      if (match?.[1]) return match[1];
    }
  }
  return null;
}

export function trustSummaryForCanonicalResult(
  result: NormalizedCanonicalResult,
): string | undefined {
  if (result.presentation.outcomeKind !== 'success') return undefined;

  const metadata = result.semantics.metadata;
  if (metadata?.sourceMode === 'matrix' || metadata?.sourceMode === 'vector') {
    return undefined;
  }

  const evidenceSummary = trustSummaryFromEvidence(result);
  if (evidenceSummary) return evidenceSummary;

  const confidenceLines = numericConfidenceLines(result);
  if (confidenceLines.some((line) => /All real polynomial roots certified/iu.test(line))) {
    return 'Certified polynomial roots';
  }
  if (confidenceLines.some((line) => /All roots in this interval/iu.test(line))) {
    const interval = searchedIntervalText(result);
    return interval ? 'Local numeric roots in ' + interval : 'Local numeric roots';
  }
  if (confidenceLines.some((line) => /Validated roots from bounded search/iu.test(line))) {
    return 'Validated approximate roots from bounded search';
  }
  if (confidenceLines.some((line) => /roots found in this complex region/iu.test(line))) {
    return 'Region-local complex roots';
  }
  if (
    metadata?.resultOrigin === 'symbolic'
    || (metadata?.solutionKind !== 'approximate-numeric'
      && result.presentation.branchReadback)
    || (result.presentation.primaryLatex && !metadata?.solutionKind
      && result.presentation.title === 'Symbolic')
  ) {
    return 'Exact roots';
  }
  return undefined;
}
