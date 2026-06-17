import {
  useCallback,
  useMemo,
  useState,
} from 'react';
import type { ModeId } from '../../types/calculator';
import {
  clearWorkspaceInstanceState,
  closeOtherWorkspaceInstances,
  closeWorkspaceInstance,
  createBlankWorkspaceInstance,
  createInitialWorkspaceInstancesState,
  duplicateWorkspaceInstance,
  focusLatestWorkspaceKindOrCreate,
  focusWorkspaceInstance,
  getActiveWorkspaceInstance,
  renameWorkspaceInstance,
  updateWorkspaceInstanceSurfaceState,
  workspaceInstanceRuntimeContext,
  type WorkspaceInstanceFactoryOptions,
  type WorkspaceInstanceId,
  type WorkspaceInstanceStateSlot,
  type WorkspaceKind,
} from './workspace-instances';

export function useWorkspaceInstancesRuntime(
  options: WorkspaceInstanceFactoryOptions = {},
) {
  const factoryOptions = useCallback(
    () => ({
      idFactory: options.idFactory,
      now: options.now,
    }),
    [options.idFactory, options.now],
  );

  const [state, setState] = useState(() =>
    createInitialWorkspaceInstancesState({
      idFactory: options.idFactory,
      now: options.now,
    }));

  const activateWorkspaceKind = useCallback((workspaceKind: WorkspaceKind) => {
    setState((currentState) =>
      focusLatestWorkspaceKindOrCreate(currentState, workspaceKind, factoryOptions()));
  }, [factoryOptions]);

  const syncSingletonMode = useCallback((mode: ModeId) => {
    setState((currentState) => {
      const activeInstance = getActiveWorkspaceInstance(currentState);
      return activeInstance?.workspaceKind === mode
        ? currentState
        : focusLatestWorkspaceKindOrCreate(currentState, mode, factoryOptions());
    });
  }, [factoryOptions]);

  const focusInstance = useCallback((instanceId: WorkspaceInstanceId) => {
    setState((currentState) =>
      focusWorkspaceInstance(currentState, instanceId, factoryOptions()));
  }, [factoryOptions]);

  const createBlankInstance = useCallback((workspaceKind: WorkspaceKind = 'calculate') => {
    setState((currentState) =>
      createBlankWorkspaceInstance(currentState, workspaceKind, factoryOptions()));
  }, [factoryOptions]);

  const renameInstance = useCallback((instanceId: WorkspaceInstanceId, title: string) => {
    setState((currentState) =>
      renameWorkspaceInstance(currentState, instanceId, title, factoryOptions()));
  }, [factoryOptions]);

  const duplicateInstance = useCallback((instanceId: WorkspaceInstanceId) => {
    setState((currentState) =>
      duplicateWorkspaceInstance(currentState, instanceId, factoryOptions()));
  }, [factoryOptions]);

  const clearInstanceState = useCallback((instanceId: WorkspaceInstanceId) => {
    setState((currentState) =>
      clearWorkspaceInstanceState(currentState, instanceId, factoryOptions()));
  }, [factoryOptions]);

  const updateInstanceSurfaceState = useCallback((
    instanceId: WorkspaceInstanceId,
    surfaceState: WorkspaceInstanceStateSlot,
  ) => {
    setState((currentState) =>
      updateWorkspaceInstanceSurfaceState(currentState, instanceId, surfaceState, factoryOptions()));
  }, [factoryOptions]);

  const closeInstance = useCallback((instanceId: WorkspaceInstanceId) => {
    setState((currentState) =>
      closeWorkspaceInstance(currentState, instanceId, factoryOptions()));
  }, [factoryOptions]);

  const closeOtherInstances = useCallback((instanceId: WorkspaceInstanceId) => {
    setState((currentState) => closeOtherWorkspaceInstances(currentState, instanceId));
  }, []);

  const activeInstance = getActiveWorkspaceInstance(state);
  const activeRuntimeContext = activeInstance
    ? workspaceInstanceRuntimeContext(activeInstance)
    : null;

  const isWorkspaceInstanceOpen = useCallback((instanceId: WorkspaceInstanceId) =>
    state.instances.some((instance) => instance.id === instanceId), [state.instances]);

  return useMemo(() => ({
    activeInstance,
    activeInstanceId: state.activeInstanceId,
    activeRuntimeContext,
    activateWorkspaceKind,
    clearInstanceState,
    closeInstance,
    closeOtherInstances,
    createBlankInstance,
    duplicateInstance,
    focusInstance,
    isWorkspaceInstanceOpen,
    renameInstance,
    syncSingletonMode,
    updateInstanceSurfaceState,
    workspaceInstances: state.instances,
  }), [
    activateWorkspaceKind,
    activeInstance,
    activeRuntimeContext,
    clearInstanceState,
    closeInstance,
    closeOtherInstances,
    createBlankInstance,
    duplicateInstance,
    focusInstance,
    isWorkspaceInstanceOpen,
    renameInstance,
    state.activeInstanceId,
    state.instances,
    syncSingletonMode,
    updateInstanceSurfaceState,
  ]);
}
