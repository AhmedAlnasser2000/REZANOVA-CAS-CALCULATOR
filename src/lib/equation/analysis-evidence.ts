import type { AngleUnit, ComplexSolveRegion, DisplayOutcome, EquationDomainIntent, NumericSolveInterval } from '../../types/calculator';
import { equationToZeroFormLatex, evaluateLatexAtTarget } from './domain-guards';
import {
  buildEquationNumericSegmentationPlan,
  type EquationNumericDomainFact,
  type EquationNumericSegmentationBoundary,
} from './numeric-domain-segmentation';
import type { RealIntervalDomainClassification } from './real-interval-arithmetic';

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
  classification?: string;
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

export type EquationSingularityClassification =
  | 'removable-candidate'
  | 'pole-asymptote-candidate'
  | 'branch-domain-boundary'
  | 'trig-pole'
  | 'unknown';

const SOLVED_EXCLUSION_PATTERN = /^\\ne\s*(-?(?:\d+(?:\.\d+)?|\.\d+))/u;

function solvedExclusionPoint(fact: EquationNumericDomainFact, target: string) {
  if (fact.expressionLatex !== target || !fact.relationLatex) {
    return null;
  }
  const match = fact.relationLatex.match(SOLVED_EXCLUSION_PATTERN);
  if (!match) {
    return null;
  }
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function finiteNearbyValues(input: {
  zeroFormLatex: string;
  target: string;
  value: number;
  angleUnit: AngleUnit;
}) {
  const scale = Math.max(1, Math.abs(input.value));
  const offsets = [1e-4, 1e-5, 1e-3].map((offset) => offset * scale);
  const values: number[] = [];
  for (const offset of offsets) {
    for (const direction of [-1, 1]) {
      const evaluated = evaluateLatexAtTarget(
        input.zeroFormLatex,
        input.target,
        input.value + direction * offset,
        input.angleUnit,
      ).value;
      if (evaluated !== null && Number.isFinite(evaluated)) {
        values.push(evaluated);
      }
    }
  }
  return values;
}

function classifySolvedDenominatorExclusion(input: {
  equationLatex: string;
  target: string;
  value: number;
  angleUnit: AngleUnit;
}): EquationSingularityClassification {
  const zeroFormLatex = equationToZeroFormLatex(input.equationLatex);
  const nearby = finiteNearbyValues({
    zeroFormLatex,
    target: input.target,
    value: input.value,
    angleUnit: input.angleUnit,
  });
  if (nearby.length < 4) {
    return 'unknown';
  }
  const maxMagnitude = Math.max(...nearby.map((value) => Math.abs(value)));
  const minMagnitude = Math.min(...nearby.map((value) => Math.abs(value)));
  if (maxMagnitude >= 1e4) {
    return 'pole-asymptote-candidate';
  }
  if (maxMagnitude / Math.max(minMagnitude, 1e-12) < 1e4) {
    return 'removable-candidate';
  }
  return 'pole-asymptote-candidate';
}

function singularityClassificationForFact(input: {
  fact: EquationNumericDomainFact;
  equationLatex: string;
  target: string;
  angleUnit: AngleUnit;
}): EquationSingularityClassification | null {
  if (input.fact.kind === 'trig-pole') {
    return 'trig-pole';
  }
  if (
    input.fact.kind === 'log-domain'
    || input.fact.kind === 'root-domain'
    || input.fact.kind === 'fractional-power-domain'
    || input.fact.kind === 'inverse-trig-domain'
  ) {
    return 'branch-domain-boundary';
  }
  if (input.fact.kind === 'solved-denominator-exclusion') {
    const value = solvedExclusionPoint(input.fact, input.target);
    return value === null
      ? 'pole-asymptote-candidate'
      : classifySolvedDenominatorExclusion({
        equationLatex: input.equationLatex,
        target: input.target,
        value,
        angleUnit: input.angleUnit,
      });
  }
  if (input.fact.kind === 'denominator-exclusion' || input.fact.kind === 'sampled-discontinuity') {
    return 'unknown';
  }
  return null;
}

function singularityText(classification: EquationSingularityClassification, fact: EquationNumericDomainFact) {
  const payload = fact.expressionLatex && fact.relationLatex
    ? `${fact.expressionLatex}${fact.relationLatex}`
    : fact.message;
  switch (classification) {
    case 'removable-candidate':
      return `${payload} is a removable discontinuity candidate.`;
    case 'pole-asymptote-candidate':
      return `${payload} is a pole/asymptote candidate.`;
    case 'branch-domain-boundary':
      return `${payload} is a branch/domain boundary candidate.`;
    case 'trig-pole':
      return `${payload} is a trigonometric pole candidate.`;
    case 'unknown':
      return `${payload} is an excluded or undefined candidate with unknown singularity type.`;
  }
}

export function buildEquationSingularityEvidence(input: {
  facts: readonly EquationNumericDomainFact[];
  equationLatex: string;
  target: string;
  sourceRoute: string;
  angleUnit: AngleUnit;
}): EquationAnalysisEvidence[] {
  return input.facts.flatMap((fact) => {
    const classification = singularityClassificationForFact({
      fact,
      equationLatex: input.equationLatex,
      target: input.target,
      angleUnit: input.angleUnit,
    });
    if (!classification) {
      return [];
    }
    const pointValue = solvedExclusionPoint(fact, input.target);
    return [{
      id: [
        'singularity',
        input.sourceRoute,
        input.target,
        classification,
        fact.kind,
        fact.expressionLatex ?? '',
        fact.relationLatex ?? '',
        fact.message,
      ].join(':'),
      target: input.target,
      sourceRoute: input.sourceRoute,
      category: 'singularity' as const,
      classification,
      confidence: classification === 'unknown' ? 'unknown' : 'candidate',
      latex: latexForDomainFact(fact),
      text: singularityText(classification, fact),
      point: pointValue === null
        ? undefined
        : { value: pointValue, role: 'singularity' as const },
    }];
  });
}

function intervalFromNumericInterval(interval: NumericSolveInterval) {
  const start = Number(interval.start);
  const end = Number(interval.end);
  const subdivisions = Number(interval.subdivisions);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
    return null;
  }
  return {
    start,
    end,
    subdivisions: Number.isInteger(subdivisions) ? subdivisions : undefined,
  };
}

