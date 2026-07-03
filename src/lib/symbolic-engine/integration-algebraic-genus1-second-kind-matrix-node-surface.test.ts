import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { buildAlgebraicGenus1SecondKindMatrixNodeSurface } from './integration/algebraic-genus1/second-kind-matrix-node-surface';

const ce = new ComputeEngine();

function surface(latex: string, variable = 'x') {
  return buildAlgebraicGenus1SecondKindMatrixNodeSurface(
    ce.parse(latex).json,
    variable,
  );
}

function success(latex: string, variable = 'x') {
  const result = surface(latex, variable);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`expected second-kind matrix node surface for ${latex}`);
  }
  return result;
}

function text(result: ReturnType<typeof success>) {
  return [
    result.status,
    result.rootChartKind,
    result.chartVariableLatex,
    result.unknownSymbols.join(','),
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

describe('algebraic genus-1 second-kind matrix node surface', () => {
  it('builds a concrete node coefficient surface for three-real-root radicals', () => {
    const result = success('\\sqrt{x^3-x}');

    expect(result.status).toBe('matrix-node-surface-ready');
    expect(result.rootChartKind).toBe('cubic-three-real-roots');
    expect(result.integrandShape).toBe('radical');
    expect(result.canPopulateEntries).toBe(true);
    expect(result.canSolveDirectly).toBe(false);
    expect(result.canAdoptLive).toBe(false);
    expect(result.correctionDerivativeFormula).toBe('expanded-normalized-second-kind-kernel');
    expect(result.matrixShape).toEqual({ rows: 8, columns: 6 });
    expect(result.rowBasisNodes).toEqual([
      1,
      'z',
      ['Power', 'z', 2],
      ['Power', 'z', 3],
      ['Power', 'z', 4],
      ['Power', 'z', 5],
      ['Power', 'z', 6],
      ['Power', 'z', 7],
    ]);
    expect(result.unknownSymbols).toContain('C_E');
    expect(result.unknownSymbols).toContain('s_2');
    expect(JSON.stringify(result.radicandInChartNode)).toContain('alpha_3');
    expect(JSON.stringify(result.rawPullbackNode)).toContain('Sqrt');
    expect(JSON.stringify(result.correctionDerivativeNode)).toContain('s_1');
    expect(JSON.stringify(result.correctionDerivativeNode)).not.toContain('D_S_z');
    expect(JSON.stringify(result.coefficientComparisonNode)).not.toContain('D_S_z');
    expect(text(result)).toContain('MathJSON node surface');
    expect(text(result)).toContain('S\\prime(z)(1-mz) - (m/2)S(z)');
    expect(text(result)).not.toMatch(/RootOf|rootof/i);
  });

  it('threads one-real-root complex-pair radicals through the same node surface', () => {
    const result = success('\\sqrt{x^3+x+1}');

    expect(result.rootChartKind).toBe('cubic-one-real-root-complex-pair');
    expect(result.chartVariableLatex).toContain('\\tan^2');
    expect(result.matrixShape).toEqual({ rows: 7, columns: 7 });
    expect(JSON.stringify(result.selectedVariableInChartNode)).toContain('A_alpha_1');
    expect(JSON.stringify(result.radicandInChartNode)).toContain('alpha_1');
    expect(text(result)).toContain('\\tan^2');
    expect(text(result)).not.toMatch(/blacksquare|mathtip\\{\\error/i);
  });

  it('leaves rational-in-radical pullbacks to the later Hermite surface', () => {
    expect(surface('\\frac{x+1}{\\sqrt{x^3-x}}')).toMatchObject({
      kind: 'stop',
      reason: 'unsupported-shape',
    });
  });

  it('threads selected variables through node-surface evidence', () => {
    const result = success('\\sqrt{t^3-t}', 't');

    expect(result.variable).toBe('t');
    expect(result.rootChartKind).toBe('cubic-three-real-roots');
    expect(JSON.stringify(result.rawPullbackNode)).not.toContain('"t"');
    expect(text(result)).toContain('t>\\alpha_{3}');
  });

  it('stops cleanly for already-live first-kind and beyond-scope radicals', () => {
    expect(surface('\\frac{1}{\\sqrt{x^3-x}}')).toMatchObject({
      kind: 'stop',
      reason: 'unsupported-shape',
    });
    expect(surface('\\sqrt{x^5+x+1}')).toMatchObject({
      kind: 'stop',
      reason: 'curve-profile-stop',
    });
  });
});
