import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { profileTranscendentalCertificateTower } from './integration/transcendental-certificate/profile';

const ce = new ComputeEngine();

function node(latex: string) {
  return ce.parse(latex).json;
}

function profile(latex: string, variable = 'x') {
  return profileTranscendentalCertificateTower(node(latex), variable);
}

function factLatex(result: ReturnType<typeof profileTranscendentalCertificateTower>) {
  return result.kind === 'certificate-ready'
    ? result.requiredFacts.map((fact) => `${fact.expressionLatex}${fact.relation}`)
    : [];
}

describe('transcendental Risch certificate tower profile', () => {
  it('marks pure exponential quadratics as certificate-ready', () => {
    const monic = profile('e^{x^2}');
    const negative = profile('e^{-x^2}');
    const exactRational = profile('e^{2*x^2+3*x+1}');

    for (const result of [monic, negative, exactRational]) {
      expect(result.kind).toBe('certificate-ready');
      if (result.kind !== 'certificate-ready') {
        throw new Error('expected certificate-ready quadratic exponential');
      }
      expect(result.certificateFamily).toBe('exp-quadratic');
      expect(result.exponentDegree).toBe(2);
      expect(result.coefficientScope).toBe('exact-rational-target-free-symbolic');
      expect(result.fieldDescriptor.extension).toBe('e^q');
      expect(result.requiredFacts).toEqual([]);
    }
  });

  it('records target-free symbolic coefficient facts for quadratic exponentials', () => {
    const result = profile('e^{a*x^2+b*x+c}');

    expect(result.kind).toBe('certificate-ready');
    if (result.kind !== 'certificate-ready') {
      throw new Error('expected certificate-ready symbolic quadratic exponential');
    }
    expect(result.exponentDegree).toBe(2);
    expect(result.variable).toBe('x');
    expect(factLatex(result)).toContain('a\\ne0');
    expect(result.fieldDescriptor).toMatchObject({
      base: 'target-free-coefficient-field',
      selectedVariable: 'x',
    });
  });

  it('treats non-selected variables as target-free coefficients', () => {
    const result = profile('e^{a*t^2+x*t+b}', 't');

    expect(result.kind).toBe('certificate-ready');
    if (result.kind !== 'certificate-ready') {
      throw new Error('expected certificate-ready t-quadratic exponential');
    }
    expect(result.variable).toBe('t');
    expect(result.exponentDegree).toBe(2);
    expect(factLatex(result)).toContain('a\\ne0');
    expect(result.exponentLatex).toContain('t');
  });

  it('marks constant and affine exponentials as elementary-owned', () => {
    expect(profile('e^3')).toMatchObject({
      kind: 'elementary-owned',
      owner: 'constant-exponential',
      exponentDegree: 0,
    });
    expect(profile('e^{a*x+b}')).toMatchObject({
      kind: 'elementary-owned',
      owner: 'tier1-affine-exponential',
      exponentDegree: 1,
    });
  });

  it('stops cubic and nested exponential towers before certificate adoption', () => {
    expect(profile('e^{x^3}')).toMatchObject({
      kind: 'stop',
      reason: 'polynomial-degree-over-certificate-scope',
      detectedDegree: 3,
    });
    expect(profile('e^{\\sin(x)}')).toMatchObject({
      kind: 'stop',
      reason: 'nested-transcendental-tower',
    });
    expect(profile('e^{e^x}')).toMatchObject({
      kind: 'stop',
      reason: 'nested-transcendental-tower',
    });
  });

  it('stops unsafe proof inputs with explicit reasons', () => {
    expect(profile('|x|e^{x^2}')).toMatchObject({
      kind: 'stop',
      reason: 'branch-sensitive',
    });
    expect(profile('e^{2.5*x^2}')).toMatchObject({
      kind: 'stop',
      reason: 'inexact-coefficient',
    });
    expect(profile('\\sin(x)/x')).toMatchObject({
      kind: 'stop',
      reason: 'no-supported-certificate-family',
    });
    expect(profileTranscendentalCertificateTower(['Erf', 'x'], 'x')).toMatchObject({
      kind: 'stop',
      reason: 'unsupported-head',
    });
  });
});
