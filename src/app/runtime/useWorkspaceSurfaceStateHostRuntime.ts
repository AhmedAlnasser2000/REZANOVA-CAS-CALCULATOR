import { useMemo } from 'react';
import type {
  WorkspaceInstance,
  WorkspaceInstanceId,
  WorkspaceInstanceStateSlot,
  WorkspaceKind,
} from './workspace-instances';
import {
  useWorkspaceStateHostRuntime,
  type WorkspaceSurfaceStateAdapter,
} from './useWorkspaceStateHostRuntime';
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

type WorkspaceInstancesRuntimeForStateHost = {
  activeInstance: WorkspaceInstance | null;
  activateWorkspaceKind: (workspaceKind: WorkspaceKind) => void;
  createBlankInstance: (workspaceKind?: WorkspaceKind) => void;
  focusInstance: (instanceId: WorkspaceInstanceId) => void;
  retargetActiveWorkspaceKind: (workspaceKind: WorkspaceKind) => void;
  syncSingletonMode: (workspaceKind: WorkspaceKind) => void;
  updateInstanceSurfaceState: (
    instanceId: WorkspaceInstanceId,
    surfaceState: WorkspaceInstanceStateSlot,
  ) => void;
};

type SurfaceStateAdapter<TSurfaceState> = {
  captureSurfaceState: () => TSurfaceState;
  restoreSurfaceState: (state: TSurfaceState | null) => void;
};

type WorkspaceSurfaceStateHostOptions = {
  workspaceInstances: WorkspaceInstancesRuntimeForStateHost;
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

export function useWorkspaceSurfaceStateHostRuntime({
  calculus,
  calculate,
  equation,
  geometry,
  matrix,
  statistics,
  table,
  trigonometry,
  vector,
  workspaceInstances,
}: WorkspaceSurfaceStateHostOptions) {
  const adapters = useMemo<WorkspaceSurfaceStateAdapter[]>(() => [
    {
      workspaceKind: 'calculate',
      captureSurfaceState: calculate.captureSurfaceState,
      restoreSurfaceState: (state) =>
        calculate.restoreSurfaceState(state as CalculateSurfaceState | null),
    },
    {
      workspaceKind: 'equation',
      captureSurfaceState: equation.captureSurfaceState,
      restoreSurfaceState: (state) =>
        equation.restoreSurfaceState(state as EquationSurfaceState | null),
    },
    {
      workspaceKind: 'calculus',
      captureSurfaceState: calculus.captureSurfaceState,
      restoreSurfaceState: (state) =>
        calculus.restoreSurfaceState(state as CalculusSurfaceState | null),
    },
    {
      workspaceKind: 'trigonometry',
      captureSurfaceState: trigonometry.captureSurfaceState,
      restoreSurfaceState: (state) =>
        trigonometry.restoreSurfaceState(state as TrigonometrySurfaceState | null),
    },
    {
      workspaceKind: 'statistics',
      captureSurfaceState: statistics.captureSurfaceState,
      restoreSurfaceState: (state) =>
        statistics.restoreSurfaceState(state as StatisticsSurfaceState | null),
    },
    {
      workspaceKind: 'geometry',
      captureSurfaceState: geometry.captureSurfaceState,
      restoreSurfaceState: (state) =>
        geometry.restoreSurfaceState(state as GeometrySurfaceState | null),
    },
    {
      workspaceKind: 'table',
      captureSurfaceState: table.captureSurfaceState,
      restoreSurfaceState: (state) =>
        table.restoreSurfaceState(state as TableSurfaceState | null),
    },
    {
      workspaceKind: 'matrix',
      captureSurfaceState: matrix.captureSurfaceState,
      restoreSurfaceState: (state) =>
        matrix.restoreSurfaceState(state as MatrixSurfaceState | null),
    },
    {
      workspaceKind: 'vector',
      captureSurfaceState: vector.captureSurfaceState,
      restoreSurfaceState: (state) =>
        vector.restoreSurfaceState(state as VectorSurfaceState | null),
    },
  ], [
    calculate,
    calculus,
    equation,
    geometry,
    matrix,
    statistics,
    table,
    trigonometry,
    vector,
  ]);

  return useWorkspaceStateHostRuntime({
    activeInstance: workspaceInstances.activeInstance,
    activateWorkspaceKind: workspaceInstances.activateWorkspaceKind,
    adapters,
    createBlankInstance: workspaceInstances.createBlankInstance,
    focusInstance: workspaceInstances.focusInstance,
    retargetActiveWorkspaceKind: workspaceInstances.retargetActiveWorkspaceKind,
    syncSingletonMode: workspaceInstances.syncSingletonMode,
    updateInstanceSurfaceState: workspaceInstances.updateInstanceSurfaceState,
  });
}
