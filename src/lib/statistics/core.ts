import type {
  DisplayDetailSection,
  ResultProducerDraft,
  FrequencyRow,
  RegressionPoint,
  StatisticsParseResult,
  StatisticsRequest,
  StatisticsScreen,
  StatisticsWorkingSource,
} from '../../types/calculator';
import { numberToLatex } from '../display/format';
import {
  computeMeanConfidenceInterval,
  computeMeanHypothesisTest,
  parseInferenceLevel,
  type MeanInferenceSummary,
} from './inference';
import { parseStatisticsDraft } from './parser';
import {
  correlationQualitySection,
  correlationStrength,
  regressionQualitySection,
  type RegressionDiagnostics,
  type RegressionFitSummary,
} from './quality-readback';
import { formatStatisticsNumber, parseIntegerDraft, parseNumericDraft } from './shared';
import { profileStatisticsResult } from '../display/printer';
import {
  descriptiveStatisticsFromFrequencyRows,
  descriptiveStatisticsFromValues,
  type DescriptiveStatisticsSummary,
} from './descriptive';
import { probabilityOutcome } from './probability';
import {
  correlationMathJsonLeaves,
  confidenceIntervalMathJsonLeaves,
  datasetMathJsonLeaves,
  descriptiveSummaryMathJsonLeaves,
  frequencySummaryMathJsonLeaves,
  meanTestMathJsonLeaves,
  regressionMathJsonLeaves,
  type StatisticsOwnedMathJsonLeaf,
} from './math-values';

const ownedMathJsonByOutcome = new WeakMap<object, readonly StatisticsOwnedMathJsonLeaf[]>();

type NumericFrequencyRow = {
  value: number;
  frequency: number;
};

type NumericPoint = {
  x: number;
  y: number;
};

type StatisticsEvaluation = {
  exactLatex?: string;
  approxText?: string;
  detailSections?: DisplayDetailSection[];
  warnings: string[];
  error?: string;
  mathJsonLeaves?: StatisticsOwnedMathJsonLeaf[];
};

function statisticsError(error: string): StatisticsEvaluation {
  return {
    error,
    warnings: [],
  };
}

function toOutcome(title: string, evaluation: StatisticsEvaluation): ResultProducerDraft {
  let outcome: ResultProducerDraft;
  if (evaluation.error) {
    outcome = {
      kind: 'error',
      title,
      error: evaluation.error,
      warnings: evaluation.warnings,
      exactLatex: evaluation.exactLatex,
      approxText: evaluation.approxText,
      detailSections: evaluation.detailSections,
    };
  } else {
    outcome = {
      kind: 'success',
      title,
      exactLatex: evaluation.exactLatex,
      approxText: evaluation.approxText,
      detailSections: evaluation.detailSections,
      warnings: evaluation.warnings,
    };
  }
  if (evaluation.mathJsonLeaves?.length) {
    ownedMathJsonByOutcome.set(outcome, evaluation.mathJsonLeaves);
  }
  return outcome;
}

function requestTitle(request: StatisticsRequest) {
  switch (request.kind) {
    case 'dataset':
      return 'Data Entry';
    case 'descriptive':
      return 'Descriptive';
    case 'frequency':
      return 'Frequency';
    case 'meanInference':
      return 'Mean Inference';
    case 'binomial':
      return 'Binomial';
    case 'normal':
      return 'Normal';
    case 'poisson':
      return 'Poisson';
    case 'regression':
      return 'Regression';
    case 'correlation':
      return 'Correlation';
  }
}

function parseDatasetValues(values: string[]) {
  const numericValues: number[] = [];

  for (const rawValue of values) {
    const parsed = parseNumericDraft(rawValue);
    if (parsed === null) {
      return {
        ok: false as const,
        error: `Dataset value "${rawValue.trim() || '?'}" is not a finite numeric value.`,
      };
    }
    numericValues.push(parsed);
  }

  if (numericValues.length === 0) {
    return {
      ok: false as const,
      error: 'Enter at least one numeric value before evaluating this Statistics request.',
    };
  }

  return {
    ok: true as const,
    values: numericValues,
  };
}

