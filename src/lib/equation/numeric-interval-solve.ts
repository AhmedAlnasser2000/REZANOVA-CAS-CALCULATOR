import type { NumericSolveInterval, SolveDomainConstraint } from '../../types/calculator';
import { evaluateLatexAt, equationToZeroFormLatex } from './domain-guards';
import { validateCandidateRoots } from './candidate-validation';

const SAMPLE_ZERO_TOLERANCE = 1e-7;
const BISECTION_TOLERANCE = 1e-10;
const MIN_SUBDIVISIONS = 8;

export type NumericIntervalSolveResult =
  | {
      kind: 'success';
      roots: number[];
      rejectedCandidateCount: number;
      summaryText: string;
    }
  | {
      kind: 'error';
      error: string;
      rejectedCandidateCount?: number;
    };

function parseInterval(interval: NumericSolveInterval) {
  const start = Number(interval.start);
  const end = Number(interval.end);
  const subdivisions = Number(interval.subdivisions);

  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
    return { kind: 'error' as const, error: 'Use a numeric interval with Start < End.' };
  }

  if (!Number.isInteger(subdivisions) || subdivisions < MIN_SUBDIVISIONS) {
    return { kind: 'error' as const, error: `Use at least ${MIN_SUBDIVISIONS} subdivisions for numeric solving.` };
  }

  return { kind: 'ok' as const, start, end, subdivisions };
}

function bisectRoot(zeroFormLatex: string, left: number, right: number) {
  let lo = left;
  let hi = right;
  let loValue = evaluateLatexAt(zeroFormLatex, lo).value;
  let hiValue = evaluateLatexAt(zeroFormLatex, hi).value;

  if (loValue === null || hiValue === null) {
    return null;
  }

  for (let iteration = 0; iteration < 80; iteration += 1) {
    const mid = (lo + hi) / 2;
    const midValue = evaluateLatexAt(zeroFormLatex, mid).value;
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

export function runNumericIntervalSolve(
  equationLatex: string,
  interval: NumericSolveInterval,
  constraints: SolveDomainConstraint[] = [],
): NumericIntervalSolveResult {
  const parsed = parseInterval(interval);
  if (parsed.kind === 'error') {
    return parsed;
  }

  const zeroFormLatex = equationToZeroFormLatex(equationLatex);
  const step = (parsed.end - parsed.start) / parsed.subdivisions;
  const candidates: number[] = [];
  let previousX = parsed.start;
  let previousValue = evaluateLatexAt(zeroFormLatex, previousX).value;

  if (previousValue !== null && Math.abs(previousValue) <= SAMPLE_ZERO_TOLERANCE) {
    candidates.push(previousX);
  }

  for (let index = 1; index <= parsed.subdivisions; index += 1) {
    const x = parsed.start + step * index;
    const currentValue = evaluateLatexAt(zeroFormLatex, x).value;

    if (currentValue !== null && Math.abs(currentValue) <= SAMPLE_ZERO_TOLERANCE) {
      candidates.push(x);
    }

    if (
      previousValue !== null
      && currentValue !== null
      && Number.isFinite(previousValue)
      && Number.isFinite(currentValue)
      && previousValue * currentValue < 0
    ) {
      const root = bisectRoot(zeroFormLatex, previousX, x);
      if (root !== null) {
        candidates.push(root);
      }
    }

    previousX = x;
    previousValue = currentValue;
  }

  const validation = validateCandidateRoots(equationLatex, candidates, constraints, 'numeric-interval');
  if (validation.accepted.length === 0) {
    return {
      kind: 'error',
      error: 'No bracketed real roots were found on the chosen interval. Try a narrower interval or a higher subdivision count.',
      rejectedCandidateCount: validation.rejected.length,
    };
  }

  return {
    kind: 'success',
    roots: validation.accepted,
    rejectedCandidateCount: validation.rejected.length,
    summaryText: `Numeric roots on [${interval.start}, ${interval.end}] with ${parsed.subdivisions} subdivisions`,
  };
}
