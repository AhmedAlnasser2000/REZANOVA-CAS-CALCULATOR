import { complexAbs, complexSub } from '../../numeric/complex';
import {
  verifyComplexContourWinding,
  type ComplexContourWindingResult,
} from '../../equation/complex/contour-winding';
import type { ComplexNumericEvaluator } from '../../equation/complex/numeric-evaluator';
import {
  findComplexNewtonCandidates,
  type ComplexNewtonCandidate,
  type ComplexRectangularRegion,
  type ComplexSeedGridNewtonResult,
} from '../../equation/complex/seed-grid-newton';

const ROOT_DEDUPE_TOLERANCE = 1e-6;

export type ComplexRegionSubdivisionDiagnostics = {
  enabled: boolean;
  depthLimit: number;
  cellBudget: number;
  processedCellCount: number;
  splitCellCount: number;
  verifiedCellCount: number;
  inconclusiveCellCount: number;
  unsafeCellCount: number;
  terminalCellCount: number;
  maxDepthReached: number;
  exhaustedCellBudget: boolean;
  terminalReasons: string[];
};

export type ComplexRegionVerifiedSearchResult = {
  accepted: ComplexNewtonCandidate[];
  newton: ComplexSeedGridNewtonResult;
  contour: ComplexContourWindingResult;
  subdivision: ComplexRegionSubdivisionDiagnostics;
};

type CellWork = {
  region: ComplexRectangularRegion;
  depth: number;
};

function emptyNewton(): ComplexSeedGridNewtonResult {
  return {
    candidates: [],
    diagnostics: {
      deterministicSeedCount: 0,
      randomSeedCount: 0,
      attemptedSeedCount: 0,
      convergedSeedCount: 0,
      rejectedSeedCount: 0,
      duplicateCount: 0,
      branchDiagnosticCount: 0,
      analyticDerivativeCount: 0,
      finiteDifferenceDerivativeCount: 0,
      dampingRetryCount: 0,
      lowDiscrepancySeedCount: 0,
      adaptiveSeedCount: 0,
      clusterPolishSeedCount: 0,
      maxIterationsReached: 0,
      totalEvaluations: 0,
      supplementalRandomUsed: false,
    },
  };
}

function mergeNewtonDiagnostics(target: ComplexSeedGridNewtonResult, source: ComplexSeedGridNewtonResult) {
  target.diagnostics.deterministicSeedCount += source.diagnostics.deterministicSeedCount;
  target.diagnostics.randomSeedCount += source.diagnostics.randomSeedCount;
  target.diagnostics.attemptedSeedCount += source.diagnostics.attemptedSeedCount;
  target.diagnostics.convergedSeedCount += source.diagnostics.convergedSeedCount;
  target.diagnostics.rejectedSeedCount += source.diagnostics.rejectedSeedCount;
  target.diagnostics.duplicateCount += source.diagnostics.duplicateCount;
  target.diagnostics.branchDiagnosticCount += source.diagnostics.branchDiagnosticCount;
  target.diagnostics.analyticDerivativeCount += source.diagnostics.analyticDerivativeCount;
  target.diagnostics.finiteDifferenceDerivativeCount += source.diagnostics.finiteDifferenceDerivativeCount;
  target.diagnostics.dampingRetryCount += source.diagnostics.dampingRetryCount;
  target.diagnostics.lowDiscrepancySeedCount += source.diagnostics.lowDiscrepancySeedCount;
  target.diagnostics.adaptiveSeedCount += source.diagnostics.adaptiveSeedCount;
  target.diagnostics.clusterPolishSeedCount += source.diagnostics.clusterPolishSeedCount;
  target.diagnostics.maxIterationsReached += source.diagnostics.maxIterationsReached;
  target.diagnostics.totalEvaluations += source.diagnostics.totalEvaluations;
  target.diagnostics.supplementalRandomUsed ||= source.diagnostics.supplementalRandomUsed;
}

