import { describe, expect, it } from 'vitest';
import { solveComplexSpecialFormRootsEquation } from '../../equation/complex/special-form-roots';
import { runEquationMode } from '../equation';
import { makeRequest } from './test-support';

function solveEquation(
  equationLatex: string,
  domain: 'real' | 'complex' = 'complex',
) {
  return runEquationMode({
    ...makeRequest(),
    angleUnit: 'rad',
    equationScreen: 'symbolic',
    equationLatex,
    equationSolveTarget: 'z',
    equationDomainIntent: domain,
  });
}

function expectNoFormulaLeak(result: unknown) {
  const text = JSON.stringify(result);
  expect(text).not.toContain('Real Cardano Cases');
  expect(text).not.toContain('Real Ferrari Cases');
  expect(text).not.toContain('Trig Formula Cases');
  expect(text).not.toContain('Nested Formula Cases');
  expect(text).not.toContain('RootOf');
}

function expectComplexSpecialFormSuccess(latex: string) {
  const result = solveComplexSpecialFormRootsEquation(latex, 'x');
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`Expected Complex special-form success for ${latex}`);
  }
  expect(result.answerDomain).toBe('complex');
  return result;
}

describe('Equation Complex wrapper role and power policy lock', () => {
  it('keeps Real wrapper indices separate from inner cubic and quartic formula methods', () => {
    const cubicCarrier = solveEquation(String.raw`\sqrt[5]{z^3+z+1}=b`, 'real');
    const quarticCarrier = solveEquation(String.raw`\sqrt[7]{z^4+z+1}=b`, 'real');

    expect(cubicCarrier.kind).toBe('success');
    expect(quarticCarrier.kind).toBe('success');
    if (cubicCarrier.kind !== 'success' || quarticCarrier.kind !== 'success') {
      throw new Error('Expected Real nth-root wrapper policy examples to solve');
    }

    for (const result of [cubicCarrier, quarticCarrier]) {
      expect(result.answerDomain).toBe('real');
      expect(result.detailSections?.some((section) => section.title === 'Nth-Root Formula Cases')).toBe(true);
      expect(result.exactLatex).not.toContain('PrincipalRoot');
      expect(JSON.stringify(result)).not.toContain('Complex Power Definitions');
      expect(JSON.stringify(result)).not.toContain('RootOf');
    }

    expect(cubicCarrier.detailSections?.some((section) =>
      section.title === 'Nth-Root Branch 1 - Substituted Real Cardano Values')).toBe(true);
    expect(quarticCarrier.detailSections?.some((section) =>
      section.title === 'Nth-Root Branch 1 - Substituted Real Ferrari Values')).toBe(true);
  });

  it('keeps Complex compact higher-index powers on PrincipalRoot omega readback', () => {
    const shifted = expectComplexSpecialFormSuccess('(x+c)^5=a');
    const scaled = expectComplexSpecialFormSuccess('(2*x-1)^6=a');

    expect(shifted.exactLatex).toContain(String.raw`\operatorname{PrincipalRoot}_{5}\left(a\right)\omega_{0}-c`);
    expect(shifted.branchReadback?.branchesLatex).toHaveLength(5);
    expect(scaled.exactLatex).toContain(String.raw`\operatorname{PrincipalRoot}_{6}\left(a\right)\omega_{0}`);
    expect(scaled.branchReadback?.branchesLatex).toHaveLength(6);

    for (const result of [shifted, scaled]) {
      const text = JSON.stringify(result);
      expect(result.detailSections?.some((section) => section.title === 'Complex Power Definitions')).toBe(true);
      expect(text).toContain('PrincipalRoot');
      expect(text).not.toContain('Cardano');
      expect(text).not.toContain('Ferrari');
      expect(text).not.toContain('RootOf');
    }
  });

  it('keeps Complex generated cubic and quartic wrapper formulas blocked while degree-2 preimage wrappers stay live', () => {
    const squarePreimage = solveEquation(String.raw`2e^{z^2}+1=3`, 'complex');
    const cubicLog = solveEquation(String.raw`\ln\left(z^3+z+1\right)=1+\imaginaryI`, 'complex');
    const quarticTrig = solveEquation(String.raw`\sin\left(z^4+z+1\right)=\imaginaryI`, 'complex');

    expect(squarePreimage.kind).toBe('success');
    if (squarePreimage.kind !== 'success') {
      throw new Error('Expected Complex degree-2 preimage wrapper to remain live');
    }
    expect(squarePreimage.answerDomain).toBe('complex');
    expect(squarePreimage.detailSections?.some((section) => section.title === 'Complex Preimage Route')).toBe(true);
    expectNoFormulaLeak(squarePreimage);

    for (const result of [cubicLog, quarticTrig]) {
      expect(result.kind).toBe('error');
      expectNoFormulaLeak(result);
      expect(JSON.stringify(result)).not.toContain('Complex Power Definitions');
    }
  });
});
