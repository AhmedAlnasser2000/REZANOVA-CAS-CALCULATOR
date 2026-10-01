import {
  nextDown,
  nextUp,
  roundedAdd,
  roundedMultiply,
  roundedPoint,
  roundedSubtract,
  type RoundedInterval,
} from '../../numeric/directed-rounding';
import type { PtxEnclosure, PtxPlaneFunction, PtxRealFunction } from './solver-port';

// Proofs that a point found numerically is really there (PTX-ENGINE1, gate E4).
// The Krawczyk test: take a box X around the estimate c and one interval
// Newton step K = c − Y·F(c) + (I − Y·F′(X))·(X − c). If K lands strictly
// inside X, X holds exactly one zero (and it lies in K). Where a function has
// no usable slope range, a sign change between the ends of an interval on
// which it is continuous still proves a zero exists there. Every quantity is
// a guaranteed enclosure, rounded outward.

export type PtxProof = { lo: number; hi: number; unique: boolean };
export type PtxPlaneProof = { x: RoundedInterval; y: RoundedInterval; unique: boolean };

const usable = (enclosure: PtxEnclosure) => enclosure.defined === 2 && enclosure.continuous && Number.isFinite(enclosure.lo) && Number.isFinite(enclosure.hi);
const strictlyInside = (inner: RoundedInterval, outer: RoundedInterval) => inner.lo > outer.lo && inner.hi < outer.hi;
const radii = (radius: number, x: number) => [radius, 16 * radius, 256 * radius].map((r) => Math.max(r, 4 * Number.EPSILON * (1 + Math.abs(x))));

/** Proof that f has a zero near x: unique (Krawczyk) or at least one (a sign change on a continuous interval). */
export function ptxProveRealZero(f: PtxRealFunction, x: number, radius: number): PtxProof | null {
  const enclose = f.enclose;
  if (!enclose) return null;
  for (const r of radii(radius, x)) {
    const box = { lo: nextDown(x - r), hi: nextUp(x + r) };
    const over = enclose(box.lo, box.hi);
    if (!usable(over.value)) continue;
    const slopeAtCentre = f.derivative?.(x);
    if (over.value.smooth && usable(over.slope) && slopeAtCentre !== undefined && slopeAtCentre !== 0) {
      const y = roundedPoint(1 / slopeAtCentre);
      const atCentre = enclose(x, x).value;
      if (usable(atCentre)) {
        const shifted = roundedSubtract(roundedPoint(x), roundedMultiply(y, atCentre));
        const factor = roundedSubtract(roundedPoint(1), roundedMultiply(y, over.slope));
        const krawczyk = roundedAdd(shifted, roundedMultiply(factor, roundedSubtract(box, roundedPoint(x))));
        if (strictlyInside(krawczyk, box)) return { lo: krawczyk.lo, hi: krawczyk.hi, unique: true };
      }
    }
    const left = enclose(box.lo, box.lo).value; const right = enclose(box.hi, box.hi).value;
    if (usable(left) && usable(right) && ((left.hi < 0 && right.lo > 0) || (left.lo > 0 && right.hi < 0))) {
      return { ...box, unique: false };
    }
  }
  return null;
}

/**
 * Proof that f has a local minimum or maximum near x: its slope changes sign
 * (− to + or + to −) across an interval on which f is continuously differentiable.
 */
export function ptxProveRealExtremum(f: PtxRealFunction, x: number, radius: number, kind: 'minimum' | 'maximum'): PtxProof | null {
  const enclose = f.enclose;
  if (!enclose) return null;
  const sign = kind === 'minimum' ? 1 : -1;
  for (const r of radii(radius, x)) {
    const box = { lo: nextDown(x - r), hi: nextUp(x + r) };
    const over = enclose(box.lo, box.hi);
    if (!usable(over.value) || !over.value.smooth || !usable(over.slope)) continue;
    const left = enclose(box.lo, box.lo).slope; const right = enclose(box.hi, box.hi).slope;
    if (usable(left) && usable(right) && sign * left.hi < 0 && sign * right.lo > 0) return { ...box, unique: false };
  }
  return null;
}

