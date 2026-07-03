import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import {
  buildAlgebraicGenus1SecondKindBoundedSolveAttempt,
  type AlgebraicGenus1SecondKindSolveAttemptOptions,
} from './integration/algebraic-genus1/second-kind-bounded-solve-attempt';

const ce = new ComputeEngine();

function attempt(
  latex: string,
  variable = 'x',
  options: AlgebraicGenus1SecondKindSolveAttemptOptions = {},
) {
  return buildAlgebraicGenus1SecondKindBoundedSolveAttempt(
    ce.parse(latex).json,
    variable,
    options,
  );
}

function success(
  latex: string,
  variable = 'x',
  options: AlgebraicGenus1SecondKindSolveAttemptOptions = {},
) {
  const result = attempt(latex, variable, options);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`expected bounded second-kind solve attempt for ${latex}: ${result.detail}`);
  }
  return result;
}

function text(result: ReturnType<typeof success>) {
  return [
    result.status,
    result.rootChartKind,
    result.stopReason,
    result.stopDetail,
    result.pivotTrace.map((pivot) => `${pivot.unknownSymbol}:${pivot.acceptedFactLatex}`).join('\n'),
    ...result.acceptedPivotFacts,
    ...result.readinessNotes,
    ...result.proofObligations,
    ...result.detailSections.flatMap((section) => [
      section.title,
      ...section.lines,
      ...((section as { lineParts?: unknown[][] }).lineParts ?? [])
        .flat()
        .map(String),
    ]),
  ].join('\n');
}

describe('algebraic genus-1 second-kind bounded solve attempt', () => {
  it('turns three-real-root raw radical solving into a controlled coefficient-growth stop', () => {
    const result = success('\\sqrt{x^3-x}');

    expect(result.status).toBe('bounded-solve-attempt-controlled-stop');
    expect(result.rootChartKind).toBe('cubic-three-real-roots');
    expect(result.matrixShape).toEqual({ rows: 8, columns: 6 });
    expect(result.stopReason).toBe('coefficient-growth-cap');
    expect(result.pivotTrace.length).toBe(1);
    expect(result.pivotTrace[0].unknownSymbol).toBe('C_F');
    expect(result.acceptedPivotFacts.length).toBe(1);
    expect(result.operationCount).toBeGreaterThan(0);
    expect(result.maxObservedCoefficientNodeCount).toBeLessThanOrEqual(result.limits.maxCoefficientNodeCount);
    expect(result.canSolveDirectly).toBe(false);
    expect(result.canBackcheckAntiderivative).toBe(false);
    expect(result.canAdoptLive).toBe(false);
    expect(text(result)).toContain('controlled');
    expect(text(result)).toContain('live dispatch');
    expect(text(result)).not.toMatch(/RootOf|rootof|mathtip\\{\\error/i);
  });

  it('records the complex-pair pivot boundary without guessing missing coefficients', () => {
    const result = success('\\sqrt{x^3+x+1}');

    expect(result.status).toBe('bounded-solve-attempt-controlled-stop');
    expect(result.rootChartKind).toBe('cubic-one-real-root-complex-pair');
    expect(result.matrixShape).toEqual({ rows: 7, columns: 7 });
    expect(result.stopReason).toBe('pivot-candidate-missing');
    expect(result.pivotTrace.length).toBe(3);
    expect(result.pivotTrace.map((pivot) => pivot.unknownSymbol)).toEqual([
      'C_F',
      'C_E',
      'C_Pi_p',
    ]);
    expect(result.acceptedPivotFacts.length).toBe(3);
    expect(text(result)).toContain('No nonzero pivot remained');
    expect(text(result)).not.toContain('s_0:');
  });

  it('honors an explicit operation cap before coefficient growth can run away', () => {
    const result = success('\\sqrt{x^3-x}', 'x', { maxOperations: 1 });

    expect(result.stopReason).toBe('operation-cap');
    expect(result.operationCount).toBe(1);
    expect(result.pivotTrace.length).toBe(1);
    expect(text(result)).toContain('operation cap');
  });

  it('stops unsupported rational-in-radical inputs at the populated matrix boundary', () => {
    expect(attempt('\\frac{x+1}{\\sqrt{x^3-x}}')).toMatchObject({
      kind: 'stop',
      reason: 'populated-matrix-stop',
    });
  });
});
