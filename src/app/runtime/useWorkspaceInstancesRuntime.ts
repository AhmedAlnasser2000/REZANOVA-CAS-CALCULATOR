import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ModeId } from '../../types/calculator';
import type { FormulaViewerArtifact } from './formula-viewer-artifacts';
import type { SingletonAppPageWorkspaceKind } from './app-page-workspaces';
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
  isWorkspaceModeKind,
  openAppPageWorkspaceInstance,
  openFormulaViewerWorkspaceInstance,
  renameWorkspaceInstance,
  retargetActiveWorkspaceInstanceKind,
  updateWorkspaceInstanceDisplayState,
  updateWorkspaceInstanceRuntimeState,
  updateWorkspaceInstanceSurfaceState,
  workspaceInstanceRuntimeContext,
  type WorkspaceInstanceFactoryOptions,
  type WorkspaceInstanceId,
  type WorkspaceInstanceStateSlot,
  type WorkspaceInstanceStateSlotUpdater,
  type WorkspaceKind,
} from './workspace-instances';
import { GRAPHING_PAGE_WORKSPACE_KIND } from './app-page-workspaces';
import { loadGraphWorkspaceRuntimeForInstance } from './graph-workspace-module-loader';

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
      if (activeInstance && !isWorkspaceModeKind(activeInstance.workspaceKind)) {
        return currentState;
      }
      return activeInstance?.workspaceKind === mode
        ? currentState
        : retargetActiveWorkspaceInstanceKind(currentState, mode, factoryOptions());
    });
  }, [factoryOptions]);

  const retargetActiveWorkspaceKind = useCallback((workspaceKind: WorkspaceKind) => {
    setState((currentState) =>
      retargetActiveWorkspaceInstanceKind(currentState, workspaceKind, factoryOptions()));
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

  const duplicateInstance = useCallback((
    instanceId: WorkspaceInstanceId,
    surfaceState?: WorkspaceInstanceStateSlot,
    displayState?: WorkspaceInstanceStateSlot,
    runtimeState?: WorkspaceInstanceStateSlot,
  ) => {
    setState((currentState) =>
      duplicateWorkspaceInstance(currentState, instanceId, {
        ...factoryOptions(),
        displayState,
        runtimeState,
        surfaceState,
      }));
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

  const updateInstanceDisplayState = useCallback((
    instanceId: WorkspaceInstanceId,
    displayState: WorkspaceInstanceStateSlot | WorkspaceInstanceStateSlotUpdater,
  ) => {
    setState((currentState) =>
      updateWorkspaceInstanceDisplayState(currentState, instanceId, displayState, factoryOptions()));
  }, [factoryOptions]);

  const updateInstanceRuntimeState = useCallback((
    instanceId: WorkspaceInstanceId,
    runtimeState: WorkspaceInstanceStateSlot | WorkspaceInstanceStateSlotUpdater,
  ) => {
    setState((currentState) =>
      updateWorkspaceInstanceRuntimeState(currentState, instanceId, runtimeState, factoryOptions()));
  }, [factoryOptions]);

  const closeInstance = useCallback((instanceId: WorkspaceInstanceId) => {
    setState((currentState) =>
      closeWorkspaceInstance(currentState, instanceId, factoryOptions()));
  }, [factoryOptions]);

  const closeOtherInstances = useCallback((instanceId: WorkspaceInstanceId) => {
    setState((currentState) => closeOtherWorkspaceInstances(currentState, instanceId));
  }, []);

  const openFormulaViewerInstance = useCallback((artifact: FormulaViewerArtifact) => {
    setState((currentState) =>
      openFormulaViewerWorkspaceInstance(currentState, artifact, factoryOptions()));
  }, [factoryOptions]);

  const openAppPageInstance = useCallback((workspaceKind: SingletonAppPageWorkspaceKind) => {
    setState((currentState) =>
      openAppPageWorkspaceInstance(currentState, workspaceKind, factoryOptions()));
  }, [factoryOptions]);

  const activeInstance = getActiveWorkspaceInstance(state);
  const activeRuntimeContext = activeInstance
    ? workspaceInstanceRuntimeContext(activeInstance)
    : null;

  useEffect(() => {
    if (activeInstance?.workspaceKind !== GRAPHING_PAGE_WORKSPACE_KIND) {
      return;
    }
    void loadGraphWorkspaceRuntimeForInstance(activeInstance).catch(() => {
      // A visible Graph error boundary is introduced with the page in Move 8.
    });
  }, [activeInstance]);

  const isWorkspaceInstanceOpen = useCallback((
    instanceId: WorkspaceInstanceId,
    job?: { workspaceInstanceRevision?: number | null },
  ) => {
    const instance = state.instances.find((candidate) => candidate.id === instanceId);
    if (!instance) {
      return false;
    }
    return job?.workspaceInstanceRevision == null
      || job.workspaceInstanceRevision === instance.navigationRevision;
  }, [state.instances]);

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
    openFormulaViewerInstance,
    openAppPageInstance,
    renameInstance,
    retargetActiveWorkspaceKind,
    syncSingletonMode,
    updateInstanceDisplayState,
    updateInstanceRuntimeState,
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
    openFormulaViewerInstance,
    openAppPageInstance,
    renameInstance,
    retargetActiveWorkspaceKind,
    state.activeInstanceId,
    state.instances,
    syncSingletonMode,
    updateInstanceDisplayState,
    updateInstanceRuntimeState,
    updateInstanceSurfaceState,
  ]);
}

export function useWorkspaceRuntimeContextGetters(
  runtime: Pick<
    ReturnType<typeof useWorkspaceInstancesRuntime>,
    'activeRuntimeContext' | 'isWorkspaceInstanceOpen' | 'workspaceInstances'
  >,
) {
  const workspaceInstancesRef = useRef(runtime.workspaceInstances);
  const activeRuntimeContextRef = useRef(runtime.activeRuntimeContext);
  const isWorkspaceInstanceOpenRef = useRef(runtime.isWorkspaceInstanceOpen);

  useLayoutEffect(() => {
    workspaceInstancesRef.current = runtime.workspaceInstances;
    activeRuntimeContextRef.current = runtime.activeRuntimeContext;
    isWorkspaceInstanceOpenRef.current = runtime.isWorkspaceInstanceOpen;
  }, [
    runtime.activeRuntimeContext,
    runtime.isWorkspaceInstanceOpen,
    runtime.workspaceInstances,
  ]);

  const getWorkspaceInstancesForRuntime = useCallback(() => workspaceInstancesRef.current, []);
  const getActiveWorkspaceInstanceRuntimeContextForRuntime = useCallback(
    () => activeRuntimeContextRef.current,
    [],
  );
  const isWorkspaceInstanceOpenForRuntime = useCallback((
    instanceId: WorkspaceInstanceId,
    job?: { workspaceInstanceRevision?: number | null },
  ) => isWorkspaceInstanceOpenRef.current(instanceId, job), []);

  return useMemo(() => ({
    getActiveWorkspaceInstanceRuntimeContextForRuntime,
    getWorkspaceInstancesForRuntime,
    isWorkspaceInstanceOpenForRuntime,
  }), [
    getActiveWorkspaceInstanceRuntimeContextForRuntime,
    getWorkspaceInstancesForRuntime,
    isWorkspaceInstanceOpenForRuntime,
  ]);
}
