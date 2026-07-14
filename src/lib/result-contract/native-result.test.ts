import { describe, expect, it } from 'vitest';
import type { ResultProducerDraft } from '../../types/calculator';
import { requireCanonicalResultAuthority } from './native-result';
import { buildCanonicalResultDocumentFromProducer } from './producer';

describe('native canonical result authority', () => {
  it('accepts prompts and validated producer-owned documents', () => {
    const prompt: ResultProducerDraft = {
      kind: 'prompt',
      title: 'Target',
      message: 'Choose a variable.',
      targetMode: 'equation',
      carryLatex: 'x+y=1',
      warnings: [],
    };
    expect(requireCanonicalResultAuthority(prompt, 'test')).toEqual(prompt);

    const result: ResultProducerDraft = {
      kind: 'success',
      title: 'Result',
      exactLatex: '4',
      warnings: [],
      canonicalResult: buildCanonicalResultDocumentFromProducer({
        outcomeKind: 'success',
        title: 'Result',
        primaryMath: { canonicalLatex: '4' },
        warnings: [],
      }),
    };
    expect(requireCanonicalResultAuthority(result, 'test')).toMatchObject({
      canonicalResult: { primaryMath: { canonicalLatex: '4' } },
    });
  });

  it('fails closed when authority is absent or malformed', () => {
    expect(() => requireCanonicalResultAuthority({
      kind: 'success',
      title: 'Missing',
      warnings: [],
    }, 'test')).toThrow('missing native canonical result authority');

    expect(() => requireCanonicalResultAuthority({
      kind: 'error',
      title: 'Malformed',
      error: 'Stop',
      warnings: [],
      canonicalResult: { version: 1 } as never,
    }, 'test')).toThrow('invalid canonical result authority');
  });
});