function addAcceptedRoot(accepted: ComplexNewtonCandidate[], candidate: ComplexNewtonCandidate) {
  const existingIndex = accepted.findIndex((entry) =>
    complexAbs(complexSub(entry.value, candidate.value)) <= ROOT_DEDUPE_TOLERANCE);
  if (existingIndex === -1) {
    accepted.push(candidate);
    return;
  }
  if (candidate.residualNorm < accepted[existingIndex].residualNorm) {
    accepted[existingIndex] = candidate;
  }
}

function validateCandidates(
  evaluator: ComplexNumericEvaluator,
  candidates: readonly ComplexNewtonCandidate[],
  residualTolerance: number,
) {
  return candidates.filter((candidate) => {
    const evaluated = evaluator.evaluateAt(candidate.value);
    return evaluated.status === 'finite'
      && evaluated.residualNorm !== null
      && evaluated.residualNorm <= residualTolerance;
  });
}

function splitRegion(region: ComplexRectangularRegion): ComplexRectangularRegion[] {
  const midRe = (region.reMin + region.reMax) / 2;
  const midIm = (region.imMin + region.imMax) / 2;
  return [
    { reMin: region.reMin, reMax: midRe, imMin: region.imMin, imMax: midIm },
    { reMin: midRe, reMax: region.reMax, imMin: region.imMin, imMax: midIm },
    { reMin: region.reMin, reMax: midRe, imMin: midIm, imMax: region.imMax },
    { reMin: midRe, reMax: region.reMax, imMin: midIm, imMax: region.imMax },
  ];
}

function contourBoundarySamples(contour: ComplexContourWindingResult) {
  return contour.boundarySampleCount;
}

function contourBranchDiagnostics(contour: ComplexContourWindingResult) {
  return contour.branchDiagnosticCount;
}

function contourMinimumResidual(contour: ComplexContourWindingResult) {
  return contour.minimumBoundaryResidual;
}

function runCell(input: {
  evaluator: ComplexNumericEvaluator;
  region: ComplexRectangularRegion;
  gridSize: number;
  randomSeedCount: number;
  samplesPerEdge: number;
  residualTolerance: number;
}) {
  const newton = findComplexNewtonCandidates({
    evaluator: input.evaluator,
    region: input.region,
    gridSize: input.gridSize,
    randomSeedCount: input.randomSeedCount,
    tolerance: input.residualTolerance,
  });
  const accepted = validateCandidates(input.evaluator, newton.candidates, input.residualTolerance);
  const contour = verifyComplexContourWinding({
    evaluator: input.evaluator,
    region: input.region,
    candidates: accepted,
    samplesPerEdge: input.samplesPerEdge,
  });
  return { newton, accepted, contour };
}

