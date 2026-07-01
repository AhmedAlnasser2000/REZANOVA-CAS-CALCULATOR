export type RealRootKernelMethodId = 'itp';

export type RealRootKernelTermination =
  | 'residual'
  | 'interval'
  | 'best-residual';

export type RealRootKernelFailureReason =
  | 'invalid-endpoint'
  | 'no-sign-change'
  | 'unsafe-evaluation'
  | 'max-iterations'
  | 'no-convergence';

export type RealRootKernelInterval = {
  left: number;
  right: number;
};

export type RealRootKernelEvaluator = (value: number) => number | null;

export type RealRootKernelRequest = {
  interval: RealRootKernelInterval;
  evaluator: RealRootKernelEvaluator;
  tolerance: number;
  residualTolerance: number;
  maxEvaluations: number;
};

export type RealRootKernelSuccess = {
  kind: 'success';
  methodId: RealRootKernelMethodId;
  root: number;
  residual: number;
  interval: RealRootKernelInterval;
  iterations: number;
  evaluations: number;
  accelerationSteps: number;
  termination: RealRootKernelTermination;
};

export type RealRootKernelError = {
  kind: 'error';
  methodId: RealRootKernelMethodId;
  reason: RealRootKernelFailureReason;
  interval: RealRootKernelInterval;
  iterations: number;
  evaluations: number;
  accelerationSteps: number;
  bestCandidate?: number;
  bestResidual?: number;
};

export type RealRootKernelResult = RealRootKernelSuccess | RealRootKernelError;

type EvaluatedCandidate = { x: number; value: number };

type AccelerationProbe = {
  candidate: number;
  sampled: EvaluatedCandidate[];
};

const ITP_K1 = 0.2;
const ITP_K2 = 2;
const ITP_N0 = 1;

function signChanged(left: number, right: number): boolean {
  return left === 0 || right === 0 || left * right < 0;
}

function isInsideOpenInterval(value: number, left: number, right: number): boolean {
  const lo = Math.min(left, right);
  const hi = Math.max(left, right);
  return Number.isFinite(value) && value > lo && value < hi;
}

function regulaFalsiCandidate(left: number, leftValue: number, right: number, rightValue: number): number | null {
  if (leftValue === rightValue) {
    return null;
  }
  const candidate = (rightValue * left - leftValue * right) / (rightValue - leftValue);
  return Number.isFinite(candidate) ? candidate : null;
}

function initialBisectionBudget(width: number, tolerance: number): number {
  if (!Number.isFinite(width) || !Number.isFinite(tolerance) || width <= 0 || tolerance <= 0) {
    return 0;
  }
  return Math.max(0, Math.ceil(Math.log2(width / (2 * tolerance))));
}

function itpCandidate(
  left: number,
  leftValue: number,
  right: number,
  rightValue: number,
  iteration: number,
  bisectionBudget: number,
  tolerance: number,
): number {
  const midpoint = (left + right) / 2;
  const interpolation = regulaFalsiCandidate(left, leftValue, right, rightValue);
  if (interpolation === null) {
    return midpoint;
  }

  const width = Math.abs(right - left);
  const midpointDelta = midpoint - interpolation;
  const sigma = midpointDelta >= 0 ? 1 : -1;
  const truncationRadius = ITP_K1 * Math.pow(width, ITP_K2);
  const truncationDelta = Math.min(truncationRadius, Math.abs(midpointDelta));
  const truncated = interpolation + sigma * truncationDelta;
  const remainingBudget = Math.max(0, bisectionBudget + ITP_N0 - iteration);
  const projectionRadius = Math.max(0, tolerance * Math.pow(2, remainingBudget) - width / 2);

  if (Math.abs(truncated - midpoint) <= projectionRadius) {
    return truncated;
  }
  return midpoint - sigma * projectionRadius;
}

function fallbackMidpointCandidate(
  evaluator: RealRootKernelEvaluator,
  left: number,
  right: number,
): EvaluatedCandidate | null {
  const midpoint = (left + right) / 2;
  const midpointValue = evaluator(midpoint);
  return midpointValue === null ? null : { x: midpoint, value: midpointValue };
}

function evaluateCandidate(
  evaluator: RealRootKernelEvaluator,
  candidate: number,
  left: number,
  right: number,
): EvaluatedCandidate | null {
  if (!isInsideOpenInterval(candidate, left, right)) {
    return fallbackMidpointCandidate(evaluator, left, right);
  }

  const candidateValue = evaluator(candidate);
  if (candidateValue === null) {
    return fallbackMidpointCandidate(evaluator, left, right);
  }

  return { x: candidate, value: candidateValue };
}

function derivativeProbeStep(left: number, right: number) {
  const width = Math.abs(right - left);
  return Math.max(1e-6, width * 1e-4);
}

function guardedNewtonCandidate(
  evaluator: (value: number) => number | null,
  left: number,
  right: number,
): AccelerationProbe | null {
  const midpoint = (left + right) / 2;
  const width = Math.abs(right - left);
  const step = derivativeProbeStep(left, right);
  const probeLeft = midpoint - step;
  const probeRight = midpoint + step;
  if (
    width <= 0
    || !isInsideOpenInterval(probeLeft, left, right)
    || !isInsideOpenInterval(probeRight, left, right)
  ) {
    return null;
  }

  const midpointValue = evaluator(midpoint);
  const leftValue = evaluator(probeLeft);
  const rightValue = evaluator(probeRight);
  if (midpointValue === null || leftValue === null || rightValue === null) {
    return null;
  }

  const slope = (rightValue - leftValue) / (2 * step);
  if (!Number.isFinite(slope) || Math.abs(slope) < 1e-12) {
    return null;
  }

  const candidate = midpoint - midpointValue / slope;
  const guardBand = width * 0.05;
  const lo = Math.min(left, right) + guardBand;
  const hi = Math.max(left, right) - guardBand;
  if (!Number.isFinite(candidate) || candidate <= lo || candidate >= hi) {
    return null;
  }

  return {
    candidate,
    sampled: [
      { x: midpoint, value: midpointValue },
      { x: probeLeft, value: leftValue },
      { x: probeRight, value: rightValue },
    ],
  };
}

