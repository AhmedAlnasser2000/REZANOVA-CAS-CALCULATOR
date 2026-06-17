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
} from './core-workspace-surface-state';

type WorkspaceInstancesRuntimeForStateHost = {
  activeInstance: WorkspaceInstance | null;
  activateWorkspaceKind: (workspaceKind: WorkspaceKind) => void;
  createBlankInstance: (workspaceKind?: WorkspaceKind) => void;
  focusInstance: (instanceId: WorkspaceInstanceId) => void;
  syncSingletonMode: (workspaceKind: WorkspaceKind) => void;
  updateInstanceSurfaceState: (
    instanceId: WorkspaceInstanceId,
    surfaceState: WorkspaceInstanceStateSlot,
  ) => void;
};

type CoreWorkspaceStateHostOptions = {
  workspaceInstances: WorkspaceInstancesRuntimeForStateHost;
  calculate: {
    captureSurfaceState: () => CalculateSurfaceState;
    restoreSurfaceState: (state: CalculateSurfaceState | null) => void;
  };
  equation: {
    captureSurfaceState: () => EquationSurfaceState;
    restoreSurfaceState: (state: EquationSurfaceState | null) => void;
  };
  calculus: {
    captureSurfaceState: () => CalculusSurfaceState;
    restoreSurfaceState: (state: CalculusSurfaceState | null) => void;
  };
};

export function useCoreWorkspaceStateHostRuntime({
  calculus,
  calculate,
  equation,
  workspaceInstances,
}: CoreWorkspaceStateHostOptions) {
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
  ], [calculate, calculus, equation]);

  return useWorkspaceStateHostRuntime({
    activeInstance: workspaceInstances.activeInstance,
    activateWorkspaceKind: workspaceInstances.activateWorkspaceKind,
    adapters,
    createBlankInstance: workspaceInstances.createBlankInstance,
    focusInstance: workspaceInstances.focusInstance,
    syncSingletonMode: workspaceInstances.syncSingletonMode,
    updateInstanceSurfaceState: workspaceInstances.updateInstanceSurfaceState,
  });
}
