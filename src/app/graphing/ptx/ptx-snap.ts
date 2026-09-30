import type { PtxDot } from './usePtxPointsOfInterest';

/** Dots hold a trace only while it is on them: the lock radius is the dot's own size, never a pull from afar. */
export const PTX_SNAP_RADIUS_PIXELS = 6;

/** The dot the traced point has arrived at, if any, measured on screen. */
export function ptxSnapOnArrival(point: { x: number; y: number }, dots: readonly PtxDot[],
  toScreen: (x: number, y: number) => { x: number; y: number }, itemId: string, radius = PTX_SNAP_RADIUS_PIXELS): PtxDot | null {
  const at = toScreen(point.x, point.y);
  let best: PtxDot | null = null; let bestDistance = radius;
  for (const dot of dots) {
    if (!dot.itemIds.includes(itemId)) continue;
    const screen = toScreen(dot.x, dot.y);
    const distance = Math.hypot(screen.x - at.x, screen.y - at.y);
    if (distance <= bestDistance) { best = dot; bestDistance = distance; }
  }
  return best;
}
