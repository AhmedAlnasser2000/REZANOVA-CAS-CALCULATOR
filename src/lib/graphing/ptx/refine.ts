import type { PtxCurvePoint, PtxPlaneFunction, PtxRealFunction } from './solver-port';
import type { PtxLevel } from './types';

// Putting a picked point onto the true object. Explicit curves are evaluated at
// the pointer; implicit curves (and complex loci, which are implicit curves in
// the (Re z, Im z) plane) are reached by Newton projection along the gradient,
// in small screen-sized steps so a trace never jumps to another branch.

/** Graph units per CSS pixel along x and y. */
export type PtxPixelUnits = { x: number; y: number };

export type PtxRefinedPoint = { x: number; y: number; level: PtxLevel; errorBound: number; residual: number };

const MAX_ITERATIONS = 40;
const MAX_STEP_PIXELS = 2;

/** The point of y = f(x) (or x = f(y)) at the pointer's coordinate. */
export function ptxRefineExplicit(f: PtxRealFunction, at: number, orientation: 'y-of-x' | 'x-of-y'): PtxRefinedPoint | null {
  const value = f(at);
  if (value === undefined) return null;
  // With guaranteed ranges, the value at this exact input is proved to the digits its enclosure allows (PTX-ENGINE1).
  const proof = provedValue(f, at);
  let level: PtxLevel = proof ? 'interval-proved' : 'numeric-validated';
  // Otherwise: floating-point evaluation error, not an interpolation error.
  let errorBound = proof ?? 8 * Number.EPSILON * Math.max(1, Math.abs(value));
  let y = value;
  // When doubles have lost digits here (the proof is too wide to show six), the double-double lane gives them back,
  // with its own error bound (verified, not proved).
  if (errorBound > 1e-6 * Math.max(Math.abs(value), Number.MIN_VALUE)) {
    const precise = f.precise?.(at);
    if (precise && precise.error < errorBound) { y = precise.value; errorBound = Math.max(precise.error, Number.EPSILON * Math.abs(precise.value)); level = 'numeric-validated'; }
  }
  return orientation === 'y-of-x'
    ? { x: at, y, level, errorBound, residual: 0 }
    : { x: y, y: at, level, errorBound, residual: 0 };
}

/** Half the width of a guaranteed enclosure of f at exactly `at`, or null without one. */
function provedValue(f: PtxRealFunction, at: number) {
  const enclosure = f.enclose?.(at, at).value;
  if (!enclosure || enclosure.defined !== 2 || !Number.isFinite(enclosure.lo) || !Number.isFinite(enclosure.hi)) return null;
  return Math.max((enclosure.hi - enclosure.lo) / 2, Number.EPSILON * Math.max(1, Math.abs(enclosure.lo)));
}

/** A sign change of F between two points, guaranteed by interval enclosures there. */
function provedSignChange(F: PtxPlaneFunction, a: { x: number; y: number }, b: { x: number; y: number }) {
  const at = (p: { x: number; y: number }) => F.enclose?.({ xMin: p.x, xMax: p.x, yMin: p.y, yMax: p.y }).value;
  const first = at(a); const second = at(b);
  if (!first || !second || first.defined !== 2 || second.defined !== 2) return false;
  // The segment between must also be continuous for the sign change to mean a zero.
  const box = F.enclose!({ xMin: Math.min(a.x, b.x), xMax: Math.max(a.x, b.x), yMin: Math.min(a.y, b.y), yMax: Math.max(a.y, b.y) }).value;
  return box.defined === 2 && box.continuous && ((first.hi < 0 && second.lo > 0) || (first.lo > 0 && second.hi < 0));
}

function gradient(F: PtxPlaneFunction, x: number, y: number, units: PtxPixelUnits) {
  // Exact partials by automatic differentiation when the adapter gives them; central differences otherwise.
  const exact = F.gradient?.(x, y);
  if (exact) return { gx: exact.fx, gy: exact.fy };
  const hx = Math.max(units.x * 1e-3, 1e-9 * (1 + Math.abs(x)));
  const hy = Math.max(units.y * 1e-3, 1e-9 * (1 + Math.abs(y)));
  const east = F(x + hx, y); const west = F(x - hx, y); const north = F(x, y + hy); const south = F(x, y - hy);
  if (east === undefined || west === undefined || north === undefined || south === undefined) return null;
  return { gx: (east - west) / (2 * hx), gy: (north - south) / (2 * hy) };
}

/**
 * A jump (arg across its cut, a pole) flips sign without a root: its slope
 * grows as the probe distance shrinks, while a root's slope stays put.
 */
function isJumpAt(F: PtxPlaneFunction, x: number, y: number, nx: number, ny: number, distance: number) {
  const near = [F(x + nx * distance, y + ny * distance), F(x - nx * distance, y - ny * distance)];
  const far = [F(x + 4 * nx * distance, y + 4 * ny * distance), F(x - 4 * nx * distance, y - 4 * ny * distance)];
  if (near.some((value) => value === undefined) || far.some((value) => value === undefined)) return false;
  const nearSlope = Math.abs(near[0]! - near[1]!) / (2 * distance);
  const farSlope = Math.abs(far[0]! - far[1]!) / (8 * distance);
  return nearSlope > 3 * farSlope && nearSlope > 1e-12;
}

/**
 * Projects `start` onto F = 0. Null when F is undefined there, the curve is
 * further than `maxMovePixels` away, or the only "crossing" is a jump.
 */
