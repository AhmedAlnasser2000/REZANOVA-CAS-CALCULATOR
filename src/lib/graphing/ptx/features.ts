import type { PtxPlaneFunction, PtxPolynomialRoot, PtxRealFunction, PtxSolverPort } from './solver-port';
import type { PtxLevel, PtxWindow } from './types';

// Points of interest on real curves: roots (including touching roots, which do
// not change sign), extrema and intersections, found over a sample grid and
// refined. The same finders feed the on-graph dots and Analyze.

export type PtxFinderOptions = {
  /** Grid intervals across the window (default 400). */
  steps?: number;
  isCancelled?: () => boolean;
  onEvaluation?: () => void;
};

export type PtxFoundRoot = { x: number; level: PtxLevel; errorBound: number; residual: number; label: string | null };
export type PtxFoundExtremum = { x: number; y: number; kind: 'minimum' | 'maximum'; level: PtxLevel; errorBound: number };

const GOLDEN = (Math.sqrt(5) - 1) / 2;
const TOUCHING_RATIO = 1e-10;

function sampler(f: PtxRealFunction, options: PtxFinderOptions) {
  return (x: number) => { options.onEvaluation?.(); return f(x); };
}

function grid(f: PtxRealFunction, minimum: number, maximum: number, steps: number) {
  const xs: number[] = []; const values: Array<number | undefined> = [];
  for (let index = 0; index <= steps; index += 1) {
    const x = minimum + (maximum - minimum) * index / steps;
    xs.push(x); values.push(f(x));
  }
  return { xs, values };
}

/** Minimises g on [a, b] by golden-section search. */
function goldenMinimum(g: (x: number) => number | undefined, a: number, b: number) {
  let low = a; let high = b;
  let c = high - GOLDEN * (high - low); let d = low + GOLDEN * (high - low);
  let gc = g(c); let gd = g(d);
  for (let iteration = 0; iteration < 90 && high - low > 1e-15 * (1 + Math.abs(low)); iteration += 1) {
    if (gc === undefined || gd === undefined) return null;
    if (gc <= gd) { high = d; d = c; gd = gc; c = high - GOLDEN * (high - low); gc = g(c); }
    else { low = c; c = d; gc = gd; d = low + GOLDEN * (high - low); gd = g(d); }
  }
  return (low + high) / 2;
}

function unique<T extends { x: number }>(points: T[]) {
  const sorted = [...points].sort((first, second) => first.x - second.x);
  return sorted.filter((point, index) => index === 0 || Math.abs(point.x - sorted[index - 1]!.x) > 1e-7 * (1 + Math.abs(point.x)));
}

/**
 * Roots of f in [minimum, maximum]. Exact polynomial roots win when given;
 * otherwise sign changes are bisected (a bracket whose values grow is a pole,
 * not a root) and local minima of |f| that reach ~0 are touching roots.
 */
export function ptxRealRoots(f: PtxRealFunction, minimum: number, maximum: number, options: PtxFinderOptions = {},
  polynomialRoots: PtxPolynomialRoot[] | null = null): PtxFoundRoot[] {
  if (polynomialRoots) {
    return polynomialRoots.filter((root) => root.value >= minimum && root.value <= maximum)
      .sort((first, second) => first.value - second.value).map((root) => ({
      x: root.value, level: root.exact ? 'exact-proved' as const : 'numeric-validated' as const,
      errorBound: root.exact ? 0 : 1e-12 * (1 + Math.abs(root.value)), residual: 0, label: root.label,
    }));
  }
  const run = sampler(f, options);
  const { xs, values } = grid(run, minimum, maximum, options.steps ?? 400);
  const roots: PtxFoundRoot[] = [];
  for (let index = 0; index < xs.length; index += 1) {
    if (options.isCancelled?.()) break;
    const value = values[index];
    if (value === 0) roots.push({ x: xs[index]!, level: 'numeric-validated', errorBound: 0, residual: 0, label: null });
    const next = values[index + 1];
    if (value !== undefined && next !== undefined && value * next < 0) {
      let a = xs[index]!; let b = xs[index + 1]!; let fa = value; let fb = next;
      for (let pass = 0; pass < 80 && b - a > 2 * Number.EPSILON * (1 + Math.abs(a)); pass += 1) {
        const middle = (a + b) / 2; const fm = run(middle);
        if (fm === undefined) break;
        if (fm === 0) { a = middle; b = middle; fa = 0; fb = 0; break; }
        if (fa * fm < 0) { b = middle; fb = fm; } else { a = middle; fa = fm; }
      }
      // Across a pole the bracket's values grow as it shrinks; across a root they fall.
      if (Math.min(Math.abs(fa), Math.abs(fb)) <= Math.min(Math.abs(value), Math.abs(next))) {
        const x = Math.abs(fa) <= Math.abs(fb) ? a : b;
        roots.push({ x, level: 'numeric-validated', errorBound: Math.max(b - a, Number.EPSILON * (1 + Math.abs(x))), residual: Math.min(Math.abs(fa), Math.abs(fb)), label: null });
      }
    }
    const previous = values[index - 1];
    if (value !== undefined && value !== 0 && previous !== undefined && next !== undefined && previous * value > 0 && value * next > 0
      && Math.abs(value) <= Math.abs(previous) && Math.abs(value) <= Math.abs(next)) {
      const x = goldenMinimum((t) => { const v = run(t); return v === undefined ? undefined : Math.abs(v); }, xs[index - 1]!, xs[index + 1]!);
      const at = x === null ? undefined : run(x);
      if (x !== null && at !== undefined && Math.abs(at) <= TOUCHING_RATIO * Math.max(Math.abs(previous), Math.abs(next))) {
        roots.push({ x, level: 'sampled-estimate', errorBound: Math.sqrt(Number.EPSILON) * (1 + Math.abs(x)), residual: Math.abs(at), label: null });
      }
    }
  }
  return unique(roots);
}

