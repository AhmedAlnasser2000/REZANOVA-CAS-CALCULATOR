import { describe, expect, it } from 'vitest';

import type { VariableAnalysis } from '../../algebra/variable-core/types';
import { normalizeFiniteBranchExpression } from './mathjson-branches';

const userVariableIAnalysis: VariableAnalysis = {
  symbols: [{
    name: 'i',
    identifierKind: 'single-symbol-variable',
    roles: ['symbolic-parameter'],
    occurrences: 2,
  }],
  reservedIdentifiers: [],
  implicitCharacterProducts: [],
  stops: [],
};

function normalizeBranch(node: unknown, context = {}) {
  return normalizeFiniteBranchExpression({
    latex: 'fallback',
    node,
    target: 'x',
    context,
  });
}

describe('MathJSON-backed finite branch readback', () => {
  it('normalizes nested radicands through the MathJSON tree before final polish', () => {
    const branch = normalizeBranch([
      'Add',
      ['Divide', -1, 2],
      ['Multiply', -1, ['Divide', [
        'Sqrt',
        ['Add', 1, ['Multiply', -4, ['Add', ['Divide', -1, 2], ['Multiply', -1, ['Divide', ['Sqrt', 5], 2]]]]],
      ], 2]],
    ]);

    expect(branch).not.toContain('1+-4');
    expect(branch).not.toContain(String.raw`1+\left(-4`);
    expect(branch).not.toContain('ii');
  });

  it('uses reserved imaginary-unit nodes without rewriting a user variable named i', () => {
    expect(normalizeBranch(['Multiply', ['Complex', 0, 1], ['Complex', 0, 1]]))
      .toBe('-1');

    expect(normalizeFiniteBranchExpression({
      latex: 'i\\cdot i',
      target: 'x',
      context: {
        domainIntent: 'complex',
        variableAnalysis: userVariableIAnalysis,
      },
    })).toBe('i\\cdot i');
  });

  it('cleans identities without over-simplifying multivariable symbolic output', () => {
    expect(normalizeBranch(['Add', 0, 'a'])).toBe('a');
    expect(normalizeBranch(['Multiply', 1, ['Sqrt', ['Add', 'v', 'b']]]))
      .toBe(String.raw`\sqrt{b+v}`);

    const discriminant = normalizeBranch(['Subtract', ['Power', 'b', 2], ['Multiply', 4, 'a', 'c']]);
    expect(discriminant).toContain('b');
    expect(discriminant).toContain('a');
    expect(discriminant).toContain('c');

    expect(normalizeBranch(['Divide', 'F', 'a'])).toBe(String.raw`\frac{F}{a}`);
    expect(normalizeBranch(['Sqrt', ['Multiply', ['Power', 'c', 2], ['Add', 'v', 'b']]]))
      .toContain('c^2');
  });
});
