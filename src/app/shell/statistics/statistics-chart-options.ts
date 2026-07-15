import type {
  StatisticsHistogramBinCount,
  StatisticsVisualizationViewV1,
  StatisticsWeightedDataVisualizationV1,
} from '../../../types/calculator';
import type { StatisticsEChartOption } from './statistics-echarts';
import { buildStatisticsHistogramBins } from './statistics-histogram';
import { formatApproxNumber } from '../../../lib/display/numeric-output';
import { buildStatisticsFrequencyBarGroups } from './statistics-chart-table';

export const STATISTICS_DATA_ZOOM_ID = 'statistics-x-zoom';

const COLORS = {
  ink: '#dce7df',
  muted: '#a9b8af',
  grid: 'rgba(184, 205, 192, 0.18)',
  base: '#79a993',
  selected: '#d2aa4e',
  curve: '#69a6c4',
  outlier: '#d27468',
};

const axisStyle = {
  axisLine: { lineStyle: { color: COLORS.muted } },
  axisLabel: { color: COLORS.muted },
  nameTextStyle: { color: COLORS.muted },
  splitLine: { lineStyle: { color: COLORS.grid } },
};

function formatChartNumber(value: number, approxDigits: number) {
  return formatApproxNumber(value, { approxDigits, numericNotationMode: 'decimal' });
}

function formatChartValue(value: unknown, approxDigits: number): string {
  if (typeof value === 'number') return formatChartNumber(value, approxDigits);
  if (Array.isArray(value)) {
    return value.map((entry) => formatChartValue(entry, approxDigits)).join(', ');
  }
  return String(value);
}

function baseOptionFor(approxDigits: number): StatisticsEChartOption {
  return {
    animation: false,
    backgroundColor: '#111e1c',
    aria: { enabled: true },
    dataZoom: [{
      id: STATISTICS_DATA_ZOOM_ID,
      type: 'inside',
      xAxisIndex: [0],
      start: 0,
      end: 100,
      filterMode: 'none',
      minSpan: 5,
      zoomOnMouseWheel: true,
      moveOnMouseMove: true,
      moveOnMouseWheel: true,
      preventDefaultMouseMove: true,
    }],
    grid: { left: 62, right: 28, top: 24, bottom: 58, outerBoundsMode: 'same' },
    tooltip: {
      trigger: 'item',
      backgroundColor: '#16231e',
      borderColor: '#52675d',
      textStyle: { color: COLORS.ink },
      valueFormatter: (value: unknown) => formatChartValue(value, approxDigits),
    },
    textStyle: { color: COLORS.ink, fontFamily: 'IBM Plex Mono, monospace' },
  };
}

function axisStyleFor(approxDigits: number) {
  return {
    ...axisStyle,
    axisLabel: {
      ...axisStyle.axisLabel,
      formatter: (value: string | number) => typeof value === 'number'
        ? formatChartNumber(value, approxDigits)
        : value,
    },
  };
}

function histogramOption(
  view: StatisticsWeightedDataVisualizationV1,
  binCount: StatisticsHistogramBinCount,
  approxDigits: number,
): StatisticsEChartOption {
  const bins = buildStatisticsHistogramBins(view.weightedValues, binCount, approxDigits);
  return {
    ...baseOptionFor(approxDigits),
    aria: { enabled: true, description: view.ariaDescription },
    xAxis: {
      ...axisStyleFor(approxDigits),
      type: 'category',
      name: view.xLabel,
      nameLocation: 'middle',
      nameGap: 40,
      data: bins.map((bin) => bin.label),
      axisLabel: { color: COLORS.muted, hideOverlap: true },
    },
    yAxis: { ...axisStyleFor(approxDigits), type: 'value', name: view.yLabel, minInterval: 1 },
    series: [{
      type: 'bar',
      name: 'Frequency',
      data: bins.map((bin) => ({
        value: bin.frequency,
        name: bin.label,
        itemStyle: { color: COLORS.base },
      })),
      barMaxWidth: 72,
    }],
  };
}

