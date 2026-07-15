import type { MeanTestAlternative } from './mode-types';

export type StatisticsVisualizationKind =
  | 'histogram'
  | 'boxPlot'
  | 'frequencyBars'
  | 'probabilityBars'
  | 'normalCurve'
  | 'scatterFit'
  | 'residuals'
  | 'correlationScatter'
  | 'confidenceInterval'
  | 'testDistribution';

export type StatisticsHistogramBinCount = 'auto' | number;

export type StatisticsVisualizationTableV1 = {
  columns: readonly string[];
  rows: readonly (readonly (number | string)[])[];
  totalRows: number;
};

type StatisticsVisualizationViewBaseV1 = {
  title: string;
  xLabel: string;
  yLabel: string;
  ariaDescription: string;
  table: StatisticsVisualizationTableV1;
};

export type StatisticsWeightedDataVisualizationV1 = StatisticsVisualizationViewBaseV1 & {
  kind: 'histogram' | 'boxPlot' | 'frequencyBars';
  weightedValues: readonly { value: number; weight: number }[];
  boxSummary?: {
    min: number;
    q1: number;
    median: number;
    q3: number;
    max: number;
    lowerFence: number;
    upperFence: number;
    outliers: readonly number[];
  };
};

export type StatisticsDistributionBarsVisualizationV1 = StatisticsVisualizationViewBaseV1 & {
  kind: 'probabilityBars';
  distribution: 'binomial' | 'poisson';
  eventNotation: string;
  points: readonly {
    x: number;
    probability: number;
    selected: boolean;
    label?: string;
    aggregated?: boolean;
  }[];
  omittedMass: number;
};

export type StatisticsNormalCurveVisualizationV1 = StatisticsVisualizationViewBaseV1 & {
  kind: 'normalCurve';
  eventNotation: string;
  points: readonly { x: number; density: number; selected: boolean }[];
  marker?: { x: number; density: number; label: string };
};

export type StatisticsPairedPointsVisualizationV1 = StatisticsVisualizationViewBaseV1 & {
  kind: 'scatterFit' | 'correlationScatter';
  points: readonly { x: number; y: number }[];
  fittedLine?: {
    start: { x: number; y: number };
    end: { x: number; y: number };
  };
};

export type StatisticsResidualVisualizationV1 = StatisticsVisualizationViewBaseV1 & {
  kind: 'residuals';
  points: readonly { x: number; residual: number }[];
};

export type StatisticsConfidenceIntervalVisualizationV1 = StatisticsVisualizationViewBaseV1 & {
  kind: 'confidenceInterval';
  estimate: number;
  lower: number;
  upper: number;
  confidenceLevel: number;
};

export type StatisticsTestDistributionVisualizationV1 = StatisticsVisualizationViewBaseV1 & {
  kind: 'testDistribution';
  points: readonly { t: number; density: number; pValueRegion: boolean }[];
  statistic: number;
  criticalValues: readonly number[];
  alternative: MeanTestAlternative;
  pValue: number;
};

export type StatisticsVisualizationViewV1 =
  | StatisticsWeightedDataVisualizationV1
  | StatisticsDistributionBarsVisualizationV1
  | StatisticsNormalCurveVisualizationV1
  | StatisticsPairedPointsVisualizationV1
  | StatisticsResidualVisualizationV1
  | StatisticsConfidenceIntervalVisualizationV1
  | StatisticsTestDistributionVisualizationV1;

export type StatisticsVisualizationPayloadV1 = {
  version: 1;
  defaultKind: StatisticsVisualizationKind;
  views: readonly StatisticsVisualizationViewV1[];
};
