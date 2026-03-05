import { describe, expect, it } from 'vitest';
import { matchTrigEquationRewriteForSolve } from './rewrite-solve';

describe('matchTrigEquationRewriteForSolve', () => {
  it('matches product-to-double-angle equations', () => {
    const result = matchTrigEquationRewriteForSolve(
      '\\sin\\left(x\\right)\\cos\\left(x\\right)=\\frac{1}{2}',
      'deg',
    );

    expect(result.kind).toBe('candidate');
    if (result.kind !== 'candidate' || result.candidate.kind !== 'single-call') {
      throw new Error('Expected a single-call rewrite candidate');
    }
    expect(result.candidate.rewriteKind).toBe('product-double-angle');
    expect(result.candidate.solvedLatex.replaceAll(' ', '')).toContain('\\sin\\left(2x\\right)=1');
  });

  it('matches product-to-double-angle with affine arguments', () => {
    const result = matchTrigEquationRewriteForSolve(
      '\\sin\\left(x+30\\right)\\cos\\left(x+30\\right)=\\frac{1}{2}',
      'deg',
    );

    expect(result.kind).toBe('candidate');
    if (result.kind !== 'candidate' || result.candidate.kind !== 'single-call') {
      throw new Error('Expected a single-call rewrite candidate');
    }
    expect(result.candidate.solvedLatex.replaceAll(' ', '')).toContain('\\sin\\left(2(x+30)\\right)=1');
  });

  it('matches zero-form product rewrites', () => {
    const result = matchTrigEquationRewriteForSolve(
      '\\sin\\left(x\\right)\\cos\\left(x\\right)-\\frac{1}{2}=0',
      'deg',
    );

    expect(result.kind).toBe('candidate');
    if (result.kind !== 'candidate' || result.candidate.kind !== 'single-call') {
      throw new Error('Expected a single-call rewrite candidate');
    }
    expect(result.candidate.solvedLatex.replaceAll(' ', '')).toContain('\\sin\\left(2x\\right)=1');
  });

  it('matches cosine double-angle templates', () => {
    const result = matchTrigEquationRewriteForSolve(
      '2\\cos^2\\left(x\\right)-1=0',
      'deg',
    );

    expect(result.kind).toBe('candidate');
    if (result.kind !== 'candidate' || result.candidate.kind !== 'single-call') {
      throw new Error('Expected a single-call rewrite candidate');
    }
    expect(result.candidate.rewriteKind).toBe('cos-double-angle');
    expect(result.candidate.solvedLatex.replaceAll(' ', '')).toContain('\\cos\\left(2x\\right)=0');
  });

  it('matches normalized cosine double-angle equations regardless of term ordering', () => {
    const result = matchTrigEquationRewriteForSolve(
      '\\cos^2\\left(x\\right)-\\sin^2\\left(x\\right)=0',
      'deg',
    );

    expect(result.kind).toBe('candidate');
    if (result.kind !== 'candidate' || result.candidate.kind !== 'single-call') {
      throw new Error('Expected a single-call rewrite candidate');
    }
    expect(result.candidate.rewriteKind).toBe('cos-double-angle');
    expect(result.candidate.solvedLatex.replaceAll(' ', '')).toContain('\\cos\\left(2x\\right)=0');
  });

  it('matches trig-square split equations', () => {
    const result = matchTrigEquationRewriteForSolve(
      '\\sin^2\\left(x\\right)=\\frac{1}{4}',
      'deg',
    );

    expect(result.kind).toBe('candidate');
    if (result.kind !== 'candidate' || result.candidate.kind !== 'split-square') {
      throw new Error('Expected a split-square rewrite candidate');
    }
    expect(result.candidate.rewriteKind).toBe('sin-square-split');
    expect(result.candidate.branchLatex[0].replaceAll(' ', '')).toContain('\\sin\\left(x\\right)=\\frac{1}{2}');
    expect(result.candidate.branchLatex[1].replaceAll(' ', '')).toContain('\\sin\\left(x\\right)=-\\frac{1}{2}');
  });

  it('blocks out-of-range trig-square equations in the real domain', () => {
    const result = matchTrigEquationRewriteForSolve(
      '\\cos^2\\left(x\\right)=2',
      'deg',
    );

    expect(result.kind).toBe('blocked');
    if (result.kind !== 'blocked') {
      throw new Error('Expected a blocked rewrite result');
    }
    expect(result.error).toContain('cannot exceed 1');
  });

  it('ignores unsupported mixed trig families', () => {
    const result = matchTrigEquationRewriteForSolve(
      '\\sin\\left(x\\right)+\\cos\\left(x\\right)=1',
      'deg',
    );

    expect(result.kind).toBe('none');
  });
});
