import { describe, expect, it } from 'vitest';
import { solveParameterizedRationalEquation } from './equation-parameterized-rational';

function expectSuccess(latex: string, target: string) {
  const result = solveParameterizedRationalEquation(latex, target);
  if (result.kind !== 'success') {
    throw new Error(`Expected success, received ${result.reason}: ${result.message}`);
  }
  expect(result.kind).toBe('success');
  return result;
}

function expectUnsupported(latex: string, target: string) {
  const result = solveParameterizedRationalEquation(latex, target);
  if (result.kind !== 'unsupported') {
    throw new Error(`Expected unsupported, received ${result.exactLatex}`);
  }
  expect(result.kind).toBe('unsupported');
  return result;
}

describe('solveParameterizedRationalEquation', () => {
  it('clears a target denominator and preserves original and derived facts', () => {
    const result = expectSuccess('\\frac{1}{z-a}=b', 'z');

    expect(result.exactLatex).toBe('z=\\frac{ab+1}{b}');
    expect(result.exactSupplementLatex).toEqual(['z-a\\ne0', 'b\\ne0']);
    expect(result.detailSections.some((section) => section.title === 'Parameterized Rational Solve')).toBe(true);
  });

  it('solves a rational equation with a linear target numerator', () => {
    const result = expectSuccess('\\frac{z+1}{z-a}=2', 'z');

    expect(result.exactLatex).toBe('z=2a+1');
    expect(result.exactSupplementLatex).toEqual(['z-a\\ne0']);
    expect(result.clearedEquationLatex).toContain('2a-z+1=0');
  });

  it('keeps nonzero coefficient facts after LCD clearing', () => {
    const result = expectSuccess('\\frac{z-a}{z+b}=c', 'z');

    expect(result.exactLatex).toBe('z=\\frac{bc+a}{1-c}');
    expect(result.exactSupplementLatex).toEqual(['b+z\\ne0', '1-c\\ne0']);
  });

  it('delegates LCD sums to the quadratic parameterized solver', () => {
    const result = expectSuccess('\\frac{1}{z-a}+\\frac{1}{z+b}=c', 'z');

    expect(result.exactLatex).toContain('z\\in');
    expect(result.exactLatex).toContain('\\sqrt');
    expect(result.exactSupplementLatex).toContain('z-a\\ne0');
    expect(result.exactSupplementLatex).toContain('b+z\\ne0');
    expect(result.exactSupplementLatex).toContain('c\\ne0');
    expect(result.detailSections[1].title).toBe('Parameterized Quadratic Solve');
  });

  it('clears generated rational equations with exponential parameter coefficients', () => {
    const result = expectSuccess('\\frac{1}{z-a}=e^{b}', 'z');

    expect(result.exactLatex).toContain('z=');
    expect(result.exactLatex).toContain('a');
    expect(result.exactSupplementLatex).toEqual(['z-a\\ne0']);
  });

  it('preserves case-sensitive targets and parameters', () => {
    const result = expectSuccess('\\frac{K}{K-k}=2', 'K');

    expect(result.exactLatex).toBe('K=2k');
    expect(result.exactSupplementLatex).toEqual(['K-k\\ne0']);
    expect(result.parameterNames).toEqual(['k']);
  });

  it('rejects raw adjacent-letter products until variable hints can explain them', () => {
    const result = expectUnsupported('\\frac{1}{xz}=a', 'z');

    expect(result.reason).toBe('ambiguous-adjacent-product');
    expect(result.message).toContain('explicit multiplication');
  });

  it('stops cleared equations above the degree-2 cap', () => {
    const result = expectUnsupported(
      '\\frac{1}{z-a}+\\frac{1}{z-b}+\\frac{1}{z-c}=d',
      'z',
    );

    expect(result.reason).toBe('cleared-degree-limit');
  });

  it('stops target-inside-function rational shapes for later families', () => {
    const result = expectUnsupported('\\frac{1}{\\sin\\left(z\\right)}=a', 'z');

    expect(result.reason).toBe('target-in-unsupported-operation');
  });

  it('stops nested target denominators cleanly', () => {
    const result = expectUnsupported('\\frac{1}{1+\\frac{1}{z-a}}=b', 'z');

    expect(result.reason).toBe('nested-denominator');
  });
});
