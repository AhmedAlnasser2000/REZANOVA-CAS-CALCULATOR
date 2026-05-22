import { describe, expect, it } from 'vitest';
import {
  buildSimplifyReadbackPolicy,
  canAdoptPolicyResult,
  equivalenceTrustFromAntiderivativeBackcheck,
  preservedFactsFromDomainConstraints,
  preservedFactsFromDomainHazards,
  SIMPLIFY_EQUIVALENCE_TRUST_LEVELS,
  SIMPLIFY_FORM_INTENTS,
} from './simplify-policy';

describe('simplify-policy', () => {
  it('locks the bounded form-intent vocabulary for SIMPLIFY-CORE0', () => {
    expect(SIMPLIFY_FORM_INTENTS).toEqual([
      'preserve',
      'canonical',
      'readable',
      'factored',
      'expanded',
      'canceled',
      'partial-fraction',
    ]);
  });

  it('locks the bounded equivalence-trust vocabulary', () => {
    expect(SIMPLIFY_EQUIVALENCE_TRUST_LEVELS).toEqual([
      'exact-normalized',
      'derivative-verified',
      'numeric-confidence',
      'display-only',
      'blocked',
    ]);
  });

  it('dedupes preserved facts and notes without rewriting expressions', () => {
    const policy = buildSimplifyReadbackPolicy({
      formIntent: 'partial-fraction',
      equivalenceTrust: 'derivative-verified',
      preservedFacts: [
        { kind: 'denominator-exclusion', expressionLatex: 'x-1' },
        { kind: 'denominator-exclusion', expressionLatex: 'x-1' },
        { kind: 'domain-hazard', hazard: 'denominator-nonzero' },
      ],
      notes: [
        'Readable partial fraction form.',
        'Readable partial fraction form.',
        '',
      ],
    });

    expect(policy).toEqual({
      formIntent: 'partial-fraction',
      equivalenceTrust: 'derivative-verified',
      preservedFacts: [
        { kind: 'denominator-exclusion', expressionLatex: 'x-1' },
        { kind: 'domain-hazard', hazard: 'denominator-nonzero' },
      ],
      notes: ['Readable partial fraction form.'],
    });
  });

  it('maps domain constraints and hazards into preserved policy facts', () => {
    expect(preservedFactsFromDomainConstraints([
      { kind: 'nonzero', expressionLatex: 'x^2-1' },
    ])).toEqual([
      { kind: 'denominator-exclusion', expressionLatex: 'x^2-1' },
    ]);

    expect(preservedFactsFromDomainHazards([
      'denominator-nonzero',
      'denominator-nonzero',
      'log-argument-positive',
    ])).toEqual([
      { kind: 'domain-hazard', hazard: 'denominator-nonzero' },
      { kind: 'domain-hazard', hazard: 'log-argument-positive' },
    ]);
  });

  it('uses antiderivative backcheck status as an adoption gate', () => {
    const exactPolicy = buildSimplifyReadbackPolicy({
      formIntent: 'readable',
      equivalenceTrust: equivalenceTrustFromAntiderivativeBackcheck('verified-exact'),
    });
    const numericPolicy = buildSimplifyReadbackPolicy({
      formIntent: 'readable',
      equivalenceTrust: equivalenceTrustFromAntiderivativeBackcheck('verified-numeric-confidence'),
    });
    const blockedPolicy = buildSimplifyReadbackPolicy({
      formIntent: 'readable',
      equivalenceTrust: equivalenceTrustFromAntiderivativeBackcheck('not-verified'),
    });
    const displayOnlyPolicy = buildSimplifyReadbackPolicy({
      formIntent: 'readable',
      equivalenceTrust: 'display-only',
    });

    expect(exactPolicy.equivalenceTrust).toBe('derivative-verified');
    expect(numericPolicy.equivalenceTrust).toBe('numeric-confidence');
    expect(canAdoptPolicyResult(exactPolicy)).toBe(true);
    expect(canAdoptPolicyResult(numericPolicy)).toBe(true);
    expect(canAdoptPolicyResult(blockedPolicy)).toBe(false);
    expect(canAdoptPolicyResult(displayOnlyPolicy)).toBe(false);
  });
});
