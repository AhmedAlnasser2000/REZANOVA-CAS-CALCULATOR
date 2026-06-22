import { describe, expect, it } from 'vitest';
import { normalizeAst } from '../../normalize';
import { isNodeArray, termKey } from '../../patterns';
import {
  expandMathJsonNode,
  expandMathJsonNodeOrOriginal,
  type MathJsonExpansionOk,
} from './expansion';

function expectExpanded(node: unknown): MathJsonExpansionOk {
  const result = expandMathJsonNode(node);
  expect(result.kind).toBe('ok');
  if (result.kind !== 'ok') {
    throw new Error(`Expected expansion to succeed, got ${result.reason}`);
  }
  return result;
}

function additiveTerms(node: unknown): unknown[] {
  const normalized = normalizeAst(node);
  return isNodeArray(normalized) && normalized[0] === 'Add'
    ? normalized.slice(1)
    : [normalized];
}

describe('expandMathJsonNode', () => {
  it('expands products of sums and combines numeric like terms', () => {
    const result = expectExpanded(['Multiply', ['Add', 'x', 1], ['Add', 'x', 2]]);

    expect(result.changed).toBe(true);
    expect(result.node).toEqual(['Add', 2, ['Multiply', 3, 'x'], ['Power', 'x', 2]]);
    expect(result.expandedTerms).toBe(3);
  });

  it('expands positive integer powers within bounds', () => {
    const result = expectExpanded(['Power', ['Add', 'x', 1], 2]);

    expect(result.node).toEqual(['Add', 1, ['Multiply', 2, 'x'], ['Power', 'x', 2]]);
  });

  it('expands multinomial powers into stable normalized terms', () => {
    const result = expectExpanded(['Power', ['Add', 'x', 'y', 'z'], 3]);
    const termKeys = new Set(additiveTerms(result.node).map(termKey));

    expect(result.expandedTerms).toBe(10);
    expect(termKeys).toContain(termKey(['Power', 'x', 3]));
    expect(termKeys).toContain(termKey(normalizeAst(['Multiply', 3, ['Power', 'x', 2], 'y'])));
    expect(termKeys).toContain(termKey(normalizeAst(['Multiply', 6, 'x', 'y', 'z'])));
  });

  it('distributes subtraction and negation through expanded terms', () => {
    const result = expectExpanded([
      'Subtract',
      ['Power', ['Add', 'x', 1], 2],
      ['Multiply', ['Add', 'x', 1], ['Add', 'x', 2]],
    ]);

    expect(result.node).toEqual(['Add', -1, ['Negate', 'x']]);
  });

  it('preserves target-free symbolic coefficients while expanding safely', () => {
    const result = expectExpanded(['Multiply', 'a', ['Add', 'x', 1]]);

    expect(result.node).toEqual(['Add', 'a', ['Multiply', 'a', 'x']]);
  });

  it('expands division numerators without rewriting denominators', () => {
    const denominator = ['Multiply', ['Add', 'x', 1], ['Add', 'x', 3]];
    const result = expectExpanded([
      'Divide',
      ['Multiply', ['Add', 'x', 1], ['Add', 'x', 2]],
      denominator,
    ]);

    expect(isNodeArray(result.node)).toBe(true);
    if (!isNodeArray(result.node)) {
      throw new Error('Expected a Divide node');
    }

    expect(result.node[0]).toBe('Divide');
    expect(result.node[1]).toEqual(['Add', 2, ['Multiply', 3, 'x'], ['Power', 'x', 2]]);
    expect(termKey(result.node[2])).toBe(termKey(normalizeAst(denominator)));
  });

  it('does not expand inside unsupported function nodes', () => {
    const argument = ['Multiply', ['Add', 'x', 1], ['Add', 'x', 2]];
    const result = expectExpanded(['Sin', argument]);

    expect(result.node).toEqual(['Sin', normalizeAst(argument)]);
  });

  it('stops when a positive power exceeds the configured power limit', () => {
    const result = expandMathJsonNode(['Power', ['Add', 'x', 1], 13]);

    expect(result.kind).toBe('unsupported');
    if (result.kind !== 'unsupported') {
      throw new Error('Expected power-limit');
    }
    expect(result.reason).toBe('power-limit');
  });

  it('stops when expansion would exceed the configured term limit', () => {
    const result = expandMathJsonNode(['Power', ['Add', 'a', 'b', 'c', 'd'], 5], {
      maxExpandedTerms: 20,
    });

    expect(result.kind).toBe('unsupported');
    if (result.kind !== 'unsupported') {
      throw new Error('Expected term-limit');
    }
    expect(result.reason).toBe('term-limit');
  });
});

describe('expandMathJsonNodeOrOriginal', () => {
  it('returns the normalized original node when expansion is unsupported', () => {
    const original = ['Power', ['Add', 'x', 1], 13];

    expect(expandMathJsonNodeOrOriginal(original)).toEqual(normalizeAst(original));
  });
});
