import type { ComplexValue } from '../../numeric/complex';

// Roots of F(z) = 0 for functions that are not holomorphic in z (conjugates,
// Re, Im, |.|, arg). A complex Newton step needs dF/dz, which does not exist
// there, so this solves the real 2-D system (Re F, Im F) = 0 in (x, y) with a
// finite-difference Jacobian and a damped step. Results are numeric roots
// found in the region, not a complete list.

export type GraphPlaneRegion = { xMin: number; xMax: number; yMin: number; yMax: number };
export type GraphPlaneRoot = { re: number; im: number };

const GRID = 15;
const MAX_ITERATIONS = 60;
const RESIDUAL_TOLERANCE = 1e-11;
const DEDUPE_DISTANCE = 1e-6;

type Evaluate = (z: ComplexValue) => ComplexValue | null;

function residual(evaluate: Evaluate, x: number, y: number): [number, number] | null {
  const value = evaluate({ re: x, im: y });
  return value && Number.isFinite(value.re) && Number.isFinite(value.im) ? [value.re, value.im] : null;
}

function refine(evaluate: Evaluate, seedX: number, seedY: number, bounds: GraphPlaneRegion): GraphPlaneRoot | null {
  let x = seedX; let y = seedY;
  let value = residual(evaluate, x, y);
  for (let iteration = 0; value && iteration < MAX_ITERATIONS; iteration += 1) {
    const norm = Math.hypot(value[0], value[1]);
    if (norm < RESIDUAL_TOLERANCE) return { re: x + 0, im: y + 0 };
    const h = 1e-6 * Math.max(1, Math.hypot(x, y));
    const east = residual(evaluate, x + h, y); const west = residual(evaluate, x - h, y);
    const north = residual(evaluate, x, y + h); const south = residual(evaluate, x, y - h);
    if (!east || !west || !north || !south) return null;
    const a = (east[0] - west[0]) / (2 * h); const b = (north[0] - south[0]) / (2 * h);
    const c = (east[1] - west[1]) / (2 * h); const d = (north[1] - south[1]) / (2 * h);
    const determinant = a * d - b * c;
    if (Math.abs(determinant) < 1e-18) return null;
    const stepX = -(d * value[0] - b * value[1]) / determinant;
    const stepY = -(-c * value[0] + a * value[1]) / determinant;
    let accepted = false;
    for (let scale = 1; scale > 1e-4; scale /= 2) {
      const nextX = x + stepX * scale; const nextY = y + stepY * scale;
      if (nextX < bounds.xMin || nextX > bounds.xMax || nextY < bounds.yMin || nextY > bounds.yMax) continue;
      const next = residual(evaluate, nextX, nextY);
      if (next && Math.hypot(next[0], next[1]) < norm) { x = nextX; y = nextY; value = next; accepted = true; break; }
    }
    if (!accepted) return null;
  }
  return value && Math.hypot(value[0], value[1]) < RESIDUAL_TOLERANCE ? { re: x + 0, im: y + 0 } : null;
}

/** Numeric roots of `evaluate` inside `region` (searched from a seed grid over the region widened by one span). */
export function findGraphPlaneRoots(evaluate: Evaluate, region: GraphPlaneRegion): GraphPlaneRoot[] {
  const spanX = region.xMax - region.xMin; const spanY = region.yMax - region.yMin;
  if (!(spanX > 0) || !(spanY > 0)) return [];
  const bounds = { xMin: region.xMin - spanX, xMax: region.xMax + spanX, yMin: region.yMin - spanY, yMax: region.yMax + spanY };
  const seeds: Array<[number, number]> = [[0, 0]];
  for (let row = 0; row < GRID; row += 1) {
    for (let column = 0; column < GRID; column += 1) {
      seeds.push([region.xMin + (column + 0.5) / GRID * spanX, region.yMin + (row + 0.5) / GRID * spanY]);
    }
  }
  const roots: GraphPlaneRoot[] = [];
  for (const [x, y] of seeds) {
    const root = refine(evaluate, x, y, bounds);
    if (root && !roots.some((known) => Math.hypot(known.re - root.re, known.im - root.im) < DEDUPE_DISTANCE)) roots.push(root);
  }
  return roots.sort((first, second) => first.re - second.re || first.im - second.im);
}
