import type { PtxCurve } from './curves';
import { ptxRealExtrema, ptxRealRoots, type PtxFinderOptions } from './features';
import type { PtxPlaneFunction, PtxRealFunction } from './solver-port';
import type { PtxLevel, PtxWindow } from './types';

// Points of interest of any curve kind (PTX3): where it meets the axes, where
// its tangent is horizontal or vertical, its ends, a polar curve's passes
// through the origin, where two curves of any kinds meet, and a region's
// corners. Each problem is reduced to the smallest one: a curve given by a
// parameter (x, y, t or θ) against an equation F = 0 becomes a root search in
// that parameter; only two equations, or two parametric curves, need a 2-D
// Newton solve. Derivatives are finite differences until PTX-ENGINE1.

export type PtxCurvePoint2 = {
  x: number;
  y: number;
  level: PtxLevel;
  errorBound: number;
  parameter?: { symbol: string; value: number };
};
export type PtxAxisCrossing = PtxCurvePoint2 & { axis: 'x' | 'y' };
export type PtxTurningPoint = PtxCurvePoint2 & { kind: 'highest' | 'lowest' | 'leftmost' | 'rightmost' };
export type PtxCurveEnd = PtxCurvePoint2 & { kind: 'start' | 'end'; included: boolean };

const PARAM_STEPS = 800;

function span(window: PtxWindow) { return Math.max(window.xMax - window.xMin, window.yMax - window.yMin); }

function inside(point: { x: number; y: number }, window: PtxWindow) {
  const margin = 1e-9 * span(window);
  return point.x >= window.xMin - margin && point.x <= window.xMax + margin && point.y >= window.yMin - margin && point.y <= window.yMax + margin;
}

/** One entry per place: a closed curve traced more than once (t in [−10, 10] for a circle) meets the same points again. */
function distinct<T extends { x: number; y: number; parameter?: { value: number } }>(points: T[], window: PtxWindow) {
  const tolerance = 1e-7 * span(window);
  const kept: T[] = [];
  // Where one place is reached at several parameters, report the one nearest 0 (t = π, not t = −3π).
  const ordered = [...points].sort((a, b) => Math.abs(a.parameter?.value ?? 0) - Math.abs(b.parameter?.value ?? 0));
  for (const point of ordered) if (!kept.some((other) => Math.abs(other.x - point.x) <= tolerance && Math.abs(other.y - point.y) <= tolerance)) kept.push(point);
  return kept.sort((a, b) => a.x - b.x || a.y - b.y);
}

/** A curve as a path through the plane: its parameter's range and the point at each value. Implicit curves have none. */
function pathOf(curve: PtxCurve, window: PtxWindow) {
  if (curve.kind === 'graph') return { symbol: 'x', low: window.xMin, high: window.xMax, at: (x: number) => { const y = curve.f(x); return y === undefined ? undefined : { x, y }; } };
  if (curve.kind === 'graph-x') return { symbol: 'y', low: window.yMin, high: window.yMax, at: (y: number) => { const x = curve.f(y); return x === undefined ? undefined : { x, y }; } };
  if (curve.kind === 'param') return { symbol: curve.symbol, low: curve.tMin, high: curve.tMax, at: (t: number) => curve.point(t) };
  return null;
}

/** A curve as an equation G(x, y) = 0. Parametric curves have none. */
function equationOf(curve: PtxCurve): PtxPlaneFunction | null {
  if (curve.kind === 'graph') return (x, y) => { const value = curve.f(x); return value === undefined ? undefined : y - value; };
  if (curve.kind === 'graph-x') return (x, y) => { const value = curve.f(y); return value === undefined ? undefined : x - value; };
  if (curve.kind === 'implicit') return curve.F;
  return null;
}

const steps = (curve: PtxCurve, options: PtxFinderOptions) => ({ ...options, steps: options.steps ?? (curve.kind === 'param' ? PARAM_STEPS : 400) });

