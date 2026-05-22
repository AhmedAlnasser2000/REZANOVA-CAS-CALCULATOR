import { describe, expect, it } from 'vitest';
import {
  createBranchFamilyMetadata,
  createTwoBranchSet,
} from './branch-core';
import {
  assumptionFactsFromBranchFamily,
  assumptionFactsFromBranchSet,
  assumptionFactsFromCandidateRejection,
  assumptionFactsFromDomainCheck,
  assumptionFactsFromRationalExclusions,
  assumptionFactsFromSimplifyPolicy,
  assumptionTrustFromSimplifyEquivalence,
} from './assumption-adapters';
import { buildSimplifyReadbackPolicy } from './simplify-policy';

describe('assumption adoption adapters', () => {
  it('maps rational-function denominator exclusions into result-scoped facts', () => {
    const facts = assumptionFactsFromRationalExclusions([
      { kind: 'nonzero', expressionLatex: 'x^2-1' },
    ]);

    expect(facts).toMatchObject([
      {
        kind: 'domain-exclusion',
        source: 'rational-function-core',
        trust: 'proved',
        scope: 'result',
        expressionLatex: 'x^2-1',
      },
    ]);
  });

  it('maps domain/range interval hazards without changing check results', () => {
    const facts = assumptionFactsFromDomainCheck({
      kind: 'unsafe',
      constraints: [{ kind: 'nonzero', expressionLatex: 'x' }],
      value: 0,
      violation: {
        constraint: { kind: 'nonzero', expressionLatex: 'x' },
        message: 'would make a denominator zero',
      },
    });

    expect(facts.map((fact) => fact.kind)).toEqual([
      'domain-exclusion',
      'interval-hazard',
    ]);
    expect(facts[1]).toMatchObject({
      source: 'domain-range-core',
      trust: 'blocked',
      scope: 'interval',
      message: 'would make a denominator zero at 0',
    });
  });

  it('maps branch metadata and constraints into branch/principal-range facts', () => {
    const branchSet = createTwoBranchSet(
      'x=1',
      'x=-1',
      [{ kind: 'nonzero', expressionLatex: 'x' }],
      {
        summaryText: 'Two bounded branches.',
        provenance: 'abs-core',
      },
    );

    expect(assumptionFactsFromBranchSet(branchSet).map((fact) => fact.kind)).toEqual([
      'domain-exclusion',
      'branch-principal-range',
    ]);

    const family = createBranchFamilyMetadata({
      carrierLatex: '\\sin(x)',
      parameterLatex: 'k\\in\\mathbb{Z}',
      branchesLatex: ['x=2\\pi k'],
      principalRangeLatex: '[-1,1]',
    });

    expect(assumptionFactsFromBranchFamily(family)).toMatchObject([
      {
        kind: 'branch-principal-range',
        source: 'branch-core',
        expressionLatex: '\\sin(x)',
      },
    ]);
  });

  it('maps candidate rejection facts and related domain constraints', () => {
    const facts = assumptionFactsFromCandidateRejection({
      kind: 'domain-condition',
      constraints: [{ kind: 'nonnegative', expressionLatex: 'x' }],
      reasons: ['even root negative'],
    });

    expect(facts.map((fact) => fact.kind)).toEqual([
      'candidate-rejection',
      'domain-constraint',
    ]);
    expect(facts[0]).toMatchObject({
      source: 'candidate-validation',
      trust: 'validated',
      scope: 'candidate',
      message: 'Candidate was rejected by preserved domain conditions.',
    });
  });

  it('maps simplify/readback trust and preserved facts into display-scoped facts', () => {
    expect(assumptionTrustFromSimplifyEquivalence('exact-normalized')).toBe('proved');
    expect(assumptionTrustFromSimplifyEquivalence('derivative-verified')).toBe('validated');
    expect(assumptionTrustFromSimplifyEquivalence('numeric-confidence')).toBe('sampled');
    expect(assumptionTrustFromSimplifyEquivalence('display-only')).toBe('display-only');
    expect(assumptionTrustFromSimplifyEquivalence('blocked')).toBe('blocked');

    const policy = buildSimplifyReadbackPolicy({
      formIntent: 'partial-fraction',
      equivalenceTrust: 'derivative-verified',
      preservedFacts: [
        { kind: 'denominator-exclusion', expressionLatex: 'x-1' },
        { kind: 'real-domain-constraint', description: 'x must stay positive' },
      ],
      notes: ['Readable form accepted after backcheck.'],
    });

    const facts = assumptionFactsFromSimplifyPolicy(policy);

    expect(facts.map((fact) => fact.kind)).toEqual([
      'equivalence-trust',
      'domain-exclusion',
      'domain-constraint',
    ]);
    expect(facts.every((fact) => fact.source === 'simplify-policy')).toBe(true);
    expect(facts.every((fact) => fact.trust === 'validated')).toBe(true);
  });
});

