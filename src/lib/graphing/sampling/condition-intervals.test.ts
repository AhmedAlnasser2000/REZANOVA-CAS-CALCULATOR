import { describe, expect, it } from 'vitest';
import type { GraphConditionIR, GraphExpressionIR } from '../contracts';
import { parseGraphConditionMathJson } from '../parser/conditions';
import { parseGraphLatexToStructuralMathJson } from '../parser/mathjson';
import { solveGraphConditionIntervals } from './condition-intervals';
import { buildGraphPiecewiseConditionPartition } from './piecewise-condition-evidence';

function condition(latex: string): GraphConditionIR {
  const parsed = parseGraphLatexToStructuralMathJson(latex);
  if (!parsed.ok) throw new Error(latex);
  const result = parseGraphConditionMathJson(parsed.mathJson);
  if (!result.ok) throw new Error(`${latex}: ${result.stopReason.detailCode}`);
  return result.condition;
}

const solve = (latex: string, environment: Record<string, number> = {}, minimum = -10, maximum = 10) =>
  solveGraphConditionIntervals({ condition: condition(latex), symbol: 'x', environment, minimum, maximum });

const shape = (intervals: ReturnType<typeof solve>['intervals']) => intervals.map((interval) => [
  Number(interval.minimum.toFixed(12)) + 0, Number(interval.maximum.toFixed(12)) + 0, interval.minimumInclusive, interval.maximumInclusive,
]);

describe('Solved piecewise conditions', () => {
  it('finds two boundaries far closer together than any sampling grid (GRAPHING-PIECEWISE2)', () => {
    const result = solve(String.raw`\sin(x)>0.99999`);
    // Near each peak of sin the condition holds for a sliver about 0.009 wide; every sliver in view is found.
    expect(result.intervals).toHaveLength(3);
    expect(result.unresolved).toBe(0);
    for (const interval of result.intervals) {
      expect(interval.maximum - interval.minimum).toBeGreaterThan(0.008);
      expect(interval.maximum - interval.minimum).toBeLessThan(0.0095);
    }
  });

  it('puts the edges of a step-function condition exactly on the steps', () => {
    expect(shape(solve(String.raw`\lfloor x\rfloor>1`, {}, -0.5, 4.5).intervals)).toEqual([[2, 4.5, true, true]]);
    expect(shape(solve(String.raw`\lfloor x\rfloor=1`, {}, -0.5, 4.5).intervals)).toEqual([[1, 2, true, false]]);
  });

  it('keeps a touching boundary: (x − 1)² > 0 holds everywhere but x = 1', () => {
    expect(shape(solve('(x-1)^2>0').intervals)).toEqual([[-10, 1, true, false], [1, 10, false, true]]);
  });

  it('records closed forms of polynomial boundaries', () => {
    expect(solve('x^2<2').exactValues?.map((entry) => entry.label).sort()).toEqual(['−√2', '√2']);
  });

  it('takes boundary inclusion from the operator on curved boundaries', () => {
    const strict = solve('x^2<2'); const loose = solve('x^2\\le 2');
    const root = Number(Math.SQRT2.toFixed(12));
    expect(shape(strict.intervals)).toEqual([[-root, root, false, false]]);
    expect(shape(loose.intervals)).toEqual([[-root, root, true, true]]);
    expect(strict.exact && loose.exact).toBe(true);
  });

  it('keeps a narrow branch visible however far out the view is', () => {
    expect(shape(solve('0<x<0.001').intervals)).toEqual([[0, 0.001, false, false]]);
    expect(shape(solve('0<x<0.001', {}, -1000, 1000).intervals)).toEqual([[0, 0.001, false, false]]);
  });

  it('excludes a pole even where the condition changes sign across it', () => {
    const result = solve('\\frac{1}{x}<1');
    expect(shape(result.intervals)).toEqual([[-10, 0, true, false], [1, 10, false, true]]);
    expect(result.exact).toBe(false);
  });

  it('solves ≠, or, equality points and double roots', () => {
    expect(shape(solve('x\\ne 1').intervals)).toEqual([[-10, 1, true, false], [1, 10, false, true]]);
    expect(shape(solve('x<-1\\lor x>1').intervals)).toEqual([[-10, -1, true, false], [1, 10, false, true]]);
    expect(shape(solve('x=3').intervals)).toEqual([[3, 3, true, true]]);
    expect(shape(solve('x^2\\le 0').intervals)).toEqual([[0, 0, true, true]]);
    expect(solve('x^2<0').intervals).toEqual([]);
  });

  it('uses slider values in the bounds', () => {
    expect(shape(solve('x<a', { a: 2.5 }).intervals)).toEqual([[-10, 2.5, true, false]]);
  });
});

describe('First-match piecewise partition', () => {
  const relation = (value: number) => ({ kind: 'explicit-y' as const, rhs: { mathJson: value, freeSymbols: [] } as GraphExpressionIR, origin: 'authored-relation' as const });
  const partition = (conditions: string[], otherwise = false) => buildGraphPiecewiseConditionPartition({
    itemId: 'p', sourceRevision: 1, independentSymbol: 'x', minimum: -10, maximum: 10, pixelSpan: 800, tolerancePixels: 0.35, parameterEnvironment: {},
    piecewise: { version: 1, branches: conditions.map((latex, index) => ({ branchId: `branch.${index + 1}`, relation: relation(index), condition: condition(latex) })),
      ...(otherwise ? { otherwise: relation(9) } : {}) },
  });

  it('gives each x to the first branch whose condition holds', () => {
    const result = partition(['x<2', 'x<5'], true);
    expect(shape(result.branchIntervals.get('branch.1')!)).toEqual([[-10, 2, true, false]]);
    expect(shape(result.branchIntervals.get('branch.2')!)).toEqual([[2, 5, true, false]]);
    expect(shape(result.otherwiseIntervals)).toEqual([[5, 10, true, true]]);
    expect(result.evidence.overlapBranchPairs).toEqual([{ branchIds: ['branch.1', 'branch.2'], scope: 'global' }]);
  });

  it('tells shadowed, offscreen and impossible branches apart', () => {
    const result = partition(['x<5', 'x<2', 'x>100', 'x^2<0']);
    expect(result.evidence.branchApplicability.map((entry) => entry.status))
      .toEqual(['applicable-global', 'shadowed', 'offscreen', 'impossible-global']);
  });
});
