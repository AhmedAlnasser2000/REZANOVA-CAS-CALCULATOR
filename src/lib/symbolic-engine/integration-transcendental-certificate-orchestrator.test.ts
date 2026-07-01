import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { orchestrateTranscendentalCertificateCandidate } from './integration/transcendental-certificate/orchestrator';

const ce = new ComputeEngine();

function node(latex: string) {
  return ce.parse(latex).json;
}

function orchestrate(latex: string, variable = 'x') {
  return orchestrateTranscendentalCertificateCandidate(node(latex), variable);
}

describe('transcendental certificate orchestrator', () => {
  it('chooses named special-function answers from one proof record', () => {
    const expQuadratic = orchestrate('e^{x^2}');
    const sineQuotient = orchestrate('\\sin(x)/x');
    const depth2Composition = orchestrate('e^{e^x}');
    const fresnel = orchestrate('\\sin(x^2)');

    for (const result of [expQuadratic, sineQuotient, depth2Composition, fresnel]) {
      expect(result.kind).toBe('success');
      if (result.kind !== 'success') {
        throw new Error('expected named special-function certificate');
      }
      expect(result.outcome).toBe('named-special-function-answer');
      expect(result.proofMode).toBe('exact-symbolic-no-compute-engine');
      expect(result.certificate.antiderivativeKind).toBe('special-function');
    }

    expect(expQuadratic.kind === 'success' && expQuadratic.certificate.exactLatex)
      .toContain('\\operatorname{erfi}');
    expect(sineQuotient.kind === 'success' && sineQuotient.certificate.exactLatex)
      .toContain('\\operatorname{Si}');
    expect(depth2Composition.kind === 'success' && depth2Composition.certificate.exactLatex)
      .toContain('\\operatorname{Ei}');
    expect(fresnel.kind === 'success' && fresnel.certificate.exactLatex)
      .toContain('\\operatorname{FresnelS}');
  });

  it('leaves elementary Liouville outcomes to existing public route labels', () => {
    const result = orchestrate('\\frac{k*(2a*x+b)}{a*x^2+b*x+c}');

    expect(result).toMatchObject({
      kind: 'elementary-solve',
      outcome: 'elementary-owned-by-existing-routes',
      sourceFamily: 'rational-log-derivative',
      proofMode: 'exact-symbolic-no-compute-engine',
    });
  });

  it('returns controlled unsupported stops instead of Compute Engine proof evidence', () => {
    const cubic = orchestrate('e^{x^3}');
    const depth2Deferred = orchestrate('e^{\\sin(x)}');

    expect(cubic).toMatchObject({
      kind: 'stop',
      outcome: 'controlled-unsupported-stop',
      reason: 'polynomial-degree-over-certificate-scope',
      proofMode: 'exact-symbolic-no-compute-engine',
    });
    expect(depth2Deferred).toMatchObject({
      kind: 'stop',
      outcome: 'controlled-unsupported-stop',
      proofMode: 'exact-symbolic-no-compute-engine',
    });
  });
});
