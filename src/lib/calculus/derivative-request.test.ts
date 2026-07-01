import { describe, expect, it } from 'vitest';
import { parseNaturalDerivativeRequest } from './derivative-request';

describe('natural derivative request parser', () => {
  it('parses ordinary and higher-order derivative requests', () => {
    expect(parseNaturalDerivativeRequest('d/dx(sin(x)+cos(x))', 'derivative')).toMatchObject({
      ok: true,
      request: {
        bodyLatex: 'sin(x)+cos(x)',
        canonicalLatex: '\\frac{d}{dx}\\left(sin(x)+cos(x)\\right)',
        operator: {
          kind: 'derivative',
          appliedPath: ['x'],
        },
      },
    });

    expect(parseNaturalDerivativeRequest('d^4/dt^4(sin(t^2)+a*t)', 'derivative')).toMatchObject({
      ok: true,
      request: {
        bodyLatex: 'sin(t^2)+a*t',
        canonicalLatex: '\\frac{d^{4}}{dt^{4}}\\left(sin(t^2)+a*t\\right)',
        operator: {
          order: 4,
          appliedPath: ['t', 't', 't', 't'],
        },
      },
    });
  });

  it('parses first-order and mixed partial derivative requests', () => {
    expect(parseNaturalDerivativeRequest('∂/∂y(x^2y+y^3)', 'partial')).toMatchObject({
      ok: true,
      request: {
        bodyLatex: 'x^2y+y^3',
        canonicalLatex: '\\frac{\\partial}{\\partial y}\\left(x^2y+y^3\\right)',
        operator: {
          kind: 'partial',
          appliedPath: ['y'],
        },
      },
    });

    expect(parseNaturalDerivativeRequest(
      '\\frac{\\partial^3}{\\partial x\\partial y^2}\\left(x^3y^2+z\\right)',
      'partial',
    )).toMatchObject({
      ok: true,
      request: {
        bodyLatex: 'x^3y^2+z',
        canonicalLatex: '\\frac{\\partial^{3}}{\\partial x\\partial y^{2}}\\left(x^3y^2+z\\right)',
        operator: {
          order: 3,
          appliedPath: ['y', 'y', 'x'],
        },
      },
    });
  });

  it('rejects malformed natural derivative requests without treating them as bodies', () => {
    expect(parseNaturalDerivativeRequest('d^3/dx^2(x^5)', 'derivative')).toMatchObject({
      ok: false,
      looksLikeDerivativeRequest: true,
    });
    expect(parseNaturalDerivativeRequest('sin(x)+cos(x)', 'derivative')).toMatchObject({
      ok: false,
      looksLikeDerivativeRequest: false,
    });
  });
});
