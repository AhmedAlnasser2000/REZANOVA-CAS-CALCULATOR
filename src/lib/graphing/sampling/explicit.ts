import type { GraphSamplingBudgetsV1, GraphViewportV1 } from '../contracts';
import { createGraphExpressionEvaluator } from '../evaluator';
import type {
  GraphExplicitSamplingInput,
  GraphSampledExplicitPath,
} from './types';

type SamplePoint = {
  independent: number;
  x: number;
  y: number;
  finite: boolean;
  drawable: boolean;
};

type SamplingQualityPolicy = {
  initialIntervals: number;
  maximumSegmentPixels: number;
  midpointTolerancePixels: number;
  turnToleranceRadians: number;
};

const QUALITY_POLICY: Record<'preview' | 'settled', SamplingQualityPolicy> = {
  preview: {
    initialIntervals: 12,
    maximumSegmentPixels: 56,
    midpointTolerancePixels: 2.5,
    turnToleranceRadians: 0.45,
  },
  settled: {
    initialIntervals: 24,
    maximumSegmentPixels: 28,
    midpointTolerancePixels: 0.8,
    turnToleranceRadians: 0.2,
  },
};

function defaultNow() {
  return performance.now();
}

function worldToScreen(
  point: SamplePoint,
  viewport: GraphViewportV1,
  cssSize: { width: number; height: number },
) {
  return {
    x: (point.x - viewport.xMin) / (viewport.xMax - viewport.xMin) * cssSize.width,
    y: (viewport.yMax - point.y) / (viewport.yMax - viewport.yMin) * cssSize.height,
  };
}

function metricScreenPoint(
  point: SamplePoint,
  viewport: GraphViewportV1,
  cssSize: { width: number; height: number },
) {
  const projected = worldToScreen(point, viewport, cssSize);
  return {
    x: Math.max(-cssSize.width * 2, Math.min(cssSize.width * 3, projected.x)),
    y: Math.max(-cssSize.height * 2, Math.min(cssSize.height * 3, projected.y)),
  };
}

function distance(left: { x: number; y: number }, right: { x: number; y: number }) {
  return Math.hypot(right.x - left.x, right.y - left.y);
}

function turnAngle(
  left: { x: number; y: number },
  middle: { x: number; y: number },
  right: { x: number; y: number },
) {
  const ax = middle.x - left.x;
  const ay = middle.y - left.y;
  const bx = right.x - middle.x;
  const by = right.y - middle.y;
  const aLength = Math.hypot(ax, ay);
  const bLength = Math.hypot(bx, by);
  if (aLength === 0 || bLength === 0) return 0;
  const cosine = Math.max(-1, Math.min(1, (ax * bx + ay * by) / (aLength * bLength)));
  return Math.acos(cosine);
}

function dependentValue(point: SamplePoint, relationKind: 'explicit-y' | 'explicit-x') {
  return relationKind === 'explicit-y' ? point.y : point.x;
}

function dependentBounds(viewport: GraphViewportV1, relationKind: 'explicit-y' | 'explicit-x') {
  return relationKind === 'explicit-y'
    ? { minimum: viewport.yMin, maximum: viewport.yMax }
    : { minimum: viewport.xMin, maximum: viewport.xMax };
}

function outsideSide(value: number, minimum: number, maximum: number) {
  if (value < minimum) return -1;
  if (value > maximum) return 1;
  return 0;
}

function samplingStop(
  status: 'budget-exhausted' | 'cancelled',
  detailCode: string,
) {
  return {
    status,
    stopReason: {
      code: status === 'cancelled' ? 'sampling-cancelled' : 'sampling-budget-exceeded',
      detailCode,
    } as const,
  };
}

