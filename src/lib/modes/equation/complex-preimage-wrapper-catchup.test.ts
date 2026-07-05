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

function expectDetail(result: ReturnType<typeof expectComplexSuccess>, title: string) {
  const section = result.detailSections?.find((entry) => entry.title === title);
  expect(section).toBeTruthy();
  return section;
}

function expectNoRealFormulaSections(result: unknown) {
  const text = JSON.stringify(result);
  expect(text).not.toContain('Real Cardano Cases');
  expect(text).not.toContain('Real Ferrari Cases');
  expect(text).not.toContain('Trig Formula Cases');
  expect(text).not.toContain('Nested Formula Cases');
}

describe('Equation Complex preimage wrapper catchup', () => {
  it('solves exact-constant affine exponential wrappers through Complex preimage branches', () => {
    const affine = expectComplexSuccess(String.raw`2e^{z-1}+1=3`);
    const square = expectComplexSuccess(String.raw`2e^{z^2}+1=3`);
    const cis = expectComplexSuccess(String.raw`2e^z+1=3+2\imaginaryI`, {
      complexExactForm: 'cis',
    });

    expect(affine.exactLatex).toContain(String.raw`2\pi i k`);
    expect(affine.exactLatex).toContain('1');
    expect(square.exactLatex).toContain(String.raw`\sqrt{2\pi i k}`);
    expect(square.exactLatex).not.toContain(String.raw`\operatorname{Roots}_{2}`);
    expect(cis.exactLatex).toContain(String.raw`\operatorname{cis}`);

    for (const result of [affine, square, cis]) {
      expectDetail(result, 'Parameterized Exp/Log Solve');
      expectDetail(result, 'Complex Preimage Route');
      expect(result.exactLatex).toContain(String.raw`k\in\mathbb{Z}`);
      expectNoRealFormulaSections(result);
    }
  });

  it('solves exact-constant affine logarithmic wrappers and preserves nonzero facts', () => {
    const affine = expectComplexSuccess(String.raw`2\ln\left(z-1\right)+1=5`);
    const rational = expectComplexSuccess(String.raw`\ln\left(\frac{z-1}{z+2}\right)+1=5`);
    const baseTwo = expectComplexSuccess(String.raw`2\log_{2}\left(z-1\right)+1=5`);

    expect(affine.exactLatex).toContain(String.raw`e^{2}+1`);
    expect(affine.exactSupplementLatex).toEqual(expect.arrayContaining([
      expect.stringMatching(/z-1\\ne0|z\\ne1/u),
    ]));
    expect(rational.exactLatex).toContain(String.raw`e^{4}`);
    expect(rational.exactSupplementLatex).toEqual(expect.arrayContaining([
      expect.stringMatching(/z\+2\\ne0|z\\ne-2/u),
    ]));
    expect(rational.exactSupplementLatex).toContain(String.raw`\frac{z-1}{z+2}\ne0`);
    expect(baseTwo.exactLatex).toContain(String.raw`2^{2}+1`);

    for (const result of [affine, rational, baseTwo]) {
      expectDetail(result, 'Parameterized Exp/Log Solve');
      expectDetail(result, 'Complex Preimage Route');
      expectNoRealFormulaSections(result);
    }
  });

  it('solves exact-constant affine trig wrappers through Complex inverse-trig branches', () => {
    const sine = expectComplexSuccess(String.raw`2\sin\left(z\right)+1=1+\imaginaryI`);
    const cosine = expectComplexSuccess(String.raw`2\cos\left(2z+1\right)+1=1+\imaginaryI`);
    const tangent = expectComplexSuccess(String.raw`2\tan\left(z^2\right)+1=3+2\imaginaryI`);

    expect(sine.exactLatex).toContain(String.raw`\arcsin`);
    expect(sine.exactLatex).toContain(String.raw`2\pi k`);
    expect(cosine.exactLatex).toContain(String.raw`\arccos`);
    expect(cosine.exactLatex).toContain(String.raw`\frac{`);
    expect(tangent.exactLatex).toContain(String.raw`\arctan\left(1+i\right)+\pi k`);
    expect(tangent.exactLatex).toContain(String.raw`\sqrt{`);

    for (const result of [sine, cosine, tangent]) {
      expectDetail(result, 'Parameterized Trig Solve');
      expectDetail(result, 'Complex Preimage Route');
      expect(result.exactLatex).toContain(String.raw`k\in\mathbb{Z}`);
      expect(result.exactSupplementLatex ?? []).not.toContain('-1\\le');
      expect(JSON.stringify(result)).not.toContain('-1\\le');
      expectNoRealFormulaSections(result);
    }
  });

  it('keeps symbolic shells, numeric interval routing, and generated cubic/quartic wrappers outside the catchup', () => {
    const symbolicExp = solve(String.raw`a e^z+c=d`);
    const symbolicLog = solve(String.raw`a\ln\left(z\right)+c=d`);
    const symbolicTrig = solve(String.raw`a\sin\left(z\right)+c=d`);
    const numericInterval = solve(String.raw`2e^{z-1}+1=3`, {
      numericInterval: { start: '-2', end: '2', subdivisions: 32 },
    });
    const quarticPowerExpShell = solve(String.raw`2e^{z^4}+1=3`);
    const cubicPowerTrigShell = solve(String.raw`2\tan\left(z^3\right)+1=3+2\imaginaryI`);
    const cubicLog = solve(String.raw`\ln\left(z^3+z+1\right)=1+\imaginaryI`);
    const quarticTrig = solve(String.raw`\sin\left(z^4+z+1\right)=\imaginaryI`);

    for (const result of [symbolicExp, symbolicLog, symbolicTrig, numericInterval]) {
      expect(JSON.stringify(result)).not.toContain('Complex Preimage Route');
      if (result.kind === 'success') {
        expect(result.answerDomain).not.toBe('complex');
      }
    }

    for (const result of [quarticPowerExpShell, cubicPowerTrigShell, cubicLog, quarticTrig]) {
      expect(result.kind).toBe('error');
      expectNoRealFormulaSections(result);
      expect(JSON.stringify(result)).not.toContain('RootOf');
    }
  });
});
