import type { AngleUnit } from '../../../types/calculator';
import { evaluateLatexAt, evaluateLatexAtTarget } from '../domain-guards';
import {
  BISECTION_TOLERANCE,
  GOLDEN_SECTION_ITERATIONS,
  type SamplePoint,
} from './types';

export type NumericValueEvaluator = (value: number) => number | null;

function evaluateFiniteValue(
  zeroFormLatex: string,
  target: string,
  x: number,
  angleUnit: AngleUnit,
  evaluator?: NumericValueEvaluator,
) {
  if (evaluator) {
    return evaluator(x);
  }
  const evaluated = target === 'x'
    ? evaluateLatexAt(zeroFormLatex, x, angleUnit)
    : evaluateLatexAtTarget(zeroFormLatex, target, x, angleUnit);
  return evaluated.value !== null && Number.isFinite(evaluated.value) ? evaluated.value : null;
}

export function refineBracketRoot(
  zeroFormLatex: string,
  left: number,
  right: number,
  angleUnit: AngleUnit,
  target = 'x',
  evaluator?: NumericValueEvaluator,
) {
  let lo = left;
  let hi = right;
  let loValue = evaluateFiniteValue(zeroFormLatex, target, lo, angleUnit, evaluator);
  let hiValue = evaluateFiniteValue(zeroFormLatex, target, hi, angleUnit, evaluator);

  if (loValue === null || hiValue === null) {
    return null;
  }
  if (Math.abs(loValue) <= BISECTION_TOLERANCE) {
    return lo;
  }
  if (Math.abs(hiValue) <= BISECTION_TOLERANCE) {
    return hi;
  }
  if (loValue * hiValue > 0) {
    return null;
  }

  for (let iteration = 0; iteration < 80; iteration += 1) {
    const secant = hi - (hiValue * (hi - lo)) / (hiValue - loValue);
    const mid = (lo + hi) / 2;
    const candidate = Number.isFinite(secant) && secant > Math.min(lo, hi) && secant < Math.max(lo, hi)
      ? secant
      : mid;
    const candidateValue = evaluateFiniteValue(zeroFormLatex, target, candidate, angleUnit, evaluator);
    if (candidateValue === null) {
      return null;
    }

    if (Math.abs(candidateValue) <= BISECTION_TOLERANCE || Math.abs(hi - lo) <= BISECTION_TOLERANCE) {
      return candidate;
    }

    if (loValue * candidateValue <= 0) {
      hi = candidate;
      hiValue = candidateValue;
    } else {
      lo = candidate;
      loValue = candidateValue;
    }
  }

  return (lo + hi) / 2;
}

export function bisectRoot(
  zeroFormLatex: string,
  left: number,
  right: number,
  angleUnit: AngleUnit,
  target = 'x',
  evaluator?: NumericValueEvaluator,
) {
  return refineBracketRoot(zeroFormLatex, left, right, angleUnit, target, evaluator);
}

export function finiteValue(
  zeroFormLatex: string,
  x: number,
  angleUnit: AngleUnit,
  target = 'x',
  evaluator?: NumericValueEvaluator,
) {
  return evaluateFiniteValue(zeroFormLatex, target, x, angleUnit, evaluator);
}

export function localAbsMinimumCandidate(
  zeroFormLatex: string,
  left: number,
  right: number,
  angleUnit: AngleUnit,
  target = 'x',
  evaluator?: NumericValueEvaluator,
): SamplePoint | null {
  let lo = left;
  let hi = right;
  const phi = (1 + Math.sqrt(5)) / 2;
  const invPhi = 1 / phi;
  const invPhiSq = invPhi * invPhi;

  let x1 = lo + invPhiSq * (hi - lo);
  let x2 = lo + invPhi * (hi - lo);
  let y1Value = finiteValue(zeroFormLatex, x1, angleUnit, target, evaluator);
  let y2Value = finiteValue(zeroFormLatex, x2, angleUnit, target, evaluator);
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
      y1Value = finiteValue(zeroFormLatex, x1, angleUnit, target, evaluator);
      if (y1Value === null) {
        return null;
      }
      y1 = Math.abs(y1Value);
    } else {
      lo = x1;
      x1 = x2;
      y1 = y2;
      x2 = lo + invPhi * (hi - lo);
      y2Value = finiteValue(zeroFormLatex, x2, angleUnit, target, evaluator);
      if (y2Value === null) {
        return null;
      }
      y2 = Math.abs(y2Value);
    }
  }

  const x = (lo + hi) / 2;
  const value = finiteValue(zeroFormLatex, x, angleUnit, target, evaluator);
  if (value === null) {
    return null;
  }

  return { x, value };
}
