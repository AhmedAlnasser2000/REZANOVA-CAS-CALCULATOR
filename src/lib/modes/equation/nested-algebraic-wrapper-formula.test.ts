import { describe, expect, it } from 'vitest';
import { buildDisplayBlocks } from '../../display/result/display-blocks';
import { runEquationMode } from '../equation';
import { makeRequest } from './test-support';

function solve(equationLatex: string, domain: 'real' | 'complex' = 'real') {
  return runEquationMode({
    ...makeRequest(),
    equationScreen: 'symbolic',
    equationLatex,
    equationSolveTarget: 'z',
    equationDomainIntent: domain,
  });
}

function expectSuccess(equationLatex: string) {
  const result = solve(equationLatex);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`Expected success for ${equationLatex}, received ${result.kind}`);
  }
  return result;
}

function expectCaseMath(result: ReturnType<typeof expectSuccess>) {
  expect(buildDisplayBlocks(result).find((block) => block.id === 'answer')?.renderKind).toBe('caseMath');
}

function expectNestedFormula(result: ReturnType<typeof expectSuccess>) {
  expect(result.answerDomain).toBe('real');
  expectCaseMath(result);
  expect(result.detailSections?.some((section) => section.title === 'Nested Formula Cases')).toBe(true);
  expect(result.detailSections?.some((section) => section.title === 'Composition Branches')).toBe(true);
}

function compositionBranchText(result: ReturnType<typeof expectSuccess>) {
  return result.detailSections
    ?.find((section) => section.title === 'Composition Branches')
    ?.lines.join(' ') ?? '';
}

function expectNoNestedFormula(result: unknown) {
  const text = JSON.stringify(result);
  expect(text).not.toContain('Nested Formula Cases');
  expect(text).not.toContain('Nested Branch');
  expect(text).not.toContain('Real Cardano Cases');
  expect(text).not.toContain('Real Ferrari Cases');
}

describe('Equation Real nested algebraic wrapper formulas', () => {
  it('solves nested square-root cubic branches through Real Cardano formula cases', () => {
    const result = expectSuccess('\\sqrt{\\sqrt{z^3+z+1}}=b');

    expectNestedFormula(result);
    expect(compositionBranchText(result)).toContain('z^3+z+1=b^4');
    expect(result.exactSupplementLatex).toContain('b\\ge0');
    expect(result.detailSections?.some((section) =>
      section.title === 'Nested Branch 1 - Substituted Real Cardano Values')).toBe(true);
  });

  it('solves nested absolute-value cubic branches through grouped Real Cardano cases', () => {
    const result = expectSuccess('\\sqrt{\\left|z^3+z+1\\right|}=b');

    expectNestedFormula(result);
    expect(compositionBranchText(result)).toContain('z^3+z+1=b^2');
    expect(compositionBranchText(result)).toContain('z^3+z+1=-\\left(b^2\\right)');
    expect(result.exactSupplementLatex).toContain('b\\ge0');
    expect(result.detailSections?.some((section) =>
      section.title === 'Nested Branch 1 - Substituted Real Cardano Values')).toBe(true);
    expect(result.detailSections?.some((section) =>
      section.title === 'Nested Branch 2 - Substituted Real Cardano Values')).toBe(true);
  });

  it('solves nested nth-root quartic branches through Real Ferrari formula cases', () => {
    const result = expectSuccess('\\sqrt[3]{\\sqrt{z^4+z+1}}=b');

    expectNestedFormula(result);
    expect(compositionBranchText(result)).toContain('z^4+z+1=b^6');
    expect(result.detailSections?.some((section) =>
      section.title === 'Nested Branch 1 - Substituted Real Ferrari Values')).toBe(true);
  });

  it('keeps Complex, depth-three, non-algebraic, and additive mixed-carrier boundaries deferred', () => {
    const complex = solve('\\sqrt{\\sqrt{z^3+z+1}}=b', 'complex');
    const depthThree = solve('\\sqrt{\\sqrt{\\sqrt{z^3+z+1}}}=b');
    const nonAlgebraic = solve('\\sin\\left(\\tan\\left(z\\right)\\right)=a');
    const additiveMixed = solve('\\sin(z)+\\sqrt{z}=a');

    for (const result of [complex, depthThree, nonAlgebraic, additiveMixed]) {
      expect(result.kind).toBe('error');
      expectNoNestedFormula(result);
    }
  });
});
