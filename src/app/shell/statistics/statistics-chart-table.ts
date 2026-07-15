import { formatApproxNumber } from '../../../lib/display/numeric-output';
import type {
  StatisticsHistogramBinCount,
  StatisticsVisualizationViewV1,
  StatisticsWeightedDataVisualizationV1,
} from '../../../types/calculator';
import { buildStatisticsHistogramBins } from './statistics-histogram';

export type StatisticsChartTable = {
  columns: readonly string[];
  rows: readonly (readonly string[])[];
};

export type StatisticsFrequencyBarGroup = {
  label: string;
  frequency: number;
};

function formatTableNumber(value: number, approxDigits: number) {
  return formatApproxNumber(value, { approxDigits, numericNotationMode: 'decimal' });
}

export function buildStatisticsFrequencyBarGroups(
  weightedValues: StatisticsWeightedDataVisualizationV1['weightedValues'],
  approxDigits: number,
): StatisticsFrequencyBarGroup[] {
  const limit = 120;
  const width = Math.max(1, Math.ceil(weightedValues.length / limit));
  return Array.from(
    { length: Math.ceil(weightedValues.length / width) },
    (_, index) => weightedValues.slice(index * width, (index + 1) * width),
  ).map((group) => ({
    label: group.length === 1
      ? formatTableNumber(group[0].value, approxDigits)
      : `${formatTableNumber(group[0].value, approxDigits)}-${formatTableNumber(group[group.length - 1].value, approxDigits)}`,
    frequency: group.reduce((sum, point) => sum + point.weight, 0),
  }));
}

function formattedRows(
  rows: readonly (readonly (number | string)[])[],
  approxDigits: number,
) {
  return rows.map((row) => row.map((cell) => (
    typeof cell === 'number' ? formatTableNumber(cell, approxDigits) : cell
  )));
}

export function statisticsChartTable(
  view: StatisticsVisualizationViewV1,
  histogramBinCount: StatisticsHistogramBinCount,
  approxDigits: number,
): StatisticsChartTable {
  switch (view.kind) {
    case 'histogram': {
      const bins = buildStatisticsHistogramBins(
        view.weightedValues,
        histogramBinCount,
        approxDigits,
      );
      return {
        columns: ['Interval', 'Frequency'],
        rows: bins.map((bin) => [bin.label, formatTableNumber(bin.frequency, approxDigits)]),
      };
    }
    case 'frequencyBars': {
      const groups = buildStatisticsFrequencyBarGroups(view.weightedValues, approxDigits);
      return {
        columns: ['Value or range', 'Frequency'],
        rows: groups.map((group) => [
          group.label,
          formatTableNumber(group.frequency, approxDigits),
        ]),
      };
    }
    case 'boxPlot': {
      const summary = view.boxSummary;
      if (!summary) {
        return {
          columns: view.table.columns,
          rows: formattedRows(view.table.rows, approxDigits),
        };
      }
      const rows: Array<readonly string[]> = [
        ['Minimum', formatTableNumber(summary.min, approxDigits)],
        ['Lower whisker', formatTableNumber(summary.lowerWhisker, approxDigits)],
        ['Q1', formatTableNumber(summary.q1, approxDigits)],
        ['Median', formatTableNumber(summary.median, approxDigits)],
        ['Q3', formatTableNumber(summary.q3, approxDigits)],
        ['Upper whisker', formatTableNumber(summary.upperWhisker, approxDigits)],
        ['Maximum', formatTableNumber(summary.max, approxDigits)],
        ['Lower fence', formatTableNumber(summary.lowerFence, approxDigits)],
        ['Upper fence', formatTableNumber(summary.upperFence, approxDigits)],
      ];
      summary.outliers.forEach((outlier, index) => {
        rows.push([`Potential outlier ${index + 1}`, formatTableNumber(outlier, approxDigits)]);
      });
      return { columns: ['Quantity', 'Value'], rows };
    }
    default:
      return {
        columns: view.table.columns,
        rows: formattedRows(view.table.rows, approxDigits),
      };
  }
}
