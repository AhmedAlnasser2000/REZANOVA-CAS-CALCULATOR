import { describe, expect, it } from 'vitest';
import { intervalNewtonPruneCell } from './newton-pruning';

describe('interval Newton pruning evidence', () => {
  it('prunes a monotone cell when Newton evidence points outside the interval', () => {
    const result = intervalNewtonPruneCell({
      left: 0,
      right: 1,
      leftValue: Math.exp(0) + 1,
      rightValue: Math.exp(1) + 1,
      evaluator: (value) => Math.exp(value) + 1,
    });

    expect(result.kind).toBe('pruned');
    if (result.kind !== 'pruned') {
      throw new Error('Expected interval Newton pruning');
    }
    expect(result.newtonImage.right).toBeLessThan(0);
  });

  it('keeps cells when derivative evidence crosses zero near an even root', () => {
    const f = (value: number) => Math.pow(value - 0.3, 2);
    const result = intervalNewtonPruneCell({
      left: 0,
      right: 1,
      leftValue: f(0),
      rightValue: f(1),
      evaluator: f,
    });

    expect(result.kind).toBe('kept');
  });
});
