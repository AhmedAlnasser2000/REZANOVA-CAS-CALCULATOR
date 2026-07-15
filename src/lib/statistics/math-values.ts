import type { MeanTestAlternative, StatisticsRequest } from '../../types/calculator';
import {
  requireProvenCanonicalMathValueV2,
  type CanonicalResultV2MathResolver,
} from '../result-contract';
import type { MathJsonRouteId } from '../result-contract/mathjson-route-registry';
import { roundedApproxNumberValue } from '../display/notation/numeric-output';
import type { MeanInferenceSummary } from './inference';
import type { DescriptiveStatisticsSummary } from './descriptive';
import type { RegressionDiagnostics, RegressionFitSummary } from './quality-readback';
import { formatStatisticsNumber } from './shared';

export type StatisticsMathJsonRouteId = Extract<MathJsonRouteId, `statistics.${string}`>;

export type StatisticsOwnedMathJsonLeaf = {
  canonicalLatex: string;
  mathJson: unknown;
  source: string;
};

export function statisticsMathNumber(value: number) {
  if (!Number.isFinite(value)) return undefined;
  const normalized = Math.abs(value) < 1e-10 ? 0 : value;
  return Number(normalized.toFixed(6));
}

function finiteMathNumber(value: number, label: string) {
  const normalized = statisticsMathNumber(value);
  if (normalized === undefined) {
    throw new Error(`Statistics cannot build finite MathJSON for ${label}.`);
  }
  return normalized;
}

function primaryMathJsonLeaf(canonicalLatex: string, mathJson: unknown, source: string) {
  return [{ canonicalLatex, mathJson, source } satisfies StatisticsOwnedMathJsonLeaf];
}

export function statisticsMathSequence(...values: unknown[]) {
  return ['Delimiter', ['Sequence', ...values], "','"];
}

export function datasetMathJsonLeaves(canonicalLatex: string, values: readonly number[]) {
  return primaryMathJsonLeaf(
    canonicalLatex,
    statisticsMathSequence(
      ['Equal', 'n', values.length],
      ['List', ...values.map((value, index) => finiteMathNumber(value, `dataset[${index}]`))],
    ),
    'statistics.descriptive.native-dataset',
  );
}

export function descriptiveSummaryMathJsonLeaves(
  canonicalLatex: string,
  summary: DescriptiveStatisticsSummary,
) {
  const relations: unknown[] = [
    ['Equal', 'n', summary.count],
    ['Equal', ['Reduce', 'x', 'Add'], statisticsMathNumber(summary.sum)],
    ['Equal', ['Mean', 'x'], statisticsMathNumber(summary.mean)],
    ['Equal', 'Median', statisticsMathNumber(summary.median)],
    ['Equal', 'Min', statisticsMathNumber(summary.min)],
    ['Equal', ['Subscript', 'Q', 1], statisticsMathNumber(summary.q1)],
    ['Equal', ['Subscript', 'Q', 3], statisticsMathNumber(summary.q3)],
    ['Equal', 'Max', statisticsMathNumber(summary.max)],
    ['Equal', 'range', statisticsMathNumber(summary.range)],
    ['Equal', 'IQR', statisticsMathNumber(summary.iqr)],
    ['Equal', ['Subscript', 'F', 'L'], statisticsMathNumber(summary.lowerFence)],
    ['Equal', ['Subscript', 'F', 'U'], statisticsMathNumber(summary.upperFence)],
    ['Equal', ['Power', 'sigma', 2], statisticsMathNumber(summary.populationVariance)],
    ['Equal', 'sigma', statisticsMathNumber(summary.populationStandardDeviation)],
  ];
  if (summary.sampleVariance !== null) {
    relations.push(['Equal', ['Power', 's', 2], statisticsMathNumber(summary.sampleVariance)]);
  }
  if (summary.sampleStandardDeviation !== null) {
    relations.push(['Equal', 's', statisticsMathNumber(summary.sampleStandardDeviation)]);
  }
  if (summary.modes.length === 1) {
    relations.push(['Equal', 'mode', statisticsMathNumber(summary.modes[0])]);
  } else if (summary.modes.length > 1) {
    relations.push([
      'Equal',
      'modes',
      ['Set', ...summary.modes.map((value) => statisticsMathNumber(value))],
    ]);
  }
  if (summary.potentialOutliers.length > 0) {
    relations.push([
      'Equal',
      'outliers',
      ['Set', ...summary.potentialOutliers.map((value) => statisticsMathNumber(value))],
    ]);
  }
  return primaryMathJsonLeaf(
    canonicalLatex,
    statisticsMathSequence(...relations),
    'statistics.descriptive.native-summary',
  );
}

