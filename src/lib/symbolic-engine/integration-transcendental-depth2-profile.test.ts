import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { profileDepth2TranscendentalTower } from './integration/transcendental-certificate/depth2-profile';

const ce = new ComputeEngine();

function profile(latex: string, variable = 'x') {
  return profileDepth2TranscendentalTower(ce.parse(latex).json, variable);
}

function ready(latex: string, variable = 'x') {
  const result = profile(latex, variable);
  expect(result.kind).toBe('ready');
  if (result.kind !== 'ready') {
    throw new Error(`expected ready depth-2 profile for ${latex}`);
  }
  return result;
}

describe('depth-2 transcendental tower profile', () => {
  it('profiles affine Si/Ci quotient candidates without adopting integration', () => {
    const sine = ready('\\sin(x)/x');
    expect(sine.family).toBe('sine-integral-affine-quotient');
    expect(sine.consumer).toBe('certificate-special-function');
    expect(sine.coreArgumentLatex).toBe('x');
    expect(sine.extensionChain).toEqual([
      { kind: 'sin', argumentLatex: 'x' },
      { kind: 'quotient', denominatorLatex: 'x' },
    ]);
    expect(sine.branchFacts).toContainEqual({
      kind: 'nonzero',
      expressionLatex: 'x',
      relation: '\\ne0',
    });

    const cosine = ready('\\cos(a*x+b)/(a*x+b)');
    expect(cosine.family).toBe('cosine-integral-affine-quotient');
    expect(cosine.requiredFacts).toContainEqual({
      kind: 'nonzero',
      expressionLatex: 'a',
      relation: '\\ne0',
    });
  });

  it('profiles affine Ei/li quotient candidates', () => {
    const exponential = ready('e^x/x');
    expect(exponential.family).toBe('exponential-integral-affine-quotient');
    expect(exponential.extensionChain[0]).toEqual({ kind: 'exp', argumentLatex: 'x' });

    const logarithmic = ready('1/\\ln(x)');
    expect(logarithmic.family).toBe('logarithmic-integral-affine-reciprocal');
    expect(logarithmic.extensionChain[0]).toEqual({ kind: 'ln', argumentLatex: 'x' });
    expect(logarithmic.branchFacts).toEqual(expect.arrayContaining([
      { kind: 'positive', expressionLatex: 'x', relation: '>0' },
      { kind: 'nonzero', expressionLatex: '\\ln\\left(x\\right)', relation: '\\ne0' },
    ]));
  });

  it('profiles derivative-present nested substitutions for RN consumers', () => {
    const nestedExp = ready('e^x e^{e^x}');
    expect(nestedExp.family).toBe('nested-exp-derivative-substitution');
    expect(nestedExp.consumer).toBe('risch-norman-substitution');
    expect(nestedExp.derivativeCarrier).toMatchObject({
      kind: 'structural-factor',
      factorLatex: '\\exponentialE^{x}',
    });

    const nestedSinExp = ready('\\cos(x)e^{\\sin(x)}');
    expect(nestedSinExp.family).toBe('nested-sin-exp-derivative-substitution');
    expect(nestedSinExp.derivativeCarrier).toMatchObject({
      kind: 'structural-factor',
      factorLatex: '\\cos(x)',
    });
  });

  it('profiles depth-2 exponential compositions for certificate special functions', () => {
    const expExp = ready('e^{e^x}');
    expect(expExp.family).toBe('exponential-integral-exp-composition');
    expect(expExp.consumer).toBe('certificate-special-function');
    expect(expExp.coreArgumentLatex).toBe('e^{x}');
    expect(expExp.extensionChain).toEqual([
      { kind: 'exp', argumentLatex: 'x' },
      { kind: 'exp', argumentLatex: 'e^{x}' },
    ]);
    expect(expExp.branchFacts).toContainEqual({
      kind: 'positive',
      expressionLatex: 'e^{x}',
      relation: '>0',
    });

    const sine = ready('\\sin(e^{2x+1})');
    expect(sine.family).toBe('sine-integral-exp-composition');
    expect(sine.requiredFacts).toEqual([]);

    const symbolicSlope = ready('\\cos(e^{a*t+x})', 't');
    expect(symbolicSlope.family).toBe('cosine-integral-exp-composition');
    expect(symbolicSlope.requiredFacts).toContainEqual({
      kind: 'nonzero',
      expressionLatex: 'a',
      relation: '\\ne0',
    });
  });

  it('keeps arbitrary selected variables target-aware', () => {
    const result = ready('\\sin(2*t+x)/(2*t+x)', 't');

    expect(result.variable).toBe('t');
    expect(result.coreArgumentLatex).toBe('2t+x');
    expect(result.requiredFacts).toEqual([]);
  });

  it('stops unsupported or unsafe depth-2 candidates explicitly', () => {
    expect(profile('e^{\\sin(x)}')).toMatchObject({
      kind: 'stop',
      reason: 'unsupported-depth2-tower',
    });
    expect(profile('\\ln(\\ln(\\ln(x)))')).toMatchObject({
      kind: 'stop',
      reason: 'unsupported-depth3-tower',
    });
    expect(profile('2.5\\sin(x)/x')).toMatchObject({
      kind: 'stop',
      reason: 'inexact-coefficient',
    });
    expect(profile('|x|\\sin(x)/x')).toMatchObject({
      kind: 'stop',
      reason: 'branch-sensitive',
    });
    expect(profile('\\sqrt{x}\\sin(x)/x')).toMatchObject({
      kind: 'stop',
      reason: 'selected-variable-dependent-coefficient',
    });
  });
});
