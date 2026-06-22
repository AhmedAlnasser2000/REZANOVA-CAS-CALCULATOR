import { describe, expect, it } from 'vitest';
import {
  addMathJsonNodes,
  divideMathJsonNodes,
  multiplyMathJsonNodes,
  negateMathJsonNode,
  simplifyMathJsonNode,
  simplifyMathJsonNodeOrOriginal,
  splitAdditiveTerms,
  squareMathJsonNode,
  structuralKey,
  subtractMathJsonNodes,
} from './simplification';

describe('symbolic simplification primitive', () => {
  it('flattens additive and multiplicative structure and removes identities', () => {
    expect(simplifyMathJsonNode(['Add', 0, 'x', ['Add', 'y', 0]])).toMatchObject({
      kind: 'ok',
      node: ['Add', 'x', 'y'],
      changed: true,
    });

    expect(simplifyMathJsonNode(['Multiply', 1, 'x', ['Multiply', 'y', 1]])).toMatchObject({
      kind: 'ok',
      node: ['Multiply', 'x', 'y'],
      changed: true,
    });
  });

  it('folds safe exact scalar arithmetic without touching symbolic terms', () => {
    expect(addMathJsonNodes(['Rational', 1, 2], ['Rational', 1, 3], 'x')).toEqual(
      ['Add', 'x', ['Rational', 5, 6]],
    );
    expect(multiplyMathJsonNodes(['Rational', 2, 3], 3, 'x')).toEqual(
      ['Multiply', 2, 'x'],
    );
    expect(divideMathJsonNodes(['Rational', 2, 3], ['Rational', 4, 5])).toEqual(
      ['Rational', 5, 6],
    );
  });

  it('normalizes negation and subtraction structurally', () => {
    expect(negateMathJsonNode(['Add', 'x', 2])).toEqual(['Add', -2, ['Negate', 'x']]);
    expect(subtractMathJsonNodes('x', ['Add', 'a', 1])).toEqual(['Add', -1, 'x', ['Negate', 'a']]);
  });

  it('preserves division, functions, and object nodes instead of rewriting semantics', () => {
    expect(simplifyMathJsonNodeOrOriginal(['Divide', ['Add', 0, 'x'], ['Add', 0, 'y']])).toEqual(
      ['Divide', 'x', 'y'],
    );
    expect(simplifyMathJsonNodeOrOriginal(['Sin', ['Add', 0, 'x']])).toEqual(['Sin', 'x']);

    const objectNode = { fn: 'opaque', value: ['Add', 0, 'x'] };
    expect(simplifyMathJsonNodeOrOriginal(objectNode)).toBe(objectNode);
  });

  it('builds compact squares and additive term splits', () => {
    expect(squareMathJsonNode(['Add', 'x', 1])).toEqual(['Power', ['Add', 1, 'x'], 2]);
    expect(splitAdditiveTerms(['Subtract', ['Add', 'x', 1], 'a'])).toEqual([
      1,
      'x',
      ['Negate', 'a'],
    ]);
  });

  it('returns stable structural keys after simplification', () => {
    expect(structuralKey(['Add', 'y', 0, 'x'])).toBe(structuralKey(['Add', 'x', 'y']));
  });

  it('reports node-limit stops without throwing', () => {
    const result = simplifyMathJsonNode(['Add', 'x', 'y', 'z'], { maxNodeCount: 2 });
    expect(result).toMatchObject({
      kind: 'unsupported',
      reason: 'node-limit',
      changed: false,
    });
  });
});
