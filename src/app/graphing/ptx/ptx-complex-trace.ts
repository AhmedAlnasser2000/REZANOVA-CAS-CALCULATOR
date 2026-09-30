import {
  defaultPtxSolverPort,
  ptxBadge,
  ptxComplexText,
  ptxNumber,
  ptxPointDetail,
  ptxProjectToCurve,
  ptxStepAlongCurve,
  type GraphDocumentV4,
  type PtxLevel,
  type PtxPixelUnits,
  type PtxPlaneFunction,
  type PtxRefinedPoint,
  type PtxWarning,
} from '../../../lib/graphing';
import type { GraphComplexPlaneRoot } from '../graph-complex-plane';
import { ptxSnapOnArrival } from './ptx-snap';
import type { PtxDot } from './usePtxPointsOfInterest';

// Tracing in the Complex pane: loci (curves in the plane) are picked by a click
// near them and swept by projecting the pointer onto the true curve; root
// points are picked and stepped through; a z-map probe can be pinned.

export type PtxComplexLocus = { itemId: string; clauses: PtxPlaneFunction[] };

export type PtxComplexTrace =
  | { kind: 'locus'; itemId: string; clause: number; point: PtxRefinedPoint; snapped: PtxDot | null }
  | { kind: 'root'; itemId: string; roots: GraphComplexPlaneRoot[]; index: number }
  | { kind: 'probe'; z: { re: number; im: number }; w: { re: number; im: number }; magnitude: number; phase: number; warnings: PtxWarning[];
      /** The z-map (item, expression, sliders) the value came from; a pin never outlives it. */
      source?: string };

export type PtxReadout = { lines: string[]; level: PtxLevel; detail: string };

const PICK_RADIUS_PIXELS = 8;
const SWEEP_REACH_PIXELS = 60;
const STEP_PIXELS = 8;

/** Each locus clause as a real function of (Re z, Im z): Re(left − right), undefined where it is not real. */
export function ptxComplexLociFrom(document: GraphDocumentV4, parameters: Readonly<Record<string, number>>): PtxComplexLocus[] {
  const port = defaultPtxSolverPort();
  return document.items.flatMap((item): PtxComplexLocus[] => {
    if (item.kind !== 'relation' || !item.visible || item.relation.kind !== 'complex-locus') return [];
    const clauses = item.relation.clauses.flatMap((clause): PtxPlaneFunction[] => {
      const f = port.complexFunction(['Add', clause.left.mathJson, ['Negate', clause.right.mathJson]], parameters);
      if (!f) return [];
      return [(x, y) => {
        const value = f({ re: x, im: y });
        return value && Math.abs(value.im) <= 1e-9 * Math.max(1, Math.abs(value.re)) ? value.re : undefined;
      }];
    });
    return clauses.length ? [{ itemId: item.itemId, clauses }] : [];
  });
}

/** The locus boundary within a few pixels of `at`, projected onto the true curve. */
export function ptxPickLocus(loci: readonly PtxComplexLocus[], at: { x: number; y: number }, units: PtxPixelUnits) {
  let best: { itemId: string; clause: number; point: PtxRefinedPoint } | null = null; let bestPixels = Infinity;
  for (const locus of loci) {
    locus.clauses.forEach((clause, index) => {
      const point = ptxProjectToCurve(clause, at, units, PICK_RADIUS_PIXELS);
      if (!point) return;
      const pixels = Math.hypot((point.x - at.x) / units.x, (point.y - at.y) / units.y);
      if (pixels < bestPixels) { best = { itemId: locus.itemId, clause: index, point }; bestPixels = pixels; }
    });
  }
  return best as { itemId: string; clause: number; point: PtxRefinedPoint } | null;
}

function withSnap(trace: Extract<PtxComplexTrace, { kind: 'locus' }>, dots: readonly PtxDot[],
  toScreen: (x: number, y: number) => { x: number; y: number }): PtxComplexTrace {
  const snapped = ptxSnapOnArrival(trace.point, dots.filter((dot) => dot.plane === 'complex'), toScreen, trace.itemId);
  return { ...trace, snapped };
}

/** Moves a locus trace toward the pointer: the pointer is projected onto the same curve. */
export function ptxSweepLocus(trace: Extract<PtxComplexTrace, { kind: 'locus' }>, loci: readonly PtxComplexLocus[],
  pointer: { x: number; y: number }, units: PtxPixelUnits, dots: readonly PtxDot[],
  toScreen: (x: number, y: number) => { x: number; y: number }): PtxComplexTrace {
  const clause = loci.find((locus) => locus.itemId === trace.itemId)?.clauses[trace.clause];
  const point = clause ? ptxProjectToCurve(clause, pointer, units, SWEEP_REACH_PIXELS) : null;
  return point ? withSnap({ ...trace, point }, dots, toScreen) : trace;
}

