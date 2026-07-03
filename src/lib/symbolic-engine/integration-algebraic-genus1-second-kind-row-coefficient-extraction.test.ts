import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import {
  buildAlgebraicGenus1SecondKindRowCoefficientExtraction,
} from './integration/algebraic-genus1/second-kind-row-coefficient-extraction';

const ce = new ComputeEngine();

function surface(latex: string, variable = 'x') {
  return buildAlgebraicGenus1SecondKindRowCoefficientExtraction(
    ce.parse(latex).json,
    variable,
  );
}

function success(latex: string, variable = 'x') {
  const result = surface(latex, variable);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`expected second-kind row coefficient extraction for ${latex}: ${result.detail}`);
  }
  return result;
}

function text(result: ReturnType<typeof success>) {
  return [
    result.status,
    result.rootChartKind,
    JSON.stringify(result.rowCoefficientNodes),
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

describe('algebraic genus-1 second-kind row coefficient extraction', () => {
  it('extracts bounded row coefficients for three-real-root raw radicals', () => {
    const result = success('\\sqrt{x^3-x}');

    expect(result.status).toBe('row-coefficients-ready');
    expect(result.rootChartKind).toBe('cubic-three-real-roots');
    expect(result.rowBasisNodes.length).toBe(8);
    expect(result.rowCoefficientNodes.length).toBe(8);
    expect(result.rowCoefficients.map((row) => row.rowIndex)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(result.expansionStats.expandedTerms).toBeGreaterThan(1);
    expect(result.canPopulateRows).toBe(true);
    expect(result.canPopulateMatrixEntries).toBe(false);
    expect(result.canAdoptLive).toBe(false);
    expect(text(result)).toContain('row coefficient equations');
    expect(text(result)).toContain('C_E');
    expect(text(result)).toContain('s_2');
    expect(text(result)).not.toMatch(/RootOf|rootof|mathtip\\{\\error/i);
  });

  it('extracts bounded row coefficients for one-real-root complex-pair raw radicals', () => {
    const result = success('\\sqrt{x^3+x+1}');

    expect(result.rootChartKind).toBe('cubic-one-real-root-complex-pair');
    expect(result.rowBasisNodes.length).toBe(7);
    expect(result.rowCoefficientNodes.length).toBe(7);
    expect(result.expansionStats.expandedTerms).toBeGreaterThan(1);
    expect(text(result)).toContain('A_alpha_1');
    expect(text(result)).toContain('row equations: ');
    expect(text(result)).not.toMatch(/RootOf|rootof|mathtip\\{\\error/i);
  });

  it('threads selected variables through row extraction evidence', () => {
    const result = success('\\sqrt{t^3-t}', 't');

    expect(result.variable).toBe('t');
    expect(result.chartVariableSymbol).toBe('z');
    expect(result.rowCoefficientNodes.length).toBe(8);
    expect(text(result)).not.toContain('"t"');
  });

  it('stops rational-in-radical cases at the denominator-clearing boundary', () => {
    expect(surface('\\frac{x+1}{\\sqrt{x^3-x}}')).toMatchObject({
      kind: 'stop',
      reason: 'denominator-clearing-stop',
    });
  });
});
