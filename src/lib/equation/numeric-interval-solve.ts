import type { NumericSolveInterval, SolveDomainConstraint } from '../../types/calculator';
import { dedupeNumericRoots, validateCandidateRoots } from './candidate-validation';
import { evaluateLatexAt, equationToZeroFormLatex } from './domain-guards';

const SAMPLE_ZERO_TOLERANCE = 1e-7;
const BISECTION_TOLERANCE = 1e-10;
const LOCAL_MIN_SEED_TOLERANCE = 0.15;
const LOCAL_MIN_ACCEPT_TOLERANCE = 1e-6;
const GOLDEN_SECTION_ITERATIONS = 48;
const MIN_SUBDIVISIONS = 8;
const NUMERIC_METHOD_LABEL = 'Bracket-first bisection + local-minimum recovery';

type SamplePoint = {
  x: number;
  value: number;
};

type NumericDiagnostics = {
  sampleHitCount: number;
  signBracketCount: number;
  localMinSeedCount: number;
  recoveredCandidateCount: number;
};

export type NumericIntervalSolveResult =
  | {
      kind: 'success';
      roots: number[];
      rejectedCandidateCount: number;
      summaryText: string;
      method: typeof NUMERIC_METHOD_LABEL;
      diagnostics: NumericDiagnostics;
    }
  | {
      kind: 'error';
      error: string;
      rejectedCandidateCount?: number;
      summaryText: string;
      method: typeof NUMERIC_METHOD_LABEL;
      diagnostics: NumericDiagnostics;
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

function finiteValue(zeroFormLatex: string, x: number) {
  const value = evaluateLatexAt(zeroFormLatex, x).value;
  return value !== null && Number.isFinite(value) ? value : null;
}

function localAbsMinimumCandidate(
  zeroFormLatex: string,
  left: number,
  right: number,
): SamplePoint | null {
  let lo = left;
  let hi = right;
  const phi = (1 + Math.sqrt(5)) / 2;
  const invPhi = 1 / phi;
  const invPhiSq = invPhi * invPhi;

  let x1 = lo + invPhiSq * (hi - lo);
  let x2 = lo + invPhi * (hi - lo);
  let y1Value = finiteValue(zeroFormLatex, x1);
  let y2Value = finiteValue(zeroFormLatex, x2);
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
      y1Value = finiteValue(zeroFormLatex, x1);
      if (y1Value === null) {
        return null;
      }
      y1 = Math.abs(y1Value);
    } else {
      lo = x1;
      x1 = x2;
      y1 = y2;
      x2 = lo + invPhi * (hi - lo);
      y2Value = finiteValue(zeroFormLatex, x2);
      if (y2Value === null) {
        return null;
      }
      y2 = Math.abs(y2Value);
    }
  }

  const x = (lo + hi) / 2;
  const value = finiteValue(zeroFormLatex, x);
  if (value === null) {
    return null;
  }

  return { x, value };
}

function numericSummary(
  interval: NumericSolveInterval,
  subdivisions: number,
  diagnostics: NumericDiagnostics,
) {
  return `Numeric solve on [${interval.start}, ${interval.end}] with ${subdivisions} subdivisions (${NUMERIC_METHOD_LABEL}; sample hits: ${diagnostics.sampleHitCount}, sign brackets: ${diagnostics.signBracketCount}, local-min seeds: ${diagnostics.localMinSeedCount}).`;
}

function isNearAny(value: number, pool: number[], tolerance = 1e-6) {
  return pool.some((candidate) => Math.abs(candidate - value) <= tolerance);
}

