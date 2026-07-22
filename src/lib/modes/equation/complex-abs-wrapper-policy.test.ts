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
  it('returns recognized locus evidence for Complex absolute-value wrappers', () => {
    const cases = [
      String.raw`\left|z-1\right|=2`,
      String.raw`\left|z^2+1\right|=a`,
      String.raw`2\left|z-1\right|+c=d`,
      String.raw`\left|z^3+z+1\right|=b`,
    ];

    for (const equationLatex of cases) {
      const result = solve(equationLatex);
      expect(result.kind, equationLatex).toBe('success');
      if (result.kind !== 'success') {
        throw new Error(`Expected Complex abs wrapper locus evidence for ${equationLatex}`);
      }
      const text = JSON.stringify(result);
      expect(result.answerDomain).toBe('complex');
      expect(result.resultOrigin).toBe('rule-based-symbolic');
      if (equationLatex === String.raw`\left|z-1\right|=2`) {
        expect(text).toContain('Circle');
        expect(text).toContain('Center: ');
      } else {
        expect(text).toContain('Recognized locus');
        expect(text).toContain('Locus Evidence');
        expect(text).toContain('recognized locus; no general curve readback is claimed');
      }
      expect(text).not.toContain('Real Abs');
      expect(text).not.toContain('sign split');
      expectNoRealFormulaLeak(result);
    }
  });

  it('returns circle locus evidence without finite branches for affine circle cases in Complex mode', () => {
    const result = solve(String.raw`\left|z-1\right|=2`);

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected Complex affine circle locus evidence');
    }
    expect(result.exactLatex).toBe(String.raw`\left|z-1\right|=2`);
    expect(result.answerRows?.rows[0]?.label).toBe('Circle');
    expect(result.detailSections?.some((section) => section.title === 'Locus Meaning')).toBe(true);
    expect(result).not.toHaveProperty('branchReadback');
  });

  it('returns recognized locus evidence for Re, Im, and conjugate carriers', () => {
    const cases = [
      ['Re(z)=1', String.raw`z=1+t\imaginaryI`, 'vertical line'],
      ['Im(z)=1', String.raw`z=t+\imaginaryI`, 'horizontal line'],
      [String.raw`\operatorname{Re}(z)=1`, String.raw`z=1+t\imaginaryI`, 'vertical line'],
      [String.raw`\operatorname{Im}(z)=1`, String.raw`z=t+\imaginaryI`, 'horizontal line'],
      [String.raw`\operatorname{conj}(z)=1`, String.raw`\operatorname{conj}(z)=1`, 'Conjugate equality isolates the candidate point z=1.'],
      ['conj(z)=1', String.raw`\operatorname{conj}(z)=1`, 'Conjugate equality isolates the candidate point z=1.'],
    ];

    for (const [equationLatex, exactLatex, expectedText] of cases) {
      const result = solve(equationLatex);
      expect(result.kind, equationLatex).toBe('success');
      if (result.kind !== 'success') {
        throw new Error(`Expected Complex locus evidence for ${equationLatex}`);
      }
      const text = JSON.stringify(result);
      expect(result.exactLatex).toBe(exactLatex);
      expect(text).toContain(expectedText);
      expect(text).not.toContain('eRz');
      expect(text).not.toContain('mIz');
      expect(text).not.toContain('Complex region nonlinear solve');
    }
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
