import { useCallback, useEffect, useMemo, useRef } from 'react';
import type {
  DisplayOutcome,
  ModeId,
} from '../../types/calculator';
import type { useWorkspaceInstancesRuntime } from './useWorkspaceInstancesRuntime';
import { useWorkspaceDisplayStateHostRuntime } from './useWorkspaceDisplayStateHostRuntime';
import { useWorkspaceSurfaceStateHostRuntime } from './useWorkspaceSurfaceStateHostRuntime';
import { useWorkspaceTabsRuntime } from './useWorkspaceTabsRuntime';
import { requestWorkspaceTabJobCancellation } from './workspaceTabJobs';
import type { WorkspaceInstanceStateSlot } from './workspace-instances';
import type { WorkspaceDisplayReplayVariableSubstitutions } from './workspace-display-state';
import type {
  CalculateSurfaceState,
  CalculusSurfaceState,
  EquationSurfaceState,
  GeometrySurfaceState,
  MatrixSurfaceState,
  StatisticsSurfaceState,
  TableSurfaceState,
  TrigonometrySurfaceState,
  VectorSurfaceState,
} from './workspace-surface-state';

type WorkspaceInstancesRuntime = ReturnType<typeof useWorkspaceInstancesRuntime>;
type WorkspaceDisplayHostRuntime = ReturnType<typeof useWorkspaceDisplayStateHostRuntime>;
type WorkspaceSurfaceHostRuntime = ReturnType<typeof useWorkspaceSurfaceStateHostRuntime>;

type SurfaceStateAdapter<TSurfaceState> = {
  captureSurfaceState: () => TSurfaceState;
  restoreSurfaceState: (state: TSurfaceState | null) => void;
};

type WorkspaceTabsShellRuntimeOptions = {
  commitVisibleModeSelection: (mode: ModeId) => void;
  currentMode: ModeId;
  discardPendingHistoryTicketsForWorkspaceInstance: (workspaceInstanceId: string) => void;
  labsEnabled: boolean;
  markPendingHistoryTicketsForWorkspaceInstanceAsStopping: (workspaceInstanceId: string) => void;
  pendingHistoryTickets: Parameters<typeof useWorkspaceTabsRuntime>[0]['pendingHistoryTickets'];
  setEditorRuntimeStatusOverride: (status: string | null) => void;
  workspaceInstances: WorkspaceInstancesRuntime;
  display: {
    ansLatex: string;
    captureDisplayState: () => WorkspaceInstanceStateSlot;
    displayOutcome: DisplayOutcome | null;
    replayVariableSubstitutions: WorkspaceDisplayReplayVariableSubstitutions;
    restoreDisplayState: (state: WorkspaceInstanceStateSlot) => void;
  };
  calculate: SurfaceStateAdapter<CalculateSurfaceState>;
  equation: SurfaceStateAdapter<EquationSurfaceState>;
  calculus: SurfaceStateAdapter<CalculusSurfaceState>;
  trigonometry: SurfaceStateAdapter<TrigonometrySurfaceState>;
  statistics: SurfaceStateAdapter<StatisticsSurfaceState>;
  geometry: SurfaceStateAdapter<GeometrySurfaceState>;
  table: SurfaceStateAdapter<TableSurfaceState>;
  matrix: SurfaceStateAdapter<MatrixSurfaceState>;
  vector: SurfaceStateAdapter<VectorSurfaceState>;
};

export function useWorkspaceTabsShellRuntime({
  calculus,
  calculate,
  commitVisibleModeSelection,
  currentMode,
  discardPendingHistoryTicketsForWorkspaceInstance,
  display,
  equation,
  geometry,
  labsEnabled,
  markPendingHistoryTicketsForWorkspaceInstanceAsStopping,
  matrix,
  pendingHistoryTickets,
  setEditorRuntimeStatusOverride,
  statistics,
  table,
  trigonometry,
  vector,
  workspaceInstances,
}: WorkspaceTabsShellRuntimeOptions) {
  const activeDisplayState = useMemo(() => ({
    ansLatex: display.ansLatex,
    displayOutcome: display.displayOutcome,
    replayVariableSubstitutions: display.replayVariableSubstitutions,
  }), [
    display.ansLatex,
    display.displayOutcome,
    display.replayVariableSubstitutions,
  ]);

  const workspaceDisplayHostRuntime = useWorkspaceDisplayStateHostRuntime({
    activeDisplayState,
    activeInstance: workspaceInstances.activeInstance,
    captureDisplayState: display.captureDisplayState,
    restoreDisplayState: display.restoreDisplayState,
    updateInstanceDisplayState: workspaceInstances.updateInstanceDisplayState,
  });
  const workspaceStateHostRuntime = useWorkspaceSurfaceStateHostRuntime({
    workspaceInstances,
    calculate,
    equation,
    calculus,
    trigonometry,
    statistics,
    geometry,
    table,
    matrix,
    vector,
  });
  const workspaceDisplayHostRef = useRef<WorkspaceDisplayHostRuntime | null>(null);
  const workspaceStateHostRef = useRef<WorkspaceSurfaceHostRuntime | null>(null);

  useEffect(() => {
    workspaceDisplayHostRef.current = workspaceDisplayHostRuntime;
    workspaceStateHostRef.current = workspaceStateHostRuntime;
  }, [workspaceDisplayHostRuntime, workspaceStateHostRuntime]);

  useEffect(() => {
    workspaceDisplayHostRef.current?.captureActiveDisplayState();
    workspaceStateHostRef.current?.syncSingletonMode(currentMode);
  }, [currentMode, workspaceInstances.syncSingletonMode]);

  const activateWorkspaceKind = useCallback((mode: ModeId) => {
    workspaceDisplayHostRef.current?.captureActiveDisplayState();
    workspaceStateHostRef.current?.activateWorkspaceKind(mode);
  }, []);

  const retargetActiveWorkspaceKind = useCallback((mode: ModeId) => {
    const activeInstanceId = workspaceInstances.activeInstanceId;
    if (workspaceInstances.activeInstance?.workspaceKind === mode) {
      return;
    }

    if (activeInstanceId) {
      const cancelled = requestWorkspaceTabJobCancellation(
        activeInstanceId,
        'Workspace tab navigated away.',
      );
      if (cancelled > 0) {
        markPendingHistoryTicketsForWorkspaceInstanceAsStopping(activeInstanceId);
      }
    }

    workspaceDisplayHostRef.current?.captureActiveDisplayState();
    workspaceStateHostRef.current?.retargetActiveWorkspaceKind(mode);
  }, [
    markPendingHistoryTicketsForWorkspaceInstanceAsStopping,
    workspaceInstances.activeInstance,
    workspaceInstances.activeInstanceId,
  ]);

  const workspaceTabsRuntime = useWorkspaceTabsRuntime({
    commitVisibleModeSelection,
    currentMode,
    discardPendingHistoryTicketsForWorkspaceInstance,
    labsEnabled,
    markPendingHistoryTicketsForWorkspaceInstanceAsStopping,
    pendingHistoryTickets,
    setEditorRuntimeStatusOverride,
    workspaceDisplayHost: workspaceDisplayHostRuntime,
    workspaceInstances,
    workspaceStateHost: workspaceStateHostRuntime,
  });

  return {
    activateWorkspaceKind,
    retargetActiveWorkspaceKind,
    workspaceTabsRuntime,
  };
}
