import { SAMPLE_ZERO_TOLERANCE } from './types';

export type IntervalNewtonPruneResult =
  | {
      kind: 'pruned';
      derivativeRange: { min: number; max: number };
      newtonImage: { left: number; right: number };
    }
  | { kind: 'kept'; reason: string };

type NumericValueEvaluator = (value: number) => number | null;

type Sample = {
  x: number;
  value: number;
};

const MIN_DERIVATIVE_MAGNITUDE = 1e-8;
const MAX_DERIVATIVE_SPREAD_RATIO = 8;
const NEWTON_IMAGE_PADDING_RATIO = 0.05;

function finiteSample(evaluator: NumericValueEvaluator, x: number): Sample | null {
  const value = evaluator(x);
  return value !== null && Number.isFinite(value) ? { x, value } : null;
}

function sameStrictSign(left: number, right: number) {
  return (left > 0 && right > 0) || (left < 0 && right < 0);
}

function intervalsIntersect(left: { left: number; right: number }, right: { left: number; right: number }) {
  return left.left <= right.right && right.left <= left.right;
}

function derivativeRange(samples: readonly Sample[]) {
  const slopes: number[] = [];
  for (let index = 0; index < samples.length - 1; index += 1) {
    const left = samples[index];
    const right = samples[index + 1];
    const width = right.x - left.x;
    if (width <= 0) {
      return null;
    }
    const slope = (right.value - left.value) / width;
    if (!Number.isFinite(slope)) {
      return null;
    }
    slopes.push(slope);
  }

  const min = Math.min(...slopes);
  const max = Math.max(...slopes);
  const minMagnitude = Math.min(...slopes.map((slope) => Math.abs(slope)));
  const maxMagnitude = Math.max(...slopes.map((slope) => Math.abs(slope)));
  if (
    minMagnitude < MIN_DERIVATIVE_MAGNITUDE
    || min <= 0 && max >= 0
    || maxMagnitude / minMagnitude > MAX_DERIVATIVE_SPREAD_RATIO
  ) {
    return null;
  }

  return { min, max };
}

function divideByDerivativeRange(value: number, range: { min: number; max: number }) {
  const candidates = [value / range.min, value / range.max];
  return { left: Math.min(...candidates), right: Math.max(...candidates) };
}

export function intervalNewtonPruneCell(input: {
  left: number;
  right: number;
  leftValue: number | null;
  rightValue: number | null;
  evaluator: NumericValueEvaluator;
}): IntervalNewtonPruneResult {
  const lo = Math.min(input.left, input.right);
  const hi = Math.max(input.left, input.right);
  const width = hi - lo;
  if (width <= 0 || input.leftValue === null || input.rightValue === null) {
    return { kind: 'kept', reason: 'invalid-cell' };
  }
  if (!sameStrictSign(input.leftValue, input.rightValue)) {
    return { kind: 'kept', reason: 'sign-change-or-endpoint-root' };
  }
  if (Math.min(Math.abs(input.leftValue), Math.abs(input.rightValue)) <= SAMPLE_ZERO_TOLERANCE) {
    return { kind: 'kept', reason: 'near-zero-endpoint' };
  }

  const q1 = lo + width * 0.25;
  const midpoint = lo + width * 0.5;
  const q3 = lo + width * 0.75;
  const samples = [
    { x: lo, value: input.leftValue },
    finiteSample(input.evaluator, q1),
    finiteSample(input.evaluator, midpoint),
    finiteSample(input.evaluator, q3),
    { x: hi, value: input.rightValue },
  ];
  if (samples.some((sample) => sample === null)) {
    return { kind: 'kept', reason: 'unsafe-sample' };
  }

  const typedSamples = samples as Sample[];
  if (typedSamples.some((sample) => Math.abs(sample.value) <= SAMPLE_ZERO_TOLERANCE)) {
    return { kind: 'kept', reason: 'near-zero-interior-sample' };
  }

  const range = derivativeRange(typedSamples);
  if (!range) {
    return { kind: 'kept', reason: 'unsafe-derivative-evidence' };
  }

  const midpointValue = typedSamples[2].value;
  const quotient = divideByDerivativeRange(midpointValue, range);
  const rawImage = {
    left: midpoint - quotient.right,
    right: midpoint - quotient.left,
  };
  const padding = width * NEWTON_IMAGE_PADDING_RATIO;
  const newtonImage = {
    left: Math.min(rawImage.left, rawImage.right) - padding,
    right: Math.max(rawImage.left, rawImage.right) + padding,
  };

  return intervalsIntersect({ left: lo, right: hi }, newtonImage)
    ? { kind: 'kept', reason: 'newton-image-intersects-cell' }
    : { kind: 'pruned', derivativeRange: range, newtonImage };
}