function parseFrequencyRows(rows: FrequencyRow[]) {
  const numericRows: NumericFrequencyRow[] = [];
  const seenValues = new Set<number>();

  for (const row of rows) {
    const value = row.value.trim();
    const frequency = row.frequency.trim();

    if (!value && !frequency) {
      continue;
    }

    if (!value || !frequency) {
      return {
        ok: false as const,
        error: 'Each frequency row needs both a value and a frequency.',
      };
    }

    const parsedValue = parseNumericDraft(value);
    if (parsedValue === null) {
      return {
        ok: false as const,
        error: `Frequency value "${value}" is not a finite numeric value.`,
      };
    }

    const parsedFrequency = parseIntegerDraft(frequency);
    if (parsedFrequency === null || parsedFrequency < 0) {
      return {
        ok: false as const,
        error: `Frequency "${frequency}" must be a non-negative integer.`,
      };
    }

    if (parsedFrequency === 0) {
      continue;
    }

    if (seenValues.has(parsedValue)) {
      return {
        ok: false as const,
        error: `Frequency value "${value}" is duplicated. Merge repeated values into one row before evaluating.`,
      };
    }

    numericRows.push({
      value: parsedValue,
      frequency: parsedFrequency,
    });
    seenValues.add(parsedValue);
  }

  if (numericRows.length === 0) {
    return {
      ok: false as const,
      error: 'Enter at least one value-frequency row before evaluating this Statistics request.',
    };
  }

  return {
    ok: true as const,
    rows: numericRows.sort((left, right) => left.value - right.value),
  };
}

function parsePoints(points: RegressionPoint[]) {
  const numericPoints: NumericPoint[] = [];

  for (const point of points) {
    const x = point.x.trim();
    const y = point.y.trim();

    if (!x && !y) {
      continue;
    }

    if (!x || !y) {
      return {
        ok: false as const,
        error: 'Each point needs both x and y values.',
      };
    }

    const parsedX = parseNumericDraft(x);
    const parsedY = parseNumericDraft(y);
    if (parsedX === null || parsedY === null) {
      return {
        ok: false as const,
        error: `Point (${x}, ${y}) must use finite numeric values.`,
      };
    }

    numericPoints.push({ x: parsedX, y: parsedY });
  }

  if (numericPoints.length < 2) {
    return {
      ok: false as const,
      error: 'Enter at least two valid points before evaluating this Statistics request.',
    };
  }

  return {
    ok: true as const,
    points: numericPoints,
  };
}

function medianFromSortedValues(sortedValues: number[]) {
  const middle = Math.floor(sortedValues.length / 2);
  return sortedValues.length % 2 === 0
    ? (sortedValues[middle - 1] + sortedValues[middle]) / 2
    : sortedValues[middle];
}

function weightedMedian(rows: NumericFrequencyRow[], totalCount: number) {
  const leftIndex = Math.floor((totalCount - 1) / 2);
  const rightIndex = Math.floor(totalCount / 2);
  let running = 0;
  let leftValue = rows[0]?.value ?? 0;
  let rightValue = rows[rows.length - 1]?.value ?? 0;

  for (const row of rows) {
    const next = running + row.frequency;
    if (leftIndex >= running && leftIndex < next) {
      leftValue = row.value;
    }
    if (rightIndex >= running && rightIndex < next) {
      rightValue = row.value;
      break;
    }
    running = next;
  }

  return (leftValue + rightValue) / 2;
}

function descriptiveRowsFromValues(values: number[]) {
  const sorted = [...values].sort((left, right) => left - right);
  const count = values.length;
  const sum = values.reduce((total, value) => total + value, 0);
  const mean = sum / count;
  const median = medianFromSortedValues(sorted);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const range = max - min;
  const variance = values.reduce((total, value) => total + ((value - mean) ** 2), 0) / count;
  const standardDeviation = Math.sqrt(variance);
  const sampleVariance = count > 1
    ? values.reduce((total, value) => total + ((value - mean) ** 2), 0) / (count - 1)
    : null;
  const sampleStandardDeviation = sampleVariance === null ? null : Math.sqrt(sampleVariance);

  return {
    count,
    sum,
    mean,
    median,
    min,
    max,
    range,
    variance,
    standardDeviation,
    sampleVariance,
    sampleStandardDeviation,
  };
}