function frequencyBarsOption(
  view: StatisticsWeightedDataVisualizationV1,
  approxDigits: number,
): StatisticsEChartOption {
  const groups = buildStatisticsFrequencyBarGroups(view.weightedValues, approxDigits);
  const labels = groups.map((group) => group.label);
  return {
    ...baseOptionFor(approxDigits),
    aria: { enabled: true, description: view.ariaDescription },
    xAxis: {
      ...axisStyleFor(approxDigits),
      type: 'category',
      name: view.xLabel,
      nameLocation: 'middle',
      nameGap: 40,
      data: labels,
      axisLabel: { color: COLORS.muted, hideOverlap: true },
    },
    yAxis: { ...axisStyleFor(approxDigits), type: 'value', name: view.yLabel, minInterval: 1 },
    series: [{
      type: 'bar',
      name: groups.length === view.weightedValues.length ? 'Frequency' : 'Aggregated frequency',
      data: groups.map((group, index) => ({
        value: group.frequency,
        name: labels[index],
        itemStyle: { color: COLORS.base },
      })),
      barMaxWidth: 56,
    }],
  };
}

function boxPlotOption(
  view: StatisticsWeightedDataVisualizationV1,
  approxDigits: number,
): StatisticsEChartOption {
  const summary = view.boxSummary;
  if (!summary) return histogramOption(view, 'auto', approxDigits);
  return {
    ...baseOptionFor(approxDigits),
    aria: { enabled: true, description: view.ariaDescription },
    grid: { left: 42, right: 32, top: 36, bottom: 58, outerBoundsMode: 'same' },
    xAxis: {
      ...axisStyleFor(approxDigits),
      type: 'value',
      scale: true,
      name: view.xLabel,
      nameLocation: 'middle',
      nameGap: 38,
    },
    yAxis: { ...axisStyleFor(approxDigits), type: 'category', data: ['Dataset'] },
    series: [
      {
        type: 'boxplot',
        name: 'Five-number summary',
        layout: 'horizontal',
        data: [[
          summary.lowerWhisker,
          summary.q1,
          summary.median,
          summary.q3,
          summary.upperWhisker,
        ]],
        itemStyle: { color: COLORS.base, borderColor: COLORS.ink },
      },
      {
        type: 'scatter',
        name: 'Potential outliers',
        data: summary.outliers.map((value) => [value, 'Dataset']),
        symbol: 'diamond',
        symbolSize: 11,
        itemStyle: { color: COLORS.outlier },
      },
    ],
  };
}

function probabilityBarsOption(
  view: Extract<StatisticsVisualizationViewV1, { kind: 'probabilityBars' }>,
  approxDigits: number,
): StatisticsEChartOption {
  const labels = view.points.map((point) => point.label ?? formatChartNumber(point.x, approxDigits));
  return {
    ...baseOptionFor(approxDigits),
    aria: { enabled: true, description: view.ariaDescription },
    xAxis: {
      ...axisStyleFor(approxDigits),
      type: 'category',
      name: view.xLabel,
      nameLocation: 'middle',
      nameGap: 40,
      data: labels,
      axisLabel: { color: COLORS.muted, hideOverlap: true },
    },
    yAxis: { ...axisStyleFor(approxDigits), type: 'value', name: view.yLabel },
    series: [{
      type: 'bar',
      name: 'Probability mass',
      data: view.points.map((point, index) => ({
        value: point.probability,
        name: labels[index],
        itemStyle: {
          color: point.selected ? COLORS.selected : COLORS.base,
          borderColor: point.selected ? COLORS.ink : COLORS.base,
          borderWidth: point.selected ? 2 : 0,
          ...(point.selected ? {
            decal: {
              symbol: 'rect',
              dashArrayX: [2, 2],
              dashArrayY: [3, 3],
              color: 'rgba(17, 30, 28, 0.38)',
            },
          } : {}),
        },
      })),
      barMaxWidth: 48,
    }],
  };
}

