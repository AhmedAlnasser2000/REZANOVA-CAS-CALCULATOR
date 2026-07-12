import { describe, expect, it } from 'vitest';
import type { DisplayOutcome } from '../../types/calculator';
import { buildCanonicalResultDocumentFromProducer, canonicalMathValue } from './producer';
import { resolveCanonicalResultForConsumer } from './consumer';

describe('canonical result consumer resolution', () => {
  it('keeps valid native truth authoritative over contradictory compatibility fields', () => {
    const canonicalResult = buildCanonicalResultDocumentFromProducer({
      outcomeKind: 'success',
      title: 'Canonical',
      primaryMath: canonicalMathValue('x=1'),
      warnings: ['Canonical warning'],
    });
    const outcome: DisplayOutcome = {
      kind: 'success',
      title: 'Stale',
      exactLatex: 'x=999',
      warnings: ['Stale warning'],
      canonicalResult,
    };

    expect(resolveCanonicalResultForConsumer(outcome)).toEqual({
      ok: true,
      source: 'native',
      document: canonicalResult,
    });
  });

  it('projects a typed compatibility outcome only when native truth is absent', () => {
    const resolution = resolveCanonicalResultForConsumer({
      kind: 'success',
      title: 'Legacy typed result',
      exactLatex: 'y=2',
      detailSections: [{ title: 'Method', lineKind: 'text', lines: ['Exact route'] }],
      warnings: [],
    });

    expect(resolution).toMatchObject({
      ok: true,
      source: 'compatibility',
      document: {
        title: 'Legacy typed result',
        primaryMath: { canonicalLatex: 'y=2' },
      },
    });
  });

  it('fails closed on an invalid native document instead of falling back to stale fields', () => {
    const resolution = resolveCanonicalResultForConsumer({
      kind: 'success',
      title: 'Compatibility',
      exactLatex: 'x=1',
      warnings: [],
      canonicalResult: { version: 1 } as never,
    });

    expect(resolution).toMatchObject({
      ok: false,
      failure: { reason: 'invalid-document' },
    });
  });
});
