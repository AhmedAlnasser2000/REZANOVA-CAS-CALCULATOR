import {
  normalizeGraphItemPresentation,
  resolveGraphPresentationColor,
  type GraphAnalysisEvidenceV1,
  type GraphRendererPresentationFrame,
  type GraphViewportV1,
} from '../../../lib/graphing';
import { graphIntervalWords } from '../graph-piecewise-coverage';

// Stretches (GRAPHING-PIECEWISE2): where a curve lies on the x-axis (a root on
// a whole interval) or two curves lie on top of each other (infinitely many
// intersections). They are drawn as a soft band along the stretch with a
// label, never as dots, and the trace does not snap to them: a stretch may run
// far out of view, and snapping to its far end would throw the trace away.

type Detail = NonNullable<GraphAnalysisEvidenceV1['detail']>;

export type PtxStretch = {
  key: string;
  kind: 'zero' | 'coincide';
  itemIds: string[];
  /** Along x, for y = f(x) curves. */
  interval?: NonNullable<Detail['interval']>;
  /** Points along the shared part, for curves of any other kind (implicit, parametric, polar). */
  shared?: NonNullable<Detail['shared']>;
  /** How near a drawn vertex must be to a shared point to belong to the band: just over the points' own spacing. */
  reach?: number;
};

/** The largest nearest-neighbour gap among the shared points (so the band follows them without spilling past them). */
function sharedSpacing(points: ReadonlyArray<{ x: number; y: number }>) {
  let largest = 0;
  for (const point of points) {
    let nearest = Infinity;
    for (const other of points) if (other !== point) nearest = Math.min(nearest, Math.hypot(other.x - point.x, other.y - point.y));
    if (Number.isFinite(nearest)) largest = Math.max(largest, nearest);
  }
  return largest;
}

/** "Zero for x ≤ −2", "Same curve for x ≥ 0", or "Same curve" where no x-interval describes it. */
export function ptxStretchLabel(stretch: PtxStretch) {
  const name = stretch.kind === 'zero' ? 'Zero' : 'Same curve';
  return stretch.interval ? `${name} for ${graphIntervalWords(stretch.interval)}` : name;
}

/** Evidence to stretches: the selected item's roots on an interval and the curves it coincides with. */
export function ptxStretchesFromEvidence(evidence: readonly GraphAnalysisEvidenceV1[], selectedItemId: string | null): PtxStretch[] {
  if (!selectedItemId) return [];
  return evidence.flatMap((entry): PtxStretch[] => {
    const interval = entry.detail?.interval; const shared = entry.detail?.shared;
    if ((!interval && !shared) || !entry.itemIds.includes(selectedItemId)) return [];
    const extent = { ...(interval ? { interval } : {}), ...(shared ? { shared, reach: 0.6 * sharedSpacing(shared) } : {}) };
    if (entry.feature === 'root' && interval) return [{ key: entry.evidenceId, kind: 'zero', itemIds: entry.itemIds, ...extent }];
    // The band follows the selected curve's own path.
    const itemIds = [selectedItemId, ...entry.itemIds.filter((itemId) => itemId !== selectedItemId)];
    if (entry.feature === 'intersection') return [{ key: entry.evidenceId, kind: 'coincide', itemIds, ...extent }];
    return [];
  });
}

const SVG = 'http://www.w3.org/2000/svg';

function colourOf(itemId: string, presentation: GraphRendererPresentationFrame) {
  const entry = presentation.items.find((candidate) => candidate.itemId === itemId);
  const mode = presentation.version === 2 ? presentation.colorVisionMode : 'standard';
  return entry ? resolveGraphPresentationColor(normalizeGraphItemPresentation(entry.presentation), mode) : '#9aa7a1';
}

type ScenePath = { itemId: string; coordinates: ArrayLike<number>; segmentOffsets: ArrayLike<number> };

/**
 * Draws each stretch over the live view: a band along y = 0 for a zero
 * stretch, along the curve for coinciding curves (from the scene's own path),
 * with a circle at each end that lies in view (filled when the end belongs to
 * the stretch) and a label over the band's visible middle.
 */