function normalCurveOption(
  view: Extract<StatisticsVisualizationViewV1, { kind: 'normalCurve' }>,
  approxDigits: number,
): StatisticsEChartOption {
  const selectedData = view.points.map((point) => (
    point.selected ? [point.x, point.density] : [point.x, null]
  ));
  const markerSeries = view.marker ? [{
    type: 'scatter' as const,
    name: view.marker.label,
    data: [[view.marker.x, view.marker.density]],
    symbol: 'diamond',
    symbolSize: 12,
    itemStyle: { color: COLORS.selected },
  }] : [];
  return {
    ...baseOptionFor(approxDigits),
    aria: { enabled: true, description: view.ariaDescription },
    xAxis: {
      ...axisStyleFor(approxDigits),
      type: 'value',
      scale: true,
      name: view.xLabel,
      nameLocation: 'middle',
      nameGap: 38,
    },
    yAxis: { ...axisStyleFor(approxDigits), type: 'value', name: view.yLabel, min: 0 },
    series: [
      {
        type: 'line',
        name: 'Density',
        data: view.points.map((point) => [point.x, point.density]),
        showSymbol: false,
        lineStyle: { color: COLORS.curve, width: 2 },
      },
      {
        type: 'line',
        name: 'Selected probability region',
        data: selectedData,
        showSymbol: false,
        connectNulls: false,
        lineStyle: { color: COLORS.selected, width: 2 },
        areaStyle: { color: 'rgba(210, 170, 78, 0.42)' },
      },
      ...markerSeries,
    ],
  };
}

function pairedPointsOption(
  view: Extract<StatisticsVisualizationViewV1, { kind: 'scatterFit' | 'correlationScatter' }>,
  approxDigits: number,
): StatisticsEChartOption {
  const fittedSeries = view.kind === 'scatterFit' && view.fittedLine ? [{
    type: 'line' as const,
    name: 'Fitted line',
    data: [
      [view.fittedLine.start.x, view.fittedLine.start.y],
      [view.fittedLine.end.x, view.fittedLine.end.y],
    ],
    showSymbol: false,
    lineStyle: { color: COLORS.selected, width: 2 },
  }] : [];
  return {
    ...baseOptionFor(approxDigits),
    aria: { enabled: true, description: view.ariaDescription },
    xAxis: {
      ...axisStyleFor(approxDigits),
      type: 'value',
      name: view.xLabel,
      nameLocation: 'middle',
      nameGap: 38,
    },
    yAxis: { ...axisStyleFor(approxDigits), type: 'value', name: view.yLabel },
    series: [
      {
        type: 'scatter',
        name: 'Observed points',
        data: view.points.map((point) => [point.x, point.y]),
        symbolSize: 10,
        itemStyle: { color: COLORS.base, borderColor: COLORS.ink, borderWidth: 1 },
      },
      ...fittedSeries,
    ],
  };
}

function residualOption(
  view: Extract<StatisticsVisualizationViewV1, { kind: 'residuals' }>,
  approxDigits: number,
): StatisticsEChartOption {
  const xValues = view.points.map((point) => point.x);
  const start = Math.min(...xValues);
  const end = Math.max(...xValues);
  return {
    ...baseOptionFor(approxDigits),
    aria: { enabled: true, description: view.ariaDescription },
    xAxis: {
      ...axisStyleFor(approxDigits),
      type: 'value',
      name: view.xLabel,
      nameLocation: 'middle',
      nameGap: 38,
    },
    yAxis: { ...axisStyleFor(approxDigits), type: 'value', name: view.yLabel },
    series: [
      {
        type: 'line',
        name: 'Zero residual',
        data: [[start, 0], [end, 0]],
        showSymbol: false,
        lineStyle: { color: COLORS.muted, width: 1, type: 'dashed' },
      },
      {
        type: 'scatter',
        name: 'Residuals',
        data: view.points.map((point) => [point.x, point.residual]),
        symbolSize: 10,
        itemStyle: { color: COLORS.outlier },
      },
    ],
  };
}

