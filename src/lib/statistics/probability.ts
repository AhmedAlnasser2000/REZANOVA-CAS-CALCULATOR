import type {
  DisplayDetailSection,
  StatisticsProbabilityEvent,
  StatisticsRequest,
} from '../../types/calculator';
import { numberToLatex } from '../display/format';
import { profileStatisticsResult } from '../display/printer';
import { evaluateStatisticsDistribution } from './distributions';
import {
  probabilityValueMathJsonLeaves,
  type StatisticsOwnedMathJsonLeaf,
} from './math-values';
import { formatStatisticsNumber, parseIntegerDraft, parseNumericDraft } from './shared';

type ProbabilityRequest = Extract<StatisticsRequest, {
  kind: 'binomial' | 'normal' | 'poisson';
}>;

export type StatisticsProbabilityEvaluation = {
  exactLatex?: string;
  approxText?: string;
  detailSections?: DisplayDetailSection[];
  warnings: string[];
  error?: string;
  mathJsonLeaves?: StatisticsOwnedMathJsonLeaf[];
};

type ParsedEvent = {
  event: StatisticsProbabilityEvent;
  x?: number;
  lower?: number;
  upper?: number;
  lowerBound: 'inclusive' | 'exclusive';
  upperBound: 'inclusive' | 'exclusive';
};

function probabilityError(error: string): StatisticsProbabilityEvaluation {
  return { error, warnings: [] };
}

function legacyEvent(request: ProbabilityRequest): StatisticsProbabilityEvent | null {
  if (request.kind === 'normal') {
    if (request.mode === 'pdf') return 'density';
    if (request.mode === 'cdf') return 'atMost';
    return null;
  }
  if (request.mode === 'pmf') return 'exactly';
  if (request.mode === 'cdf') return 'atMost';
  return null;
}

function parseProbabilityEvent(request: ProbabilityRequest):
  | { ok: true; value: ParsedEvent }
  | { ok: false; error: string } {
  const event = request.event ?? legacyEvent(request);
  if (!event) {
    return { ok: false, error: 'Choose a probability event before evaluating.' };
  }
  if (event === 'density' && request.kind !== 'normal') {
    return { ok: false, error: 'Density at x is available only for the Normal distribution.' };
  }

  const discrete = request.kind !== 'normal';
  const lowerBound = request.lowerBound ?? 'inclusive';
  const upperBound = request.upperBound ?? 'inclusive';
  if (event === 'between') {
    const lower = discrete
      ? parseIntegerDraft(request.lower ?? '')
      : parseNumericDraft(request.lower ?? '');
    const upper = discrete
      ? parseIntegerDraft(request.upper ?? '')
      : parseNumericDraft(request.upper ?? '');
    if (lower === null || upper === null) {
      return {
        ok: false,
        error: discrete
          ? 'Between endpoints must both be integers for a discrete distribution.'
          : 'Between endpoints must both be finite numeric values.',
      };
    }
    if (lower > upper) {
      return { ok: false, error: 'The lower endpoint must not be greater than the upper endpoint.' };
    }
    return {
      ok: true,
      value: { event, lower, upper, lowerBound, upperBound },
    };
  }

  const x = discrete
    ? parseIntegerDraft(request.x ?? '')
    : parseNumericDraft(request.x ?? '');
  if (x === null) {
    return {
      ok: false,
      error: discrete
        ? 'The event value x must be an integer for a discrete distribution.'
        : 'The event value x must be a finite numeric value.',
    };
  }
  return {
    ok: true,
    value: { event, x, lowerBound, upperBound },
  };
}

function eventLatex(event: ParsedEvent) {
  const x = numberToLatex(event.x ?? 0);
  switch (event.event) {
    case 'exactly':
      return `X=${x}`;
    case 'density':
      return `x=${x}`;
    case 'lessThan':
      return `X<${x}`;
    case 'atMost':
      return `X\\le ${x}`;
    case 'moreThan':
      return `X>${x}`;
    case 'atLeast':
      return `X\\ge ${x}`;
    case 'between': {
      const lowerSymbol = event.lowerBound === 'inclusive' ? '\\le' : '<';
      const upperSymbol = event.upperBound === 'inclusive' ? '\\le' : '<';
      return `${numberToLatex(event.lower ?? 0)}${lowerSymbol}X${upperSymbol}${numberToLatex(event.upper ?? 0)}`;
    }
  }
}