function intervalClassificationEvidence(input: {
  classification: RealIntervalDomainClassification;
  target: string;
  sourceRoute: string;
  interval: NumericSolveInterval;
}): EquationAnalysisEvidence {
  return {
    id: [
      'interval-validity',
      input.sourceRoute,
      input.target,
      input.classification.status,
      input.classification.factKind,
      input.classification.expressionLatex ?? '',
      input.classification.relationLatex ?? '',
      input.classification.message,
    ].join(':'),
    target: input.target,
    sourceRoute: input.sourceRoute,
    category: 'interval-validity',
    classification: input.classification.status,
    confidence: input.classification.status === 'unknown' ? 'unknown' : 'reported',
    latex: input.classification.expressionLatex && input.classification.relationLatex
      ? `${input.classification.expressionLatex}${input.classification.relationLatex}`
      : input.classification.expressionLatex,
    text: input.classification.evidence,
    interval: {
      start: input.interval.start,
      end: input.interval.end,
      subdivisions: input.interval.subdivisions,
      local: true,
    },
  };
}

function boundaryEvidence(input: {
  boundary: EquationNumericSegmentationBoundary;
  target: string;
  sourceRoute: string;
  interval: NumericSolveInterval;
}): EquationAnalysisEvidence {
  return {
    id: [
      'interval-boundary',
      input.sourceRoute,
      input.target,
      input.boundary.kind,
      input.boundary.value.toPrecision(12),
    ].join(':'),
    target: input.target,
    sourceRoute: input.sourceRoute,
    category: 'interval-validity',
    classification: `boundary:${input.boundary.kind}`,
    confidence: input.boundary.kind === 'sampled-discontinuity' ? 'heuristic' : 'reported',
    text: input.boundary.message,
    interval: {
      start: input.interval.start,
      end: input.interval.end,
      subdivisions: input.interval.subdivisions,
      local: true,
    },
    point: {
      value: input.boundary.value,
      role: input.boundary.excludedCandidate ? 'singularity' : 'boundary',
    },
  };
}

export function buildEquationIntervalValidityEvidence(input: {
  equationLatex: string;
  target: string;
  sourceRoute: string;
  angleUnit: AngleUnit;
  numericInterval?: NumericSolveInterval;
}): EquationAnalysisEvidence[] {
  if (!input.numericInterval) {
    return [];
  }
  const parsed = intervalFromNumericInterval(input.numericInterval);
  if (!parsed) {
    return [];
  }
  const plan = buildEquationNumericSegmentationPlan({
    equationLatex: input.equationLatex,
    zeroFormLatex: equationToZeroFormLatex(input.equationLatex),
    target: input.target,
    start: parsed.start,
    end: parsed.end,
    angleUnit: input.angleUnit,
  });
  return [
    ...plan.intervalArithmetic.classifications.map((classification) =>
      intervalClassificationEvidence({
        classification,
        target: input.target,
        sourceRoute: input.sourceRoute,
        interval: input.numericInterval as NumericSolveInterval,
      })),
    ...plan.boundaries.map((boundary) =>
      boundaryEvidence({
        boundary,
        target: input.target,
        sourceRoute: input.sourceRoute,
        interval: input.numericInterval as NumericSolveInterval,
      })),
  ];
}
