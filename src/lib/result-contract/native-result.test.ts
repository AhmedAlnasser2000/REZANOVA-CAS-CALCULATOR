import { describe, expect, it } from 'vitest';
import type { DisplayOutcome } from '../../types/calculator';
import { buildCanonicalResultDocumentFromProducer } from './producer';
import {
  isMathBearingControlledError,
  requireCanonicalResultAuthority,
} from './native-result';

describe('live result native authority', () => {
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

    expect(requireCanonicalResultAuthority(native, 'Calculate')).toBe(native);
    expect(() => requireCanonicalResultAuthority({
      kind: 'success',
      title: 'Calculate',
      warnings: [],
    }, 'Calculate')).toThrow('Calculate success is missing native canonical authority');
    expect(() => requireCanonicalResultAuthority({
      ...native,
      exactSupplementLatex: ['x\\ne0'],
    }, 'Calculate')).toThrow('Calculate success is missing native canonical authority');
  });

  it('requires native authority for math-bearing errors and leaves control outcomes separate', () => {
    const prompt: DisplayOutcome = {
      kind: 'prompt',
      title: 'Calculate',
      message: 'Use Equation mode.',
      targetMode: 'equation',
      carryLatex: 'x=1',
      warnings: [],
    };
    const controlError: DisplayOutcome = {
      kind: 'error',
      title: 'Table',
      error: 'Table build was stopped before it finished.',
      warnings: [],
    };
    const mathError: DisplayOutcome = {
      kind: 'error',
      title: 'Boundary',
      error: 'No real solution.',
      exactLatex: 'x\\notin\\mathbb{R}',
      warnings: [],
    };
    const canonicalResult = buildCanonicalResultDocumentFromProducer({
      outcomeKind: 'error',
      title: mathError.title,
      error: mathError.error,
      primaryMath: { canonicalLatex: mathError.exactLatex ?? '' },
      warnings: [],
    });

    expect(isMathBearingControlledError(controlError)).toBe(false);
    expect(isMathBearingControlledError(mathError)).toBe(true);
    expect(requireCanonicalResultAuthority(prompt, 'Calculate')).toBe(prompt);
    expect(requireCanonicalResultAuthority(controlError, 'Table')).toBe(controlError);
    expect(() => requireCanonicalResultAuthority(mathError, 'Equation'))
      .toThrow('Equation math-bearing error is missing native canonical authority');
    expect(requireCanonicalResultAuthority({ ...mathError, canonicalResult }, 'Equation'))
      .toMatchObject({ canonicalResult });
  });
});
