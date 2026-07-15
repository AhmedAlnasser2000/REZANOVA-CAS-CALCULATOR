import type {
  CoreDraftState,
  StatisticsScreen,
  StatisticsSection,
} from '../../types/calculator';
import { datasetTextFromValues } from '../../lib/statistics/runtime-request';
import { cloneStatisticsVisualizationPayloadV1 } from '../../lib/statistics/visualization-contract';
import {
  DEFAULT_BINOMIAL_STATE,
  DEFAULT_NORMAL_STATE,
  DEFAULT_POISSON_STATE,
  DEFAULT_STATISTICS_RELATIONSHIPS_STATE,
  DEFAULT_STATISTICS_DATA_SUMMARY_STATE,
} from '../../lib/statistics/examples';
import {
  defaultStatisticsScreenForSection,
  statisticsSectionForScreen,
  statisticsWorkspaceScreenForLegacyScreen,
} from '../../lib/statistics/navigation';
import type { StatisticsSurfaceState } from './workspace-surface-state';

type StatisticsMenuScreen = 'home' | 'probabilityHome' | 'inferenceHome';

function copyStatisticsMenuSelection(selection: Record<StatisticsMenuScreen, number>) {
  return { home: selection.home, probabilityHome: selection.probabilityHome, inferenceHome: selection.inferenceHome };
}

function copyCoreDraftState(state: CoreDraftState): CoreDraftState {
  return { ...state };
}

function copyStatisticsSectionResults(
  results: StatisticsSurfaceState['statisticsSectionResults'],
): StatisticsSurfaceState['statisticsSectionResults'] {
  return Object.fromEntries(Object.entries(results).map(([section, entry]) => [
    section,
    entry
      ? {
          ...entry,
          ...(entry.visualization
            ? { visualization: cloneStatisticsVisualizationPayloadV1(entry.visualization) }
            : {}),
        }
      : entry,
  ]));
}

export function defaultStatisticsSectionScreens(): Record<StatisticsSection, StatisticsScreen> {
  return {
    dataSummary: defaultStatisticsScreenForSection('dataSummary'),
    probability: defaultStatisticsScreenForSection('probability'),
    inference: defaultStatisticsScreenForSection('inference'),
    relationships: defaultStatisticsScreenForSection('relationships'),
  };
}

export function copyStatisticsSurfaceState(state: StatisticsSurfaceState): StatisticsSurfaceState {
  const statisticsScreen = statisticsWorkspaceScreenForLegacyScreen(state.statisticsScreen);
  const statisticsSection = state.statisticsSection ?? statisticsSectionForScreen(statisticsScreen);
  const legacyRelationshipsState = statisticsScreen === 'correlation'
    ? state.correlationState
    : state.regressionState;
  const relationshipsState = state.relationshipsState
    ?? (legacyRelationshipsState
      ? {
          analysis: statisticsScreen === 'correlation' ? 'correlation' : 'regression',
          points: legacyRelationshipsState.points,
        }
      : DEFAULT_STATISTICS_RELATIONSHIPS_STATE);
  return {
    ...state,
    statisticsScreen,
    statisticsSection,
    statisticsInputMode: state.statisticsInputMode ?? 'guided',
    statisticsResultViewMode: state.statisticsResultViewMode ?? 'contained',
    statisticsSelectedVisualizations: { ...state.statisticsSelectedVisualizations },
    statisticsHistogramBinCount: state.statisticsHistogramBinCount ?? 'auto',
    statisticsExpressionDraftInitialized:
      state.statisticsExpressionDraftInitialized
      ?? state.statisticsDraftState.source === 'manual',
    statisticsSectionScreens: {
      ...defaultStatisticsSectionScreens(),
      ...state.statisticsSectionScreens,
      [statisticsSection]: statisticsScreen,
    },
    statisticsSectionResults: copyStatisticsSectionResults(state.statisticsSectionResults),
    statisticsMenuSelection: copyStatisticsMenuSelection(state.statisticsMenuSelection),
    statisticsSourceSyncState: { ...state.statisticsSourceSyncState },
    statsDataset: { values: [...state.statsDataset.values] },
    statisticsDatasetDraftText:
      state.statisticsDatasetDraftText ?? datasetTextFromValues(state.statsDataset.values),
    frequencyTable: { rows: state.frequencyTable.rows.map((row) => ({ ...row })) },
    dataSummaryState: { ...(state.dataSummaryState ?? DEFAULT_STATISTICS_DATA_SUMMARY_STATE) },
    binomialState: { ...DEFAULT_BINOMIAL_STATE, ...state.binomialState },
    normalState: { ...DEFAULT_NORMAL_STATE, ...state.normalState },
    poissonState: { ...DEFAULT_POISSON_STATE, ...state.poissonState },
    meanInferenceState: {
      ...state.meanInferenceState,
      alternative: state.meanInferenceState.alternative ?? 'twoSided',
    },
    relationshipsState: {
      analysis: relationshipsState.analysis,
      points: relationshipsState.points.map((point) => ({ ...point })),
    },
    statisticsDraftState: copyCoreDraftState(state.statisticsDraftState),
  };
}
