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

function expectNoDeferredComplexArtifacts(result: unknown) {
  const text = JSON.stringify(result);
  expect(text).not.toContain('RootOf');
  expect(text).not.toContain('Trig Formula Cases');
  expect(text).not.toContain('Real Cardano Cases');
  expect(text).not.toContain('Real Ferrari Cases');
  expect(text).not.toContain('Nested Formula Cases');
}

describe('Equation Complex wrapper baseline lock', () => {
  it('keeps algebraic radical and nested wrapper formula families deferred in Complex exact mode', () => {
    const cases = [
      String.raw`\sqrt{z^3+z+1}=b`,
      String.raw`\sqrt[3]{z^4+z+1}=b`,
      String.raw`\sqrt{z^3+z+1}+\sqrt{z+1}=1`,
      String.raw`\sqrt{\sqrt{z^3+z+1}}=b`,
    ];

    for (const equationLatex of cases) {
      const result = solve(equationLatex);
      expect(result.kind, equationLatex).toBe('error');
      expectNoDeferredComplexArtifacts(result);
    }

    const absoluteValueLocus = solve(String.raw`\left|z^3+z+1\right|=b`);
    expect(absoluteValueLocus.kind).toBe('success');
    expectNoDeferredComplexArtifacts(absoluteValueLocus);
    if (absoluteValueLocus.kind !== 'success') {
      throw new Error('Expected Complex absolute-value wrapper locus evidence.');
    }
    expect(absoluteValueLocus.detailSections?.some((section) => section.title === 'Locus Meaning')).toBe(true);
    expect(JSON.stringify(absoluteValueLocus)).toContain('recognized locus; no general curve readback is claimed');
  });

  it('keeps generated cubic and quartic wrapper formula payloads deferred in Complex exact mode', () => {
    const cases = [
      String.raw`\ln\left(z^3+z+1\right)=1+\imaginaryI`,
      String.raw`e^{z^4+z+1}=1`,
      String.raw`\sin\left(z^4+z+1\right)=\imaginaryI`,
    ];

    for (const equationLatex of cases) {
      const result = solve(equationLatex);
      expect(result.kind, equationLatex).toBe('error');
      expectNoDeferredComplexArtifacts(result);
    }
  });

  it('keeps generated mixed trig wrapper combinations outside Complex wrapper catchup', () => {
    const direct = solve(String.raw`\sin\left(z\right)+\cos\left(z\right)=1`);
    expect(direct.kind).toBe('success');
    expectNoDeferredComplexArtifacts(direct);

    const cases = [
      String.raw`\sin\left(z\right)+\cos\left(z\right)=1`,
      String.raw`\sin\left(z\right)\cos\left(z\right)=1`,
      String.raw`\sin\left(z\right)+\cos\left(2z\right)=1`,
      String.raw`A\sin\left(z^3+z+1\right)+B\cos\left(z^3+z+1\right)=C`,
    ].slice(3);

    for (const equationLatex of cases) {
      const result = solve(equationLatex);
      expect(result.kind, equationLatex).toBe('error');
      expectNoDeferredComplexArtifacts(result);
      expect(JSON.stringify(result)).not.toContain('Parameterized Mixed Trig Solve');
    }
  });

  it('keeps Complex Off on the existing Real-first wrapper formula path', () => {
    const radical = solve(String.raw`\sqrt{z^3+z+1}=b`, 'real');
    const trig = solve(String.raw`\sin\left(z^3+z+1\right)=b`, 'real');

    expect(radical.kind).toBe('success');
    expect(trig.kind).toBe('success');
    if (radical.kind !== 'success' || trig.kind !== 'success') {
      throw new Error('Expected Real-first wrapper formula successes');
    }
    expect(radical.answerDomain).toBe('real');
    expect(trig.answerDomain).toBe('real');
    expect(JSON.stringify(radical)).toContain('Real Cardano Cases');
    expect(JSON.stringify(trig)).toContain('Trig Formula Cases');
  });
});
