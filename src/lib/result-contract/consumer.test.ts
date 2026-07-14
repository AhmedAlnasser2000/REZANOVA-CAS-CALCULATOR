import { describe, expect, it } from 'vitest';
import type { CanonicalRuntimeOutcome } from '../../types/calculator';
import { buildCanonicalResultDocumentFromProducer, canonicalMathValue } from './producer';
import { resolveCanonicalResultForConsumer } from './consumer';

describe('canonical result consumer resolution', () => {
  it('returns validated native canonical truth', () => {
    const canonicalResult = buildCanonicalResultDocumentFromProducer({
      outcomeKind: 'success',
      title: 'Canonical',
      primaryMath: canonicalMathValue('x=1'),
      warnings: ['Canonical warning'],
    });

    expect(resolveCanonicalResultForConsumer({ kind: 'success', canonicalResult })).toEqual({
      ok: true,
      source: 'native',
      document: canonicalResult,
    });
  });

  it('rejects prompt control outcomes', () => {
    expect(resolveCanonicalResultForConsumer({
      kind: 'prompt',
      title: 'Choose a target',
      message: 'Select a variable.',
      targetMode: 'equation',
      carryLatex: 'x+y=1',
      warnings: [],
    })).toMatchObject({
      ok: false,
      failure: { reason: 'prompt-outcome' },
    });
  });

  it('fails closed on an invalid native document', () => {
    const outcome = {
      kind: 'success',
      canonicalResult: { version: 1 },
    } as unknown as CanonicalRuntimeOutcome;
    expect(resolveCanonicalResultForConsumer(outcome)).toMatchObject({
      ok: false,
      failure: { reason: 'invalid-document' },
    });
  });

  it('fails closed when runtime and document outcome kinds disagree', () => {
    const canonicalResult = buildCanonicalResultDocumentFromProducer({
      outcomeKind: 'error',
      title: 'Controlled stop',
      error: 'No real solution.',
      warnings: [],
    });

    expect(resolveCanonicalResultForConsumer({
      kind: 'success',
      canonicalResult,
    } as unknown as CanonicalRuntimeOutcome)).toMatchObject({
      ok: false,
      failure: {
        reason: 'invalid-document',
        message: 'Runtime kind must match the canonical result document outcome kind.',
      },
    });
  });
});