/** Where the curve meets the x-axis (`axis: 'x'`, y = 0) and the y-axis (`axis: 'y'`, x = 0). */
export function ptxCurveAxisCrossings(curve: PtxCurve, window: PtxWindow, options: PtxFinderOptions = {}): PtxAxisCrossing[] {
  const found: PtxAxisCrossing[] = [];
  const finder = steps(curve, options);
  if (curve.kind === 'implicit') {
    for (const root of ptxRealRoots((x) => curve.F(x, 0), window.xMin, window.xMax, finder)) found.push({ x: root.x, y: 0, axis: 'x', level: root.level, errorBound: root.errorBound });
    for (const root of ptxRealRoots((y) => curve.F(0, y), window.yMin, window.yMax, finder)) found.push({ x: 0, y: root.x, axis: 'y', level: root.level, errorBound: root.errorBound });
  } else {
    const path = pathOf(curve, window)!;
    const along = (which: 'x' | 'y'): PtxRealFunction => (s) => path.at(s)?.[which];
    for (const [which, axis] of [['y', 'x'], ['x', 'y']] as const) {
      for (const root of ptxRealRoots(along(which), path.low, path.high, finder)) {
        const point = path.at(root.x);
        if (!point) continue;
        found.push({ x: which === 'x' ? 0 : point.x, y: which === 'y' ? 0 : point.y, axis, level: root.level, errorBound: root.errorBound,
          ...(curve.kind === 'param' ? { parameter: { symbol: curve.symbol, value: root.x } } : {}) });
      }
    }
  }
  // A polar curve's passes through the pole are origin crossings, not axis crossings.
  const origin = (point: PtxAxisCrossing) => curve.kind === 'param' && curve.radius !== null && Math.hypot(point.x, point.y) <= 1e-9 * span(window);
  return distinct(found.filter((point) => inside(point, window) && !origin(point)), window);
}

/** Points where a curve's tangent is horizontal (highest, lowest) or vertical (leftmost, rightmost). */
export function ptxCurveTurningPoints(curve: PtxCurve, window: PtxWindow, options: PtxFinderOptions = {}): PtxTurningPoint[] {
  const found: PtxTurningPoint[] = [];
  const finder = steps(curve, options);
  if (curve.kind === 'implicit') {
    found.push(...implicitTurningPoints(curve.F, window, options));
  } else {
    const path = pathOf(curve, window)!;
    for (const [which, highKind, lowKind] of [['y', 'highest', 'lowest'], ['x', 'rightmost', 'leftmost']] as const) {
      // y = f(x) has no vertical tangents and x = f(y) no horizontal ones.
      if ((curve.kind === 'graph' && which === 'x') || (curve.kind === 'graph-x' && which === 'y')) continue;
      for (const extremum of ptxRealExtrema((s) => path.at(s)?.[which], path.low, path.high, finder)) {
        const point = path.at(extremum.x);
        if (!point) continue;
        found.push({ ...point, kind: extremum.kind === 'maximum' ? highKind : lowKind, level: extremum.level, errorBound: extremum.errorBound,
          ...(curve.kind === 'param' ? { parameter: { symbol: curve.symbol, value: extremum.x } } : {}) });
      }
    }
  }
  return distinct(found.filter((point) => inside(point, window)), window);
}

/** A restricted parametric or polar curve's first and last points (t = a, t = b), and whether each belongs to it. */
export function ptxCurveEnds(curve: PtxCurve, window: PtxWindow): PtxCurveEnd[] {
  if (curve.kind !== 'param' || !curve.restricted) return [];
  return ([['start', curve.tMin, curve.includesStart], ['end', curve.tMax, curve.includesEnd]] as const).flatMap(([kind, t, included]) => {
    const point = curve.point(t);
    return point && inside(point, window) ? [{ x: point.x, y: point.y, kind, included, level: 'numeric-validated' as const,
      errorBound: 1e-12 * (1 + Math.hypot(point.x, point.y)), parameter: { symbol: curve.symbol, value: t } }] : [];
  });
}

/** Where a polar curve passes through the origin (r(θ) = 0): one point, with the first angle that reaches it. */
export function ptxPolarOriginCrossings(curve: PtxCurve, window: PtxWindow, options: PtxFinderOptions = {}): PtxCurvePoint2[] {
  if (curve.kind !== 'param' || !curve.radius || !inside({ x: 0, y: 0 }, window)) return [];
  const roots = ptxRealRoots(curve.radius, curve.tMin, curve.tMax, steps(curve, options));
  return roots.length ? [{ x: 0, y: 0, level: roots[0]!.level, errorBound: roots[0]!.errorBound * Math.max(1, Math.abs(curve.radius(roots[0]!.x) ?? 0)),
    parameter: { symbol: curve.symbol, value: roots[0]!.x } }] : [];
}

