import type { GraphViewportV1 } from '../../contracts';

// Pure GPU renderer policies: float32 precision guard and adaptive render
// scale. Neither touches WebGL, so both are exercised in Node.

/** Float32 carries 24 significant bits (23 stored + implicit). */
const FLOAT32_EPSILON = 2 ** -23;
/** A pixel must span at least this many float32 steps (1/8-pixel coordinate jitter). */
const MINIMUM_STEPS_PER_PIXEL = 8;

/**
 * True when float32 world coordinates can resolve every pixel of the view.
 * Beyond this depth the GPU image degrades into blocks, so callers switch to
 * the CPU image with a "precise mode" notice instead of clamping zoom.
 */
export function graphGpuViewportIsFloat32Safe(
  viewport: Pick<GraphViewportV1, 'xMin' | 'xMax' | 'yMin' | 'yMax'>,
  cssSize: { width: number; height: number },
  precisionBits = 23,
): boolean {
  const epsilon = precisionBits === 23 ? FLOAT32_EPSILON : 2 ** -precisionBits;
  const check = (minimum: number, maximum: number, pixels: number) => {
    const magnitude = Math.max(Math.abs(minimum), Math.abs(maximum), Number.MIN_VALUE);
    const pixelSpan = (maximum - minimum) / Math.max(1, pixels);
    return pixelSpan >= magnitude * epsilon * MINIMUM_STEPS_PER_PIXEL;
  };
  return check(viewport.xMin, viewport.xMax, cssSize.width) && check(viewport.yMin, viewport.yMax, cssSize.height);
}

export type GraphGpuRenderScaleState = { scale: number; interacting: boolean };

export const GRAPH_GPU_MIN_RENDER_SCALE = 0.35;

/**
 * Adaptive resolution: while interacting, drop the internal render scale when
 * a frame exceeds its budget and recover when frames are cheap; settled views
 * always render at full scale. Weak GPUs get a softer moving image rather
 * than a slow one.
 */
export function nextGraphGpuRenderScale(
  state: GraphGpuRenderScaleState,
  frameMs: number,
  budgetMs = 16.7,
): number {
  if (!state.interacting) return 1;
  if (!Number.isFinite(frameMs)) return state.scale;
  if (frameMs > budgetMs * 1.15) return Math.max(GRAPH_GPU_MIN_RENDER_SCALE, state.scale * 0.8);
  if (frameMs < budgetMs * 0.6) return Math.min(1, state.scale * 1.1);
  return state.scale;
}
