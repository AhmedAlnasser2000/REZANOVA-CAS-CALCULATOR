import { describe, expect, it } from 'vitest';
import { matchSubstitutionSolve } from './substitution-solve';

describe('matchSubstitutionSolve', () => {
  it('matches bounded trig carrier substitution', () => {
    const result = matchSubstitutionSolve('2\\sin^2\\left(x\\right)-3\\sin\\left(x\\right)+1=0', 'deg');

    expect(result.kind).toBe('branches');
    if (result.kind !== 'branches') {
      throw new Error('Expected substitution branches');
    }
    expect(result.solveBadges).toContain('Symbolic Substitution');
    expect(result.solveSummaryText).toContain('t = \\sin');
    expect(result.equations).toContain('\\sin\\left(x\\right)=1');
    expect(result.equations).toContain('\\sin\\left(x\\right)=\\frac{1}{2}');
  });

  it('matches tan-polynomial substitution families', () => {
    const result = matchSubstitutionSolve('2\\tan^2\\left(3x\\right)+\\tan\\left(3x\\right)-1=0', 'deg');

    expect(result.kind).toBe('branches');
    if (result.kind !== 'branches') {
      throw new Error('Expected substitution branches');
    }
    expect(result.solveBadges).toContain('Symbolic Substitution');
    expect(result.equations).toContain('\\tan\\left(3x\\right)=\\frac{1}{2}');
    expect(result.equations).toContain('\\tan\\left(3x\\right)=-1');
  });

  it('matches bounded exponential carrier substitution', () => {
    const result = matchSubstitutionSolve('e^{2x}-5e^x+6=0', 'deg');

    expect(result.kind).toBe('branches');
    if (result.kind !== 'branches') {
      throw new Error('Expected substitution branches');
    }
    expect(result.solveSummaryText).toContain('t = e^x');
    expect(result.equations).toContain('e^x=3');
    expect(result.equations).toContain('e^x=2');
  });

  it('matches exponential substitution when expression uses exp(...) notation', () => {
    const result = matchSubstitutionSolve('\\exp\\left(2x\\right)-5\\exp\\left(x\\right)+6=0', 'deg');

    expect(result.kind).toBe('branches');
    if (result.kind !== 'branches') {
      throw new Error('Expected substitution branches');
    }
    expect(result.solveSummaryText).toContain('t = e^x');
    expect(result.equations).toContain('e^x=3');
    expect(result.equations).toContain('e^x=2');
  });

  it('matches inverse isolation for logarithmic equations', () => {
    const result = matchSubstitutionSolve('\\ln\\left(2x+1\\right)=3', 'deg');

    expect(result.kind).toBe('branches');
    if (result.kind !== 'branches') {
      throw new Error('Expected inverse-isolation branch');
    }
    expect(result.solveBadges).toContain('Inverse Isolation');
    expect(result.solveSummaryText).toContain('2x+1=e^{3}');
    expect(result.equations[0]).toBe('2x+1=e^{3}');
  });
});
