import type { Dispatch, SetStateAction } from 'react';
import { statisticsSectionForScreen } from '../../lib/statistics/navigation';
import type { StatisticsSection } from '../../types/calculator';
import type { WorkspaceInstanceRuntimeContext } from '../../types/calculator/workspace-instance-types';
import { copyStatisticsSurfaceState } from './statistics-surface-state';
import type { StatisticsSurfaceState } from './workspace-surface-state';
import type {
  WorkspaceInstance,
  WorkspaceInstanceStateSlot,
} from './workspace-instances';

type SectionResults = StatisticsSurfaceState['statisticsSectionResults'];
type SectionResult = NonNullable<SectionResults[StatisticsSection]>;

function statisticsSurfaceState(value: WorkspaceInstanceStateSlot) {
  return value
    && typeof value === 'object'
    && 'statisticsScreen' in value
      ? value as StatisticsSurfaceState
      : null;
}

export function statisticsSectionIsActiveInOrigin(options: {
  activeSection: StatisticsSection;
  originWorkspace: WorkspaceInstanceRuntimeContext | null;
  originSection: StatisticsSection;
  getActiveWorkspace?: () => WorkspaceInstanceRuntimeContext | null;
  getWorkspaceInstances?: () => readonly WorkspaceInstance[];
}) {
  const { activeSection, originWorkspace, originSection } = options;
  if (!originWorkspace) return activeSection === originSection;

  const activeWorkspace = options.getActiveWorkspace?.() ?? null;
  if (activeWorkspace?.workspaceInstanceId === originWorkspace.workspaceInstanceId) {
    return activeSection === originSection;
  }

  const originSurface = statisticsSurfaceState(options.getWorkspaceInstances?.().find(
    (instance) => instance.id === originWorkspace.workspaceInstanceId,
  )?.surfaceState ?? null);
  return Boolean(originSurface && (
    originSurface.statisticsSection
      ?? statisticsSectionForScreen(originSurface.statisticsScreen)
  ) === originSection);
}

export function cacheStatisticsSectionOutcome(options: {
  originWorkspace: WorkspaceInstanceRuntimeContext | null;
  originSection: StatisticsSection;
  entry: SectionResult;
  getActiveWorkspace?: () => WorkspaceInstanceRuntimeContext | null;
  getWorkspaceInstances?: () => readonly WorkspaceInstance[];
  setActiveResults: Dispatch<SetStateAction<SectionResults>>;
  updateWorkspaceSurface?: (workspaceInstanceId: string, state: WorkspaceInstanceStateSlot) => void;
}) {
  const activeWorkspace = options.getActiveWorkspace?.() ?? null;
  if (!options.originWorkspace
    || activeWorkspace?.workspaceInstanceId === options.originWorkspace.workspaceInstanceId) {
    options.setActiveResults((currentResults) => ({
      ...currentResults,
      [options.originSection]: options.entry,
    }));
    return;
  }

  const originSurface = statisticsSurfaceState(options.getWorkspaceInstances?.().find(
    (instance) => instance.id === options.originWorkspace?.workspaceInstanceId,
  )?.surfaceState ?? null);
  if (!originSurface) return;

  const copy = copyStatisticsSurfaceState(originSurface);
  options.updateWorkspaceSurface?.(options.originWorkspace.workspaceInstanceId, {
    ...copy,
    statisticsSectionResults: {
      ...copy.statisticsSectionResults,
      [options.originSection]: options.entry,
    },
  });
}
