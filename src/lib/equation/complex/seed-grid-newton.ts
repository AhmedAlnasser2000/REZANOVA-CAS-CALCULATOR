import {
  complex,
  complexAbs,
  complexDiv,
  complexSub,
  normalizeComplex,
  type ComplexValue,
} from '../../numeric/complex';
import type { ComplexNumericEvaluator } from './numeric-evaluator';

export type ComplexRectangularRegion = {
  reMin: number;
  reMax: number;
  imMin: number;
  imMax: number;
};

export type ComplexNewtonCandidate = {
  value: ComplexValue;
  residualNorm: number;
  source: 'deterministic-grid' | 'supplemental-random';
  iterations: number;
};

export type ComplexSeedGridNewtonResult = {
  candidates: ComplexNewtonCandidate[];
  diagnostics: {
    deterministicSeedCount: number;
    randomSeedCount: number;
    attemptedSeedCount: number;
    convergedSeedCount: number;
    rejectedSeedCount: number;
    duplicateCount: number;
    branchDiagnosticCount: number;
    maxIterationsReached: number;
    totalEvaluations: number;
    supplementalRandomUsed: boolean;
  };
};

const DEFAULT_GRID_SIZE = 7;
const DEFAULT_RANDOM_SEED_COUNT = 0;
const DEFAULT_MAX_ITERATIONS = 40;
const DEFAULT_RESIDUAL_TOLERANCE = 1e-8;
const DEFAULT_DEDUPE_TOLERANCE = 1e-6;
const DERIVATIVE_STEP_SCALE = 1e-6;

function regionWidth(region: ComplexRectangularRegion) {
  return region.reMax - region.reMin;
}

function regionHeight(region: ComplexRectangularRegion) {
  return region.imMax - region.imMin;
}

function isFiniteRegion(region: ComplexRectangularRegion) {
  return Number.isFinite(region.reMin)
    && Number.isFinite(region.reMax)
    && Number.isFinite(region.imMin)
    && Number.isFinite(region.imMax)
    && region.reMin < region.reMax
    && region.imMin < region.imMax;
}

function isInsideRegion(value: ComplexValue, region: ComplexRectangularRegion) {
  return value.re >= region.reMin
    && value.re <= region.reMax
    && value.im >= region.imMin
    && value.im <= region.imMax;
}

function deterministicGridSeeds(region: ComplexRectangularRegion, gridSize: number) {
  const boundedGridSize = Math.max(1, Math.floor(gridSize));
  if (boundedGridSize === 1) {
    return [complex((region.reMin + region.reMax) / 2, (region.imMin + region.imMax) / 2)];
  }

  const seeds: ComplexValue[] = [];
  for (let reIndex = 0; reIndex < boundedGridSize; reIndex += 1) {
    for (let imIndex = 0; imIndex < boundedGridSize; imIndex += 1) {
      seeds.push(complex(
        region.reMin + (regionWidth(region) * reIndex) / (boundedGridSize - 1),
        region.imMin + (regionHeight(region) * imIndex) / (boundedGridSize - 1),
      ));
    }
  }
  return seeds;
}

function createRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function randomSeeds(region: ComplexRectangularRegion, count: number, seed: number) {
  const random = createRandom(seed);
  return Array.from({ length: Math.max(0, Math.floor(count)) }, () =>
    complex(
      region.reMin + regionWidth(region) * random(),
      region.imMin + regionHeight(region) * random(),
    ));
}

function finiteValue(evaluator: ComplexNumericEvaluator, value: ComplexValue) {
  const evaluated = evaluator.evaluateAt(value);
  return evaluated.status === 'finite' && evaluated.value
    ? evaluated
    : null;
}

function numericDerivative(evaluator: ComplexNumericEvaluator, value: ComplexValue) {
  const step = DERIVATIVE_STEP_SCALE * Math.max(1, complexAbs(value));
  const left = finiteValue(evaluator, complex(value.re - step, value.im));
  const right = finiteValue(evaluator, complex(value.re + step, value.im));
  if (!left?.value || !right?.value) {
    return null;
  }
  const difference = complexSub(right.value, left.value);
  return complex(difference.re / (2 * step), difference.im / (2 * step));
}

function bestDampedStep(input: {
  evaluator: ComplexNumericEvaluator;
  current: ComplexValue;
  residual: number;
  step: ComplexValue;
  region: ComplexRectangularRegion;
}) {
  let damping = 1;
  let best: { value: ComplexValue; residual: number } | null = null;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = complexSub(input.current, complex(input.step.re * damping, input.step.im * damping));
    if (isInsideRegion(candidate, input.region)) {
      const evaluated = finiteValue(input.evaluator, candidate);
      if (evaluated?.value && evaluated.residualNorm !== null && evaluated.residualNorm < input.residual) {
        best = { value: candidate, residual: evaluated.residualNorm };
        break;
      }
    }
    damping /= 2;
  }
  return best;
}

