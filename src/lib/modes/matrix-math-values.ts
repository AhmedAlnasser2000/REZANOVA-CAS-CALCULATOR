import type { MatrixOperation } from '../../types/calculator';
import type {
  LinearAlgebraCanonicalEvidence,
  LinearAlgebraCanonicalLeafEvidence,
} from '../linear-algebra/canonical-evidence';
import {
  requireProvenCanonicalMathValueV2,
  type CanonicalResultV2MathResolver,
  type ProvenCanonicalMathValueV2,
} from '../result-contract';
import type { MathJsonRouteId } from '../result-contract/mathjson-route-registry';
import type { RunMatrixModeRequest } from './matrix';

export type MatrixMathJsonRouteId = Extract<MathJsonRouteId, `matrix.${string}`>;

export function proveMatrixCanonicalEvidence(
  routeId: MatrixMathJsonRouteId,
  evidence: LinearAlgebraCanonicalLeafEvidence,
  path: string,
): ProvenCanonicalMathValueV2 {
  try {
    return requireProvenCanonicalMathValueV2({
      canonicalLatex: evidence.canonicalLatex,
      mathJson: evidence.mathJson,
      owner: 'matrix',
      routeId,
      source: evidence.source,
    });
  } catch (error) {
    throw new Error(
      `Matrix canonical proof failed at ${path} from ${evidence.source}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function answerRowIndex(path: string) {
  const match = /^answerRows\.rows\[([0-9]+)\]\.math$/u.exec(path);
  return match ? Number(match[1]) : null;
}

export function matrixV2MathResolverFromEvidence(input: {
  routeId: MatrixMathJsonRouteId;
  evidence: LinearAlgebraCanonicalEvidence;
}): CanonicalResultV2MathResolver {
  return (canonicalLatex, path) => {
    const rowIndex = answerRowIndex(path);
    const candidate = path === 'primary.value'
      ? input.evidence.primary
      : rowIndex === null
        ? undefined
        : input.evidence.answerRows?.[rowIndex];
    if (!candidate) {
      throw new Error(`Matrix producer is missing aligned canonical evidence at ${path}.`);
    }
    if (candidate.canonicalLatex !== canonicalLatex) {
      throw new Error(
        `Matrix canonical evidence mismatch at ${path}: displayed ${canonicalLatex}, evidence ${candidate.canonicalLatex}.`,
      );
    }
    return proveMatrixCanonicalEvidence(input.routeId, candidate, path);
  };
}

export function matrixMathJsonRouteForOperation(
  operation: MatrixOperation,
): MatrixMathJsonRouteId {
  if (operation === 'detA' || operation === 'detB') return 'matrix.determinant';
  if (operation === 'inverseA' || operation === 'inverseB') return 'matrix.inverse';
  if (operation === 'rankA' || operation === 'rankB'
    || operation === 'rrefA' || operation === 'rrefB') return 'matrix.rank';
  if (operation === 'linearSystem') return 'matrix.linear-system';
  if (operation === 'profileA' || operation === 'profileB') return 'matrix.profile';
  return 'matrix.matrix-arithmetic';
}

export function matrixMathJsonRouteForRequest(
  request: RunMatrixModeRequest,
): MatrixMathJsonRouteId {
  return matrixMathJsonRouteForOperation(request.operation);
}
