import { describe, expect, it } from 'vitest';
import { makeRequest } from './test-support';
import {
  normalizeEquationRuntimeRequest,
  runEquationModeForIsolatedWorker,
  runEquationModeForIsolatedWorkerWithProofSession,
} from './runtime-request-adapter';
import {
  createMathJsonProofVerificationSession,
} from '../../result-contract/mathjson-proof-verification-session';

describe('Equation runtime request adapter', () => {
  it('resolves a symbolic target at the non-frozen worker boundary', () => {
    const request = {
      ...makeRequest(),
      equationScreen: 'symbolic' as const,
      equationLatex: String.raw`\ln(x+1)=\ln(2x-3)`,
      equationSolveTarget: null,
    };

    expect(normalizeEquationRuntimeRequest(request)).toEqual({
      ...request,
      equationSolveTarget: 'x',
    });
  });

  it('finalizes a null-target request with producer-owned V2 proof', async () => {
    const result = await runEquationModeForIsolatedWorker({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: String.raw`\ln(x+1)=\ln(2x-3)`,
      equationSolveTarget: null,
      equationAnswerMode: 'exact',
      equationDomainIntent: 'real',
      complexExactForm: 'rectangular',
    });

    expect(result.outcome.kind).toBe('success');
    if (result.outcome.kind === 'prompt' || result.outcome.canonicalResult.version !== 2) {
      throw new Error('Expected a finalized Equation V2 result.');
    }
    expect(result.outcome.canonicalResult.primary?.kind).toBe('math');
    expect(result.outcome.canonicalResult.supplements?.map((entry) => entry.presentationLatex))
      .toEqual(['x+1>0', '2x-3>0']);
    expect(() => structuredClone(result)).not.toThrow();
  }, 30_000);

  it('reuses one lazy proof engine through recursive solving and finalization', async () => {
    const proofSession = createMathJsonProofVerificationSession();
    const result = await runEquationModeForIsolatedWorkerWithProofSession({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: String.raw`\sqrt{(2x+1)^4-5(2x+1)^2+4}=1`,
      equationSolveTarget: 'x',
      equationAnswerMode: 'exact',
      equationDomainIntent: 'real',
      complexExactForm: 'rectangular',
    }, proofSession);

    expect(result.outcome.kind).toBe('success');
    expect(proofSession.diagnostics()).toEqual(expect.objectContaining({
      computeEngineCreations: 1,
    }));
    expect(proofSession.diagnostics().cacheHits).toBeGreaterThan(0);
    expect(() => structuredClone(result)).not.toThrow();
  }, 30_000);

  it('never shares proof sessions across separate Equation requests', async () => {
    const first = createMathJsonProofVerificationSession();
    const second = createMathJsonProofVerificationSession();
    const request = {
      ...makeRequest(),
      equationScreen: 'symbolic' as const,
      equationLatex: String.raw`\ln(x+1)=\ln(2x-3)`,
      equationSolveTarget: 'x',
      equationAnswerMode: 'exact' as const,
      equationDomainIntent: 'real' as const,
      complexExactForm: 'rectangular' as const,
    };

    await runEquationModeForIsolatedWorkerWithProofSession(request, first);
    await runEquationModeForIsolatedWorkerWithProofSession(request, second);

    expect(first.diagnostics().computeEngineCreations).toBe(1);
    expect(second.diagnostics().computeEngineCreations).toBe(1);
    expect(first.diagnostics()).not.toBe(second.diagnostics());
  }, 30_000);

  it('finalizes every native branch of a bounded outer-wrapper finite result', async () => {
    const result = await runEquationModeForIsolatedWorker({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: String.raw`\ln(\sqrt{x^4-5x^2+4})=0`,
      equationSolveTarget: 'x',
      equationAnswerMode: 'exact',
      equationDomainIntent: 'real',
      complexExactForm: 'rectangular',
    });

    expect(result.outcome.kind).toBe('success');
    if (result.outcome.kind === 'prompt' || result.outcome.canonicalResult.version !== 2) {
      throw new Error('Expected a finalized Equation V2 result.');
    }
    const branches = result.outcome.canonicalResult.branchReadback?.branches;
    expect(branches).toHaveLength(4);
    expect(branches?.every((branch) => branch.mathJson !== undefined)).toBe(true);
    expect(branches?.map((branch) => branch.canonicalLatex)).toEqual([
      String.raw`-\sqrt{\frac{5}{2}+\frac{\sqrt{13}}{2}}`,
      String.raw`-\sqrt{\frac{5}{2}-\frac{\sqrt{13}}{2}}`,
      String.raw`\sqrt{\frac{5}{2}-\frac{\sqrt{13}}{2}}`,
      String.raw`\sqrt{\frac{5}{2}+\frac{\sqrt{13}}{2}}`,
    ]);
    expect(() => structuredClone(result)).not.toThrow();
  }, 30_000);
});