function eventMathJson(event: ParsedEvent): unknown {
  const x = event.x ?? 0;
  switch (event.event) {
    case 'exactly':
      return ['Equal', 'X', x];
    case 'density':
      return ['Equal', 'x', x];
    case 'lessThan':
      return ['Less', 'X', x];
    case 'atMost':
      return ['LessEqual', 'X', x];
    case 'moreThan':
      return ['Greater', 'X', x];
    case 'atLeast':
      return ['GreaterEqual', 'X', x];
    case 'between':
      return [
        event.upperBound === 'inclusive' ? 'LessEqual' : 'Less',
        [event.lowerBound === 'inclusive' ? 'LessEqual' : 'Less', event.lower ?? 0, 'X'],
        event.upper ?? 0,
      ];
  }
}

function distributionParameters(request: ProbabilityRequest) {
  if (request.kind === 'binomial') {
    const n = parseIntegerDraft(request.n);
    const p = parseNumericDraft(request.p);
    if (n === null || n < 0) {
      return { ok: false as const, error: 'Binomial n must be a non-negative integer.' };
    }
    if (p === null || p < 0 || p > 1) {
      return { ok: false as const, error: 'Binomial p must be between 0 and 1.' };
    }
    return { ok: true as const, value: { kind: 'binomial' as const, n, p } };
  }

  if (request.kind === 'poisson') {
    const lambda = parseNumericDraft(request.lambda);
    if (lambda === null || lambda <= 0) {
      return { ok: false as const, error: 'Poisson lambda must be greater than zero.' };
    }
    return { ok: true as const, value: { kind: 'poisson' as const, lambda } };
  }

  const mean = parseNumericDraft(request.mean);
  const standardDeviation = parseNumericDraft(request.standardDeviation);
  if (mean === null) {
    return { ok: false as const, error: 'Normal mean must be a finite numeric value.' };
  }
  if (standardDeviation === null || standardDeviation <= 0) {
    return { ok: false as const, error: 'Normal standard deviation must be greater than zero.' };
  }
  return {
    ok: true as const,
    value: { kind: 'normal' as const, mean, standardDeviation },
  };
}

export function probabilityOutcome(request: ProbabilityRequest): StatisticsProbabilityEvaluation {
  const parameters = distributionParameters(request);
  if (!parameters.ok) return probabilityError(parameters.error);
  const parsedEvent = parseProbabilityEvent(request);
  if (!parsedEvent.ok) return probabilityError(parsedEvent.error);

  const result = evaluateStatisticsDistribution(parameters.value, parsedEvent.value);
  if (!Number.isFinite(result.value)) {
    return probabilityError('The selected probability request could not be evaluated.');
  }
  const notation = eventLatex(parsedEvent.value);
  const valueSymbol = result.valueKind === 'density' ? 'd' : 'p';
  const exactLatex = [
    notation,
    `${valueSymbol}=${numberToLatex(result.value)}`,
    `\\operatorname{mean}(X)=${numberToLatex(result.expectedValue)}`,
    `\\sigma=${numberToLatex(result.standardDeviation)}`,
  ].join(',\\ ');
  const summary = result.valueKind === 'density'
    ? `Density=${formatStatisticsNumber(result.value)}`
    : `Probability=${formatStatisticsNumber(result.value)} (${formatStatisticsNumber(result.value * 100)}%)`;

  return profileStatisticsResult({
    exactLatex,
    approxText: summary,
    detailSections: [
      {
        title: result.valueKind === 'density' ? 'Density' : 'Probability',
        lines: result.valueKind === 'density'
          ? [
              `Density at x: ${formatStatisticsNumber(result.value)}.`,
              result.explanation ?? 'Density is not a point probability.',
            ]
          : [
              `Decimal: ${formatStatisticsNumber(result.value)}.`,
              `Percent: ${formatStatisticsNumber(result.value * 100)}%.`,
              ...(result.explanation ? [result.explanation] : []),
            ],
        lineKind: 'text',
      },
      {
        title: 'Distribution facts',
        lines: [
          `Expected value: ${formatStatisticsNumber(result.expectedValue)}.`,
          `Standard deviation: ${formatStatisticsNumber(result.standardDeviation)}.`,
        ],
        lineKind: 'text',
      },
    ],
    warnings: [],
    mathJsonLeaves: probabilityValueMathJsonLeaves({
      canonicalLatex: exactLatex,
      eventMathJson: eventMathJson(parsedEvent.value),
      value: result.value,
      valueSymbol,
      expectedValue: result.expectedValue,
      standardDeviation: result.standardDeviation,
      source: `statistics.probability.native-${request.kind}-event`,
    }),
  });
}
