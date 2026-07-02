import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { resolveSymbolicIntegralFromLatex } from './integration';
import { buildAlgebraicGenus1RootLegendreData } from './integration/algebraic-genus1/root-legendre-data';

const ce = new ComputeEngine();

function data(latex: string, variable = 'x') {
  return buildAlgebraicGenus1RootLegendreData(ce.parse(latex).json, variable);
}

function success(latex: string, variable = 'x') {
  const result = data(latex, variable);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`expected root Legendre data for ${latex}`);
  }
  return result;
}

function text(result: ReturnType<typeof success>) {
  return [
    result.amplitudeLatex,
    result.parameterLatex,
    result.multiplierLatex,
    result.inverseMapLatex,
    result.firstKindPrototypeLatex,
    result.secondKindBasisLatex,
    result.thirdKindCharacteristicTemplateLatex,
    ...result.branchFactsLatex,
    ...result.detailSections.flatMap((section) => [
      section.title,
      ...section.lines,
      ...((section as { lineParts?: unknown[][] }).lineParts ?? []).flat().map(String),
    ]),
  ].join('\n');
}

describe('algebraic genus-1 exact-rational root Legendre data', () => {
  it('builds three-real-root cubic Legendre data without live adoption', () => {
    const result = success('\\sqrt{x^3-x}');

    expect(result.dataKind).toBe('cubic-three-real-roots');
    expect(result.rootSymbolsLatex).toEqual([
      '\\alpha_{1}',
      '\\alpha_{2}',
      '\\alpha_{3}',
    ]);
    expect(result.preferredBranchLatex).toBe('x>\\alpha_{3}');
    expect(result.amplitudeLatex).toContain('\\arcsin\\sqrt');
    expect(result.amplitudeLatex).toContain('x-\\alpha_{3}');
    expect(result.parameterLatex).toContain('\\alpha_{2}-\\alpha_{1}');
    expect(result.multiplierLatex).toContain('\\sqrt{\\alpha_{3}-\\alpha_{1}}');
    expect(result.firstKindPrototypeLatex).toContain('EllipticF');
    expect(result.secondKindBasisLatex).toContain('EllipticE');
    expect(result.thirdKindCharacteristicTemplateLatex).toContain('n(p)');
    expect(result.rootBasisCoefficientProof.proofStatus).toBe('root-basis-coefficients-ready');
    expect(result.rootBasisCoefficientProof.obligations).toHaveLength(3);
    expect(text(result)).not.toMatch(/RootOf|rootof/i);

    const integration = resolveSymbolicIntegralFromLatex('\\sqrt{x^3-x}');
    expect(integration.kind).toBe('error');
  });

  it('builds four-real-root quartic Legendre data with the middle chart', () => {
    const result = success('\\frac{1}{\\sqrt{(1-x^2)(1-2*x^2)}}');

    expect(result.dataKind).toBe('quartic-four-real-roots');
    expect(result.rootSymbolsLatex).toEqual([
      '\\alpha_{1}',
      '\\alpha_{2}',
      '\\alpha_{3}',
      '\\alpha_{4}',
    ]);
    expect(result.preferredBranchLatex).toBe('\\alpha_{2}<x<\\alpha_{3}');
    expect(result.parameterLatex).toContain('\\alpha_{4}-\\alpha_{1}');
    expect(result.multiplierLatex).toContain('\\alpha_{4}-\\alpha_{2}');
    expect(result.inverseMapLatex).toContain('\\sin^2');
    expect(result.branchFactsLatex).toContain('\\alpha_{2}<x<\\alpha_{3}');
    expect(text(result)).not.toMatch(/RootOf|rootof/i);
  });

  it('uses the selected variable in exact root Legendre data', () => {
    const result = success('\\sqrt{t^3-t}', 't');

    expect(result.variable).toBe('t');
    expect(result.preferredBranchLatex).toBe('t>\\alpha_{3}');
    expect(result.amplitudeLatex).toContain('t-\\alpha_{3}');
    expect(result.inverseMapLatex).toContain('t=');
  });

  it('stops one-real-root cubics until an alternate root chart is implemented', () => {
    const result = data('\\sqrt{x^3+x+1}');

    expect(result).toMatchObject({
      kind: 'stop',
      reason: 'insufficient-real-roots',
    });
    if (result.kind === 'stop') {
      expect(result.detail).toContain('complex-pair');
    }
  });
});
