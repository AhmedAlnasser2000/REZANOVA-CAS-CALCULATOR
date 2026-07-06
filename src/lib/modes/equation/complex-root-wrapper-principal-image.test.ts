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
  expect(result.detailSections?.some((section) => section.title === 'Complex Root Wrapper Solve')).toBe(true);
  return result;
}

function expectNoRealFormulaLeak(result: unknown) {
  const text = JSON.stringify(result);
  expect(text).not.toContain('RootOf');
  expect(text).not.toContain('Real Cardano Cases');
  expect(text).not.toContain('Real Ferrari Cases');
  expect(text).not.toContain('Trig Formula Cases');
  expect(text).not.toContain('Nested Formula Cases');
}

describe('Equation Complex root wrapper principal-image catchup', () => {
  it('solves symbolic square-root wrappers with principal-image facts', () => {
    const result = expectComplexSuccess(String.raw`\sqrt{z^2+1}=a`);
    const text = JSON.stringify(result);

    expect(result.branchReadback?.branchesLatex).toEqual([
      String.raw`-\sqrt{a^2-1}`,
      String.raw`\sqrt{a^2-1}`,
    ]);
    expect(result.exactSupplementLatex).toContain(
      String.raw`\operatorname{Re}\left(a\right)>0\ \lor\ \left(\operatorname{Re}\left(a\right)=0\ \land\ \operatorname{Im}\left(a\right)\ge0\right)`,
    );
    expect(text).toContain('Principal-image classification: unknown');
    expect(text).toContain('Complex Principal-Image Facts');
    expectNoRealFormulaLeak(result);
  });

  it('solves nth-root and affine root shells through compact Complex carrier equations', () => {
    const cubeRoot = expectComplexSuccess(String.raw`\sqrt[3]{z^2+1}=a`);
    const affine = expectComplexSuccess(String.raw`a\sqrt{z^2+1}+c=d`);

    expect(cubeRoot.branchReadback?.branchesLatex).toEqual([
      String.raw`-\sqrt{a^3-1}`,
      String.raw`\sqrt{a^3-1}`,
    ]);
    expect(cubeRoot.exactSupplementLatex).toContain(
      String.raw`a=0\ \lor\ -\frac{\pi}{3}<\arg\left(a\right)\le\frac{\pi}{3}`,
    );
    expect(affine.exactSupplementLatex).toContain(String.raw`a\ne0`);
    expect(affine.exactSupplementLatex?.some((line) =>
      line.includes(String.raw`\operatorname{Re}\left(\frac{d-c}{a}\right)>0`))).toBe(true);
    expectNoRealFormulaLeak(cubeRoot);
    expectNoRealFormulaLeak(affine);
  });

  it('preserves rational denominator exclusions for square-root carrier equations', () => {
    const result = expectComplexSuccess(String.raw`\sqrt{(z-1)/(z+2)}=a`);

    expect(result.exactLatex).toBe(String.raw`z=\frac{1+2a^2}{1-a^2}`);
    expect(result.exactSupplementLatex).toContain(String.raw`1-a^2\ne0`);
    expectNoRealFormulaLeak(result);
  });

  it('rejects exact values outside the principal-root image with a controlled error', () => {
    const negativeSquareRoot = solve(String.raw`\sqrt{z^2+1}=-2`);
    const imaginaryCubeRoot = solve(String.raw`\sqrt[3]{z^2+1}=\imaginaryI`);

    for (const result of [negativeSquareRoot, imaginaryCubeRoot]) {
      expect(result.kind).toBe('error');
      if (result.kind !== 'error') {
        throw new Error('Expected outside-principal-image error');
      }
      expect(result.error).toContain('outside the principal-root image');
      expect(JSON.stringify(result)).toContain('provably outside the principal-root image');
      expectNoRealFormulaLeak(result);
    }
  });

  it('keeps generated cubic and quartic root-wrapper formulas deferred', () => {
    const cubic = solve(String.raw`\sqrt{z^3+z+1}=a`);
    const quartic = solve(String.raw`\sqrt[3]{z^4+z+1}=a`);

    for (const result of [cubic, quartic]) {
      expect(result.kind).toBe('error');
      expect(JSON.stringify(result)).toContain('generated branch is outside');
      expectNoRealFormulaLeak(result);
    }
  });
});
