import { describe, expect, it } from 'vitest';
import {
  evaluateAdvancedDefiniteIntegral,
  evaluateAdvancedImproperIntegral,
  evaluateAdvancedIndefiniteIntegral,
} from './integrals';
import { resolveSymbolicIntegralFromLatex } from '../symbolic-engine/integration';

describe('advanced calc integrals', () => {
  it('handles inverse trig primitives', () => {
    const result = evaluateAdvancedIndefiniteIntegral({ bodyLatex: '\\frac{1}{1+x^2}' });
    expect(result.error).toBeUndefined();
    expect(result.resultOrigin).toBe('rule-based-symbolic');
    expect(result.exactLatex).toContain('\\arctan');
  });

  it('handles arcsin primitive', () => {
    const result = evaluateAdvancedIndefiniteIntegral({
      bodyLatex: '\\frac{1}{\\sqrt{1-x^2}}',
    });
    expect(result.error).toBeUndefined();
    expect(result.exactLatex).toContain('\\arcsin');
  });

  it('handles polynomial times exponential and trig cases', () => {
    const expResult = evaluateAdvancedIndefiniteIntegral({ bodyLatex: 'xe^x' });
    expect(expResult.error).toBeUndefined();

    const trigResult = evaluateAdvancedIndefiniteIntegral({ bodyLatex: 'x\\cos(x)' });
    expect(trigResult.error).toBeUndefined();

    const advancedOnlyCapExp = evaluateAdvancedIndefiniteIntegral({ bodyLatex: 'x^5e^x' });
    expect(advancedOnlyCapExp.error).toBeUndefined();
    expect(advancedOnlyCapExp.resultOrigin).toBe('rule-based-symbolic');
    expect(advancedOnlyCapExp.integrationStrategy).toBe('integration-by-parts');
  });

  it('routes Advanced indefinite integrals through the shared symbolic backend', () => {
    for (const bodyLatex of [
      '\\frac{1}{1+x^2}',
      '\\frac{2x+3}{x^2+3x+2}',
      '2x\\cos(x^2)',
      'x^5e^x',
      '2x\\sqrt{x^2+1}',
      '\\cos(\\sin(x))\\cos(x)',
    ]) {
      const shared = resolveSymbolicIntegralFromLatex(bodyLatex);
      const advanced = evaluateAdvancedIndefiniteIntegral({ bodyLatex });

      expect(shared.kind).toBe('success');
      expect(advanced.error).toBeUndefined();
      if (shared.kind === 'success') {
        expect(advanced.exactLatex).toBe(shared.exactLatex);
        expect(advanced.integrationStrategy).toBe(shared.strategy);
        expect(advanced.resultOrigin).toBe(shared.origin);
      }
    }
  });

  it('carries COMP1 substitution strategy metadata through Advanced Calc', () => {
    const result = evaluateAdvancedIndefiniteIntegral({
      bodyLatex: '2x\\sqrt{x^2+1}',
    });

    expect(result.error).toBeUndefined();
    expect(result.resultOrigin).toBe('rule-based-symbolic');
    expect(result.integrationStrategy).toBe('u-substitution');
  });

  it('handles logarithmic derivative forms', () => {
    const result = evaluateAdvancedIndefiniteIntegral({
      bodyLatex: '\\frac{2x+3}{x^2+3x+2}',
    });
    expect(result.error).toBeUndefined();
    expect(result.exactLatex).toContain('\\ln');
  });

  it('fails cleanly for unsupported antiderivatives', () => {
    const result = evaluateAdvancedIndefiniteIntegral({
      bodyLatex: '\\sin(x^2)',
    });
    expect(result.error).toBe('This antiderivative could not be determined symbolically in Advanced Calc.');
  });

  it('supports improper convergent integrals', () => {
    const result = evaluateAdvancedImproperIntegral({
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
    const result = evaluateAdvancedDefiniteIntegral({
      bodyLatex: '\\sin(x^2)',
      lower: '0',
      upper: '1',
    });
    expect(result.error).toBeUndefined();
    expect(result.resultOrigin).toBe('numeric-fallback');
  });
});