function descriptiveRowsFromFrequency(rows: NumericFrequencyRow[]) {
  const count = rows.reduce((total, row) => total + row.frequency, 0);
  const sum = rows.reduce((total, row) => total + (row.value * row.frequency), 0);
  const mean = sum / count;
  const median = weightedMedian(rows, count);
  const min = rows[0].value;
  const max = rows[rows.length - 1].value;
  const range = max - min;
  const variance = rows.reduce(
    (total, row) => total + (row.frequency * ((row.value - mean) ** 2)),
    0,
  ) / count;
  const standardDeviation = Math.sqrt(variance);
  const sampleVariance = count > 1
    ? rows.reduce(
      (total, row) => total + (row.frequency * ((row.value - mean) ** 2)),
      0,
    ) / (count - 1)
    : null;
  const sampleStandardDeviation = sampleVariance === null ? null : Math.sqrt(sampleVariance);

  return {
    count,
    sum,
    mean,
    median,
    min,
    max,
    range,
    variance,
    standardDeviation,
    sampleVariance,
    sampleStandardDeviation,
  };
}

function descriptiveOutcomeFromSummary(
  summary: DescriptiveStatisticsSummary,
  context: 'compare' | 'sample' | 'population',
): StatisticsEvaluation {
  const warnings = summary.count < 2
    ? ['Sample variance and sample standard deviation need at least two values.']
    : [];
  const modeLatex = summary.modes.length === 1
    ? `,\\ \\operatorname{mode}=${numberToLatex(summary.modes[0])}`
    : summary.modes.length > 1
      ? `,\\ \\operatorname{modes}=\\left\\{${summary.modes.map(numberToLatex).join(',\\ ')}\\right\\}`
      : '';
  const outlierLatex = summary.potentialOutliers.length > 0
    ? `,\\ \\operatorname{outliers}=\\left\\{${summary.potentialOutliers.map(numberToLatex).join(',\\ ')}\\right\\}`
    : '';
  const exactLatex = [
      `n=${summary.count}`,
      `\\sum x=${numberToLatex(summary.sum)}`,
      `\\bar{x}=${numberToLatex(summary.mean)}`,
      `\\operatorname{median}=${numberToLatex(summary.median)}`,
      `\\min=${numberToLatex(summary.min)}`,
      `Q_1=${numberToLatex(summary.q1)}`,
      `Q_3=${numberToLatex(summary.q3)}`,
      `\\max=${numberToLatex(summary.max)}`,
      `\\operatorname{range}=${numberToLatex(summary.range)}`,
      `\\operatorname{IQR}=${numberToLatex(summary.iqr)}`,
      `F_L=${numberToLatex(summary.lowerFence)}`,
      `F_U=${numberToLatex(summary.upperFence)}`,
      `\\sigma^2=${numberToLatex(summary.populationVariance)}`,
      `\\sigma=${numberToLatex(summary.populationStandardDeviation)}`,
      summary.sampleVariance === null ? '' : `s^2=${numberToLatex(summary.sampleVariance)}`,
      summary.sampleStandardDeviation === null ? '' : `s=${numberToLatex(summary.sampleStandardDeviation)}`,
    ].filter(Boolean).join(',\\ ') + modeLatex + outlierLatex;
  const populationSpread = `Population: variance ${formatStatisticsNumber(summary.populationVariance)}, SD ${formatStatisticsNumber(summary.populationStandardDeviation)}.`;
  const sampleSpread = summary.sampleVariance === null || summary.sampleStandardDeviation === null
    ? 'Sample variance and SD need at least two observations.'
    : `Sample: variance ${formatStatisticsNumber(summary.sampleVariance)}, SD ${formatStatisticsNumber(summary.sampleStandardDeviation)}.`;
  const spreadLines = context === 'sample'
    ? [sampleSpread, populationSpread]
    : context === 'population'
      ? [populationSpread, sampleSpread]
      : [populationSpread, sampleSpread];
  return profileStatisticsResult({
    exactLatex,
    approxText: `n=${summary.count}, mean=${formatStatisticsNumber(summary.mean)}, median=${formatStatisticsNumber(summary.median)}, IQR=${formatStatisticsNumber(summary.iqr)}, population SD=${formatStatisticsNumber(summary.populationStandardDeviation)}${summary.sampleStandardDeviation === null ? '' : `, sample SD=${formatStatisticsNumber(summary.sampleStandardDeviation)}`}`,
    detailSections: [
      {
        title: 'Quartiles and fences',
        lines: [
          summary.quartileMethod === 'halves'
            ? 'Halves method: the median is excluded when n is odd.'
            : 'Linear method: Type-7 interpolation with h=(n-1)p+1.',
          summary.potentialOutliers.length === 0
            ? 'No potential outliers fall beyond the 1.5-IQR fences.'
            : `Potential outliers: ${summary.potentialOutliers.map(formatStatisticsNumber).join(', ')}.`,
        ],
        lineKind: 'text',
      },
      {
        title: 'Spread',
        lines: spreadLines,
        lineKind: 'text',
      },
      {
        title: 'Mode',
        lines: [summary.modes.length === 0
          ? 'No mode: every observed value has the same frequency.'
          : summary.modes.length === 1
            ? `Mode: ${formatStatisticsNumber(summary.modes[0])}.`
            : `Multiple modes: ${summary.modes.map(formatStatisticsNumber).join(', ')}.`],
        lineKind: 'text',
      },
    ],
    warnings,
    mathJsonLeaves: descriptiveSummaryMathJsonLeaves(exactLatex, summary),
  });
}

