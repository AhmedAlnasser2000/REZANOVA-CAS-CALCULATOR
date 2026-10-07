import type {
  GraphAnalysisEvidenceV1,
  GraphAnalysisFeature,
  GraphClassifiedItemSnapshotV2,
  GraphFeatureValueV1,
  GraphViewportV1,
} from '../contracts';
import {
  defaultPtxSolverPort, ptxAsymptotes, ptxGrowsToward, ptxRealDiscontinuities, ptxNumber, ptxOneSidedLimit as oneSidedLimit, ptxProveRealZero, ptxRealExtrema, ptxRealRoots, ptxRealZeroStretches,
  type PtxRealFunction,
} from '../ptx';
import { graphPiecewiseForm } from '../sampling/piecewise';
import { graphStretchEvidence } from './result-document';
import { buildGraphPiecewiseConditionPartition } from '../sampling/piecewise-condition-evidence';

type Piecewise = Extract<GraphClassifiedItemSnapshotV2, { kind: 'piecewise' }>;
type Evidence = (feature: GraphAnalysisFeature, itemIds: string[], level: GraphAnalysisEvidenceV1['level'],
  extra?: Partial<GraphAnalysisEvidenceV1>) => GraphAnalysisEvidenceV1;

const close = (a: number, b: number) => Math.abs(a - b) <= 1e-7 * Math.max(1, Math.abs(a), Math.abs(b));

/**
 * Analysis of a y = f(x) piecewise item through PTX: roots (exact where the
 * branch drawn there is a polynomial, otherwise proved by interval arithmetic
 * where possible), extrema and the y-intercept of the first-match function,
 * and one finding per condition boundary from its one-sided limits:
 * continuous, a jump (with its size), a hole, a vertical asymptote, or defined
 * on one side only. Returns the function so the caller can intersect it with
 * other curves.
 */
