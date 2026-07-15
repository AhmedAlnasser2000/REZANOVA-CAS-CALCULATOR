import { useEffect, useRef } from 'react';
import type {
  StatisticsHistogramBinCount,
  StatisticsVisualizationViewV1,
} from '../../../types/calculator';
import { statisticsChartOption } from './statistics-chart-options';
import { initStatisticsEChart } from './statistics-echarts';

type StatisticsEChartProps = {
  view: StatisticsVisualizationViewV1;
  histogramBinCount: StatisticsHistogramBinCount;
  approxDigits: number;
};

export function StatisticsEChart({ view, histogramBinCount, approxDigits }: StatisticsEChartProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    const chart = initStatisticsEChart(host);
    chart.setOption(statisticsChartOption(view, histogramBinCount, approxDigits), { notMerge: true });
    const observer = typeof ResizeObserver === 'undefined'
      ? undefined
      : new ResizeObserver(() => chart.resize());
    observer?.observe(host);
    return () => {
      observer?.disconnect();
      chart.dispose();
    };
  }, [approxDigits, histogramBinCount, view]);

  return (
    <div
      ref={hostRef}
      className="statistics-echart"
      data-testid="statistics-visualization-chart"
      role="img"
      aria-label={view.ariaDescription}
    />
  );
}
