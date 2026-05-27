import { describe, expect, it } from 'vitest';
import { solveEquationAlgebraicIsolation } from './equation-algebraic-isolation';

function expectSuccess(latex: string, target: string) {
  const result = solveEquationAlgebraicIsolation(latex, target, {
    allowGeneratedImplicitProducts: true,
  });
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`Expected success, got ${result.reason}: ${result.message}`);
  }
  return result;
}

function expectUnsupported(latex: string, target: string) {
  const result = solveEquationAlgebraicIsolation(latex, target, {
    allowGeneratedImplicitProducts: true,
  });
  expect(result.kind).toBe('unsupported');
  if (result.kind !== 'unsupported') {
    throw new Error(`Expected unsupported, got ${result.exactLatex}`);
  }
  return result;
}

describe('solveEquationAlgebraicIsolation', () => {
  it('solves selected-target cube-root isolation with symbolic parameters', () => {
    const result = expectSuccess('34x^3-z^2=25', 'x');

    expect(result.exactLatex).toContain('x=\\sqrt[3]');
    expect(result.exactLatex).toContain('\\frac{z^2}{34}');
    expect(result.exactLatex).toContain('\\frac{25}{34}');
    expect(result.detailSections.some((section) => section.title === 'Algebraic Isolation')).toBe(true);
    expect(result.exactSupplementLatex).toBeUndefined();
  });

  it('solves shifted odd and even selected-target powers', () => {
    const cubic = expectSuccess('(x+a)^3=b', 'x');
    expect(cubic.exactLatex).toContain('\\sqrt[3]{b}-a');
    expect(cubic.exactSupplementLatex).toBeUndefined();

    const quartic = expectSuccess('(x+a)^4=b', 'x');
    expect(quartic.exactLatex).toContain('-a-\\sqrt[4]{b}');
    expect(quartic.exactLatex).toContain('\\sqrt[4]{b}-a');
    expect(quartic.exactSupplementLatex).toEqual(['b\\ge0']);
  });

  it('preserves target-free shell facts while isolating even powers', () => {
    const result = expectSuccess('a(x+b)^4+c=d', 'x');

    expect(result.exactLatex).toContain('-b');
    expect(result.exactLatex).toContain('\\sqrt[4]{\\frac{d-c}{a}}');
    expect(result.exactSupplementLatex).toContain('a\\ne0');
    expect(result.exactSupplementLatex).toContain('\\frac{d-c}{a}\\ge0');
  });

  it('delegates bounded factorable degree-four equations', () => {
    const result = expectSuccess('x^4-5x^2+4=0', 'x');

    expect(result.exactLatex).toContain('-2');
    expect(result.exactLatex).toContain('2');
    expect(result.detailSections.flatMap((section) => section.lines).join(' ')).toContain('factorable polynomial');
  });

  it('caps general symbolic cubic and quartic formulas cleanly', () => {
    const cubic = expectUnsupported('a x^3+b x+c=0', 'x');
    expect(cubic.reason).toBe('formula-size-limit');
    expect(cubic.message).toContain('readback cap');

    const quartic = expectUnsupported('a x^4+b x^3+c x^2+d x+e=0', 'x');
    expect(quartic.reason).toBe('formula-size-limit');
  });
});