export function searchComplexRegionWithSubdivision(input: {
  evaluator: ComplexNumericEvaluator;
  region: ComplexRectangularRegion;
  gridSize: number;
  randomSeedCount: number;
  samplesPerEdge: number;
  residualTolerance: number;
  subdivisionDepth: number;
  cellBudget: number;
}): ComplexRegionVerifiedSearchResult {
  const aggregateNewton = emptyNewton();
  const accepted: ComplexNewtonCandidate[] = [];
  const queue: CellWork[] = [{ region: input.region, depth: 0 }];
  const depthLimit = Math.max(0, Math.floor(input.subdivisionDepth));
  const cellBudget = Math.max(1, Math.floor(input.cellBudget));
  const subdivision: ComplexRegionSubdivisionDiagnostics = {
    enabled: depthLimit > 0 && cellBudget > 1,
    depthLimit,
    cellBudget,
    processedCellCount: 0,
    splitCellCount: 0,
    verifiedCellCount: 0,
    inconclusiveCellCount: 0,
    unsafeCellCount: 0,
    terminalCellCount: 0,
    maxDepthReached: 0,
    exhaustedCellBudget: false,
    terminalReasons: [],
  };
  let verifiedRootCount = 0;
  let windingNumber = 0;
  let boundarySampleCount = 0;
  let branchDiagnosticCount = 0;
  let minimumBoundaryResidual = Number.POSITIVE_INFINITY;
  let terminalUnsafeReason: string | null = null;
  let terminalInconclusiveReason: string | null = null;

  while (queue.length > 0 && subdivision.processedCellCount < cellBudget) {
    const cell = queue.shift();
    if (!cell) break;
    subdivision.processedCellCount += 1;
    subdivision.maxDepthReached = Math.max(subdivision.maxDepthReached, cell.depth);
    const result = runCell({
      evaluator: input.evaluator,
      region: cell.region,
      gridSize: input.gridSize,
      randomSeedCount: input.randomSeedCount,
      samplesPerEdge: input.samplesPerEdge,
      residualTolerance: input.residualTolerance,
    });
    mergeNewtonDiagnostics(aggregateNewton, result.newton);
    boundarySampleCount += contourBoundarySamples(result.contour);
    branchDiagnosticCount += contourBranchDiagnostics(result.contour);
    const cellMinimumResidual = contourMinimumResidual(result.contour);
    if (cellMinimumResidual !== null) {
      minimumBoundaryResidual = Math.min(minimumBoundaryResidual, cellMinimumResidual);
    }

    if (result.contour.kind === 'verified') {
      subdivision.verifiedCellCount += 1;
      verifiedRootCount += result.contour.rootCount;
      windingNumber += result.contour.windingNumber;
      result.accepted.forEach((candidate) => addAcceptedRoot(accepted, candidate));
      continue;
    }

    const canSplit = subdivision.enabled && cell.depth < depthLimit;
    if (canSplit && subdivision.processedCellCount + queue.length + 4 <= cellBudget) {
      subdivision.splitCellCount += 1;
      queue.push(...splitRegion(cell.region).map((region) => ({ region, depth: cell.depth + 1 })));
      continue;
    }

    subdivision.terminalCellCount += 1;
    if (result.contour.kind === 'unsafe') {
      subdivision.unsafeCellCount += 1;
      terminalUnsafeReason ??= result.contour.reason;
      subdivision.terminalReasons.push(result.contour.reason);
    } else {
      subdivision.inconclusiveCellCount += 1;
      terminalInconclusiveReason ??= result.contour.reason;
      subdivision.terminalReasons.push(result.contour.reason);
    }
  }

  if (queue.length > 0) {
    subdivision.exhaustedCellBudget = true;
    terminalInconclusiveReason ??= 'Adaptive subdivision exhausted the cell budget before all cells were verified.';
    subdivision.terminalReasons.push(terminalInconclusiveReason);
  }

  accepted.sort((left, right) => left.value.re - right.value.re || left.value.im - right.value.im);
  aggregateNewton.candidates = accepted;
  if (
    subdivision.terminalCellCount === 0
    && !subdivision.exhaustedCellBudget
    && verifiedRootCount === accepted.length
  ) {
    return {
      accepted,
      newton: aggregateNewton,
      contour: {
        kind: 'verified',
        rootCount: verifiedRootCount,
        candidateCount: accepted.length,
        windingNumber,
        boundarySampleCount,
        minimumBoundaryResidual: Number.isFinite(minimumBoundaryResidual) ? minimumBoundaryResidual : 0,
        branchDiagnosticCount,
      },
      subdivision,
    };
  }

  return {
    accepted,
    newton: aggregateNewton,
    contour: terminalUnsafeReason
      ? {
          kind: 'unsafe',
          reason: terminalUnsafeReason,
          boundarySampleCount,
          minimumBoundaryResidual: Number.isFinite(minimumBoundaryResidual) ? minimumBoundaryResidual : null,
          branchDiagnosticCount,
        }
      : {
          kind: 'inconclusive',
          reason: terminalInconclusiveReason ?? 'Adaptive subdivision did not verify every cell.',
          rootCount: verifiedRootCount,
          candidateCount: accepted.length,
          windingNumber,
          boundarySampleCount,
          minimumBoundaryResidual: Number.isFinite(minimumBoundaryResidual) ? minimumBoundaryResidual : null,
          branchDiagnosticCount,
        },
    subdivision,
  };
}
