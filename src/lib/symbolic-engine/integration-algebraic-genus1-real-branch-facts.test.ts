import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { resolveSymbolicIntegralFromLatex } from './integration';
import { buildAlgebraicGenus1RealBranchFacts } from './integration/algebraic-genus1/real-branch-facts';

const ce = new ComputeEngine();

function facts(latex: string, variable = 'x') {
  return buildAlgebraicGenus1RealBranchFacts(ce.parse(latex).json, variable);
}

function success(latex: string, variable = 'x') {
  const result = facts(latex, variable);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`expected branch facts for ${latex}`);
  }
  return result;
}

describe('algebraic genus-1 real branch facts', () => {
  it('builds Sturm-certified branch rows for exact-rational cubic radicals', () => {
    const result = success('\\sqrt{x^3-x}');
    expect(result.rootCount).toBe(3);
    expect(result.roots.map((root) => root.label)).toEqual([
      '\\alpha_{1}',
      '\\alpha_{2}',
      '\\alpha_{3}',
    ]);
    expect(result.branchRows).toHaveLength(4);
    expect(result.realDomainRows.map((row) => row.intervalLatex)).toEqual([
      '\\alpha_{1}<x<\\alpha_{2}',
      'x>\\alpha_{3}',
    ]);
    expect(result.realDomainRows.every((row) => row.endpointPolicy === 'included-where-radicand-zero')).toBe(true);
    expect(result.readinessNotes.join(' ')).toContain('Sturm certification isolated 3 distinct real roots');
  });

  it('records reciprocal-radical endpoint exclusions for exact-rational quartic branches', () => {
    const result = success('\\frac{1}{\\sqrt{(1-x^2)(1-2*x^2)}}');
    expect(result.integrandShape).toBe('reciprocal-radical');
    expect(result.rootCount).toBe(4);
    expect(result.realDomainRows.map((row) => row.intervalLatex)).toEqual([
      'x<\\alpha_{1}',
      '\\alpha_{2}<x<\\alpha_{3}',
      'x>\\alpha_{4}',
    ]);
    expect(result.endpointExclusionFacts).toHaveLength(4);
    expect(result.endpointExclusionFacts[0]).toMatchObject({
      expressionLatex: 'x-\\alpha_{1}',
      relation: '\\ne0',
      source: 'denominator',
    });
    expect(result.exactSupplementLatex.join(',')).toContain('x-\\alpha_{1}\\ne0');
    expect(result.realDomainRows.every((row) => row.endpointPolicy === 'excluded')).toBe(true);
  });

  it('handles exact-rational irreducible cubics with numeric Sturm root intervals', () => {
    const result = success('\\sqrt{x^3+x+1}');
    expect(result.rootCount).toBe(1);
    expect(result.roots[0].definitionLatex).toContain('\\alpha_{1}');
    expect(result.roots[0].definitionLatex).toContain('unique real root');
    expect(result.realDomainRows).toHaveLength(1);
    expect(result.realDomainRows[0].intervalLatex).toBe('x>\\alpha_{1}');
  });

  it('stops repeated-root and symbolic branch cases before elliptic branch routing', () => {
    expect(facts('\\sqrt{x^3}')).toMatchObject({
      kind: 'stop',
      reason: 'degeneration-not-squarefree',
    });

    expect(facts('\\sqrt{a*x^3+b*x^2+c*x+d}')).toMatchObject({
      kind: 'stop',
      reason: 'symbolic-branch-deferred',
    });
  });

  it('preserves the staged live boundary for exact genus-1 radical candidates', () => {
    const result = resolveSymbolicIntegralFromLatex('\\frac{1}{\\sqrt{x^3+x+1}}');
    expect(result.kind).toBe('success');
    if (result.kind === 'success') {
      expect(result.strategy).toBe('u-substitution');
      expect(result.exactLatex).toContain('EllipticF');
      expect(result.exactLatex).toContain('A_{\\alpha_{1}}');
      expect(result.exactSupplementLatex?.join('\n')).toContain('x>\\alpha_{1}');
    }

    const rawRadical = resolveSymbolicIntegralFromLatex('\\sqrt{x^3+x+1}');
    expect(rawRadical.kind).toBe('error');
    if (rawRadical.kind === 'error') {
      expect(rawRadical.error).toContain('genus-1');
      expect(rawRadical.error).toContain('elliptic');
    }
  });
});
