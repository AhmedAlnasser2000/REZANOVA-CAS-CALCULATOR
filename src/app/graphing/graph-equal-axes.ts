import type { GraphViewportV1 } from '../../lib/graphing';

// Equal axes: one unit is the same number of pixels along x and y, so circles
// are round. Zoom and pan are uniform already; only resize, mode changes and
// content fitting need to re-square the viewport.

export type GraphPaneSize = { width: number; height: number };

const TOLERANCE = 0.002;
const MIN_PANE_PIXELS = 40;

/** False for a pane too small to measure (hidden, collapsing, or not laid out yet). */
export function isMeasurableGraphPane(size: GraphPaneSize | null): size is GraphPaneSize {
  return size !== null && size.width >= MIN_PANE_PIXELS && size.height >= MIN_PANE_PIXELS;
}

function unitsPerPixel(viewport: GraphViewportV1, size: GraphPaneSize) {
  return { x: (viewport.xMax - viewport.xMin) / size.width, y: (viewport.yMax - viewport.yMin) / size.height };
}

export function isSquareGraphViewport(viewport: GraphViewportV1, size: GraphPaneSize) {
  const scale = unitsPerPixel(viewport, size);
  return Math.abs(scale.x - scale.y) <= TOLERANCE * Math.max(scale.x, scale.y);
}

/**
 * The viewport with equal units per pixel: it keeps the centre and the coarser
 * scale, so nothing that was visible is cropped (a wider window shows more).
 */
export function squareGraphViewport(viewport: GraphViewportV1, size: GraphPaneSize): GraphViewportV1 {
  const scale = unitsPerPixel(viewport, size);
  const units = Math.max(scale.x, scale.y);
  const centerX = (viewport.xMin + viewport.xMax) / 2; const centerY = (viewport.yMin + viewport.yMax) / 2;
  const halfX = units * size.width / 2; const halfY = units * size.height / 2;
  return { ...viewport, xMin: centerX - halfX, xMax: centerX + halfX, yMin: centerY - halfY, yMax: centerY + halfY };
}
