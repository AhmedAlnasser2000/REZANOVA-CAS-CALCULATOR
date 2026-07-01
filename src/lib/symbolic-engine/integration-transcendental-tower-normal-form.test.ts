import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import {
  TRANSCENDENTAL_TOWER_FORMAL_CAPS,
  buildTranscendentalTowerNormalForm,
} from './integration/transcendental-tower-normal-form';

const ce = new ComputeEngine();

function node(latex: string) {
  return ce.parse(latex).json;
}

function normal(latex: string, variable = 'x') {
  const result = buildTranscendentalTowerNormalForm(node(latex), variable);
  expect(result.kind).toBe('normal-form');
  if (result.kind !== 'normal-form') {
    throw new Error(`expected tower normal form for ${latex}`);
  }
  return result;
}

describe('transcendental tower normal form', () => {
  it('canonicalizes exact-rational depth-1 exponential towers without dispatch adoption', () => {
    const result = normal('e^{x^2}');

    expect(result.proofMode).toBe('exact-symbolic-no-compute-engine');
    expect(result.depth).toBe(1);
    expect(result.coefficientScope).toBe('exact-rational');
    expect(result.baseField).toMatchObject({
      kind: 'rational-function-field',
      variable: 'x',
      degreeCap: TRANSCENDENTAL_TOWER_FORMAL_CAPS.exactRationalDegree,
    });
    expect(result.generators).toHaveLength(1);
    expect(result.generators[0]).toMatchObject({
      id: 'theta_1',
      extensionKind: 'exponential',
      sourceFamily: 'exp',
      polynomialDegree: 2,
    });
    expect(result.generators[0]?.derivativeRule.kind)
      .toBe('theta-prime-equals-argument-prime-times-theta');
  });

  it('uses the symbolic degree cap and facts for target-free symbolic coefficients', () => {
    const result = normal('e^{a*x^2+b*x+c}');

    expect(result.coefficientScope).toBe('exact-rational-plus-target-free-symbolic');
    expect(result.baseField.degreeCap).toBe(TRANSCENDENTAL_TOWER_FORMAL_CAPS.targetFreeSymbolicDegree);
    expect(result.requiredFacts.map((fact) => `${fact.expressionLatex}${fact.relation}`))
      .toContain('a\\ne0');
  });

  it('orders depth-2 generators and records derivative dependencies', () => {
    const result = normal('\\sin(e^x)');

    expect(result.depth).toBe(2);
    expect(result.generators.map((generator) => generator.id)).toEqual(['theta_1', 'theta_2']);
    expect(result.generators.map((generator) => generator.extensionKind))
      .toEqual(['exponential', 'trigonometric-pair']);
    expect(result.generators[1]?.derivativeRule.dependsOnGeneratorIds).toEqual(['theta_1']);
    expect(result.readiness).toContain('depth2-trig-exp-candidate');
  });

  it('keeps arbitrary selected variables in the base field and derivative rule text', () => {
    const result = normal('e^{a*t^2+x*t+b}', 't');

    expect(result.variable).toBe('t');
    expect(result.baseField.variable).toBe('t');
    expect(result.generators[0]?.derivativeRule.ruleLatex).toContain('\\frac{d}{dt}');
  });

  it('passes profiler stops through as normal-form stops', () => {
    expect(buildTranscendentalTowerNormalForm(node('\\ln(\\ln(\\ln(x)))'))).toMatchObject({
      kind: 'stop',
      reason: 'depth-over-cap',
      depth: 3,
      proofMode: 'exact-symbolic-no-compute-engine',
    });

    expect(buildTranscendentalTowerNormalForm(node('|x|e^{x^2}'))).toMatchObject({
      kind: 'stop',
      reason: 'branch-sensitive-carrier',
    });
  });
});