export function ptxProjectToCurve(F: PtxPlaneFunction, start: { x: number; y: number }, units: PtxPixelUnits,
  maxMovePixels = 12): PtxRefinedPoint | null {
  let x = start.x; let y = start.y;
  let value = F(x, y);
  for (let iteration = 0; value !== undefined && iteration < MAX_ITERATIONS; iteration += 1) {
    const g = gradient(F, x, y, units);
    if (!g) return null;
    const norm2 = g.gx * g.gx + g.gy * g.gy;
    if (!(norm2 > 0) || !Number.isFinite(norm2)) return null;
    let stepX = value * g.gx / norm2; let stepY = value * g.gy / norm2;
    const stepPixels = Math.hypot(stepX / units.x, stepY / units.y);
    if (stepPixels > MAX_STEP_PIXELS) { stepX *= MAX_STEP_PIXELS / stepPixels; stepY *= MAX_STEP_PIXELS / stepPixels; }
    x -= stepX; y -= stepY;
    if (Math.hypot((x - start.x) / units.x, (y - start.y) / units.y) > maxMovePixels) return null;
    value = F(x, y);
    if (stepPixels < 1e-9) break;
  }
  if (value === undefined) return null;
  const g = gradient(F, x, y, units);
  if (!g) return null;
  const norm = Math.hypot(g.gx, g.gy);
  if (!(norm > 0)) return null;
  const nx = g.gx / norm; const ny = g.gy / norm;
  const distanceToCurve = Math.abs(value) / norm;
  // Bracket along the normal: a sign change within `probe` proves a zero there.
  const probe = Math.max(4 * distanceToCurve, 1e-10 * (1 + Math.hypot(x, y)));
  if (isJumpAt(F, x, y, nx, ny, Math.max(probe, 1e-3 * Math.min(units.x, units.y)))) return null;
  const ahead = F(x + nx * probe, y + ny * probe); const behind = F(x - nx * probe, y - ny * probe);
  const bracketed = ahead !== undefined && behind !== undefined && ahead * behind <= 0;
  // With guaranteed ranges the bracket is a proof: the curve crosses the normal within `probe` of the point.
  if (bracketed && F.enclose && provedSignChange(F, { x: x - nx * probe, y: y - ny * probe }, { x: x + nx * probe, y: y + ny * probe })) {
    return { x, y, level: 'interval-proved', errorBound: probe, residual: Math.abs(value) };
  }
  return bracketed
    ? { x, y, level: 'numeric-validated', errorBound: probe, residual: Math.abs(value) }
    : { x, y, level: 'sampled-estimate', errorBound: Math.max(distanceToCurve, 1e-3 * Math.min(units.x, units.y)), residual: Math.abs(value) };
}

const GOLDEN = (Math.sqrt(5) - 1) / 2;

/**
 * The point of a parametric or polar curve nearest the pointer on screen,
 * searched over t near the sampled guess (golden section on ± `tSpan`). The
 * point is evaluated exactly at that t, so it lies on the curve; only the
 * choice of t is approximate.
 */
export function ptxRefineParametric(curve: PtxCurvePoint, tGuess: number, tSpan: number, pointer: { x: number; y: number },
  units: PtxPixelUnits): (PtxRefinedPoint & { t: number; radius?: number }) | null {
  const distance = (t: number) => {
    const point = curve(t);
    return point ? Math.hypot((point.x - pointer.x) / units.x, (point.y - pointer.y) / units.y) : Infinity;
  };
  let low = tGuess - tSpan; let high = tGuess + tSpan;
  let c = high - GOLDEN * (high - low); let d = low + GOLDEN * (high - low);
  let fc = distance(c); let fd = distance(d);
  for (let iteration = 0; iteration < 80 && high - low > 1e-14 * (1 + Math.abs(low)); iteration += 1) {
    if (fc <= fd) { high = d; d = c; fd = fc; c = high - GOLDEN * (high - low); fc = distance(c); }
    else { low = c; c = d; fc = fd; d = low + GOLDEN * (high - low); fd = distance(d); }
  }
  const t = (low + high) / 2;
  const point = curve(t);
  if (!point) return null;
  // The point at this exact t, proved to its enclosure's width when the curve has guaranteed ranges.
  const enclosure = curve.enclose?.(t, t);
  const proved = enclosure && enclosure.x.defined === 2 && enclosure.y.defined === 2
    && [enclosure.x.lo, enclosure.x.hi, enclosure.y.lo, enclosure.y.hi].every(Number.isFinite)
    ? Math.max((enclosure.x.hi - enclosure.x.lo) / 2, (enclosure.y.hi - enclosure.y.lo) / 2, Number.EPSILON) : null;
  const errorBound = proved ?? 8 * Number.EPSILON * Math.max(1, Math.abs(point.x), Math.abs(point.y));
  return { x: point.x, y: point.y, t, ...(point.radius !== undefined ? { radius: point.radius } : {}),
    level: proved !== null ? 'interval-proved' : 'numeric-validated', errorBound, residual: 0 };
}

/** Moves `pixels` along the curve (sign picks the direction) and projects back onto it. */
export function ptxStepAlongCurve(F: PtxPlaneFunction, from: { x: number; y: number }, pixels: number, units: PtxPixelUnits) {
  const g = gradient(F, from.x, from.y, units);
  if (!g) return null;
  // The tangent (−Fy, Fx), scaled so one step is `pixels` long on screen whatever the axes' scales.
  const tx = -g.gy; const ty = g.gx;
  const screenLength = Math.hypot(tx / units.x, ty / units.y);
  if (!(screenLength > 0)) return null;
  const next = { x: from.x + tx / screenLength * pixels, y: from.y + ty / screenLength * pixels };
  return ptxProjectToCurve(F, next, units, Math.abs(pixels) + 6);
}
