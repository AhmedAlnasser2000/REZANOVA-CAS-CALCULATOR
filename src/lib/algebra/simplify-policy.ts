import type { SolveDomainConstraint } from '../../types/calculator';
import type { AntiderivativeBackcheckStatus } from '../calculus/engine/verification';

export const SIMPLIFY_FORM_INTENTS = [
  'preserve',
  'canonical',
  'readable',
  'factored',
  'expanded',
  'canceled',
  'partial-fraction',
] as const;

export type SimplifyFormIntent = (typeof SIMPLIFY_FORM_INTENTS)[number];

export const SIMPLIFY_EQUIVALENCE_TRUST_LEVELS = [
  'exact-normalized',
  'derivative-verified',
  'numeric-confidence',
  'display-only',
  'blocked',
] as const;

export type SimplifyEquivalenceTrust = (typeof SIMPLIFY_EQUIVALENCE_TRUST_LEVELS)[number];

export type SimplifyPreservedFact =
  | {
      kind: 'denominator-exclusion';
      expressionLatex: string;
    }
  | {
      kind: 'domain-hazard';
      hazard: string;
    }
  | {
      kind: 'real-domain-constraint';
      description: string;
    };

export type SimplifyReadbackPolicy = {
  formIntent: SimplifyFormIntent;
  equivalenceTrust: SimplifyEquivalenceTrust;
  preservedFacts: readonly SimplifyPreservedFact[];
  notes: readonly string[];
};

type BuildSimplifyReadbackPolicyInput = {
  formIntent: SimplifyFormIntent;
  equivalenceTrust: SimplifyEquivalenceTrust;
  preservedFacts?: readonly SimplifyPreservedFact[];
  notes?: readonly string[];
};

function factKey(fact: SimplifyPreservedFact) {
  switch (fact.kind) {
    case 'denominator-exclusion':
      return `${fact.kind}:${fact.expressionLatex}`;
    case 'domain-hazard':
      return `${fact.kind}:${fact.hazard}`;
    case 'real-domain-constraint':
      return `${fact.kind}:${fact.description}`;
  }
}

function uniquePreservedFacts(facts: readonly SimplifyPreservedFact[]) {
  const seen = new Set<string>();
  const unique: SimplifyPreservedFact[] = [];
  for (const fact of facts) {
    const key = factKey(fact);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(fact);
  }
  return unique;
}

function uniqueStrings(values: readonly string[]) {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

export function buildSimplifyReadbackPolicy(
  input: BuildSimplifyReadbackPolicyInput,
): SimplifyReadbackPolicy {
  return {
    formIntent: input.formIntent,
    equivalenceTrust: input.equivalenceTrust,
    preservedFacts: uniquePreservedFacts(input.preservedFacts ?? []),
    notes: uniqueStrings(input.notes ?? []),
  };
}

export function preservedFactsFromDomainHazards(
  hazards: readonly string[],
): SimplifyPreservedFact[] {
  return uniqueStrings(hazards).map((hazard) => ({
    kind: 'domain-hazard',
    hazard,
  }));
}

export function preservedFactsFromDomainConstraints(
  constraints: readonly SolveDomainConstraint[],
): SimplifyPreservedFact[] {
  return constraints.map((constraint) => {
    switch (constraint.kind) {
      case 'nonzero':
        return {
          kind: 'denominator-exclusion',
          expressionLatex: constraint.expressionLatex,
        };
      case 'interval':
        return {
          kind: 'real-domain-constraint',
          description: `${constraint.variable} interval constraint`,
        };
      case 'positive':
        return {
          kind: 'real-domain-constraint',
          description: `${constraint.expressionLatex} positive`,
        };
      case 'nonnegative':
        return {
          kind: 'real-domain-constraint',
          description: `${constraint.expressionLatex} nonnegative`,
        };
      case 'expression-interval':
        return {
          kind: 'real-domain-constraint',
          description: `${constraint.expressionLatex} interval constraint`,
        };
      case 'carrier-range':
        return {
          kind: 'real-domain-constraint',
          description: `${constraint.carrier} range [${constraint.min}, ${constraint.max}]`,
        };
      case 'carrier-square-range':
        return {
          kind: 'real-domain-constraint',
          description: `${constraint.carrier} range [${constraint.min}, ${constraint.max}]`,
        };
      case 'exp-positive':
        return {
          kind: 'real-domain-constraint',
          description: 'exponential expression positive',
        };
    }
    const _exhaustive: never = constraint;
    return _exhaustive;
  });
}

export function equivalenceTrustFromAntiderivativeBackcheck(
  status: AntiderivativeBackcheckStatus,
): SimplifyEquivalenceTrust {
  switch (status) {
    case 'verified-exact':
      return 'derivative-verified';
    case 'verified-numeric-confidence':
      return 'numeric-confidence';
    case 'not-verified':
      return 'blocked';
    case 'not-checkable':
      return 'blocked';
  }
}

export function canAdoptPolicyResult(policy: SimplifyReadbackPolicy) {
  return policy.equivalenceTrust === 'exact-normalized'
    || policy.equivalenceTrust === 'derivative-verified'
    || policy.equivalenceTrust === 'numeric-confidence';
}
