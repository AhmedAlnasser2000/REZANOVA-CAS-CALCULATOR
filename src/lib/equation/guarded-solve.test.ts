import { describe, expect, it } from 'vitest';
import { runGuardedEquationSolve } from './guarded-solve';

describe('runGuardedEquationSolve', () => {
  const request = {
    originalLatex: '',
    resolvedLatex: '',
    angleUnit: 'deg' as const,
    outputStyle: 'both' as const,
    ansLatex: '0',
  };

  it('solves supported symbolic substitution families', () => {
    const result = runGuardedEquationSolve({
      ...request,
      originalLatex: '2\\sin^2\\left(x\\right)-3\\sin\\left(x\\right)+1=0',
      resolvedLatex: '2\\sin^2\\left(x\\right)-3\\sin\\left(x\\right)+1=0',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected guarded solve success');
    }
    expect(result.solveBadges).toContain('Symbolic Substitution');
  });

  it('runs numeric interval solving when an interval is provided', () => {
    const result = runGuardedEquationSolve({
      ...request,
      originalLatex: '\\cos\\left(x\\right)=x',
      resolvedLatex: '\\cos\\left(x\\right)=x',
      numericInterval: {
        start: '0',
        end: '1',
        subdivisions: 256,
      },
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected guarded numeric solve success');
    }
    expect(result.solveBadges).toContain('Numeric Interval');
    expect(result.solveBadges).toContain('Candidate Checked');
    expect(result.approxText).toContain('0.739');
  });
});