export function runNumericIntervalSolve(
  equationLatex: string,
  interval: NumericSolveInterval,
  constraints: SolveDomainConstraint[] = [],
): NumericIntervalSolveResult {
  const parsed = parseInterval(interval);
  const emptyDiagnostics: NumericDiagnostics = {
    sampleHitCount: 0,
    signBracketCount: 0,
    localMinSeedCount: 0,
    recoveredCandidateCount: 0,
  };

  if (parsed.kind === 'error') {
    return {
      kind: 'error',
      error: parsed.error,
      summaryText: `Numeric solve unavailable (${NUMERIC_METHOD_LABEL}).`,
      method: NUMERIC_METHOD_LABEL,
      diagnostics: emptyDiagnostics,
    };
  }

  const zeroFormLatex = equationToZeroFormLatex(equationLatex);
  const step = (parsed.end - parsed.start) / parsed.subdivisions;
  const samples: SamplePoint[] = [];
  const sampleHits: number[] = [];
  const signBracketRoots: number[] = [];
  const localMinSeeds: number[] = [];
  let previousFinite: SamplePoint | null = null;

  for (let index = 0; index <= parsed.subdivisions; index += 1) {
    const x = parsed.start + step * index;
    const value = finiteValue(zeroFormLatex, x);
    if (value === null) {
      previousFinite = null;
      continue;
    }

    const sample = { x, value };
    samples.push(sample);

    if (Math.abs(value) <= SAMPLE_ZERO_TOLERANCE) {
      sampleHits.push(x);
    }

    if (previousFinite && previousFinite.value * value < 0) {
      const root = bisectRoot(zeroFormLatex, previousFinite.x, x);
      if (root !== null) {
        signBracketRoots.push(root);
      }
    }

    previousFinite = sample;
  }

  for (let index = 1; index < samples.length - 1; index += 1) {
    const left = samples[index - 1];
    const middle = samples[index];
    const right = samples[index + 1];
    const leftAbs = Math.abs(left.value);
    const middleAbs = Math.abs(middle.value);
    const rightAbs = Math.abs(right.value);

    if (middleAbs > LOCAL_MIN_SEED_TOLERANCE) {
      continue;
    }
    if (!(middleAbs <= leftAbs && middleAbs <= rightAbs)) {
      continue;
    }

    const localCandidate = localAbsMinimumCandidate(zeroFormLatex, left.x, right.x);
    if (!localCandidate) {
      continue;
    }
    if (Math.abs(localCandidate.value) <= LOCAL_MIN_ACCEPT_TOLERANCE) {
      localMinSeeds.push(localCandidate.x);
    }
  }

  const allCandidates = dedupeNumericRoots([
    ...sampleHits,
    ...signBracketRoots,
    ...localMinSeeds,
  ]);

  const validation = validateCandidateRoots(equationLatex, allCandidates, constraints, 'numeric-interval');
  const recoveredCandidateCount = validation.accepted.filter((value) =>
    isNearAny(value, localMinSeeds) && !isNearAny(value, [...sampleHits, ...signBracketRoots])).length;

  const diagnostics: NumericDiagnostics = {
    sampleHitCount: sampleHits.length,
    signBracketCount: signBracketRoots.length,
    localMinSeedCount: localMinSeeds.length,
    recoveredCandidateCount,
  };

  const summary = numericSummary(interval, parsed.subdivisions, diagnostics);

  if (validation.accepted.length === 0) {
    const noSeededCandidates = allCandidates.length === 0;
    const guidance = 'Try widening the interval, shifting the interval center, or increasing subdivisions.';
    return {
      kind: 'error',
      error: noSeededCandidates
        ? `No bracketed or near-zero real roots were found on the chosen interval. ${guidance}`
        : `Candidate roots were found but rejected after substitution back into the original equation. ${guidance}`,
      rejectedCandidateCount: validation.rejected.length,
      summaryText: summary,
      method: NUMERIC_METHOD_LABEL,
      diagnostics,
    };
  }

  const accepted = dedupeNumericRoots(validation.accepted);
  return {
    kind: 'success',
    roots: accepted,
    rejectedCandidateCount: validation.rejected.length,
    summaryText: `${summary} Accepted ${accepted.length} root(s)${validation.rejected.length > 0 ? `, rejected ${validation.rejected.length}.` : '.'}${recoveredCandidateCount > 0 ? ` Recovered ${recoveredCandidateCount} non-bracket root(s).` : ''}`,
    method: NUMERIC_METHOD_LABEL,
    diagnostics,
  };
}
