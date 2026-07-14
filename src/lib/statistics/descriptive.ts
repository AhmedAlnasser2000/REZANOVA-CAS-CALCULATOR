import type { StatisticsQuartileMethod } from '../../types/calculator';

export type CompactFrequencyRow = {
  value: number;
  frequency: number;
};

export type DescriptiveStatisticsSummary = {
  count: number;
  sum: number;
  mean: number;
  median: number;
  min: number;
  q1: number;
  q3: number;
  max: number;
  range: number;
  iqr: number;
  lowerFence: number;
  upperFence: number;
  potentialOutliers: number[];
  modes: number[];
  populationVariance: number;
  populationStandardDeviation: number;
  sampleVariance: number | null;
  sampleStandardDeviation: number | null;
  quartileMethod: StatisticsQuartileMethod;
};

function sortedCompactRows(rows: readonly CompactFrequencyRow[]) {
  return rows
    .filter((row) => row.frequency > 0)
    .map((row) => ({ ...row }))
    .sort((left, right) => left.value - right.value);
}

export function compactFrequencyRowsFromValues(values: readonly number[]) {
  const counts = new Map<number, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([left], [right]) => left - right)
    .map(([value, frequency]) => ({ value, frequency }));
}

function valueAtRank(rows: readonly CompactFrequencyRow[], rank: number) {
  let running = 0;
  for (const row of rows) {
    running += row.frequency;
    if (rank < running) return row.value;
  }
  return rows[rows.length - 1]?.value ?? Number.NaN;
}

function medianAcrossRanks(
  rows: readonly CompactFrequencyRow[],
  startRank: number,
  length: number,
) {
  if (length <= 0) return valueAtRank(rows, startRank);
  const left = startRank + Math.floor((length - 1) / 2);
  const right = startRank + Math.floor(length / 2);
  return (valueAtRank(rows, left) + valueAtRank(rows, right)) / 2;
}

function linearQuartile(
  rows: readonly CompactFrequencyRow[],
  count: number,
  probability: number,
) {
  const index = (count - 1) * probability;
  const lowerRank = Math.floor(index);
  const upperRank = Math.ceil(index);
  const lower = valueAtRank(rows, lowerRank);
  const upper = valueAtRank(rows, upperRank);
  return lower + ((index - lowerRank) * (upper - lower));
}

function quartiles(
  rows: readonly CompactFrequencyRow[],
  count: number,
  method: StatisticsQuartileMethod,
) {
  if (count === 1) {
    const only = valueAtRank(rows, 0);
    return { q1: only, q3: only };
  }
  if (method === 'linear') {
    return {
      q1: linearQuartile(rows, count, 0.25),
      q3: linearQuartile(rows, count, 0.75),
    };
  }
  const halfLength = Math.floor(count / 2);
  return {
    q1: medianAcrossRanks(rows, 0, halfLength),
    q3: medianAcrossRanks(rows, Math.ceil(count / 2), halfLength),
  };
}

export function descriptiveStatisticsFromFrequencyRows(
  sourceRows: readonly CompactFrequencyRow[],
  quartileMethod: StatisticsQuartileMethod,
): DescriptiveStatisticsSummary {
  const rows = sortedCompactRows(sourceRows);
  const count = rows.reduce((total, row) => total + row.frequency, 0);
  if (count === 0) {
    throw new Error('Descriptive statistics need at least one observation.');
  }

  const sum = rows.reduce((total, row) => total + (row.value * row.frequency), 0);
  const mean = sum / count;
  const median = medianAcrossRanks(rows, 0, count);
  const min = rows[0].value;
  const max = rows[rows.length - 1].value;
  const range = max - min;
  const squaredDeviationSum = rows.reduce(
    (total, row) => total + (row.frequency * ((row.value - mean) ** 2)),
    0,
  );
  const populationVariance = squaredDeviationSum / count;
  const populationStandardDeviation = Math.sqrt(populationVariance);
  const sampleVariance = count > 1 ? squaredDeviationSum / (count - 1) : null;
  const sampleStandardDeviation = sampleVariance === null ? null : Math.sqrt(sampleVariance);
  const { q1, q3 } = quartiles(rows, count, quartileMethod);
  const iqr = q3 - q1;
  const lowerFence = q1 - (1.5 * iqr);
  const upperFence = q3 + (1.5 * iqr);
  const potentialOutliers = rows
    .filter((row) => row.value < lowerFence || row.value > upperFence)
    .map((row) => row.value);
  const highestFrequency = Math.max(...rows.map((row) => row.frequency));
  const modes = highestFrequency <= 1
    ? []
    : rows.filter((row) => row.frequency === highestFrequency).map((row) => row.value);

  return {
    count,
    sum,
    mean,
    median,
    min,
    q1,
    q3,
    max,
    range,
    iqr,
    lowerFence,
    upperFence,
    potentialOutliers,
    modes,
    populationVariance,
    populationStandardDeviation,
    sampleVariance,
    sampleStandardDeviation,
    quartileMethod,
  };
}

export function descriptiveStatisticsFromValues(
  values: readonly number[],
  quartileMethod: StatisticsQuartileMethod,
) {
  return descriptiveStatisticsFromFrequencyRows(
    compactFrequencyRowsFromValues(values),
    quartileMethod,
  );
}
