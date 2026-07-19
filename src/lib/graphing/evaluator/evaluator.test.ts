import { describe, expect, it } from 'vitest';
import type { GraphExpressionIR } from '../contracts';
import { GraphExpressionPlanCache } from './cache';
import { compileGraphExpression } from './compile';
import { createGraphExpressionEvaluator, evaluateCompiledGraphExpression } from './evaluate';

function expression(mathJson: GraphExpressionIR['mathJson'], freeSymbols: string[]): GraphExpressionIR {
  return { mathJson, freeSymbols };
}

function compile(mathJson: GraphExpressionIR['mathJson'], freeSymbols: string[]) {
  const result = compileGraphExpression({
    planId: 'test-plan',
    sourceRevision: 1,
    expression: expression(mathJson, freeSymbols),
  });
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error('Expected compiled Graph expression.');
  return result.plan;
}

describe('Graph allowlisted evaluator', () => {
  it('compiles standard MathJSON to a reusable postfix plan', () => {
    const plan = compile(
      ['Add', ['Power', 'x', 2], ['Multiply', 'a', ['Sin', 'x']]],
      ['a', 'x'],
    );
    expect(plan.instructions).toEqual([
      { kind: 'symbol', symbol: 'x' },
      { kind: 'literal', value: 2 },
      { kind: 'operator', operator: 'Power', arity: 2 },
      { kind: 'symbol', symbol: 'a' },
      { kind: 'symbol', symbol: 'x' },
      { kind: 'operator', operator: 'Sin', arity: 1 },
      { kind: 'operator', operator: 'Multiply', arity: 2 },
      { kind: 'operator', operator: 'Add', arity: 2 },
    ]);
    const evaluator = createGraphExpressionEvaluator(plan);
    expect(evaluator.evaluate({ x: 2, a: 3 })).toEqual({
      status: 'finite',
      value: 4 + 3 * Math.sin(2),
    });
    expect(evaluator.evaluate({ x: 0, a: 9 })).toEqual({ status: 'finite', value: 0 });
  });

  it('evaluates constants, roots, logarithms, and bounded operator families', () => {
    const plan = compile([
      'Add',
      'Pi',
      ['Root', -8, 3],
      ['Log', 8, 2],
      ['Abs', ['Negate', 4]],
      ['Min', 7, 2, 5],
    ], []);
    expect(evaluateCompiledGraphExpression(plan, {})).toEqual({
      status: 'finite',
      value: Math.PI - 2 + 3 + 4 + 2,
    });
  });

  it('reports domain, division, overflow, and missing-symbol boundaries', () => {
    expect(evaluateCompiledGraphExpression(compile(['Sqrt', 'x'], ['x']), { x: -1 }))
      .toEqual({ status: 'non-finite', reason: 'domain' });
    expect(evaluateCompiledGraphExpression(compile(['Divide', 1, 'x'], ['x']), { x: 0 }))
      .toEqual({ status: 'non-finite', reason: 'division-by-zero' });
    expect(evaluateCompiledGraphExpression(compile(['Exp', 'x'], ['x']), { x: 1_000 }))
      .toEqual({ status: 'non-finite', reason: 'overflow' });
    expect(evaluateCompiledGraphExpression(compile(['Sin', 'x'], ['x']), {}))
      .toEqual({ status: 'non-finite', reason: 'missing-symbol', symbol: 'x' });
  });

  it('fails closed when MathJSON and declared free symbols disagree', () => {
    expect(compileGraphExpression({
      planId: 'mismatch',
      sourceRevision: 1,
      expression: expression(['Add', 'x', 'a'], ['x']),
    })).toMatchObject({
      ok: false,
      stopReason: { code: 'unsafe-expression', detailCode: 'free-symbol-mismatch' },
    });
  });

  it('reuses plans per source revision and evicts superseded revisions', () => {
    const cache = new GraphExpressionPlanCache(2);
    const input = {
      planId: 'item.1',
      sourceRevision: 1,
      expression: expression(['Sin', 'x'], ['x']),
    };
    const first = cache.getOrCompile(input);
    const second = cache.getOrCompile(input);
    if (!first.ok || !second.ok) throw new Error('Expected cached Graph plans.');
    expect(first.plan).toBe(second.plan);
    expect(cache.size).toBe(1);

    const revised = cache.getOrCompile({ ...input, sourceRevision: 2 });
    if (!revised.ok) throw new Error('Expected revised Graph plan.');
    expect(revised.plan).not.toBe(first.plan);
    expect(cache.size).toBe(1);
    cache.clear();
    expect(cache.size).toBe(0);
  });
});
