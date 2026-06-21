import type { NumericSolveInterval } from '../../../types/calculator';
import { MIN_SUBDIVISIONS, NUMERIC_METHOD_LABEL, type NumericDiagnostics } from './types';

export function parseInterval(interval: NumericSolveInterval) {
  const start = Number(interval.start);
  const end = Number(interval.end);
  const subdivisions = Number(interval.subdivisions);

  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
    return {
      kind: 'error' as const,
      error: 'Use a numeric interval with Start < End. Numeric Interval Solve searches a local real window, so choose finite bounds with Start smaller than End.',
    };
  }

  if (!Number.isInteger(subdivisions) || subdivisions < MIN_SUBDIVISIONS) {
    return {
      kind: 'error' as const,
      error: `Use at least ${MIN_SUBDIVISIONS} subdivisions for numeric solving. Dense or nested periodic cases may need more subdivisions.`,
    };
  }

  return { kind: 'ok' as const, start, end, subdivisions };
}

export function numericSummary(
  interval: NumericSolveInterval,
  subdivisions: number,
  diagnostics: NumericDiagnostics,
) {
  return `Numeric solve on [${interval.start}, ${interval.end}] with ${subdivisions} subdivisions (${NUMERIC_METHOD_LABEL}; sample hits: ${diagnostics.sampleHitCount}, sign brackets: ${diagnostics.signBracketCount}, local-min seeds: ${diagnostics.localMinSeedCount}, adaptive samples: ${diagnostics.adaptiveSampleCount}, refined cells: ${diagnostics.refinedCellCount}, discontinuity cells: ${diagnostics.discontinuityCellCount}).`;
}