function datasetOutcome(values: number[]): StatisticsEvaluation {
  const exactLatex = `n=${values.length},\\ \\left[${values.map(numberToLatex).join(',\\ ')}\\right]`;
  return profileStatisticsResult({
    exactLatex,
    approxText: `${values.length} values loaded`,
    warnings: [],
    mathJsonLeaves: datasetMathJsonLeaves(exactLatex, values),
  });
}

function frequencyOutcomeFromRows(rows: NumericFrequencyRow[]): StatisticsEvaluation {
  const totalCount = rows.reduce((total, row) => total + row.frequency, 0);
  const highestFrequency = Math.max(...rows.map((row) => row.frequency));
  const modeRows = rows.filter((row) => row.frequency === highestFrequency);
  const warnings =
    modeRows.length > 1
      ? ['Multiple values tie for the mode.']
      : [];
  const modeLatex =
    modeRows.length === 1
      ? `,\\ \\operatorname{mode}=${numberToLatex(modeRows[0].value)}`
      : '';

  const exactLatex = `n=${totalCount},\\ \\left\\{${rows.map((row) => `(${numberToLatex(row.value)},${row.frequency})`).join(',\\ ')}\\right\\}${modeLatex}`;
  return profileStatisticsResult({
    exactLatex,
    approxText: `n=${totalCount}, ${rows.map((row) => `${formatStatisticsNumber(row.value)}:${row.frequency}`).join(', ')}`,
    warnings,
    mathJsonLeaves: frequencySummaryMathJsonLeaves({
      canonicalLatex: exactLatex,
      rows,
      totalCount,
      modeValue: modeRows.length === 1 ? modeRows[0].value : undefined,
    }),
  });
}

function meanInferenceSummaryFromValues(values: number[]): MeanInferenceSummary {
  const summary = descriptiveRowsFromValues(values);
  return {
    count: summary.count,
    mean: summary.mean,
    sampleVariance: summary.sampleVariance,
    sampleStandardDeviation: summary.sampleStandardDeviation,
  };
}

function meanInferenceSummaryFromFrequency(rows: NumericFrequencyRow[]): MeanInferenceSummary {
  const summary = descriptiveRowsFromFrequency(rows);
  return {
    count: summary.count,
    mean: summary.mean,
    sampleVariance: summary.sampleVariance,
    sampleStandardDeviation: summary.sampleStandardDeviation,
  };
}

