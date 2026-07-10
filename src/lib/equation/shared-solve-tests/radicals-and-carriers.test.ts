import { describe, expect, it } from 'vitest';
import { baseEquationSolveRequest as request } from '../test-support/equation-request';
import { runSharedEquationSolve } from '../shared-solve';

describe('runSharedEquationSolve radicals and carriers', () => {
  it('solves bounded radical equations that polynomialize into algebraic biquadratic follow-ons', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\sqrt{x^4-5x^2+4}=1',
      resolvedLatex: '\\sqrt{x^4-5x^2+4}=1',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('\\frac{5}{2}');
    expect(result.exactLatex).toMatch(/(\\sqrt\{13\}|13\^\{1\/2\})/);
    expect(result.solveBadges).toContain('Radical Isolation');
    expect(result.solveBadges).toContain('Power Lift');
  });

  it('solves direct radical equations that hand off into quadratic-carrier polynomial follow-ons', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\sqrt{(x^2+x)^2-(x^2+x)}=1',
      resolvedLatex: '\\sqrt{(x^2+x)^2-(x^2+x)}=1',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('x\\in');
    expect(result.exactLatex).toMatch(/(\\sqrt\{5\}|5\^\{1\/2\})/);
    expect(result.solveBadges).toContain('Radical Isolation');
    expect(result.solveBadges).toContain('Power Lift');
    expect(result.solveBadges).toContain('Candidate Checked');
    expect(result.candidateValues).toHaveLength(2);
  });

  it('solves sequential radical families that reach the broader quadratic-carrier bridge', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\sqrt{x^2+x+\\sqrt{5-(x^2+x)}}=2',
      resolvedLatex: '\\sqrt{x^2+x+\\sqrt{5-(x^2+x)}}=2',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toMatch(/(\\sqrt\{5\}|5\^\{1\/2\})/);
    expect(result.solveBadges).toContain('Radical Isolation');
    expect(result.solveBadges).toContain('Power Lift');
    expect(result.solveBadges).toContain('Candidate Checked');
    expect(result.rejectedCandidateCount).toBe(2);
  });

  it('solves sequential radical families that hand off into bounded biquadratic exact follow-ons', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\sqrt{x^2+\\sqrt{5-x^2}}=2',
      resolvedLatex: '\\sqrt{x^2+\\sqrt{5-x^2}}=2',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('\\frac{7}{2}');
    expect(result.exactLatex).toMatch(/(\\sqrt\{5\}|5\^\{1\/2\})/);
    expect(result.solveBadges).toContain('Radical Isolation');
    expect(result.solveBadges).toContain('Power Lift');
    expect(result.solveBadges).toContain('Candidate Checked');
  });

  it('hands bounded outer-inversion radical carriers into the same algebraic biquadratic follow-on bridge', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\ln\\left(\\sqrt{x^4-5x^2+4}\\right)=0',
      resolvedLatex: '\\ln\\left(\\sqrt{x^4-5x^2+4}\\right)=0',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('\\frac{5}{2}');
    expect(result.exactLatex).toMatch(/(\\sqrt\{13\}|13\^\{1\/2\})/);
    expect(result.solveBadges).toContain('Outer Inversion');
    expect(result.solveBadges).toContain('Nested Recursion');
  });

  it('hands outer-inversion radical carriers into the shared quadratic-carrier follow-on bridge', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\ln\\left(\\sqrt{(x^2+x)^2-5(x^2+x)+4}\\right)=0',
      resolvedLatex: '\\ln\\left(\\sqrt{(x^2+x)^2-5(x^2+x)+4}\\right)=0',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toMatch(/(\\sqrt\{13\}|13\^\{1\/2\})/);
    expect(result.exactLatex).not.toContain('--');
    expect(result.solveBadges).toContain('Outer Inversion');
    expect(result.solveBadges).toContain('Nested Recursion');
  });

  it('solves broader even-power affine carrier follow-ons without widening Factor or Simplify', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\sqrt{(2x+1)^4-5(2x+1)^2+4}=1',
      resolvedLatex: '\\sqrt{(2x+1)^4-5(2x+1)^2+4}=1',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toMatch(/(\\sqrt\{13\}|13\^\{1\/2\})/);
    expect(result.solveBadges).toContain('Radical Isolation');
    expect(result.solveBadges).toContain('Power Lift');
    expect(result.solveBadges).toContain('Candidate Checked');
  });

  it('solves bounded repeated-clearing nested square-root families that close after one extra clear', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\sqrt{x+\\sqrt{5-x}}=2',
      resolvedLatex: '\\sqrt{x+\\sqrt{5-x}}=2',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a repeated-clearing success outcome');
    }
    expect(result.exactLatex).toContain('\\frac{7}{2}-\\frac{\\sqrt{5}}{2}');
    expect(result.solveBadges).toContain('Radical Isolation');
    expect(result.solveBadges).toContain('Power Lift');
    expect(result.solveBadges).toContain('Candidate Checked');
    expect(result.rejectedCandidateCount).toBe(1);
  });

  it('uses mixed-carrier factorization incidentally when it feeds bounded square-root factor sinks', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: 'x-5\\sqrt{x}+6=0',
      resolvedLatex: 'x-5\\sqrt{x}+6=0',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('4');
    expect(result.exactLatex).toContain('9');
    expect(result.solveSummaryText).toContain('Factored the mixed carrier expression');
    expect(result.exactSupplementLatex).toEqual(['\\text{Conditions: } x\\ge0']);
  });

  it('keeps mixed-carrier factorization incidental when no bounded factor sink improves the solve', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: 'x^{4/3}+3x-x^{2/3}-4x^{1/3}+2=0',
      resolvedLatex: 'x^{4/3}+3x-x^{2/3}-4x^{1/3}+2=0',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.error).toContain('outside the current exact bounded solve set');
  });

  it('solves bounded repeated-clearing nested carrier families through the shared bounded carrier sink', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\sqrt{x^2+x+\\sqrt{4-(x^2+x)}}=2',
      resolvedLatex: '\\sqrt{x^2+x+\\sqrt{4-(x^2+x)}}=2',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a repeated-clearing carrier success outcome');
    }
    expect(result.exactLatex).toContain('\\sqrt{13}');
    expect(result.solveBadges).toContain('Radical Isolation');
    expect(result.solveBadges).toContain('Power Lift');
    expect(result.solveBadges).toContain('Candidate Checked');
    expect(result.rejectedCandidateCount).toBe(2);
  });

  it('rejects extraneous candidates after repeated-clearing nested radical lifting', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\sqrt{x+\\sqrt{3-x}}=2',
      resolvedLatex: '\\sqrt{x+\\sqrt{3-x}}=2',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected a repeated-clearing rejection outcome');
    }
    expect(result.error).toContain('No real solutions remain after resolving the bounded carrier roots.');
    expect(result.solveBadges).toContain('Radical Isolation');
    expect(result.solveBadges).toContain('Power Lift');
  });

  it('rejects invalid absolute-value branches after radical square collapse while keeping valid polynomial branches', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\sqrt{(x^2-1)^2}=x',
      resolvedLatex: '\\sqrt{(x^2-1)^2}=x',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('\\frac{1}{2}+\\frac{\\sqrt{5}}{2}');
    expect(result.exactLatex).toContain('\\frac{\\sqrt{5}}{2}-\\frac{1}{2}');
    expect(result.solveBadges).toContain('Radical Isolation');
    expect(result.solveBadges).toContain('Candidate Checked');
    expect(result.rejectedCandidateCount).toBe(2);
    expect(result.exactSupplementLatex).toEqual(['\\text{Conditions: } x\\ge0']);
  });

  it('stops when a radical solve would exceed the bounded RAD2 transform budget', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\sqrt{x+1}=x-1',
      resolvedLatex: '\\sqrt{x+1}=x-1',
      radicalTransformDepth: 2,
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected a bounded-radical-budget error outcome');
    }
    expect(result.error).toContain('more than two bounded radical transform steps');
    expect(result.solveBadges).toContain('Radical Isolation');
    expect(result.exactSupplementLatex).toEqual(['\\text{Conditions: } x+1\\ge0']);
  });

  it('stops when a repeated-clearing path would require a second extra bounded clear', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\sqrt{x+\\sqrt{x+\\sqrt{x+\\sqrt{x}}}}=1',
      resolvedLatex: '\\sqrt{x+\\sqrt{x+\\sqrt{x+\\sqrt{x}}}}=1',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected a bounded repeated-clearing-budget error outcome');
    }
    expect(result.error).toContain('more than one extra bounded radical clear');
    expect(result.solveBadges).toContain('Radical Isolation');
  });

  it('solves supported nth-root equations with affine radicands', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\sqrt[3]{2x-1}=3',
      resolvedLatex: '\\sqrt[3]{2x-1}=3',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.candidateValues?.[0]).toBeCloseTo(14, 8);
    expect(result.solveBadges).toContain('Radical Isolation');
  });

  it('solves bounded rational-power isolation families exactly', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: 'x^{\\frac{3}{2}}=8',
      resolvedLatex: 'x^{\\frac{3}{2}}=8',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('x=4');
    expect(result.solveBadges).toContain('Power Lift');
    expect(result.exactSupplementLatex?.[0]).toContain('x\\ge0');
  });

  it('keeps bounded radical families outside the algebraic biquadratic bridge on honest guidance', () => {
    const cubicLike = runSharedEquationSolve({
      ...request,
      originalLatex: '\\sqrt{x^3-6x^2+11x-6}=1',
      resolvedLatex: '\\sqrt{x^3-6x^2+11x-6}=1',
    });
    const unsupportedQuartic = runSharedEquationSolve({
      ...request,
      originalLatex: '\\sqrt{x^4+x+1}=2',
      resolvedLatex: '\\sqrt{x^4+x+1}=2',
    });

    expect(cubicLike.kind).toBe('error');
    if (cubicLike.kind !== 'error') {
      throw new Error('Expected a bounded-support error outcome');
    }
    expect(cubicLike.error).toContain('outside the current exact bounded solve set');

    expect(unsupportedQuartic.kind).toBe('error');
    if (unsupportedQuartic.kind !== 'error') {
      throw new Error('Expected a bounded-support error outcome');
    }
    expect(unsupportedQuartic.error).toContain('outside the current exact bounded solve set');
  });

  it('solves bounded two-sided rational-power families with candidate validation', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\left(2x+1\\right)^{\\frac{2}{3}}=5',
      resolvedLatex: '\\left(2x+1\\right)^{\\frac{2}{3}}=5',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('x\\in');
    expect(result.exactLatex).toContain('\\sqrt{5}');
    expect(result.solveBadges).toContain('Power Lift');
  });

  it('recognizes bounded conjugate families without claiming false symbolic success', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\frac{1}{x+\\sqrt{2}}=0',
      resolvedLatex: '\\frac{1}{x+\\sqrt{2}}=0',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.solveBadges).toContain('Conjugate Transform');
  });

  it('solves supported conjugate families when the transformed equation stays bounded', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\frac{1}{\\sqrt{x}+1}=\\frac{1}{2}',
      resolvedLatex: '\\frac{1}{\\sqrt{x}+1}=\\frac{1}{2}',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('x=1');
    expect(result.solveBadges).toContain('Conjugate Transform');
    expect(result.solveBadges).toContain('Candidate Checked');
    const supplements = result.exactSupplementLatex?.join(' ') ?? '';
    expect(supplements).toContain('x\\ge0');
    expect(supplements).toContain('\\sqrt{x}+1\\ne0');
  });

  it('solves widened affine-scaled conjugate families when the transformed equation lands in an existing bounded sink', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\frac{1}{2+\\sqrt{x}}=\\frac{1}{3}',
      resolvedLatex: '\\frac{1}{2+\\sqrt{x}}=\\frac{1}{3}',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('x=1');
    expect(result.solveBadges).toContain('Conjugate Transform');
    expect(result.solveBadges).toContain('LCD Clear');
    const supplements = result.exactSupplementLatex?.join(' ') ?? '';
    expect(supplements).toContain('x\\ge0');
    expect(supplements).toContain('\\sqrt{x}+2\\ne0');
  });

  it('keeps widened two-radical conjugate families honest when they exceed the bounded follow-on budget', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\frac{1}{\\sqrt{x+1}+\\sqrt{x-1}}=1',
      resolvedLatex: '\\frac{1}{\\sqrt{x+1}+\\sqrt{x-1}}=1',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.error).toContain('more than two bounded radical transform steps');
    expect(result.solveBadges).toContain('Conjugate Transform');
  });

  it('solves selected three-term reciprocal families by clearing into an existing bounded denominator equation', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\frac{1}{1+\\sqrt{x}+\\sqrt{x+1}}=\\frac{1}{2}',
      resolvedLatex: '\\frac{1}{1+\\sqrt{x}+\\sqrt{x+1}}=\\frac{1}{2}',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('x=0');
    expect(result.solveBadges).toContain('LCD Clear');
    const supplements = result.exactSupplementLatex?.join(' ') ?? '';
    expect(supplements).toContain('\\sqrt{x}+\\sqrt{x+1}+1\\ne0');
    expect(supplements).toContain('x\\ge0');
  });

  it('keeps selected three-term reciprocal families on bounded guidance when the resulting denominator equation still overreaches', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\frac{1}{1+\\sqrt{x}+\\sqrt{x+1}}=\\frac{1}{2+\\sqrt{2}}',
      resolvedLatex: '\\frac{1}{1+\\sqrt{x}+\\sqrt{x+1}}=\\frac{1}{2+\\sqrt{2}}',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.error).toContain('outside the current exact bounded solve set');
    expect(result.solveBadges).toContain('LCD Clear');
  });
});
