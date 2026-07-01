import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { proveTranscendentalDerivationClosure } from './integration/transcendental-derivation-closure';

const ce = new ComputeEngine();

function node(latex: string) {
  return ce.parse(latex).json;
}

function closure(latex: string, variable = 'x') {
  const result = proveTranscendentalDerivationClosure(node(latex), variable);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`expected derivation closure for ${latex}`);
  }
  return result;
}

function compact(value: string) {
  return value.replace(/\s+/g, '');
}

describe('transcendental derivation closure', () => {
  it('proves exp-quadratic closure without Compute Engine or numeric evidence', () => {
    const result = closure('e^{a*x^2+b*x+c}');

    expect(result.proofMode).toBe('exact-symbolic-no-compute-engine');
    expect(result.proofSummary).toContain('without Compute Engine');
    expect(result.inputDerivative.strategies).not.toContain('compute-engine');
    expect(result.generatorClosures).toHaveLength(1);
    expect(result.generatorClosures[0]).toMatchObject({
      generatorId: 'theta_1',
      extensionKind: 'exponential',
      dependsOnGeneratorIds: [],
    });
    expect(compact(result.generatorClosures[0]?.generatorDerivativeLatex ?? '')).toMatch(/2ax|b/);
  });

  it('proves depth-2 trig-over-exp closure with ordered generator dependencies', () => {
    const result = closure('\\sin(e^x)');

    expect(result.normalForm.depth).toBe(2);
    expect(result.generatorClosures.map((entry) => entry.generatorId)).toEqual(['theta_1', 'theta_2']);
    expect(result.generatorClosures[1]?.dependsOnGeneratorIds).toEqual(['theta_1']);
    expect(result.generatorClosures[1]?.generatorDerivative.closureHeads).toContain('Cos');
    expect(compact(result.inputDerivativeLatex)).toMatch(/cos|Cos/);
  });

  it('keeps log-log towers proof-local and closure-safe', () => {
    const result = closure('\\ln(\\ln(x))');

    expect(result.normalForm.readiness).toContain('depth2-log-log-candidate');
    expect(result.generatorClosures).toHaveLength(2);
    expect(compact(result.inputDerivativeLatex)).toContain('\\ln');
  });

  it('threads arbitrary selected variables through normal-form and derivative evidence', () => {
    const result = closure('e^{a*t^2+x*t+b}', 't');

    expect(result.variable).toBe('t');
    expect(result.normalForm.baseField.variable).toBe('t');
    expect(result.generatorClosures[0]?.argumentDerivative?.variable).toBe('t');
    expect(compact(result.inputDerivativeLatex)).toContain('2at');
  });

  it('stops before unsafe proof paths', () => {
    expect(proveTranscendentalDerivationClosure(node('|x|e^{x^2}'))).toMatchObject({
      kind: 'stop',
      reason: 'branch-sensitive-carrier',
    });

    expect(proveTranscendentalDerivationClosure(node('2.5e^{x^2}'))).toMatchObject({
      kind: 'stop',
      reason: 'decimal-coefficient',
    });

    expect(proveTranscendentalDerivationClosure(['UnknownHead', 'x'])).toMatchObject({
      kind: 'stop',
      reason: 'compute-engine-fallback-required',
    });
  });
});
