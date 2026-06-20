import { describe, expect, it } from 'vitest';
import type { SolveDomainConstraint } from '../../../types/calculator';
import {
  createDenominatorExclusionFact,
  createDomainConditionFact,
  factsFromDomainConstraints,
  factsFromLegacySupplementLatex,
  mergeEquationBranchDomainFacts,
  renderRawSupplementLatexFromFacts,
} from './branch-domain-facts';

describe('Equation branch/domain facts', () => {
  it('renders denominator exclusions as current raw supplement strings', () => {
    const facts = [
      createDenominatorExclusionFact('z-a', {
        scope: 'root-group',
        ownerId: 'z-a',
      }),
    ];

    expect(renderRawSupplementLatexFromFacts(facts)).toEqual(['z-a\\ne0']);
  });

  it('renders domain conditions as current raw supplement strings', () => {
    const facts = [
      createDomainConditionFact('x^2-4', '\\ge0'),
      createDomainConditionFact('a', '>0'),
    ];

    expect(renderRawSupplementLatexFromFacts(facts)).toEqual(['x^2-4\\ge0', 'a>0']);
  });

  it('round-trips raw and grouped legacy supplement strings into raw output', () => {
    const facts = factsFromLegacySupplementLatex([
      'z-a\\ne0',
      'x^2-4\\ge0',
      '\\text{Exclusions: } b\\ne0,\\;c\\ne0',
      'n\\in\\mathbb{Z}',
    ]);

    expect(renderRawSupplementLatexFromFacts(facts)).toEqual([
      'z-a\\ne0',
      'x^2-4\\ge0',
      'b\\ne0',
      'c\\ne0',
      'n\\in\\mathbb{Z}',
    ]);
  });

  it('dedupes duplicate facts without changing first-seen order', () => {
    const facts = mergeEquationBranchDomainFacts(
      [
        createDenominatorExclusionFact('z-a'),
        createDomainConditionFact('a', '\\ge0'),
      ],
      [
        createDenominatorExclusionFact('z-a'),
        createDenominatorExclusionFact('z-b'),
      ],
    );

    expect(renderRawSupplementLatexFromFacts(facts)).toEqual([
      'z-a\\ne0',
      'a\\ge0',
      'z-b\\ne0',
    ]);
  });

  it('retains attachment metadata internally without rendering it', () => {
    const facts = factsFromLegacySupplementLatex(['a\\ge0'], {
      attachment: { scope: 'branch', ownerId: 'branch-1' },
    });

    expect(facts[0].attachment).toEqual({ scope: 'branch', ownerId: 'branch-1' });
    expect(renderRawSupplementLatexFromFacts(facts)).toEqual(['a\\ge0']);
  });

  it('converts supported domain constraints into branch/domain facts', () => {
    const constraints: SolveDomainConstraint[] = [
      { kind: 'nonzero', expressionLatex: 'z-a' },
      { kind: 'nonnegative', expressionLatex: 'r' },
      { kind: 'positive', expressionLatex: 'b' },
      { kind: 'exp-positive' },
    ];

    expect(renderRawSupplementLatexFromFacts(factsFromDomainConstraints(constraints))).toEqual([
      'z-a\\ne0',
      'r\\ge0',
      'b>0',
    ]);
  });
});
