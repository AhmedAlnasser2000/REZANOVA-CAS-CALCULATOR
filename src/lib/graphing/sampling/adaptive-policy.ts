import type {
  GraphSamplingLimitsV2,
  GraphSamplingMovementHintV1,
  GraphSamplingQualityV3,
  GraphViewportV1,
} from '../contracts';

export const GRAPH_SAMPLING_CACHE_MAX_BYTES = 16 * 1024 * 1024;
export const GRAPH_SCENE_MAX_VERTICES = 250_000;

export type GraphAdaptiveQualityPolicyV1 = {
  quality: GraphSamplingQualityV3;
  seedSpacingPixels: number;
  midpointTolerancePixels: number;
  turnToleranceRadians: number;
  implicitCellPixels: number;
  overscan: { left: number; right: number; top: number; bottom: number };
  limits: GraphSamplingLimitsV2;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function overscanForMovement(
  movement: GraphSamplingMovementHintV1,
  implicit: boolean,
) {
  const base = implicit ? 0.08 : 0.12;
  const leadingMaximum = implicit ? 0.2 : 0.35;
  const zoom = Math.abs(Math.log2(movement.zoomRatio));
  if (zoom > 0.02) {
    const symmetric = implicit ? Math.min(0.16, base + zoom * 0.04) : 0.2;
    return { left: symmetric, right: symmetric, top: symmetric, bottom: symmetric };
  }
  const xStrength = clamp(Math.abs(movement.panVelocityX) / 2_000, 0, 1);
  const yStrength = clamp(Math.abs(movement.panVelocityY) / 2_000, 0, 1);
  const xLeading = base + (leadingMaximum - base) * xStrength;
  const yLeading = base + (leadingMaximum - base) * yStrength;
  return {
    left: movement.panVelocityX < 0 ? xLeading : base,
    right: movement.panVelocityX > 0 ? xLeading : base,
    top: movement.panVelocityY < 0 ? yLeading : base,
    bottom: movement.panVelocityY > 0 ? yLeading : base,
  };
}

export function overscannedGraphViewport(
  viewport: GraphViewportV1,
  movement: GraphSamplingMovementHintV1,
  implicit = false,
): GraphViewportV1 {
  const overscan = overscanForMovement(movement, implicit);
  const xSpan = viewport.xMax - viewport.xMin;
  const ySpan = viewport.yMax - viewport.yMin;
  return {
    ...viewport,
    xMin: viewport.xMin - xSpan * overscan.left,
    xMax: viewport.xMax + xSpan * overscan.right,
    yMin: viewport.yMin - ySpan * overscan.bottom,
    yMax: viewport.yMax + ySpan * overscan.top,
  };
}

export function deriveGraphAdaptiveQualityPolicy(input: {
  quality: GraphSamplingQualityV3;
  cssSize: { width: number; height: number };
  movement: GraphSamplingMovementHintV1;
  route: 'explicit' | 'parametric' | 'implicit' | 'piecewise' | 'point-set';
}): GraphAdaptiveQualityPolicyV1 {
  const quality = input.quality;
  const seedSpacingPixels = quality === 'preview' ? 32 : quality === 'settled' ? 16 : 12;
  const midpointTolerancePixels = quality === 'preview' ? 1.5 : quality === 'settled' ? 0.35 : 0.2;
  const turnToleranceRadians = quality === 'preview'
    ? Math.PI / 12
    : quality === 'settled'
      ? Math.PI / 30
      : Math.PI / 60;
  const implicitCellPixels = quality === 'preview' ? 32 : quality === 'settled' ? 12 : 6;
  const routeScale = input.route === 'implicit' ? 8 : input.route === 'piecewise' ? 16 : 32;
  const pixelExtent = input.route === 'implicit'
    ? input.cssSize.width * input.cssSize.height / Math.max(1, implicitCellPixels ** 2)
    : Math.max(input.cssSize.width, input.cssSize.height);
  const maximumSamples = clamp(Math.ceil(pixelExtent * routeScale), 4_096, 160_000);
  const maximumVertices = clamp(Math.ceil(pixelExtent * routeScale), 4_096, 100_000);
  return {
    quality,
    seedSpacingPixels,
    midpointTolerancePixels,
    turnToleranceRadians,
    implicitCellPixels,
    overscan: overscanForMovement(input.movement, input.route === 'implicit'),
    limits: {
      maximumSamples,
      maximumTimeMs: quality === 'preview' ? 250 : quality === 'settled' ? 1_000 : 1_500,
      maximumVertices,
    },
  };
}

export function graphViewportReuseKind(
  previous: GraphViewportV1,
  next: GraphViewportV1,
): 'reused' | 'extended' | 'miss' {
  if (previous.coordinateSystem !== next.coordinateSystem) return 'miss';
  const previousXSpan = previous.xMax - previous.xMin;
  const previousYSpan = previous.yMax - previous.yMin;
  const nextXSpan = next.xMax - next.xMin;
  const nextYSpan = next.yMax - next.yMin;
  const xRatio = nextXSpan / previousXSpan;
  const yRatio = nextYSpan / previousYSpan;
  if (xRatio < 0.5 || xRatio > 2 || yRatio < 0.5 || yRatio > 2) return 'miss';
  const overlapX = Math.max(0, Math.min(previous.xMax, next.xMax) - Math.max(previous.xMin, next.xMin));
  const overlapY = Math.max(0, Math.min(previous.yMax, next.yMax) - Math.max(previous.yMin, next.yMin));
  const overlap = overlapX * overlapY / Math.max(1e-12, nextXSpan * nextYSpan);
  if (overlap < 0.5) return 'miss';
  const contains = previous.xMin <= next.xMin && previous.xMax >= next.xMax
    && previous.yMin <= next.yMin && previous.yMax >= next.yMax;
  return contains ? 'reused' : 'extended';
}