/** Arrow keys: along a locus by a few pixels, or to the next or previous root. */
export function ptxStepComplexTrace(trace: PtxComplexTrace, direction: 1 | -1, loci: readonly PtxComplexLocus[],
  units: PtxPixelUnits, dots: readonly PtxDot[], toScreen: (x: number, y: number) => { x: number; y: number }): PtxComplexTrace {
  if (trace.kind === 'root') return { ...trace, index: (trace.index + direction + trace.roots.length) % trace.roots.length };
  if (trace.kind !== 'locus') return trace;
  const clause = loci.find((locus) => locus.itemId === trace.itemId)?.clauses[trace.clause];
  const point = clause ? ptxStepAlongCurve(clause, trace.point, direction * STEP_PIXELS, units) : null;
  return point ? withSnap({ ...trace, point }, dots, toScreen) : trace;
}

export function ptxAcquireLocus(loci: readonly PtxComplexLocus[], at: { x: number; y: number }, units: PtxPixelUnits,
  dots: readonly PtxDot[], toScreen: (x: number, y: number) => { x: number; y: number }): PtxComplexTrace | null {
  const picked = ptxPickLocus(loci, at, units);
  return picked ? withSnap({ kind: 'locus', ...picked, snapped: null }, dots, toScreen) : null;
}

/** Where the trace marker sits, in the plane. */
export function ptxComplexTracePoint(trace: PtxComplexTrace) {
  if (trace.kind === 'locus') return trace.snapped ? { x: trace.snapped.x, y: trace.snapped.y } : { x: trace.point.x, y: trace.point.y };
  if (trace.kind === 'root') { const root = trace.roots[trace.index]!; return { x: root.re, y: root.im }; }
  return { x: trace.z.re, y: trace.z.im };
}

function polarLine(x: number, y: number, errorBound: number) {
  return `|z| = ${ptxNumber(Math.hypot(x, y), errorBound)} · arg z = ${ptxNumber(Math.atan2(y, x), errorBound)}`;
}

/** Readout lines, the certainty level and its hover detail. */
export function ptxComplexReadout(trace: PtxComplexTrace): PtxReadout {
  if (trace.kind === 'locus') {
    if (trace.snapped) {
      const dot = trace.snapped;
      const level = dot.level;
      return { lines: [`Intersection · z = ${ptxComplexText(dot.x, dot.y, dot.errorBound)}`, polarLine(dot.x, dot.y, dot.errorBound)],
        level, detail: ptxPointDetail({ level, residual: 0, errorBound: dot.errorBound, warnings: [] }) };
    }
    const { point } = trace;
    return { lines: [`z = ${ptxComplexText(point.x, point.y, point.errorBound)}`, polarLine(point.x, point.y, point.errorBound)],
      level: point.level, detail: ptxPointDetail({ ...point, warnings: [] }) };
  }
  if (trace.kind === 'root') {
    const root = trace.roots[trace.index]!;
    const level: PtxLevel = root.exact ? 'exact-proved' : 'numeric-validated';
    const value = root.exact && root.label ? `z = ${root.label}` : `z ≈ ${ptxComplexText(root.re, root.im, 1e-10)}`;
    const multiplicity = root.multiplicity > 1 ? ` · multiplicity ${root.multiplicity}` : '';
    return { lines: [value, `root ${trace.index + 1} of ${trace.roots.length}${multiplicity}`], level,
      detail: ptxPointDetail({ level, residual: 0, errorBound: root.exact ? 0 : 1e-10, warnings: [] }) };
  }
  const errorBound = 1e-12 * Math.max(1, trace.magnitude);
  const lines = [`z = ${ptxComplexText(trace.z.re, trace.z.im)} · pinned`,
    `w = ${ptxComplexText(trace.w.re, trace.w.im, errorBound)} · |w| ${ptxNumber(trace.magnitude, errorBound)} · arg ${ptxNumber(trace.phase, errorBound)}`];
  if (trace.warnings.includes('near-branch-cut')) lines.push('Near a branch cut: w jumps across it');
  return { lines, level: 'numeric-validated', detail: ptxPointDetail({ level: 'numeric-validated', residual: 0, errorBound, warnings: trace.warnings }) };
}

/** True when `point` is within `radius` pixels of a drawn branch cut. */
export function ptxNearBranchCut(point: { x: number; y: number }, cuts: ReadonlyArray<{ from: { re: number; im: number }; to: { re: number; im: number } }>,
  toScreen: (x: number, y: number) => { x: number; y: number }, radius = 6) {
  const p = toScreen(point.x, point.y);
  return cuts.some((cut) => {
    const a = toScreen(cut.from.re, cut.from.im); const b = toScreen(cut.to.re, cut.to.im);
    const dx = b.x - a.x; const dy = b.y - a.y; const length2 = dx * dx + dy * dy;
    const t = length2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length2)) : 0;
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)) <= radius;
  });
}

export { ptxBadge };
