import type { AngleUnit, ComplexSolveRegion, ResultProducerDraft, EquationDomainIntent, NumericSolveInterval } from '../../types/calculator';
import { solveSummaryPlainText } from '../display/result-detail-lines';
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
  supplementEvidence?: {
    role: 'exclusion' | 'condition';
    expressionLatex?: string;
    canonicalLatex: string;
    mathJson: import('../../types/calculator').SerializableMathJson;
  };
};

export const EQUATION_CANONICAL_SUPPLEMENT_CLASSIFICATION = 'canonical-supplement';

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

export function getEquationAnalysisEvidence(outcome: ResultProducerDraft | null | undefined) {
  return [...(((outcome as EquationEvidenceCarrier | null | undefined)?.[EQUATION_ANALYSIS_EVIDENCE]) ?? [])];
}

export function attachEquationAnalysisEvidence<T extends ResultProducerDraft>(
  outcome: T,
  evidence: readonly EquationAnalysisEvidence[],
): T {
  if (evidence.length === 0) {
    return outcome;
  }
  const existingEvidence = getEquationAnalysisEvidence(outcome);
  const producerSelectionSources = new Set(existingEvidence.flatMap((entry) =>
    entry.classification === EQUATION_CANONICAL_SUPPLEMENT_CLASSIFICATION
      ? [entry.sourceRoute]
      : []));
  const incomingEvidence = producerSelectionSources.size > 0
    ? evidence.map((entry) => {
        if (
          entry.classification !== EQUATION_CANONICAL_SUPPLEMENT_CLASSIFICATION
          || producerSelectionSources.has(entry.sourceRoute)
        ) {
          return entry;
        }
        const { classification: _classification, ...diagnosticEntry } = entry;
        return diagnosticEntry;
      })
    : evidence;
  const merged = uniqueEvidence([
    ...existingEvidence,
    ...incomingEvidence,
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
  outcome: ResultProducerDraft;
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
  outcome: ResultProducerDraft;
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

function mathJsonContainsSymbol(node: unknown, symbol: string): boolean {
  if (node === symbol) return true;
  if (Array.isArray(node)) {
    return node.some((child) => mathJsonContainsSymbol(child, symbol));
  }
  if (node && typeof node === 'object') {
    return Object.values(node).some((child) => mathJsonContainsSymbol(child, symbol));
  }
  return false;
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
      ...(fact.relationCanonicalLatex
        && fact.relationMathJson !== undefined
        && mathJsonContainsSymbol(fact.relationMathJson, input.target)
        ? {
            classification: EQUATION_CANONICAL_SUPPLEMENT_CLASSIFICATION,
            supplementEvidence: {
              role: fact.kind === 'denominator-exclusion'
                || fact.kind === 'solved-denominator-exclusion'
                || fact.kind === 'trig-pole'
                ? 'exclusion' as const
                : 'condition' as const,
              ...(fact.expressionLatex ? { expressionLatex: fact.expressionLatex } : {}),
              canonicalLatex: fact.relationCanonicalLatex,
              mathJson: fact.relationMathJson,
            },
          }
        : {}),
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

export function numericIntervalEvidence(interval?: NumericSolveInterval): EquationAnalysisEvidenceInterval | undefined {
  return interval
    ? {
      start: interval.start,
      end: interval.end,
      subdivisions: interval.subdivisions,
      local: true,
    }
    : undefined;
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

function outcomeDetailSection(outcome: ResultProducerDraft, title: string) {
  return outcome.kind !== 'prompt'
    ? outcome.detailSections?.find((section) => section.title === title)
    : undefined;
}

function outcomeDetailLines(outcome: ResultProducerDraft, title: string) {
  return outcomeDetailSection(outcome, title)?.lines ?? [];
}

function hasSturmCertifiedRoots(outcome: ResultProducerDraft) {
  if (outcome.kind === 'prompt') {
    return false;
  }
  const summary = solveSummaryPlainText(outcome);
  const certificationLines = outcomeDetailLines(outcome, 'Real Root Certification').join(' ');
  return /with Sturm certification/u.test(summary)
    || /All real polynomial roots certified/u.test(certificationLines);
}

function numericRootClassification(input: {
  sourceRoute: string;
  outcome: ResultProducerDraft;
  numericInterval?: NumericSolveInterval;
}) {
  if (hasSturmCertifiedRoots(input.outcome)) {
    return {
      classification: 'sturm-certified-root',
      confidence: 'certified' as const,
    };
  }
  if (input.numericInterval || input.sourceRoute === 'numeric-interval') {
    return {
      classification: 'interval-local-root',
      confidence: 'validated' as const,
    };
  }
  return {
    classification: input.sourceRoute === 'real-nonlinear-numeric-search'
      ? 'bounded-search-root'
      : 'validated-real-root',
    confidence: 'validated' as const,
  };
}

function rootValueEvidence(input: {
  value: number;
  target: string;
  sourceRoute: string;
  classification: string;
  confidence: EquationAnalysisEvidenceConfidence;
  interval?: NumericSolveInterval;
}): EquationAnalysisEvidence {
  const roundedId = input.value.toPrecision(12);
  return {
    id: ['root', input.sourceRoute, input.target, input.classification, roundedId].join(':'),
    target: input.target,
    sourceRoute: input.sourceRoute,
    category: 'root',
    classification: input.classification,
    confidence: input.confidence,
    text: `Validated root candidate ${input.target}≈${input.value}.`,
    interval: numericIntervalEvidence(input.interval),
    point: {
      value: input.value,
      role: 'root',
    },
  };
}

const APPROX_REAL_BRANCH_PATTERN = /^-?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?$/iu;

function approximateRealBranchValues(outcome: ResultProducerDraft) {
  if (
    outcome.kind !== 'success'
    || outcome.answerDomain === 'complex'
    || outcome.branchReadback?.relationLatex !== '\\approx'
  ) {
    return [];
  }
  return outcome.branchReadback.branchesLatex.flatMap((branchLatex): number[] => {
    const trimmed = branchLatex.trim();
    if (!APPROX_REAL_BRANCH_PATTERN.test(trimmed)) {
      return [];
    }
    const value = Number(trimmed);
    return Number.isFinite(value) ? [value] : [];
  });
}

const EXTRANEOUS_APPROX_PATTERN = /^Candidate approximately\s+(-?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?)\s+rejected/iu;

function extraneousEvidenceFromOutcome(input: {
  outcome: ResultProducerDraft;
  target: string;
  sourceRoute: string;
  interval?: NumericSolveInterval;
}): EquationAnalysisEvidence[] {
  if (input.outcome.kind === 'prompt') {
    return [];
  }
  const lines = outcomeDetailLines(input.outcome, 'Extraneous Solutions');
  const entries = lines.map((line, index): EquationAnalysisEvidence => {
    const approxMatch = line.match(EXTRANEOUS_APPROX_PATTERN);
    const approxValue = approxMatch ? Number(approxMatch[1]) : null;
    return {
      id: [
        'candidate',
        input.sourceRoute,
        input.target,
        'extraneous',
        approxValue === null ? index : approxValue.toPrecision(12),
        line,
      ].join(':'),
      target: input.target,
      sourceRoute: input.sourceRoute,
      category: 'candidate',
      classification: 'extraneous-candidate',
      confidence: 'validated',
      text: line,
      interval: numericIntervalEvidence(input.interval),
      point: approxValue === null || !Number.isFinite(approxValue)
        ? undefined
        : {
          value: approxValue,
          role: 'extraneous',
        },
    };
  });
  if (entries.length > 0 || !input.outcome.rejectedCandidateCount) {
    return entries;
  }
  return [{
    id: ['candidate', input.sourceRoute, input.target, 'extraneous-count', input.outcome.rejectedCandidateCount].join(':'),
    target: input.target,
    sourceRoute: input.sourceRoute,
    category: 'candidate',
    classification: 'extraneous-candidate-count',
    confidence: 'reported',
    text: `Rejected ${input.outcome.rejectedCandidateCount} extraneous candidate${input.outcome.rejectedCandidateCount === 1 ? '' : 's'}.`,
    interval: numericIntervalEvidence(input.interval),
  }];
}

function sturmCertificationEvidence(input: {
  outcome: ResultProducerDraft;
  target: string;
  sourceRoute: string;
}): EquationAnalysisEvidence[] {
  if (!hasSturmCertifiedRoots(input.outcome)) {
    return [];
  }
  const lines = outcomeDetailLines(input.outcome, 'Real Root Certification');
  return [{
    id: ['root', input.sourceRoute, input.target, 'sturm-certification'].join(':'),
    target: input.target,
    sourceRoute: input.sourceRoute,
    category: 'root',
    classification: 'sturm-certified-intervals',
    confidence: 'certified',
    text: lines.length > 0
      ? lines.join(' ')
      : 'Sturm certification matched validated real polynomial roots.',
  }];
}

function complexBranchRootEvidence(input: {
  outcome: ResultProducerDraft;
  target: string;
  sourceRoute: string;
}): EquationAnalysisEvidence[] {
  if (
    input.outcome.kind !== 'success'
    || input.outcome.answerDomain !== 'complex'
    || !input.outcome.branchReadback
  ) {
    return [];
  }
  const isPolynomial = input.outcome.numericMethod?.toLowerCase().includes('polynomial') === true
    || input.outcome.branchReadback.source === 'equation-complex-numeric-polynomial';
  const classification = isPolynomial
    ? 'complex-polynomial-root'
    : input.sourceRoute === 'complex-region'
      ? 'region-local-complex-root'
      : 'validated-complex-root';
  return input.outcome.branchReadback.branchesLatex.map((branchLatex, index) => ({
    id: ['root', input.sourceRoute, input.target, classification, index, branchLatex].join(':'),
    target: input.target,
    sourceRoute: input.sourceRoute,
    category: 'root' as const,
    classification,
    confidence: 'validated' as const,
    latex: branchLatex,
    text: `${classification === 'region-local-complex-root' ? 'Region-local' : 'Validated'} complex root ${branchLatex}.`,
  }));
}

function intervalScopeEvidence(input: {
  outcome: ResultProducerDraft;
  target: string;
  sourceRoute: string;
  interval?: NumericSolveInterval;
}): EquationAnalysisEvidence[] {
  if (!input.interval || input.outcome.kind === 'prompt') {
    return [];
  }
  return [{
    id: ['diagnostic', input.sourceRoute, input.target, 'interval-local-scope', input.interval.start, input.interval.end].join(':'),
    target: input.target,
    sourceRoute: input.sourceRoute,
    category: 'diagnostic',
    classification: 'interval-local-scope',
    confidence: 'reported',
    text: `Roots are local to the chosen interval [${input.interval.start}, ${input.interval.end}].`,
    interval: numericIntervalEvidence(input.interval),
  }];
}

export function buildEquationCertifiedFeatureEvidence(input: {
  outcome: ResultProducerDraft;
  target: string;
  sourceRoute: string;
  numericInterval?: NumericSolveInterval;
  complexRegion?: ComplexSolveRegion;
}): EquationAnalysisEvidence[] {
  const rootClassification = numericRootClassification({
    sourceRoute: input.sourceRoute,
    outcome: input.outcome,
    numericInterval: input.numericInterval,
  });
  const candidateValues = input.outcome.kind === 'success'
    ? input.outcome.candidateValues ?? []
    : [];
  const realRootValues = candidateValues.length > 0
    ? candidateValues
    : approximateRealBranchValues(input.outcome);
  const realRootEvidence = input.outcome.kind === 'success'
    ? realRootValues.map((value) =>
      rootValueEvidence({
        value,
        target: input.target,
        sourceRoute: input.sourceRoute,
        classification: rootClassification.classification,
        confidence: rootClassification.confidence,
        interval: input.numericInterval,
      }))
    : [];
  return [
    ...realRootEvidence,
    ...complexBranchRootEvidence({
      outcome: input.outcome,
      target: input.target,
      sourceRoute: input.sourceRoute,
    }),
    ...sturmCertificationEvidence({
      outcome: input.outcome,
      target: input.target,
      sourceRoute: input.sourceRoute,
    }),
    ...intervalScopeEvidence({
      outcome: input.outcome,
      target: input.target,
      sourceRoute: input.sourceRoute,
      interval: input.numericInterval,
    }),
    ...extraneousEvidenceFromOutcome({
      outcome: input.outcome,
      target: input.target,
      sourceRoute: input.sourceRoute,
      interval: input.numericInterval,
    }),
  ];
}

function hasLatexFunction(equationLatex: string, name: 'sin' | 'cos' | 'tan') {
  const escaped = new RegExp(`\\\\${name}\\b`, 'u');
  const plain = new RegExp(`(?:^|[^A-Za-z])${name}\\s*\\(`, 'u');
  return escaped.test(equationLatex) || plain.test(equationLatex);
}

function hasAbsoluteValue(equationLatex: string) {
  return /(?:^|[^A-Za-z])abs\s*\(/u.test(equationLatex)
    || /\\(?:left)?\|/u.test(equationLatex)
    || /\\lvert\b/u.test(equationLatex)
    || /\|[^|]+\|/u.test(equationLatex);
}

function tanPoleSpacingText(angleUnit: AngleUnit) {
  switch (angleUnit) {
    case 'deg':
      return 'Tan poles repeat every 180 degrees in the carrier angle.';
    case 'grad':
      return 'Tan poles repeat every 200 grads in the carrier angle.';
    case 'rad':
    default:
      return 'Tan poles repeat every pi radians in the carrier angle.';
  }
}

function rangeBehaviorEvidence(input: {
  target: string;
  sourceRoute: string;
  classification: string;
  latex?: string;
  text: string;
  confidence?: EquationAnalysisEvidenceConfidence;
}): EquationAnalysisEvidence {
  return {
    id: ['range-behavior', input.sourceRoute, input.target, input.classification, input.latex ?? input.text].join(':'),
    target: input.target,
    sourceRoute: input.sourceRoute,
    category: 'range-behavior',
    classification: input.classification,
    confidence: input.confidence ?? 'proven',
    latex: input.latex,
    text: input.text,
  };
}

export function buildEquationRangeBehaviorEvidence(input: {
  equationLatex: string;
  target: string;
  sourceRoute: string;
  angleUnit: AngleUnit;
  equationDomainIntent: EquationDomainIntent;
}): EquationAnalysisEvidence[] {
  const evidence: EquationAnalysisEvidence[] = [];
  if (hasLatexFunction(input.equationLatex, 'sin')) {
    evidence.push(rangeBehaviorEvidence({
      target: input.target,
      sourceRoute: input.sourceRoute,
      classification: 'bounded-sine-carrier',
      latex: String.raw`-1\le\sin(\cdot)\le1`,
      text: 'Sine carrier values stay in [-1, 1] on the real line.',
    }));
  }
  if (hasLatexFunction(input.equationLatex, 'cos')) {
    evidence.push(rangeBehaviorEvidence({
      target: input.target,
      sourceRoute: input.sourceRoute,
      classification: 'bounded-cosine-carrier',
      latex: String.raw`-1\le\cos(\cdot)\le1`,
      text: 'Cosine carrier values stay in [-1, 1] on the real line.',
    }));
  }
  if (hasAbsoluteValue(input.equationLatex)) {
    evidence.push(rangeBehaviorEvidence({
      target: input.target,
      sourceRoute: input.sourceRoute,
      classification: 'absolute-value-nonnegative',
      latex: String.raw`\left|\cdot\right|\ge0`,
      text: 'Absolute-value carriers are nonnegative.',
    }));
  }
  if (input.equationDomainIntent === 'real' && /\\sqrt\b/u.test(input.equationLatex)) {
    evidence.push(rangeBehaviorEvidence({
      target: input.target,
      sourceRoute: input.sourceRoute,
      classification: 'real-principal-square-root-nonnegative',
      latex: String.raw`\sqrt{\cdot}\ge0`,
      text: 'Real principal square-root carrier values are nonnegative.',
    }));
  }
  if (hasLatexFunction(input.equationLatex, 'tan')) {
    evidence.push(rangeBehaviorEvidence({
      target: input.target,
      sourceRoute: input.sourceRoute,
      classification: 'tangent-pole-spacing',
      text: tanPoleSpacingText(input.angleUnit),
      confidence: 'reported',
    }));
  }
  return evidence;
}
