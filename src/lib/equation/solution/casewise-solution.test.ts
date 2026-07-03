import { describe, expect, it } from 'vitest';

import {
  createCasewiseSolution,
  renderCasewiseSolution,
} from './casewise-solution';

describe('Equation casewise structured solutions', () => {
  it('dedupes repeated roots within a case and renders through finite roots', () => {
    const solution = createCasewiseSolution({
      targetLatex: 'x',
      source: 'test-casewise',
      cases: [{
        branchEquationLatex: String.raw`x^2=1`,
        solutionBranches: ['1', '1', '-1'],
      }],
    });
    const rendered = renderCasewiseSolution(solution);

    expect(solution.cases).toHaveLength(1);
    expect(rendered.cases[0].branchesLatex).toEqual(['1', '-1']);
    expect(rendered.exactLatex).toBe(String.raw`x\in\left\{1,\ -1\right\}`);
  });

  it('preserves independent cases even when visible roots overlap', () => {
    const solution = createCasewiseSolution({
      targetLatex: 'z',
      source: 'test-casewise',
      cases: [{
        branchEquationLatex: String.raw`z^2=a`,
        solutionBranches: ['0'],
      }, {
        branchEquationLatex: String.raw`z^2=-a`,
        solutionBranches: ['0'],
      }],
    });
    const rendered = renderCasewiseSolution(solution);

    expect(solution.cases.map((entry) => entry.branchEquationLatex)).toEqual([
      String.raw`z^2=a`,
      String.raw`z^2=-a`,
    ]);
    expect(rendered.branchesLatex).toEqual(['0']);
  });

  it('keeps cases with independent integer parameters separate', () => {
    const solution = createCasewiseSolution({
      targetLatex: 'x',
      source: 'test-casewise',
      cases: [{
        branchEquationLatex: String.raw`u=2\pi n+\arcsin(b)`,
        integerParameters: ['n'],
        solutionBranches: [String.raw`2\pi n+\arcsin(b)`],
      }, {
        branchEquationLatex: String.raw`u=\pi-\arcsin(b)+2\pi m`,
        integerParameters: ['m'],
        solutionBranches: [String.raw`\pi-\arcsin(b)+2\pi m`],
      }],
    });
    const rendered = renderCasewiseSolution(solution);

    expect(solution.cases.map((entry) => entry.integerParameters)).toEqual([['n'], ['m']]);
    expect(rendered.branchesLatex).toEqual([
      String.raw`2\pi n+\arcsin(b)`,
      String.raw`\pi-\arcsin(b)+2\pi m`,
    ]);
  });
});