/**
 * Proof that F = G = 0 has a solution near (x, y): the 2-D Krawczyk test with
 * Y the inverse of the Jacobian at the centre and guaranteed Jacobian ranges
 * over the box.
 */
export function ptxProvePlaneZero(F: PtxPlaneFunction, G: PtxPlaneFunction, x: number, y: number, radius: number): PtxPlaneProof | null {
  if (!F.enclose || !G.enclose || !F.gradient || !G.gradient) return null;
  const jf = F.gradient(x, y); const jg = G.gradient(x, y);
  if (!jf || !jg) return null;
  const determinant = jf.fx * jg.fy - jf.fy * jg.fx;
  if (!Number.isFinite(determinant) || determinant === 0) return null;
  // Y ≈ J(c)⁻¹; any matrix works for the proof, a good one makes it succeed.
  const Y = [[jg.fy / determinant, -jf.fy / determinant], [-jg.fx / determinant, jf.fx / determinant]] as const;
  for (const r of radii(radius, Math.hypot(x, y))) {
    const bx = { lo: nextDown(x - r), hi: nextUp(x + r) }; const by = { lo: nextDown(y - r), hi: nextUp(y + r) };
    const box = { xMin: bx.lo, xMax: bx.hi, yMin: by.lo, yMax: by.hi };
    const overF = F.enclose(box); const overG = G.enclose(box);
    const centre = { xMin: x, xMax: x, yMin: y, yMax: y };
    const atF = F.enclose(centre).value; const atG = G.enclose(centre).value;
    if (![overF.value, overG.value, overF.fx, overF.fy, overG.fx, overG.fy, atF, atG].every(usable) || !overF.value.smooth || !overG.value.smooth) continue;
    const p = (value: number) => roundedPoint(value);
    // Y·F(c)
    const yf0 = roundedAdd(roundedMultiply(p(Y[0][0]), atF), roundedMultiply(p(Y[0][1]), atG));
    const yf1 = roundedAdd(roundedMultiply(p(Y[1][0]), atF), roundedMultiply(p(Y[1][1]), atG));
    // M = I − Y·J(X)
    const m = (row: 0 | 1, column: 'fx' | 'fy', identity: number) => roundedSubtract(p(identity),
      roundedAdd(roundedMultiply(p(Y[row][0]), overF[column]), roundedMultiply(p(Y[row][1]), overG[column])));
    const dx = roundedSubtract(bx, p(x)); const dy = roundedSubtract(by, p(y));
    const kx = roundedAdd(roundedSubtract(p(x), yf0), roundedAdd(roundedMultiply(m(0, 'fx', 1), dx), roundedMultiply(m(0, 'fy', 0), dy)));
    const ky = roundedAdd(roundedSubtract(p(y), yf1), roundedAdd(roundedMultiply(m(1, 'fx', 0), dx), roundedMultiply(m(1, 'fy', 1), dy)));
    if (strictlyInside(kx, bx) && strictlyInside(ky, by)) return { x: kx, y: ky, unique: true };
  }
  return null;
}

/** Guaranteed-range arithmetic for composing enclosures (a curve's coordinates into another curve's equation). */
function combine(lo: number, hi: number, parts: PtxEnclosure[]): PtxEnclosure {
  return {
    lo, hi,
    defined: Math.min(...parts.map((part) => part.defined)) as PtxEnclosure['defined'],
    continuous: parts.every((part) => part.continuous),
    smooth: parts.every((part) => part.smooth),
  };
}
export function ptxEnclosureSum(a: PtxEnclosure, b: PtxEnclosure, sign: 1 | -1 = 1): PtxEnclosure {
  const r = sign === 1 ? roundedAdd(a, b) : roundedSubtract(a, b);
  return combine(r.lo, r.hi, [a, b]);
}
export function ptxEnclosureProduct(a: PtxEnclosure, b: PtxEnclosure): PtxEnclosure {
  const r = roundedMultiply(a, b);
  return combine(r.lo, r.hi, [a, b]);
}
export const ptxExactEnclosure = (lo: number, hi = lo): PtxEnclosure => ({ lo, hi, defined: 2, continuous: true, smooth: true });
