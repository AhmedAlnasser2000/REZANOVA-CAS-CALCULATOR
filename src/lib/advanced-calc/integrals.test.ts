import { describe, expect, it } from 'vitest';
import {
  evaluateAdvancedDefiniteIntegral,
  evaluateAdvancedImproperIntegral,
  evaluateAdvancedIndefiniteIntegral,
} from './integrals';

describe('advanced calc integrals', () => {
  it('handles inverse trig primitives', () => {
    const result = evaluateAdvancedIndefiniteIntegral({ bodyLatex: '\\frac{1}{1+x^2}' });
    expect(result.error).toBeUndefined();
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