export function frequencySummaryMathJsonLeaves(input: {
  canonicalLatex: string;
  rows: readonly { value: number; frequency: number }[];
  totalCount: number;
  modeValue?: number;
}) {
  const relations: unknown[] = [
    ['Equal', 'n', input.totalCount],
    ['Set', ...input.rows.map((row, index) => [
      'Tuple',
      finiteMathNumber(row.value, `frequency[${index}].value`),
      row.frequency,
    ])],
  ];
  if (input.modeValue !== undefined) {
    relations.push(['Equal', 'mode', statisticsMathNumber(input.modeValue)]);
  }
  return primaryMathJsonLeaf(
    input.canonicalLatex,
    statisticsMathSequence(...relations),
    'statistics.frequency.native-frequency-rows',
  );
}

export function confidenceIntervalMathJsonLeaves(input: {
  canonicalLatex: string;
  summary: MeanInferenceSummary;
  result: {
    criticalValue: number;
    standardError: number;
    marginOfError: number;
    lowerBound: number;
    upperBound: number;
  };
}) {
  if (input.summary.sampleStandardDeviation === null) return [];
  return primaryMathJsonLeaf(
    input.canonicalLatex,
    statisticsMathSequence(
      ['Equal', ['Mean', 'x'], statisticsMathNumber(input.summary.mean)],
      ['Equal', 's', statisticsMathNumber(input.summary.sampleStandardDeviation)],
      ['Equal', 'n', input.summary.count],
      ['Equal', ['InvisibleOperator', 'S', 'E'], statisticsMathNumber(input.result.standardError)],
      ['Equal', 'df', input.summary.count - 1],
      ['Equal', ['Subscript', 't', 'critical'], statisticsMathNumber(input.result.criticalValue)],
      ['Equal', ['InvisibleOperator', 'M', 'E'], statisticsMathNumber(input.result.marginOfError)],
      ['LessEqual',
        ['Equal', ['InvisibleOperator', 'C', 'I'], statisticsMathNumber(input.result.lowerBound)],
        'mu',
        statisticsMathNumber(input.result.upperBound),
      ],
    ),
    'statistics.inference.native-confidence-interval',
  );
}

export function meanTestMathJsonLeaves(input: {
  canonicalLatex: string;
  summary: MeanInferenceSummary;
  mu0: number;
  tStatistic: number;
  pValue: number;
  alpha: number;
  standardError: number;
  alternative: MeanTestAlternative;
}) {
  if (input.summary.sampleStandardDeviation === null) return [];
  const tValue = Number.isFinite(input.tStatistic)
    ? statisticsMathNumber(input.tStatistic)
    : input.tStatistic < 0 ? 'NegativeInfinity' : 'PositiveInfinity';
  const alternativeRelation = input.alternative === 'twoSided'
    ? ['NotEqual', 'mu', statisticsMathNumber(input.mu0)]
    : input.alternative === 'less'
      ? ['Less', 'mu', statisticsMathNumber(input.mu0)]
      : ['Greater', 'mu', statisticsMathNumber(input.mu0)];
  return primaryMathJsonLeaf(
    input.canonicalLatex,
    statisticsMathSequence(
      ['Equal', ['Subscript', 'H', 0], ['Equal', 'mu', statisticsMathNumber(input.mu0)]],
      ['Equal', ['Subscript', 'H', 'a'], alternativeRelation],
      ['Equal', ['Mean', 'x'], statisticsMathNumber(input.summary.mean)],
      ['Equal', 's', statisticsMathNumber(input.summary.sampleStandardDeviation)],
      ['Equal', ['InvisibleOperator', 'S', 'E'], statisticsMathNumber(input.standardError)],
      ['Equal', 'df', input.summary.count - 1],
      ['Equal', 't', tValue],
      ['Equal', 'p', statisticsMathNumber(input.pValue)],
      ['Equal', 'alpha', statisticsMathNumber(input.alpha)],
    ),
    'statistics.inference.native-mean-test',
  );
}

