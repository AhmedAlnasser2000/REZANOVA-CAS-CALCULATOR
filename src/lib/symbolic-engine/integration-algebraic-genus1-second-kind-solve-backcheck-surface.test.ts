import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import {
  buildAlgebraicGenus1SecondKindSolveBackcheckSurface,
} from './integration/algebraic-genus1/second-kind-solve-backcheck-surface';

const ce = new ComputeEngine();

function surface(latex: string, variable = 'x') {
  return buildAlgebraicGenus1SecondKindSolveBackcheckSurface(
    ce.parse(latex).json,
    variable,
  );
}

function success(latex: string, variable = 'x') {
  const result = surface(latex, variable);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`expected second-kind solve backcheck surface for ${latex}: ${result.detail}`);
  }
  return result;
}

function text(result: ReturnType<typeof success>) {
  return [
    result.status,
    result.rootChartKind,
    result.solveStrategy,
    result.pivotCandidates.map((pivot) => pivot.unknownSymbol).join(','),
    result.pivotCandidates.map((pivot) => pivot.requiredFactLatex).join('\n'),
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

describe('algebraic genus-1 second-kind solve backcheck surface', () => {
  it('records pivot candidates for three-real-root raw radicals', () => {
    const result = success('\\sqrt{x^3-x}');

    expect(result.status).toBe('solve-backcheck-surface-ready');
    expect(result.rootChartKind).toBe('cubic-three-real-roots');
    expect(result.matrixShape).toEqual({ rows: 8, columns: 6 });
    expect(result.pivotCandidates.length).toBe(6);
    expect(result.rowResidualNodes.length).toBe(8);
    expect(result.canAttemptSolve).toBe(true);
    expect(result.canSolveDirectly).toBe(false);
    expect(result.canBackcheckAntiderivative).toBe(false);
    expect(result.canAdoptLive).toBe(false);
    expect(text(result)).toContain('bounded-symbolic-gaussian-elimination');
    expect(text(result)).toContain('pivot candidates');
    expect(text(result)).toContain('C_Pi_p');
    expect(text(result)).not.toMatch(/RootOf|rootof|mathtip\\{\\error/i);
  });

  it('records pivot candidates for one-real-root complex-pair raw radicals', () => {
    const result = success('\\sqrt{x^3+x+1}');

    expect(result.rootChartKind).toBe('cubic-one-real-root-complex-pair');
    expect(result.matrixShape).toEqual({ rows: 7, columns: 7 });
    expect(result.pivotCandidates.length).toBe(7);
    expect(text(result)).toContain('pivot candidates');
    expect(text(result)).toContain('s_3');
  });

  it('threads selected variables through solve backcheck evidence', () => {
    const result = success('\\sqrt{t^3-t}', 't');

    expect(result.variable).toBe('t');
    expect(result.rowEquationNodes.length).toBe(8);
    expect(text(result)).not.toContain('"t"');
  });

  it('stops rational-in-radical cases before solve backcheck evidence', () => {
    expect(surface('\\frac{x+1}{\\sqrt{x^3-x}}')).toMatchObject({
      kind: 'stop',
      reason: 'populated-matrix-stop',
    });
  });
});
