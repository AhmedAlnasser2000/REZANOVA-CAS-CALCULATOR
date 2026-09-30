import type { GraphViewportV1 } from '../../lib/graphing';

// Drawing for the Complex pane's own geometry: the Argand plane (grid and
// Re/Im axes) when no z-map colours it, complex loci (curves and regions from
// the sampled scene), and root points (exact filled, numeric as rings).

export type GraphComplexPlanePath = { coordinates: Float64Array; segmentOffsets: Uint32Array; strict: boolean };
export type GraphComplexPlaneRegion = { vertices: Float64Array; triangleIndices: Uint32Array };
export type GraphComplexPlaneRoot = { re: number; im: number; exact: boolean; label: string | null; multiplicity: number };

export type GraphComplexPlaneItem = {
  itemId: string;
  color: string;
  paths: GraphComplexPlanePath[];
  regions: GraphComplexPlaneRegion[];
  roots: GraphComplexPlaneRoot[];
};

type Frame = { originX: number; originY: number; width: number; height: number };

function toScreen(re: number, im: number, live: GraphViewportV1, frame: Frame) {
  return {
    x: frame.originX + (re - live.xMin) / (live.xMax - live.xMin) * frame.width,
    y: frame.originY + (live.yMax - im) / (live.yMax - live.yMin) * frame.height,
  };
}

/** A 1, 2 or 5 times a power of ten, giving about `target` grid lines across `span`. */
function gridStep(span: number, target: number) {
  const raw = span / target;
  const power = 10 ** Math.floor(Math.log10(raw));
  const scaled = raw / power;
  return (scaled < 1.5 ? 1 : scaled < 3.5 ? 2 : scaled < 7.5 ? 5 : 10) * power;
}

function label(value: number, step: number) {
  const digits = Math.max(0, -Math.floor(Math.log10(step)));
  return Number(value.toFixed(digits)).toString().replace('-', '−');
}

/** The complex plane: faint grid, Re and Im axes, and tick labels (imaginary ones with i). */
export function paintArgandPlane(context: CanvasRenderingContext2D, live: GraphViewportV1, frame: Frame, pixelRatio: number) {
  context.fillStyle = '#081114';
  context.fillRect(frame.originX, frame.originY, frame.width, frame.height);
  const stepX = gridStep(live.xMax - live.xMin, 10); const stepY = gridStep(live.yMax - live.yMin, 8);
  context.lineWidth = pixelRatio;
  context.strokeStyle = 'rgba(191, 208, 198, 0.08)';
  context.beginPath();
  for (let re = Math.ceil(live.xMin / stepX) * stepX; re <= live.xMax; re += stepX) {
    const { x } = toScreen(re, 0, live, frame); context.moveTo(x, frame.originY); context.lineTo(x, frame.originY + frame.height);
  }
  for (let im = Math.ceil(live.yMin / stepY) * stepY; im <= live.yMax; im += stepY) {
    const { y } = toScreen(0, im, live, frame); context.moveTo(frame.originX, y); context.lineTo(frame.originX + frame.width, y);
  }
  context.stroke();
  const origin = toScreen(0, 0, live, frame);
  const axisX = Math.min(frame.originX + frame.width - 1, Math.max(frame.originX, origin.x));
  const axisY = Math.min(frame.originY + frame.height - 1, Math.max(frame.originY, origin.y));
  context.strokeStyle = 'rgba(214, 229, 220, 0.55)';
  context.beginPath();
  context.moveTo(frame.originX, axisY); context.lineTo(frame.originX + frame.width, axisY);
  context.moveTo(axisX, frame.originY); context.lineTo(axisX, frame.originY + frame.height);
  context.stroke();
  context.fillStyle = 'rgba(191, 208, 198, 0.7)';
  context.font = `${11 * pixelRatio}px sans-serif`;
  for (let re = Math.ceil(live.xMin / stepX) * stepX; re <= live.xMax; re += stepX) {
    if (Math.abs(re) < stepX / 2) continue;
    const { x } = toScreen(re, 0, live, frame); context.fillText(label(re, stepX), x + 3 * pixelRatio, axisY + 13 * pixelRatio);
  }
  for (let im = Math.ceil(live.yMin / stepY) * stepY; im <= live.yMax; im += stepY) {
    if (Math.abs(im) < stepY / 2) continue;
    const { y } = toScreen(0, im, live, frame); context.fillText(`${label(im, stepY)}i`, axisX + 4 * pixelRatio, y - 3 * pixelRatio);
  }
  context.fillStyle = 'rgba(234, 246, 238, 0.85)';
  context.font = `${12 * pixelRatio}px sans-serif`;
  context.fillText('Re', frame.originX + frame.width - 24 * pixelRatio, axisY - 6 * pixelRatio);
  // Below the pane toolbar, which overlays the top of the plane.
  context.fillText('Im', axisX + 6 * pixelRatio, frame.originY + 72 * pixelRatio);
}

