import { describe, expect, it } from 'vitest';
import {
  ANSWER_DOMAINS,
  SOLUTION_KINDS,
  buildComplexDomainNoteFact,
  buildComplexValueDomainMetadata,
  buildConditionalRealValueDomainMetadata,
  buildInequalityConstraintFact,
  buildRealValueDomainMetadata,
  buildUnknownDomainValueMetadata,
  buildValueDomainMetadata,
  valueDomainMetadataFromDomainConstraints,
} from './value-domain-core';

describe('value-domain-core', () => {
  it('locks answer-domain and solution-kind vocabularies', () => {
    expect(ANSWER_DOMAINS).toEqual([
      'real',
      'complex',
      'conditional-real',
      'unknown-domain',
    ]);
    expect(SOLUTION_KINDS).toEqual([
      'exact-symbolic',
      'approximate-numeric',
      'isolate-formula',
      'inequality-solution-set',
      'condition-fact-only-stop',
    ]);
  });

  it('builds stable metadata and dedupes scoped facts', () => {
    const fact = buildInequalityConstraintFact({
      expressionLatex: 'x',
      message: 'x must stay nonnegative.',
      details: ['from interval solve', 'from interval solve'],
    });
    const metadata = buildValueDomainMetadata({
      answerDomain: 'conditional-real',
      solutionKind: 'inequality-solution-set',
      facts: [fact, fact],
    });

    expect(metadata.facts).toEqual([fact]);
    expect(metadata.summary).toMatchObject({
      answerDomain: 'conditional-real',
      solutionKind: 'inequality-solution-set',
      total: 1,
      hasInequalityFacts: true,
      hasComplexDomainFacts: false,
    });
  });

  it('provides answer-domain convenience builders', () => {
    expect(buildRealValueDomainMetadata('exact-symbolic').answerDomain).toBe('real');
    expect(buildComplexValueDomainMetadata('exact-symbolic').answerDomain).toBe('complex');
    expect(buildConditionalRealValueDomainMetadata('isolate-formula').answerDomain).toBe('conditional-real');
    expect(buildUnknownDomainValueMetadata('condition-fact-only-stop').answerDomain).toBe('unknown-domain');
  });

  it('maps existing domain constraints through the assumption spine', () => {
    const metadata = valueDomainMetadataFromDomainConstraints({
      solutionKind: 'exact-symbolic',
      constraints: [
        { kind: 'nonzero', expressionLatex: 'x-1' },
        { kind: 'nonnegative', expressionLatex: 'a' },
      ],
    });

    expect(metadata.answerDomain).toBe('conditional-real');
    expect(metadata.facts.map((fact) => fact.kind)).toEqual([
      'domain-exclusion',
      'domain-constraint',
    ]);
    expect(metadata.facts.map((fact) => fact.message)).toEqual([
      'x-1 must stay nonzero.',
      'a must stay nonnegative.',
    ]);
  });

  it('builds inequality and complex-domain facts for future cores', () => {
    const inequalityFact = buildInequalityConstraintFact({
      source: 'inequality-core',
      variable: 'x',
      message: 'x <= 2.',
    });
    const complexFact = buildComplexDomainNoteFact({
      source: 'complex-core',
      expressionLatex: 'x^2+1=0',
      message: 'Complex answers are enabled for this route.',
    });
    const metadata = buildComplexValueDomainMetadata('exact-symbolic', [
      inequalityFact,
      complexFact,
    ]);

    expect(metadata.facts).toMatchObject([
      {
        kind: 'inequality-constraint',
        source: 'inequality-core',
        variable: 'x',
        message: 'x <= 2.',
      },
      {
        kind: 'complex-domain-note',
        source: 'complex-core',
        expressionLatex: 'x^2+1=0',
      },
    ]);
    expect(metadata.summary.hasInequalityFacts).toBe(true);
    expect(metadata.summary.hasComplexDomainFacts).toBe(true);
  });
});
