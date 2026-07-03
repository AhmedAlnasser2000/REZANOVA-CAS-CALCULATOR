import { describe, expect, it } from 'vitest';

import {
  solveParameterizedCompositionEquation,
  type ParameterizedCompositionSolveOptions,
} from './composition';

function expectSuccess(
  latex: string,
  target: string,
  options?: ParameterizedCompositionSolveOptions,
) {
  const result = solveParameterizedCompositionEquation(latex, target, 'rad', options);
  if (result.kind !== 'success') {
    throw new Error(`Expected success, received ${result.reason}: ${result.message}`);
  }
  return result;
}

describe('composition casewise structured solution handoff', () => {
  it('keeps absolute-value sign branches as internal cases', () => {
    const result = expectSuccess('\\left|z^2-a\\right|=b', 'z');

    expect(result.solution?.kind).toBe('casewise-solution');
    expect(result.solution?.cases.map((entry) => entry.branchEquationLatex)).toEqual([
      'z^2-a=b',
      'z^2-a=-b',
    ]);
    expect(result.solution?.cases.map((entry) =>
      entry.solutionBranches.map((branch) => branch.latex))).toEqual([
      ['-\\frac{1}{2}\\sqrt{4a+4b}', '\\frac{1}{2}\\sqrt{4a+4b}'],
      ['-\\frac{1}{2}\\sqrt{4a-4b}', '\\frac{1}{2}\\sqrt{4a-4b}'],
    ]);
  });

  it('keeps nested log/absolute-value preimages as independent cases', () => {
    const result = expectSuccess('\\ln\\left(\\left|z-a\\right|\\right)=b', 'z');

    expect(result.solution?.cases.map((entry) => entry.branchEquationLatex)).toEqual([
      'z-a=\\exponentialE^{b}',
      'z-a=-\\left(\\exponentialE^{b}\\right)',
    ]);
    expect(result.solution?.cases.map((entry) => entry.solutionBranches[0]?.latex)).toEqual([
      'a+\\exponentialE^{b}',
      'a-\\exponentialE^{b}',
    ]);
  });

  it('preserves generated trig wrapper cases with integer parameters', () => {
    const result = expectSuccess('\\sin\\left(\\sqrt{z+a}\\right)=b', 'z');

    expect(result.solution?.cases).toHaveLength(2);
    expect(result.solution?.cases.every((entry) =>
      entry.integerParameters?.includes('n'))).toBe(true);
    expect(result.solution?.cases.map((entry) => entry.solutionBranches[0]?.latex)).toEqual([
      '(2\\pi n+\\arcsin(b))^2-a',
      '(2\\pi n-\\arcsin(b)+\\pi)^2-a',
    ]);
  });
});
