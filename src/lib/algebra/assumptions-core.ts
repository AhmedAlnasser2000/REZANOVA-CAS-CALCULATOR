import type { SolveDomainConstraint } from '../../types/calculator';

export const ASSUMPTION_FACT_KINDS = [
  'domain-exclusion',
  'domain-constraint',
  'inequality-constraint',
  'complex-domain-note',
  'interval-hazard',
  'branch-principal-range',
  'candidate-rejection',
  'equivalence-trust',
] as const;

export type AssumptionFactKind = (typeof ASSUMPTION_FACT_KINDS)[number];

export const ASSUMPTION_FACT_SOURCES = [
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
] as const;

export type AssumptionFactSource = (typeof ASSUMPTION_FACT_SOURCES)[number];

export const ASSUMPTION_FACT_TRUST_LEVELS = [
  'proved',
  'validated',
  'sampled',
  'display-only',
  'blocked',
] as const;

export type AssumptionFactTrust = (typeof ASSUMPTION_FACT_TRUST_LEVELS)[number];

export const ASSUMPTION_FACT_SCOPES = [
  'request',
  'result',
  'candidate',
  'interval',
  'display',
] as const;

export type AssumptionFactScope = (typeof ASSUMPTION_FACT_SCOPES)[number];

export type AssumptionFact = {
  id: string;
  kind: AssumptionFactKind;
  source: AssumptionFactSource;
  trust: AssumptionFactTrust;
  scope: AssumptionFactScope;
  message: string;
  expressionLatex?: string;
  variable?: string;
  details: readonly string[];
};

export type BuildAssumptionFactInput = Omit<AssumptionFact, 'id' | 'details'> & {
  details?: readonly string[];
};

export type AssumptionFactSummary = {
  total: number;
  byKind: Partial<Record<AssumptionFactKind, number>>;
  byTrust: Partial<Record<AssumptionFactTrust, number>>;
  blockedCount: number;
  messages: readonly string[];
};

function cleanString(value: string) {
  return value.trim();
}

function cleanStrings(values: readonly string[] = []) {
  return [...new Set(values.map(cleanString).filter(Boolean))];
}

export function assumptionFactKey(fact: Omit<AssumptionFact, 'id'>) {
  return JSON.stringify({
    kind: fact.kind,
    source: fact.source,
    trust: fact.trust,
    scope: fact.scope,
    message: cleanString(fact.message),
    expressionLatex: fact.expressionLatex,
    variable: fact.variable,
    details: cleanStrings(fact.details),
  });
}

export function buildAssumptionFact(input: BuildAssumptionFactInput): AssumptionFact {
  const normalized = {
    kind: input.kind,
    source: input.source,
    trust: input.trust,
    scope: input.scope,
    message: cleanString(input.message),
    expressionLatex: input.expressionLatex,
    variable: input.variable,
    details: cleanStrings(input.details),
  } satisfies Omit<AssumptionFact, 'id'>;

  return {
    ...normalized,
    id: assumptionFactKey(normalized),
  };
}

export function mergeAssumptionFacts(...factLists: readonly AssumptionFact[][]) {
  const merged = new Map<string, AssumptionFact>();
  for (const fact of factLists.flat()) {
    merged.set(fact.id, fact);
  }
  return [...merged.values()];
}

function increment<T extends string>(target: Partial<Record<T, number>>, key: T) {
  target[key] = (target[key] ?? 0) + 1;
}

export function summarizeAssumptionFacts(
  facts: readonly AssumptionFact[],
): AssumptionFactSummary {
  const byKind: Partial<Record<AssumptionFactKind, number>> = {};
  const byTrust: Partial<Record<AssumptionFactTrust, number>> = {};

  for (const fact of facts) {
    increment(byKind, fact.kind);
    increment(byTrust, fact.trust);
  }

  return {
    total: facts.length,
    byKind,
    byTrust,
    blockedCount: facts.filter((fact) => fact.trust === 'blocked').length,
    messages: cleanStrings(facts.map((fact) => fact.message)),
  };
}

function intervalText(input: {
  min?: number;
  minInclusive?: boolean;
  max?: number;
  maxInclusive?: boolean;
}) {
  const lower = input.min === undefined ? '-\\infty' : `${input.min}`;
  const upper = input.max === undefined ? '\\infty' : `${input.max}`;
  return `${input.minInclusive ? '[' : '('}${lower}, ${upper}${input.maxInclusive ? ']' : ')'}`;
}

export function assumptionFactsFromDomainConstraints(
  constraints: readonly SolveDomainConstraint[],
  options: {
    source?: AssumptionFactSource;
    scope?: AssumptionFactScope;
    trust?: AssumptionFactTrust;
  } = {},
) {
  const source = options.source ?? 'domain-range-core';
  const scope = options.scope ?? 'request';
  const trust = options.trust ?? 'proved';

  return mergeAssumptionFacts(constraints.map((constraint) => {
    switch (constraint.kind) {
      case 'nonzero':
        return buildAssumptionFact({
          kind: 'domain-exclusion',
          source,
          trust,
          scope,
          expressionLatex: constraint.expressionLatex,
          message: `${constraint.expressionLatex} must stay nonzero.`,
        });
      case 'positive':
        return buildAssumptionFact({
          kind: 'domain-constraint',
          source,
          trust,
          scope,
          expressionLatex: constraint.expressionLatex,
          message: `${constraint.expressionLatex} must stay positive.`,
        });
      case 'nonnegative':
        return buildAssumptionFact({
          kind: 'domain-constraint',
          source,
          trust,
          scope,
          expressionLatex: constraint.expressionLatex,
          message: `${constraint.expressionLatex} must stay nonnegative.`,
        });
      case 'expression-interval':
        return buildAssumptionFact({
          kind: 'domain-constraint',
          source,
          trust,
          scope,
          expressionLatex: constraint.expressionLatex,
          message: `${constraint.expressionLatex} must stay in ${intervalText(constraint)}.`,
        });
      case 'interval':
        return buildAssumptionFact({
          kind: 'domain-constraint',
          source,
          trust,
          scope,
          variable: constraint.variable,
          message: `${constraint.variable} must stay in ${intervalText(constraint)}.`,
        });
      case 'carrier-range':
        return buildAssumptionFact({
          kind: 'domain-constraint',
          source,
          trust,
          scope,
          expressionLatex: constraint.carrier,
          message: `${constraint.carrier} carrier must stay in [-1, 1].`,
        });
      case 'carrier-square-range':
        return buildAssumptionFact({
          kind: 'domain-constraint',
          source,
          trust,
          scope,
          expressionLatex: constraint.carrier,
          message: `${constraint.carrier} carrier must stay in [0, 1].`,
        });
      case 'exp-positive':
        return buildAssumptionFact({
          kind: 'domain-constraint',
          source,
          trust,
          scope,
          message: 'Exponential carrier target must stay positive.',
        });
    }
  }));
}
