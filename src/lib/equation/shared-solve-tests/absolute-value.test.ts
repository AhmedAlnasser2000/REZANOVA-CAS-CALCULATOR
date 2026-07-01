import { describe, expect, it } from 'vitest';
import { baseEquationSolveRequest as request } from '../test-support/equation-request';
import { runSharedEquationSolve } from '../shared-solve';

describe('runSharedEquationSolve absolute-value routing', () => {
  it('solves bounded absolute-value follow-ons produced by exact square-root squares', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\sqrt{(x+1)^2}=x+3',
      resolvedLatex: '\\sqrt{(x+1)^2}=x+3',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('x=-2');
    expect(result.solveBadges).toContain('Radical Isolation');
    expect(result.solveBadges).toContain('Candidate Checked');
    expect(result.exactSupplementLatex).toEqual(['\\text{Conditions: } x+3\\ge0']);
  });

  it('solves wrapped absolute-value follow-ons produced by exact square-root squares', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\sqrt{(x+1)^2}+1=6',
      resolvedLatex: '\\sqrt{(x+1)^2}+1=6',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('x\\in');
    expect(result.exactLatex).toContain('-6');
    expect(result.exactLatex).toContain('4');
    expect(result.solveBadges).toContain('Radical Isolation');
    expect(result.solveBadges).toContain('Candidate Checked');
  });

  it('solves direct bounded |u|=c families through the shared abs core', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\left|2x-3\\right|=5',
      resolvedLatex: '\\left|2x-3\\right|=5',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('x\\in');
    expect(result.exactLatex).toContain('-1');
    expect(result.exactLatex).toContain('4');
    expect(result.solveBadges).toContain('Candidate Checked');
  });

  it('preserves both real branches for positive direct absolute-value comparisons', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\left|x-2\\right|=3',
      resolvedLatex: '\\left|x-2\\right|=3',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('x\\in');
    expect(result.exactLatex).toContain('-1');
    expect(result.exactLatex).toContain('5');
    expect(result.solveBadges).toContain('Candidate Checked');
  });

  it('returns no real solutions for negative direct absolute-value comparisons', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\left|x-2\\right|=-3',
      resolvedLatex: '\\left|x-2\\right|=-3',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.error).toContain('No real solutions');
    expect(result.error).toContain('absolute values are always nonnegative');
  });

  it('collapses zero direct absolute-value comparisons to the single branch', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\left|x-2\\right|=0',
      resolvedLatex: '\\left|x-2\\right|=0',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('x=2');
    expect(result.solveBadges).toContain('Candidate Checked');
  });

  it('routes square roots of squares as absolute values with both branches', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\sqrt{x^2}=3',
      resolvedLatex: '\\sqrt{x^2}=3',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('x\\in');
    expect(result.exactLatex).toContain('-3');
    expect(result.exactLatex).toContain('3');
    expect(result.solveBadges).toContain('Radical Isolation');
    expect(result.solveBadges).toContain('Candidate Checked');
  });

  it('solves direct bounded |u|=v families with preserved nonnegativity conditions', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\left|x+1\\right|=x+3',
      resolvedLatex: '\\left|x+1\\right|=x+3',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toBe('x=-2');
    expect(result.exactSupplementLatex).toEqual(['\\text{Conditions: } x+3\\ge0']);
    expect(result.solveBadges).toContain('Candidate Checked');
  });

  it('solves direct bounded |u|=|v| families through exact branch reduction', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\left|2x-1\\right|=\\left|x+4\\right|',
      resolvedLatex: '\\left|2x-1\\right|=\\left|x+4\\right|',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('x\\in');
    expect(result.exactLatex).toContain('-1');
    expect(result.exactLatex).toContain('5');
    expect(result.solveBadges).toContain('Candidate Checked');
  });

  it('solves affine-wrapped |u|=v families through the broader shared abs core', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '2\\left|x+1\\right|-3=x',
      resolvedLatex: '2\\left|x+1\\right|-3=x',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('x\\in');
    expect(result.exactLatex).toContain('\\frac{-5}{3}');
    expect(result.exactLatex).toContain('1');
    expect(result.exactSupplementLatex).toEqual(['\\text{Conditions: } \\frac{x}{2}+\\frac{3}{2}\\ge0']);
    expect(result.solveBadges).toContain('Candidate Checked');
  });

  it('solves affine-wrapped |u|=|v| families through repeated reuse of the same branch model', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '3\\left|2x-1\\right|+4=\\left|x+5\\right|',
      resolvedLatex: '3\\left|2x-1\\right|+4=\\left|x+5\\right|',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('x\\in');
    expect(result.exactLatex).toContain('\\frac{4}{5}');
    expect(result.exactLatex).toContain('\\frac{2}{7}');
    expect(result.exactSupplementLatex?.[0]).toContain('\\frac{\\vert x+5\\vert}{3}-\\frac{4}{3}\\ge0');
    expect(result.solveBadges).toContain('Candidate Checked');
  });

  it('solves stronger polynomial-carrier |u|=c families through the existing bounded branch model', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\left|x^2+x-2\\right|=3',
      resolvedLatex: '\\left|x^2+x-2\\right|=3',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('x\\in');
    expect(result.exactLatex).toMatch(/(\\sqrt\{21\}|21\^\{1\/2\})/);
    expect(result.solveBadges).toContain('Candidate Checked');
    expect(result.candidateValues).toHaveLength(2);
  });

  it('keeps stronger wrapped polynomial-carrier abs families real-only after branch validation', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '2\\left|x^2-1\\right|+1=7',
      resolvedLatex: '2\\left|x^2-1\\right|+1=7',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('-2');
    expect(result.exactLatex).toContain('2');
    expect(result.exactLatex).not.toContain('\\imaginaryI');
    expect(result.approxText).toBe('x ~= -2, 2');
  });

  it('solves stronger radical-carrier abs families through bounded branch reuse', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\left|\\sqrt{x+1}-2\\right|=1',
      resolvedLatex: '\\left|\\sqrt{x+1}-2\\right|=1',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('0');
    expect(result.exactLatex).toContain('8');
    expect(result.solveBadges).toContain('Power Lift');
    expect(result.exactSupplementLatex).toEqual(['\\text{Conditions: } x+1\\ge0']);
  });

  it('solves stronger rational-power-carrier abs families through bounded branch reuse', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\left|x^{\\frac{1}{3}}-1\\right|=2',
      resolvedLatex: '\\left|x^{\\frac{1}{3}}-1\\right|=2',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('27');
    expect(result.exactLatex).toContain('-1');
    expect(result.solveBadges).toContain('Power Lift');
  });

  it('solves stronger |u|=|v| carrier families when both branches stay inside bounded sinks', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\left|x^2-1\\right|=\\left|x+1\\right|',
      resolvedLatex: '\\left|x^2-1\\right|=\\left|x+1\\right|',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('-1');
    expect(result.exactLatex).toContain('0');
    expect(result.exactLatex).toContain('2');
  });

  it('keeps stronger |u|=|v| carrier families honest when a branch leaves the bounded sink set', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\left|x^2+1\\right|=\\left|e^x\\right|',
      resolvedLatex: '\\left|x^2+1\\right|=\\left|e^x\\right|',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.error).toContain('stronger absolute-value carrier family is outside the current exact bounded solve set');
  });

  it('solves bounded outer-polynomial abs families through one normalized |u| placeholder', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\left|x-1\\right|^2-5\\left|x-1\\right|+6=0',
      resolvedLatex: '\\left|x-1\\right|^2-5\\left|x-1\\right|+6=0',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('-2');
    expect(result.exactLatex).toContain('-1');
    expect(result.exactLatex).toContain('3');
    expect(result.exactLatex).toContain('4');
    expect(result.candidateValues).toHaveLength(4);
  });

  it('keeps outer-polynomial stronger polynomial abs families real-only after branch validation', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '2\\left|x^2-1\\right|^2-8\\left|x^2-1\\right|=0',
      resolvedLatex: '2\\left|x^2-1\\right|^2-8\\left|x^2-1\\right|=0',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex).toContain('-1');
    expect(result.exactLatex).toContain('1');
    expect(result.exactLatex).toContain('\\sqrt{5}');
    expect(result.exactLatex).not.toContain('\\imaginaryI');
  });

  it('solves outer-polynomial radical and rational-power abs carriers through the shared branch model', () => {
    const radical = runSharedEquationSolve({
      ...request,
      originalLatex: '\\left|\\sqrt{x+1}-2\\right|^2=1',
      resolvedLatex: '\\left|\\sqrt{x+1}-2\\right|^2=1',
    });
    const rationalPower = runSharedEquationSolve({
      ...request,
      originalLatex: '\\left|x^{\\frac{1}{3}}-1\\right|^2-\\left|x^{\\frac{1}{3}}-1\\right|-2=0',
      resolvedLatex: '\\left|x^{\\frac{1}{3}}-1\\right|^2-\\left|x^{\\frac{1}{3}}-1\\right|-2=0',
    });

    expect(radical.kind).toBe('success');
    if (radical.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(radical.exactLatex).toContain('0');
    expect(radical.exactLatex).toContain('8');

    expect(rationalPower.kind).toBe('success');
    if (rationalPower.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(rationalPower.exactLatex).toContain('27');
    expect(rationalPower.exactLatex).toContain('-1');
  });

  it('solves composition-backed abs outer polynomials when every generated branch stays exact', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '\\left|\\sin\\left(x^2+x\\right)\\right|^2=\\frac{1}{4}',
      resolvedLatex: '\\left|\\sin\\left(x^2+x\\right)\\right|^2=\\frac{1}{4}',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.solveBadges).toContain('Periodic Family');
    expect(result.periodicFamily?.branchesLatex.length ?? 0).toBeGreaterThan(0);
  });

  it('solves outer-polynomial composition-backed abs families once every generated branch reaches an exact reduced carrier', () => {
    const result = runSharedEquationSolve({
      ...request,
      originalLatex: '6\\left|\\sin\\left(x^3+x\\right)\\right|^2-5\\left|\\sin\\left(x^3+x\\right)\\right|+1=0',
      resolvedLatex: '6\\left|\\sin\\left(x^3+x\\right)\\right|^2-5\\left|\\sin\\left(x^3+x\\right)\\right|+1=0',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(result.exactLatex ?? '').toContain('x^3+x');
    expect(result.solveBadges).toContain('Periodic Family');
    expect(result.solveBadges).toContain('Composition Branch');
    expect(result.periodicFamily?.branchesLatex.length ?? 0).toBeGreaterThan(1);
  });

  it('solves bounded outer non-periodic abs families through one normalized |u| placeholder', () => {
    const logarithmic = runSharedEquationSolve({
      ...request,
      originalLatex: '\\ln\\left(\\left|x\\right|+1\\right)=2',
      resolvedLatex: '\\ln\\left(\\left|x\\right|+1\\right)=2',
    });
    const exponential = runSharedEquationSolve({
      ...request,
      originalLatex: '2^{\\left|x-3\\right|}=8',
      resolvedLatex: '2^{\\left|x-3\\right|}=8',
    });
    const stacked = runSharedEquationSolve({
      ...request,
      originalLatex: '\\ln\\left(\\sqrt{\\left|x-1\\right|+1}\\right)=2',
      resolvedLatex: '\\ln\\left(\\sqrt{\\left|x-1\\right|+1}\\right)=2',
    });

    expect(logarithmic.kind).toBe('success');
    if (logarithmic.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(logarithmic.exactLatex).toContain('\\exponentialE^{2}-1');
    expect(logarithmic.exactLatex).toContain('1-\\exponentialE^{2}');
    expect(logarithmic.solveSummaryText).toBe('Solved a bounded outer non-periodic absolute-value family');
    expect(logarithmic.detailSections?.[0]?.title).toBe('Absolute-Value Reduction');
    expect(logarithmic.detailSections?.[0]?.lines.join(' ')).toContain('t = |x|');

    expect(exponential.kind).toBe('success');
    if (exponential.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(exponential.exactLatex).toContain('0');
    expect(exponential.exactLatex).toContain('6');

    expect(stacked.kind).toBe('success');
    if (stacked.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(stacked.exactLatex).toContain('\\exponentialE^{4}');
    expect(stacked.exactLatex).toContain('2-\\exponentialE^{4}');
    expect(stacked.solveSummaryText).toBe('Solved a bounded outer non-periodic absolute-value family');
    expect(stacked.detailSections?.[0]?.title).toBe('Absolute-Value Reduction');
  });

  it('solves deeper polynomial and composition-backed inner carriers after outer non-periodic placeholder reduction', () => {
    const polynomial = runSharedEquationSolve({
      ...request,
      originalLatex: '\\sqrt{\\left|x^2-1\\right|+1}=3',
      resolvedLatex: '\\sqrt{\\left|x^2-1\\right|+1}=3',
    });
    const composition = runSharedEquationSolve({
      ...request,
      originalLatex: '2^{\\left|\\sin\\left(x^3+x\\right)\\right|}=2^{\\frac{1}{2}}',
      resolvedLatex: '2^{\\left|\\sin\\left(x^3+x\\right)\\right|}=2^{\\frac{1}{2}}',
    });

    expect(polynomial.kind).toBe('success');
    if (polynomial.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(polynomial.exactLatex).toContain('-3');
    expect(polynomial.exactLatex).toContain('3');

    expect(composition.kind).toBe('success');
    if (composition.kind !== 'success') {
      throw new Error('Expected a success outcome');
    }
    expect(composition.exactLatex ?? '').toContain('x^3+x');
    expect(composition.solveBadges).toContain('Periodic Family');
    expect(composition.solveBadges).toContain('Composition Branch');
    expect(composition.solveSummaryText).toBe('Solved a bounded outer non-periodic absolute-value family');
    expect(composition.detailSections?.[0]?.title).toBe('Absolute-Value Reduction');
    expect(composition.detailSections?.[1]?.title).toBe('Generated Branches');
  });

  it('keeps deeper outer non-periodic abs families honest when they exceed the bounded placeholder depth or downstream exact sink set', () => {
    const depthLimited = runSharedEquationSolve({
      ...request,
      originalLatex: '\\ln\\left(\\sqrt{\\log_{2}\\left(\\left|x\\right|+2\\right)}\\right)=0',
      resolvedLatex: '\\ln\\left(\\sqrt{\\log_{2}\\left(\\left|x\\right|+2\\right)}\\right)=0',
    });
    const unresolvedComposition = runSharedEquationSolve({
      ...request,
      originalLatex: '2^{\\left|\\sin\\left(x^5+x\\right)\\right|}=2^{\\frac{1}{2}}',
      resolvedLatex: '2^{\\left|\\sin\\left(x^5+x\\right)\\right|}=2^{\\frac{1}{2}}',
    });

    expect(depthLimited.kind).toBe('error');
    if (depthLimited.kind !== 'error') {
      throw new Error('Expected a bounded-depth error outcome');
    }
    expect(depthLimited.error).toContain('more than one extra bounded non-periodic outer layer');
    expect(depthLimited.solveSummaryText).toBe('Solved a bounded outer non-periodic absolute-value family');
    expect(depthLimited.detailSections?.some((section) => section.title === 'Exact Closure Boundary')).toBe(true);

    expect(unresolvedComposition.kind).toBe('error');
    if (unresolvedComposition.kind !== 'error') {
      throw new Error('Expected an unresolved composition-backed error outcome');
    }
    expect(unresolvedComposition.error).toContain('bounded non-periodic outer layer');
    expect(unresolvedComposition.solveBadges).toContain('Periodic Family');
    expect(unresolvedComposition.solveSummaryText).toBe('Solved a bounded outer non-periodic absolute-value family');
    expect(unresolvedComposition.detailSections?.some((section) => section.title === 'Exact Closure Boundary')).toBe(true);
  });
});
