import { describe, expect, it } from 'vitest';
import type {
  DisplayOutcome,
  EvaluateRequest,
  GuardedSolveRequest,
  NumericSolveInterval,
} from '../calculator';

describe('calculator runtime contract exports', () => {
  it('keeps the narrowed runtime contracts available through the calculator barrel', () => {
    const interval: NumericSolveInterval = {
      start: '0',
      end: '1',
      subdivisions: 8,
    };

    const evaluateRequest: EvaluateRequest = {
      mode: 'calculate',
      document: { latex: '2+2' },
      angleUnit: 'deg',
      outputStyle: 'both',
      variables: {},
    };

    const guardedSolveRequest: GuardedSolveRequest = {
      originalLatex: 'x^2=1',
      resolvedLatex: 'x^2=1',
      angleUnit: 'deg',
      outputStyle: 'both',
      ansLatex: '0',
      numericInterval: interval,
    };

    const outcome: DisplayOutcome = {
      kind: 'success',
      title: 'Solve',
      exactLatex: 'x=1',
      warnings: [],
    };

    expect(evaluateRequest.document.latex).toBe('2+2');
    expect(guardedSolveRequest.numericInterval?.subdivisions).toBe(8);
    expect(outcome.kind).toBe('success');
  });
});
