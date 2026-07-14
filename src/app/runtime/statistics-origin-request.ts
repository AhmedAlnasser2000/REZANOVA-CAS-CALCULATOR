import { buildStatisticsInputLatex } from '../../lib/statistics/examples';
import { getStatisticsMenuEntryAtIndex } from '../../lib/statistics/navigation';
import type { RunStatisticsRuntimeRequest } from '../../lib/statistics/runtime-request';
import type { StatisticsScreen } from '../../types/calculator';
import type { StatisticsSurfaceState } from './workspace-surface-state';
import type {
  WorkspaceInstance,
  WorkspaceInstanceStateSlot,
} from './workspace-instances';

function isStatisticsSurfaceState(
  value: WorkspaceInstanceStateSlot,
): value is StatisticsSurfaceState {
  return typeof value === 'object'
    && value !== null
    && typeof (value as StatisticsSurfaceState).statisticsScreen === 'string';
}

function statisticsLeafScreenForSurfaceState(state: StatisticsSurfaceState): StatisticsScreen {
  if (state.statisticsScreen === 'probabilityHome') {
    return getStatisticsMenuEntryAtIndex(
      'probabilityHome',
      state.statisticsMenuSelection.probabilityHome,
    )?.target ?? 'binomial';
  }

  if (state.statisticsScreen === 'inferenceHome') {
    return getStatisticsMenuEntryAtIndex(
      'inferenceHome',
      state.statisticsMenuSelection.inferenceHome,
    )?.target ?? 'meanInference';
  }

  if (state.statisticsScreen === 'home') {
    const homeTarget = getStatisticsMenuEntryAtIndex(
      'home',
      state.statisticsMenuSelection.home,
    )?.target ?? 'dataEntry';
    if (homeTarget === 'probabilityHome') {
      return getStatisticsMenuEntryAtIndex(
        'probabilityHome',
        state.statisticsMenuSelection.probabilityHome,
      )?.target ?? 'binomial';
    }
    if (homeTarget === 'inferenceHome') {
      return getStatisticsMenuEntryAtIndex(
        'inferenceHome',
        state.statisticsMenuSelection.inferenceHome,
      )?.target ?? 'meanInference';
    }
    return homeTarget;
  }

  return state.statisticsScreen;
}

export function statisticsRequestFromSurfaceState(
  surfaceState: WorkspaceInstanceStateSlot,
  instance: WorkspaceInstance,
) {
  if (
    instance.workspaceKind !== 'statistics'
    || !isStatisticsSurfaceState(surfaceState)
  ) {
    return null;
  }

  const screenHint = statisticsLeafScreenForSurfaceState(surfaceState);
  const workingSourceHint = surfaceState.statisticsWorkingSource;
  const surfaceSnapshot = {
    dataset: surfaceState.statsDataset,
    frequencyTable: surfaceState.frequencyTable,
    dataSummary: surfaceState.dataSummaryState,
    binomial: surfaceState.binomialState,
    normal: surfaceState.normalState,
    poisson: surfaceState.poissonState,
    meanInference: surfaceState.meanInferenceState,
    regression: surfaceState.regressionState,
    correlation: surfaceState.correlationState,
  };
  const inputLatex =
    surfaceState.statisticsDraftState.rawLatex.trim()
    || buildStatisticsInputLatex(screenHint, surfaceSnapshot, workingSourceHint);
  return inputLatex
    ? ({ inputLatex, screenHint, workingSourceHint } satisfies RunStatisticsRuntimeRequest)
    : null;
}

export function statisticsRequestFromSurfaceStateForScreen(
  surfaceState: WorkspaceInstanceStateSlot,
  instance: WorkspaceInstance,
  screenHint: StatisticsScreen,
  useExpressionDraft = false,
) {
  if (
    instance.workspaceKind !== 'statistics'
    || !isStatisticsSurfaceState(surfaceState)
  ) {
    return null;
  }

  const workingSourceHint = surfaceState.statisticsWorkingSource;
  const inputLatex = useExpressionDraft
    ? surfaceState.statisticsDraftState.rawLatex.trim()
    : buildStatisticsInputLatex(
        screenHint,
        {
          dataset: surfaceState.statsDataset,
          frequencyTable: surfaceState.frequencyTable,
          dataSummary: surfaceState.dataSummaryState,
          binomial: surfaceState.binomialState,
          normal: surfaceState.normalState,
          poisson: surfaceState.poissonState,
          meanInference: surfaceState.meanInferenceState,
          regression: surfaceState.regressionState,
          correlation: surfaceState.correlationState,
        },
        workingSourceHint,
      );
  return inputLatex
    ? ({ inputLatex, screenHint, workingSourceHint } satisfies RunStatisticsRuntimeRequest)
    : null;
}
