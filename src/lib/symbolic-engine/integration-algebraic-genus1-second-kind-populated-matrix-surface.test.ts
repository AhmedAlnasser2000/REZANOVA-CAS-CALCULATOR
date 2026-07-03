import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import {
  buildAlgebraicGenus1SecondKindPopulatedMatrixSurface,
} from './integration/algebraic-genus1/second-kind-populated-matrix-surface';

const ce = new ComputeEngine();

function surface(latex: string, variable = 'x') {
  return buildAlgebraicGenus1SecondKindPopulatedMatrixSurface(
    ce.parse(latex).json,
    variable,
  );
}

function success(latex: string, variable = 'x') {
  const result = surface(latex, variable);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`expected populated second-kind matrix surface for ${latex}: ${result.detail}`);
  }
  return result;
}

function text(result: ReturnType<typeof success>) {
  return [
    result.status,
    result.rootChartKind,
    result.unknowns.map((unknown) => unknown.nodeSymbol).join(','),
    JSON.stringify(result.matrixEntryNodes),
    JSON.stringify(result.rightHandSideNodes),
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

describe('algebraic genus-1 second-kind populated matrix surface', () => {
  it('populates matrix entries for three-real-root raw radicals', () => {
    const result = success('\\sqrt{x^3-x}');

    expect(result.status).toBe('populated-matrix-ready');
    expect(result.rootChartKind).toBe('cubic-three-real-roots');
    expect(result.matrixShape).toEqual({ rows: 8, columns: 6 });
    expect(result.matrixEntryNodes.length).toBe(8);
    expect(result.matrixEntryNodes[0].length).toBe(6);
    expect(result.rightHandSideNodes.length).toBe(8);
    expect(result.rowEquationNodes.length).toBe(8);
    expect(result.unknowns.map((unknown) => unknown.nodeSymbol)).toEqual([
      'C_F',
      'C_E',
      'C_Pi_p',
      's_0',
      's_1',
      's_2',
    ]);
    expect(result.canBackcheckRows).toBe(true);
    expect(result.canSolveDirectly).toBe(false);
    expect(result.canAdoptLive).toBe(false);
    expect(text(result)).toContain('matrix entries');
    expect(text(result)).toContain('M_F_three_real');
    expect(text(result)).not.toMatch(/RootOf|rootof|mathtip\\{\\error/i);
  });

  it('populates matrix entries for one-real-root complex-pair raw radicals', () => {
    const result = success('\\sqrt{x^3+x+1}');

    expect(result.rootChartKind).toBe('cubic-one-real-root-complex-pair');
    expect(result.matrixShape).toEqual({ rows: 7, columns: 7 });
    expect(result.unknowns.map((unknown) => unknown.nodeSymbol)).toContain('s_3');
    expect(text(result)).toContain('M_F_complex_pair');
    expect(text(result)).toContain('C_Pi_p');
  });

  it('threads selected variables through populated matrix evidence', () => {
    const result = success('\\sqrt{t^3-t}', 't');

    expect(result.variable).toBe('t');
    expect(result.chartVariableSymbol).toBe('z');
    expect(result.matrixShape.rows).toBe(8);
    expect(text(result)).not.toContain('"t"');
  });

  it('stops rational-in-radical cases at the row coefficient boundary', () => {
    expect(surface('\\frac{x+1}{\\sqrt{x^3-x}}')).toMatchObject({
      kind: 'stop',
      reason: 'row-coefficient-stop',
    });
  });
});
