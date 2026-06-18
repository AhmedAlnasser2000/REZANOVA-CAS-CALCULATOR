import { useCallback, useEffect, useRef } from 'react';
import type {
  DisplayOutcome,
  ModeId,
} from '../../types/calculator';
import type { useWorkspaceInstancesRuntime } from './useWorkspaceInstancesRuntime';
import { useWorkspaceDisplayStateHostRuntime } from './useWorkspaceDisplayStateHostRuntime';
import { useWorkspaceRuntimeStateHostRuntime } from './useWorkspaceRuntimeStateHostRuntime';
import { useWorkspaceSurfaceStateHostRuntime } from './useWorkspaceSurfaceStateHostRuntime';
import { useWorkspaceTabsRuntime } from './useWorkspaceTabsRuntime';
import type { WorkspaceInstanceStateSlot } from './workspace-instances';
import type { WorkspaceDisplayReplayVariableSubstitutions } from './workspace-display-state';
import type { WorkspaceRuntimeState } from './workspace-runtime-state';
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
type WorkspaceRuntimeHostRuntime = ReturnType<typeof useWorkspaceRuntimeStateHostRuntime>;
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
  runtime: {
    activeRuntimeState: WorkspaceRuntimeState;
    restoreRuntimeState: (state: WorkspaceRuntimeState) => void;
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
  runtime,
  setEditorRuntimeStatusOverride,
  statistics,
  table,
  trigonometry,
  vector,
  workspaceInstances,
}: WorkspaceTabsShellRuntimeOptions) {
  const workspaceDisplayHostRuntime = useWorkspaceDisplayStateHostRuntime({
    activeInstance: workspaceInstances.activeInstance,
    captureDisplayState: display.captureDisplayState,
    restoreDisplayState: display.restoreDisplayState,
    updateInstanceDisplayState: workspaceInstances.updateInstanceDisplayState,
  });
  const workspaceRuntimeHostRuntime = useWorkspaceRuntimeStateHostRuntime({
    activeInstance: workspaceInstances.activeInstance,
    activeRuntimeState: runtime.activeRuntimeState,
    restoreRuntimeState: runtime.restoreRuntimeState,
    updateInstanceRuntimeState: workspaceInstances.updateInstanceRuntimeState,
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
  const workspaceRuntimeHostRef = useRef<WorkspaceRuntimeHostRuntime | null>(null);
  const workspaceStateHostRef = useRef<WorkspaceSurfaceHostRuntime | null>(null);

  useEffect(() => {
    workspaceDisplayHostRef.current = workspaceDisplayHostRuntime;
    workspaceRuntimeHostRef.current = workspaceRuntimeHostRuntime;
    workspaceStateHostRef.current = workspaceStateHostRuntime;
  }, [workspaceDisplayHostRuntime, workspaceRuntimeHostRuntime, workspaceStateHostRuntime]);

  useEffect(() => {
    workspaceDisplayHostRef.current?.captureActiveDisplayState();
    workspaceRuntimeHostRef.current?.captureActiveRuntimeState();
    workspaceStateHostRef.current?.syncSingletonMode(currentMode);
  }, [currentMode, workspaceInstances.syncSingletonMode]);

  const activateWorkspaceKind = useCallback((mode: ModeId) => {
    workspaceDisplayHostRef.current?.captureActiveDisplayState();
    workspaceRuntimeHostRef.current?.captureActiveRuntimeState();
    workspaceStateHostRef.current?.activateWorkspaceKind(mode);
  }, []);

  const retargetActiveWorkspaceKind = useCallback((mode: ModeId) => {
    if (workspaceInstances.activeInstance?.workspaceKind === mode) {
      return;
    }

    workspaceDisplayHostRef.current?.captureActiveDisplayState();
    workspaceRuntimeHostRef.current?.captureActiveRuntimeState();
    workspaceStateHostRef.current?.retargetActiveWorkspaceKind(mode);
  }, [
    workspaceInstances.activeInstance,
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
    workspaceRuntimeHost: workspaceRuntimeHostRuntime,
    workspaceStateHost: workspaceStateHostRuntime,
  });

  return {
    activateWorkspaceKind,
    retargetActiveWorkspaceKind,
    workspaceTabsRuntime,
  };
}
