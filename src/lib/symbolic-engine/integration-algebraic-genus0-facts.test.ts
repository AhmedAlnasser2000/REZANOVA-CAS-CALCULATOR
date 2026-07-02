import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import {
  algebraicGenus0BranchValidityFact,
  algebraicGenus0FactsToExactSupplementLatex,
  algebraicGenus0SubstitutionDenominatorFact,
  buildAlgebraicGenus0RadicandFacts,
} from './integration/algebraic-genus0/facts';

const ce = new ComputeEngine();

function node(latex: string) {
  return ce.parse(latex).json;
}

function success(latex: string, variable = 'x') {
  const result = buildAlgebraicGenus0RadicandFacts(node(latex), variable);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`expected genus-0 radicand facts for ${latex}`);
  }
  return result;
}

function rendered(result: ReturnType<typeof success>) {
  return result.exactSupplementLatex.join('\n').replace(/\s+/g, '');
}

describe('algebraic genus-0 symbolic facts', () => {
  it('builds affine slope and radicand-domain facts', () => {
    const result = success('a*x+b');
    const text = rendered(result);

    expect(result.degree).toBe(1);
    expect(result.globalFacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'slope-nonzero', relation: '\\ne0' }),
        expect.objectContaining({ kind: 'radicand-domain', relation: '\\ge0' }),
      ]),
    );
    expect(text).toContain('a\\ne0');
    expect(text).toContain('\\ge0');
    expect(text).toContain('ax+b');
  });

  it('builds quadratic leading-coefficient, domain, and discriminant branch facts', () => {
    const result = success('a*x^2+b*x+c');
    const text = rendered(result);

    expect(result.degree).toBe(2);
    expect(result.branches.map((branch) => branch.branch)).toEqual([
      'positive',
      'zero',
      'negative',
    ]);
    expect(text).toContain('a\\ne0');
    expect(text).toContain('ax^2+bx+c');
    expect(result.branches[0].facts[0]).toMatchObject({
      kind: 'discriminant-sign',
      relation: '>0',
    });
    expect(result.branches[1].facts[0]).toMatchObject({
      relation: '=0',
    });
    expect(result.branches[2].facts[0]).toMatchObject({
      relation: '<0',
    });
  });

  it('threads target-free coefficient denominator facts without Equation wrappers', () => {
    const result = success('\\frac{a}{b+c}*x+1');
    const text = rendered(result);

    expect(result.globalFacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'coefficient-denominator-nonzero',
          relation: '\\ne0',
          source: 'denominator',
        }),
      ]),
    );
    expect(text).toContain('b+c\\ne0');
  });

  it('keeps exact leading-coefficient tautologies out of rendered supplements', () => {
    const result = success('x^2+1');
    const text = rendered(result);

    expect(result.globalFacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'leading-coefficient-nonzero' }),
        expect.objectContaining({ kind: 'radicand-domain' }),
      ]),
    );
    expect(text).not.toContain('1\\ne0');
    expect(text).toContain('x^2+1');
    expect(text).toContain('\\ge0');
  });

  it('creates substitution-denominator and branch-validity facts as exact supplements', () => {
    const lines = algebraicGenus0FactsToExactSupplementLatex([
      algebraicGenus0SubstitutionDenominatorFact('t^2-1'),
      algebraicGenus0BranchValidityFact('a*x+b', '>0'),
    ]).join('\n').replace(/\s+/g, '');

    expect(lines).toContain('t^2-1\\ne0');
    expect(lines).toContain('a*x+b>0');
  });

  it('rejects out-of-scope radicand fact inputs explicitly', () => {
    expect(buildAlgebraicGenus0RadicandFacts(node('x^3+x+1'))).toMatchObject({
      kind: 'stop',
      reason: 'over-cap-degree',
      variable: 'x',
    });
    expect(buildAlgebraicGenus0RadicandFacts(node('1'))).toMatchObject({
      kind: 'stop',
      reason: 'constant-polynomial',
      variable: 'x',
    });
  });
});
