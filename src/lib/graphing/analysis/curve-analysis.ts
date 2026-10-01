import type {
  GraphAnalysisEvidenceV1,
  GraphAnalysisFeature,
  GraphClassifiedItemSnapshotV2,
  GraphFeatureValueV1,
  GraphViewportV1,
} from '../contracts';
import {
  defaultPtxSolverPort,
  ptxCurveAxisCrossings,
  ptxCurveEnds,
  ptxCurveTurningPoints,
  ptxPolarOriginCrossings,
  ptxRegionCorners,
  type PtxCurve,
  type PtxCurvePoint2,
  type PtxFinderOptions,
} from '../ptx';

type Evidence = (feature: GraphAnalysisFeature, itemIds: string[], level: GraphAnalysisEvidenceV1['level'],
  extra?: Partial<GraphAnalysisEvidenceV1>) => GraphAnalysisEvidenceV1;

/**
 * Points of interest of curves other than y = f(x) (PTX3): x = f(y),
 * parametric, polar, implicit, a region's edges, complex trajectories and
 * piecewise curves of those forms. Each gets axis crossings (x- and
 * y-intercepts), turning points, ends, origin crossings and, for regions,
 * corners. Returns the curves so the caller can intersect them with others.
 */
export function analyzeGraphCurve(input: {
  snapshot: GraphClassifiedItemSnapshotV2;
  window: GraphViewportV1;
  parameters: Record<string, number>;
  requested: ReadonlySet<GraphAnalysisFeature>;
  evidence: Evidence;
  approximate: (value: number, errorBound?: number) => GraphFeatureValueV1;
  finder: PtxFinderOptions;
}): { findings: GraphAnalysisEvidenceV1[]; curves: PtxCurve[]; handled: boolean } {
  const { snapshot, window, requested, evidence, approximate, finder } = input;
  const port = defaultPtxSolverPort();
  const findings: GraphAnalysisEvidenceV1[] = [];
  const itemIds = [snapshot.itemId];
  const relation = snapshot.kind === 'relation' ? snapshot.relation : null;
  const edges = relation ? port.regionEdges(relation, input.parameters) : null;
  const curves: PtxCurve[] = edges ? edges.map((edge) => ({ kind: 'implicit' as const, F: edge.F }))
    : (() => {
      const source = snapshot.kind === 'piecewise' ? { piecewise: snapshot.piecewise } : relation ? { relation } : null;
      const curve = source ? port.curve(source, input.parameters, window) : null;
      return curve ? [curve] : [];
    })();
  if (!curves.length) return { findings, curves, handled: false };
  const where = (point: PtxCurvePoint2) => ({
    coordinates: { x: approximate(point.x, point.errorBound), y: approximate(point.y, point.errorBound) },
    ...(point.parameter ? { detail: { parameter: point.parameter } } : {}),
  });
  for (const curve of curves) {
    if (requested.has('x-intercept') || requested.has('y-intercept')) {
      for (const crossing of ptxCurveAxisCrossings(curve, window, finder)) {
        const feature = crossing.axis === 'x' ? 'x-intercept' : 'y-intercept';
        if (requested.has(feature)) findings.push(evidence(feature, itemIds, crossing.level, {
          ...where(crossing), basis: { source: 'numeric-validator', validator: `the curve meets the ${crossing.axis}-axis: bracketed root along the curve` },
        }));
      }
    }
    if (requested.has('turning-point')) {
      for (const turn of ptxCurveTurningPoints(curve, window, finder)) {
        const located = where(turn);
        findings.push(evidence('turning-point', itemIds, turn.level, {
          ...located, detail: { ...located.detail, kind: turn.kind },
          basis: { source: 'numeric-validator', validator: `${turn.kind} point: the tangent is ${turn.kind === 'highest' || turn.kind === 'lowest' ? 'horizontal' : 'vertical'}` },
        }));
      }
    }
    if (requested.has('curve-endpoint')) {
      for (const end of ptxCurveEnds(curve, window)) {
        findings.push(evidence('curve-endpoint', itemIds, end.level, {
          coordinates: { x: approximate(end.x, end.errorBound), y: approximate(end.y, end.errorBound) },
          detail: { kind: end.kind, included: end.included, ...(end.parameter ? { parameter: end.parameter } : {}) },
          basis: { source: 'numeric-validator', validator: `the ${end.kind} of the restricted curve (${end.included ? 'included' : 'not included'})` },
        }));
      }
    }
    if (requested.has('origin-crossing')) {
      for (const origin of ptxPolarOriginCrossings(curve, window, finder)) {
        findings.push(evidence('origin-crossing', itemIds, origin.level, {
          ...where(origin), basis: { source: 'numeric-validator', validator: 'r(θ) = 0: bracketed root of the radius' },
        }));
      }
    }
  }
  if (edges && edges.length > 1 && requested.has('region-corner')) {
    for (const corner of ptxRegionCorners(edges, window, finder)) {
      findings.push(evidence('region-corner', itemIds, corner.level, {
        coordinates: { x: approximate(corner.x, corner.errorBound), y: approximate(corner.y, corner.errorBound) },
        detail: { included: corner.included },
        basis: { source: 'numeric-validator', validator: `edges ${corner.edges[0] + 1} and ${corner.edges[1] + 1} meet: ${corner.level === 'interval-proved' ? 'proved by the 2-D Krawczyk test' : 'Newton in the plane'}` },
      }));
    }
  }
  return { findings, curves, handled: true };
}