/** Local minima and maxima of f strictly inside the window, refined by golden-section search. */
export function ptxRealExtrema(f: PtxRealFunction, minimum: number, maximum: number, options: PtxFinderOptions = {}): PtxFoundExtremum[] {
  const run = sampler(f, options);
  const { xs, values } = grid(run, minimum, maximum, options.steps ?? 400);
  const found: PtxFoundExtremum[] = [];
  for (let index = 1; index + 1 < xs.length; index += 1) {
    if (options.isCancelled?.()) break;
    const previous = values[index - 1]; const value = values[index]; const next = values[index + 1];
    if (previous === undefined || value === undefined || next === undefined) continue;
    const kind = value < previous && value <= next ? 'minimum' : value > previous && value >= next ? 'maximum' : null;
    if (!kind) continue;
    const sign = kind === 'minimum' ? 1 : -1;
    const x = goldenMinimum((t) => { const v = run(t); return v === undefined ? undefined : sign * v; }, xs[index - 1]!, xs[index + 1]!);
    const y = x === null ? undefined : run(x);
    if (x === null || y === undefined) continue;
    // A pole between samples looks like a maximum of huge height; a real extremum stays near its neighbours.
    if (Math.abs(y) > 1e3 * Math.max(1, Math.abs(previous), Math.abs(next))) continue;
    // Error in x from rounding: the flat top hides x to about sqrt(eps · |f| / |f''|).
    const h = (maximum - minimum) * 1e-4;
    const left = run(x - h); const right = run(x + h);
    if (left === undefined || right === undefined) continue;
    const curvature = Math.abs(left - 2 * y + right) / (h * h);
    const errorBound = curvature > 0 ? Math.sqrt(4 * Number.EPSILON * Math.max(1, Math.abs(y)) / curvature) : Math.sqrt(Number.EPSILON) * (1 + Math.abs(x));
    found.push({ x, y, kind, level: 'numeric-validated', errorBound });
  }
  return unique(found);
}

/** Where y = f(x) and y = g(x) meet, including tangential meetings. */
export function ptxRealIntersections(f: PtxRealFunction, g: PtxRealFunction, minimum: number, maximum: number,
  options: PtxFinderOptions = {}, polynomialRoots: PtxPolynomialRoot[] | null = null) {
  const difference: PtxRealFunction = (x) => {
    const a = f(x); const b = g(x);
    return a === undefined || b === undefined ? undefined : a - b;
  };
  return ptxRealRoots(difference, minimum, maximum, options, polynomialRoots).flatMap((root) => {
    const y = f(root.x);
    return y === undefined ? [] : [{ ...root, y }];
  });
}

/** Where two curves in a plane (loci, implicit curves) cross: common zeros of F and G in the window. */
export function ptxPlaneIntersections(F: PtxPlaneFunction, G: PtxPlaneFunction, window: PtxWindow, port: PtxSolverPort) {
  return port.planeSystemRoots(F, G, window).map((point) => ({
    ...point,
    level: 'sampled-estimate' as PtxLevel,
    errorBound: 1e-9 * (1 + Math.hypot(point.x, point.y)),
  }));
}