export function placeStretches(layer: SVGSVGElement | null, stretches: readonly PtxStretch[], presentation: GraphRendererPresentationFrame,
  live: GraphViewportV1, size: { width: number; height: number }, paths: readonly ScenePath[]) {
  if (!layer) return;
  layer.setAttribute('viewBox', `0 0 ${size.width} ${size.height}`);
  const toX = (x: number) => (x - live.xMin) / (live.xMax - live.xMin) * size.width;
  const toY = (y: number) => (live.yMax - y) / (live.yMax - live.yMin) * size.height;
  const children: SVGElement[] = [];
  for (const stretch of stretches) {
    // Shared parts without an x-interval cover the whole width; their points decide where the band goes.
    const interval = stretch.interval ?? { minimum: live.xMin, maximum: live.xMax, minimumInclusive: true, maximumInclusive: true,
      minimumOpenEnded: true, maximumOpenEnded: true };
    const from = Math.max(interval.minimum, live.xMin); const to = Math.min(interval.maximum, live.xMax);
    if (!(to >= from)) continue;
    const colour = colourOf(stretch.itemIds[0]!, presentation);
    // Near the shared part: within about half the spacing of its sample points.
    const reach = stretch.reach ?? 0;
    const onShared = (x: number, y: number) => !stretch.shared
      || stretch.shared.some((point) => Math.hypot(point.x - x, point.y - y) <= reach);
    // The band: straight along the axis, or the visible part of the curve itself.
    const runs: Array<Array<[number, number]>> = [];
    if (stretch.kind === 'zero') runs.push([[toX(from), toY(0)], [toX(to), toY(0)]]);
    else {
      const own = paths.filter((candidate) => candidate.itemId === stretch.itemIds[0]);
      for (const path of own.length ? own : paths.filter((candidate) => candidate.itemId === stretch.itemIds[1])) {
        const offsets = [...Array.from(path.segmentOffsets), path.coordinates.length / 2];
        for (let segment = 0; segment + 1 < offsets.length; segment += 1) {
          let current: Array<[number, number]> = [];
          for (let vertex = offsets[segment]!; vertex < offsets[segment + 1]!; vertex += 1) {
            const x = path.coordinates[vertex * 2]!; const y = path.coordinates[vertex * 2 + 1]!;
            if (x >= from && x <= to && onShared(x, y)) current.push([toX(x), toY(y)]);
            else if (current.length) { runs.push(current); current = []; }
          }
          if (current.length) runs.push(current);
        }
      }
    }
    for (const run of runs.filter((points) => points.length >= 2)) {
      const band = document.createElementNS(SVG, 'polyline');
      band.setAttribute('points', run.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' '));
      band.setAttribute('stroke', colour); band.dataset.kind = stretch.kind; band.dataset.testid = 'graph-ptx-stretch';
      children.push(band);
    }
    // Ends that are the stretch's own (not the edge of the view), filled when they belong to it.
    for (const [at, inclusive, openEnded] of [[interval.minimum, interval.minimumInclusive, interval.minimumOpenEnded],
      [interval.maximum, interval.maximumInclusive, interval.maximumOpenEnded]] as const) {
      if (openEnded || at < live.xMin || at > live.xMax || stretch.kind !== 'zero') continue;
      const end = document.createElementNS(SVG, 'circle');
      end.setAttribute('cx', String(toX(at))); end.setAttribute('cy', String(toY(0))); end.setAttribute('r', '4.5');
      end.setAttribute('stroke', colour); end.setAttribute('fill', inclusive ? colour : '#081114');
      end.dataset.testid = 'graph-ptx-stretch-end';
      children.push(end);
    }
    // The label sits over the middle of what is visible of the band.
    // Only what is on screen counts: a curve may leave the view through the top long before the stretch ends.
    const along = runs.flat().filter(([, y]) => y >= 0 && y <= size.height);
    if (along.length === 0) continue;
    const middleX = stretch.kind === 'zero' ? (toX(from) + toX(to)) / 2
      : (Math.min(...along.map(([x]) => x)) + Math.max(...along.map(([x]) => x))) / 2;
    let anchor: [number, number] = [middleX, toY(0)];
    if (stretch.kind === 'coincide') {
      // On the curve where it crosses the middle of the stretch (a straight line has only its two end vertices).
      const ordered = [...along].sort((a, b) => a[0] - b[0]);
      const after = ordered.findIndex(([x]) => x >= middleX);
      const [x1, y1] = ordered[Math.max(0, after - 1)]!; const [x2, y2] = ordered[Math.max(0, after)]!;
      anchor = [middleX, x2 === x1 ? y1 : y1 + (y2 - y1) * (middleX - x1) / (x2 - x1)];
    }
    const label = document.createElementNS(SVG, 'text');
    label.textContent = ptxStretchLabel(stretch);
    label.setAttribute('x', String(Math.max(8, Math.min(size.width - 8, anchor[0]))));
    label.setAttribute('y', String(Math.max(14, Math.min(size.height - 8, anchor[1] - 12))));
    label.setAttribute('text-anchor', 'middle'); label.dataset.testid = 'graph-ptx-stretch-label';
    children.push(label);
  }
  layer.replaceChildren(...children);
}
