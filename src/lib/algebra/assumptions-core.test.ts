import { describe, expect, it } from 'vitest';
import {
  ASSUMPTION_FACT_KINDS,
  ASSUMPTION_FACT_SOURCES,
  ASSUMPTION_FACT_TRUST_LEVELS,
  assumptionFactsFromDomainConstraints,
  buildAssumptionFact,
  mergeAssumptionFacts,
  summarizeAssumptionFacts,
} from './assumptions-core';

describe('assumptions-core', () => {
  it('locks the bounded fact vocabulary for ASSUMPTIONS-CORE0', () => {
    expect(ASSUMPTION_FACT_KINDS).toEqual([
      'domain-exclusion',
      'domain-constraint',
      'inequality-constraint',
      'complex-domain-note',
      'interval-hazard',
      'branch-principal-range',
      'candidate-rejection',
      'equivalence-trust',
    ]);
    expect(ASSUMPTION_FACT_SOURCES).toEqual([
      'rational-function-core',
      'polynomial-domain-core',
      'domain-range-core',
      'value-domain-core',
      'inequality-core',
      'complex-core',
      'branch-core',
      'candidate-validation',
      'simplify-policy',
      'calculus-verification',
      'legacy',
    ]);
    expect(ASSUMPTION_FACT_TRUST_LEVELS).toEqual([
      'proved',
      'validated',
      'sampled',
      'display-only',
      'blocked',
    ]);
  });

  it('normalizes and dedupes facts without rewriting their source text', () => {
    const first = buildAssumptionFact({
      kind: 'domain-exclusion',
      source: 'rational-function-core',
      trust: 'proved',
      scope: 'result',
      expressionLatex: 'x-1',
      message: '  x-1 must stay nonzero.  ',
      details: ['from denominator', 'from denominator', ''],
    });
    const second = buildAssumptionFact({
      kind: 'domain-exclusion',
      source: 'rational-function-core',
      trust: 'proved',
      scope: 'result',
      expressionLatex: 'x-1',
      message: 'x-1 must stay nonzero.',
      details: ['from denominator'],
    });

    expect(first).toEqual(second);
    expect(mergeAssumptionFacts([first], [second])).toEqual([first]);
  });

  it('maps domain constraints into scoped assumption facts', () => {
    const facts = assumptionFactsFromDomainConstraints([
      { kind: 'nonzero', expressionLatex: 'x^2-1' },
      { kind: 'positive', expressionLatex: 'x' },
      {
        kind: 'expression-interval',
        expressionLatex: 'x+1',
        min: -1,
        minInclusive: true,
        max: 1,
        maxInclusive: true,
      },
    ], {
      source: 'domain-range-core',
      scope: 'result',
    });

    expect(facts.map((fact) => fact.kind)).toEqual([
      'domain-exclusion',
      'domain-constraint',
      'domain-constraint',
    ]);
    expect(facts.map((fact) => fact.message)).toEqual([
      'x^2-1 must stay nonzero.',
      'x must stay positive.',
      'x+1 must stay in [-1, 1].',
    ]);
  });

  it('summarizes facts for internal readiness and later readback consumers', () => {
    const facts = [
      buildAssumptionFact({
        kind: 'equivalence-trust',
        source: 'simplify-policy',
        trust: 'validated',
        scope: 'result',
        message: 'Derivative backcheck validated the readable form.',
      }),
      buildAssumptionFact({
        kind: 'interval-hazard',
        source: 'domain-range-core',
        trust: 'blocked',
        scope: 'interval',
        message: 'Interval crosses a denominator exclusion.',
      }),
    ];

    expect(summarizeAssumptionFacts(facts)).toEqual({
      total: 2,
      byKind: {
        'equivalence-trust': 1,
        'interval-hazard': 1,
      },
      byTrust: {
        validated: 1,
        blocked: 1,
      },
      blockedCount: 1,
      messages: [
        'Derivative backcheck validated the readable form.',
        'Interval crosses a denominator exclusion.',
      ],
    });
  });
});
