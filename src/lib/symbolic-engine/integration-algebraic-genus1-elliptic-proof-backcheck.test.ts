import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { resolveSymbolicIntegralFromLatex } from './integration';
import { buildAlgebraicGenus1EllipticProofBackcheck } from './integration/algebraic-genus1/proof-backcheck';

const ce = new ComputeEngine();

function proof(latex: string, variable = 'x') {
  return buildAlgebraicGenus1EllipticProofBackcheck(ce.parse(latex).json, variable);
}

function success(latex: string, variable = 'x') {
  const result = proof(latex, variable);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`expected genus-1 elliptic proof evidence for ${latex}`);
  }
  return result;
}

describe('algebraic genus-1 elliptic proof backcheck readiness', () => {
  it('proves canonical first-kind Legendre templates by exact elliptic differentiation', () => {
    const result = success('\\frac{1}{\\sqrt{(1-x^2)(1-m*x^2)}}');

    expect(result.proofStatus).toBe('template-proved');
    expect(result.proofObligations[0]).toMatchObject({
      basisKind: 'first-kind',
      head: 'EllipticF',
      proofStatus: 'template-proved',
      prototypeAntiderivativeLatex: '\\operatorname{EllipticF}\\left(\\arcsin(x),m\\right)',
    });
    expect(result.proofObligations[0].expectedIntegrandLatex).toContain('1-mx^2');
    expect(result.proofObligations[0].derivativeLatex).toContain('\\sqrt');
    expect(result.proofObligations[0].proofDifferentiation?.kind).toBe('success');
    const proofSection = result.detailSections.find((section) =>
      section.title === 'Genus-1 Elliptic Proof Backcheck');
    expect(proofSection?.lineParts?.[0]?.some((part) =>
      part.kind === 'math' && part.latex.includes('EllipticF'))).toBe(true);
    expect(proofSection?.lines[0]).not.toContain('\\quad');
  });

  it('proves canonical second-kind Legendre templates by exact elliptic differentiation', () => {
    const result = success('\\sqrt{\\frac{1-m*x^2}{1-x^2}}');

    expect(result.proofStatus).toBe('template-proved');
    expect(result.proofObligations[0]).toMatchObject({
      basisKind: 'second-kind',
      head: 'EllipticE',
      proofStatus: 'template-proved',
      prototypeAntiderivativeLatex: '\\operatorname{EllipticE}\\left(\\arcsin(x),m\\right)',
    });
  });

  it('proves canonical third-kind Legendre templates by exact elliptic differentiation', () => {
    const result = success('\\frac{1}{(1-n*x^2)\\sqrt{(1-x^2)(1-m*x^2)}}');

    expect(result.proofStatus).toBe('template-proved');
    expect(result.proofObligations[0]).toMatchObject({
      basisKind: 'third-kind',
      head: 'EllipticPi',
      proofStatus: 'template-proved',
      prototypeAntiderivativeLatex: '\\operatorname{EllipticPi}\\left(n,\\arcsin(x),m\\right)',
    });
  });

  it('keeps generic exact curves readiness-only until root normalization is live', () => {
    const result = success('\\sqrt{x^3-x}');

    expect(result.proofStatus).toBe('readiness-only');
    expect(result.proofObligations.map((item) => item.proofStatus)).toEqual([
      'readiness-only',
      'readiness-only',
      'readiness-only',
    ]);
    expect(result.detailSections.some((section) => section.title === 'Genus-1 Elliptic Proof Backcheck')).toBe(true);
  });

  it('keeps generic symbolic curves readiness-only until symbolic branch formulas are live', () => {
    const result = success('\\sqrt{a*x^3+b*x^2+c*x+d}');

    expect(result.proofStatus).toBe('readiness-only');
    expect(result.readinessNotes.join('\n')).toContain('readiness-only');
  });

  it('keeps generic exact curves non-live while canonical templates are adopted elsewhere', () => {
    const firstKind = resolveSymbolicIntegralFromLatex('\\frac{1}{\\sqrt{(1-x^2)(1-m*x^2)}}');
    const thirdKind = resolveSymbolicIntegralFromLatex(
      '\\frac{1}{(1-n*x^2)\\sqrt{(1-x^2)(1-m*x^2)}}',
    );
    const cubic = resolveSymbolicIntegralFromLatex('\\sqrt{x^3-x}');

    expect(firstKind.kind).toBe('success');
    expect(thirdKind.kind).toBe('success');
    expect(cubic.kind).toBe('error');
  });
});
