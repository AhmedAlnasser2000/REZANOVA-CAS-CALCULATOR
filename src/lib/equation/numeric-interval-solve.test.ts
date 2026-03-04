import { describe, expect, it } from 'vitest';
import { runNumericIntervalSolve } from './numeric-interval-solve';

describe('runNumericIntervalSolve', () => {
  it('finds bracketed numeric roots on an interval', () => {
    const result = runNumericIntervalSolve('\\cos\\left(x\\right)=x', {
      start: '0',
      end: '1',
      subdivisions: 256,
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected numeric solve success');
    }
    expect(result.roots[0]).toBeGreaterThan(0.73);
    expect(result.roots[0]).toBeLessThan(0.75);
  });

  it('rejects invalid intervals', () => {
    const result = runNumericIntervalSolve('x=0', {
      start: '1',
      end: '0',
      subdivisions: 256,
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected numeric solve error');
    }
    expect(result.error).toContain('Start < End');
  });
});
