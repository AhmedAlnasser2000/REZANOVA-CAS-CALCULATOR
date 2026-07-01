export type RealRootKernelMethodId = 'brent-dekker';

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
  termination: RealRootKernelTermination;
};

export type RealRootKernelError = {
  kind: 'error';
  methodId: RealRootKernelMethodId;
  reason: RealRootKernelFailureReason;
  interval: RealRootKernelInterval;
  iterations: number;
  evaluations: number;
  bestCandidate?: number;
  bestResidual?: number;
};

export type RealRootKernelResult = RealRootKernelSuccess | RealRootKernelError;

type EvaluatedCandidate = { x: number; value: number };

function signChanged(left: number, right: number): boolean {
  return left === 0 || right === 0 || left * right < 0;
}

function isInsideOpenInterval(value: number, left: number, right: number): boolean {
  const lo = Math.min(left, right);
  const hi = Math.max(left, right);
  return Number.isFinite(value) && value > lo && value < hi;
}

function inverseQuadraticCandidate(
  a: number,
  fa: number,
  b: number,
  fb: number,
  c: number,
  fc: number,
): number | null {
  if (fa === fb || fa === fc || fb === fc) {
    return null;
  }

  return (
    (a * fb * fc) / ((fa - fb) * (fa - fc))
    + (b * fa * fc) / ((fb - fa) * (fb - fc))
    + (c * fa * fb) / ((fc - fa) * (fc - fb))
  );
}

function secantCandidate(a: number, fa: number, b: number, fb: number): number | null {
  if (fa === fb) {
    return null;
  }
  return b - (fb * (b - a)) / (fb - fa);
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

export function refineRealRootBracket(request: RealRootKernelRequest): RealRootKernelResult {
  const methodId: RealRootKernelMethodId = 'brent-dekker';
  let evaluations = 0;
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
    };
  }

  let previousX = lo;
  let previousValue = loValue;
  let bestX = Math.abs(loValue) <= Math.abs(hiValue) ? lo : hi;
  let bestValue = Math.abs(loValue) <= Math.abs(hiValue) ? loValue : hiValue;

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
        bestCandidate: bestX,
        bestResidual: Math.abs(bestValue),
      };
    }

    const midpoint = (lo + hi) / 2;
    const interpolation = inverseQuadraticCandidate(
      previousX,
      previousValue,
      lo,
      loValue,
      hi,
      hiValue,
    ) ?? secantCandidate(lo, loValue, hi, hiValue);
    const candidate = interpolation ?? midpoint;
    const evaluated = evaluateCandidate(evaluate, candidate, lo, hi)
      ?? fallbackMidpointCandidate(evaluate, lo, hi);

    if (!evaluated) {
      return {
        kind: 'error',
        methodId,
        reason: evaluations >= request.maxEvaluations ? 'max-iterations' : 'unsafe-evaluation',
        interval: currentInterval(),
        iterations: iteration + 1,
        evaluations,
        bestCandidate: bestX,
        bestResidual: Math.abs(bestValue),
      };
    }

    if (Math.abs(evaluated.value) < Math.abs(bestValue)) {
      bestX = evaluated.x;
      bestValue = evaluated.value;
    }

    if (Math.abs(evaluated.value) <= request.tolerance) {
      return {
        kind: 'success',
        methodId,
        root: evaluated.x,
        residual: Math.abs(evaluated.value),
        interval: currentInterval(),
        iterations: iteration + 1,
        evaluations,
        termination: 'residual',
      };
    }

    previousX = Math.abs(loValue) > Math.abs(hiValue) ? lo : hi;
    previousValue = Math.abs(loValue) > Math.abs(hiValue) ? loValue : hiValue;

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
    bestCandidate: bestX,
    bestResidual: Math.abs(bestValue),
  };
}
