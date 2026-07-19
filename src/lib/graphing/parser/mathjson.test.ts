import { describe, expect, it } from 'vitest';
import { classifyGraphMathJson } from './classifier';
import { parseGraphConditionMathJson } from './conditions';
import { adaptGraphExpressionMathJson } from './mathjson';

describe('Graph standard MathJSON adapter', () => {
  it('canonicalizes structural input and records stable free symbols', () => {
    expect(adaptGraphExpressionMathJson([
      'InvisibleOperator',
      'a',
      ['Sin', ['InvisibleOperator', 2, 'x']],
    ])).toEqual({
      ok: true,
      expression: {
        mathJson: ['Multiply', 'a', ['Sin', ['Multiply', 2, 'x']]],
        freeSymbols: ['a', 'x'],
      },
    });
  });

  it('rejects cyclic, over-depth, non-finite, unsafe, and unknown input', () => {
    const cyclic: unknown[] = ['Add', 1];
    cyclic.push(cyclic);
    expect(classifyGraphMathJson(cyclic)).toMatchObject({
      ok: false,
      stopReason: { code: 'unsafe-expression', detailCode: 'cyclic-value' },
    });

    let deep: unknown = 'x';
    for (let index = 0; index < 40; index += 1) deep = ['Negate', deep];
    expect(classifyGraphMathJson(deep)).toMatchObject({
      ok: false,
      stopReason: { code: 'expression-budget-exceeded', detailCode: 'depth-limit' },
    });
    expect(classifyGraphMathJson(['Add', Number.POSITIVE_INFINITY, 'x'])).toMatchObject({
      ok: false,
      stopReason: { code: 'unsafe-expression', detailCode: 'non-finite-number' },
    });
    expect(adaptGraphExpressionMathJson(['Assign', 'a', 2])).toMatchObject({
      ok: false,
      stopReason: { code: 'unsafe-expression', detailCode: 'Assign' },
    });
    expect(adaptGraphExpressionMathJson(['CustomFunction', 'x'])).toMatchObject({
      ok: false,
      stopReason: { code: 'unsupported-operator', detailCode: 'CustomFunction' },
    });
  });

  it('builds bounded structured conditions without Boolean string parsing', () => {
    expect(parseGraphConditionMathJson(['And',
      ['GreaterEqual', 'x', 0],
      ['Less', 'x', 2],
    ])).toMatchObject({
      ok: true,
      condition: {
        kind: 'and',
        clauses: [
          { kind: 'comparison', operator: '>=' },
          { kind: 'comparison', operator: '<' },
        ],
      },
    });
    expect(parseGraphConditionMathJson(['Element', 'x', ['Interval', 0, 1]])).toMatchObject({
      ok: true,
      condition: {
        kind: 'interval-membership',
        minimumInclusive: true,
        maximumInclusive: true,
      },
    });
    expect(parseGraphConditionMathJson(['Or', ['Less', 'x', 0], ['Greater', 'x', 1]])).toMatchObject({
      ok: false,
      stopReason: { code: 'invalid-condition', detailCode: 'unsupported-condition-operator' },
    });
  });
});
