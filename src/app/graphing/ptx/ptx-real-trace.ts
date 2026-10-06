import {
  defaultPtxSolverPort,
  ptxBadge,
  ptxComplexText,
  ptxNumber,
  ptxPointDetail,
  ptxProjectToCurve,
  ptxRefineExplicit,
  ptxRefineParametric,
  type GraphDocumentV4,
  type PtxCurvePoint,
  type GraphViewportV1,
  type PtxLevel,
  type PtxPlaneFunction,
  type PtxRealFunction,
} from '../../../lib/graphing';
import { ptxRegions, ptxRegionEdgeText, type PtxRegionEdge } from './ptx-region-trace';
import { ptxSnapOnArrival } from './ptx-snap';
import type { PtxDot } from './usePtxPointsOfInterest';

// Real-pane tracing through PTX: the hit test on the drawn path picks the item
// and a rough point; PTX evaluates explicit curves exactly at the pointer and
// projects onto implicit curves, then snaps to a point of interest on arrival.

export type PtxRealRefiner =
  | { kind: 'explicit-y' | 'explicit-x'; f: PtxRealFunction }
  | { kind: 'implicit'; F: PtxPlaneFunction }
  /** A parametric curve in `symbol`, a polar curve in θ, or a complex trajectory z(t). */
  | { kind: 'curve'; curve: PtxCurvePoint; symbol: string; polar: boolean; complex?: boolean }
  /** A region: its edges, one boundary path each (`…:boundary:<index>`). */
  | { kind: 'region'; edges: PtxRegionEdge[] };

export type PtxRealTracePoint = {
  x: number; y: number; level: PtxLevel; errorBound: number; residual: number; dot: PtxDot | null;
  /** The parameter of a parametric or polar point (and r for polar). */
  parameter?: { symbol: string; value: number; radius?: number };
  /** A complex trajectory's point: read as z = x + iy. */
  complex?: boolean;
  /** On a region's edge: which condition it belongs to and whether it is included. */
  edge?: string;
};

function polarCurve(r: PtxRealFunction): PtxCurvePoint {
  return (theta) => {
    const radius = r(theta);
    return radius === undefined ? undefined : { x: radius * Math.cos(theta), y: radius * Math.sin(theta), radius };
  };
}

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
      } else if (kind === 'polar-radius') {
        const r = port.piecewiseFunction(item.piecewise, 'theta', parameters);
        if (r) refiners.set(item.itemId, { kind: 'curve', curve: polarCurve(r), symbol: 'θ', polar: true });
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
    } else if (relation.kind === 'complex-trajectory') {
      const curve = port.curve({ relation }, parameters, { xMin: -10, xMax: 10, yMin: -10, yMax: 10 });
      if (curve?.kind === 'param') refiners.set(item.itemId, { kind: 'curve', curve: curve.point, symbol: curve.symbol, polar: false, complex: true });
    } else if (relation.kind === 'parametric-curve' || relation.kind === 'polar-radius') {
      const curve = port.curvePoint(relation, parameters);
      if (curve) refiners.set(item.itemId, { kind: 'curve', curve, polar: relation.kind === 'polar-radius',
        symbol: relation.kind === 'polar-radius' ? 'θ' : relation.parameterSymbol });
    }
  }
  // Regions (inequalities and chains): each boundary path is refined on its own edge.
  for (const region of ptxRegions(document, parameters)) refiners.set(region.itemId, { kind: 'region', edges: region.edges });
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
  viewport: GraphViewportV1, size: { width: number; height: number }, dots: readonly PtxDot[],
  /** For parametric and polar curves: the sampled parameter and how far around it to search. */
  sampledParameter?: { value: number; span: number }, pointer?: { x: number; y: number },
  /** The traced path, which says which edge of a region it is. */
  pathId?: string): PtxRealTracePoint {
  const { units, toScreen } = frame(viewport, size);
  if (refiner?.kind === 'region') {
    const edge = refiner.edges[Number(/:boundary:(\d+)$/u.exec(pathId ?? '')?.[1] ?? 0)];
    const projected = edge ? ptxProjectToCurve(edge.F, world, units, 6) : null;
    if (edge && projected) {
      const dot = ptxSnapOnArrival(projected, dots, toScreen, itemId);
      return dot ? { x: dot.x, y: dot.y, level: dot.level, errorBound: dot.errorBound, residual: 0, dot }
        : { ...projected, dot: null, edge: ptxRegionEdgeText(edge) };
    }
  }
  if (refiner?.kind === 'curve' && sampledParameter) {
    const curvePoint = ptxRefineParametric(refiner.curve, sampledParameter.value, sampledParameter.span, pointer ?? world, units);
    if (curvePoint) {
      const parameter = { symbol: refiner.symbol, value: curvePoint.t, ...(curvePoint.radius !== undefined ? { radius: curvePoint.radius } : {}) };
      const dot = ptxSnapOnArrival(curvePoint, dots, toScreen, itemId);
      return dot ? { x: dot.x, y: dot.y, level: dot.level, errorBound: dot.errorBound, residual: 0, dot }
        : { x: curvePoint.x, y: curvePoint.y, level: curvePoint.level, errorBound: curvePoint.errorBound, residual: 0, dot: null, parameter,
          ...(refiner.complex ? { complex: true } : {}) };
    }
  }
  const refined = refiner?.kind === 'explicit-y' ? ptxRefineExplicit(refiner.f, world.x, 'y-of-x')
    : refiner?.kind === 'explicit-x' ? ptxRefineExplicit(refiner.f, world.y, 'x-of-y')
      : refiner?.kind === 'implicit' ? ptxProjectToCurve(refiner.F, world, units, 6) : null;
  // Items PTX cannot refine keep their sampled point; NaN marks "not refined".
  const point = refined ?? { x: world.x, y: world.y, level: 'sampled-estimate' as const, errorBound: Number.NaN, residual: 0 };
  const dot = ptxSnapOnArrival(point, dots, toScreen, itemId);
  return dot ? { x: dot.x, y: dot.y, level: dot.level, errorBound: dot.errorBound, residual: 0, dot } : { ...point, dot: null };
}

