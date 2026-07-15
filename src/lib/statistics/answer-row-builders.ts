import { buildStatisticsAnswerRows } from './answer-rows';
import { statisticsNumberToLatex } from './shared';
import type { DescriptiveStatisticsSummary } from './descriptive';
import type {
  MeanConfidenceIntervalResult,
  MeanHypothesisTestResult,
  MeanInferenceSummary,
} from './inference';
import {
  statisticsMathNumber,
  statisticsMathSequence,
} from './math-values';
import type {
  RegressionFitSummary,
} from './quality-readback';

type FrequencyAnswerRow = {
  value: number;
  frequency: number;
};

export function descriptiveAnswerReadback(summary: DescriptiveStatisticsSummary) {
  return buildStatisticsAnswerRows([
    {
      label: 'Size and total',
      latex: `n=${summary.count},\\ \\sum x=${statisticsNumberToLatex(summary.sum)}`,
      mathJson: statisticsMathSequence(
        ['Equal', 'n', summary.count],
        ['Equal', ['Reduce', 'x', 'Add'], statisticsMathNumber(summary.sum)],
      ),
    },
    {
      label: 'Center',
      latex: `\\bar{x}=${statisticsNumberToLatex(summary.mean)},\\ \\operatorname{median}=${statisticsNumberToLatex(summary.median)}`,
      mathJson: statisticsMathSequence(
        ['Equal', ['Mean', 'x'], statisticsMathNumber(summary.mean)],
        ['Equal', 'Median', statisticsMathNumber(summary.median)],
      ),
    },
    {
      label: 'Five-number summary',
      latex: `\\min=${statisticsNumberToLatex(summary.min)},\\ Q_1=${statisticsNumberToLatex(summary.q1)},\\ \\operatorname{median}=${statisticsNumberToLatex(summary.median)},\\ Q_3=${statisticsNumberToLatex(summary.q3)},\\ \\max=${statisticsNumberToLatex(summary.max)}`,
      mathJson: statisticsMathSequence(
        ['Equal', 'Min', statisticsMathNumber(summary.min)],
        ['Equal', ['Subscript', 'Q', 1], statisticsMathNumber(summary.q1)],
        ['Equal', 'Median', statisticsMathNumber(summary.median)],
        ['Equal', ['Subscript', 'Q', 3], statisticsMathNumber(summary.q3)],
        ['Equal', 'Max', statisticsMathNumber(summary.max)],
      ),
    },
    {
      label: 'Range and fences',
      latex: `\\operatorname{range}=${statisticsNumberToLatex(summary.range)},\\ \\operatorname{IQR}=${statisticsNumberToLatex(summary.iqr)},\\ F_L=${statisticsNumberToLatex(summary.lowerFence)},\\ F_U=${statisticsNumberToLatex(summary.upperFence)}`,
      mathJson: statisticsMathSequence(
        ['Equal', 'range', statisticsMathNumber(summary.range)],
        ['Equal', 'IQR', statisticsMathNumber(summary.iqr)],
        ['Equal', ['Subscript', 'F', 'L'], statisticsMathNumber(summary.lowerFence)],
        ['Equal', ['Subscript', 'F', 'U'], statisticsMathNumber(summary.upperFence)],
      ),
    },
    {
      label: 'Population spread',
      latex: `\\sigma^2=${statisticsNumberToLatex(summary.populationVariance)},\\ \\sigma=${statisticsNumberToLatex(summary.populationStandardDeviation)}`,
      mathJson: statisticsMathSequence(
        ['Equal', ['Power', 'sigma', 2], statisticsMathNumber(summary.populationVariance)],
        ['Equal', 'sigma', statisticsMathNumber(summary.populationStandardDeviation)],
      ),
    },
    ...(summary.sampleVariance === null || summary.sampleStandardDeviation === null
      ? []
      : [{
          label: 'Sample spread',
          latex: `s^2=${statisticsNumberToLatex(summary.sampleVariance)},\\ s=${statisticsNumberToLatex(summary.sampleStandardDeviation)}`,
          mathJson: statisticsMathSequence(
            ['Equal', ['Power', 's', 2], statisticsMathNumber(summary.sampleVariance)],
            ['Equal', 's', statisticsMathNumber(summary.sampleStandardDeviation)],
          ),
        }]),
    ...(summary.modes.length === 0
      ? []
      : [{
          label: summary.modes.length === 1 ? 'Mode' : 'Modes',
          latex: summary.modes.length === 1
            ? `\\operatorname{mode}=${statisticsNumberToLatex(summary.modes[0])}`
            : `\\operatorname{modes}=\\left\\{${summary.modes.map(statisticsNumberToLatex).join(',\\ ')}\\right\\}`,
          mathJson: ['Equal', summary.modes.length === 1 ? 'mode' : 'modes', summary.modes.length === 1
            ? statisticsMathNumber(summary.modes[0])
            : ['Set', ...summary.modes.map(statisticsMathNumber)]],
        }]),
    ...(summary.potentialOutliers.length === 0
      ? []
      : [{
          label: 'Potential outliers',
          latex: `\\operatorname{outliers}=\\left\\{${summary.potentialOutliers.map(statisticsNumberToLatex).join(',\\ ')}\\right\\}`,
          mathJson: ['Equal', 'outliers', ['Set', ...summary.potentialOutliers.map(statisticsMathNumber)]],
        }]),
  ], 'statistics.descriptive.native-summary');
}

