import type { AngleUnit, NumericSolveInterval, SolveDomainConstraint } from '../../../types/calculator';
import { buildAbsoluteValueNumericGuidance } from '../../algebra/abs-core';
import { dedupeNumericRoots, validateCandidateRoots } from '../candidate-validation';
import { equationToZeroFormLatex } from '../domain-guards';
import { numericSummary, parseInterval } from './interval';
import { bisectRoot, finiteValue, localAbsMinimumCandidate } from './sampling';
import { buildTrigNoRootGuidance } from './trig-guidance';
import {
  EMPTY_NUMERIC_DIAGNOSTICS,
  LOCAL_MIN_ACCEPT_TOLERANCE,
  LOCAL_MIN_SEED_TOLERANCE,
  NUMERIC_METHOD_LABEL,
  SAMPLE_ZERO_TOLERANCE,
  type NumericDiagnostics,
  type NumericIntervalSolveResult,
  type SamplePoint,
} from './types';

export type { NumericIntervalSolveResult } from './types';

function isNearAny(value: number, pool: number[], tolerance = 1e-6) {
  return pool.some((candidate) => Math.abs(candidate - value) <= tolerance);
}

export function runNumericIntervalSolve(
  equationLatex: string,
  interval: NumericSolveInterval,
  constraints: SolveDomainConstraint[] = [],
  angleUnit: AngleUnit = 'rad',
): NumericIntervalSolveResult {
  const parsed = parseInterval(interval);

  if (parsed.kind === 'error') {
    return {
      kind: 'error',
      error: parsed.error,
      summaryText: `Numeric solve unavailable (${NUMERIC_METHOD_LABEL}).`,
      method: NUMERIC_METHOD_LABEL,
      diagnostics: EMPTY_NUMERIC_DIAGNOSTICS,
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
    const value = finiteValue(zeroFormLatex, x, angleUnit);
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
      const root = bisectRoot(zeroFormLatex, previousFinite.x, x, angleUnit);
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

    const localCandidate = localAbsMinimumCandidate(zeroFormLatex, left.x, right.x, angleUnit);
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

  const validated = validateCandidateRoots(equationLatex, allCandidates, constraints, 'numeric-interval', angleUnit);
  const recoveredCandidateCount = validated.accepted.filter((value) =>
    isNearAny(value, localMinSeeds) && !isNearAny(value, [...sampleHits, ...signBracketRoots])).length;

  const diagnostics: NumericDiagnostics = {
    sampleHitCount: sampleHits.length,
    signBracketCount: signBracketRoots.length,
    localMinSeedCount: localMinSeeds.length,
    recoveredCandidateCount,
  };

  const summary = numericSummary(interval, parsed.subdivisions, diagnostics);

  if (validated.accepted.length === 0) {
    const noSeededCandidates = allCandidates.length === 0;
    const guidance = 'This is a local interval search, not a proof that no roots exist elsewhere. Try a suggested interval from exact output when available, widen or shift the interval, or increase subdivisions for dense or nested periodic cases.';
    const rejectedGuidance = 'Discontinuities, domain holes, or residual validation can reject numeric candidates; try a suggested interval, shift the interval away from a discontinuity, or increase subdivisions.';
    const trigGuidance = noSeededCandidates
      ? buildTrigNoRootGuidance(equationLatex, parsed.start, parsed.end, parsed.subdivisions, angleUnit)
      : null;
    const absGuidance = noSeededCandidates
      ? buildAbsoluteValueNumericGuidance(
        equationLatex,
        parsed.start,
        parsed.end,
        parsed.subdivisions,
        angleUnit,
      )
      : null;
    return {
      kind: 'error',
      error: noSeededCandidates
        ? `No bracketed or near-zero real roots were found on the chosen interval. ${guidance}${trigGuidance ? ` ${trigGuidance}` : ''}${absGuidance ? ` ${absGuidance}` : ''}`
        : `Candidate roots were found but rejected after substitution back into the original equation. ${rejectedGuidance}`,
      rejectedCandidateCount: validated.rejected.length,
      summaryText: summary,
      method: NUMERIC_METHOD_LABEL,
      diagnostics,
    };
  }

  const accepted = dedupeNumericRoots(validated.accepted);
  return {
    kind: 'success',
    roots: accepted,
    rejectedCandidateCount: validated.rejected.length,
    summaryText: `${summary} Accepted ${accepted.length} root(s)${validated.rejected.length > 0 ? `, rejected ${validated.rejected.length}.` : '.'}${recoveredCandidateCount > 0 ? ` Recovered ${recoveredCandidateCount} non-bracket root(s).` : ''}`,
    method: NUMERIC_METHOD_LABEL,
    diagnostics,
  };
}
