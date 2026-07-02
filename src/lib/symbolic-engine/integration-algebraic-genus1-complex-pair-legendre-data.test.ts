import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { resolveSymbolicIntegralFromLatex } from './integration';
import { buildAlgebraicGenus1ComplexPairLegendreData } from './integration/algebraic-genus1/complex-pair-legendre-data';

const ce = new ComputeEngine();

function data(latex: string, variable = 'x') {
  return buildAlgebraicGenus1ComplexPairLegendreData(ce.parse(latex).json, variable);
}

function success(latex: string, variable = 'x') {
  const result = data(latex, variable);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`expected complex-pair Legendre data for ${latex}`);
  }
  return result;
}

function text(result: ReturnType<typeof success>) {
  return [
    result.realRootLatex,
    result.betaLatex,
    result.rhoLatex,
    result.scaleLatex,
    result.completedSquareCofactorLatex,
    result.amplitudeLatex,
    result.parameterLatex,
    result.multiplierLatex,
    result.firstKindPrototypeLatex,
    result.preferredBranchLatex,
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

describe('algebraic genus-1 complex-pair Legendre data', () => {
  it('builds one-real-root cubic first-kind descriptors without live adoption', () => {
    const result = success('\\frac{1}{\\sqrt{x^3+x+1}}');

    expect(result.dataKind).toBe('cubic-one-real-root-complex-pair');
    expect(result.realRootLatex).toBe('\\alpha_{1}');
    expect(result.betaLatex).toBe('\\beta_{\\alpha_{1}}');
    expect(result.rhoLatex).toBe('\\rho_{\\alpha_{1}}');
    expect(result.scaleLatex).toContain('A_{\\alpha_{1}}=\\sqrt');
    expect(result.completedSquareCofactorLatex).toContain('x-\\beta_{\\alpha_{1}}');
    expect(result.amplitudeLatex).toContain('2\\arctan\\sqrt');
    expect(result.parameterLatex).toContain('A_{\\alpha_{1}}-\\alpha_{1}+\\beta_{\\alpha_{1}}');
    expect(result.multiplierLatex).toContain('\\sqrt{A_{\\alpha_{1}}}');
    expect(result.firstKindPrototypeLatex).toContain('\\cdot \\operatorname{EllipticF}');
    expect(result.preferredBranchLatex).toBe('x>\\alpha_{1}');
    expect(text(result)).not.toMatch(/RootOf|rootof/i);

    const integration = resolveSymbolicIntegralFromLatex('\\frac{1}{\\sqrt{x^3+x+1}}');
    expect(integration.kind).toBe('error');
  });

  it('threads selected variables through complex-pair Legendre data', () => {
    const result = success('\\frac{1}{\\sqrt{t^3+t+1}}', 't');

    expect(result.variable).toBe('t');
    expect(result.completedSquareCofactorLatex).toContain('Q_{\\alpha_{1}}\\left(t\\right)');
    expect(result.amplitudeLatex).toContain('t-\\alpha_{1}');
    expect(result.preferredBranchLatex).toBe('t>\\alpha_{1}');
  });

  it('stops three-real-root cubics because the existing root Legendre data owns them', () => {
    const result = data('\\frac{1}{\\sqrt{x^3-x}}');

    expect(result).toMatchObject({
      kind: 'stop',
      reason: 'chart-stop',
    });
    if (result.kind === 'stop') {
      expect(result.detail).toContain('one real root');
    }
  });
});
