import type { VectorOperation } from '../../types/calculator';
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
import type { RunVectorModeRequest } from './vector';

export type VectorMathJsonRouteId = Extract<MathJsonRouteId, `vector.${string}`>;

export function proveVectorCanonicalEvidence(
  routeId: VectorMathJsonRouteId,
  evidence: LinearAlgebraCanonicalLeafEvidence,
  path: string,
): ProvenCanonicalMathValueV2 {
  try {
    return requireProvenCanonicalMathValueV2({
      canonicalLatex: evidence.canonicalLatex,
      mathJson: evidence.mathJson,
      owner: 'vector',
      routeId,
      source: evidence.source,
    });
  } catch (error) {
    throw new Error(
      `Vector canonical proof failed at ${path} from ${evidence.source}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function answerRowIndex(path: string) {
  const match = /^answerRows\.rows\[([0-9]+)\]\.math$/u.exec(path);
  return match ? Number(match[1]) : null;
}

export function vectorV2MathResolverFromEvidence(input: {
  routeId: VectorMathJsonRouteId;
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
      throw new Error(`Vector producer is missing aligned canonical evidence at ${path}.`);
    }
    if (candidate.canonicalLatex !== canonicalLatex) {
      throw new Error(
        `Vector canonical evidence mismatch at ${path}: displayed ${canonicalLatex}, evidence ${candidate.canonicalLatex}.`,
      );
    }
    return proveVectorCanonicalEvidence(input.routeId, candidate, path);
  };
}

export function vectorMathJsonRouteForOperation(
  operation: VectorOperation,
): VectorMathJsonRouteId {
  if (operation === 'dot') return 'vector.dot-product';
  if (operation === 'cross') return 'vector.cross-product';
  if (operation === 'normA' || operation === 'normB') return 'vector.norm';
  if (operation === 'angle') return 'vector.angle';
  if (operation === 'span' || operation === 'independent') {
    return 'vector.span-independence';
  }
  return 'vector.orthogonalization';
}

export function vectorMathJsonRouteForRequest(
  request: RunVectorModeRequest,
): VectorMathJsonRouteId {
  return vectorMathJsonRouteForOperation(request.operation);
}
