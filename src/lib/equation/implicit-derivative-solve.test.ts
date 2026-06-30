import { describe, expect, it } from 'vitest';
import { solveImplicitDerivativePlaceholder } from './implicit-derivative-solve';

function solve(differentiatedRelationLatex: string) {
  return solveImplicitDerivativePlaceholder({
    differentiatedRelationLatex,
    derivativePlaceholder: 'u',
    displayDerivativeLatex: '\\frac{dy}{dx}',
  });
}

describe('solveImplicitDerivativePlaceholder', () => {
  it('maps an Equation-isolated placeholder to dy/dx', () => {
    const result = solve('2x+2y u=0');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error(result.message);
    }

    expect(result.placeholderExactLatex).toBe('u=\\frac{-x}{y}');
    expect(result.exactLatex).toBe('\\frac{dy}{dx}=\\frac{-x}{y}');
    expect(result.rhsLatex).toBe('\\frac{-x}{y}');
    expect(result.exactSupplementLatex).toEqual(['2y\\ne0']);
    expect(result.detailSections[0]?.title).toBe('Implicit Derivative Solve');
    expect(result.detailSections[0]?.lines.join(' ')).toContain('Mapped result: \\frac{dy}{dx}=\\frac{-x}{y}');
  });

  it('solves the xy plus sin y textbook implicit derivative relation', () => {
    const result = solve('y+x u+\\cos(y)u=1');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error(result.message);
    }

    expect(result.exactLatex).toBe('\\frac{dy}{dx}=\\frac{1-y}{x+\\cos(y)}');
    expect(result.exactSupplementLatex).toEqual(['x+\\cos(y)\\ne0']);
  });

  it('returns a controlled stop when the placeholder is missing', () => {
    const result = solve('x+y=0');

    expect(result.kind).toBe('unsupported');
    if (result.kind !== 'unsupported') {
      throw new Error('Expected unsupported result');
    }

    expect(result.reason).toBe('placeholder-not-found');
    expect(result.message).toContain('Selected target u was not found');
  });

  it('rejects nonlinear derivative branches instead of choosing one', () => {
    const result = solve('u^2+x=0');

    expect(result.kind).toBe('unsupported');
    if (result.kind !== 'unsupported') {
      throw new Error('Expected unsupported result');
    }

    expect(result.reason).toBe('nonlinear-derivative');
    expect(result.detailSections?.[0]?.lines.join(' ')).toContain('Equation output:');
  });

  it('validates the internal placeholder and display derivative', () => {
    const invalidPlaceholder = solveImplicitDerivativePlaceholder({
      differentiatedRelationLatex: 'u+x=0',
      derivativePlaceholder: 'dy',
      displayDerivativeLatex: '\\frac{dy}{dx}',
    });
    const invalidDisplay = solveImplicitDerivativePlaceholder({
      differentiatedRelationLatex: 'u+x=0',
      derivativePlaceholder: 'u',
      displayDerivativeLatex: '',
    });

    expect(invalidPlaceholder).toEqual({
      kind: 'unsupported',
      reason: 'invalid-placeholder',
      message: 'Implicit differentiation needs a single-letter internal derivative placeholder.',
    });
    expect(invalidDisplay).toEqual({
      kind: 'unsupported',
      reason: 'invalid-display-derivative',
      message: 'Implicit differentiation needs a display derivative such as dy/dx.',
    });
  });
});