/** Where two curves of any kinds meet inside the window. */
export function ptxCurveIntersections(a: PtxCurve, b: PtxCurve, window: PtxWindow, options: PtxFinderOptions = {}): PtxCurvePoint2[] {
  const found: PtxCurvePoint2[] = [];
  // A path against an equation: roots of G(P(s)) in the path's own parameter.
  const [pathCurve, equationCurve] = equationOf(b) && pathOf(a, window) ? [a, b] : equationOf(a) && pathOf(b, window) ? [b, a] : [null, null];
  if (pathCurve && equationCurve) {
    const path = pathOf(pathCurve, window)!; const G = equationOf(equationCurve)!;
    const along: PtxRealFunction = (s) => { const point = path.at(s); return point ? G(point.x, point.y) : undefined; };
    for (const root of ptxRealRoots(along, path.low, path.high, steps(pathCurve, options))) {
      const point = path.at(root.x);
      if (point) found.push({ ...point, level: root.level, errorBound: root.errorBound,
        ...(pathCurve.kind === 'param' ? { parameter: { symbol: pathCurve.symbol, value: root.x } } : {}) });
    }
  } else if (a.kind === 'implicit' && b.kind === 'implicit') {
    for (const point of ptxSolvePlaneSystem(a.F, b.F, window, options)) found.push({ ...point, level: 'sampled-estimate', errorBound: point.errorBound });
  } else if (a.kind === 'param' && b.kind === 'param') {
    // Two parametric curves: solve (x_a(s) − x_b(t), y_a(s) − y_b(t)) = 0 in the (s, t) rectangle.
    const dx: PtxPlaneFunction = (s, t) => { const p = a.point(s); const q = b.point(t); return p && q ? p.x - q.x : undefined; };
    const dy: PtxPlaneFunction = (s, t) => { const p = a.point(s); const q = b.point(t); return p && q ? p.y - q.y : undefined; };
    for (const root of ptxSolvePlaneSystem(dx, dy, { xMin: a.tMin, xMax: a.tMax, yMin: b.tMin, yMax: b.tMax }, { ...options, grid: 28 })) {
      const point = a.point(root.x);
      if (point) found.push({ ...point, level: 'sampled-estimate', errorBound: 1e-9 * (1 + Math.hypot(point.x, point.y)) });
    }
  }
  return distinct(found.filter((point) => inside(point, window)), window);
}

/** A region's corners: where two of its edges meet; included when both edges include their points (≤, ≥). */
export function ptxRegionCorners(edges: ReadonlyArray<{ F: PtxPlaneFunction; operator: string }>, window: PtxWindow, options: PtxFinderOptions = {}) {
  const corners: Array<PtxCurvePoint2 & { included: boolean; edges: [number, number] }> = [];
  for (let first = 0; first < edges.length; first += 1) for (let second = first + 1; second < edges.length; second += 1) {
    const a = edges[first]!; const b = edges[second]!;
    const included = (a.operator === '<=' || a.operator === '>=') && (b.operator === '<=' || b.operator === '>=');
    for (const point of ptxCurveIntersections({ kind: 'implicit', F: a.F }, { kind: 'implicit', F: b.F }, window, options)) {
      corners.push({ ...point, included, edges: [first, second] });
    }
  }
  return corners;
}

function gradient(F: PtxPlaneFunction, x: number, y: number, h: number) {
  const east = F(x + h, y); const west = F(x - h, y); const north = F(x, y + h); const south = F(x, y - h);
  return east === undefined || west === undefined || north === undefined || south === undefined ? null
    : { fx: (east - west) / (2 * h), fy: (north - south) / (2 * h) };
}

/** Turning points of F = 0: horizontal where Fx = 0 (y'' = −Fxx/Fy decides highest or lowest), vertical where Fy = 0. */
function implicitTurningPoints(F: PtxPlaneFunction, window: PtxWindow, options: PtxFinderOptions): PtxTurningPoint[] {
  const h = 1e-5 * span(window); const h2 = 1e-3 * span(window);
  const partial = (which: 'fx' | 'fy'): PtxPlaneFunction => (x, y) => gradient(F, x, y, h)?.[which];
  const found: PtxTurningPoint[] = [];
  for (const which of ['fx', 'fy'] as const) {
    for (const point of ptxSolvePlaneSystem(F, partial(which), window, options)) {
      const g = gradient(F, point.x, point.y, h);
      const centre = F(point.x, point.y);
      if (!g || centre === undefined) continue;
      const other = which === 'fx' ? g.fy : g.fx;
      // Both partials vanish at a crossing or cusp (singular point): no single tangent there.
      if (Math.abs(other) <= 1e-6 * Math.max(Math.abs(g.fx), Math.abs(g.fy), 1e-300) || other === 0) continue;
      const plus = which === 'fx' ? F(point.x + h2, point.y) : F(point.x, point.y + h2);
      const minus = which === 'fx' ? F(point.x - h2, point.y) : F(point.x, point.y - h2);
      if (plus === undefined || minus === undefined) continue;
      const second = (plus - 2 * centre + minus) / (h2 * h2);
      const bend = -second / other; // y''(x) at a horizontal tangent, x''(y) at a vertical one
      if (!(Math.abs(bend) > 0)) continue;
      found.push({ x: point.x, y: point.y, level: 'sampled-estimate', errorBound: point.errorBound,
        kind: which === 'fx' ? (bend < 0 ? 'highest' : 'lowest') : (bend < 0 ? 'rightmost' : 'leftmost') });
    }
  }
  return found;
}

