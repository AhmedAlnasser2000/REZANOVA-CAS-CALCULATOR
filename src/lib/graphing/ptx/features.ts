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
      // Across a root the bracket's values fall to ~0 as it shrinks; across a pole they grow, across a jump they stay.
      if (Math.min(Math.abs(fa), Math.abs(fb)) <= 1e-6 * Math.max(Math.abs(value), Math.abs(next))) {
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

/**
 * A step between samples (a piecewise jump, floor) also looks like an
 * extremum; at a true extremum the gap to a neighbour shrinks as the probe
 * distance shrinks, at a jump it stays.
 */
function isJumpAt(f: PtxRealFunction, x: number, y: number, distance: number) {
  const scale = 1e-9 * Math.max(1, Math.abs(y));
  for (const side of [-1, 1]) {
    const far = f(x + side * distance); const near = f(x + side * distance / 10);
    if (far === undefined || near === undefined) return true;
    const farGap = Math.abs(far - y); const nearGap = Math.abs(near - y);
    if (nearGap > scale && nearGap > 0.5 * farGap) return true;
  }
  return false;
}

/**
 * Where f' crosses zero inside [low, high], in the direction a minimum (− to +)
 * or maximum (+ to −) needs: bisected until the bracket cannot shrink.
 */
function bisectSlope(derivative: (x: number) => number | undefined, low: number, high: number, kind: 'minimum' | 'maximum') {
  let a = low; let b = high; let da = derivative(a); let db = derivative(b);
  if (da === undefined || db === undefined) return null;
  const sign = kind === 'minimum' ? 1 : -1;
  if (!(sign * da < 0 && sign * db > 0)) return null;
  for (let pass = 0; pass < 200 && b - a > 2 * Number.EPSILON * (1 + Math.abs(a)); pass += 1) {
    const middle = (a + b) / 2; const dm = derivative(middle);
    if (dm === undefined) return null;
    if (dm === 0) return { x: middle, errorBound: Number.EPSILON * (1 + Math.abs(middle)) };
    if (sign * dm < 0) { a = middle; da = dm; } else { b = middle; db = dm; }
  }
  return { x: (a + b) / 2, errorBound: Math.max(b - a, Number.EPSILON * (1 + Math.abs(a))) };
}

/** Local minima and maxima of f strictly inside the window, refined by golden-section search (or f' = 0 when f' is known). */
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
    if (isJumpAt(run, x, y, (maximum - minimum) * 1e-6)) continue;
    // With an exact derivative, x is where f' changes sign: bisected to the last bit (PTX-ENGINE1).
    const exact = f.derivative ? bisectSlope(f.derivative, xs[index - 1]!, xs[index + 1]!, kind) : null;
    if (exact) {
      const atExact = run(exact.x);
      if (atExact !== undefined) { found.push({ x: exact.x, y: atExact, kind, level: 'numeric-validated', errorBound: exact.errorBound }); continue; }
    }
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

/**
 * The one-sided limit of f at `at` from `side`: values at shrinking distances
 * must settle; the last value is the estimate and its last change the error.
 */
export function ptxOneSidedLimit(f: PtxRealFunction, at: number, side: 1 | -1, span: number) {
  let previous: number | undefined; let change = Infinity;
  // Close to the point, doubles lose digits to cancellation ((eˣ − 1)/x near 0); double-double keeps them.
  const evaluate = (x: number) => f.precise?.(x)?.value ?? f(x);
  // With the lane the approach can go much closer before cancellation would set in.
  const closest = f.precise ? 20 : 12;
  for (let power = 4; power <= closest; power += 1) {
    const offset = span * 10 ** -power;
    // Inputs are doubles: an offset below a few ulps of the point would land on the point itself.
    if (power > 12 && offset < 64 * Number.EPSILON * Math.max(Math.abs(at), Number.MIN_VALUE)) break;
    const value = evaluate(at + side * offset);
    if (value === undefined) return undefined;
    if (previous !== undefined) change = Math.abs(value - previous);
    previous = value;
  }
  return previous !== undefined && change <= 1e-8 * Math.max(1, Math.abs(previous)) ? { value: previous, error: Math.max(change, 1e-15) } : undefined;
}

/**
 * Whether |f| grows without bound toward `at` from `side` (a pole, or a
 * logarithmic edge like ln x at 0): over shrinking distances |f| keeps rising
 * and its rises do not die away (a settling function's would).
 */
export function ptxGrowsToward(f: PtxRealFunction, at: number, side: 1 | -1, span: number) {
  const magnitudes: number[] = [];
  for (let power = 3; power <= 12; power += 1) {
    const value = f(at + side * span * 10 ** -power);
    if (value === undefined) return false;
    magnitudes.push(Math.abs(value));
  }
  const rises = magnitudes.slice(1).map((value, index) => value - magnitudes[index]!);
  return rises.every((rise) => rise > 0) && rises.at(-1)! >= 0.5 * rises[0]! && magnitudes.at(-1)! > magnitudes[0]! + 1;
}

export type PtxDiscontinuity =
  /** Both sides approach `limit`; the curve has no value there, or a different one (`value`). */
  | { kind: 'hole'; x: number; limit: number; value?: number }
  /** The sides approach different values; `value` is f there when it has one. */
  | { kind: 'jump'; x: number; left: number; right: number; value?: number }
  /** |f| grows on the given sides. */
  | { kind: 'pole'; x: number; sides: Array<1 | -1> };

const CONSTANT_SYMBOLS = new Set(['Pi', 'ExponentialE', 'ImaginaryUnit', 'Nothing', 'True', 'False']);

function leafSymbols(node: unknown, into = new Set<string>()) {
  if (typeof node === 'string') { if (!CONSTANT_SYMBOLS.has(node)) into.add(node); return into; }
  if (Array.isArray(node)) node.slice(1).forEach((child) => leafSymbols(child, into));
  return into;
}

/** Every expression that divides something (a denominator or a base with a negative power). */
// tan u = sin u / cos u and friends: their poles are the zeros of these hidden denominators.
const HIDDEN_DENOMINATOR: Record<string, string> = { Tan: 'Cos', Sec: 'Cos', Cot: 'Sin', Csc: 'Sin' };

export function ptxDenominators(node: unknown): unknown[] {
  if (!Array.isArray(node)) return [];
  const hidden = typeof node[0] === 'string' ? HIDDEN_DENOMINATOR[node[0]] : undefined;
  const own = node[0] === 'Divide' && node.length === 3 ? [node[2]]
    : node[0] === 'Power' && node.length === 3 && typeof node[2] === 'number' && node[2] < 0 ? [node[1]]
      : hidden && node.length === 2 ? [[hidden, node[1]]] : [];
  return [...own, ...node.slice(1).flatMap(ptxDenominators)];
}

/**
 * Holes, jumps and poles of y = f(x) inside the window. Candidates are the
 * zeros of every denominator (exact for polynomials) plus steps found on the
 * sample grid (a gap that does not shrink when its bracket is halved); each is
 * classified from its one-sided limits and the value there.
 */
export function ptxRealDiscontinuities(f: PtxRealFunction, mathJson: unknown, variable: string, minimum: number, maximum: number,
  port: PtxSolverPort, parameters: Readonly<Record<string, number>>, options: PtxFinderOptions = {}): PtxDiscontinuity[] {
  const span = maximum - minimum;
  const candidates: number[] = [];
  for (const denominator of ptxDenominators(mathJson)) {
    const symbols = [...leafSymbols(denominator)];
    if (!symbols.includes(variable)) continue;
    const g = port.realFunction({ mathJson: denominator, freeSymbols: symbols } as never, variable, parameters);
    if (!g) continue;
    for (const root of ptxRealRoots(g, minimum, maximum, options, port.realPolynomialRoots(denominator, variable, parameters))) candidates.push(root.x);
  }
  // Steps: a sample gap far larger than its neighbours that keeps its size when the bracket is halved.
  const steps = options.steps ?? 400;
  const xs = Array.from({ length: steps + 1 }, (_, index) => minimum + span * index / steps);
  const values = xs.map((x) => f(x));
  const gap = (index: number) => {
    const a = values[index]; const b = values[index + 1];
    return a === undefined || b === undefined ? 0 : Math.abs(b - a);
  };
  for (let index = 1; index + 2 < xs.length; index += 1) {
    if (options.isCancelled?.()) break;
    const here = gap(index);
    if (!(here > 1e-9 && here > 20 * Math.max(gap(index - 1), gap(index + 1), 1e-12))) continue;
    let low = xs[index]!; let high = xs[index + 1]!;
    let lowValue = values[index]!; let highValue = values[index + 1]!;
    for (let pass = 0; pass < 60 && high - low > 4 * Number.EPSILON * (1 + Math.abs(low)); pass += 1) {
      const middle = (low + high) / 2; const value = f(middle);
      if (value === undefined) break;
      if (Math.abs(value - lowValue) >= Math.abs(highValue - value)) { high = middle; highValue = value; } else { low = middle; lowValue = value; }
    }
    if (Math.abs(highValue - lowValue) < 0.5 * here) continue;
    const at = (low + high) / 2;
    candidates.push(Math.abs(at) < 1e-12 * span ? 0 : Number(at.toPrecision(12)));
  }
  // Poles the expression does not spell as a division: a sign flip between huge values, or a spike in |f|,
  // narrowed to where |f| grows; roots and smooth peaks are rejected by the growth test below.
  for (let index = 0; index + 1 < xs.length; index += 1) {
    if (options.isCancelled?.()) break;
    const a = values[index]; const b = values[index + 1];
    if (a === undefined || b === undefined) continue;
    if (Math.sign(a) !== Math.sign(b) && Math.min(Math.abs(a), Math.abs(b)) > 1) {
      let low = xs[index]!; let high = xs[index + 1]!; const lowSign = Math.sign(a);
      for (let pass = 0; pass < 60; pass += 1) {
        const middle = (low + high) / 2; const value = f(middle);
        if (value === undefined) break;
        if (Math.sign(value) === lowSign) low = middle; else high = middle;
      }
      candidates.push((low + high) / 2);
    }
    const c = values[index + 2];
    if (index + 2 < xs.length && c !== undefined && Math.abs(b) > 8 * Math.max(Math.abs(a), Math.abs(c), 1e-12)) {
      // Narrow the spike by ternary search on |f| over the two cells around it.
      let low = xs[index]!; let high = xs[index + 2]!;
      for (let pass = 0; pass < 80; pass += 1) {
        const m1 = low + (high - low) / 3; const m2 = high - (high - low) / 3;
        const v1 = f(m1); const v2 = f(m2);
        if (v1 === undefined || v2 === undefined) break;
        if (Math.abs(v1) < Math.abs(v2)) low = m1; else high = m2;
      }
      candidates.push((low + high) / 2);
    }
  }
  // Guaranteed ranges (PTX-ENGINE1, E7): bisect every part of the window where f may be discontinuous or undefined
  // down to machine precision, so a pole, hole or jump cannot hide between grid points.
  if (f.enclose) candidates.push(...intervalCandidates(f.enclose, minimum, maximum, options));
  const found: PtxDiscontinuity[] = [];
  const seen: number[] = [];
  for (const x of candidates.sort((a, b) => a - b)) {
    if (x <= minimum || x >= maximum || seen.some((other) => Math.abs(other - x) <= 1e-9 * (1 + Math.abs(x)))) continue;
    seen.push(x);
    const left = ptxOneSidedLimit(f, x, -1, span); const right = ptxOneSidedLimit(f, x, 1, span); const value = f(x);
    const sides = ([-1, 1] as const).filter((side) => ptxGrowsToward(f, x, side, span));
    if (sides.length) { found.push({ kind: 'pole', x, sides: [...sides] }); continue; }
    if (!left || !right) continue;
    const same = Math.abs(left.value - right.value) <= 1e-7 * Math.max(1, Math.abs(left.value));
    if (same && value !== undefined && Math.abs(value - left.value) <= 1e-7 * Math.max(1, Math.abs(value))) continue;
    found.push(same ? { kind: 'hole', x, limit: left.value, ...(value !== undefined ? { value } : {}) }
      : { kind: 'jump', x, left: left.value, right: right.value, ...(value !== undefined ? { value } : {}) });
  }
  return found;
}

function intervalCandidates(enclose: NonNullable<PtxRealFunction['enclose']>, minimum: number, maximum: number, options: PtxFinderOptions) {
  const candidates: number[] = [];
  const stack: Array<[number, number]> = [[minimum, maximum]];
  let evaluations = 0;
  while (stack.length && evaluations < 6000 && candidates.length < 200) {
    if (options.isCancelled?.()) break;
    const [lo, hi] = stack.pop()!;
    // Only definedness and continuity matter here: the plain enclosure is enough and much cheaper.
    const value = enclose(lo, hi, false).value; evaluations += 1;
    if (value.defined === 2 && value.continuous && Number.isFinite(value.lo) && Number.isFinite(value.hi)) continue;
    // Nowhere defined: a gap in the domain, not a point (its edges are found where it meets defined parts).
    if (value.defined === 0) continue;
    const middle = (lo + hi) / 2;
    if (middle <= lo || middle >= hi || hi - lo <= 4 * Number.EPSILON * Math.max(1, Math.abs(middle))) {
      // Within a few ulps of the discontinuity, possibly on its wrong side: snap to 12 digits, as the grid path does,
      // so floor reads at x = 3, not 3 − ε.
      candidates.push(Math.abs(middle) < 1e-12 * (maximum - minimum) ? 0 : Number(middle.toPrecision(12)));
      continue;
    }
    stack.push([middle, hi], [lo, middle]);
  }
  return candidates;
}

/** Circles for holes and jumps: open where the curve has no point, filled where it does. */
export function ptxDiscontinuityMarkers(discontinuities: readonly PtxDiscontinuity[]) {
  const open: Array<{ x: number; y: number }> = []; const filled: Array<{ x: number; y: number }> = [];
  const same = (a: number, b: number) => Math.abs(a - b) <= 1e-7 * Math.max(1, Math.abs(a));
  for (const item of discontinuities) {
    if (item.kind === 'hole') {
      open.push({ x: item.x, y: item.limit });
      if (item.value !== undefined) filled.push({ x: item.x, y: item.value });
    } else if (item.kind === 'jump') {
      for (const side of [item.left, item.right]) (item.value !== undefined && same(item.value, side) ? filled : open).push({ x: item.x, y: side });
      if (item.value !== undefined && !same(item.value, item.left) && !same(item.value, item.right)) filled.push({ x: item.x, y: item.value });
    }
  }
  return { open, filled };
}
