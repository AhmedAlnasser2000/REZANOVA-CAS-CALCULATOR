import { describe, expect, it } from 'vitest';
import { createArithmeticHelpers, simplifyNode } from './math-json';

describe('Equation parameterized MathJSON helpers', () => {
  it('uses the simplification primitive for the default arithmetic path', () => {
    const helpers = createArithmeticHelpers();

    expect(simplifyNode(['Add', 0, 'x', ['Add', 'y', 0]])).toEqual(['Add', 'x', 'y']);
    expect(helpers.addNodes(['Rational', 1, 2], ['Rational', 1, 3], 'x')).toEqual([
      'Add',
      'x',
      ['Rational', 5, 6],
    ]);
    expect(helpers.multiplyNodes(['Rational', 2, 3], 3, 'x')).toEqual(['Multiply', 2, 'x']);
    expect(helpers.subtractNodes('x', ['Add', 'a', 1])).toEqual([
      'Add',
      ['Negate', 'a'],
      'x',
      -1,
    ]);
    expect(helpers.divideNodes(['Rational', 2, 3], ['Rational', 4, 5])).toEqual([
      'Rational',
      5,
      6,
    ]);
    expect(helpers.squareNode(['Add', 'x', 1])).toEqual(['Power', ['Add', 'x', 1], 2]);
  });

  it('preserves custom route simplifiers for specialized Equation consumers', () => {
    const seen: unknown[] = [];
    const helpers = createArithmeticHelpers((node) => {
      seen.push(node);
      return node;
    });

    expect(helpers.addNodes('x', 'y')).toEqual(['Add', 'x', 'y']);
    expect(helpers.multiplyNodes('x', 'y')).toEqual(['Multiply', 'x', 'y']);
    expect(helpers.divideNodes('x', 'y')).toEqual(['Divide', 'x', 'y']);
    expect(seen).toEqual([
      ['Add', 'x', 'y'],
      ['Multiply', 'x', 'y'],
      ['Divide', 'x', 'y'],
    ]);
  });
});
