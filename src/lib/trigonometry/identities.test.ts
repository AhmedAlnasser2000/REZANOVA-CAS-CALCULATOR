import { describe, expect, it } from 'vitest';
import { evaluateTrigIdentity } from './identities';

describe('trigonometry identities', () => {
  it('simplifies the basic Pythagorean identity', () => {
    const result = evaluateTrigIdentity({
      expressionLatex: '\\sin^2\\left(x\\right)+\\cos^2\\left(x\\right)',
      targetForm: 'simplified',
    });
    expect(result.exactLatex).toBe('1');
  });

  it('converts products to sums', () => {
    const result = evaluateTrigIdentity({
      expressionLatex: '\\sin\\left(A\\right)\\sin\\left(B\\right)',
      targetForm: 'productToSum',
    });
    expect(result.exactLatex).toContain('\\cos\\left(A-B\\right)');
    expect(result.exactLatex).toContain('\\cos\\left(A+B\\right)');
  });

  it('converts squares into half-angle form', () => {
    const result = evaluateTrigIdentity({
      expressionLatex: '\\sin^2\\left(x\\right)',
      targetForm: 'halfAngle',
    });
    expect(result.exactLatex).toBe('\\frac{1-\\cos\\left(2x\\right)}{2}');
  });

  it('simplifies repeated trig products structurally after normalization', () => {
    const result = evaluateTrigIdentity({
      expressionLatex: '\\sin\\left(x\\right)\\sin\\left(x\\right)+\\cos\\left(x\\right)\\cos\\left(x\\right)',
      targetForm: 'simplified',
    });
    expect(result.exactLatex).toBe('1');
  });

  it('converts affine double-angle products structurally', () => {
    const result = evaluateTrigIdentity({
      expressionLatex: '2\\sin\\left(x+30\\right)\\cos\\left(x+30\\right)',
      targetForm: 'doubleAngle',
    });
    expect(result.exactLatex).toContain('\\sin\\left(2');
    expect(result.exactLatex).toContain('x+30');
  });
});
