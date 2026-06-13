import type { AngleUnit } from '../../../types/calculator';
import { evaluateLatexAt } from '../domain-guards';
import {
  BISECTION_TOLERANCE,
  GOLDEN_SECTION_ITERATIONS,
  type SamplePoint,
} from './types';

export function bisectRoot(zeroFormLatex: string, left: number, right: number, angleUnit: AngleUnit) {
  let lo = left;
  let hi = right;
  let loValue = evaluateLatexAt(zeroFormLatex, lo, angleUnit).value;
  let hiValue = evaluateLatexAt(zeroFormLatex, hi, angleUnit).value;

  if (loValue === null || hiValue === null) {
    return null;
  }

  for (let iteration = 0; iteration < 80; iteration += 1) {
    const mid = (lo + hi) / 2;
    const midValue = evaluateLatexAt(zeroFormLatex, mid, angleUnit).value;
    if (midValue === null) {
      return null;
    }

    if (Math.abs(midValue) <= BISECTION_TOLERANCE || Math.abs(hi - lo) <= BISECTION_TOLERANCE) {
      return mid;
    }

    if (loValue * midValue <= 0) {
      hi = mid;
      hiValue = midValue;
    } else {
      lo = mid;
      loValue = midValue;
    }
  }

  return (lo + hi) / 2;
}

export function finiteValue(zeroFormLatex: string, x: number, angleUnit: AngleUnit) {
  const value = evaluateLatexAt(zeroFormLatex, x, angleUnit).value;
  return value !== null && Number.isFinite(value) ? value : null;
}

export function localAbsMinimumCandidate(
  zeroFormLatex: string,
  left: number,
  right: number,
  angleUnit: AngleUnit,
): SamplePoint | null {
  let lo = left;
  let hi = right;
  const phi = (1 + Math.sqrt(5)) / 2;
  const invPhi = 1 / phi;
  const invPhiSq = invPhi * invPhi;

  let x1 = lo + invPhiSq * (hi - lo);
  let x2 = lo + invPhi * (hi - lo);
  let y1Value = finiteValue(zeroFormLatex, x1, angleUnit);
  let y2Value = finiteValue(zeroFormLatex, x2, angleUnit);
  if (y1Value === null || y2Value === null) {
    return null;
  }

  let y1 = Math.abs(y1Value);
  let y2 = Math.abs(y2Value);

  for (let iteration = 0; iteration < GOLDEN_SECTION_ITERATIONS; iteration += 1) {
    if (y1 <= y2) {
      hi = x2;
      x2 = x1;
      y2 = y1;
      x1 = lo + invPhiSq * (hi - lo);
      y1Value = finiteValue(zeroFormLatex, x1, angleUnit);
      if (y1Value === null) {
        return null;
      }
      y1 = Math.abs(y1Value);
    } else {
      lo = x1;
      x1 = x2;
      y1 = y2;
      x2 = lo + invPhi * (hi - lo);
      y2Value = finiteValue(zeroFormLatex, x2, angleUnit);
      if (y2Value === null) {
        return null;
      }
      y2 = Math.abs(y2Value);
    }
  }

  const x = (lo + hi) / 2;
  const value = finiteValue(zeroFormLatex, x, angleUnit);
  if (value === null) {
    return null;
  }

  return { x, value };
}
