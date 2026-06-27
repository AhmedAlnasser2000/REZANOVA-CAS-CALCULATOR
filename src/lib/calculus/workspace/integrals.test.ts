import { describe, expect, it } from 'vitest';
import {
  evaluateCalculusDefiniteIntegral,
  evaluateCalculusImproperIntegral,
  evaluateCalculusIndefiniteIntegral,
} from './integrals';
import { resolveSymbolicIntegralFromLatex } from '../../symbolic-engine/integration';

describe('calculus integrals', () => {
  it('handles inverse trig primitives', () => {
    const result = evaluateCalculusIndefiniteIntegral({ bodyLatex: '\\frac{1}{1+x^2}' });
    expect(result.error).toBeUndefined();
    expect(result.resultOrigin).toBe('rule-based-symbolic');
    expect(result.exactLatex).toContain('\\arctan');
  });

  it('handles arcsin primitive', () => {
    const result = evaluateCalculusIndefiniteIntegral({
      bodyLatex: '\\frac{1}{\\sqrt{1-x^2}}',
    });
    expect(result.error).toBeUndefined();
    expect(result.exactLatex).toContain('\\arcsin');
  });

  it('handles polynomial times exponential and trig cases', () => {
    const expResult = evaluateCalculusIndefiniteIntegral({ bodyLatex: 'xe^x' });
    expect(expResult.error).toBeUndefined();

    const trigResult = evaluateCalculusIndefiniteIntegral({ bodyLatex: 'x\\cos(x)' });
    expect(trigResult.error).toBeUndefined();

    const integrationByPartsCapExp = evaluateCalculusIndefiniteIntegral({ bodyLatex: 'x^5e^x' });
    expect(integrationByPartsCapExp.error).toBeUndefined();
    expect(integrationByPartsCapExp.resultOrigin).toBe('rule-based-symbolic');
    expect(integrationByPartsCapExp.integrationStrategy).toBe('integration-by-parts');
  });

  it('threads the chosen integration variable through indefinite integrals', () => {
    const yResult = evaluateCalculusIndefiniteIntegral({
      bodyLatex: 'y^2',
      integrationVariable: 'y',
    });
    expect(yResult.error).toBeUndefined();
    expect(yResult.exactLatex).toContain('y^{3}');

    const tResult = evaluateCalculusIndefiniteIntegral({
      bodyLatex: 't e^t',
      integrationVariable: 't',
    });
    expect(tResult.error).toBeUndefined();
    expect(tResult.exactLatex).toContain('e^{t}');

    const parameterResult = evaluateCalculusIndefiniteIntegral({
      bodyLatex: 'x t',
      integrationVariable: 't',
    });
    expect(parameterResult.error).toBeUndefined();
    expect(parameterResult.exactLatex).toContain('x');
    expect(parameterResult.exactLatex).toContain('t^{2}');
  });

  it('rejects compound or reserved integration variables', () => {
    const compound = evaluateCalculusIndefiniteIntegral({
      bodyLatex: 'x^2',
      integrationVariable: 'xy',
    });
    expect(compound.error).toContain('single symbol');

    const reserved = evaluateCalculusIndefiniteIntegral({
      bodyLatex: 'x^2',
      integrationVariable: 'pi',
    });
    expect(reserved.error).toContain('single symbol');
  });

  it('routes Calculus indefinite integrals through the shared symbolic backend', () => {
    for (const bodyLatex of [
      '\\frac{1}{1+x^2}',
      '\\frac{2x+3}{x^2+3x+2}',
      '2x\\cos(x^2)',
      'x^5e^x',
      '2x\\sqrt{x^2+1}',
      '\\cos(\\sin(x))\\cos(x)',
    ]) {
      const shared = resolveSymbolicIntegralFromLatex(bodyLatex);
      const calculus = evaluateCalculusIndefiniteIntegral({ bodyLatex });

      expect(shared.kind).toBe('success');
      expect(calculus.error).toBeUndefined();
      if (shared.kind === 'success') {
        expect(calculus.exactLatex).toBe(shared.exactLatex);
        expect(calculus.integrationStrategy).toBe(shared.strategy);
        expect(calculus.resultOrigin).toBe(shared.origin);
      }
    }
  });

  it('carries COMP1 substitution strategy metadata through Calculus', () => {
    const result = evaluateCalculusIndefiniteIntegral({
      bodyLatex: '2x\\sqrt{x^2+1}',
    });

    expect(result.error).toBeUndefined();
    expect(result.resultOrigin).toBe('rule-based-symbolic');
    expect(result.integrationStrategy).toBe('u-substitution');
  });

  it('handles logarithmic derivative forms', () => {
    const result = evaluateCalculusIndefiniteIntegral({
      bodyLatex: '\\frac{2x+3}{x^2+3x+2}',
    });
    expect(result.error).toBeUndefined();
    expect(result.exactLatex).toContain('\\ln');
    expect(result.integrationStrategy).toBe('derivative-ratio');
  });

  it('handles bounded rational partial-fraction primitives', () => {
    const result = evaluateCalculusIndefiniteIntegral({
      bodyLatex: '\\frac{1}{x^2-1}',
    });
    expect(result.error).toBeUndefined();
    expect(result.resultOrigin).toBe('rule-based-symbolic');
    expect(result.integrationStrategy).toBe('partial-fractions');
    expect(result.exactLatex).toContain('\\ln');
    expect(result.exactLatex).toContain('x-1');
    expect(result.exactLatex).toContain('x+1');
    expect(result.detailSections?.[0]?.title).toBe('Partial Fractions');
    expect(result.detailSections?.[0]?.lines.join(' ')).toContain('shared polynomial/rational core');

    const repeated = evaluateCalculusIndefiniteIntegral({
      bodyLatex: '\\frac{1}{(x-1)^2}',
    });
    expect(repeated.error).toBeUndefined();
    expect(repeated.resultOrigin).toBe('rule-based-symbolic');
    expect(repeated.integrationStrategy).toBe('partial-fractions');
    expect(repeated.exactLatex).toBe('-\\frac{1}{x-1}');
    expect(repeated.detailSections?.[0]?.title).toBe('Partial Fractions');

    const quadratic = evaluateCalculusIndefiniteIntegral({
      bodyLatex: '\\frac{x+1}{x^2+1}',
    });
    expect(quadratic.error).toBeUndefined();
    expect(quadratic.resultOrigin).toBe('rule-based-symbolic');
    expect(quadratic.integrationStrategy).toBe('partial-fractions');
    expect(quadratic.exactLatex).toBe('\\frac{1}{2}\\ln\\left(x^2+1\\right)+\\arctan\\left(x\\right)');
    expect(quadratic.detailSections?.[0]?.lines.join(' ')).toContain('irreducible quadratic');
  });

  it('fails cleanly for unsupported antiderivatives', () => {
    const result = evaluateCalculusIndefiniteIntegral({
      bodyLatex: '\\sin(x^2)',
    });
    expect(result.error).toBe('This antiderivative could not be determined symbolically in Calculus.');
  });

  it('supports improper convergent integrals', () => {
    const result = evaluateCalculusImproperIntegral({
      bodyLatex: '\\frac{1}{1+x^2}',
      lowerKind: 'finite',
      lower: '0',
      upperKind: 'posInfinity',
      upper: '1',
    });
    expect(result.error).toBeUndefined();
    expect(Number(result.approxText)).toBeCloseTo(Math.PI / 2, 2);
  });

  it('supports finite definite fallback', () => {
    const result = evaluateCalculusDefiniteIntegral({
      bodyLatex: '\\sin(x^2)',
      lower: '0',
      upper: '1',
    });
    expect(result.error).toBeUndefined();
    expect(result.resultOrigin).toBe('numeric-fallback');
  });

  it('uses the shared exact definite-integral trust path when interval-safe', () => {
    const result = evaluateCalculusDefiniteIntegral({
      bodyLatex: '2x',
      lower: '0',
      upper: '1',
    });

    expect(result.error).toBeUndefined();
    expect(result.exactLatex).toBe('1');
    expect(result.resultOrigin).toBe('rule-based-symbolic');
    expect(result.detailSections?.[0]?.title).toBe('Integral Method');
    expect(result.detailSections?.[1]?.title).toBe('Interval Safety');

    const rational = evaluateCalculusDefiniteIntegral({
      bodyLatex: '\\frac{1}{x^2-1}',
      lower: '2',
      upper: '3',
    });

    expect(rational.error).toBeUndefined();
    expect(rational.resultOrigin).toBe('rule-based-symbolic');
    expect(rational.integrationStrategy).toBe('partial-fractions');
    expect(Number(rational.approxText)).toBeCloseTo(0.202732, 5);

    const repeated = evaluateCalculusDefiniteIntegral({
      bodyLatex: '\\frac{1}{(x-1)^2}',
      lower: '2',
      upper: '3',
    });

    expect(repeated.error).toBeUndefined();
    expect(repeated.resultOrigin).toBe('rule-based-symbolic');
    expect(repeated.integrationStrategy).toBe('partial-fractions');
    expect(Number(repeated.approxText)).toBeCloseTo(0.5, 5);
    expect(repeated.detailSections?.map((section) => section.title)).toContain('Partial Fractions');
  });

  it('blocks unsafe finite definite intervals before numeric fallback', () => {
    const result = evaluateCalculusDefiniteIntegral({
      bodyLatex: '\\frac{1}{x}',
      lower: '-1',
      upper: '1',
    });

    expect(result.error).toContain('outside the real domain');
    expect(result.detailSections?.[0]?.title).toBe('Interval Safety');
    expect(result.detailSections?.[0]?.lines.join(' ')).toContain('Trust: blocked via domain/range core');
  });

  it('stops improper endpoint singularities instead of trusting numeric tails', () => {
    const result = evaluateCalculusImproperIntegral({
      bodyLatex: '\\frac{1}{x}',
      lowerKind: 'finite',
      lower: '0',
      upperKind: 'posInfinity',
      upper: '1',
    });

    expect(result.error).toContain('real-domain boundary');
    expect(result.detailSections?.[0]?.title).toBe('Interval Safety');
    expect(result.detailSections?.[0]?.lines.join(' ')).toContain('Trust: blocked via domain/range core');
  });
});
