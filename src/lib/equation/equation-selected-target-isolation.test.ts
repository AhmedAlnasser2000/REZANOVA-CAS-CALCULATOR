import { describe, expect, it } from 'vitest';
import { solveSelectedTargetIsolationEquation } from './equation-selected-target-isolation';

function expectSuccess(latex: string, target: string) {
  const result = solveSelectedTargetIsolationEquation(latex, target, 'rad', {
    allowGeneratedImplicitProducts: true,
  });
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`Expected success, got ${result.reason}: ${result.message}`);
  }
  return result;
}

function expectUnsupported(latex: string, target: string) {
  const result = solveSelectedTargetIsolationEquation(latex, target, 'rad', {
    allowGeneratedImplicitProducts: true,
  });
  expect(result.kind).toBe('unsupported');
  if (result.kind !== 'unsupported') {
    throw new Error(`Expected unsupported, got ${result.exactLatex}`);
  }
  return result;
}

describe('solveSelectedTargetIsolationEquation', () => {
  it('isolates an exponential target through additive and rational shells', () => {
    const result = expectSuccess('\\frac{5f+4^p}{g+v}+cx=34', 'p');

    expect(result.generatedEquationLatex).toContain('4^{p}');
    expect(result.exactLatex).toContain('p=');
    expect(result.exactLatex).toContain('\\log_{4}');
    expect(result.exactSupplementLatex).toContain('g+v\\ne0');
    expect(result.detailSections.some((section) => section.title === 'Target Isolation')).toBe(true);
  });

  it('isolates square-root and trig carriers before delegation', () => {
    const radical = expectSuccess('\\sqrt{z+a}+bx=c', 'z');
    expect(radical.generatedEquationLatex).toContain('\\sqrt');
    expect(radical.exactLatex).toContain('z=');

    const trig = expectSuccess('\\frac{\\sin(z+a)}{b}+c=d', 'z');
    expect(trig.generatedEquationLatex).toContain('\\sin');
    expect(trig.exactLatex).toContain('z\\in');
    expect(trig.exactSupplementLatex).toContain('b\\ne0');
  });

  it('hands isolated selected-target powers to algebraic isolation', () => {
    const result = expectSuccess('\\frac{34x^3-z^2}{a}=25', 'x');

    expect(result.generatedEquationLatex).toContain('x^3');
    expect(result.exactLatex).toContain('x=\\sqrt[3]');
    expect(result.exactSupplementLatex).toContain('a\\ne0');
    expect(result.detailSections.some((section) => section.title === 'Target Isolation')).toBe(true);
    expect(result.detailSections.some((section) => section.title === 'Algebraic Isolation')).toBe(true);
  });

  it('isolates logarithmic and linear shells', () => {
    const logarithmic = expectSuccess('\\ln(z+a)+b=c', 'z');
    expect(logarithmic.generatedEquationLatex).toContain('\\ln');
    expect(logarithmic.exactLatex).toContain('z=');

    const linear = expectSuccess('\\frac{a z+b}{c+d}=k', 'z');
    expect(linear.exactLatex).toContain('z=');
    expect(linear.exactSupplementLatex).toContain('c+d\\ne0');
  });

  it('isolates explicit named targets through the same generated equations', () => {
    const result = expectSuccess('\\frac{5f+4^{@mass}}{g+v}+cx=34', 'mass');

    expect(result.generatedEquationLatex).toContain('4^{\\mathrm{mass}}=');
    expect(result.exactLatex).toContain('mass=');
    expect(result.exactLatex).toContain('\\log_{4}');
  });

  it('stops on multiple selected-target islands and target shell factors', () => {
    expect(expectUnsupported('z+e^z=a', 'z').reason).toBe('multiple-target-islands');
    expect(expectUnsupported('a^z+b^z=c', 'z').reason).toBe('multiple-target-islands');
    expect(expectUnsupported('z\\sin(z)=a', 'z').reason).toBe('target-in-shell-factor');
  });

  it('keeps raw adjacent products guarded unless acknowledged by Equation target resolution', () => {
    const result = solveSelectedTargetIsolationEquation('az+1=3', 'z');

    expect(result.kind).toBe('unsupported');
    if (result.kind !== 'unsupported') {
      throw new Error('Expected adjacent-product stop');
    }
    expect(result.reason).toBe('ambiguous-adjacent-product');
  });
});
