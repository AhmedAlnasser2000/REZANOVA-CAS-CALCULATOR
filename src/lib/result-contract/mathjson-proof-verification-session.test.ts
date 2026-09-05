import { describe, expect, it } from 'vitest';
import {
  declareProducerOwnedAnswerMathJson,
  proveStandardAnswerMathJson,
} from './proven-answer-mathjson';
import {
  createMathJsonProofVerificationSession,
  runWithMathJsonProofVerificationSession,
} from './mathjson-proof-verification-session';

function candidate(mathJson: unknown, source: string) {
  return declareProducerOwnedAnswerMathJson({
    mathJson,
    owner: 'equation',
    routeId: 'equation.rational-radical',
    source,
  });
}

describe('request-scoped MathJSON proof verification', () => {
  it('rechecks provenance and clone safety before reusing a successful comparison', async () => {
    const session = createMathJsonProofVerificationSession();
    await runWithMathJsonProofVerificationSession(session, async () => {
      expect(proveStandardAnswerMathJson({
        canonicalLatex: 'x+1',
        candidate: candidate(['Add', 'x', 1], 'first-source'),
      }).ok).toBe(true);
      const repeated = proveStandardAnswerMathJson({
        canonicalLatex: 'x+1',
        candidate: candidate(['Add', 'x', 1], 'second-source'),
      });
      expect(repeated.ok).toBe(true);
      if (repeated.ok) expect(repeated.evidence.source).toBe('second-source');
      const wrongOwnerRoute = declareProducerOwnedAnswerMathJson({
        mathJson: ['Add', 'x', 1],
        owner: 'equation',
        routeId: 'calculate.arithmetic',
        source: 'wrong-route',
      });
      const rejected = proveStandardAnswerMathJson({
        canonicalLatex: 'x+1',
        candidate: wrongOwnerRoute,
      });
      expect(rejected.ok).toBe(false);
      if (!rejected.ok) expect(rejected.failure.reason).toBe('invalid-provenance');
    });

    expect(session.diagnostics()).toEqual({
      computeEngineCreations: 1,
      comparisonExecutions: 1,
      cacheHits: 1,
      cacheWrites: 1,
    });
  });

  it('never caches a semantic mismatch', async () => {
    const session = createMathJsonProofVerificationSession();
    await runWithMathJsonProofVerificationSession(session, async () => {
      for (let index = 0; index < 2; index += 1) {
        const result = proveStandardAnswerMathJson({
          canonicalLatex: 'x+1',
          candidate: candidate(['Add', 'x', 2], `near-miss-${index}`),
        });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.failure.reason).toBe('semantic-mismatch');
      }
    });

    expect(session.diagnostics()).toEqual({
      computeEngineCreations: 1,
      comparisonExecutions: 2,
      cacheHits: 0,
      cacheWrites: 0,
    });
  });

  it('never caches an opposite signed-imaginary formal mismatch', async () => {
    const session = createMathJsonProofVerificationSession();
    await runWithMathJsonProofVerificationSession(session, async () => {
      for (let index = 0; index < 2; index += 1) {
        const result = proveStandardAnswerMathJson({
          canonicalLatex: 'x=-i',
          candidate: candidate(
            ['Equal', 'x', ['Multiply', 1, 'ImaginaryUnit']],
            `signed-imaginary-near-miss-${index}`,
          ),
        });
        expect(result).toMatchObject({
          ok: false,
          failure: { reason: 'semantic-mismatch' },
        });
      }
    });

    expect(session.diagnostics()).toEqual({
      computeEngineCreations: 1,
      comparisonExecutions: 2,
      cacheHits: 0,
      cacheWrites: 0,
    });
  });

  it('does not let overlapping sessions share cached proof', async () => {
    const first = createMathJsonProofVerificationSession();
    const second = createMathJsonProofVerificationSession();
    await Promise.all([
      runWithMathJsonProofVerificationSession(first, async () => {
        await Promise.resolve();
        expect(proveStandardAnswerMathJson({
          canonicalLatex: 'x+1',
          candidate: candidate(['Add', 'x', 1], 'overlap-first'),
        }).ok).toBe(true);
      }),
      runWithMathJsonProofVerificationSession(second, async () => {
        await Promise.resolve();
        expect(proveStandardAnswerMathJson({
          canonicalLatex: 'x+1',
          candidate: candidate(['Add', 'x', 1], 'overlap-second'),
        }).ok).toBe(true);
      }),
    ]);

    expect(first.diagnostics().cacheHits).toBe(0);
    expect(second.diagnostics().cacheHits).toBe(0);
  });
});
