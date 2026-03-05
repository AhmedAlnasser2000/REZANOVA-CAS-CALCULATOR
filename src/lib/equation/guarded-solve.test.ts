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

  it('solves exponential substitution families without hitting recursion depth', () => {
    const result = runGuardedEquationSolve({
      ...request,
      originalLatex: 'e^{2x}-5e^x+6=0',
      resolvedLatex: 'e^{2x}-5e^x+6=0',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected guarded solve success');
    }
    expect(result.solveBadges).toContain('Symbolic Substitution');
    expect(result.solveBadges).toContain('Inverse Isolation');
    expect(result.exactLatex ?? result.approxText ?? '').toContain('0.693');
    expect(result.exactLatex ?? result.approxText ?? '').toContain('1.098');
  });

  it('solves exponential substitution families written with exp(...) notation', () => {
    const result = runGuardedEquationSolve({
      ...request,
      originalLatex: '\\exp\\left(2x\\right)-5\\exp\\left(x\\right)+6=0',
      resolvedLatex: '\\exp\\left(2x\\right)-5\\exp\\left(x\\right)+6=0',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected guarded solve success');
    }
    expect(result.solveBadges).toContain('Symbolic Substitution');
    expect(result.solveBadges).toContain('Inverse Isolation');
  });

  it('solves tan-polynomial substitution families', () => {
    const result = runGuardedEquationSolve({
      ...request,
      originalLatex: '2\\tan^2\\left(3x\\right)+\\tan\\left(3x\\right)-1=0',
      resolvedLatex: '2\\tan^2\\left(3x\\right)+\\tan\\left(3x\\right)-1=0',
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

  it('hard-stops impossible real equations before family matching', () => {
    const result = runGuardedEquationSolve({
      ...request,
      originalLatex: '\\sin\\left(x^2\\right)=5',
      resolvedLatex: '\\sin\\left(x^2\\right)=5',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected guarded solve error');
    }
    expect(result.solveBadges).toContain('Range Guard');
    expect(result.error).toContain('between -1 and 1');
  });

  it('hard-stops bounded trig products that cannot reach the target', () => {
    const result = runGuardedEquationSolve({
      ...request,
      originalLatex: '\\sin\\left(x^2\\right)\\cos\\left(x\\right)=5',
      resolvedLatex: '\\sin\\left(x^2\\right)\\cos\\left(x\\right)=5',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected guarded solve error');
    }
    expect(result.solveBadges).toContain('Range Guard');
    expect(result.solveSummaryText).toContain('[-1, 1]');
  });
});
