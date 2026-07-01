import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { analyzeExponentialExtensionRischCandidate } from './integration/transcendental-exponential-extension-risch';

const ce = new ComputeEngine();

function node(latex: string) {
  return ce.parse(latex).json;
}

function analyze(latex: string, variable = 'x') {
  return analyzeExponentialExtensionRischCandidate(node(latex), variable);
}

describe('transcendental exponential-extension Risch readiness', () => {
  it('accepts polynomial exponential towers over the rational base field', () => {
    const result = analyze('e^{a*x^2+b*x+c}');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('expected exponential-extension success');
    }

    expect(result.generators).toHaveLength(1);
    expect(result.generators[0]).toMatchObject({
      generatorId: 'theta_1',
      baseLevel: 'rational-base-field',
    });
    expect(result.generators[0].logarithmicDerivativeLatex.replace(/\s+/g, '')).toMatch(/2ax|b/);
    expect(result.requiredFacts.map((fact) => fact.expressionLatex).join(' ')).toContain('a');
    expect(result.proofMode).toBe('exact-symbolic-no-compute-engine');
  });

  it('records positive-base exponential facts and selected variables', () => {
    const result = analyze('q^{a*t+x}', 't');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('expected positive-base exponential-extension success');
    }

    expect(result.variable).toBe('t');
    expect(result.generators[0]).toMatchObject({
      baseLatex: 'q',
      baseLevel: 'rational-base-field',
    });
    const facts = result.requiredFacts.map((fact) => `${fact.expressionLatex}${fact.relation}`);
    expect(facts).toContain('a\\ne0');
    expect(facts).toContain('q>0');
    expect(facts).toContain('q\\ne1');
    expect(result.generators[0].logarithmicDerivativeLatex).toContain('\\ln');
  });

  it('accepts nested exponential extensions over previous exponential generators', () => {
    const result = analyze('e^{e^x}');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('expected nested exponential-extension success');
    }

    expect(result.normalForm.depth).toBe(2);
    expect(result.generators.map((generator) => generator.baseLevel))
      .toEqual(['rational-base-field', 'previous-exponential-extension']);
    expect(result.generators[1].dependsOnGeneratorIds).toEqual(['theta_1']);
  });

  it('stops non-exponential towers before ownership can blur', () => {
    expect(analyze('\\ln(x)')).toMatchObject({
      kind: 'stop',
      reason: 'non-exponential-extension',
    });

    expect(analyze('\\sin(e^x)')).toMatchObject({
      kind: 'stop',
      reason: 'non-exponential-extension',
    });

    expect(analyze('|x|e^{x^2}')).toMatchObject({
      kind: 'stop',
      reason: 'branch-sensitive-carrier',
    });
  });
});
