import {
  buildCanonicalResultDocumentV2,
  requireProvenCanonicalMathValueV2,
} from '../../result-contract';
import type {
  GraphAnalysisEvidenceV1,
  GraphAnalysisRequestV1,
  GraphFeatureValueV1,
} from '../contracts';

function exactValue(value: GraphFeatureValueV1 | undefined) {
  return value?.kind === 'exact' ? value.value : undefined;
}

export function graphAnalysisExactValue(value: number) {
  const canonicalLatex = Number.isInteger(value) ? String(value) : String(Number(value.toPrecision(14)));
  return requireProvenCanonicalMathValueV2({
    canonicalLatex,
    mathJson: value,
    owner: 'graphing',
    routeId: 'graphing.analysis',
    source: 'Graph analysis exact numeric producer',
  });
}

export function buildGraphAnalysisCanonicalResult(
  request: GraphAnalysisRequestV1,
  evidence: GraphAnalysisEvidenceV1[],
) {
  const firstExact = evidence.flatMap((entry) => [
    exactValue(entry.coordinates?.x),
    exactValue(entry.coordinates?.y),
    exactValue(entry.relationValue),
  ]).find((value) => value !== undefined);
  const validated = evidence.filter((entry) => entry.level === 'numeric-validated').length;
  const provisional = evidence.filter((entry) => ![
    'exact-proved', 'numeric-validated',
  ].includes(entry.level)).length;
  return buildCanonicalResultDocumentV2({
    outcomeKind: 'success',
    title: 'Graph analysis',
    ...(firstExact ? { primary: { kind: 'math' as const, value: firstExact } } : {}),
    details: [{
      title: 'Evidence',
      lines: [[{
        kind: 'text' as const,
        text: `${evidence.length} findings across ${request.items.length} selected item(s); ${validated} numerically validated.`,
      }]],
    }],
    warnings: provisional > 0
      ? [`${provisional} finding(s) are provisional or unsupported and cannot be pinned.`]
      : [],
  });
}
