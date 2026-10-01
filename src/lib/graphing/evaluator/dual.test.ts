import { describe, expect, it } from 'vitest';
import type { GraphExpressionIR } from '../contracts';
import { compileGraphExpression } from './compile';
import { createGraphDualEvaluator } from './dual';

const plan = (mathJson: unknown, freeSymbols: string[]) => {
  const compiled = compileGraphExpression({ planId: 'p', sourceRevision: 0, expression: { mathJson, freeSymbols } as GraphExpressionIR });
  if (!compiled.ok) throw new Error('compile');
  return compiled.plan;
};
const slope = (mathJson: unknown, x: number) => {
  const result = createGraphDualEvaluator(plan(mathJson, ['x']), ['x']).evaluate({ x });
  if (result.status !== 'finite') throw new Error('non-finite');
  return result.gradient[0]!;
};
const close = (actual: number, expected: number) => expect(Math.abs(actual - expected)).toBeLessThanOrEqual(1e-14 * Math.max(1, Math.abs(expected)));

describe('forward-mode automatic differentiation on the tape', () => {
  it('matches symbolic derivatives to rounding', () => {
    const x = 0.7;
    close(slope(['Sin', ['Power', 'x', 2]], x), Math.cos(x * x) * 2 * x);
    close(slope(['Divide', ['Exp', 'x'], ['Add', 'x', 1]], x), Math.exp(x) * x / ((x + 1) ** 2));
    close(slope(['Power', 'x', 'x'], x), x ** x * (Math.log(x) + 1));
    close(slope(['Ln', ['Sqrt', 'x']], x), 1 / (2 * x));
    close(slope(['Tan', ['Multiply', 3, 'x']], x), 3 / Math.cos(3 * x) ** 2);
    close(slope(['Arctan', ['Negate', 'x']], x), -1 / (1 + x * x));
    close(slope(['Log', 'x', 2], x), 1 / (x * Math.LN2));
    close(slope(['Power', 'x', 3], -2), 12);
    close(slope(['Root', 'x', 3], -8), 1 / 12);
    close(slope(['Sec', 'x'], x), Math.sin(x) / Math.cos(x) ** 2);
  });

  it('gives both partials of F(x, y)', () => {
    const result = createGraphDualEvaluator(plan(['Add', ['Power', 'x', 2], ['Multiply', 3, 'x', 'y'], ['Sin', 'y']], ['x', 'y']), ['x', 'y']).evaluate({ x: 1.5, y: -0.25 });
    expect(result.status).toBe('finite');
    if (result.status !== 'finite') return;
    close(result.gradient[0]!, 2 * 1.5 + 3 * -0.25);
    close(result.gradient[1]!, 3 * 1.5 + Math.cos(-0.25));
  });

  it('treats sliders as constants and refuses undefined points', () => {
    const result = createGraphDualEvaluator(plan(['Multiply', 'a', 'x'], ['a', 'x']), ['x']).evaluate({ a: 4, x: 2 });
    expect(result).toEqual({ status: 'finite', value: 8, gradient: [4] });
    expect(createGraphDualEvaluator(plan(['Divide', 1, 'x'], ['x']), ['x']).evaluate({ x: 0 }).status).toBe('non-finite');
    expect(createGraphDualEvaluator(plan(['Ln', 'x'], ['x']), ['x']).evaluate({ x: -1 }).status).toBe('non-finite');
  });
});
