import { describe, expect, it } from 'vitest';
import { solveEquationExactQuadraticBoundary } from './exact-polynomial-boundary';

const one = { numerator: 1, denominator: 1 };

describe('solveEquationExactQuadraticBoundary', () => {
  it('solves rational real quadratic roots through the Equation-owned typed boundary', () => {
    const result = solveEquationExactQuadraticBoundary({
      variable: '\\lambda',
      coefficients: {
        quadratic: one,
        linear: { numerator: -4, denominator: 1 },
        constant: { numerator: 3, denominator: 1 },
      },
      source: 'matrix-eigen-2x2',
    });

    expect(result).toMatchObject({
      kind: 'success',
      equationLatex: '\\lambda^{2}-4\\lambda+3=0',
      roots: [
        { value: { numerator: 1, denominator: 1 }, latex: '1' },
        { value: { numerator: 3, denominator: 1 }, latex: '3' },
      ],
    });
  });

  it('returns controlled stops for irrational real and complex roots', () => {
    expect(solveEquationExactQuadraticBoundary({
      variable: '\\lambda',
      coefficients: {
        quadratic: one,
        linear: { numerator: 0, denominator: 1 },
        constant: { numerator: -2, denominator: 1 },
      },
      source: 'matrix-eigen-2x2',
    })).toMatchObject({
      kind: 'unsupported',
      reason: 'irrational-real-roots',
      equationLatex: '\\lambda^{2}-2=0',
    });

    expect(solveEquationExactQuadraticBoundary({
      variable: '\\lambda',
      coefficients: {
        quadratic: one,
        linear: { numerator: 0, denominator: 1 },
        constant: { numerator: 1, denominator: 1 },
      },
      source: 'matrix-eigen-2x2',
    })).toMatchObject({
      kind: 'unsupported',
      reason: 'complex-roots',
      equationLatex: '\\lambda^{2}+1=0',
    });
  });
});
