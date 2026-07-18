import { describe, expect, it } from 'vitest';
import { runEquationMode } from '../equation';
import { collectOutcomeText, makeRequest } from './test-support';

function solve(equationLatex: string, domain: 'real' | 'complex' = 'complex') {
  return runEquationMode({
    ...makeRequest(),
    angleUnit: 'rad',
    equationScreen: 'symbolic',
    equationLatex,
    equationSolveTarget: 'x',
    equationAnswerMode: 'exact',
    equationDomainIntent: domain,
    complexExactForm: 'rectangular',
  });
}

function expectSuccess(equationLatex: string, domain: 'real' | 'complex' = 'complex') {
  const result = solve(equationLatex, domain);
  expect(result.kind, equationLatex).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`Expected success for ${equationLatex}`);
  }
  return result;
}

describe('Equation Complex companion fix gate', () => {
  it('preserves periodic trig families when Complex On falls back from wrapper boundaries', () => {
    const cases = [
      [String.raw`2\cos^2(x)-1=0`, String.raw`\frac{\pi}{4}+\frac{\pi n}{2}`],
      [String.raw`\sin(x)^2=\frac{1}{4}`, String.raw`\frac{\pi}{6}+2\pi n`],
      [String.raw`\sin(x)=\cos(x)`, String.raw`\frac{\pi}{4}+\pi n`],
      [String.raw`2\sin(x)\cos(x)=1`, String.raw`\frac{\pi}{4}+\pi n`],
      [String.raw`\sin^2(x)-\cos^2(x)=0`, String.raw`\frac{\pi}{4}+\frac{\pi n}{2}`],
      [String.raw`\sin(x)\cos(x)=0`, String.raw`\frac{\pi n}{2}`],
      [String.raw`\cos^2(x)-\sin^2(x)=1`, String.raw`\pi n`],
      [String.raw`\sin(2x)=\cos(x)`, String.raw`\frac{\pi}{2}+\pi n`],
    ] as const;

    for (const [equationLatex, expectedFamily] of cases) {
      const result = expectSuccess(equationLatex);
      const text = collectOutcomeText(result);
      expect(result.exactLatex).toContain(expectedFamily);
      expect(text).toContain(String.raw`n\in\mathbb{Z}`);
      expect(result.detailSections?.map((section) => section.title)).toContain('Complex Extension Boundary');
    }
  });

  it('adds positive numeric-base complex exp/log branch families', () => {
    const cases = [
      [String.raw`9^x=27`, String.raw`\frac{3}{2}+\frac{2\pi i k}{\ln(9)}`],
      [String.raw`10^{x}=7`, String.raw`\frac{\ln(7)+2\pi i k}{\ln(10)}`],
      [String.raw`16^{x}=8`, String.raw`\frac{3}{4}+\frac{2\pi i k}{\ln(16)}`],
      [String.raw`2^x=7`, String.raw`\frac{\ln(7)+2\pi i k}{\ln(2)}`],
      [String.raw`3^{2x}=11`, String.raw`\ln(11)+2\pi i k`],
      [String.raw`5^{x-1}=17`, String.raw`\frac{\ln(17)+2\pi i k}{\ln(5)}+1`],
      [String.raw`6^{x+2}=13`, String.raw`\frac{\ln(13)+2\pi i k}{\ln(6)}-2`],
      [String.raw`10^{3x-4}=2`, String.raw`\ln(2)+2\pi i k`],
      [String.raw`4^x=9`, String.raw`\frac{\ln(9)+2\pi i k}{\ln(4)}`],
      [String.raw`9^{x-2}=5`, String.raw`\frac{\ln(5)+2\pi i k}{\ln(9)}+2`],
      [String.raw`12^{2x+1}=19`, String.raw`\ln(19)+2\pi i k`],
    ] as const;

    for (const [equationLatex, expectedSnippet] of cases) {
      const result = expectSuccess(equationLatex);
      expect(result.answerDomain).toBe('complex');
      expect(result.exactLatex).toContain(expectedSnippet);
      expect(result.exactLatex).not.toContain(String.raw`k\in\mathbb{Z}`);
      expect(result.exactSupplementLatex).toContain(String.raw`k\in\mathbb{Z}`);
      expect(collectOutcomeText(result)).toContain('positive numeric-base complex exponential');
    }
  });

  it('keeps a Complex logarithmic branch parameter in the validity condition', () => {
    const result = runEquationMode({
      ...makeRequest(),
      angleUnit: 'rad',
      equationScreen: 'symbolic',
      equationLatex: String.raw`9^z=27`,
      equationSolveTarget: 'z',
      equationAnswerMode: 'exact',
      equationDomainIntent: 'complex',
      complexExactForm: 'rectangular',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') throw new Error('Expected a Complex branch family');
    expect(result.exactLatex).toBe(String.raw`z=\frac{3}{2}+\frac{2\pi i k}{\ln(9)}`);
    expect(result.exactSupplementLatex).toContain(String.raw`k\in\mathbb{Z}`);
  });

  it('returns controlled empty-set evidence for the scoped Complex abs boundary case', () => {
    const result = expectSuccess(String.raw`abs(2x+1)=x-5`);

    expect(result.answerDomain).toBe('complex');
    expect(result.exactLatex).toBe(String.raw`x\in\varnothing`);
    expect(result.exactSupplementLatex).toEqual([
      String.raw`x-5\ge0`,
      String.raw`x\in\mathbb{R}`,
    ]);
    expect(result.detailSections?.map((section) => section.title)).toContain('Complex Abs Boundary');
    expect(collectOutcomeText(result)).toContain('complex solution set is empty');
  });

  it('leaves representative Real mode trig and exp/log outputs unchanged', () => {
    expect(expectSuccess(String.raw`\sin(x)=\cos(x)`, 'real').exactLatex)
      .toBe(String.raw`x\in\left\{\frac{\pi}{4}+\pi n\right\}`);
    expect(expectSuccess(String.raw`2^x=7`, 'real').exactLatex)
      .toBe(String.raw`x=\frac{\ln(7)}{\ln(2)}`);
  });
});