export function analyzeGraphPiecewise(input: {
  snapshot: Piecewise;
  window: GraphViewportV1;
  parameters: Record<string, number>;
  requested: ReadonlySet<GraphAnalysisFeature>;
  evidence: Evidence;
  approximate: (value: number, errorBound?: number) => GraphFeatureValueV1;
  exact: (value: number, form?: { latex: string; mathJson: unknown }) => GraphFeatureValueV1;
  finder: { isCancelled?: () => boolean; onEvaluation?: () => void };
}): { findings: GraphAnalysisEvidenceV1[]; run: PtxRealFunction | null } {
  const { snapshot, window, requested, evidence, approximate } = input;
  const findings: GraphAnalysisEvidenceV1[] = [];
  const port = defaultPtxSolverPort();
  const explicit = graphPiecewiseForm(snapshot.piecewise) === 'explicit-y';
  // The solved partition: every boundary in view. When complete, the function gets interval enclosures (proofs).
  const partition = explicit ? buildGraphPiecewiseConditionPartition({
    itemId: snapshot.itemId, sourceRevision: snapshot.source.sourceRevision, piecewise: snapshot.piecewise, independentSymbol: 'x',
    minimum: window.xMin, maximum: window.xMax, pixelSpan: 800, tolerancePixels: 0.35, parameterEnvironment: input.parameters,
  }) : null;
  const boundaries = partition && partition.evidence.unresolvedBoundaryCount === 0
    ? { boundaries: partition.evidence.boundaries.map((boundary) => boundary.value) } : {};
  const run = explicit ? port.piecewiseFunction(snapshot.piecewise, 'x', input.parameters, boundaries) : null;
  if (!run || !partition) {
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
    const span = window.xMax - window.xMin;
    const boundaryValues = partition.evidence.boundaries.map((boundary) => boundary.value);
    for (const found of ptxRealRoots(run, window.xMin, window.xMax, input.finder)) {
      // A branch approaching 0 at an end it excludes is no root: x if x < 0 tends to 0 at 0, where x + 1 is drawn.
      const near = boundaryValues.find((at) => Math.abs(at - found.x) <= Math.max(found.errorBound, 1e-9 * span));
      if (near !== undefined) {
        const there = run(near);
        if (there === undefined || Math.abs(there) > 1e-12) continue;
      }
      const branch = activeBranch(found.x);
      // An exact root counts only where its branch is the one drawn.
      const exact = branch >= 0 ? branchRoots[branch]!.find((candidate) => candidate.exact && close(candidate.value, found.x)
        && activeBranch(candidate.value) === branch) : undefined;
      const proof = exact ? null : ptxProveRealZero(run, found.x, found.errorBound);
      const root = proof ? { ...found, x: (proof.lo + proof.hi) / 2, errorBound: (proof.hi - proof.lo) / 2 + Number.EPSILON, level: 'interval-proved' as const } : found;
      for (const feature of ['root', 'x-intercept'] as const) if (requested.has(feature)) {
        findings.push(evidence(feature, itemIds, exact ? 'exact-proved' : root.level, {
          coordinates: exact ? { x: input.exact(exact.value, exact.form), y: input.exact(0) } : { x: approximate(root.x, root.errorBound), y: approximate(0, root.residual || 1e-9) },
          basis: exact ? { source: 'graph-symbolic', validator: 'exact root of the branch drawn there' }
            : { source: 'numeric-validator', validator: proof ? (proof.unique ? 'Krawczyk test: exactly one root in the bound' : 'guaranteed sign change on a continuous interval')
              : 'bracketed or touching root of the piecewise function', residualBound: Math.max(root.residual, 1e-12) },
        }));
      }
    }
  }
  if (requested.has('root')) {
    // A branch on the axis (0 otherwise): one finding per stretch, not a root per sample.
    for (const stretch of ptxRealZeroStretches(run, window.xMin, window.xMax, input.finder)) {
      findings.push(evidence('root', itemIds, 'numeric-validated',
        graphStretchEvidence(stretch, window, 'zero at every sample of the stretch; its ends located by bisection')));
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
  if (requested.has('hole') || requested.has('pole') || requested.has('vertical-asymptote')) {
    findings.push(...branchDiscontinuities({ ...input, partition, itemIds }));
  }
  if (requested.has('piecewise-continuity')) {
    const span = window.xMax - window.xMin;
    for (const boundary of partition.evidence.boundaries) {
      const at = boundary.value;
      const report = graphPiecewiseBoundaryReport(run, at, span);
      const value = report.value;
      findings.push(evidence('piecewise-continuity', itemIds, 'numeric-validated', {
        coordinates: { x: approximate(at, 1e-12 * Math.max(1, Math.abs(at))), ...(value !== undefined ? { y: approximate(value, 1e-12 * Math.max(1, Math.abs(value))) } : {}) },
        detail: { boundary: report },
        basis: { source: 'numeric-validator', validator: `one-sided limits: ${report.text}` },
      }));
    }
  }
  return { findings, run };
}

/**
 * Holes, poles and vertical asymptotes inside each branch's drawn range (its
 * boundaries are reported as boundaries), found as for a plain curve.
 */
function branchDiscontinuities(input: Parameters<typeof analyzeGraphPiecewise>[0] & {
  partition: ReturnType<typeof buildGraphPiecewiseConditionPartition>;
  itemIds: string[];
}) {
  const { snapshot, partition, requested, evidence, approximate, itemIds } = input;
  const port = defaultPtxSolverPort();
  const findings: GraphAnalysisEvidenceV1[] = [];
  const pieces = [
    ...snapshot.piecewise.branches.map((branch) => ({ relation: branch.relation, intervals: partition.branchIntervals.get(branch.branchId) ?? [] })),
    ...(snapshot.piecewise.otherwise ? [{ relation: snapshot.piecewise.otherwise, intervals: partition.otherwiseIntervals }] : []),
  ];
  for (const piece of pieces) {
    if (piece.relation.kind !== 'explicit-y') continue;
    const f = port.realFunction(piece.relation.rhs, 'x', input.parameters);
    if (!f) continue;
    for (const interval of piece.intervals) {
      const margin = 1e-9 * Math.max(1, interval.maximum - interval.minimum);
      const inside = (x: number) => x > interval.minimum + margin && x < interval.maximum - margin;
      if (interval.maximum <= interval.minimum) continue;
      for (const found of ptxRealDiscontinuities(f, piece.relation.rhs.mathJson, 'x', interval.minimum, interval.maximum, port, input.parameters, input.finder)) {
        if (found.kind !== 'hole' || !requested.has('hole') || !inside(found.x)) continue;
        findings.push(evidence('hole', itemIds, 'numeric-validated', {
          coordinates: { x: approximate(found.x, 1e-12 * Math.max(1, Math.abs(found.x))), y: approximate(found.limit, 1e-8 * Math.max(1, Math.abs(found.limit))) },
          basis: { source: 'numeric-validator', validator: 'both one-sided limits agree where the branch has no value' },
        }));
      }
      for (const line of ptxAsymptotes(f, piece.relation.rhs.mathJson, 'x', interval.minimum, interval.maximum, port, input.parameters, input.finder)) {
        if (line.kind !== 'vertical' || !inside(line.x)) continue;
        for (const feature of ['vertical-asymptote', 'pole'] as const) if (requested.has(feature)) {
          findings.push(evidence(feature, itemIds, line.level, {
            coordinates: { x: line.level === 'exact-proved' ? input.exact(line.x) : approximate(line.x, 1e-6 * Math.max(1, Math.abs(line.x))) },
            basis: { source: line.level === 'exact-proved' ? 'graph-symbolic' : 'numeric-validator', validator: 'the branch grows without bound here' },
          }));
        }
      }
    }
  }
  return findings;
}

/** How a piecewise function behaves at a boundary, from its one-sided limits and value there. */
export function graphPiecewiseBoundaryReport(run: PtxRealFunction, at: number, span: number) {
  const leftLimit = oneSidedLimit(run, at, -1, span); const rightLimit = oneSidedLimit(run, at, 1, span); const value = run(at);
  // A limit within its own error of 0 is 0 (x → 0⁻ gives −2e−19, not a number worth showing).
  const settled = (limit: { value: number; error: number } | undefined) => (
    limit && Math.abs(limit.value) <= Math.max(10 * limit.error, 1e-15) ? 0 : limit?.value);
  const left = settled(leftLimit); const right = settled(rightLimit);
  const shown = (limit: { value: number; error: number }) => ptxNumber(limit.value, 10 * limit.error, 10);
  const grows = ptxGrowsToward(run, at, -1, span) || ptxGrowsToward(run, at, 1, span);
  const base = { ...(left !== undefined ? { left } : {}), ...(right !== undefined ? { right } : {}), ...(value !== undefined ? { value } : {}) };
  if (left === undefined || right === undefined) {
    return grows
      ? { kind: 'vertical-asymptote' as const, ...base, text: 'vertical asymptote: the function grows without bound' }
      : { kind: 'one-sided' as const, ...base, text: 'defined on one side only' };
  }
  if (!close(left, right)) {
    const jump = right - left;
    return { kind: 'jump' as const, ...base, jump,
      text: `jump of ${ptxNumber(jump, 10 * (leftLimit!.error + rightLimit!.error), 10)}: from the left ${shown(leftLimit!)}, from the right ${shown(rightLimit!)}` };
  }
  if (value !== undefined && close(value, left)) return { kind: 'continuous' as const, ...base, text: 'continuous at the boundary' };
  return { kind: 'removable' as const, ...base, text: `removable discontinuity: both sides approach ${shown(leftLimit!)}` };
}
