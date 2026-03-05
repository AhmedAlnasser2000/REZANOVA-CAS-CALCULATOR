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
    expect(result.method).toContain('Bracket-first');
  });

  it('recovers an even-multiplicity root without a sign change when residual-verified', () => {
    const result = runNumericIntervalSolve('\\left(x-0.3\\right)^2=0', {
      start: '0',
      end: '1',
      subdivisions: 64,
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected numeric solve success');
    }
    expect(result.roots[0]).toBeGreaterThan(0.29);
    expect(result.roots[0]).toBeLessThan(0.31);
    expect(result.summaryText).toContain('Recovered');
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

  it('returns actionable no-root guidance for poor intervals', () => {
    const result = runNumericIntervalSolve('\\cos\\left(x\\right)=x', {
      start: '3',
      end: '20',
      subdivisions: 512,
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected numeric solve error');
    }
    expect(result.error).toContain('widening the interval');
    expect(result.error).toContain('shifting the interval center');
  });
});
