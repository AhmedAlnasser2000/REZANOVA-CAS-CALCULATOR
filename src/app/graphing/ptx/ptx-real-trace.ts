import {
  defaultPtxSolverPort,
  ptxBadge,
  ptxNumber,
  ptxPointDetail,
  ptxProjectToCurve,
  ptxRefineExplicit,
  type GraphDocumentV4,
  type GraphViewportV1,
  type PtxLevel,
  type PtxPlaneFunction,
  type PtxRealFunction,
} from '../../../lib/graphing';
import { ptxSnapOnArrival } from './ptx-snap';
import type { PtxDot } from './usePtxPointsOfInterest';

// Real-pane tracing through PTX: the hit test on the drawn path picks the item
// and a rough point; PTX evaluates explicit curves exactly at the pointer and
// projects onto implicit curves, then snaps to a point of interest on arrival.

export type PtxRealRefiner =
  | { kind: 'explicit-y' | 'explicit-x'; f: PtxRealFunction }
  | { kind: 'implicit'; F: PtxPlaneFunction };

export type PtxRealTracePoint = { x: number; y: number; level: PtxLevel; errorBound: number; residual: number; dot: PtxDot | null };

/** Exact evaluators for the items PTX can refine; everything else keeps its sampled trace. */
export function ptxRealRefiners(document: GraphDocumentV4 | null, parameters: Readonly<Record<string, number>>) {
  const port = defaultPtxSolverPort();
  const refiners = new Map<string, PtxRealRefiner>();
  for (const item of document?.items ?? []) {
    if (item.kind === 'note' || !item.visible) continue;
    if (item.kind === 'piecewise') {
      // The first-match function of all branches, so a sweep reads the branch drawn at each input.
      const kind = item.piecewise.branches[0]?.relation.kind;
      if (kind === 'explicit-y' || kind === 'explicit-x') {
        const f = port.piecewiseFunction(item.piecewise, kind === 'explicit-y' ? 'x' : 'y', parameters);
        if (f) refiners.set(item.itemId, { kind, f });
      }
      continue;
    }
    if (item.kind !== 'relation') continue;
    const relation = item.relation;
    if (relation.kind === 'explicit-y' || relation.kind === 'explicit-x') {
      const f = port.realFunction(relation.rhs, relation.kind === 'explicit-y' ? 'x' : 'y', parameters);
      if (f) refiners.set(item.itemId, { kind: relation.kind, f });
    } else if (relation.kind === 'implicit-equality') {
      const F = port.planeFunction(relation.left, relation.right, parameters);
      if (F) refiners.set(item.itemId, { kind: 'implicit', F });
    }
  }
  return refiners;
}

function frame(viewport: GraphViewportV1, size: { width: number; height: number }) {
  const units = { x: (viewport.xMax - viewport.xMin) / Math.max(1, size.width), y: (viewport.yMax - viewport.yMin) / Math.max(1, size.height) };
  return { units, toScreen: (x: number, y: number) => ({ x: (x - viewport.xMin) / units.x, y: (viewport.yMax - y) / units.y }) };
}

/**
 * The certified point for a sampled trace point: exact for explicit curves,
 * projected for implicit ones, sampled (numeric) otherwise; then the dot it has
 * arrived at, if any.
 */
export function ptxRefineRealTrace(refiner: PtxRealRefiner | undefined, itemId: string, world: { x: number; y: number },
  viewport: GraphViewportV1, size: { width: number; height: number }, dots: readonly PtxDot[]): PtxRealTracePoint {
  const { units, toScreen } = frame(viewport, size);
  const refined = refiner?.kind === 'explicit-y' ? ptxRefineExplicit(refiner.f, world.x, 'y-of-x')
    : refiner?.kind === 'explicit-x' ? ptxRefineExplicit(refiner.f, world.y, 'x-of-y')
      : refiner?.kind === 'implicit' ? ptxProjectToCurve(refiner.F, world, units, 6) : null;
  // Items PTX cannot refine yet (piecewise, parametric, polar) keep their sampled point; NaN marks "not refined".
  const point = refined ?? { x: world.x, y: world.y, level: 'sampled-estimate' as const, errorBound: Number.NaN, residual: 0 };
  const dot = ptxSnapOnArrival(point, dots, toScreen, itemId);
  return dot ? { x: dot.x, y: dot.y, level: dot.level, errorBound: dot.errorBound, residual: 0, dot } : { ...point, dot: null };
}

const DOT_NAMES: Record<PtxDot['feature'], string> = {
  root: 'Root', extremum: 'Extremum', intersection: 'Intersection', 'y-intercept': 'y-intercept', endpoint: 'Endpoint', hole: 'Hole',
};

/** A piecewise item's end circles from the scene, as snap targets: filled ends and open ones (holes). */
export function ptxEndpointDots(pointBatches: ReadonlyArray<{ pointBatchId: string; itemId: string; coordinates: Float64Array; marker?: 'filled' | 'open' }>): PtxDot[] {
  return pointBatches.flatMap((batch) => {
    if (!batch.marker || !batch.pointBatchId.includes(':endpoint:')) return [];
    const dots: PtxDot[] = [];
    for (let index = 0; index + 1 < batch.coordinates.length; index += 2) {
      dots.push({ key: `${batch.pointBatchId}:${index}`, plane: 'real', feature: batch.marker === 'open' ? 'hole' : 'endpoint', itemIds: [batch.itemId],
        x: batch.coordinates[index]!, y: batch.coordinates[index + 1]!, level: batch.marker === 'open' ? 'sampled-estimate' : 'numeric-validated', errorBound: 1e-9 });
    }
    return dots;
  });
}

/** "(x, y)" to the reliable digits, named when it is a point of interest. */
export function ptxRealTraceText(point: Pick<PtxRealTracePoint, 'x' | 'y' | 'errorBound' | 'dot'>) {
  // An open circle is not on the graph: its x has no value, only a limit.
  if (point.dot?.feature === 'hole') return `(${ptxNumber(point.x, point.errorBound)}, undefined) · limit ${ptxNumber(point.y, point.errorBound)}`;
  const text = `(${ptxNumber(point.x, point.errorBound)}, ${ptxNumber(point.y, point.errorBound)})`;
  return point.dot ? `${DOT_NAMES[point.dot.feature]} ${text}` : text;
}

export function ptxRealTraceBadge(point: Pick<PtxRealTracePoint, 'level' | 'errorBound' | 'residual'>) {
  if (Number.isNaN(point.errorBound)) return { badge: ptxBadge(point.level), detail: 'Numeric: read from the drawn curve, not refined yet' };
  return { badge: ptxBadge(point.level), detail: ptxPointDetail({ ...point, warnings: [] }) };
}

/** The next point of interest of `itemId` beyond `x` in `direction`, for Shift+Arrow. */
export function ptxNextDot(dots: readonly PtxDot[], itemId: string, x: number, direction: 1 | -1) {
  const own = dots.filter((dot) => dot.itemIds.includes(itemId)).sort((first, second) => first.x - second.x);
  const tolerance = 1e-9 * (1 + Math.abs(x));
  return direction > 0 ? own.find((dot) => dot.x > x + tolerance) ?? null
    : [...own].reverse().find((dot) => dot.x < x - tolerance) ?? null;
}