function confidenceIntervalOption(
  view: Extract<StatisticsVisualizationViewV1, { kind: 'confidenceInterval' }>,
  approxDigits: number,
): StatisticsEChartOption {
  return {
    ...baseOptionFor(approxDigits),
    aria: { enabled: true, description: view.ariaDescription },
    grid: { left: 42, right: 32, top: 36, bottom: 58, outerBoundsMode: 'same' },
    xAxis: {
      ...axisStyleFor(approxDigits),
      type: 'value',
      scale: true,
      name: view.xLabel,
      nameLocation: 'middle',
      nameGap: 38,
    },
    yAxis: { ...axisStyleFor(approxDigits), type: 'category', data: ['Interval'] },
    series: [
      {
        type: 'line',
        name: `${view.confidenceLevel * 100}% confidence interval`,
        data: [[view.lower, 'Interval'], [view.upper, 'Interval']],
        symbol: 'diamond',
        symbolSize: 12,
        lineStyle: { color: COLORS.base, width: 5 },
        itemStyle: { color: COLORS.base },
      },
      {
        type: 'scatter',
        name: 'Sample mean',
        data: [[view.estimate, 'Interval']],
        symbol: 'circle',
        symbolSize: 15,
        itemStyle: { color: COLORS.selected, borderColor: COLORS.ink, borderWidth: 2 },
      },
    ],
  };
}

function testDistributionOption(
  view: Extract<StatisticsVisualizationViewV1, { kind: 'testDistribution' }>,
  approxDigits: number,
): StatisticsEChartOption {
  const minimum = view.points[0]?.t ?? -4;
  const maximum = view.points.at(-1)?.t ?? 4;
  const maximumDensity = Math.max(...view.points.map((point) => point.density), 0);
  const statistic = view.statistic === 'negativeInfinity'
    ? minimum
    : view.statistic === 'positiveInfinity'
      ? maximum
      : view.statistic;
  const referenceLines = [
    ...view.criticalValues.map((critical, index) => ({
      type: 'line' as const,
      name: `Critical value ${index + 1}`,
      data: [[critical, 0], [critical, maximumDensity]],
      showSymbol: false,
      lineStyle: { color: COLORS.outlier, width: 1, type: 'dashed' as const },
    })),
    {
      type: 'line' as const,
      name: 'Test statistic',
      data: [[statistic, 0], [statistic, maximumDensity]],
      showSymbol: false,
      lineStyle: { color: COLORS.selected, width: 2 },
    },
  ];
  return {
    ...baseOptionFor(approxDigits),
    aria: { enabled: true, description: view.ariaDescription },
    xAxis: {
      ...axisStyleFor(approxDigits),
      type: 'value',
      name: view.xLabel,
      nameLocation: 'middle',
      nameGap: 38,
      min: minimum,
      max: maximum,
      axisLabel: {
        color: COLORS.muted,
        formatter: (value: number) => formatChartNumber(value, approxDigits),
      },
    },
    yAxis: { ...axisStyleFor(approxDigits), type: 'value', name: view.yLabel, min: 0 },
    series: [
      {
        type: 'line',
        name: 'Student-t density',
        data: view.points.map((point) => [point.t, point.density]),
        showSymbol: false,
        lineStyle: { color: COLORS.curve, width: 2 },
      },
      {
        type: 'line',
        name: 'P-value region',
        data: view.points.map((point) => (
          point.pValueRegion ? [point.t, point.density] : [point.t, null]
        )),
        showSymbol: false,
        connectNulls: false,
        lineStyle: { color: COLORS.selected, width: 2 },
        areaStyle: { color: 'rgba(210, 170, 78, 0.42)' },
      },
      ...referenceLines,
    ],
  };
}

export function statisticsChartOption(
  view: StatisticsVisualizationViewV1,
  histogramBinCount: StatisticsHistogramBinCount,
  approxDigits = 6,
): StatisticsEChartOption {
  switch (view.kind) {
    case 'histogram':
      return histogramOption(view, histogramBinCount, approxDigits);
    case 'boxPlot':
      return boxPlotOption(view, approxDigits);
    case 'frequencyBars':
      return frequencyBarsOption(view, approxDigits);
    case 'probabilityBars':
      return probabilityBarsOption(view, approxDigits);
    case 'normalCurve':
      return normalCurveOption(view, approxDigits);
    case 'scatterFit':
    case 'correlationScatter':
      return pairedPointsOption(view, approxDigits);
    case 'residuals':
      return residualOption(view, approxDigits);
    case 'confidenceInterval':
      return confidenceIntervalOption(view, approxDigits);
    case 'testDistribution':
      return testDistributionOption(view, approxDigits);
  }
}
