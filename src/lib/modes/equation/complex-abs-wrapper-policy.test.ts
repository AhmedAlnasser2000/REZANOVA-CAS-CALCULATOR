import { describe, expect, it } from 'vitest';
import { runEquationMode } from '../equation';
import { makeRequest } from './test-support';

function solve(
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

function expectNoRealFormulaLeak(result: unknown) {
  const text = JSON.stringify(result);
  expect(text).not.toContain('RootOf');
  expect(text).not.toContain('Real Cardano Cases');
  expect(text).not.toContain('Real Ferrari Cases');
  expect(text).not.toContain('Trig Formula Cases');
  expect(text).not.toContain('Nested Formula Cases');
}

describe('Equation Complex absolute-value wrapper policy', () => {
  it('keeps Complex absolute-value wrappers deferred as locus semantics', () => {
    const cases = [
      String.raw`\left|z-1\right|=2`,
      String.raw`\left|z^2+1\right|=a`,
      String.raw`2\left|z-1\right|+c=d`,
      String.raw`\left|z^3+z+1\right|=b`,
    ];

    for (const equationLatex of cases) {
      const result = solve(equationLatex);
      expect(result.kind, equationLatex).toBe('error');
      if (result.kind !== 'error') {
        throw new Error(`Expected Complex abs wrapper policy stop for ${equationLatex}`);
      }
      const text = JSON.stringify(result);
      expect(result.error).toContain('outside the supported guarded complex preimage families');
      expect(text).toContain('loci or condition sets rather than finite branches');
      expect(text).toContain('real-domain equation');
      expect(text).not.toContain('Real Abs');
      expect(text).not.toContain('sign split');
      expectNoRealFormulaLeak(result);
    }
  });

  it('does not return finite branches for affine circle cases in Complex mode', () => {
    const result = solve(String.raw`\left|z-1\right|=2`);

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected Complex affine circle policy stop');
    }
    expect(result).not.toHaveProperty('exactLatex');
    expect(result).not.toHaveProperty('branchReadback');
  });

  it('leaves Complex Off on the existing real-domain absolute-value path', () => {
    const result = solve(String.raw`\left|z-1\right|=2`, 'real');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected Real abs wrapper to remain available');
    }
    expect(result.exactLatex).toBe(String.raw`z\in\left\{3, -1\right\}`);
  });
});
