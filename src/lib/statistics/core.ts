import type {
  DisplayOutcome,
  FrequencyRow,
  RegressionPoint,
  StatisticsParseResult,
  StatisticsRequest,
  StatisticsScreen,
  StatisticsWorkingSource,
} from '../../types/calculator';
import { numberToLatex } from '../format';
import { parseStatisticsDraft } from './parser';
import { formatStatisticsNumber, parseIntegerDraft, parseNumericDraft } from './shared';

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
  warnings: string[];
  error?: string;
};

function statisticsError(error: string): StatisticsEvaluation {
  return {
    error,
    warnings: [],
  };
}

function toOutcome(title: string, evaluation: StatisticsEvaluation): DisplayOutcome {
  if (evaluation.error) {
    return {
      kind: 'error',
      title,
      error: evaluation.error,
      warnings: evaluation.warnings,
      exactLatex: evaluation.exactLatex,
      approxText: evaluation.approxText,
    };
  }

  return {
    kind: 'success',
    title,
    exactLatex: evaluation.exactLatex,
    approxText: evaluation.approxText,
    warnings: evaluation.warnings,
  };
}

function requestTitle(request: StatisticsRequest) {
  switch (request.kind) {
    case 'dataset':
      return 'Data Entry';
    case 'descriptive':
      return 'Descriptive';
    case 'frequency':
      return 'Frequency';
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

    numericRows.push({
      value: parsedValue,
      frequency: parsedFrequency,
    });
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
  };
}

function descriptiveOutcomeFromSummary(summary: ReturnType<typeof descriptiveRowsFromValues>): StatisticsEvaluation {
  return {
    exactLatex: [
      `n=${summary.count}`,
      `\\sum x=${numberToLatex(summary.sum)}`,
      `\\bar{x}=${numberToLatex(summary.mean)}`,
      `\\operatorname{median}=${numberToLatex(summary.median)}`,
      `\\min=${numberToLatex(summary.min)}`,
      `\\max=${numberToLatex(summary.max)}`,
      `\\operatorname{range}=${numberToLatex(summary.range)}`,
      `\\sigma^2=${numberToLatex(summary.variance)}`,
      `\\sigma=${numberToLatex(summary.standardDeviation)}`,
    ].join(',\\ '),
    approxText: `n=${summary.count}, mean=${formatStatisticsNumber(summary.mean)}, median=${formatStatisticsNumber(summary.median)}, sd=${formatStatisticsNumber(summary.standardDeviation)}`,
    warnings: [],
  };
}

function datasetOutcome(values: number[]): StatisticsEvaluation {
  return {
    exactLatex: `n=${values.length},\\ \\left\\{${values.map(numberToLatex).join(',\\ ')}\\right\\}`,
    approxText: `${values.length} values loaded`,
    warnings: [],
  };
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

  return {
    exactLatex: `n=${totalCount},\\ \\left\\{${rows.map((row) => `${numberToLatex(row.value)}:${row.frequency}`).join(',\\ ')}\\right\\}${modeLatex}`,
    approxText: `n=${totalCount}, ${rows.map((row) => `${formatStatisticsNumber(row.value)}:${row.frequency}`).join(', ')}`,
    warnings,
  };
}

function factorial(value: number) {
  let result = 1;
  for (let current = 2; current <= value; current += 1) {
    result *= current;
  }
  return result;
}

function combination(n: number, r: number) {
  const normalizedR = Math.min(r, n - r);
  let result = 1;
  for (let step = 1; step <= normalizedR; step += 1) {
    result = (result * (n - normalizedR + step)) / step;
  }
  return result;
}

function binomialPmf(n: number, p: number, x: number) {
  return combination(n, x) * (p ** x) * ((1 - p) ** (n - x));
}

function errorFunction(value: number) {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const t = 1 / (1 + (0.3275911 * x));
  const polynomial = (((((a5 * t) + a4) * t + a3) * t + a2) * t + a1) * t;
  return sign * (1 - (polynomial * Math.exp(-(x ** 2))));
}

function normalPdf(mean: number, standardDeviation: number, x: number) {
  const z = (x - mean) / standardDeviation;
  return Math.exp(-0.5 * (z ** 2)) / (standardDeviation * Math.sqrt(2 * Math.PI));
}

function normalCdf(mean: number, standardDeviation: number, x: number) {
  return 0.5 * (1 + errorFunction((x - mean) / (standardDeviation * Math.sqrt(2))));
}

function poissonPmf(lambda: number, x: number) {
  return (Math.exp(-lambda) * (lambda ** x)) / factorial(x);
}

function binomialOutcome(request: Extract<StatisticsRequest, { kind: 'binomial' }>): StatisticsEvaluation {
  const n = parseIntegerDraft(request.n);
  const x = parseIntegerDraft(request.x);
  const p = parseNumericDraft(request.p);

  if (n === null || n < 0) {
    return statisticsError('Binomial n must be a non-negative integer.');
  }
  if (x === null || x < 0) {
    return statisticsError('Binomial x must be a non-negative integer.');
  }
  if (p === null || p < 0 || p > 1) {
    return statisticsError('Binomial p must be between 0 and 1.');
  }
  if (x > n) {
    return statisticsError('Binomial x must be less than or equal to n.');
  }

  const value =
    request.mode === 'pmf'
      ? binomialPmf(n, p, x)
      : Array.from({ length: x + 1 }, (_, index) => binomialPmf(n, p, index))
        .reduce((total, probability) => total + probability, 0);

  return {
    exactLatex: `P(X${request.mode === 'pmf' ? '=' : '\\le'}${x})=${numberToLatex(value)}`,
    approxText: `${request.mode.toUpperCase()}=${formatStatisticsNumber(value)}`,
    warnings: [],
  };
}

