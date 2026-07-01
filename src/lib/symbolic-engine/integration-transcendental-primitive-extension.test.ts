import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { analyzePrimitiveExtensionRischCandidate } from './integration/transcendental-primitive-extension-risch';

const ce = new ComputeEngine();

function node(latex: string) {
  return ce.parse(latex).json;
}

function analyze(latex: string, variable = 'x') {
  return analyzePrimitiveExtensionRischCandidate(node(latex), variable);
}

describe('transcendental primitive-extension Risch readiness', () => {
  it('accepts logarithmic primitive towers over the rational base field', () => {
    const result = analyze('\\ln(x^2+1)');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('expected primitive-extension success');
    }

    expect(result.generators).toHaveLength(1);
    expect(result.generators[0]).toMatchObject({
      generatorId: 'theta_1',
      baseLevel: 'rational-base-field',
    });
    expect(result.generators[0].derivativeRuleLatex).toContain('\\frac');
    expect(result.proofMode).toBe('exact-symbolic-no-compute-engine');
  });

  it('tracks nested logarithms as primitive extensions over previous generators', () => {
    const result = analyze('\\ln(\\ln(x))');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('expected nested primitive-extension success');
    }

    expect(result.generators).toHaveLength(2);
    expect(result.generators[0].baseLevel).toBe('rational-base-field');
    expect(result.generators[1].baseLevel).toBe('previous-primitive-extension');
    expect(result.generators[1].dependsOnGeneratorIds).toEqual(['theta_1']);
  });

  it('preserves selected-variable and target-free coefficient facts', () => {
    const result = analyze('\\log(a*t+b)', 't');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('expected target-free symbolic primitive-extension success');
    }

    expect(result.variable).toBe('t');
    expect(result.requiredFacts.map((fact) => fact.expressionLatex).join(' ')).toContain('a');
  });

  it('stops non-primitive towers before ownership can blur', () => {
    expect(analyze('e^x')).toMatchObject({
      kind: 'stop',
      reason: 'non-primitive-extension',
    });

    expect(analyze('\\sin(x)')).toMatchObject({
      kind: 'stop',
      reason: 'non-primitive-extension',
    });

    expect(analyze('\\ln(|x|)')).toMatchObject({
      kind: 'stop',
      reason: 'branch-sensitive-carrier',
    });
  });
});
