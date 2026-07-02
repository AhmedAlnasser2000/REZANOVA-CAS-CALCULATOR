import type { ComplexSolveRegion, DisplayOutcome, EquationDomainIntent, NumericSolveInterval } from '../../types/calculator';
import type { EquationNumericDomainFact } from './numeric-domain-segmentation';

export type EquationAnalysisEvidenceCategory =
  | 'route'
  | 'domain'
  | 'periodicity'
  | 'interval-validity'
  | 'singularity'
  | 'root'
  | 'candidate'
  | 'range-behavior'
  | 'trust'
  | 'diagnostic';

export type EquationAnalysisEvidenceConfidence =
  | 'certified'
  | 'validated'
  | 'proven'
  | 'reported'
  | 'candidate'
  | 'heuristic'
  | 'unknown';

export type EquationAnalysisEvidenceInterval = {
  start: string;
  end: string;
  subdivisions?: number;
  local?: boolean;
};

export type EquationAnalysisEvidencePoint = {
  value: number;
  latex?: string;
  role?: 'root' | 'extraneous' | 'boundary' | 'singularity' | 'sample';
};

export type EquationAnalysisEvidence = {
  id: string;
  target: string;
  sourceRoute: string;
  category: EquationAnalysisEvidenceCategory;
  confidence: EquationAnalysisEvidenceConfidence;
  latex?: string;
  text?: string;
  interval?: EquationAnalysisEvidenceInterval;
  point?: EquationAnalysisEvidencePoint;
};

export const EQUATION_ANALYSIS_EVIDENCE = Symbol.for('calcwiz.equation.analysisEvidence');

type EquationEvidenceCarrier = {
  [EQUATION_ANALYSIS_EVIDENCE]?: EquationAnalysisEvidence[];
};

function uniqueEvidence(entries: readonly EquationAnalysisEvidence[]) {
  const seen = new Set<string>();
  const unique: EquationAnalysisEvidence[] = [];
  for (const entry of entries) {
    const key = entry.id;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(entry);
  }
  return unique;
}

export function getEquationAnalysisEvidence(outcome: DisplayOutcome | null | undefined) {
  return [...(((outcome as EquationEvidenceCarrier | null | undefined)?.[EQUATION_ANALYSIS_EVIDENCE]) ?? [])];
}

export function attachEquationAnalysisEvidence<T extends DisplayOutcome>(
  outcome: T,
  evidence: readonly EquationAnalysisEvidence[],
): T {
  if (evidence.length === 0) {
    return outcome;
  }
  const merged = uniqueEvidence([
    ...getEquationAnalysisEvidence(outcome),
    ...evidence,
  ]);
  Object.defineProperty(outcome, EQUATION_ANALYSIS_EVIDENCE, {
    value: merged,
    enumerable: true,
    configurable: true,
    writable: true,
  });
  return outcome;
}

function sourceRouteFor(input: {
  outcome: DisplayOutcome;
  numericInterval?: NumericSolveInterval;
  complexRegion?: ComplexSolveRegion;
  equationDomainIntent: EquationDomainIntent;
}) {
  if (input.numericInterval) {
    return 'numeric-interval';
  }
  if (input.complexRegion && input.equationDomainIntent === 'complex') {
    return 'complex-region';
  }
  if (input.outcome.kind !== 'prompt' && input.outcome.solutionKind === 'approximate-numeric') {
    if (input.outcome.numericMethod?.toLowerCase().includes('polynomial')) {
      return input.equationDomainIntent === 'complex'
        ? 'complex-numeric-polynomial'
        : 'deterministic-numeric-algebraic';
    }
    if (input.outcome.numericMethod?.toLowerCase().includes('periodic')) {
      return 'periodic-numeric-guidance';
    }
    return 'real-nonlinear-numeric-search';
  }
  if (input.outcome.kind === 'success' && input.outcome.resultOrigin === 'symbolic') {
    return 'symbolic-exact';
  }
  return input.outcome.kind === 'error' ? 'unsupported' : 'equation';
}

export function buildEquationRouteEvidence(input: {
  outcome: DisplayOutcome;
  target?: string;
  numericInterval?: NumericSolveInterval;
  complexRegion?: ComplexSolveRegion;
  equationDomainIntent: EquationDomainIntent;
}): EquationAnalysisEvidence[] {
  const target = input.target ?? 'unknown';
  const sourceRoute = sourceRouteFor(input);
  return [{
    id: `route:${sourceRoute}:${target}`,
    target,
    sourceRoute,
    category: 'route',
    confidence: 'reported',
    text: `Equation route: ${sourceRoute}.`,
    interval: input.numericInterval
      ? {
        start: input.numericInterval.start,
        end: input.numericInterval.end,
        subdivisions: input.numericInterval.subdivisions,
        local: true,
      }
      : undefined,
  }];
}

const DOMAIN_FACT_KINDS = new Set<EquationNumericDomainFact['kind']>([
  'denominator-exclusion',
  'solved-denominator-exclusion',
  'log-domain',
  'root-domain',
  'fractional-power-domain',
  'trig-pole',
  'inverse-trig-domain',
]);

function latexForDomainFact(fact: EquationNumericDomainFact) {
  return fact.expressionLatex && fact.relationLatex
    ? `${fact.expressionLatex}${fact.relationLatex}`
    : fact.expressionLatex;
}

function confidenceForDomainFact(fact: EquationNumericDomainFact): EquationAnalysisEvidenceConfidence {
  return fact.source === 'sample-probe' ? 'heuristic' : 'proven';
}

export function buildEquationDomainFactEvidence(input: {
  facts: readonly EquationNumericDomainFact[];
  target: string;
  sourceRoute: string;
}): EquationAnalysisEvidence[] {
  return input.facts
    .filter((fact) => DOMAIN_FACT_KINDS.has(fact.kind))
    .map((fact) => ({
      id: [
        'domain',
        input.sourceRoute,
        input.target,
        fact.kind,
        fact.expressionLatex ?? '',
        fact.relationLatex ?? '',
        fact.message,
      ].join(':'),
      target: input.target,
      sourceRoute: input.sourceRoute,
      category: 'domain' as const,
      confidence: confidenceForDomainFact(fact),
      latex: latexForDomainFact(fact),
      text: fact.message,
    }));
}
