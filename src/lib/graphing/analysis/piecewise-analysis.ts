import type {
  GraphAnalysisEvidenceV1,
  GraphAnalysisFeature,
  GraphClassifiedItemSnapshotV2,
  GraphFeatureValueV1,
  GraphViewportV1,
} from '../contracts';
import { defaultPtxSolverPort, ptxNumber, ptxOneSidedLimit as oneSidedLimit, ptxRealExtrema, ptxRealRoots, type PtxRealFunction } from '../ptx';
import { graphPiecewiseForm } from '../sampling/piecewise';
import { buildGraphPiecewiseConditionPartition } from '../sampling/piecewise-condition-evidence';

type Piecewise = Extract<GraphClassifiedItemSnapshotV2, { kind: 'piecewise' }>;
type Evidence = (feature: GraphAnalysisFeature, itemIds: string[], level: GraphAnalysisEvidenceV1['level'],
  extra?: Partial<GraphAnalysisEvidenceV1>) => GraphAnalysisEvidenceV1;

const close = (a: number, b: number) => Math.abs(a - b) <= 1e-7 * Math.max(1, Math.abs(a), Math.abs(b));

/**
 * Analysis of a y = f(x) piecewise item through PTX: roots (exact where the
 * active branch is a polynomial), extrema and the y-intercept of the first-
 * match function, and one continuity finding per boundary from its one-sided
 * limits (continuous, removable or jump). Returns the function so the caller
 * can intersect it with other curves.
 */
export function analyzeGraphPiecewise(input: {
  snapshot: Piecewise;
  window: GraphViewportV1;
  parameters: Record<string, number>;
  requested: ReadonlySet<GraphAnalysisFeature>;
  evidence: Evidence;
  approximate: (value: number, errorBound?: number) => GraphFeatureValueV1;
  exact: (value: number) => GraphFeatureValueV1;
  finder: { isCancelled?: () => boolean; onEvaluation?: () => void };
}): { findings: GraphAnalysisEvidenceV1[]; run: PtxRealFunction | null } {
  const { snapshot, window, requested, evidence, approximate } = input;
  const findings: GraphAnalysisEvidenceV1[] = [];
  const port = defaultPtxSolverPort();
  const run = graphPiecewiseForm(snapshot.piecewise) === 'explicit-y' ? port.piecewiseFunction(snapshot.piecewise, 'x', input.parameters) : null;
  if (!run) {
    if (requested.has('piecewise-continuity')) findings.push(evidence('piecewise-continuity', [snapshot.itemId], 'inconclusive', {
      stopReason: { code: 'analysis-unsupported', detailCode: 'piecewise-form' },
    }));
    return { findings, run: null };
  }
  const itemIds = [snapshot.itemId];
  if (requested.has('root') || requested.has('x-intercept')) {
    // A root is exact when the branch drawn there is a polynomial with that exact root.
    const branchRoots = snapshot.piecewise.branches.map((branch) => (branch.relation.kind === 'explicit-y'
      ? port.realPolynomialRoots(branch.relation.rhs.mathJson, 'x', input.parameters) ?? [] : []));
    const activeBranch = (x: number) => snapshot.piecewise.branches.findIndex((branch) => {
      const f = port.piecewiseFunction({ version: 1, branches: [branch] }, 'x', input.parameters);
      return f !== null && f(x) !== undefined;
    });
    for (const root of ptxRealRoots(run, window.xMin, window.xMax, input.finder)) {
      const branch = activeBranch(root.x);
      const exact = branch >= 0 ? branchRoots[branch]!.find((candidate) => candidate.exact && close(candidate.value, root.x)) : undefined;
      for (const feature of ['root', 'x-intercept'] as const) if (requested.has(feature)) {
        findings.push(evidence(feature, itemIds, exact ? 'exact-proved' : root.level, {
          coordinates: exact ? { x: input.exact(exact.value), y: input.exact(0) } : { x: approximate(root.x, root.errorBound), y: approximate(0, root.residual || 1e-9) },
          basis: exact ? { source: 'graph-symbolic', validator: 'exact root of the branch drawn there' }
            : { source: 'numeric-validator', validator: 'bracketed or touching root of the piecewise function', residualBound: Math.max(root.residual, 1e-12) },
        }));
      }
    }
  }
  if (requested.has('extremum')) {
    for (const extremum of ptxRealExtrema(run, window.xMin, window.xMax, input.finder)) {
      findings.push(evidence('extremum', itemIds, extremum.level, {
        coordinates: { x: approximate(extremum.x, extremum.errorBound), y: approximate(extremum.y, 1e-12 * Math.max(1, Math.abs(extremum.y))) },
        basis: { source: 'numeric-validator', validator: `local ${extremum.kind} of the piecewise function` },
      }));
    }
  }
  if (requested.has('y-intercept') && window.xMin <= 0 && window.xMax >= 0) {
    const y = run(0);
    if (y !== undefined) findings.push(evidence('y-intercept', itemIds, 'numeric-validated', { coordinates: { x: input.exact(0), y: approximate(y, 1e-12 * Math.max(1, Math.abs(y))) } }));
  }
  if (requested.has('piecewise-continuity')) {
    const partition = buildGraphPiecewiseConditionPartition({
      itemId: snapshot.itemId, sourceRevision: snapshot.source.sourceRevision, piecewise: snapshot.piecewise, independentSymbol: 'x',
      minimum: window.xMin, maximum: window.xMax, pixelSpan: 800, tolerancePixels: 0.35, parameterEnvironment: input.parameters,
    });
    const span = window.xMax - window.xMin;
    for (const boundary of partition.evidence.boundaries) {
      const at = boundary.value;
      const leftLimit = oneSidedLimit(run, at, -1, span); const rightLimit = oneSidedLimit(run, at, 1, span); const value = run(at);
      const left = leftLimit?.value; const right = rightLimit?.value;
      const kind = left === undefined || right === undefined ? 'one-sided'
        : !close(left, right) ? 'jump' : value !== undefined && close(value, left) ? 'continuous' : 'removable';
      const shown = (limit: { value: number; error: number }) => ptxNumber(limit.value, 10 * limit.error, 10);
      const text = kind === 'continuous' ? 'continuous at the boundary'
        : kind === 'removable' ? `removable discontinuity: both sides approach ${shown(leftLimit!)}`
          : kind === 'jump' ? `jump discontinuity: from the left ${shown(leftLimit!)}, from the right ${shown(rightLimit!)}`
            : 'defined on one side only';
      findings.push(evidence('piecewise-continuity', itemIds, 'numeric-validated', {
        coordinates: { x: approximate(at, 1e-12 * Math.max(1, Math.abs(at))), ...(value !== undefined ? { y: approximate(value, 1e-12 * Math.max(1, Math.abs(value))) } : {}) },
        basis: { source: 'numeric-validator', validator: `one-sided limits: ${text}` },
      }));
    }
  }
  return { findings, run };
}
