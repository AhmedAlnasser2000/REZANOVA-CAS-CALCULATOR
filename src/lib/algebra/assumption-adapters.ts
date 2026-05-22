import type { CandidateRejectionKind } from '../../types/calculator/exact-supplement-types';
import type { SolveDomainConstraint } from '../../types/calculator';
import type {
  BranchEquationSet,
  BranchFamilyMetadata,
} from './branch-core';
import type {
  DomainConstraintViolation,
  IntervalDomainCheck,
  OneSidedDomainCheck,
} from './domain-range-core';
import type {
  SimplifyEquivalenceTrust,
  SimplifyPreservedFact,
  SimplifyReadbackPolicy,
} from './simplify-policy';
import {
  assumptionFactsFromDomainConstraints,
  buildAssumptionFact,
  mergeAssumptionFacts,
  type AssumptionFact,
  type AssumptionFactScope,
  type AssumptionFactTrust,
} from './assumptions-core';

export function assumptionFactsFromRationalExclusions(
  constraints: readonly SolveDomainConstraint[],
) {
  return assumptionFactsFromDomainConstraints(constraints, {
    source: 'rational-function-core',
    scope: 'result',
    trust: 'proved',
  });
}

function hazardFromViolation(
  violation: DomainConstraintViolation,
  options: {
    scope: AssumptionFactScope;
    value?: number;
  },
) {
  return buildAssumptionFact({
    kind: 'interval-hazard',
    source: 'domain-range-core',
    trust: 'blocked',
    scope: options.scope,
    expressionLatex: 'expressionLatex' in violation.constraint
      ? violation.constraint.expressionLatex
      : undefined,
    message: options.value === undefined
      ? violation.message
      : `${violation.message} at ${options.value}`,
    details: [JSON.stringify(violation.constraint)],
  });
}

export function assumptionFactsFromDomainCheck(
  check: OneSidedDomainCheck | IntervalDomainCheck,
) {
  const constraintFacts = assumptionFactsFromDomainConstraints(check.constraints, {
    source: 'domain-range-core',
    scope: check.kind === 'unsafe' ? 'interval' : 'request',
    trust: check.kind === 'unknown' ? 'sampled' : 'proved',
  });

  if (check.kind === 'unsafe') {
    return mergeAssumptionFacts(constraintFacts, [
      hazardFromViolation(check.violation, {
        scope: 'interval',
        value: check.value,
      }),
    ]);
  }

  if (check.kind === 'outside-domain') {
    return mergeAssumptionFacts(constraintFacts, [
      hazardFromViolation(check.violation, {
        scope: 'interval',
      }),
    ]);
  }

  if (check.kind === 'unknown') {
    return mergeAssumptionFacts(constraintFacts, [
      buildAssumptionFact({
        kind: 'interval-hazard',
        source: 'domain-range-core',
        trust: 'blocked',
        scope: 'interval',
        message: 'Domain safety could not be established from bounded samples.',
      }),
    ]);
  }

  return constraintFacts;
}

export function assumptionFactsFromBranchSet(branchSet: BranchEquationSet) {
  const constraintFacts = assumptionFactsFromDomainConstraints(branchSet.constraints ?? [], {
    source: 'branch-core',
    scope: 'result',
    trust: 'proved',
  });

  const branchFact = buildAssumptionFact({
    kind: 'branch-principal-range',
    source: 'branch-core',
    trust: 'proved',
    scope: 'result',
    message: branchSet.summaryText ?? 'Branch equations preserve bounded branch choices.',
    details: [
      ...(branchSet.provenance ? [`provenance: ${branchSet.provenance}`] : []),
      ...branchSet.equations,
    ],
  });

  return mergeAssumptionFacts(constraintFacts, [branchFact]);
}

export function assumptionFactsFromBranchFamily(
  metadata: BranchFamilyMetadata,
) {
  return [buildAssumptionFact({
    kind: 'branch-principal-range',
    source: 'branch-core',
    trust: 'proved',
    scope: 'result',
    expressionLatex: metadata.carrierLatex,
    message: metadata.principalRangeLatex
      ? `${metadata.carrierLatex} uses principal range ${metadata.principalRangeLatex}.`
      : `${metadata.carrierLatex} uses bounded branch-family metadata.`,
    details: [
      `parameter: ${metadata.parameterLatex}`,
      ...metadata.branchesLatex,
      ...(metadata.parameterConstraintLatex ?? []),
      ...(metadata.discoveredFamilies ?? []),
    ],
  })];
}

function candidateRejectionMessage(kind: CandidateRejectionKind) {
  switch (kind) {
    case 'denominator-exclusion':
      return 'Candidate was rejected by denominator exclusions.';
    case 'domain-condition':
      return 'Candidate was rejected by preserved domain conditions.';
    case 'undefined-original':
      return 'Candidate was rejected because the original expression is undefined or non-real.';
    case 'residual-mismatch':
      return 'Candidate was rejected by residual validation.';
  }
}

export function assumptionFactsFromCandidateRejection(input: {
  kind: CandidateRejectionKind;
  constraints?: readonly SolveDomainConstraint[];
  reasons?: readonly string[];
}) {
  const rejection = buildAssumptionFact({
    kind: 'candidate-rejection',
    source: 'candidate-validation',
    trust: 'validated',
    scope: 'candidate',
    message: candidateRejectionMessage(input.kind),
    details: input.reasons,
  });

  return mergeAssumptionFacts([
    rejection,
  ], assumptionFactsFromDomainConstraints(input.constraints ?? [], {
    source: 'candidate-validation',
    scope: 'candidate',
    trust: 'validated',
  }));
}

export function assumptionTrustFromSimplifyEquivalence(
  trust: SimplifyEquivalenceTrust,
): AssumptionFactTrust {
  switch (trust) {
    case 'exact-normalized':
      return 'proved';
    case 'derivative-verified':
      return 'validated';
    case 'numeric-confidence':
      return 'sampled';
    case 'display-only':
      return 'display-only';
    case 'blocked':
      return 'blocked';
  }
}

function factFromSimplifyPreservedFact(
  fact: SimplifyPreservedFact,
  trust: AssumptionFactTrust,
) {
  switch (fact.kind) {
    case 'denominator-exclusion':
      return buildAssumptionFact({
        kind: 'domain-exclusion',
        source: 'simplify-policy',
        trust,
        scope: 'display',
        expressionLatex: fact.expressionLatex,
        message: `${fact.expressionLatex} must remain excluded from the denominator.`,
      });
    case 'domain-hazard':
      return buildAssumptionFact({
        kind: 'interval-hazard',
        source: 'simplify-policy',
        trust,
        scope: 'display',
        message: fact.hazard,
      });
    case 'real-domain-constraint':
      return buildAssumptionFact({
        kind: 'domain-constraint',
        source: 'simplify-policy',
        trust,
        scope: 'display',
        message: fact.description,
      });
  }
}

export function assumptionFactsFromSimplifyPolicy(
  policy: SimplifyReadbackPolicy,
): AssumptionFact[] {
  const trust = assumptionTrustFromSimplifyEquivalence(policy.equivalenceTrust);
  return mergeAssumptionFacts([
    buildAssumptionFact({
      kind: 'equivalence-trust',
      source: 'simplify-policy',
      trust,
      scope: 'display',
      message: `${policy.formIntent} form has ${policy.equivalenceTrust} trust.`,
      details: policy.notes,
    }),
    ...policy.preservedFacts.map((fact) => factFromSimplifyPreservedFact(fact, trust)),
  ]);
}