export function probabilityValueMathJsonLeaves(input: {
  canonicalLatex: string;
  eventMathJson: unknown;
  value: number;
  valueSymbol: 'p' | 'd';
  expectedValue: number;
  standardDeviation: number;
  source: string;
}) {
  return primaryMathJsonLeaf(
    input.canonicalLatex,
    statisticsMathSequence(
      input.eventMathJson,
      ['Equal', input.valueSymbol, statisticsMathNumber(input.value)],
      ['Equal', ['Mean', 'X'], statisticsMathNumber(input.expectedValue)],
      ['Equal', 'sigma', statisticsMathNumber(input.standardDeviation)],
    ),
    input.source,
  );
}

export function regressionMathJsonLeaves(
  canonicalLatex: string,
  summary: RegressionFitSummary,
  diagnostics: RegressionDiagnostics,
) {
  const details = [diagnostics.sse, diagnostics.mse, diagnostics.residualStandardError]
    .flatMap((value): StatisticsOwnedMathJsonLeaf[] => {
      if (value === null) return [];
      const detailLatex = formatStatisticsNumber(value);
      const mathJson = roundedApproxNumberValue(value);
      return mathJson === undefined
        ? []
        : [{
            canonicalLatex: detailLatex,
            mathJson,
            source: 'statistics.relationship.native-regression-diagnostics',
          }];
    });
  return [
    ...primaryMathJsonLeaf(
      canonicalLatex,
      statisticsMathSequence(
        ['Equal', ['Subscript', 'y', 'fit'], ['Add', ['InvisibleOperator', statisticsMathNumber(summary.slope), 'x'], statisticsMathNumber(summary.intercept)]],
        ['Equal', 'm', statisticsMathNumber(summary.slope)],
        ['Equal', 'b', statisticsMathNumber(summary.intercept)],
        ['Equal', 'r', statisticsMathNumber(summary.r)],
        ['Equal', ['Power', 'r', 2], statisticsMathNumber(summary.rSquared)],
        ['Equal', 'n', summary.count],
      ),
      'statistics.relationship.native-regression-summary',
    ),
    ...details,
  ];
}

export function correlationMathJsonLeaves(
  canonicalLatex: string,
  summary: RegressionFitSummary,
) {
  return primaryMathJsonLeaf(
    canonicalLatex,
    statisticsMathSequence(
      ['Equal', 'r', statisticsMathNumber(summary.r)],
      ['Equal', ['Power', 'r', 2], statisticsMathNumber(summary.rSquared)],
      ['Equal', 'n', summary.count],
    ),
    'statistics.relationship.native-correlation-summary',
  );
}

export function statisticsV2MathResolverFromOwnedLeaves(input: {
  routeId: StatisticsMathJsonRouteId;
  leaves: readonly StatisticsOwnedMathJsonLeaf[];
}): CanonicalResultV2MathResolver {
  return (canonicalLatex, path) => {
    const leaf = input.leaves.find((candidate) => candidate.canonicalLatex === canonicalLatex);
    if (!leaf) {
      throw new Error(`Statistics selected Canonical Result V2 without producer MathJSON for ${path}.`);
    }
    return requireProvenCanonicalMathValueV2({
      canonicalLatex,
      mathJson: leaf.mathJson,
      owner: 'statistics',
      routeId: input.routeId,
      source: `${leaf.source}:${path}`,
    });
  };
}

export function statisticsMathJsonRouteForRequest(
  request: StatisticsRequest,
): StatisticsMathJsonRouteId {
  if (request.kind === 'descriptive' || request.kind === 'dataset') {
    return 'statistics.descriptive';
  }
  if (request.kind === 'frequency') return 'statistics.frequency';
  if (request.kind === 'meanInference') return 'statistics.inference';
  if (request.kind === 'regression' || request.kind === 'correlation') {
    return 'statistics.relationship';
  }
  return 'statistics.probability';
}
