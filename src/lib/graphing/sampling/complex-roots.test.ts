import { describe, expect, it } from 'vitest';
import { complex } from '../../numeric/complex';
import { compileGraphComplexPlan } from '../evaluator/complex-plan';
import { adaptGraphExpressionMathJson, parseGraphLatexToStructuralMathJson } from '../parser/mathjson';
import { solveGraphComplexRoots } from './complex-roots';

const viewport = { coordinateSystem: 'cartesian' as const, xMin: -4, xMax: 4, yMin: -4, yMax: 4 };

function side(latex: string) {
  const parsed = parseGraphLatexToStructuralMathJson(latex);
  if (!parsed.ok) throw new Error(latex);
  const adapted = adaptGraphExpressionMathJson(parsed.mathJson);
  if (!adapted.ok) throw new Error(`${latex}: ${adapted.stopReason.detailCode}`);
  return adapted.expression;
}

function solve(left: string, right: string) {
  const solution = solveGraphComplexRoots({ left: side(left), right: side(right), parameters: {}, viewport });
  // Every reported root satisfies the equation.
  const residual = compileGraphComplexPlan(['Add', side(left).mathJson, ['Negate', side(right).mathJson]]);
  if (!residual.ok) throw new Error(residual.reason);
  for (const root of solution.roots) {
    const value = residual.plan.evaluate(complex(root.re, root.im))!;
    expect(Math.hypot(value.re, value.im)).toBeLessThan(1e-8);
  }
  return solution;
}

const count = (solution: ReturnType<typeof solve>) => solution.roots.reduce((sum, root) => sum + root.multiplicity, 0);

describe('complex root points', () => {
  it('solves z^3 = 1 exactly: 1 and −1/2 ± (√3/2)i', () => {
    const solution = solve('z^3', '1');
    expect(solution).toMatchObject({ complete: true, degree: 3 });
    expect(solution.roots.every((root) => root.exact)).toBe(true);
    expect(solution.roots.map((root) => root.label).sort()).toEqual(['1', 'e^(2πi/3)', 'e^(−2πi/3)'].sort());
  });

  it('solves z^2 + z = 3 exactly with surds', () => {
    const solution = solve('z^2+z', '3');
    expect(solution.roots.map((root) => root.label).sort()).toEqual(['−1/2 + √13/2', '−1/2 − √13/2'].sort());
  });

  it('solves z^6 = 1 exactly, all six roots', () => {
    const solution = solve('z^6', '1');
    expect(count(solution)).toBe(6);
    expect(solution.roots.every((root) => root.exact)).toBe(true);
  });

  it('keeps written and expanded factors exact beyond degree four', () => {
    const written = solve(String.raw`(z-1)(z^5-2)`, '0');
    const expanded = solve('z^6-z^5-2z+2', '0');
    for (const solution of [written, expanded]) {
      expect(count(solution)).toBe(6);
      expect(solution.roots.every((root) => root.exact)).toBe(true);
      expect(solution.roots.map((root) => root.label)).toContain('(2)^(1/5)');
    }
  });

  it('solves z^2 + 1 = 0 as ±i and z = 1 + i as a point', () => {
    expect(solve('z^2+1', '0').roots.map((root) => root.label).sort()).toEqual(['i', '−i'].sort());
    expect(solve('z', '1+i').roots).toMatchObject([{ exact: true, label: '1 + i' }]);
  });

  it('finds all roots of an irreducible degree-7 polynomial numerically', () => {
    const solution = solve('z^7+z+1', '0');
    expect(solution).toMatchObject({ complete: true, degree: 7 });
    expect(count(solution)).toBe(7);
    expect(solution.roots.some((root) => !root.exact)).toBe(true);
  });

  it('marks a double root once with multiplicity two', () => {
    const solution = solve('(z-2)^2', '0');
    expect(solution.roots).toMatchObject([{ re: 2, im: 0, exact: true, multiplicity: 2 }]);
  });

  it('finds roots of e^z = 2 in view only, as an incomplete numeric list', () => {
    const solution = solve('e^z', '2');
    expect(solution.complete).toBe(false);
    expect(solution.roots.length).toBeGreaterThan(0);
    expect(solution.roots.some((root) => Math.abs(root.re - Math.LN2) < 1e-8 && Math.abs(root.im) < 1e-8)).toBe(true);
  });
});
