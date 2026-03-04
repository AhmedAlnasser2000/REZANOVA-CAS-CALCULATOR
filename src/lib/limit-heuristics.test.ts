import { describe, expect, it } from 'vitest';
import { ComputeEngine } from '@cortex-js/compute-engine';
import {
  numericLimitAtInfinity,
  resolveInfiniteLimitHeuristic,
} from './limit-heuristics';

const ce = new ComputeEngine();

function parseLimitBody(latex: string) {
  const expr = ce.parse(`\\lim_{x\\to \\infty}\\left(${latex}\\right)`);
  const json = expr.json as unknown as unknown[];
  const fn = json[1] as unknown[];
  const block = fn[1] as unknown[];
  return block[1];
}

describe('limit heuristics', () => {
  it('resolves rational same-degree and lower-degree limits at infinity', () => {
    const sameDegree = resolveInfiniteLimitHeuristic(
      parseLimitBody('\\frac{3x^2+1}{2x^2-5}'),
      'x',
    );
    const lowerDegree = resolveInfiniteLimitHeuristic(
      parseLimitBody('\\frac{x+1}{x^2+5}'),
      'x',
    );
    const greaterDegree = resolveInfiniteLimitHeuristic(
      parseLimitBody('\\frac{x^2+1}{x+5}'),
      'x',
    );

    expect(sameDegree).toEqual({ kind: 'success', value: 1.5 });
    expect(lowerDegree).toEqual({ kind: 'success', value: 0 });
    expect(greaterDegree).toEqual({ kind: 'unbounded' });
  });

  it('stabilizes simple numeric infinite limits', () => {
    const result = numericLimitAtInfinity((value) => 1 / value, 'posInfinity');
    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected success for 1/x at infinity');
    }
    expect(result.value).toBeCloseTo(0, 4);
  });
});
