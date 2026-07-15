import type { StatisticsHistogramBinCount } from '../../../types/calculator';
import { formatApproxNumber } from '../../../lib/display/numeric-output';

export type StatisticsHistogramBin = {
  lower: number;
  upper: number;
  frequency: number;
  label: string;
};

function boundedBinCount(value: number) {
  return Math.min(50, Math.max(1, Math.round(value)));
}

function formatBoundary(value: number, approxDigits: number) {
  return formatApproxNumber(value, { approxDigits, numericNotationMode: 'decimal' });
}

export function statisticsAutomaticHistogramBinCount(total: number) {
  return boundedBinCount(Math.ceil(Math.log2(Math.max(1, total)) + 1));
}

export function buildStatisticsHistogramBins(
  weightedValues: readonly { value: number; weight: number }[],
  requestedCount: StatisticsHistogramBinCount,
  approxDigits = 6,
): StatisticsHistogramBin[] {
  if (weightedValues.length === 0) return [];
  const sorted = [...weightedValues].sort((left, right) => left.value - right.value);
  const minimum = sorted[0].value;
  const maximum = sorted[sorted.length - 1].value;
  const total = sorted.reduce((sum, point) => sum + point.weight, 0);
  if (minimum === maximum) {
    return [{ lower: minimum, upper: maximum, frequency: total, label: formatBoundary(minimum, approxDigits) }];
  }

  const count = requestedCount === 'auto'
    ? statisticsAutomaticHistogramBinCount(total)
    : boundedBinCount(requestedCount);
  const width = (maximum - minimum) / count;
  const frequencies = Array.from({ length: count }, () => 0);
  for (const point of sorted) {
    const index = point.value === maximum
      ? count - 1
      : Math.min(count - 1, Math.floor((point.value - minimum) / width));
    frequencies[index] += point.weight;
  }

  return frequencies.map((frequency, index) => {
    const lower = minimum + (index * width);
    const upper = index === count - 1 ? maximum : minimum + ((index + 1) * width);
    return {
      lower,
      upper,
      frequency,
      label: `${formatBoundary(lower, approxDigits)}-${formatBoundary(upper, approxDigits)}`,
    };
  });
}
