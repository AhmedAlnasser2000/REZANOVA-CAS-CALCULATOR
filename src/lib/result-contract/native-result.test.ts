import { describe, expect, it } from 'vitest';
import type { DisplayOutcome } from '../../types/calculator';
import { buildCanonicalResultDocumentFromProducer } from './producer';
import { requireNativeSuccessfulResult } from './native-result';

describe('successful result native authority', () => {
  it('retains a matching native success and rejects missing or stale authority', () => {
    const canonicalResult = buildCanonicalResultDocumentFromProducer({
      outcomeKind: 'success',
      title: 'Calculate',
      warnings: [],
    });
    const native: DisplayOutcome = {
      kind: 'success',
      title: 'Calculate',
      warnings: [],
      canonicalResult,
    };

    expect(requireNativeSuccessfulResult(native, 'Calculate')).toBe(native);
    expect(() => requireNativeSuccessfulResult({
      kind: 'success',
      title: 'Calculate',
      warnings: [],
    }, 'Calculate')).toThrow('Calculate success is missing native canonical authority');
    expect(() => requireNativeSuccessfulResult({
      ...native,
      exactSupplementLatex: ['x\\ne0'],
    }, 'Calculate')).toThrow('Calculate success is missing native canonical authority');
  });

  it('leaves prompts and controlled errors outside the success requirement', () => {
    const prompt: DisplayOutcome = {
      kind: 'prompt',
      title: 'Calculate',
      message: 'Use Equation mode.',
      targetMode: 'equation',
      carryLatex: 'x=1',
      warnings: [],
    };
    const error: DisplayOutcome = {
      kind: 'error',
      title: 'Table',
      error: 'Table build was stopped before it finished.',
      warnings: [],
    };

    expect(requireNativeSuccessfulResult(prompt, 'Calculate')).toBe(prompt);
    expect(requireNativeSuccessfulResult(error, 'Table')).toBe(error);
  });
});