export function datasetAnswerReadback(values: readonly number[]) {
  return buildStatisticsAnswerRows([
    { label: 'Count', latex: `n=${values.length}`, mathJson: ['Equal', 'n', values.length] },
    {
      label: 'Values',
      latex: `\\left[${values.map(statisticsNumberToLatex).join(',\\ ')}\\right]`,
      mathJson: ['List', ...values.map(statisticsMathNumber)],
    },
  ], 'statistics.descriptive.native-dataset');
}

export function frequencyAnswerReadback(input: {
  rows: readonly FrequencyAnswerRow[];
  totalCount: number;
  modeValue?: number;
}) {
  return buildStatisticsAnswerRows([
    { label: 'Count', latex: `n=${input.totalCount}`, mathJson: ['Equal', 'n', input.totalCount] },
    {
      label: 'Frequency table',
      latex: `\\left\\{${input.rows.map((row) => `(${statisticsNumberToLatex(row.value)},${row.frequency})`).join(',\\ ')}\\right\\}`,
      mathJson: ['Set', ...input.rows.map((row) => [
        'Tuple',
        statisticsMathNumber(row.value),
        row.frequency,
      ])],
    },
    ...(input.modeValue === undefined
      ? []
      : [{
          label: 'Mode',
          latex: `\\operatorname{mode}=${statisticsNumberToLatex(input.modeValue)}`,
          mathJson: ['Equal', 'mode', statisticsMathNumber(input.modeValue)],
        }]),
  ], 'statistics.frequency.native-frequency-rows');
}

export function confidenceIntervalAnswerReadback(input: {
  summary: MeanInferenceSummary;
  result: MeanConfidenceIntervalResult;
}) {
  const sampleStandardDeviation = input.summary.sampleStandardDeviation ?? 0;
  return buildStatisticsAnswerRows([
    {
      label: 'Sample',
      latex: `\\bar{x}=${statisticsNumberToLatex(input.summary.mean)},\\ s=${statisticsNumberToLatex(sampleStandardDeviation)},\\ n=${input.summary.count}`,
      mathJson: statisticsMathSequence(
        ['Equal', ['Mean', 'x'], statisticsMathNumber(input.summary.mean)],
        ['Equal', 's', statisticsMathNumber(sampleStandardDeviation)],
        ['Equal', 'n', input.summary.count],
      ),
    },
    {
      label: 'Precision',
      latex: `SE=${statisticsNumberToLatex(input.result.standardError)},\\ df=${input.summary.count - 1},\\ t_{\\mathrm{critical}}=${statisticsNumberToLatex(input.result.criticalValue)},\\ ME=${statisticsNumberToLatex(input.result.marginOfError)}`,
      mathJson: statisticsMathSequence(
        ['Equal', ['InvisibleOperator', 'S', 'E'], statisticsMathNumber(input.result.standardError)],
        ['Equal', 'df', input.summary.count - 1],
        ['Equal', ['Subscript', 't', 'critical'], statisticsMathNumber(input.result.criticalValue)],
        ['Equal', ['InvisibleOperator', 'M', 'E'], statisticsMathNumber(input.result.marginOfError)],
      ),
    },
    {
      label: 'Confidence interval',
      latex: `${statisticsNumberToLatex(input.result.lowerBound)}\\le\\mu\\le${statisticsNumberToLatex(input.result.upperBound)}`,
      mathJson: ['LessEqual', statisticsMathNumber(input.result.lowerBound), 'mu', statisticsMathNumber(input.result.upperBound)],
    },
  ], 'statistics.inference.native-confidence-interval');
}

