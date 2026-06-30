import { describe, expect, it } from 'vitest';
import { runEquationMode } from '../equation';
import { collectOutcomeText, makeRequest } from './test-support';

function solve(equationLatex: string, target = 'x', extra: Partial<Parameters<typeof runEquationMode>[0]> = {}) {
  return runEquationMode({
    ...makeRequest(),
    equationScreen: 'symbolic',
    equationLatex,
    equationSolveTarget: target,
    equationAnswerMode: 'exact',
    equationDomainIntent: 'real',
    angleUnit: 'rad',
    ...extra,
  });
}

function expectExactPeriodic(result: ReturnType<typeof solve>) {
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error('Expected exact periodic success');
  }
  expect(result.solutionKind).not.toBe('approximate-numeric');
  expect(result.numericMethod).toBeUndefined();
  expect(collectOutcomeText(result)).not.toContain('Real nonlinear bounded numeric search');
}

describe('Equation periodic preimage substrate', () => {
  it('reduces sine quotient-zero equations to compact periodic families with the pole excluded', () => {
    const result = solve('\\frac{\\sin(x)}{x}=0');

    expectExactPeriodic(result);
    if (result.kind !== 'success') {
      throw new Error('Expected exact periodic success');
    }
    const text = collectOutcomeText(result);
    expect(text).toContain('\\pi n');
    expect(text).toContain('x\\ne0');
    expect(result.detailSections?.some((section) => section.title === 'Quotient Zero Reduction')).toBe(true);
  });

  it('keeps symbolic denominator exclusions for parameter quotient-zero trig families', () => {
    const result = solve('\\frac{\\sin(x)}{c}=0');

    expectExactPeriodic(result);
    if (result.kind !== 'success') {
      throw new Error('Expected exact periodic success');
    }
    const text = collectOutcomeText(result);
    expect(text).toContain('\\pi n');
    expect(text).toContain('c\\ne0');
  });

  it('continues nested periodic preimages through sine and logarithm carriers when bounded', () => {
    const result = solve('\\tan\\left(\\sin\\left(\\ln(x)+1\\right)\\right)=1');

    expectExactPeriodic(result);
    if (result.kind !== 'success') {
      throw new Error('Expected exact periodic success');
    }
    const text = collectOutcomeText(result);
    expect(text).toContain('\\pi');
    expect(text).toContain('x>0');
    expect(text).toContain('k\\in\\mathbb{Z}');
    expect(result.exactLatex).toMatch(/e\^|\\exp/);
  });

  it('keeps supported nonlinear periodic carriers exact instead of numeric-enumerating them', () => {
    const result = solve('\\sin(x^2)=0');

    expectExactPeriodic(result);
    if (result.kind !== 'success') {
      throw new Error('Expected exact periodic success');
    }
    const text = collectOutcomeText(result);
    expect(text).toContain('\\pi');
    expect(text).not.toContain('Accepted 2470 validated real roots');
  });
});
