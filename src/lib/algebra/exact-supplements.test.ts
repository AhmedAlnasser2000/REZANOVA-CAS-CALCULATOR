import { describe, expect, it } from 'vitest';
import { buildConstraintSupplementLatex, mergeExactSupplementLatex } from './exact-supplements';

describe('exact supplements', () => {
  it('merges duplicate condition and exclusion fragments into stable grouped lines', () => {
    const lines = mergeExactSupplementLatex(
      {
        latex: [
          '\\text{Principal range: } x\\in\\left[0,\\pi\\right]',
          '\\text{Branch conditions: } k\\in\\mathbb{Z}',
          '\\text{Conditions: } x\\ge0,\\;2\\ge0',
          '\\text{Exclusions: } x\\ne0',
        ],
        source: 'legacy',
      },
      {
        constraints: [
          { kind: 'nonnegative', expressionLatex: 'x' },
          { kind: 'nonzero', expressionLatex: 'x' },
        ],
        source: 'transform',
      },
    );

    expect(lines).toEqual([
      '\\text{Principal range: } x\\in\\left[0,\\pi\\right]',
      '\\text{Branch conditions: } k\\in\\mathbb{Z}',
      '\\text{Exclusions: } x\\ne0',
      '\\text{Conditions: } x\\ge0',
    ]);
  });

  it('renders nonzero constraints as exclusions instead of conditions', () => {
    const lines = buildConstraintSupplementLatex(
      [{ kind: 'nonzero', expressionLatex: 'x+1' }],
      'denominator',
    );

    expect(lines).toEqual(['\\text{Exclusions: } x+1\\ne0']);
  });
});
