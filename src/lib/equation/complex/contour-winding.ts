import { complexAbs, type ComplexValue } from '../../numeric/complex';
import type { ComplexNumericEvaluator } from './numeric-evaluator';
import type { ComplexNewtonCandidate, ComplexRectangularRegion } from './seed-grid-newton';

export type ComplexContourWindingResult =
  | {
      kind: 'verified';
      rootCount: number;
      candidateCount: number;
      windingNumber: number;
      zerosMinusPoles: number;
      knownPoleCount: number;
      boundarySampleCount: number;
      minimumBoundaryResidual: number;
      branchDiagnosticCount: number;
      poleDiagnosticCount: number;
    }
  | {
      kind: 'inconclusive';
      reason: string;
      rootCount: number | null;
      candidateCount: number;
      windingNumber: number | null;
      zerosMinusPoles: number | null;
      knownPoleCount: number;
      boundarySampleCount: number;
      minimumBoundaryResidual: number | null;
      branchDiagnosticCount: number;
      poleDiagnosticCount: number;
    }
  | {
      kind: 'unsafe';
      reason: string;
      boundarySampleCount: number;
      minimumBoundaryResidual: number | null;
      branchDiagnosticCount: number;
      poleDiagnosticCount: number;
      knownPoleCount: number;
    };

const DEFAULT_SAMPLES_PER_EDGE = 96;
const DEFAULT_BOUNDARY_TOLERANCE = 1e-7;
const DEFAULT_CANDIDATE_TOLERANCE = 1e-7;

function isFiniteRegion(region: ComplexRectangularRegion) {
  return Number.isFinite(region.reMin)
    && Number.isFinite(region.reMax)
    && Number.isFinite(region.imMin)
    && Number.isFinite(region.imMax)
    && region.reMin < region.reMax
    && region.imMin < region.imMax;
}

function isInsideRegion(value: ComplexValue, region: ComplexRectangularRegion) {
  return value.re > region.reMin
    && value.re < region.reMax
    && value.im > region.imMin
    && value.im < region.imMax;
}

function boundaryPoints(region: ComplexRectangularRegion, samplesPerEdge: number) {
  const samples = Math.max(8, Math.floor(samplesPerEdge));
  const points: ComplexValue[] = [];
  for (let index = 0; index < samples; index += 1) {
    const t = index / samples;
    points.push({ re: region.reMin + (region.reMax - region.reMin) * t, im: region.imMin });
  }
  for (let index = 0; index < samples; index += 1) {
    const t = index / samples;
    points.push({ re: region.reMax, im: region.imMin + (region.imMax - region.imMin) * t });
  }
  for (let index = 0; index < samples; index += 1) {
    const t = index / samples;
    points.push({ re: region.reMax - (region.reMax - region.reMin) * t, im: region.imMax });
  }
  for (let index = 0; index < samples; index += 1) {
    const t = index / samples;
    points.push({ re: region.reMin, im: region.imMax - (region.imMax - region.imMin) * t });
  }
  return points;
}

function principalAngleDelta(next: number, previous: number) {
  let delta = next - previous;
  while (delta <= -Math.PI) delta += Math.PI * 2;
  while (delta > Math.PI) delta -= Math.PI * 2;
  return delta;
}

function candidateCountInside(
  candidates: readonly ComplexNewtonCandidate[],
  region: ComplexRectangularRegion,
  tolerance: number,
) {
  return candidates.filter((candidate) =>
    candidate.residualNorm <= tolerance && isInsideRegion(candidate.value, region)).length;
}

