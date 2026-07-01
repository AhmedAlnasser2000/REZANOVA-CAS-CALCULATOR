const COEFFICIENT_EPSILON = 1e-12;
const SIGN_EPSILON = 1e-10;
const MAX_ISOLATION_DEPTH = 96;
const MIN_INTERVAL_WIDTH = 1e-9;

export type SturmIsolationInterval = {
  left: number;
  right: number;
};

export type SturmRealRootCertification = {
  kind: 'certified' | 'inconclusive';
  distinctRealRootCount: number;
  intervals: SturmIsolationInterval[];
  reason?: string;
};

function trimLeadingZeroes(coefficients: readonly number[]) {
  const firstNonZero = coefficients.findIndex((coefficient) => Math.abs(coefficient) > COEFFICIENT_EPSILON);
  if (firstNonZero === -1) {
    return [0];
  }
  return coefficients.slice(firstNonZero);
}

function normalizePolynomial(coefficients: readonly number[]) {
  const trimmed = trimLeadingZeroes(coefficients);
  const leading = trimmed[0];
  return Math.abs(leading) <= COEFFICIENT_EPSILON
    ? trimmed
    : trimmed.map((coefficient) => coefficient / Math.abs(leading));
}

function polynomialDegree(coefficients: readonly number[]) {
  return trimLeadingZeroes(coefficients).length - 1;
}

function derivative(coefficients: readonly number[]) {
  const normalized = trimLeadingZeroes(coefficients);
  const degree = normalized.length - 1;
  if (degree <= 0) {
    return [0];
  }
  return normalized.slice(0, -1).map((coefficient, index) => coefficient * (degree - index));
}

function evaluate(coefficients: readonly number[], x: number) {
  return coefficients.reduce((value, coefficient) => value * x + coefficient, 0);
}

function subtractScaledAt(
  target: number[],
  divisor: readonly number[],
  offset: number,
  scale: number,
) {
  for (let index = 0; index < divisor.length; index += 1) {
    target[offset + index] -= divisor[index] * scale;
  }
}

function remainder(dividend: readonly number[], divisor: readonly number[]) {
  const normalizedDividend = trimLeadingZeroes(dividend);
  const normalizedDivisor = trimLeadingZeroes(divisor);
  if (polynomialDegree(normalizedDivisor) < 0 || Math.abs(normalizedDivisor[0]) <= COEFFICIENT_EPSILON) {
    return [0];
  }

  const result = [...normalizedDividend];
  const divisorDegree = polynomialDegree(normalizedDivisor);
  while (polynomialDegree(result) >= divisorDegree && Math.abs(result[0]) > COEFFICIENT_EPSILON) {
    const degreeDelta = polynomialDegree(result) - divisorDegree;
    const scale = result[0] / normalizedDivisor[0];
    subtractScaledAt(result, normalizedDivisor, 0, scale);
    const trimmed = trimLeadingZeroes(result);
    result.splice(0, result.length, ...trimmed);
    if (degreeDelta === 0) {
      break;
    }
  }

  return normalizePolynomial(result);
}

function sturmSequence(coefficients: readonly number[]) {
  const sequence = [normalizePolynomial(coefficients), normalizePolynomial(derivative(coefficients))];
  while (sequence.length < 128) {
    const last = sequence[sequence.length - 1];
    const previous = sequence[sequence.length - 2];
    if (polynomialDegree(last) <= 0) {
      break;
    }
    const rem = remainder(previous, last);
    if (polynomialDegree(rem) < 0 || rem.every((coefficient) => Math.abs(coefficient) <= COEFFICIENT_EPSILON)) {
      break;
    }
    sequence.push(normalizePolynomial(rem.map((coefficient) => -coefficient)));
  }
  return sequence.filter((polynomial) => polynomial.some((coefficient) => Math.abs(coefficient) > COEFFICIENT_EPSILON));
}

function signOf(value: number) {
  if (!Number.isFinite(value) || Math.abs(value) <= SIGN_EPSILON) {
    return 0;
  }
  return value > 0 ? 1 : -1;
}

function signVariations(sequence: readonly number[][], x: number) {
  let previousSign = 0;
  let variations = 0;
  for (const polynomial of sequence) {
    const sign = signOf(evaluate(polynomial, x));
    if (sign === 0) {
      continue;
    }
    if (previousSign !== 0 && sign !== previousSign) {
      variations += 1;
    }
    previousSign = sign;
  }
  return variations;
}

function rootCountIn(sequence: readonly number[][], left: number, right: number) {
  return Math.max(0, signVariations(sequence, left) - signVariations(sequence, right));
}

function cauchyRootBound(coefficients: readonly number[]) {
  const normalized = trimLeadingZeroes(coefficients);
  const leading = Math.abs(normalized[0]);
  if (leading <= COEFFICIENT_EPSILON) {
    return 1;
  }
  const rest = normalized.slice(1).map((coefficient) => Math.abs(coefficient));
  return 1 + Math.max(0, ...rest) / leading;
}

function isolateRecursive(
  sequence: readonly number[][],
  left: number,
  right: number,
  count: number,
  intervals: SturmIsolationInterval[],
  depth: number,
): boolean {
  if (count === 0) {
    return true;
  }
  if (count === 1) {
    intervals.push({ left, right });
    return true;
  }
  if (depth >= MAX_ISOLATION_DEPTH || Math.abs(right - left) <= MIN_INTERVAL_WIDTH) {
    return false;
  }

  const midpoint = (left + right) / 2;
  const leftCount = rootCountIn(sequence, left, midpoint);
  const rightCount = rootCountIn(sequence, midpoint, right);
  if (leftCount + rightCount !== count) {
    return false;
  }

  return isolateRecursive(sequence, left, midpoint, leftCount, intervals, depth + 1)
    && isolateRecursive(sequence, midpoint, right, rightCount, intervals, depth + 1);
}

export function certifyRealPolynomialRootsSturm(
  coefficients: readonly number[],
): SturmRealRootCertification {
  const normalized = trimLeadingZeroes(coefficients);
  const degree = polynomialDegree(normalized);
  if (degree <= 0) {
    return { kind: 'certified', distinctRealRootCount: 0, intervals: [] };
  }

  const sequence = sturmSequence(normalized);
  if (sequence.length < 2) {
    return {
      kind: 'inconclusive',
      distinctRealRootCount: 0,
      intervals: [],
      reason: 'Could not construct a stable Sturm sequence.',
    };
  }

  const bound = Math.max(1, cauchyRootBound(normalized));
  const left = -bound;
  const right = bound;
  const distinctRealRootCount = rootCountIn(sequence, left, right);
  const intervals: SturmIsolationInterval[] = [];
  const isolated = isolateRecursive(sequence, left, right, distinctRealRootCount, intervals, 0);
  return isolated
    ? { kind: 'certified', distinctRealRootCount, intervals }
    : {
        kind: 'inconclusive',
        distinctRealRootCount,
        intervals,
        reason: 'Could not isolate every real root within the Sturm budget.',
      };
}

export function rootInSturmIntervals(
  root: number,
  intervals: readonly SturmIsolationInterval[],
  tolerance = 1e-6,
) {
  return intervals.some((interval) =>
    root >= interval.left - tolerance && root <= interval.right + tolerance);
}
