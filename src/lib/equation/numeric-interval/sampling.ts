import type { AngleUnit } from '../../../types/calculator';
import { evaluateLatexAt, evaluateLatexAtTarget } from '../domain-guards';
import {
  BISECTION_TOLERANCE,
  GOLDEN_SECTION_ITERATIONS,
  SAMPLE_ZERO_TOLERANCE,
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

type EvaluatedCandidate = { x: number; value: number };

function signChanged(left: number, right: number): boolean {
  return left === 0 || right === 0 || left * right < 0;
}

function isInsideOpenInterval(value: number, left: number, right: number): boolean {
  const lo = Math.min(left, right);
  const hi = Math.max(left, right);
  return Number.isFinite(value) && value > lo && value < hi;
}

function inverseQuadraticCandidate(
  a: number,
  fa: number,
  b: number,
  fb: number,
  c: number,
  fc: number,
): number | null {
  if (fa === fb || fa === fc || fb === fc) {
    return null;
  }

  return (
    (a * fb * fc) / ((fa - fb) * (fa - fc))
    + (b * fa * fc) / ((fb - fa) * (fb - fc))
    + (c * fa * fb) / ((fc - fa) * (fc - fb))
  );
}

function secantCandidate(a: number, fa: number, b: number, fb: number): number | null {
  if (fa === fb) {
    return null;
  }
  return b - (fb * (b - a)) / (fb - fa);
}

function fallbackMidpointCandidate(
  zeroFormLatex: string,
  target: string,
  left: number,
  right: number,
  angleUnit: AngleUnit,
  evaluator?: NumericValueEvaluator,
): EvaluatedCandidate | null {
  const midpoint = (left + right) / 2;
  const midpointValue = evaluateFiniteValue(zeroFormLatex, target, midpoint, angleUnit, evaluator);
  return midpointValue === null ? null : { x: midpoint, value: midpointValue };
}

function evaluateCandidate(
  zeroFormLatex: string,
  target: string,
  candidate: number,
  left: number,
  right: number,
  angleUnit: AngleUnit,
  evaluator?: NumericValueEvaluator,
): EvaluatedCandidate | null {
  if (!isInsideOpenInterval(candidate, left, right)) {
    return fallbackMidpointCandidate(zeroFormLatex, target, left, right, angleUnit, evaluator);
  }

  const candidateValue = evaluateFiniteValue(zeroFormLatex, target, candidate, angleUnit, evaluator);
  if (candidateValue === null) {
    return fallbackMidpointCandidate(zeroFormLatex, target, left, right, angleUnit, evaluator);
  }

  return { x: candidate, value: candidateValue };
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
  const initialLoValue = evaluateFiniteValue(zeroFormLatex, target, lo, angleUnit, evaluator);
  const initialHiValue = evaluateFiniteValue(zeroFormLatex, target, hi, angleUnit, evaluator);

  if (initialLoValue === null || initialHiValue === null) {
    return null;
  }
  let loValue: number = initialLoValue;
  let hiValue: number = initialHiValue;
  if (Math.abs(loValue) <= BISECTION_TOLERANCE) {
    return lo;
  }
  if (Math.abs(hiValue) <= BISECTION_TOLERANCE) {
    return hi;
  }
  if (!signChanged(loValue, hiValue)) {
    return null;
  }

  let previousX = lo;
  let previousValue = loValue;
  let bestX = Math.abs(loValue) <= Math.abs(hiValue) ? lo : hi;
  let bestValue = Math.abs(loValue) <= Math.abs(hiValue) ? loValue : hiValue;

  for (let iteration = 0; iteration < 96; iteration += 1) {
    const width = Math.abs(hi - lo);
    if (width <= BISECTION_TOLERANCE) {
      return Math.abs(bestValue) <= SAMPLE_ZERO_TOLERANCE ? bestX : null;
    }

    const midpoint = (lo + hi) / 2;
    const interpolation = inverseQuadraticCandidate(
      previousX,
      previousValue,
      lo,
      loValue,
      hi,
      hiValue,
    ) ?? secantCandidate(lo, loValue, hi, hiValue);
    const candidate = interpolation ?? midpoint;
    const evaluated = evaluateCandidate(
      zeroFormLatex,
      target,
      candidate,
      lo,
      hi,
      angleUnit,
      evaluator,
    ) ?? fallbackMidpointCandidate(zeroFormLatex, target, lo, hi, angleUnit, evaluator);

    if (!evaluated) {
      return null;
    }

    if (Math.abs(evaluated.value) < Math.abs(bestValue)) {
      bestX = evaluated.x;
      bestValue = evaluated.value;
    }

    if (Math.abs(evaluated.value) <= BISECTION_TOLERANCE) {
      return evaluated.x;
    }

    previousX = Math.abs(loValue) > Math.abs(hiValue) ? lo : hi;
    previousValue = Math.abs(loValue) > Math.abs(hiValue) ? loValue : hiValue;

    if (signChanged(loValue, evaluated.value)) {
      hi = evaluated.x;
      hiValue = evaluated.value;
    } else {
      lo = evaluated.x;
      loValue = evaluated.value;
    }
  }

  return Math.abs(bestValue) <= SAMPLE_ZERO_TOLERANCE ? bestX : null;
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
