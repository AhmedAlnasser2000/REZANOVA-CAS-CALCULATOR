import { describe, expect, it } from 'vitest';
import {
  buildDerivativeAtPointLatex,
  buildDerivativeLatex,
  buildIntegralLatex,
  buildLimitLatex,
  buildWorkbenchExpression,
  cycleLimitTargetKind,
  DEFAULT_DERIVATIVE_POINT_WORKBENCH,
  DEFAULT_DERIVATIVE_WORKBENCH,
  DEFAULT_INTEGRAL_WORKBENCH,
  DEFAULT_LIMIT_WORKBENCH,
} from './calculus-workbench';

describe('calculus workbench builders', () => {
  it('builds grouped derivative latex', () => {
    expect(buildDerivativeLatex('x^3+2x')).toBe('\\frac{d}{dx}\\left(x^3+2x\\right)');
  });

  it('builds derivative-at-point latex when the point is numeric', () => {
    expect(buildDerivativeAtPointLatex('x^2', '3')).toBe(
      '\\left.\\frac{d}{dx}\\left(x^2\\right)\\right|_{x=3}',
    );
    expect(buildDerivativeAtPointLatex('x^2', '-')).toBe('');
  });

  it('requires numeric bounds for definite integrals', () => {
    expect(
      buildIntegralLatex({
        kind: 'definite',
        bodyLatex: '\\sin(x^2)',
        lower: '0',
        upper: '1',
      }),
    ).toBe('\\int_{0}^{1} \\sin(x^2)\\,dx');

    expect(
      buildIntegralLatex({
        kind: 'definite',
        bodyLatex: '\\sin(x^2)',
        lower: '0',
        upper: '-',
      }),
    ).toBe('');
  });

  it('builds limit latex and preserves direction metadata', () => {
    expect(
      buildLimitLatex({
        bodyLatex: '\\frac{\\sin(x)}{x}',
        target: '0',
        direction: 'left',
        targetKind: 'finite',
      }),
    ).toBe('\\lim_{x\\to 0}\\left(\\frac{\\sin(x)}{x}\\right)');

    expect(
      buildLimitLatex({
        bodyLatex: '\\frac{3x^2+1}{2x^2-5}',
        target: '0',
        direction: 'two-sided',
        targetKind: 'posInfinity',
      }),
    ).toBe('\\lim_{x\\to \\infty}\\left(\\frac{3x^2+1}{2x^2-5}\\right)');

    expect(
      buildWorkbenchExpression(
        'limit',
        DEFAULT_DERIVATIVE_WORKBENCH,
        DEFAULT_DERIVATIVE_POINT_WORKBENCH,
        DEFAULT_INTEGRAL_WORKBENCH,
        {
          ...DEFAULT_LIMIT_WORKBENCH,
          bodyLatex: '\\frac{\\sin(x)}{x}',
          target: '0',
          direction: 'left',
          targetKind: 'finite',
        },
      ),
    ).toEqual({
      latex: '\\lim_{x\\to 0}\\left(\\frac{\\sin(x)}{x}\\right)',
      limitDirection: 'left',
    });
  });

  it('cycles the limit target kind through finite and infinities', () => {
    expect(cycleLimitTargetKind('finite')).toBe('posInfinity');
    expect(cycleLimitTargetKind('posInfinity')).toBe('negInfinity');
    expect(cycleLimitTargetKind('negInfinity')).toBe('finite');
  });
});