export function sampleExplicitGraphRelation(
  input: GraphExplicitSamplingInput,
): GraphSampledExplicitPath {
  const policy = QUALITY_POLICY[input.quality];
  const now = input.control?.now ?? defaultNow;
  const isCancelled = input.control?.isCancelled ?? (() => false);
  const startedAt = now();
  const evaluator = createGraphExpressionEvaluator(input.plan.expression);
  const environment: Record<string, number> = { ...input.parameterEnvironment };
  const samples = new Map<number, SamplePoint>();
  const breakPairs = new Set<string>();
  let maximumDepthReached = 0;
  let stop: ReturnType<typeof samplingStop> | null = null;

  const visibleIndependentMinimum = input.plan.relationKind === 'explicit-y'
    ? input.viewport.xMin
    : input.viewport.yMin;
  const visibleIndependentMaximum = input.plan.relationKind === 'explicit-y'
    ? input.viewport.xMax
    : input.viewport.yMax;
  const independentSpan = visibleIndependentMaximum - visibleIndependentMinimum;
  const overscan = independentSpan * (input.quality === 'preview' ? 0.12 : 0.2);
  const independentMinimum = visibleIndependentMinimum - overscan;
  const independentMaximum = visibleIndependentMaximum + overscan;
  const dependent = dependentBounds(input.viewport, input.plan.relationKind);
  const dependentSpan = dependent.maximum - dependent.minimum;
  const extendedMinimum = dependent.minimum - dependentSpan * 4;
  const extendedMaximum = dependent.maximum + dependentSpan * 4;

  const pairKey = (left: number, right: number) => `${left}:${right}`;
  const markBreak = (left: SamplePoint, right: SamplePoint) => {
    breakPairs.add(pairKey(left.independent, right.independent));
  };

  const evaluateAt = (independent: number): SamplePoint | null => {
    const existing = samples.get(independent);
    if (existing) return existing;
    if (isCancelled()) {
      stop ??= samplingStop('cancelled', 'cooperative-cancellation');
      return null;
    }
    if (samples.size >= input.budgets.maximumSamples) {
      stop ??= samplingStop('budget-exhausted', 'maximum-samples');
      return null;
    }
    if (now() - startedAt >= input.budgets.maximumTimeMs) {
      stop ??= samplingStop('budget-exhausted', 'maximum-time');
      return null;
    }
    environment[input.plan.independentSymbol] = independent;
    const evaluated = evaluator.evaluate(environment);
    const finite = evaluated.status === 'finite';
    const dependentCoordinate = finite ? evaluated.value : Number.NaN;
    const point: SamplePoint = {
      independent,
      x: input.plan.relationKind === 'explicit-y' ? independent : dependentCoordinate,
      y: input.plan.relationKind === 'explicit-y' ? dependentCoordinate : independent,
      finite,
      drawable: finite
        && dependentCoordinate >= extendedMinimum
        && dependentCoordinate <= extendedMaximum,
    };
    samples.set(independent, point);
    return point;
  };

  const refine = (left: SamplePoint, right: SamplePoint, depth: number): void => {
    maximumDepthReached = Math.max(maximumDepthReached, depth);
    if (stop) {
      markBreak(left, right);
      return;
    }
    const middleValue = left.independent + (right.independent - left.independent) / 2;
    if (middleValue === left.independent || middleValue === right.independent) return;
    const middle = evaluateAt(middleValue);
    if (!middle) {
      markBreak(left, right);
      return;
    }
    const finiteTransition = left.finite !== middle.finite || middle.finite !== right.finite;
    let shouldRefine = finiteTransition;
    let suspectedDiscontinuity = finiteTransition || !middle.finite;

    if (left.finite && middle.finite && right.finite) {
      const leftScreen = metricScreenPoint(left, input.viewport, input.cssSize);
      const middleScreen = metricScreenPoint(middle, input.viewport, input.cssSize);
      const rightScreen = metricScreenPoint(right, input.viewport, input.cssSize);
      const chordMiddle = {
        x: (leftScreen.x + rightScreen.x) / 2,
        y: (leftScreen.y + rightScreen.y) / 2,
      };
      const midpointDeviation = distance(middleScreen, chordMiddle);
      const maximumSegment = Math.max(
        distance(leftScreen, middleScreen),
        distance(middleScreen, rightScreen),
      );
      const angle = turnAngle(leftScreen, middleScreen, rightScreen);
      const leftDependent = dependentValue(left, input.plan.relationKind);
      const middleDependent = dependentValue(middle, input.plan.relationKind);
      const rightDependent = dependentValue(right, input.plan.relationKind);
      const leftSide = outsideSide(leftDependent, dependent.minimum, dependent.maximum);
      const middleSide = outsideSide(middleDependent, dependent.minimum, dependent.maximum);
      const rightSide = outsideSide(rightDependent, dependent.minimum, dependent.maximum);
      const viewportReentry = leftSide === rightSide && leftSide !== 0 && middleSide !== leftSide;
      const whollyOffscreenSameSide = leftSide !== 0
        && leftSide === middleSide
        && middleSide === rightSide;
      const largeJump = Math.abs(rightDependent - leftDependent) > dependentSpan * 4;
      suspectedDiscontinuity = largeJump
        && midpointDeviation > Math.max(input.cssSize.width, input.cssSize.height) * 0.35;
      shouldRefine = (!whollyOffscreenSameSide && (
        midpointDeviation > policy.midpointTolerancePixels
        || maximumSegment > policy.maximumSegmentPixels
        || angle > policy.turnToleranceRadians
      ))
        || viewportReentry
        || suspectedDiscontinuity;
    }

    if (shouldRefine && depth < input.budgets.maximumRecursionDepth) {
      refine(left, middle, depth + 1);
      refine(middle, right, depth + 1);
      return;
    }
    if (suspectedDiscontinuity) {
      const leftToMiddle = left.finite && middle.finite
        ? Math.abs(dependentValue(left, input.plan.relationKind)
          - dependentValue(middle, input.plan.relationKind))
        : Number.POSITIVE_INFINITY;
      const middleToRight = middle.finite && right.finite
        ? Math.abs(dependentValue(middle, input.plan.relationKind)
          - dependentValue(right, input.plan.relationKind))
        : Number.POSITIVE_INFINITY;
      if (leftToMiddle >= middleToRight) markBreak(left, middle);
      else markBreak(middle, right);
    }
  };

  if (input.cssSize.width <= 0 || input.cssSize.height <= 0) {
    stop = samplingStop('budget-exhausted', 'invalid-css-size');
  } else {
    const maximumIntervals = Math.max(1, input.budgets.maximumSamples - 1);
    const initialIntervals = Math.min(policy.initialIntervals, maximumIntervals);
    const seedPoints: SamplePoint[] = [];
    for (let index = 0; index <= initialIntervals; index += 1) {
      const independent = index === initialIntervals
        ? independentMaximum
        : independentMinimum + (independentMaximum - independentMinimum) * index / initialIntervals;
      const point = evaluateAt(independent);
      if (!point) break;
      seedPoints.push(point);
    }
    for (let index = 0; index + 1 < seedPoints.length; index += 1) {
      refine(seedPoints[index], seedPoints[index + 1], 0);
    }
  }

  const ordered = [...samples.values()].sort((left, right) => left.independent - right.independent);
  const coordinates: number[] = [];
  const independentValues: number[] = [];
  const segmentOffsets: number[] = [];
  let activeSegment = false;
  let pendingPoint: SamplePoint | null = null;
  let previous: SamplePoint | null = null;
  const maximumVertices = Math.min(
    input.budgets.maximumVertices,
    Math.floor(input.budgets.maximumSamples),
  );

  for (const point of ordered) {
    const brokenFromPrevious = previous
      ? breakPairs.has(pairKey(previous.independent, point.independent))
      : false;
    if (!point.finite || !point.drawable || brokenFromPrevious) {
      activeSegment = false;
      pendingPoint = null;
      previous = point;
      if (!point.finite || !point.drawable) continue;
    }
    if (!activeSegment && pendingPoint === null) {
      pendingPoint = point;
      previous = point;
      continue;
    }
    if (!activeSegment && pendingPoint) {
      if (coordinates.length / 2 + 2 > maximumVertices) {
        stop ??= samplingStop('budget-exhausted', 'maximum-vertices');
        break;
      }
      segmentOffsets.push(coordinates.length / 2);
      coordinates.push(pendingPoint.x, pendingPoint.y, point.x, point.y);
      independentValues.push(pendingPoint.independent, point.independent);
      pendingPoint = null;
      activeSegment = true;
      previous = point;
      continue;
    }
    if (coordinates.length / 2 >= maximumVertices) {
      stop ??= samplingStop('budget-exhausted', 'maximum-vertices');
      break;
    }
    coordinates.push(point.x, point.y);
    independentValues.push(point.independent);
    previous = point;
  }

  const elapsedMs = Math.max(0, now() - startedAt);
  return {
    itemId: input.plan.itemId,
    relationKind: input.plan.relationKind,
    quality: input.quality,
    status: stop?.status ?? 'complete',
    coordinates: new Float64Array(coordinates),
    independentValues: new Float64Array(independentValues),
    segmentOffsets: new Uint32Array(segmentOffsets),
    ...(stop ? { stopReason: stop.stopReason } : {}),
    stats: {
      evaluatedSamples: samples.size,
      emittedVertices: coordinates.length / 2,
      maximumDepthReached,
      elapsedMs,
    },
  };
}

export function minimumSamplingBudgets(
  overrides: Partial<GraphSamplingBudgetsV1> = {},
): GraphSamplingBudgetsV1 {
  return {
    maximumRecursionDepth: overrides.maximumRecursionDepth ?? 12,
    maximumSamples: overrides.maximumSamples ?? 8_192,
    maximumTimeMs: overrides.maximumTimeMs ?? 250,
    maximumVertices: overrides.maximumVertices ?? 8_192,
  };
}