function meanInferenceOutcome(
  request: Extract<StatisticsRequest, { kind: 'meanInference' }>,
): StatisticsEvaluation {
  const level = parseInferenceLevel(request.level);
  if (level === null) {
    return statisticsError('Mean inference level must be a decimal between 0 and 1, such as 0.95.');
  }

  const summary = request.source === 'dataset'
    ? (() => {
      const parsed = parseDatasetValues(request.values);
      return parsed.ok
        ? { ok: true as const, summary: meanInferenceSummaryFromValues(parsed.values) }
        : parsed;
    })()
    : (() => {
      const parsed = parseFrequencyRows(request.rows);
      return parsed.ok
        ? { ok: true as const, summary: meanInferenceSummaryFromFrequency(parsed.rows) }
        : parsed;
    })();

  if (!summary.ok) {
    return statisticsError(summary.error);
  }

  if (summary.summary.count < 2 || summary.summary.sampleStandardDeviation === null || summary.summary.sampleVariance === null) {
    return statisticsError('Mean inference needs at least two numeric observations.');
  }

  if (request.mode === 'ci') {
    const result = computeMeanConfidenceInterval(summary.summary, level);
    if (!result) {
      return statisticsError('Mean confidence intervals need at least two numeric observations.');
    }

    const exactLatex = [
        `\\bar{x}=${numberToLatex(summary.summary.mean)}`,
        `s=${numberToLatex(summary.summary.sampleStandardDeviation)}`,
        `n=${summary.summary.count}`,
        `t_{\\mathrm{critical}}=${numberToLatex(result.criticalValue)}`,
        `ME=${numberToLatex(result.marginOfError)}`,
        `CI=${numberToLatex(result.lowerBound)}\\le\\mu\\le${numberToLatex(result.upperBound)}`,
      ].join(',\\ ');
    return profileStatisticsResult({
      exactLatex,
      approxText: `${formatStatisticsNumber(level * 100)}% CI: (${formatStatisticsNumber(result.lowerBound)}, ${formatStatisticsNumber(result.upperBound)})`,
      warnings: [],
      mathJsonLeaves: confidenceIntervalMathJsonLeaves({
        canonicalLatex: exactLatex,
        summary: summary.summary,
        result,
      }),
    });
  }

  const mu0 = parseNumericDraft(request.mu0 ?? '');
  if (mu0 === null) {
    return statisticsError('Mean hypothesis tests need a finite numeric mu0 value.');
  }

  const result = computeMeanHypothesisTest(summary.summary, level, mu0);
  if (!result) {
    return statisticsError('Mean hypothesis tests need at least two numeric observations.');
  }

  const tStatisticLatex = Number.isFinite(result.tStatistic) ? numberToLatex(result.tStatistic) : '\\infty';
  const tStatisticApprox = Number.isFinite(result.tStatistic) ? formatStatisticsNumber(result.tStatistic) : 'infinity';

  const exactLatex = [
      `\\bar{x}=${numberToLatex(summary.summary.mean)}`,
      `\\mu_0=${numberToLatex(mu0)}`,
      `s=${numberToLatex(summary.summary.sampleStandardDeviation)}`,
      `n=${summary.summary.count}`,
      `t=${tStatisticLatex}`,
      `p=${numberToLatex(result.pValue)}`,
      `\\alpha=${numberToLatex(result.alpha)}`,
    ].join(',\\ ');
  return profileStatisticsResult({
    exactLatex,
    approxText: `two-sided t-test: t=${tStatisticApprox}, p=${formatStatisticsNumber(result.pValue)}, ${result.rejectNull ? 'reject H0' : 'fail to reject H0'}`,
    warnings: [],
    mathJsonLeaves: meanTestMathJsonLeaves({
      canonicalLatex: exactLatex,
      summary: summary.summary,
      mu0,
      tStatistic: result.tStatistic,
      pValue: result.pValue,
      alpha: result.alpha,
    }),
  });
}

