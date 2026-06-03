import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import {
  classifyPolynomialDomainLatex,
  classifyPolynomialDomainNode,
  classifyRationalDomainLatex,
  polynomialDomainFactsFromConstraints,
  valueDomainMetadataFromPolynomialDomain,
} from './polynomial-domain-core';

const ce = new ComputeEngine();

function parse(latex: string) {
  return ce.parse(latex).json;
}

describe('polynomial-domain-core', () => {
  it('classifies zero, constant, linear, quadratic, cubic, and quartic polynomials', () => {
    const zero = classifyPolynomialDomainLatex('0');
    const constant = classifyPolynomialDomainLatex('5');
    const linear = classifyPolynomialDomainLatex('2x+3');
    const quadratic = classifyPolynomialDomainLatex('x^2-5x+6');
    const cubic = classifyPolynomialDomainLatex('x^3-2x+1');
    const quartic = classifyPolynomialDomainLatex('x^4+x+1');

    expect(zero).toMatchObject({ kind: 'success', metadata: { shape: 'zero', degree: 0 } });
    expect(constant).toMatchObject({ kind: 'success', metadata: { shape: 'constant', degree: 0 } });
    expect(linear).toMatchObject({ kind: 'success', metadata: { shape: 'linear', degree: 1 } });
    expect(quadratic).toMatchObject({ kind: 'success', metadata: { shape: 'quadratic', degree: 2 } });
    expect(cubic).toMatchObject({ kind: 'success', metadata: { shape: 'cubic', degree: 3 } });
    expect(quartic).toMatchObject({ kind: 'success', metadata: { shape: 'quartic', degree: 4 } });
  });

  it('keeps normalized coefficients, primitive metadata, monic metadata, and discriminants', () => {
    const result = classifyPolynomialDomainNode(
      ['Add', ['Multiply', ['Rational', 2, 3], ['Power', 'x', 2]], ['Multiply', ['Rational', -4, 3], 'x'], ['Rational', 2, 3]],
      { variable: 'x' },
    );

    expect(result.kind).toBe('success');
    if (result.kind === 'success') {
      expect(result.metadata.coefficients).toEqual([
        { numerator: 2, denominator: 3 },
        { numerator: -4, denominator: 3 },
        { numerator: 2, denominator: 3 },
      ]);
      expect(result.metadata.leadingCoefficient).toEqual({ numerator: 2, denominator: 3 });
      expect(result.metadata.constantTerm).toEqual({ numerator: 2, denominator: 3 });
      expect(result.metadata.primitive).toMatchObject({
        scalar: { numerator: 2, denominator: 3 },
      });
      expect(result.metadata.primitive?.latex).toContain('x^2');
      expect(result.metadata.monic?.latex).toContain('x^2');
      expect(result.metadata.discriminant).toEqual({ numerator: 0, denominator: 1 });
    }
  });

  it('classifies sparse powers and rational numeric coefficients', () => {
    const result = classifyPolynomialDomainLatex('\\frac{1}{2}x^4-3x^2+7', {
      variable: 'x',
    });

    expect(result.kind).toBe('success');
    if (result.kind === 'success') {
      expect(result.metadata.shape).toBe('quartic');
      expect(result.metadata.coefficients).toEqual([
        { numerator: 1, denominator: 2 },
        { numerator: 0, denominator: 1 },
        { numerator: -3, denominator: 1 },
        { numerator: 0, denominator: 1 },
        { numerator: 7, denominator: 1 },
      ]);
    }
  });

  it('classifies rational shapes with denominator facts from the assumption spine', () => {
    const result = classifyRationalDomainLatex('\\frac{x+1}{x-2}', { variable: 'x' });

    expect(result.kind).toBe('success');
    if (result.kind === 'success') {
      expect(result.metadata.numerator.shape).toBe('linear');
      expect(result.metadata.denominator.shape).toBe('linear');
      expect(result.metadata.denominatorLatex).toContain('x-2');
      expect(result.metadata.domainConstraints).toEqual([
        { kind: 'nonzero', expressionLatex: result.metadata.denominatorLatex },
      ]);
      expect(result.metadata.assumptionFacts).toMatchObject([
        {
          kind: 'domain-exclusion',
          source: 'polynomial-domain-core',
          trust: 'proved',
          scope: 'result',
          expressionLatex: result.metadata.denominatorLatex,
        },
      ]);
    }
  });

  it('keeps rational classification bounded by degree and variable consistency', () => {
    expect(classifyRationalDomainLatex('\\frac{1}{x^5+1}', { maxDegree: 4 })).toEqual({
      kind: 'stop',
      reason: 'degree-limit',
    });
    expect(classifyRationalDomainLatex('\\frac{1}{x+y}')).toEqual({
      kind: 'stop',
      reason: 'multivariable',
    });
  });

  it('rejects malformed, unsupported, multivariable, inexact, and over-cap polynomial shapes', () => {
    expect(classifyPolynomialDomainLatex('x +')).toEqual({ kind: 'stop', reason: 'parse-failure' });
    expect(classifyPolynomialDomainLatex('x+y')).toEqual({ kind: 'stop', reason: 'multivariable' });
    expect(classifyPolynomialDomainNode(['Add', ['Multiply', 1.5, 'x'], 1])).toEqual({
      kind: 'stop',
      reason: 'unsupported-coefficient',
    });
    expect(classifyPolynomialDomainLatex('x^5', { maxDegree: 4 })).toEqual({
      kind: 'stop',
      reason: 'degree-limit',
    });
    expect(classifyPolynomialDomainLatex('x^{-1}')).toEqual({
      kind: 'stop',
      reason: 'non-polynomial',
    });
    expect(classifyPolynomialDomainLatex('\\sin(x)')).toEqual({
      kind: 'stop',
      reason: 'non-polynomial',
    });
    expect(classifyPolynomialDomainLatex('\\sqrt{x}')).toEqual({
      kind: 'stop',
      reason: 'non-polynomial',
    });
  });

  it('builds reusable facts and value-domain metadata without DisplayOutcome adoption', () => {
    const facts = polynomialDomainFactsFromConstraints([
      { kind: 'nonzero', expressionLatex: 'x-1' },
    ]);
    const metadata = valueDomainMetadataFromPolynomialDomain({
      solutionKind: 'inequality-solution-set',
      facts: [...facts, ...facts],
    });

    expect(facts).toMatchObject([
      {
        kind: 'domain-exclusion',
        source: 'polynomial-domain-core',
        message: 'x-1 must stay nonzero.',
      },
    ]);
    expect(metadata.answerDomain).toBe('conditional-real');
    expect(metadata.solutionKind).toBe('inequality-solution-set');
    expect(metadata.facts).toHaveLength(1);
  });

  it('accepts MathJSON input directly for future Equation callers', () => {
    const result = classifyPolynomialDomainNode(parse('x^2+2x+1'));

    expect(result.kind).toBe('success');
    if (result.kind === 'success') {
      expect(result.metadata.variable).toBe('x');
      expect(result.metadata.shape).toBe('quadratic');
    }
  });
});