export function verifyComplexContourWinding(input: {
  evaluator: ComplexNumericEvaluator;
  region: ComplexRectangularRegion;
  candidates: readonly ComplexNewtonCandidate[];
  samplesPerEdge?: number;
  boundaryTolerance?: number;
  candidateTolerance?: number;
  knownPoleCount?: number;
  poleDiagnosticCount?: number;
}): ComplexContourWindingResult {
  const knownPoleCount = Math.max(0, Math.floor(input.knownPoleCount ?? 0));
  const poleDiagnosticCount = Math.max(0, Math.floor(input.poleDiagnosticCount ?? 0));
  if (!isFiniteRegion(input.region)) {
    return {
      kind: 'unsafe',
      reason: 'Complex contour region bounds are invalid.',
      boundarySampleCount: 0,
      minimumBoundaryResidual: null,
      branchDiagnosticCount: 0,
      poleDiagnosticCount,
      knownPoleCount,
    };
  }

  const points = boundaryPoints(input.region, input.samplesPerEdge ?? DEFAULT_SAMPLES_PER_EDGE);
  const boundaryTolerance = input.boundaryTolerance ?? DEFAULT_BOUNDARY_TOLERANCE;
  const values: ComplexValue[] = [];
  let minimumBoundaryResidual = Number.POSITIVE_INFINITY;
  let branchDiagnosticCount = 0;

  for (const point of points) {
    const evaluated = input.evaluator.evaluateAt(point);
    branchDiagnosticCount += evaluated.diagnostics
      .filter((entry) => /branch/i.test(entry.code)).length;
    if (evaluated.status !== 'finite' || !evaluated.value || evaluated.residualNorm === null) {
      return {
        kind: 'unsafe',
        reason: 'Complex contour boundary includes an undefined or unsupported evaluation.',
        boundarySampleCount: points.length,
        minimumBoundaryResidual: Number.isFinite(minimumBoundaryResidual) ? minimumBoundaryResidual : null,
        branchDiagnosticCount,
        poleDiagnosticCount,
        knownPoleCount,
      };
    }
    if (branchDiagnosticCount > 0) {
      return {
        kind: 'unsafe',
        reason: 'Complex contour boundary touches a principal branch cut or branch point.',
        boundarySampleCount: points.length,
        minimumBoundaryResidual: Number.isFinite(minimumBoundaryResidual) ? minimumBoundaryResidual : null,
        branchDiagnosticCount,
        poleDiagnosticCount,
        knownPoleCount,
      };
    }
    const residual = complexAbs(evaluated.value);
    minimumBoundaryResidual = Math.min(minimumBoundaryResidual, residual);
    if (residual <= boundaryTolerance) {
      return {
        kind: 'unsafe',
        reason: 'Complex contour boundary passes too close to a root.',
        boundarySampleCount: points.length,
        minimumBoundaryResidual,
        branchDiagnosticCount,
        poleDiagnosticCount,
        knownPoleCount,
      };
    }
    values.push(evaluated.value);
  }

  let angleSum = 0;
  for (let index = 0; index < values.length; index += 1) {
    const current = values[index];
    const next = values[(index + 1) % values.length];
    angleSum += principalAngleDelta(Math.atan2(next.im, next.re), Math.atan2(current.im, current.re));
  }

  const windingNumber = Math.round(angleSum / (Math.PI * 2));
  const zerosMinusPoles = windingNumber;
  const rootCount = zerosMinusPoles + knownPoleCount;
  const candidateCount = candidateCountInside(
    input.candidates,
    input.region,
    input.candidateTolerance ?? DEFAULT_CANDIDATE_TOLERANCE,
  );
  if (rootCount < 0) {
    return {
      kind: 'inconclusive',
      reason: 'Complex contour winding is negative after known-pole accounting.',
      rootCount,
      candidateCount,
      windingNumber,
      zerosMinusPoles,
      knownPoleCount,
      boundarySampleCount: points.length,
      minimumBoundaryResidual,
      branchDiagnosticCount,
      poleDiagnosticCount,
    };
  }
  if (rootCount === candidateCount) {
    return {
      kind: 'verified',
      rootCount,
      candidateCount,
      windingNumber,
      zerosMinusPoles,
      knownPoleCount,
      boundarySampleCount: points.length,
      minimumBoundaryResidual,
      branchDiagnosticCount,
      poleDiagnosticCount,
    };
  }

  return {
    kind: 'inconclusive',
    reason: 'Complex contour root count does not match the candidate count.',
    rootCount,
    candidateCount,
    windingNumber,
    zerosMinusPoles,
    knownPoleCount,
    boundarySampleCount: points.length,
    minimumBoundaryResidual,
    branchDiagnosticCount,
    poleDiagnosticCount,
  };
}
