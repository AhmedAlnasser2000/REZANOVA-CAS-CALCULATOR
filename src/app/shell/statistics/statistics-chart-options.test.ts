import { describe, expect, it } from 'vitest';
import type { StatisticsPairedPointsVisualizationV1 } from '../../../types/calculator';
import { statisticsChartOption } from './statistics-chart-options';

describe('Statistics chart number formatting', () => {
  it('uses approximate digits for value axes and coordinate tooltips', () => {
    const view: StatisticsPairedPointsVisualizationV1 = {
      kind: 'correlationScatter',
      title: 'Correlation scatter',
      xLabel: 'x',
      yLabel: 'y',
      ariaDescription: 'Correlation scatter plot.',
      points: [{ x: 1 / 3, y: 2 / 3 }],
      table: {
        columns: ['x', 'y'],
        rows: [[1 / 3, 2 / 3]],
        totalRows: 1,
      },
    };
    const option = statisticsChartOption(view, 'auto', 2) as {
      tooltip: { valueFormatter: (value: unknown) => string };
      xAxis: { axisLabel: { formatter: (value: number) => string } };
    };

    expect(option.xAxis.axisLabel.formatter(1 / 3)).toBe('0.33');
    expect(option.tooltip.valueFormatter([1 / 3, 2 / 3])).toBe('0.33, 0.67');
  });
});
