import { MAX_RESULT_MAGNITUDE, MIN_RESULT_MAGNITUDE } from './result-guard';

type AdaptiveSimpsonOptions = {
  tolerance?: number;
  maxDepth?: number;
};

export type AdaptiveSimpsonResult =
  | { kind: 'success'; value: number }
  | { kind: 'unsafe' }
  | { kind: 'unreliable' };

const DEFAULT_TOLERANCE = 1e-8;
const DEFAULT_MAX_DEPTH = 12;

type Sample = {
  x: number;
  value: number;
};

function unsafeMagnitude(value: number) {
  return !Number.isFinite(value) || Math.abs(value) > MAX_RESULT_MAGNITUDE;
}

function sampleAt(
  evaluator: (value: number) => number | undefined,
  x: number,
): AdaptiveSimpsonResult | Sample {
  const value = evaluator(x);
  if (value === undefined) {
    return { kind: 'unreliable' };
  }

  if (unsafeMagnitude(value)) {
    return { kind: 'unsafe' };
  }

  return { x, value };
}

function simpson(left: Sample, middle: Sample, right: Sample) {
  return ((right.x - left.x) / 6) * (left.value + 4 * middle.value + right.value);
}

function recurseAdaptiveSimpson(
  evaluator: (value: number) => number | undefined,
  left: Sample,
  middle: Sample,
  right: Sample,
  whole: number,
  tolerance: number,
  depth: number,
): AdaptiveSimpsonResult {
  const leftMiddle = sampleAt(evaluator, (left.x + middle.x) / 2);
  const rightMiddle = sampleAt(evaluator, (middle.x + right.x) / 2);

  if ('kind' in leftMiddle) {
    return leftMiddle;
  }

  if ('kind' in rightMiddle) {
    return rightMiddle;
  }

  const leftArea = simpson(left, leftMiddle, middle);
  const rightArea = simpson(middle, rightMiddle, right);
  const refined = leftArea + rightArea;

  if (unsafeMagnitude(refined)) {
    return { kind: 'unsafe' };
  }

  if (depth <= 0 || Math.abs(refined - whole) <= 15 * tolerance) {
    const corrected = refined + (refined - whole) / 15;
    if (unsafeMagnitude(corrected)) {
      return { kind: 'unsafe' };
    }

    return { kind: 'success', value: corrected };
  }

  const leftResult = recurseAdaptiveSimpson(
    evaluator,
    left,
    leftMiddle,
    middle,
    leftArea,
    tolerance / 2,
    depth - 1,
  );
  if (leftResult.kind !== 'success') {
    return leftResult;
  }

  const rightResult = recurseAdaptiveSimpson(
    evaluator,
    middle,
    rightMiddle,
    right,
    rightArea,
    tolerance / 2,
    depth - 1,
  );
  if (rightResult.kind !== 'success') {
    return rightResult;
  }

  const total = leftResult.value + rightResult.value;
  if (unsafeMagnitude(total)) {
    return { kind: 'unsafe' };
  }

  return { kind: 'success', value: total };
}

export function integrateAdaptiveSimpson(
  evaluator: (value: number) => number | undefined,
  lower: number,
  upper: number,
  options: AdaptiveSimpsonOptions = {},
): AdaptiveSimpsonResult {
  if (lower === upper) {
    return { kind: 'success', value: 0 };
  }

  const sign = lower <= upper ? 1 : -1;
  const leftX = Math.min(lower, upper);
  const rightX = Math.max(lower, upper);
  const middleX = (leftX + rightX) / 2;
  const tolerance = options.tolerance ?? DEFAULT_TOLERANCE;
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;

  const left = sampleAt(evaluator, leftX);
  const middle = sampleAt(evaluator, middleX);
  const right = sampleAt(evaluator, rightX);

  if ('kind' in left) {
    return left;
  }

  if ('kind' in middle) {
    return middle;
  }

  if ('kind' in right) {
    return right;
  }

  const whole = simpson(left, middle, right);
  if (unsafeMagnitude(whole)) {
    return { kind: 'unsafe' };
  }

  const result = recurseAdaptiveSimpson(
    evaluator,
    left,
    middle,
    right,
    whole,
    tolerance,
    maxDepth,
  );

  if (result.kind !== 'success') {
    return result;
  }

  const value = sign * result.value;
  if (!Number.isFinite(value) || Math.abs(value) > MAX_RESULT_MAGNITUDE) {
    return { kind: 'unsafe' };
  }

  if (value !== 0 && Math.abs(value) < MIN_RESULT_MAGNITUDE) {
    return { kind: 'unsafe' };
  }

  return { kind: 'success', value };
}
