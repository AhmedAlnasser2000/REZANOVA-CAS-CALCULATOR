import type { CoreDraftState } from '../../types/calculator';
import type { StatisticsSurfaceState } from './workspace-surface-state';

type StatisticsMenuScreen = 'home' | 'probabilityHome' | 'inferenceHome';

function copyStatisticsMenuSelection(selection: Record<StatisticsMenuScreen, number>) {
  return { home: selection.home, probabilityHome: selection.probabilityHome, inferenceHome: selection.inferenceHome };
}

function copyCoreDraftState(state: CoreDraftState): CoreDraftState {
  return { ...state };
}

export function copyStatisticsSurfaceState(state: StatisticsSurfaceState): StatisticsSurfaceState {
  return {
    ...state,
    statisticsMenuSelection: copyStatisticsMenuSelection(state.statisticsMenuSelection),
    statisticsSourceSyncState: { ...state.statisticsSourceSyncState },
    statsDataset: { values: [...state.statsDataset.values] },
    frequencyTable: { rows: state.frequencyTable.rows.map((row) => ({ ...row })) },
    binomialState: { ...state.binomialState },
    normalState: { ...state.normalState },
    poissonState: { ...state.poissonState },
    meanInferenceState: { ...state.meanInferenceState },
    regressionState: { points: state.regressionState.points.map((point) => ({ ...point })) },
    correlationState: { points: state.correlationState.points.map((point) => ({ ...point })) },
    statisticsDraftState: copyCoreDraftState(state.statisticsDraftState),
  };
}