function refineSeed(input: {
  evaluator: ComplexNumericEvaluator;
  seed: ComplexValue;
  region: ComplexRectangularRegion;
  source: ComplexNewtonCandidate['source'];
  maxIterations: number;
  tolerance: number;
}) {
  let current = input.seed;
  let totalEvaluations = 0;
  let branchDiagnosticCount = 0;

  for (let iteration = 0; iteration < input.maxIterations; iteration += 1) {
    const evaluated = input.evaluator.evaluateAt(current);
    totalEvaluations += evaluated.evaluationCount;
    branchDiagnosticCount += evaluated.diagnostics
      .filter((entry) => /branch/i.test(entry.code)).length;

    if (evaluated.status !== 'finite' || !evaluated.value || evaluated.residualNorm === null) {
      return { kind: 'rejected' as const, totalEvaluations, branchDiagnosticCount };
    }
    if (evaluated.residualNorm <= input.tolerance) {
      return {
        kind: 'converged' as const,
        candidate: {
          value: normalizeComplex(current, input.tolerance),
          residualNorm: evaluated.residualNorm,
          source: input.source,
          iterations: iteration,
        },
        totalEvaluations,
        branchDiagnosticCount,
      };
    }

    const derivative = numericDerivative(input.evaluator, current);
    totalEvaluations += 2;
    if (!derivative || complexAbs(derivative) < 1e-12) {
      return { kind: 'rejected' as const, totalEvaluations, branchDiagnosticCount };
    }

    let step: ComplexValue;
    try {
      step = complexDiv(evaluated.value, derivative);
    } catch {
      return { kind: 'rejected' as const, totalEvaluations, branchDiagnosticCount };
    }
    const maxStep = Math.max(regionWidth(input.region), regionHeight(input.region)) / 2;
    const stepSize = complexAbs(step);
    if (stepSize > maxStep && stepSize > 0) {
      step = complex(step.re * maxStep / stepSize, step.im * maxStep / stepSize);
    }
    const next = bestDampedStep({
      evaluator: input.evaluator,
      current,
      residual: evaluated.residualNorm,
      step,
      region: input.region,
    });
    totalEvaluations += 8;
    if (!next) {
      return { kind: 'rejected' as const, totalEvaluations, branchDiagnosticCount };
    }
    current = next.value;
  }

  return { kind: 'max-iterations' as const, totalEvaluations, branchDiagnosticCount };
}

function addCandidate(
  candidates: ComplexNewtonCandidate[],
  candidate: ComplexNewtonCandidate,
  dedupeTolerance: number,
) {
  const existingIndex = candidates.findIndex((entry) =>
    complexAbs(complexSub(entry.value, candidate.value)) <= dedupeTolerance);
  if (existingIndex === -1) {
    candidates.push(candidate);
    return false;
  }

  if (candidate.residualNorm < candidates[existingIndex].residualNorm) {
    candidates[existingIndex] = candidate;
  }
  return true;
}

export function findComplexNewtonCandidates(input: {
  evaluator: ComplexNumericEvaluator;
  region: ComplexRectangularRegion;
  gridSize?: number;
  randomSeedCount?: number;
  randomSeed?: number;
  maxIterations?: number;
  tolerance?: number;
  dedupeTolerance?: number;
}): ComplexSeedGridNewtonResult {
  const diagnostics = {
    deterministicSeedCount: 0,
    randomSeedCount: 0,
    attemptedSeedCount: 0,
    convergedSeedCount: 0,
    rejectedSeedCount: 0,
    duplicateCount: 0,
    branchDiagnosticCount: 0,
    maxIterationsReached: 0,
    totalEvaluations: 0,
    supplementalRandomUsed: false,
  };
  if (!isFiniteRegion(input.region)) {
    return { candidates: [], diagnostics };
  }

  const gridSeeds = deterministicGridSeeds(input.region, input.gridSize ?? DEFAULT_GRID_SIZE);
  const supplemental = randomSeeds(
    input.region,
    input.randomSeedCount ?? DEFAULT_RANDOM_SEED_COUNT,
    input.randomSeed ?? 0xdecafbad,
  );
  const candidates: ComplexNewtonCandidate[] = [];
  const maxIterations = input.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  const tolerance = input.tolerance ?? DEFAULT_RESIDUAL_TOLERANCE;
  const dedupeTolerance = input.dedupeTolerance ?? DEFAULT_DEDUPE_TOLERANCE;

  diagnostics.deterministicSeedCount = gridSeeds.length;
  diagnostics.randomSeedCount = supplemental.length;
  diagnostics.supplementalRandomUsed = supplemental.length > 0;

  for (const [seeds, source] of [
    [gridSeeds, 'deterministic-grid'],
    [supplemental, 'supplemental-random'],
  ] as const) {
    for (const seed of seeds) {
      diagnostics.attemptedSeedCount += 1;
      const refined = refineSeed({
        evaluator: input.evaluator,
        seed,
        region: input.region,
        source,
        maxIterations,
        tolerance,
      });
      diagnostics.totalEvaluations += refined.totalEvaluations;
      diagnostics.branchDiagnosticCount += refined.branchDiagnosticCount;
      if (refined.kind === 'converged') {
        diagnostics.convergedSeedCount += 1;
        if (addCandidate(candidates, refined.candidate, dedupeTolerance)) {
          diagnostics.duplicateCount += 1;
        }
      } else if (refined.kind === 'max-iterations') {
        diagnostics.maxIterationsReached += 1;
      } else {
        diagnostics.rejectedSeedCount += 1;
      }
    }
  }

  return {
    candidates: candidates.sort((left, right) => left.value.re - right.value.re || left.value.im - right.value.im),
    diagnostics,
  };
}
