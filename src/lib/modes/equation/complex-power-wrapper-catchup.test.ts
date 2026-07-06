import { describe, expect, it } from 'vitest';
import { runEquationMode } from '../equation';
import { makeRequest } from './test-support';

type SolveOverrides = Partial<Parameters<typeof runEquationMode>[0]>;

function solve(equationLatex: string, overrides: SolveOverrides = {}) {
  return runEquationMode({
    ...makeRequest(),
    angleUnit: 'rad',
    equationScreen: 'symbolic',
    equationLatex,
    equationSolveTarget: 'z',
    equationDomainIntent: 'complex',
    ...overrides,
  });
}

function expectComplexSuccess(equationLatex: string, overrides: SolveOverrides = {}) {
  const result = solve(equationLatex, overrides);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`Expected Complex success for ${equationLatex}, received ${result.kind}`);
  }
  expect(result.answerDomain).toBe('complex');
  return result;
}

function expectDefinitions(result: ReturnType<typeof expectComplexSuccess>) {
  const definitions = result.detailSections?.find((section) => section.title === 'Complex Power Definitions');
  expect(definitions).toBeTruthy();
  return definitions?.lines.join(' ') ?? '';
}

function expectNoRealFormulaLeak(result: unknown) {
  const text = JSON.stringify(result);
  expect(text).not.toContain('Real Cardano Cases');
  expect(text).not.toContain('Real Ferrari Cases');
  expect(text).not.toContain('Trig Formula Cases');
  expect(text).not.toContain('Nested Formula Cases');
  expect(text).not.toContain('RootOf');
}

describe('Equation Complex power wrapper catchup', () => {
  it('solves symbolic nonlinear power wrappers through compact Complex branch definitions', () => {
    const result = expectComplexSuccess('(z^2+1)^5=a');
    const definitions = expectDefinitions(result);
    const text = JSON.stringify(result);

    expect(result.branchReadback?.branchesLatex).toHaveLength(10);
    expect(definitions).toContain(String.raw`\operatorname{PrincipalRoot}_{5}\left(a\right)`);
    expect(definitions).toContain(String.raw`\omega_{4}`);
    expect(result.exactLatex).not.toContain(String.raw`\sqrt[5]{a}`);
    expect(text).not.toContain(String.raw`\ge0`);
    expect(result.detailSections?.some((section) => section.title === 'Complex Power Wrapper Solve')).toBe(true);
    expectNoRealFormulaLeak(result);
  });

  it('supports symbolic affine shells and preserves coefficient facts', () => {
    const result = expectComplexSuccess('a*(z^2+1)^3+c=d');
    const definitions = expectDefinitions(result);

    expect(result.branchReadback?.branchesLatex).toHaveLength(6);
    expect(result.exactSupplementLatex).toContain(String.raw`a\ne0`);
    expect(definitions).toContain(String.raw`\operatorname{PrincipalRoot}_{3}\left(\frac{d-c}{a}\right)`);
    expect(JSON.stringify(result)).not.toContain(String.raw`\sqrt[3]{\frac{d-c}{a}}`);
    expectNoRealFormulaLeak(result);
  });

  it('preserves rational denominator exclusions across generated Complex power branches', () => {
    const result = expectComplexSuccess('((z-1)/(z+2))^3=a');
    const definitions = expectDefinitions(result);

    expect(result.branchReadback?.branchesLatex).toHaveLength(3);
    expect(result.exactSupplementLatex?.some((fact) => fact.includes(String.raw`\mathrm{u_0}`))).toBe(true);
    expect(definitions).toContain(String.raw`\operatorname{PrincipalRoot}_{3}\left(a\right)`);
    expect(result.exactLatex).not.toContain(String.raw`\sqrt[3]{a}`);
    expectNoRealFormulaLeak(result);
  });

  it('honors Complex exact-form notation in omega definitions for explicit complex RHS values', () => {
    const rectangular = expectComplexSuccess(String.raw`(z^2+1)^3=1+\imaginaryI`, {
      complexExactForm: 'rectangular',
    });
    const cis = expectComplexSuccess(String.raw`(z^2+1)^3=1+\imaginaryI`, {
      complexExactForm: 'cis',
    });

    expect(expectDefinitions(rectangular)).toContain(String.raw`\cos\left(\frac{2\pi}{3}\right)+i\sin\left(\frac{2\pi}{3}\right)`);
    expect(expectDefinitions(rectangular)).not.toContain(String.raw`\operatorname{cis}`);
    expect(expectDefinitions(cis)).toContain(String.raw`\operatorname{cis}\left(\frac{2\pi}{3}\right)`);
    expectNoRealFormulaLeak(rectangular);
    expectNoRealFormulaLeak(cis);
  });

  it('keeps generated cubic/quartic-style formula expansion and over-cap outputs deferred', () => {
    const cubic = solve('(z^3+z+1)^5=a');
    const overCap = solve('(z^2+1)^7=a');

    for (const result of [cubic, overCap]) {
      expect(result.kind).toBe('error');
      expect(JSON.stringify(result)).toMatch(/Complex Wrapper Policy|generated branch is outside|capped at 12 visible branches|outside the supported exact families/u);
      expectNoRealFormulaLeak(result);
    }
    expect(JSON.stringify(cubic)).toContain('outside the supported exact families');
    expect(JSON.stringify(overCap)).toContain('capped at 12 visible branches');
  });

  it('keeps noncompact generated root-function wrappers outside the power-wrapper route', () => {
    const squareRoot = solve(String.raw`\sqrt{z^3+z+1}=a`);
    const nthRoot = solve(String.raw`\sqrt[3]{z^4+z+1}=a`);

    for (const result of [squareRoot, nthRoot]) {
      expect(result.kind).toBe('error');
      if (result.kind !== 'error') {
        throw new Error('Expected Complex root-wrapper boundary stop');
      }
      expect(JSON.stringify(result)).toContain('generated branch is outside');
      expect(JSON.stringify(result)).not.toContain(String.raw`\ge0`);
      expectNoRealFormulaLeak(result);
    }
  });

  it('leaves direct affine Complex special-form powers on the existing readback route', () => {
    const result = expectComplexSuccess('(z+c)^5=a');

    expect(result.exactLatex).toContain(String.raw`\operatorname{PrincipalRoot}_{5}\left(a\right)\omega_{0}-c`);
    expect(result.detailSections?.some((section) => section.title === 'Complex Special-Form Route')).toBe(true);
    expect(result.detailSections?.some((section) => section.title === 'Complex Power Wrapper Solve')).toBe(false);
    expectNoRealFormulaLeak(result);
  });
});