function regressionSummary(points: NumericPoint[]) {
  const count = points.length;
  const sumX = points.reduce((total, point) => total + point.x, 0);
  const sumY = points.reduce((total, point) => total + point.y, 0);
  const meanX = sumX / count;
  const meanY = sumY / count;
  const sxx = points.reduce((total, point) => total + ((point.x - meanX) ** 2), 0);
  const syy = points.reduce((total, point) => total + ((point.y - meanY) ** 2), 0);
  const sxy = points.reduce((total, point) => total + ((point.x - meanX) * (point.y - meanY)), 0);

  if (sxx === 0) {
    return {
      ok: false as const,
      error: 'Regression needs non-zero spread in x.',
    };
  }

  if (syy === 0) {
    return {
      ok: false as const,
      error: 'Regression needs non-zero spread in y to compute correlation strength.',
    };
  }

  const slope = sxy / sxx;
  const intercept = meanY - (slope * meanX);
  const r = sxy / Math.sqrt(sxx * syy);
  const rSquared = r ** 2;

  return {
    ok: true as const,
    count,
    slope,
    intercept,
    r,
    rSquared,
  };
}

function regressionDiagnostics(points: NumericPoint[], summary: RegressionFitSummary): RegressionDiagnostics {
  const sse = points.reduce((total, point) => {
    const fitted = (summary.slope * point.x) + summary.intercept;
    return total + ((point.y - fitted) ** 2);
  }, 0);

  if (summary.count < 3) {
    return {
      sse,
      mse: null,
      residualStandardError: null,
    };
  }

  const mse = sse / (summary.count - 2);
  return {
    sse,
    mse,
    residualStandardError: Math.sqrt(mse),
  };
}

function fitQualityWarnings(r: number, count: number) {
  const warnings: string[] = [];
  const magnitude = Math.abs(r);

  if (count < 5) {
    warnings.push('Quality summary is based on a small sample (n < 5).');
  }

  if (magnitude < 0.4) {
    warnings.push('Weak linear fit: treat this line as descriptive rather than strongly predictive.');
  } else if (magnitude < 0.7) {
    warnings.push('Moderate linear fit: use the line with caution.');
  }

  return warnings;
}

function regressionOutcome(request: Extract<StatisticsRequest, { kind: 'regression' }>): StatisticsEvaluation {
  const parsed = parsePoints(request.points);
  if (!parsed.ok) {
    return statisticsError(parsed.error);
  }

  const summary = regressionSummary(parsed.points);
  if (!summary.ok) {
    return statisticsError(summary.error);
  }

  const diagnostics = regressionDiagnostics(parsed.points, summary);
  const warnings = fitQualityWarnings(summary.r, summary.count);
  if (summary.count < 3) {
    warnings.push('Residual variance and residual standard error need at least 3 points.');
  }

  const exactLatex = [
      `y_{\\mathrm{fit}}=${numberToLatex(summary.slope)}x${summary.intercept < 0 ? '' : '+'}${numberToLatex(summary.intercept)}`,
      `m=${numberToLatex(summary.slope)}`,
      `b=${numberToLatex(summary.intercept)}`,
      `r=${numberToLatex(summary.r)}`,
      `r^2=${numberToLatex(summary.rSquared)}`,
      `n=${summary.count}`,
    ].join(',\\ ');
  return profileStatisticsResult({
    exactLatex,
    approxText: `ŷ=${formatStatisticsNumber(summary.slope)}x${summary.intercept < 0 ? '' : '+'}${formatStatisticsNumber(summary.intercept)}, r=${formatStatisticsNumber(summary.r)}, r²=${formatStatisticsNumber(summary.rSquared)}, n=${summary.count}`,
    detailSections: [regressionQualitySection(summary, diagnostics)],
    warnings,
    mathJsonLeaves: regressionMathJsonLeaves(exactLatex, summary, diagnostics),
  });
}