function normalOutcome(request: Extract<StatisticsRequest, { kind: 'normal' }>): StatisticsEvaluation {
  const mean = parseNumericDraft(request.mean);
  const standardDeviation = parseNumericDraft(request.standardDeviation);
  const x = parseNumericDraft(request.x);

  if (mean === null) {
    return statisticsError('Normal mean must be a finite numeric value.');
  }
  if (standardDeviation === null || standardDeviation <= 0) {
    return statisticsError('Normal standard deviation must be greater than zero.');
  }
  if (x === null) {
    return statisticsError('Normal x must be a finite numeric value.');
  }

  const value =
    request.mode === 'pdf'
      ? normalPdf(mean, standardDeviation, x)
      : normalCdf(mean, standardDeviation, x);

  return {
    exactLatex: request.mode === 'pdf'
      ? `f(${numberToLatex(x)})=${numberToLatex(value)}`
      : `P(X\\le${numberToLatex(x)})=${numberToLatex(value)}`,
    approxText: `${request.mode.toUpperCase()}=${formatStatisticsNumber(value)}`,
    warnings: [],
  };
}

function poissonOutcome(request: Extract<StatisticsRequest, { kind: 'poisson' }>): StatisticsEvaluation {
  const lambda = parseNumericDraft(request.lambda);
  const x = parseIntegerDraft(request.x);

  if (lambda === null || lambda <= 0) {
    return statisticsError('Poisson lambda must be greater than zero.');
  }
  if (x === null || x < 0) {
    return statisticsError('Poisson x must be a non-negative integer.');
  }

  const value =
    request.mode === 'pmf'
      ? poissonPmf(lambda, x)
      : Array.from({ length: x + 1 }, (_, index) => poissonPmf(lambda, index))
        .reduce((total, probability) => total + probability, 0);

  return {
    exactLatex: `P(X${request.mode === 'pmf' ? '=' : '\\le'}${x})=${numberToLatex(value)}`,
    approxText: `${request.mode.toUpperCase()}=${formatStatisticsNumber(value)}`,
    warnings: [],
  };
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

function correlationStrength(r: number) {
  const magnitude = Math.abs(r);
  const direction = r > 0 ? 'positive' : r < 0 ? 'negative' : 'none';
  const strength =
    magnitude < 0.2
      ? 'negligible'
      : magnitude < 0.4
        ? 'weak'
        : magnitude < 0.7
          ? 'moderate'
          : magnitude < 0.9
            ? 'strong'
            : 'very strong';

  return direction === 'none' ? 'no linear direction' : `${strength} ${direction}`;
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

  return {
    exactLatex: [
      `\\hat{y}=${numberToLatex(summary.slope)}x${summary.intercept < 0 ? '' : '+'}${numberToLatex(summary.intercept)}`,
      `m=${numberToLatex(summary.slope)}`,
      `b=${numberToLatex(summary.intercept)}`,
      `r=${numberToLatex(summary.r)}`,
      `r^2=${numberToLatex(summary.rSquared)}`,
      `n=${summary.count}`,
    ].join(',\\ '),
    approxText: `ŷ=${formatStatisticsNumber(summary.slope)}x${summary.intercept < 0 ? '' : '+'}${formatStatisticsNumber(summary.intercept)}, r=${formatStatisticsNumber(summary.r)}, r²=${formatStatisticsNumber(summary.rSquared)}, n=${summary.count}`,
    warnings: [],
  };
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
  return {
    exactLatex: [
      `r=${numberToLatex(summary.r)}`,
      `r^2=${numberToLatex(summary.rSquared)}`,
      `n=${summary.count}`,
      `\\text{${strength}}`,
    ].join(',\\ '),
    approxText: `r=${formatStatisticsNumber(summary.r)}, r²=${formatStatisticsNumber(summary.rSquared)}, ${strength}, n=${summary.count}`,
    warnings: [],
  };
}

export function runStatisticsRequest(request: StatisticsRequest): DisplayOutcome {
  const title = requestTitle(request);

  switch (request.kind) {
    case 'dataset': {
      const parsed = parseDatasetValues(request.values);
      return toOutcome(title, parsed.ok ? datasetOutcome(parsed.values) : statisticsError(parsed.error));
    }
    case 'descriptive': {
      if (request.source === 'dataset') {
        const parsed = parseDatasetValues(request.values);
        return toOutcome(
          title,
          parsed.ok ? descriptiveOutcomeFromSummary(descriptiveRowsFromValues(parsed.values)) : statisticsError(parsed.error),
        );
      }

      const parsed = parseFrequencyRows(request.rows);
      return toOutcome(
        title,
        parsed.ok ? descriptiveOutcomeFromSummary(descriptiveRowsFromFrequency(parsed.rows)) : statisticsError(parsed.error),
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
    case 'binomial':
      return toOutcome(title, binomialOutcome(request));
    case 'normal':
      return toOutcome(title, normalOutcome(request));
    case 'poisson':
      return toOutcome(title, poissonOutcome(request));
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

function parseFailureToOutcome(parsed: Extract<StatisticsParseResult, { ok: false }>): DisplayOutcome {
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
    };
  }

  return {
    outcome: runStatisticsRequest(parsed.request),
    parsed,
  };
}
