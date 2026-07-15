import { describe, expect, it } from 'vitest';
import type {
  StatisticsDistributionBarsVisualizationV1,
  StatisticsWeightedDataVisualizationV1,
} from '../../../types/calculator';
import { statisticsChartTable } from './statistics-chart-table';

describe('Statistics chart data tables', () => {
  it('reports the exact locally selected histogram bins', () => {
    const view: StatisticsWeightedDataVisualizationV1 = {
      kind: 'histogram',
      title: 'Histogram',
      xLabel: 'Value',
      yLabel: 'Frequency',
      ariaDescription: 'Histogram.',
      weightedValues: [
        { value: 0, weight: 1 },
        { value: 1 / 3, weight: 2 },
        { value: 1, weight: 1 },
      ],
      table: { columns: ['Value', 'Frequency'], rows: [], totalRows: 0 },
    };

    const table = statisticsChartTable(view, 2, 2);

    expect(table.columns).toEqual(['Interval', 'Frequency']);
    expect(table.rows).toEqual([
      ['0-0.5', '3'],
      ['0.5-1', '1'],
    ]);
  });

  it('applies Approximate digits to probability data values', () => {
    const view: StatisticsDistributionBarsVisualizationV1 = {
      kind: 'probabilityBars',
      title: 'Binomial probability',
      xLabel: 'Value',
      yLabel: 'Probability',
      ariaDescription: 'Probability bars.',
      distribution: 'binomial',
      eventNotation: 'X=1',
      points: [{ x: 1, probability: 1 / 3, selected: true }],
      omittedMass: 0,
      table: {
        columns: ['Value', 'Probability', 'In event'],
        rows: [[1, 1 / 3, 'Yes']],
        totalRows: 1,
      },
    };

    expect(statisticsChartTable(view, 'auto', 2).rows).toEqual([['1', '0.33', 'Yes']]);
  });
});
