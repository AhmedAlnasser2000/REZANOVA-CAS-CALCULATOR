import { describe, expect, it } from 'vitest';
import { buildPartialDerivativeLatex } from './examples';
import { evaluateAdvancedPartialDerivative } from './partials';

describe('advanced-calc partials', () => {
  it('builds generated preview latex for x, y, and z', () => {
    expect(buildPartialDerivativeLatex({ bodyLatex: 'x^2y+y^3', variable: 'x' })).toBe(
      '\\frac{\\partial}{\\partial x}\\left(x^2y+y^3\\right)',
    );
    expect(buildPartialDerivativeLatex({ bodyLatex: 'x^2y+y^3', variable: 'y' })).toBe(
      '\\frac{\\partial}{\\partial y}\\left(x^2y+y^3\\right)',
    );
    expect(buildPartialDerivativeLatex({ bodyLatex: 'x^2y+z', variable: 'z' })).toBe(
      '\\frac{\\partial}{\\partial z}\\left(x^2y+z\\right)',
    );
  });

  it('returns a controlled error when the body is empty', () => {
    const result = evaluateAdvancedPartialDerivative({ bodyLatex: '', variable: 'x' });

    expect(result.error).toContain('multivariable expression');
  });

  it('evaluates first-order explicit multivariable partial derivatives', () => {
    const resultX = evaluateAdvancedPartialDerivative({
      bodyLatex: 'x^2y+y^3',
      variable: 'x',
    });
    const resultY = evaluateAdvancedPartialDerivative({
      bodyLatex: 'x^2y+y^3',
      variable: 'y',
    });

    expect(resultX.error).toBeUndefined();
    expect(resultX.exactLatex?.replaceAll(' ', '')).toContain('2xy');
    expect(resultY.error).toBeUndefined();
    expect(resultY.exactLatex?.replaceAll(' ', '')).toContain('x^2+3y^2');
  });
});
