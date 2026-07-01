import { describe, expect, it } from 'vitest';
import { runNumericIntervalSolve } from '../../equation/numeric-interval-solve';
import { runEquationMode } from '../equation';
import { collectOutcomeText, makeRequest } from './test-support';

function solve(equationLatex: string, target = 'x', extra: Partial<Parameters<typeof runEquationMode>[0]> = {}) {
  return runEquationMode({
    ...makeRequest(),
    equationScreen: 'symbolic',
    equationLatex,
    equationSolveTarget: target,
    equationAnswerMode: 'exact',
    equationDomainIntent: 'real',
    angleUnit: 'rad',
    ...extra,
  });
}

function expectNumericSuccess(equationLatex: string) {
  const result = solve(equationLatex);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error('Expected piecewise numeric success');
  }
  expect(result.solutionKind).toBe('approximate-numeric');
  expect(result.resultOrigin).toBe('numeric-fallback');
  expect(result.numericMethod).toBe('Real piecewise numeric branch solve');
  expect(result.solveBadges).toEqual(expect.arrayContaining(['Candidate Checked']));
  expect(result.detailSections?.map((section) => section.title)).toEqual(expect.arrayContaining([
    'Piecewise Branch Rewrite',
    'Generated Branches',
    'Numeric Validation',
  ]));
  return result;
}

describe('Equation real piecewise/abs numeric hybrid fallback', () => {
  it('solves contained absolute-value equations when generated branches need numeric high-degree roots', () => {
    const result = expectNumericSuccess('\\left|x^7-x\\right|=5');

    expect(result.candidateValues).toHaveLength(2);
    expect(result.candidateValues?.[0]).toBeCloseTo(-1.3007656097, 9);
    expect(result.candidateValues?.[1]).toBeCloseTo(1.3007656097, 9);
    const text = collectOutcomeText(result);
    expect(text).toContain('Contained abs/min/max carriers were rewritten into guarded numeric branches');
    expect(text).toContain('Generated guarded branch equations: 2.');
  });

  it('supports min/max piecewise branch rewrites when branch equations need numeric roots', () => {
    const maxResult = expectNumericSuccess('\\max(x^7-x,0)=5');
    expect(maxResult.candidateValues).toHaveLength(1);
    expect(maxResult.candidateValues?.[0]).toBeCloseTo(1.3007656097, 9);
    expect(collectOutcomeText(maxResult)).toContain('\\max branch uses');

    const minResult = expectNumericSuccess('\\min(x^7-x,0)=-5');
    expect(minResult.candidateValues).toHaveLength(1);
    expect(minResult.candidateValues?.[0]).toBeCloseTo(-1.3007656097, 9);
    expect(collectOutcomeText(minResult)).toContain('\\min branch uses');
  });

  it('keeps existing exact absolute-value families ahead of the numeric fallback', () => {
    const result = solve('\\left|2x-3\\right|=5');

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected exact absolute-value success');
    }
    expect(result.solutionKind).not.toBe('approximate-numeric');
    expect(result.resultOrigin).toBe('symbolic');
    expect(result.numericMethod).toBeUndefined();
    expect(result.exactLatex).toContain('-1');
    expect(result.exactLatex).toContain('4');
  });

  it('adds piecewise breakpoints to explicit numeric interval segmentation', () => {
    const result = runNumericIntervalSolve('\\left|x-1\\right|+\\left|x+1\\right|=4', {
      start: '-3',
      end: '3',
      subdivisions: 128,
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected interval success');
    }
    expect(result.roots).toHaveLength(2);
    expect(result.roots[0]).toBeCloseTo(-2, 6);
    expect(result.roots[1]).toBeCloseTo(2, 6);
    const details = result.detailSections?.flatMap((section) => section.lines).join(' ') ?? '';
    const titles = result.detailSections?.map((section) => section.title) ?? [];
    expect(titles).toContain('Piecewise Breakpoints');
    expect(titles).not.toContain('Domain and Exclusions');
    expect(details).toContain('-1');
    expect(details).toContain('1');
    expect(details).not.toContain('Higher precision recommended');
  });
});
