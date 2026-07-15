import type {
  BinomialState,
  CorrelationState,
  FrequencyTable,
  MeanInferenceState,
  NormalState,
  PoissonState,
  RegressionState,
  StatisticsScreen,
  StatisticsDataSummaryState,
  StatisticsRelationshipsState,
  StatisticsWorkingSource,
  StatsDataset,
} from '../../types/calculator';
import { buildStatisticsStructuredDraft, serializeStatisticsRequest } from './serializer';

export const DEFAULT_STATS_DATASET: StatsDataset = {
  values: ['12', '15', '15', '18', '20'],
};

export const DEFAULT_FREQUENCY_TABLE: FrequencyTable = {
  rows: [
    { value: '1', frequency: '2' },
    { value: '2', frequency: '3' },
  ],
};

export const DEFAULT_STATISTICS_DATA_SUMMARY_STATE: StatisticsDataSummaryState = {
  analysis: 'descriptive',
  quartiles: 'halves',
  context: 'compare',
};

export const DEFAULT_BINOMIAL_STATE: BinomialState = {
  n: '10',
  p: '0.5',
  x: '3',
  event: 'exactly',
  lower: '2',
  upper: '5',
  lowerBound: 'inclusive',
  upperBound: 'inclusive',
  mode: 'pmf',
};

export const DEFAULT_NORMAL_STATE: NormalState = {
  mean: '0',
  standardDeviation: '1',
  x: '1.96',
  event: 'atMost',
  lower: '-1',
  upper: '1',
  lowerBound: 'inclusive',
  upperBound: 'inclusive',
  mode: 'cdf',
};

export const DEFAULT_POISSON_STATE: PoissonState = {
  lambda: '4',
  x: '2',
  event: 'exactly',
  lower: '2',
  upper: '5',
  lowerBound: 'inclusive',
  upperBound: 'inclusive',
  mode: 'pmf',
};

export const DEFAULT_MEAN_INFERENCE_STATE: MeanInferenceState = {
  mode: 'ci',
  level: '0.95',
  mu0: '15',
};

export const DEFAULT_REGRESSION_STATE: RegressionState = {
  points: [
    { x: '1', y: '2' },
    { x: '2', y: '4' },
    { x: '3', y: '6' },
  ],
};

export const DEFAULT_CORRELATION_STATE: CorrelationState = {
  points: [
    { x: '1', y: '2' },
    { x: '2', y: '5' },
    { x: '3', y: '7' },
  ],
};

export const DEFAULT_STATISTICS_RELATIONSHIPS_STATE: StatisticsRelationshipsState = {
  analysis: 'regression',
  points: DEFAULT_REGRESSION_STATE.points.map((point) => ({ ...point })),
};

export function buildStatisticsInputLatex(
  screen: StatisticsScreen,
  state: {
    dataset: StatsDataset;
    frequencyTable: FrequencyTable;
    dataSummary: StatisticsDataSummaryState;
    binomial: BinomialState;
    normal: NormalState;
    poisson: PoissonState;
    meanInference: MeanInferenceState;
    regression: RegressionState;
    correlation: CorrelationState;
  },
  workingSource: StatisticsWorkingSource = 'dataset',
) {
  return buildStatisticsStructuredDraft(screen, state, workingSource);
}

export function defaultStatisticsDraftForScreen(
  screen: StatisticsScreen,
  workingSource: StatisticsWorkingSource = screen === 'frequency' ? 'frequencyTable' : 'dataset',
) {
  switch (screen) {
    case 'home':
    case 'probabilityHome':
    case 'inferenceHome':
      return '';
    case 'dataEntry':
      return serializeStatisticsRequest({
        kind: 'dataset',
        values: DEFAULT_STATS_DATASET.values,
      });
    case 'descriptive':
      return workingSource === 'frequencyTable'
        ? serializeStatisticsRequest({
            kind: 'descriptive',
            source: 'frequencyTable',
            rows: DEFAULT_FREQUENCY_TABLE.rows,
            quartiles: DEFAULT_STATISTICS_DATA_SUMMARY_STATE.quartiles,
            context: DEFAULT_STATISTICS_DATA_SUMMARY_STATE.context,
          })
        : serializeStatisticsRequest({
            kind: 'descriptive',
            source: 'dataset',
            values: DEFAULT_STATS_DATASET.values,
            quartiles: DEFAULT_STATISTICS_DATA_SUMMARY_STATE.quartiles,
            context: DEFAULT_STATISTICS_DATA_SUMMARY_STATE.context,
          });
    case 'frequency':
      return workingSource === 'frequencyTable'
        ? serializeStatisticsRequest({
            kind: 'frequency',
            source: 'frequencyTable',
            rows: DEFAULT_FREQUENCY_TABLE.rows,
          })
        : serializeStatisticsRequest({
            kind: 'frequency',
            source: 'dataset',
            values: DEFAULT_STATS_DATASET.values,
          });
    case 'meanInference':
      return workingSource === 'frequencyTable'
        ? serializeStatisticsRequest({
            kind: 'meanInference',
            source: 'frequencyTable',
            rows: DEFAULT_FREQUENCY_TABLE.rows,
            mode: DEFAULT_MEAN_INFERENCE_STATE.mode,
            level: DEFAULT_MEAN_INFERENCE_STATE.level,
          })
        : serializeStatisticsRequest({
            kind: 'meanInference',
            source: 'dataset',
            values: DEFAULT_STATS_DATASET.values,
            mode: DEFAULT_MEAN_INFERENCE_STATE.mode,
            level: DEFAULT_MEAN_INFERENCE_STATE.level,
          });
    default:
      return buildStatisticsStructuredDraft(
        screen,
        {
          dataset: DEFAULT_STATS_DATASET,
          frequencyTable: DEFAULT_FREQUENCY_TABLE,
          dataSummary: DEFAULT_STATISTICS_DATA_SUMMARY_STATE,
          binomial: DEFAULT_BINOMIAL_STATE,
          normal: DEFAULT_NORMAL_STATE,
          poisson: DEFAULT_POISSON_STATE,
          meanInference: DEFAULT_MEAN_INFERENCE_STATE,
          regression: DEFAULT_REGRESSION_STATE,
          correlation: DEFAULT_CORRELATION_STATE,
        },
        workingSource,
      );
  }
}
