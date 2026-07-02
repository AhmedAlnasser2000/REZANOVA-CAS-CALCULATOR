import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { resolveSymbolicIntegralFromLatex } from './integration';
import { reduceAlgebraicGenus1DifferentialBasis } from './integration/algebraic-genus1/differential-basis';

const ce = new ComputeEngine();

function reduce(latex: string, variable = 'x') {
  return reduceAlgebraicGenus1DifferentialBasis(ce.parse(latex).json, variable);
}

function success(latex: string, variable = 'x') {
  const result = reduce(latex, variable);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`expected genus-1 differential-basis evidence for ${latex}`);
  }
  return result;
}

describe('algebraic genus-1 differential-basis reduction readiness', () => {
  it('reduces canonical first-kind Legendre templates to first-kind obligations', () => {
    const result = success('\\frac{1}{\\sqrt{(1-x^2)(1-m*x^2)}}');

    expect(result.status).toBe('legendre-template-reduced');
    expect(result.basisObligations).toHaveLength(1);
    expect(result.basisObligations[0]).toMatchObject({
      kind: 'first-kind',
      head: 'EllipticF',
      status: 'reduced',
      prototypeAntiderivativeLatex: '\\operatorname{EllipticF}\\left(\\arcsin(x),m\\right)',
    });
    expect(result.rationalResidualsLatex).toEqual([]);
    expect(result.logarithmicResidualsLatex).toEqual([]);
  });

  it('reduces canonical second-kind Legendre templates to second-kind obligations', () => {
    const result = success('\\sqrt{\\frac{1-m*x^2}{1-x^2}}');

    expect(result.basisObligations[0]).toMatchObject({
      kind: 'second-kind',
      head: 'EllipticE',
      status: 'reduced',
      prototypeAntiderivativeLatex: '\\operatorname{EllipticE}\\left(\\arcsin(x),m\\right)',
    });
  });

  it('reduces canonical third-kind Legendre templates to third-kind obligations', () => {
    const result = success('\\frac{1}{(1-n*x^2)\\sqrt{(1-x^2)(1-m*x^2)}}');

    expect(result.basisObligations[0]).toMatchObject({
      kind: 'third-kind',
      head: 'EllipticPi',
      status: 'reduced',
      characteristicLatex: 'n',
      prototypeAntiderivativeLatex: '\\operatorname{EllipticPi}\\left(n,\\arcsin(x),m\\right)',
    });
  });

  it('keeps generic exact curves as root-based basis readiness', () => {
    const result = success('\\sqrt{x^3-x}');

    expect(result.status).toBe('root-based-readiness');
    expect(result.basisObligations.map((item) => item.status)).toEqual([
      'pending-root-normalization',
      'pending-root-normalization',
      'pending-root-normalization',
    ]);
    expect(result.detailSections.some((section) => section.title === 'Genus-1 Root Definitions')).toBe(true);
  });

  it('keeps generic symbolic curves as symbolic basis readiness', () => {
    const result = success('\\sqrt{a*x^3+b*x^2+c*x+d}');

    expect(result.status).toBe('symbolic-readiness');
    expect(result.exactSupplementEntries.length).toBeGreaterThan(0);
    expect(result.basisObligations.every((item) => item.status === 'pending-symbolic-branching')).toBe(true);
  });

  it('keeps generic exact curves non-live while canonical templates are adopted elsewhere', () => {
    const legendre = resolveSymbolicIntegralFromLatex('\\frac{1}{\\sqrt{(1-x^2)(1-m*x^2)}}');
    const cubic = resolveSymbolicIntegralFromLatex('\\sqrt{x^3-x}');

    expect(legendre.kind).toBe('success');
    expect(cubic.kind).toBe('error');
  });
});
