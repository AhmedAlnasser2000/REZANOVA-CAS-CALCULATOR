import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { resolveSymbolicIntegralFromLatex } from './integration';
import { buildAlgebraicGenus1SecondKindCoefficientMatrix } from './integration/algebraic-genus1/second-kind-coefficient-matrix';

const ce = new ComputeEngine();

function matrix(latex: string, variable = 'x') {
  return buildAlgebraicGenus1SecondKindCoefficientMatrix(
    ce.parse(latex).json,
    variable,
  );
}

function success(latex: string, variable = 'x') {
  const result = matrix(latex, variable);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`expected second-kind coefficient matrix for ${latex}`);
  }
  return result;
}

function text(result: ReturnType<typeof success>) {
  return [
    result.status,
    result.rootChartKind,
    result.coefficientFieldLatex,
    result.chartVariableLatex,
    result.unknownVectorLatex,
    result.rightHandSideLatex,
    result.matrixEquationLatex,
    ...result.rowLabelsLatex,
    ...result.unknowns.flatMap((unknown) => [
      unknown.symbolLatex,
      unknown.block,
      unknown.role,
    ]),
    ...result.proofObligations,
    ...result.readinessNotes,
    ...result.detailSections.flatMap((section) => [
      section.title,
      ...section.lines,
      ...((section as { lineParts?: unknown[][] }).lineParts ?? [])
        .flat()
        .map(String),
    ]),
  ].join('\n');
}

describe('algebraic genus-1 second-kind coefficient matrix readiness', () => {
  it('lowers three-real-root raw radicals to bounded matrix evidence', () => {
    const result = success('\\sqrt{x^3-x}');

    expect(result.status).toBe('coefficient-matrix-ready');
    expect(result.canAdoptLive).toBe(false);
    expect(result.canSolveDirectly).toBe(false);
    expect(result.rootChartKind).toBe('cubic-three-real-roots');
    expect(result.rowLabelsLatex).toContain('z^{0}');
    expect(result.rowLabelsLatex).toContain('z^{5}');
    expect(result.matrixShape).toEqual({ rows: 6, columns: 6 });
    expect(result.unknowns.some((unknown) => unknown.symbolLatex === 'C_E')).toBe(true);
    expect(result.unknowns.some((unknown) => unknown.symbolLatex === 's_2')).toBe(true);
    expect(text(result)).toContain('linear-system shape');
    expect(text(result)).not.toMatch(/RootOf|rootof/i);
  });

  it('lowers one-real-root complex-pair raw radicals with the tan-half-angle chart', () => {
    const result = success('\\sqrt{x^3+x+1}');

    expect(result.rootChartKind).toBe('cubic-one-real-root-complex-pair');
    expect(result.chartVariableLatex).toContain('\\tan^2');
    expect(result.rowLabelsLatex).toContain('z^{6}');
    expect(result.matrixShape).toEqual({ rows: 7, columns: 7 });
    expect(result.rightHandSideLatex).toContain('A_{\\alpha_{1}}');
    expect(text(result)).toContain('\\beta_{\\alpha_{1}}');
  });

  it('threads selected variables through matrix readiness', () => {
    const result = success('\\sqrt{t^3-t}', 't');

    expect(result.variable).toBe('t');
    expect(result.matrixEquationLatex).toContain('cubic-three-real-roots');
    expect(text(result)).toContain('t>\\alpha_{3}');
  });

  it('does not make raw radicals live before matrix population and solving', () => {
    expect(matrix('\\frac{1}{\\sqrt{x^3-x}}')).toMatchObject({
      kind: 'stop',
      reason: 'identity-system-stop',
    });

    const live = resolveSymbolicIntegralFromLatex('\\sqrt{x^3-x}');
    expect(live.kind).toBe('error');
    if (live.kind === 'error') {
      expect(live.error).toContain('elliptic/genus-1 analysis');
    }
  });
});
