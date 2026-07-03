import { describe, expect, it } from 'vitest';

import {
  equationConstraintsFromDomainConstraints,
  equationConstraintsFromLatex,
  mergeEquationConstraints,
  normalizeConstraintLatex,
  normalizeEquationConstraintLatex,
  renderEquationConstraintsLatex,
} from './constraints';

describe('Equation structured constraints', () => {
  it('normalizes legacy restriction fragments while preserving raw supplement shape', () => {
    expect(normalizeConstraintLatex('\\left(15x\\left(x+z\\right)\\right)^{-1}\\ne0')).toBe(
      '\\frac{1}{15x\\left(x+z\\right)}\\ne0',
    );
    expect(normalizeConstraintLatex('(a+b)^{-1}>0')).toBe('\\frac{1}{a+b}>0');
    expect(normalizeConstraintLatex('\\frac{1}{b}\\ne0')).toBe('b\\ne0');
    expect(normalizeConstraintLatex('\\frac{-k}{2}\\ne0')).toBe('k\\ne0');
    expect(normalizeConstraintLatex('y-2\\ne0')).toBe('y\\ne2');
    expect(normalizeEquationConstraintLatex(['a\\ne0', 'a\\ne0', '\\frac{1}{b}\\ne0']))
      .toEqual(['a\\ne0', 'b\\ne0']);
  });

  it('records relation, integer, and branch facts as typed constraints', () => {
    const constraints = equationConstraintsFromLatex([
      'x-1\\ne0',
      'x+5\\ge0',
      'k\\in\\mathbb{Z}',
      '\\text{Branch conditions: } n\\in\\mathbb{Z}',
    ]);

    expect(constraints.map((constraint) => constraint.kind)).toEqual([
      'denominator-exclusion',
      'radical-domain',
      'integer-parameter',
      'branch-validity',
    ]);
  });

  it('renders grouped supplements through the existing exact supplement contract', () => {
    const constraints = equationConstraintsFromDomainConstraints([
      { kind: 'nonzero', expressionLatex: 'x-1' },
      { kind: 'nonnegative', expressionLatex: 'x+5' },
      { kind: 'positive', expressionLatex: 'x+2' },
    ]);

    expect(renderEquationConstraintsLatex(constraints, { style: 'grouped' })).toEqual([
      '\\text{Exclusions: } x-1\\ne0',
      '\\text{Conditions: } x+2>0,\\;x+5\\ge0',
    ]);
  });

  it('dedupes with stable source-aware ordering when requested', () => {
    const constraints = equationConstraintsFromLatex(['z\\ge0'], 'legacy').concat(
      equationConstraintsFromLatex(['z\\ne0'], 'denominator'),
      equationConstraintsFromLatex(['z\\ge0'], 'radical-domain'),
    );

    expect(mergeEquationConstraints(constraints).map((constraint) => constraint.source)).toEqual([
      'denominator',
      'radical-domain',
    ]);
  });
});
