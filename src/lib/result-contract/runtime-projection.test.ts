import { describe, expect, it } from 'vitest';
import type { DisplayOutcome } from '../../types/calculator';
import { buildCanonicalResultDocumentFromProducer, canonicalMathValue } from './producer';
import {
  projectCanonicalRuntimeOutcomeToDisplayOutcome,
  projectDisplayOutcomeToCanonicalRuntimeOutcome,
} from './runtime-projection';

describe('canonical runtime projection', () => {
  it('moves transient actions through canonical math values without parsing output', () => {
    const canonicalResult = buildCanonicalResultDocumentFromProducer({
      outcomeKind: 'success',
      title: 'Solve',
      primaryMath: canonicalMathValue('x=1', ['Equal', 'x', 1]),
      warnings: [],
    });
    const display: DisplayOutcome = {
      kind: 'success',
      title: 'Solve',
      exactLatex: 'x=1',
      canonicalResult,
      warnings: [],
      actions: [{ kind: 'send', target: 'equation', latex: 'x=1' }],
    };

    const runtime = projectDisplayOutcomeToCanonicalRuntimeOutcome(display, 'test');
    expect(runtime).toMatchObject({
      kind: 'success',
      actions: [{
        kind: 'send',
        target: 'equation',
        math: { canonicalLatex: 'x=1' },
      }],
    });
    expect(projectCanonicalRuntimeOutcomeToDisplayOutcome(runtime)).toMatchObject({
      kind: 'success',
      exactLatex: 'x=1',
      actions: [{ kind: 'send', target: 'equation', latex: 'x=1' }],
    });
  });

  it('preserves prompt control flow without creating result authority', () => {
    const prompt: DisplayOutcome = {
      kind: 'prompt',
      title: 'Need input',
      message: 'Choose a target.',
      targetMode: 'equation',
      carryLatex: 'x+1',
      warnings: [],
    };
    const runtime = projectDisplayOutcomeToCanonicalRuntimeOutcome(prompt, 'test');
    expect(runtime).toEqual(prompt);
    expect(projectCanonicalRuntimeOutcomeToDisplayOutcome(runtime)).toEqual(prompt);
  });

  it('retains canonical LaTeX when no proven MathJSON payload is available', () => {
    const canonicalResult = buildCanonicalResultDocumentFromProducer({
      outcomeKind: 'success',
      title: 'Cancel Factors',
      primaryMath: canonicalMathValue('x+1'),
      warnings: [],
    });

    const display = projectCanonicalRuntimeOutcomeToDisplayOutcome({
      kind: 'success',
      canonicalResult,
    });

    expect(display).toMatchObject({ exactLatex: 'x+1' });
    expect(display).not.toHaveProperty('canonicalMath');
  });

  it('fails closed for string-only result payloads', () => {
    expect(() => projectDisplayOutcomeToCanonicalRuntimeOutcome({
      kind: 'error',
      title: 'Solve',
      error: 'Stopped.',
      warnings: [],
    }, 'test')).toThrow('missing native canonical result authority');
  });
});
