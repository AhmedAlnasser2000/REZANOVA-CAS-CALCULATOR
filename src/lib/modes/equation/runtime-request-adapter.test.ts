import { describe, expect, it } from 'vitest';
import { makeRequest } from './test-support';
import {
  normalizeEquationRuntimeRequest,
  runEquationModeForIsolatedWorker,
} from './runtime-request-adapter';

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
});
