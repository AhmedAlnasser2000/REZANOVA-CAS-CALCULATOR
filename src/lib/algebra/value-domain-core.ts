import type { AnswerDomain, SolveDomainConstraint } from '../../types/calculator';
import {
  assumptionFactsFromDomainConstraints,
  buildAssumptionFact,
  mergeAssumptionFacts,
  summarizeAssumptionFacts,
  type AssumptionFact,
  type AssumptionFactScope,
  type AssumptionFactSource,
  type AssumptionFactSummary,
  type AssumptionFactTrust,
} from './assumptions-core';

export const ANSWER_DOMAINS = [
  'real',
  'complex',
  'conditional-real',
  'unknown-domain',
] as const;

export type { AnswerDomain } from '../../types/calculator';

export const SOLUTION_KINDS = [
  'exact-symbolic',
  'approximate-numeric',
  'isolate-formula',
  'inequality-solution-set',
  'condition-fact-only-stop',
] as const;

export type SolutionKind = (typeof SOLUTION_KINDS)[number];

export type ValueDomainSummary = AssumptionFactSummary & {
  answerDomain: AnswerDomain;
  solutionKind: SolutionKind;
  hasInequalityFacts: boolean;
  hasComplexDomainFacts: boolean;
};

export type ValueDomainMetadata = {
  answerDomain: AnswerDomain;
  solutionKind: SolutionKind;
  facts: readonly AssumptionFact[];
  summary: ValueDomainSummary;
};

export type BuildValueDomainMetadataInput = {
  answerDomain: AnswerDomain;
  solutionKind: SolutionKind;
  facts?: readonly AssumptionFact[];
};

export type BuildValueDomainFactOptions = {
  source?: AssumptionFactSource;
  scope?: AssumptionFactScope;
  trust?: AssumptionFactTrust;
  details?: readonly string[];
};

function buildSummary(
  answerDomain: AnswerDomain,
  solutionKind: SolutionKind,
  facts: readonly AssumptionFact[],
): ValueDomainSummary {
  const factSummary = summarizeAssumptionFacts(facts);
  return {
    ...factSummary,
    answerDomain,
    solutionKind,
    hasInequalityFacts: facts.some((fact) => fact.kind === 'inequality-constraint'),
    hasComplexDomainFacts: facts.some((fact) => fact.kind === 'complex-domain-note'),
  };
}

export function buildValueDomainMetadata({
  answerDomain,
  solutionKind,
  facts = [],
}: BuildValueDomainMetadataInput): ValueDomainMetadata {
  const dedupedFacts = mergeAssumptionFacts([...facts]);
  return {
    answerDomain,
    solutionKind,
    facts: dedupedFacts,
    summary: buildSummary(answerDomain, solutionKind, dedupedFacts),
  };
}

export function buildRealValueDomainMetadata(
  solutionKind: SolutionKind,
  facts: readonly AssumptionFact[] = [],
) {
  return buildValueDomainMetadata({
    answerDomain: 'real',
    solutionKind,
    facts,
  });
}

export function buildComplexValueDomainMetadata(
  solutionKind: SolutionKind,
  facts: readonly AssumptionFact[] = [],
) {
  return buildValueDomainMetadata({
    answerDomain: 'complex',
    solutionKind,
    facts,
  });
}

export function buildConditionalRealValueDomainMetadata(
  solutionKind: SolutionKind,
  facts: readonly AssumptionFact[] = [],
) {
  return buildValueDomainMetadata({
    answerDomain: 'conditional-real',
    solutionKind,
    facts,
  });
}

export function buildUnknownDomainValueMetadata(
  solutionKind: SolutionKind,
  facts: readonly AssumptionFact[] = [],
) {
  return buildValueDomainMetadata({
    answerDomain: 'unknown-domain',
    solutionKind,
    facts,
  });
}

export function buildInequalityConstraintFact(input: {
  expressionLatex?: string;
  variable?: string;
  message: string;
} & BuildValueDomainFactOptions) {
  return buildAssumptionFact({
    kind: 'inequality-constraint',
    source: input.source ?? 'value-domain-core',
    trust: input.trust ?? 'proved',
    scope: input.scope ?? 'result',
    expressionLatex: input.expressionLatex,
    variable: input.variable,
    message: input.message,
    details: input.details,
  });
}

export function buildComplexDomainNoteFact(input: {
  expressionLatex?: string;
  message: string;
} & BuildValueDomainFactOptions) {
  return buildAssumptionFact({
    kind: 'complex-domain-note',
    source: input.source ?? 'value-domain-core',
    trust: input.trust ?? 'display-only',
    scope: input.scope ?? 'result',
    expressionLatex: input.expressionLatex,
    message: input.message,
    details: input.details,
  });
}

export function valueDomainMetadataFromDomainConstraints(input: {
  answerDomain?: AnswerDomain;
  solutionKind: SolutionKind;
  constraints: readonly SolveDomainConstraint[];
  source?: AssumptionFactSource;
  scope?: AssumptionFactScope;
  trust?: AssumptionFactTrust;
}) {
  const facts = assumptionFactsFromDomainConstraints(input.constraints, {
    source: input.source ?? 'domain-range-core',
    scope: input.scope ?? 'result',
    trust: input.trust ?? 'proved',
  });
  return buildValueDomainMetadata({
    answerDomain: input.answerDomain ?? 'conditional-real',
    solutionKind: input.solutionKind,
    facts,
  });
}