/** Loci as filled regions and stroked boundaries (dashed when strict), roots as points. */
export function paintComplexPlaneItems(context: CanvasRenderingContext2D, items: readonly GraphComplexPlaneItem[],
  live: GraphViewportV1, frame: Frame, pixelRatio: number) {
  for (const item of items) {
    context.fillStyle = item.color;
    context.globalAlpha = 0.18;
    for (const region of item.regions) {
      context.beginPath();
      for (let index = 0; index + 2 < region.triangleIndices.length; index += 3) {
        for (let corner = 0; corner < 3; corner += 1) {
          const vertex = region.triangleIndices[index + corner]!;
          const point = toScreen(region.vertices[vertex * 2]!, region.vertices[vertex * 2 + 1]!, live, frame);
          if (corner === 0) context.moveTo(point.x, point.y); else context.lineTo(point.x, point.y);
        }
        context.closePath();
      }
      context.fill();
    }
    context.globalAlpha = 1;
    context.strokeStyle = item.color;
    context.lineWidth = 2.25 * pixelRatio;
    for (const path of item.paths) {
      context.setLineDash(path.strict ? [8 * pixelRatio, 6 * pixelRatio] : []);
      const starts = new Set(path.segmentOffsets);
      context.beginPath();
      for (let vertex = 0; vertex * 2 + 1 < path.coordinates.length; vertex += 1) {
        const point = toScreen(path.coordinates[vertex * 2]!, path.coordinates[vertex * 2 + 1]!, live, frame);
        if (vertex === 0 || starts.has(vertex)) context.moveTo(point.x, point.y); else context.lineTo(point.x, point.y);
      }
      context.stroke();
    }
    context.setLineDash([]);
    for (const root of item.roots) {
      const point = toScreen(root.re, root.im, live, frame);
      context.beginPath();
      context.arc(point.x, point.y, 5 * pixelRatio, 0, Math.PI * 2);
      context.lineWidth = 2 * pixelRatio;
      if (root.exact) { context.fillStyle = item.color; context.fill(); context.strokeStyle = '#f4fbf6'; context.stroke(); }
      else { context.strokeStyle = item.color; context.stroke(); }
    }
  }
}

/** The root under the pointer (within 10 CSS px), for the hover readout. */
export function complexPlaneRootAt(items: readonly GraphComplexPlaneItem[], re: number, im: number,
  live: GraphViewportV1, cssWidth: number, cssHeight: number) {
  const pixelsPerRe = cssWidth / (live.xMax - live.xMin); const pixelsPerIm = cssHeight / (live.yMax - live.yMin);
  let best: GraphComplexPlaneRoot | null = null; let bestDistance = 10;
  for (const item of items) {
    for (const root of item.roots) {
      const distance = Math.hypot((root.re - re) * pixelsPerRe, (root.im - im) * pixelsPerIm);
      if (distance < bestDistance) { best = root; bestDistance = distance; }
    }
  }
  return best;
}

function formatPart(value: number) {
  return String(Math.abs(value) < 1e-12 ? 0 : Number(value.toPrecision(6)));
}

/** "z = −1/2 + √13/2 · exact" or "z ≈ 0.693 + 6.28i · numeric". */
export function complexPlaneRootText(root: GraphComplexPlaneRoot) {
  const multiplicity = root.multiplicity > 1 ? ` · multiplicity ${root.multiplicity}` : '';
  if (root.exact && root.label) return `z = ${root.label} · exact${multiplicity}`;
  const im = formatPart(Math.abs(root.im));
  return `z ≈ ${formatPart(root.re).replace('-', '−')} ${root.im < 0 && im !== '0' ? '−' : '+'} ${im}i · ${root.exact ? 'exact' : 'numeric'}${multiplicity}`;
}

/** Points of interest as grey dots (intersections of loci), like Desmos. */
export function paintPtxDots(context: CanvasRenderingContext2D, dots: ReadonlyArray<{ x: number; y: number }>,
  live: GraphViewportV1, frame: Frame, pixelRatio: number) {
  context.setLineDash([]);
  for (const dot of dots) {
    const point = toScreen(dot.x, dot.y, live, frame);
    context.beginPath();
    context.arc(point.x, point.y, 4.5 * pixelRatio, 0, Math.PI * 2);
    context.fillStyle = '#9aa7a1'; context.fill();
    context.lineWidth = 1.5 * pixelRatio; context.strokeStyle = '#081114'; context.stroke();
  }
}

/** The trace marker: a ring in the item colour around a light centre. */
export function paintPtxMarker(context: CanvasRenderingContext2D, point: { x: number; y: number }, color: string,
  live: GraphViewportV1, frame: Frame, pixelRatio: number) {
  const at = toScreen(point.x, point.y, live, frame);
  context.setLineDash([]);
  context.beginPath();
  context.arc(at.x, at.y, 6 * pixelRatio, 0, Math.PI * 2);
  context.fillStyle = '#f4fbf6'; context.fill();
  context.lineWidth = 3 * pixelRatio; context.strokeStyle = color; context.stroke();
}