export function refineRealRootBracket(request: RealRootKernelRequest): RealRootKernelResult {
  const methodId: RealRootKernelMethodId = 'itp';
  let evaluations = 0;
  let accelerationSteps = 0;
  let lo = request.interval.left;
  let hi = request.interval.right;

  const evaluate = (value: number) => {
    if (evaluations >= request.maxEvaluations) {
      return null;
    }
    evaluations += 1;
    const evaluated = request.evaluator(value);
    return evaluated !== null && Number.isFinite(evaluated) ? evaluated : null;
  };

  const initialLoValue = evaluate(lo);
  const initialHiValue = evaluate(hi);
  const currentInterval = () => ({ left: lo, right: hi });

  if (initialLoValue === null || initialHiValue === null) {
    return {
      kind: 'error',
      methodId,
      reason: 'invalid-endpoint',
      interval: currentInterval(),
      iterations: 0,
      evaluations,
      accelerationSteps,
    };
  }

  let loValue: number = initialLoValue;
  let hiValue: number = initialHiValue;
  if (Math.abs(loValue) <= request.tolerance) {
    return {
      kind: 'success',
      methodId,
      root: lo,
      residual: Math.abs(loValue),
      interval: currentInterval(),
      iterations: 0,
      evaluations,
      accelerationSteps,
      termination: 'residual',
    };
  }
  if (Math.abs(hiValue) <= request.tolerance) {
    return {
      kind: 'success',
      methodId,
      root: hi,
      residual: Math.abs(hiValue),
      interval: currentInterval(),
      iterations: 0,
      evaluations,
      accelerationSteps,
      termination: 'residual',
    };
  }
  if (!signChanged(loValue, hiValue)) {
    return {
      kind: 'error',
      methodId,
      reason: 'no-sign-change',
      interval: currentInterval(),
      iterations: 0,
      evaluations,
      accelerationSteps,
    };
  }

  let bestX = Math.abs(loValue) <= Math.abs(hiValue) ? lo : hi;
  let bestValue = Math.abs(loValue) <= Math.abs(hiValue) ? loValue : hiValue;
  const updateBest = (candidate: EvaluatedCandidate) => {
    if (Math.abs(candidate.value) < Math.abs(bestValue)) {
      bestX = candidate.x;
      bestValue = candidate.value;
    }
  };
  const bisectionBudget = initialBisectionBudget(Math.abs(hi - lo), request.tolerance);

  for (let iteration = 0; iteration < request.maxEvaluations; iteration += 1) {
    const width = Math.abs(hi - lo);
    if (width <= request.tolerance) {
      if (Math.abs(bestValue) <= request.residualTolerance) {
        return {
          kind: 'success',
          methodId,
          root: bestX,
          residual: Math.abs(bestValue),
          interval: currentInterval(),
          iterations: iteration,
          evaluations,
          accelerationSteps,
          termination: 'interval',
        };
      }
      return {
        kind: 'error',
        methodId,
        reason: 'no-convergence',
        interval: currentInterval(),
        iterations: iteration,
        evaluations,
        accelerationSteps,
        bestCandidate: bestX,
        bestResidual: Math.abs(bestValue),
      };
    }

    const accelerated = guardedNewtonCandidate(evaluate, lo, hi);
    accelerated?.sampled.forEach(updateBest);
    const candidate = accelerated?.candidate ?? itpCandidate(
      lo,
      loValue,
      hi,
      hiValue,
      iteration,
      bisectionBudget,
      request.tolerance,
    );
    const evaluated = evaluateCandidate(evaluate, candidate, lo, hi)
      ?? fallbackMidpointCandidate(evaluate, lo, hi);
    if (accelerated && evaluated && Math.abs(evaluated.value) < Math.abs(bestValue)) {
      accelerationSteps += 1;
    }

    if (!evaluated) {
      return {
        kind: 'error',
        methodId,
        reason: evaluations >= request.maxEvaluations ? 'max-iterations' : 'unsafe-evaluation',
        interval: currentInterval(),
        iterations: iteration + 1,
        evaluations,
        accelerationSteps,
        bestCandidate: bestX,
        bestResidual: Math.abs(bestValue),
      };
    }

    updateBest(evaluated);

    if (Math.abs(evaluated.value) <= request.tolerance) {
      return {
        kind: 'success',
        methodId,
        root: evaluated.x,
        residual: Math.abs(evaluated.value),
        interval: currentInterval(),
        iterations: iteration + 1,
        evaluations,
        accelerationSteps,
        termination: 'residual',
      };
    }

    if (signChanged(loValue, evaluated.value)) {
      hi = evaluated.x;
      hiValue = evaluated.value;
    } else {
      lo = evaluated.x;
      loValue = evaluated.value;
    }
  }

  if (Math.abs(bestValue) <= request.residualTolerance) {
    return {
      kind: 'success',
      methodId,
      root: bestX,
      residual: Math.abs(bestValue),
      interval: currentInterval(),
      iterations: request.maxEvaluations,
      evaluations,
      accelerationSteps,
      termination: 'best-residual',
    };
  }

  return {
    kind: 'error',
    methodId,
    reason: 'max-iterations',
    interval: currentInterval(),
    iterations: request.maxEvaluations,
    evaluations,
    accelerationSteps,
    bestCandidate: bestX,
    bestResidual: Math.abs(bestValue),
  };
}
