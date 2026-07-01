import { describe, expect, it } from 'vitest';
import { buildPartialDerivativeLatex } from './examples';
import { evaluateCalculusPartialDerivative } from './partials';

describe('calculus partials', () => {
  it('builds generated preview latex for supported targets', () => {
    expect(buildPartialDerivativeLatex({ bodyLatex: 'x^2y+y^3', variable: 'x' })).toBe(
      '\\frac{\\partial}{\\partial x}\\left(x^2y+y^3\\right)',
    );
    expect(buildPartialDerivativeLatex({ bodyLatex: 'x^2y+y^3', variable: 'y' })).toBe(
      '\\frac{\\partial}{\\partial y}\\left(x^2y+y^3\\right)',
    );
    expect(buildPartialDerivativeLatex({ bodyLatex: 'x^2y+z', variable: 'z' })).toBe(
      '\\frac{\\partial}{\\partial z}\\left(x^2y+z\\right)',
    );
    expect(buildPartialDerivativeLatex({ bodyLatex: '\\theta^2+x\\theta', variable: 'theta' })).toBe(
      '\\frac{\\partial}{\\partial \\theta}\\left(\\theta^2+x\\theta\\right)',
    );
    expect(buildPartialDerivativeLatex({
      bodyLatex: 'x^3y^2+z',
      variable: 'x',
      operatorLatex: '\\frac{\\partial^3}{\\partial x\\partial y^2}',
    })).toBe('\\frac{\\partial^{3}}{\\partial x\\partial y^{2}}\\left(x^3y^2+z\\right)');
    expect(buildPartialDerivativeLatex({
      bodyLatex: '∂/∂y(x^2y+y^3)',
      variable: 'x',
    })).toBe('\\frac{\\partial}{\\partial y}\\left(x^2y+y^3\\right)');
    expect(buildPartialDerivativeLatex({ bodyLatex: 'xy', variable: 'xy' })).toBe('');
  });

  it('returns a controlled error when the body is empty', () => {
    const result = evaluateCalculusPartialDerivative({ bodyLatex: '', variable: 'x' });

    expect(result.error).toContain('multivariable expression');
  });

  it('evaluates first-order explicit multivariable partial derivatives', () => {
    const resultX = evaluateCalculusPartialDerivative({
      bodyLatex: 'x^2y+y^3',
      variable: 'x',
    });
    const resultY = evaluateCalculusPartialDerivative({
      bodyLatex: 'x^2y+y^3',
      variable: 'y',
    });
    const resultTheta = evaluateCalculusPartialDerivative({
      bodyLatex: '\\theta^2+x\\theta',
      variable: 'theta',
    });

    expect(resultX.error).toBeUndefined();
    expect(resultX.exactLatex?.replaceAll(' ', '')).toContain('2xy');
    expect(resultY.error).toBeUndefined();
    expect(resultY.exactLatex?.replaceAll(' ', '')).toContain('x^2+3y^2');
    expect(resultTheta.error).toBeUndefined();
    expect(resultTheta.exactLatex).toContain('\\theta');
  });
});
