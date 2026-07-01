import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { profileTranscendentalFieldTower } from './integration/transcendental-field-tower';

const ce = new ComputeEngine();

function profile(latex: string, variable = 'x') {
  return profileTranscendentalFieldTower(ce.parse(latex).json, variable);
}

function ready(latex: string, variable = 'x') {
  const result = profile(latex, variable);
  expect(result.kind).toBe('ready');
  if (result.kind !== 'ready') {
    throw new Error(`expected ready tower profile for ${latex}`);
  }
  return result;
}

function factLatex(result: ReturnType<typeof ready>) {
  return result.requiredFacts.map((fact) => `${fact.expressionLatex}${fact.relation}`);
}

describe('transcendental field tower core profile', () => {
  it('profiles depth-1 exponential polynomial towers without adoption', () => {
    const result = ready('e^{a*x^2+b*x+c}');

    expect(result.depth).toBe(1);
    expect(result.readiness).toContain('depth1-exp-polynomial');
    expect(result.extensions).toHaveLength(1);
    expect(result.extensions[0]).toMatchObject({
      family: 'exp',
      head: 'Exp',
      argumentKind: 'polynomial',
      polynomialDegree: 2,
    });
    expect(factLatex(result)).toContain('a\\ne0');
  });

  it('normalizes equivalent Exp spellings to the same e tower descriptor', () => {
    const result = ready('\\exp(x^2)');

    expect(result.normalizedInput).toEqual(['Power', 'ExponentialE', ['Power', 'x', 2]]);
    expect(result.extensions[0]).toMatchObject({
      family: 'exp',
      argumentLatex: 'x^2',
    });
  });

  it('profiles depth-1 trig, log, positive-base, and special-function extensions', () => {
    const trig = ready('\\sin(x^2)');
    expect(trig.readiness).toContain('depth1-fresnel-candidate');
    expect(trig.extensions[0]).toMatchObject({
      family: 'trig',
      head: 'Sin',
      polynomialDegree: 2,
    });

    const log = ready('1/\\ln(x)');
    expect(log.extensions.some((entry) => entry.family === 'log')).toBe(true);
    expect(log.branchFacts).toContainEqual({
      kind: 'positive',
      expressionLatex: 'x',
      relation: '>0',
    });

    const numericBase = ready('2^{3*x-1}');
    expect(numericBase.extensions[0]).toMatchObject({
      family: 'positive-base-exp',
      baseLatex: '2',
      argumentKind: 'affine',
    });
    expect(factLatex(numericBase)).toEqual([]);

    const symbolicBase = ready('q^{a*x+b}');
    expect(symbolicBase.extensions[0]).toMatchObject({
      family: 'positive-base-exp',
      baseLatex: 'q',
    });
    expect(factLatex(symbolicBase)).toEqual(expect.arrayContaining([
      'a\\ne0',
      'q>0',
      'q\\ne1',
    ]));

    const special = ready('\\operatorname{FresnelS}(x)');
    expect(special.readiness).toContain('depth1-special-function');
    expect(special.extensions[0]).toMatchObject({
      family: 'special-function',
      head: 'FresnelS',
    });
  });

  it('profiles accepted depth-2 tower shapes for later certificate/RN consumers', () => {
    const expExp = ready('e^{e^x}');
    expect(expExp.depth).toBe(2);
    expect(expExp.readiness).toContain('depth2-exp-exp-candidate');
    expect(expExp.extensions.map((entry) => entry.family)).toEqual(['exp', 'exp']);

    const trigExp = ready('\\sin(e^x)');
    expect(trigExp.readiness).toContain('depth2-trig-exp-candidate');
    expect(trigExp.extensions.map((entry) => entry.family)).toEqual(['exp', 'trig']);

    const specialExp = ready('\\operatorname{Si}(e^x)');
    expect(specialExp.readiness).toContain('depth2-special-exp-candidate');
    expect(specialExp.extensions.map((entry) => entry.family)).toEqual(['exp', 'special-function']);

    const logLog = ready('\\ln(\\ln(x))');
    expect(logLog.readiness).toContain('depth2-log-log-candidate');
  });

  it('generalizes method evidence for deferred depth-2 tower compositions', () => {
    const expTrig = ready('e^{\\sin(x)}');
    expect(expTrig.depth).toBe(2);
    expect(expTrig.readiness).toContain('depth2-exp-trig-candidate');
    expect(expTrig.extensions.map((entry) => entry.family)).toEqual(['trig', 'exp']);

    const trigLog = ready('\\sin(\\ln(x))');
    expect(trigLog.readiness).toContain('depth2-trig-log-candidate');
    expect(trigLog.branchFacts).toContainEqual({
      kind: 'positive',
      expressionLatex: 'x',
      relation: '>0',
    });

    const logExp = ready('\\ln(e^x)');
    expect(logExp.readiness).toContain('depth2-log-exp-candidate');
    expect(logExp.extensions.map((entry) => entry.family)).toEqual(['exp', 'log']);
  });

  it('keeps arbitrary selected variables target-aware', () => {
    const result = ready('e^{a*t^2+x*t+b}', 't');

    expect(result.variable).toBe('t');
    expect(result.depth).toBe(1);
    expect(result.extensions[0]).toMatchObject({
      family: 'exp',
      polynomialDegree: 2,
    });
    expect(factLatex(result)).toContain('a\\ne0');
  });

  it('stops unsafe or deferred towers with explicit reasons', () => {
    expect(profile('\\ln(\\ln(\\ln(x)))')).toMatchObject({
      kind: 'stop',
      reason: 'depth-over-cap',
      depth: 3,
    });
    expect(profile('2.5e^{x^2}')).toMatchObject({
      kind: 'stop',
      reason: 'decimal-coefficient',
    });
    expect(profile('|x|e^{x^2}')).toMatchObject({
      kind: 'stop',
      reason: 'branch-sensitive-carrier',
    });
    expect(profile('\\sqrt{x}\\sin(x)')).toMatchObject({
      kind: 'stop',
      reason: 'unsupported-algebraic-head',
    });
    expect(profile('1^{x}')).toMatchObject({
      kind: 'stop',
      reason: 'invalid-exponential-base',
    });
  });
});