/**
 * Common zeros of F and G in a rectangle: Newton from a seed grid with a
 * finite-difference Jacobian and damping. A root is accepted when both
 * residuals are tiny relative to the functions' typical size over the grid.
 */
export function ptxSolvePlaneSystem(F: PtxPlaneFunction, G: PtxPlaneFunction, window: PtxWindow,
  options: PtxFinderOptions & { grid?: number } = {}): Array<{ x: number; y: number; errorBound: number }> {
  const grid = options.grid ?? 16;
  const spanX = window.xMax - window.xMin; const spanY = window.yMax - window.yMin;
  if (!(spanX > 0) || !(spanY > 0)) return [];
  const seeds: Array<[number, number]> = [];
  const magnitudes = { f: [] as number[], g: [] as number[] };
  for (let row = 0; row < grid; row += 1) for (let column = 0; column < grid; column += 1) {
    const x = window.xMin + (column + 0.5) / grid * spanX; const y = window.yMin + (row + 0.5) / grid * spanY;
    const f = F(x, y); const g = G(x, y);
    if (f === undefined || g === undefined) continue;
    seeds.push([x, y]); magnitudes.f.push(Math.abs(f)); magnitudes.g.push(Math.abs(g));
  }
  const typical = (values: number[]) => { const sorted = [...values].sort((p, q) => p - q); return Math.max(sorted[Math.floor(sorted.length / 2)] ?? 1, 1e-300); };
  const scaleF = typical(magnitudes.f); const scaleG = typical(magnitudes.g);
  const size = (f: number, g: number) => Math.hypot(f / scaleF, g / scaleG);
  const hx = 1e-7 * spanX; const hy = 1e-7 * spanY;
  const roots: Array<{ x: number; y: number; errorBound: number }> = [];
  for (const [seedX, seedY] of seeds) {
    if (options.isCancelled?.()) break;
    let x = seedX; let y = seedY;
    let f = F(x, y); let g = G(x, y);
    let converged = false; let lastStep = Infinity;
    for (let iteration = 0; f !== undefined && g !== undefined && iteration < 50; iteration += 1) {
      options.onEvaluation?.();
      if (size(f, g) < 1e-11) { converged = true; break; }
      const fe = F(x + hx, y); const fw = F(x - hx, y); const fn = F(x, y + hy); const fs = F(x, y - hy);
      const ge = G(x + hx, y); const gw = G(x - hx, y); const gn = G(x, y + hy); const gs = G(x, y - hy);
      if ([fe, fw, fn, fs, ge, gw, gn, gs].some((value) => value === undefined)) break;
      const a = (fe! - fw!) / (2 * hx); const b = (fn! - fs!) / (2 * hy);
      const c = (ge! - gw!) / (2 * hx); const d = (gn! - gs!) / (2 * hy);
      const determinant = a * d - b * c;
      if (!Number.isFinite(determinant) || determinant === 0) break;
      const stepX = -(d * f - b * g) / determinant; const stepY = -(-c * f + a * g) / determinant;
      let accepted = false;
      for (let scale = 1; scale > 1e-4; scale /= 2) {
        const nextX = x + scale * stepX; const nextY = y + scale * stepY;
        if (Math.abs(nextX - seedX) > spanX || Math.abs(nextY - seedY) > spanY) continue;
        const nf = F(nextX, nextY); const ng = G(nextX, nextY);
        if (nf !== undefined && ng !== undefined && size(nf, ng) < size(f, g)) {
          lastStep = Math.hypot(scale * stepX, scale * stepY); x = nextX; y = nextY; f = nf; g = ng; accepted = true; break;
        }
      }
      if (!accepted) { converged = f !== undefined && g !== undefined && size(f, g) < 1e-8; break; }
    }
    if (!converged) continue;
    const errorBound = Math.max(Math.min(lastStep, 1e-6 * Math.max(spanX, spanY)), 1e-12 * (1 + Math.hypot(x, y)));
    if (!roots.some((root) => Math.abs(root.x - x) <= 1e-7 * spanX && Math.abs(root.y - y) <= 1e-7 * spanY)) roots.push({ x: x + 0, y: y + 0, errorBound });
  }
  return roots;
}
