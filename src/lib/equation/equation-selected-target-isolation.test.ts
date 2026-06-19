import { describe, expect, it } from 'vitest';
import { createEquationSelectedTargetSearchTrace } from './equation-target-shape';
import {
  isolateSelectedTargetEquation,
  solveSelectedTargetIsolationEquation,
} from './equation-selected-target-isolation';

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

function expectIsolateSuccess(latex: string, target: string) {
  const result = isolateSelectedTargetEquation(latex, target, 'rad', {
    allowGeneratedImplicitProducts: true,
  });
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`Expected isolate success, got ${result.reason}: ${result.message}`);
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

  it('records generated-handoff route skips and the winning delegated family', () => {
    const trace = createEquationSelectedTargetSearchTrace();
    const result = solveSelectedTargetIsolationEquation(
      '\\frac{\\sin(z+a)}{b}+c=d',
      'z',
      'rad',
      {
        allowGeneratedImplicitProducts: true,
        searchTrace: trace.record,
      },
    );

    expect(result.kind).toBe('success');
    expect(trace.events).toContainEqual(expect.objectContaining({
      kind: 'profile',
      phase: 'generated-handoff',
    }));
    expect(trace.events).toContainEqual({
      kind: 'family-skipped',
      phase: 'generated-handoff',
      family: 'polynomial',
    });
    expect(trace.events).toContainEqual({
      kind: 'family-attempted',
      phase: 'generated-handoff',
      family: 'trig',
    });
    expect(trace.events).toContainEqual({
      kind: 'family-success',
      phase: 'generated-handoff',
      family: 'trig',
    });
  });
});

describe('isolateSelectedTargetEquation', () => {
  it('returns textbook formulas for already-isolated selected-target powers', () => {
    const direct = expectIsolateSuccess('u=a', 'u');
    const square = expectIsolateSuccess('u^2=a', 'u');
    const cube = expectIsolateSuccess('u^3=a', 'u');
    const quartic = expectIsolateSuccess('u^4=a', 'u');

    expect(direct.exactLatex).toBe('u=a');
    expect(square.exactLatex).toBe('u=\\pm \\sqrt{a}');
    expect(square.detailSections.flatMap((section) => section.lines).join(' ')).toContain('Formula branches: u=-\\sqrt{a}, u=\\sqrt{a}');
    expect(square.exactSupplementLatex).toContain('a\\ge0');
    expect(cube.exactLatex).toBe('u=\\sqrt[3]{a}');
    expect(quartic.exactLatex).toBe('u=\\pm \\sqrt[4]{a}');
    expect(quartic.exactSupplementLatex).toContain('a\\ge0');
  });

  it('keeps isolate mode as formula rearrangement instead of broad solver delegation', () => {
    const result = expectIsolateSuccess('b^2+c^4v^3=uy\\sqrt{k}', 'v');

    expect(result.generatedEquationLatex).toContain('v^3=');
    expect(result.exactLatex).toContain('v=\\sqrt[3]');
    expect(result.exactSupplementLatex).toContain('c^4\\ne0');
    expect(result.detailSections.some((section) => section.title === 'Target Isolation')).toBe(true);
    expect(result.detailSections.some((section) => section.title === 'Algebraic Isolation')).toBe(false);
    expect(result.detailSections.some((section) => section.title.includes('Exp/Log'))).toBe(false);
  });

  it('leaves target-containing denominator isolation deferred', () => {
    const result = isolateSelectedTargetEquation('\\frac{b}{\\sqrt{a+c+v+x}}=u^2', 'x', 'rad', {
      allowGeneratedImplicitProducts: true,
    });

    expect(result.kind).toBe('unsupported');
    if (result.kind !== 'unsupported') {
      throw new Error(`Expected denominator stop, got ${result.exactLatex}`);
    }
    expect(result.reason).toBe('target-in-denominator');
  });
});