const DOT_NAMES: Record<PtxDot['feature'], string> = {
  root: 'Root', extremum: 'Extremum', intersection: 'Intersection', 'y-intercept': 'y-intercept', 'x-intercept': 'x-intercept',
  endpoint: 'Endpoint', hole: 'Hole', 'complex-zero': 'Zero', 'complex-pole': 'Pole',
  'turning-point': 'Turning point', 'curve-endpoint': 'End', 'origin-crossing': 'Origin', 'region-corner': 'Corner',
  'isolated-point': 'Point',
};
const KIND_NAMES = { highest: 'Highest', lowest: 'Lowest', leftmost: 'Leftmost', rightmost: 'Rightmost', start: 'Start', end: 'End' } as const;

/** A dot's name: its kind when it has one (Highest, Start), else its feature. */
export function ptxDotName(dot: Pick<PtxDot, 'feature' | 'detail'>) {
  return dot.detail?.kind ? KIND_NAMES[dot.detail.kind] : DOT_NAMES[dot.feature];
}

/** What follows a dot's coordinates: whether an end or corner is included, and the parameter there. */
function dotSuffix(dot: Pick<PtxDot, 'detail'>) {
  const parts: string[] = [];
  if (dot.detail?.included !== undefined) parts.push(dot.detail.included ? 'included' : 'not included');
  if (dot.detail?.parameter) parts.push(`${dot.detail.parameter.symbol === 'theta' ? 'θ' : dot.detail.parameter.symbol} = ${ptxNumber(dot.detail.parameter.value)}`);
  return parts.map((part) => ` · ${part}`).join('');
}

/** A piecewise item's end circles from the scene, as snap targets: filled ends and open ones (holes). */
export function ptxEndpointDots(pointBatches: ReadonlyArray<{ pointBatchId: string; itemId: string; coordinates: Float64Array; marker?: 'filled' | 'open' }>): PtxDot[] {
  return pointBatches.flatMap((batch) => {
    const isolated = batch.pointBatchId.includes(':isolated:');
    if (!batch.marker || (!batch.pointBatchId.includes(':endpoint:') && !isolated)) return [];
    const dots: PtxDot[] = [];
    for (let index = 0; index + 1 < batch.coordinates.length; index += 2) {
      dots.push({ key: `${batch.pointBatchId}:${index}`, plane: 'real', feature: isolated ? 'isolated-point' : batch.marker === 'open' ? 'hole' : 'endpoint', itemIds: [batch.itemId],
        x: batch.coordinates[index]!, y: batch.coordinates[index + 1]!, level: batch.marker === 'open' ? 'sampled-estimate' : 'numeric-validated', errorBound: 1e-9 });
    }
    return dots;
  });
}

/** "(x, y)" to the reliable digits, named when it is a point of interest. */
export function ptxRealTraceText(point: Pick<PtxRealTracePoint, 'x' | 'y' | 'errorBound' | 'dot' | 'parameter' | 'complex' | 'edge'>) {
  // An open circle is not on the graph: its x has no value, only a limit.
  if (point.dot?.feature === 'hole') return `(${ptxNumber(point.x, point.errorBound)}, undefined) · limit ${ptxNumber(point.y, point.errorBound)}`;
  const text = point.complex ? `z = ${ptxComplexText(point.x, point.y, point.errorBound)}`
    : `(${ptxNumber(point.x, point.errorBound)}, ${ptxNumber(point.y, point.errorBound)})`;
  if (point.dot) return `${ptxDotName(point.dot)} ${text}${dotSuffix(point.dot)}`;
  if (point.edge) return `${text} · ${point.edge}`;
  const parameter = point.parameter;
  if (!parameter) return text;
  // The parameter is chosen to match the pointer, so it is shown to the usual six digits.
  return parameter.radius !== undefined
    ? `${text} · r = ${ptxNumber(parameter.radius, point.errorBound)} · θ = ${ptxNumber(parameter.value)}`
    : `${text} · ${parameter.symbol} = ${ptxNumber(parameter.value)}`;
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