export function meanTestAnswerReadback(input: {
  summary: MeanInferenceSummary;
  mu0: number;
  result: MeanHypothesisTestResult;
  alternativeSymbol: string;
}) {
  const sampleStandardDeviation = input.summary.sampleStandardDeviation ?? 0;
  const tLatex = Number.isFinite(input.result.tStatistic)
    ? statisticsNumberToLatex(input.result.tStatistic)
    : input.result.tStatistic < 0 ? '-\\infty' : '\\infty';
  const tMathJson = Number.isFinite(input.result.tStatistic)
    ? statisticsMathNumber(input.result.tStatistic)
    : input.result.tStatistic < 0 ? 'NegativeInfinity' : 'PositiveInfinity';
  const alternativeRelation = input.result.alternative === 'twoSided'
    ? ['NotEqual', 'mu', statisticsMathNumber(input.mu0)]
    : input.result.alternative === 'less'
      ? ['Less', 'mu', statisticsMathNumber(input.mu0)]
      : ['Greater', 'mu', statisticsMathNumber(input.mu0)];
  return buildStatisticsAnswerRows([
    {
      label: 'Hypotheses',
      latex: `H_0=(\\mu=${statisticsNumberToLatex(input.mu0)}),\\ H_a=(\\mu${input.alternativeSymbol}${statisticsNumberToLatex(input.mu0)})`,
      mathJson: statisticsMathSequence(
        ['Equal', ['Subscript', 'H', 0], ['Equal', 'mu', statisticsMathNumber(input.mu0)]],
        ['Equal', ['Subscript', 'H', 'a'], alternativeRelation],
      ),
    },
    {
      label: 'Sample',
      latex: `\\bar{x}=${statisticsNumberToLatex(input.summary.mean)},\\ s=${statisticsNumberToLatex(sampleStandardDeviation)}`,
      mathJson: statisticsMathSequence(
        ['Equal', ['Mean', 'x'], statisticsMathNumber(input.summary.mean)],
        ['Equal', 's', statisticsMathNumber(sampleStandardDeviation)],
      ),
    },
    {
      label: 'Test setup',
      latex: `SE=${statisticsNumberToLatex(input.result.standardError)},\\ df=${input.summary.count - 1}`,
      mathJson: statisticsMathSequence(
        ['Equal', ['InvisibleOperator', 'S', 'E'], statisticsMathNumber(input.result.standardError)],
        ['Equal', 'df', input.summary.count - 1],
      ),
    },
    {
      label: 'Evidence',
      latex: `t=${tLatex},\\ p=${statisticsNumberToLatex(input.result.pValue)},\\ \\alpha=${statisticsNumberToLatex(input.result.alpha)}`,
      mathJson: statisticsMathSequence(
        ['Equal', 't', tMathJson],
        ['Equal', 'p', statisticsMathNumber(input.result.pValue)],
        ['Equal', 'alpha', statisticsMathNumber(input.result.alpha)],
      ),
    },
  ], 'statistics.inference.native-mean-test');
}

export function regressionAnswerReadback(summary: RegressionFitSummary) {
  const fittedLatex = `y_{\\mathrm{fit}}=${statisticsNumberToLatex(summary.slope)}x${summary.intercept < 0 ? '' : '+'}${statisticsNumberToLatex(summary.intercept)}`;
  return buildStatisticsAnswerRows([
    {
      label: 'Fitted line',
      latex: fittedLatex,
      mathJson: ['Equal', ['Subscript', 'y', 'fit'], ['Add',
        ['InvisibleOperator', statisticsMathNumber(summary.slope), 'x'],
        statisticsMathNumber(summary.intercept),
      ]],
    },
    {
      label: 'Coefficients',
      latex: `m=${statisticsNumberToLatex(summary.slope)},\\ b=${statisticsNumberToLatex(summary.intercept)}`,
      mathJson: statisticsMathSequence(
        ['Equal', 'm', statisticsMathNumber(summary.slope)],
        ['Equal', 'b', statisticsMathNumber(summary.intercept)],
      ),
    },
    {
      label: 'Fit',
      latex: `r=${statisticsNumberToLatex(summary.r)},\\ r^2=${statisticsNumberToLatex(summary.rSquared)},\\ n=${summary.count}`,
      mathJson: statisticsMathSequence(
        ['Equal', 'r', statisticsMathNumber(summary.r)],
        ['Equal', ['Power', 'r', 2], statisticsMathNumber(summary.rSquared)],
        ['Equal', 'n', summary.count],
      ),
    },
  ], 'statistics.relationship.native-regression-summary');
}

export function correlationAnswerReadback(summary: RegressionFitSummary) {
  return buildStatisticsAnswerRows([
    {
      label: 'Association',
      latex: `r=${statisticsNumberToLatex(summary.r)},\\ r^2=${statisticsNumberToLatex(summary.rSquared)}`,
      mathJson: statisticsMathSequence(
        ['Equal', 'r', statisticsMathNumber(summary.r)],
        ['Equal', ['Power', 'r', 2], statisticsMathNumber(summary.rSquared)],
      ),
    },
    { label: 'Sample', latex: `n=${summary.count}`, mathJson: ['Equal', 'n', summary.count] },
  ], 'statistics.relationship.native-correlation-summary');
}

export function probabilityAnswerReadback(input: {
  notation: string;
  eventMathJson: unknown;
  value: number;
  valueSymbol: 'p' | 'd';
  expectedValue: number;
  standardDeviation: number;
  source: string;
}) {
  return buildStatisticsAnswerRows([
    { label: 'Event', latex: input.notation, mathJson: input.eventMathJson },
    {
      label: input.valueSymbol === 'd' ? 'Density' : 'Probability',
      latex: `${input.valueSymbol}=${statisticsNumberToLatex(input.value)}`,
      mathJson: ['Equal', input.valueSymbol, statisticsMathNumber(input.value)],
    },
    {
      label: 'Distribution',
      latex: `\\operatorname{mean}(X)=${statisticsNumberToLatex(input.expectedValue)},\\ \\sigma=${statisticsNumberToLatex(input.standardDeviation)}`,
      mathJson: statisticsMathSequence(
        ['Equal', ['Mean', 'X'], statisticsMathNumber(input.expectedValue)],
        ['Equal', 'sigma', statisticsMathNumber(input.standardDeviation)],
      ),
    },
  ], input.source);
}