function correlationOutcome(request: Extract<StatisticsRequest, { kind: 'correlation' }>): StatisticsEvaluation {
  const parsed = parsePoints(request.points);
  if (!parsed.ok) {
    return statisticsError(parsed.error);
  }

  const summary = regressionSummary(parsed.points);
  if (!summary.ok) {
    return statisticsError(summary.error === 'Regression needs non-zero spread in x.'
      ? 'Correlation needs non-zero spread in x.'
      : summary.error);
  }

  const strength = correlationStrength(summary.r);
  const exactLatex = [
      `r=${numberToLatex(summary.r)}`,
      `r^2=${numberToLatex(summary.rSquared)}`,
      `n=${summary.count}`,
    ].join(',\\ ');
  return profileStatisticsResult({
    exactLatex,
    approxText: `r=${formatStatisticsNumber(summary.r)}, r²=${formatStatisticsNumber(summary.rSquared)}, ${strength}, n=${summary.count}`,
    detailSections: [correlationQualitySection(summary)],
    warnings: fitQualityWarnings(summary.r, summary.count),
    mathJsonLeaves: correlationMathJsonLeaves(exactLatex, summary),
  });
}

export function runStatisticsRequest(request: StatisticsRequest): ResultProducerDraft {
  const title = requestTitle(request);

  switch (request.kind) {
    case 'dataset': {
      const parsed = parseDatasetValues(request.values);
      return toOutcome(title, parsed.ok ? datasetOutcome(parsed.values) : statisticsError(parsed.error));
    }
    case 'descriptive': {
      const quartiles = request.quartiles ?? 'halves';
      const context = request.context ?? 'compare';
      if (request.source === 'dataset') {
        const parsed = parseDatasetValues(request.values);
        return toOutcome(
          title,
          parsed.ok
            ? descriptiveOutcomeFromSummary(
                descriptiveStatisticsFromValues(parsed.values, quartiles),
                context,
              )
            : statisticsError(parsed.error),
        );
      }

      const parsed = parseFrequencyRows(request.rows);
      return toOutcome(
        title,
        parsed.ok
          ? descriptiveOutcomeFromSummary(
              descriptiveStatisticsFromFrequencyRows(parsed.rows, quartiles),
              context,
            )
          : statisticsError(parsed.error),
      );
    }
    case 'frequency': {
      if (request.source === 'dataset') {
        const parsed = parseDatasetValues(request.values);
        return toOutcome(
          title,
          parsed.ok ? frequencyOutcomeFromRows(parseDatasetToFrequencyRows(parsed.values)) : statisticsError(parsed.error),
        );
      }

      const parsed = parseFrequencyRows(request.rows);
      return toOutcome(
        title,
        parsed.ok ? frequencyOutcomeFromRows(parsed.rows) : statisticsError(parsed.error),
      );
    }
    case 'meanInference':
      return toOutcome(title, meanInferenceOutcome(request));
    case 'binomial':
      return toOutcome(title, probabilityOutcome(request));
    case 'normal':
      return toOutcome(title, probabilityOutcome(request));
    case 'poisson':
      return toOutcome(title, probabilityOutcome(request));
    case 'regression':
      return toOutcome(title, regressionOutcome(request));
    case 'correlation':
      return toOutcome(title, correlationOutcome(request));
  }
}

function parseDatasetToFrequencyRows(values: number[]): NumericFrequencyRow[] {
  const counts = new Map<number, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort(([left], [right]) => left - right)
    .map(([value, frequency]) => ({ value, frequency }));
}

function parseFailureToOutcome(parsed: Extract<StatisticsParseResult, { ok: false }>): ResultProducerDraft {
  return {
    kind: 'error',
    title: 'Statistics',
    error: parsed.error,
    warnings: [],
  };
}

export function runStatisticsCoreDraft(
  rawLatex: string,
  options: {
    screenHint?: StatisticsScreen;
    workingSourceHint?: StatisticsWorkingSource;
  } = {},
) {
  const parsed = parseStatisticsDraft(rawLatex, options);
  if (!parsed.ok) {
    return {
      outcome: parseFailureToOutcome(parsed),
      parsed,
      mathJsonLeaves: [],
    };
  }

  const outcome = runStatisticsRequest(parsed.request);
  return {
    outcome,
    parsed,
    mathJsonLeaves: ownedMathJsonByOutcome.get(outcome) ?? [],
  };
}
