import type { ResultProducerDraft, GeometryRequest } from '../../types/calculator';
import {
  tryProvenCanonicalMathValue,
  type CanonicalResultProducerMathValuesV1,
  type ProvenCanonicalMathValue,
} from '../result-contract';
import type { MathJsonRouteId } from '../result-contract/mathjson-route-registry';

export type GeometryMathJsonRouteId = Extract<MathJsonRouteId, `geometry.${string}`>;

export type GeometryOwnedMathJsonLeaf = {
  canonicalLatex: string;
  mathJson: unknown;
  source: string;
};

export function geometryMathValuesFromOwnedLeaves(input: {
  outcome: Exclude<ResultProducerDraft, { kind: 'prompt' }>;
  routeId: GeometryMathJsonRouteId;
  leaves: readonly GeometryOwnedMathJsonLeaf[];
}): CanonicalResultProducerMathValuesV1 {
  const proven = new Map<string, ProvenCanonicalMathValue>();
  for (const leaf of input.leaves) {
    const value = tryProvenCanonicalMathValue({
      canonicalLatex: leaf.canonicalLatex,
      mathJson: leaf.mathJson,
      owner: 'geometry',
      routeId: input.routeId,
      source: leaf.source,
    });
    if (value) proven.set(leaf.canonicalLatex, value);
  }
  const values: CanonicalResultProducerMathValuesV1 = {};
  if (input.outcome.exactLatex) {
    values.primaryMath = proven.get(input.outcome.exactLatex)
      ?? { canonicalLatex: input.outcome.exactLatex };
  }
  if (input.outcome.branchReadback) {
    values.branchReadback = {
      target: proven.get(input.outcome.branchReadback.targetLatex)
        ?? { canonicalLatex: input.outcome.branchReadback.targetLatex },
      relation: input.outcome.branchReadback.relationLatex,
      branches: input.outcome.branchReadback.branchesLatex.map((latex) =>
        proven.get(latex) ?? { canonicalLatex: latex }),
      ...(input.outcome.branchReadback.countLabel
        ? { countLabel: input.outcome.branchReadback.countLabel }
        : {}),
      ...(input.outcome.branchReadback.label ? { label: input.outcome.branchReadback.label } : {}),
      ...(input.outcome.branchReadback.source ? { source: input.outcome.branchReadback.source } : {}),
    };
  }
  return values;
}

export function geometryMathJsonRouteForRequest(request: GeometryRequest): GeometryMathJsonRouteId {
  if (request.kind === 'circle' || request.kind === 'circleSolveMissing'
    || request.kind === 'arcSector' || request.kind === 'arcSectorSolveMissing') {
    return 'geometry.circle';
  }
  if (request.kind === 'distance' || request.kind === 'distanceSolveMissing'
    || request.kind === 'midpoint' || request.kind === 'midpointSolveMissing'
    || request.kind === 'slope' || request.kind === 'slopeSolveMissing') {
    return 'geometry.coordinate-distance';
  }
  if (request.kind === 'lineEquation') return 'geometry.line-equation';
  if (request.kind === 'triangleArea' || request.kind === 'triangleAreaSolveMissing'
    || request.kind === 'triangleHeron' || request.kind === 'triangleHeronSolveMissing') {
    return 'geometry.triangle';
  }
  return 'geometry.shape-2d';
}
