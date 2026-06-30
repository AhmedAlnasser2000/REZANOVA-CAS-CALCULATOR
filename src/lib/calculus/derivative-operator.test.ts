import { describe, expect, it } from 'vitest';
import {
  defaultDerivativeOperatorInput,
  formatDerivativeAppliedPath,
  formatDerivativeOperator,
  formatDerivativeWrittenFactors,
  parseDerivativeOperator,
} from './derivative-operator';

describe('derivative operator parser', () => {
  it('parses ordinary first-order and higher-order operators', () => {
    expect(parseDerivativeOperator('d/dx', 'derivative')).toMatchObject({
      ok: true,
      operator: {
        kind: 'derivative',
        order: 1,
        canonicalLatex: '\\frac{d}{dx}',
        appliedPath: ['x'],
      },
    });
    expect(parseDerivativeOperator('d^3/dx^3', 'derivative')).toMatchObject({
      ok: true,
      operator: {
        kind: 'derivative',
        order: 3,
        canonicalLatex: '\\frac{d^{3}}{dx^{3}}',
        appliedPath: ['x', 'x', 'x'],
      },
    });
    expect(parseDerivativeOperator('\\frac{d^{3}}{dt^{3}}', 'derivative')).toMatchObject({
      ok: true,
      operator: {
        kind: 'derivative',
        order: 3,
        writtenFactors: [{ variable: 't', exponent: 3 }],
      },
    });
  });

  it('parses Greek variable names and LaTeX commands', () => {
    expect(parseDerivativeOperator('d/dtheta', 'derivative')).toMatchObject({
      ok: true,
      operator: {
        canonicalLatex: '\\frac{d}{d\\theta}',
        writtenFactors: [{ variable: 'theta', exponent: 1 }],
      },
    });
    expect(defaultDerivativeOperatorInput('partial', 'theta')).toBe('partial/partial \\theta');
  });

  it('parses first-order and compact mixed partial operators', () => {
    expect(parseDerivativeOperator('partial/partial y', 'partial')).toMatchObject({
      ok: true,
      operator: {
        kind: 'partial',
        order: 1,
        canonicalLatex: '\\frac{\\partial}{\\partial y}',
        appliedPath: ['y'],
      },
    });

    const parsed = parseDerivativeOperator(
      '\\frac{\\partial^6}{\\partial x\\partial y^3\\partial z^2}',
      'partial',
    );

    expect(parsed).toMatchObject({
      ok: true,
      operator: {
        kind: 'partial',
        order: 6,
        writtenFactors: [
          { variable: 'x', exponent: 1 },
          { variable: 'y', exponent: 3 },
          { variable: 'z', exponent: 2 },
        ],
        appliedPath: ['z', 'z', 'y', 'y', 'y', 'x'],
        canonicalLatex: '\\frac{\\partial^{6}}{\\partial x\\partial y^{3}\\partial z^{2}}',
      },
    });
  });

  it('formats rail readback for notation modes', () => {
    const parsed = parseDerivativeOperator(
      '\\frac{\\partial^6}{\\partial x\\partial y^3\\partial z^2}',
      'partial',
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    expect(formatDerivativeOperator(parsed.operator, 'rendered')).toBe('∂⁶/∂x∂y³∂z²');
    expect(formatDerivativeOperator(parsed.operator, 'plainText')).toBe(
      'partial^6/partial x partial y^3 partial z^2',
    );
    expect(formatDerivativeOperator(parsed.operator, 'latex')).toBe(
      '\\frac{\\partial^{6}}{\\partial x\\partial y^{3}\\partial z^{2}}',
    );
    expect(formatDerivativeWrittenFactors(parsed.operator)).toBe('x, y^3, z^2');
    expect(formatDerivativeAppliedPath(parsed.operator)).toBe('z → z → y → y → y → x');
  });

  it('rejects malformed, mismatched, wrong-kind, and over-cap operators', () => {
    expect(parseDerivativeOperator('', 'derivative').ok).toBe(false);
    expect(parseDerivativeOperator('d^3/dx^2', 'derivative').ok).toBe(false);
    expect(parseDerivativeOperator('d/dxy', 'derivative').ok).toBe(false);
    expect(parseDerivativeOperator('partial/partial x', 'derivative')).toMatchObject({
      ok: false,
      error: 'Use an ordinary derivative operator on this screen.',
    });
    expect(parseDerivativeOperator('d^11/dx^11', 'derivative')).toMatchObject({
      ok: false,
      error: 'Derivative order must be between 1 and 10.',
    });
  });
});
