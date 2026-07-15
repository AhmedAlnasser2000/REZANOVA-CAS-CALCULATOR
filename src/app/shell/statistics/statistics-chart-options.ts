import type {
  StatisticsHistogramBinCount,
  StatisticsVisualizationViewV1,
  StatisticsWeightedDataVisualizationV1,
} from '../../../types/calculator';
import type { StatisticsEChartOption } from './statistics-echarts';
import { buildStatisticsHistogramBins } from './statistics-histogram';

const COLORS = {
  ink: '#dce7df',
  muted: '#a9b8af',
  grid: 'rgba(184, 205, 192, 0.18)',
  base: '#79a993',
  selected: '#d2aa4e',
  curve: '#69a6c4',
  outlier: '#d27468',
};

const baseOption: StatisticsEChartOption = {
  animation: false,
  aria: { enabled: true },
  grid: { left: 62, right: 28, top: 24, bottom: 58, outerBoundsMode: 'same' },
  tooltip: {
    trigger: 'item',
    backgroundColor: '#16231e',
    borderColor: '#52675d',
    textStyle: { color: COLORS.ink },
  },
  textStyle: { color: COLORS.ink, fontFamily: 'IBM Plex Mono, monospace' },
};

const axisStyle = {
  axisLine: { lineStyle: { color: COLORS.muted } },
  axisLabel: { color: COLORS.muted },
  nameTextStyle: { color: COLORS.muted },
  splitLine: { lineStyle: { color: COLORS.grid } },
};

function histogramOption(
  view: StatisticsWeightedDataVisualizationV1,
  binCount: StatisticsHistogramBinCount,
): StatisticsEChartOption {
  const bins = buildStatisticsHistogramBins(view.weightedValues, binCount);
  return {
    ...baseOption,
    aria: { enabled: true, description: view.ariaDescription },
    xAxis: {
      ...axisStyle,
      type: 'category',
      name: view.xLabel,
      nameLocation: 'middle',
      nameGap: 40,
      data: bins.map((bin) => bin.label),
      axisLabel: { color: COLORS.muted, hideOverlap: true },
    },
    yAxis: { ...axisStyle, type: 'value', name: view.yLabel, minInterval: 1 },
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

function frequencyBarsOption(view: StatisticsWeightedDataVisualizationV1): StatisticsEChartOption {
  const limit = 120;
  const width = Math.max(1, Math.ceil(view.weightedValues.length / limit));
  const groups = Array.from(
    { length: Math.ceil(view.weightedValues.length / width) },
    (_, index) => view.weightedValues.slice(index * width, (index + 1) * width),
  );
  const labels = groups.map((group) => group.length === 1
    ? String(group[0].value)
    : `${group[0].value}-${group[group.length - 1].value}`);
  return {
    ...baseOption,
    aria: { enabled: true, description: view.ariaDescription },
    xAxis: {
      ...axisStyle,
      type: 'category',
      name: view.xLabel,
      nameLocation: 'middle',
      nameGap: 40,
      data: labels,
      axisLabel: { color: COLORS.muted, hideOverlap: true },
    },
    yAxis: { ...axisStyle, type: 'value', name: view.yLabel, minInterval: 1 },
    series: [{
      type: 'bar',
      name: width === 1 ? 'Frequency' : 'Aggregated frequency',
      data: groups.map((group, index) => ({
        value: group.reduce((sum, point) => sum + point.weight, 0),
        name: labels[index],
        itemStyle: { color: COLORS.base },
      })),
      barMaxWidth: 56,
    }],
  };
}

function boxPlotOption(view: StatisticsWeightedDataVisualizationV1): StatisticsEChartOption {
  const summary = view.boxSummary;
  if (!summary) return histogramOption(view, 'auto');
  return {
    ...baseOption,
    aria: { enabled: true, description: view.ariaDescription },
    grid: { left: 42, right: 32, top: 36, bottom: 58, outerBoundsMode: 'same' },
    xAxis: {
      ...axisStyle,
      type: 'value',
      name: view.xLabel,
      nameLocation: 'middle',
      nameGap: 38,
    },
    yAxis: { ...axisStyle, type: 'category', data: ['Dataset'] },
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
): StatisticsEChartOption {
  const labels = view.points.map((point) => point.label ?? String(point.x));
  return {
    ...baseOption,
    aria: { enabled: true, description: view.ariaDescription },
    xAxis: {
      ...axisStyle,
      type: 'category',
      name: view.xLabel,
      nameLocation: 'middle',
      nameGap: 40,
      data: labels,
      axisLabel: { color: COLORS.muted, hideOverlap: true },
    },
    yAxis: { ...axisStyle, type: 'value', name: view.yLabel },
    series: [{
      type: 'bar',
      name: 'Probability mass',
      data: view.points.map((point, index) => ({
        value: point.probability,
        name: labels[index],
        itemStyle: {
          color: point.selected ? COLORS.selected : COLORS.base,
          borderColor: point.selected ? COLORS.ink : COLORS.base,
          borderWidth: point.selected ? 1 : 0,
        },
      })),
      barMaxWidth: 48,
    }],
  };
}

function normalCurveOption(
  view: Extract<StatisticsVisualizationViewV1, { kind: 'normalCurve' }>,
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
    ...baseOption,
    aria: { enabled: true, description: view.ariaDescription },
    xAxis: {
      ...axisStyle,
      type: 'value',
      name: view.xLabel,
      nameLocation: 'middle',
      nameGap: 38,
    },
    yAxis: { ...axisStyle, type: 'value', name: view.yLabel, min: 0 },
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

export function statisticsChartOption(
  view: StatisticsVisualizationViewV1,
  histogramBinCount: StatisticsHistogramBinCount,
): StatisticsEChartOption {
  switch (view.kind) {
    case 'histogram':
      return histogramOption(view, histogramBinCount);
    case 'boxPlot':
      return boxPlotOption(view);
    case 'frequencyBars':
      return frequencyBarsOption(view);
    case 'probabilityBars':
      return probabilityBarsOption(view);
    case 'normalCurve':
      return normalCurveOption(view);
    default:
      return { ...baseOption, aria: { enabled: true, description: view.ariaDescription } };
  }
}
