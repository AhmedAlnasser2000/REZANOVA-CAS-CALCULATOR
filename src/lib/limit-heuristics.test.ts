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

    expect(sameDegree.kind).toBe('success');
    if (sameDegree.kind === 'success') {
      expect(sameDegree.value).toBe(1.5);
      expect(sameDegree.detailSections?.[0]?.lines.join(' ')).toContain('leading-coefficient ratio');
    }
    expect(lowerDegree.kind).toBe('success');
    if (lowerDegree.kind === 'success') {
      expect(lowerDegree.value).toBe(0);
    }
    expect(greaterDegree.kind).toBe('success');
    if (greaterDegree.kind === 'success') {
      expect(greaterDegree.value).toBe('posInfinity');
    }
  });

  it('returns signed rational dominance at negative infinity', () => {
    const rational = resolveInfiniteLimitHeuristic(
      parseLimitBody('\\frac{x^2+1}{x+5}'),
      'x',
      'negInfinity',
    );
    const polynomial = resolveInfiniteLimitHeuristic(
      parseLimitBody('x^3+x'),
      'x',
      'negInfinity',
    );

    expect(rational.kind).toBe('success');
    if (rational.kind === 'success') {
      expect(rational.value).toBe('negInfinity');
    }
    expect(polynomial.kind).toBe('success');
    if (polynomial.kind === 'success') {
      expect(polynomial.value).toBe('negInfinity');
    }
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
