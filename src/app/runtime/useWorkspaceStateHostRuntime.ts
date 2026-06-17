import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';
import type {
  WorkspaceInstance,
  WorkspaceInstanceId,
  WorkspaceInstanceStateSlot,
  WorkspaceKind,
} from './workspace-instances';

export type WorkspaceSurfaceStateAdapter = {
  workspaceKind: WorkspaceKind;
  captureSurfaceState: () => WorkspaceInstanceStateSlot;
  restoreSurfaceState: (state: WorkspaceInstanceStateSlot) => void;
};

type UseWorkspaceStateHostRuntimeOptions = {
  activeInstance: WorkspaceInstance | null;
  activateWorkspaceKind: (workspaceKind: WorkspaceKind) => void;
  createBlankInstance: (workspaceKind?: WorkspaceKind) => void;
  focusInstance: (instanceId: WorkspaceInstanceId) => void;
  syncSingletonMode: (workspaceKind: WorkspaceKind) => void;
  updateInstanceSurfaceState: (
    instanceId: WorkspaceInstanceId,
    surfaceState: WorkspaceInstanceStateSlot,
  ) => void;
  adapters: readonly WorkspaceSurfaceStateAdapter[];
};

function adapterMap(adapters: readonly WorkspaceSurfaceStateAdapter[]) {
  return new Map(adapters.map((adapter) => [adapter.workspaceKind, adapter]));
}

export function useWorkspaceStateHostRuntime({
  activeInstance,
  activateWorkspaceKind,
  adapters,
  createBlankInstance,
  focusInstance,
  syncSingletonMode,
  updateInstanceSurfaceState,
}: UseWorkspaceStateHostRuntimeOptions) {
  const adaptersByKind = useMemo(() => adapterMap(adapters), [adapters]);
  const restoredInstanceIdRef = useRef<WorkspaceInstanceId | null>(null);

  const captureActiveSurfaceState = useCallback(() => {
    if (!activeInstance) {
      return;
    }

    const adapter = adaptersByKind.get(activeInstance.workspaceKind);
    if (!adapter) {
      return;
    }

    updateInstanceSurfaceState(
      activeInstance.id,
      adapter.captureSurfaceState(),
    );
  }, [activeInstance, adaptersByKind, updateInstanceSurfaceState]);

  const activateWorkspaceKindWithState = useCallback((workspaceKind: WorkspaceKind) => {
    captureActiveSurfaceState();
    activateWorkspaceKind(workspaceKind);
  }, [activateWorkspaceKind, captureActiveSurfaceState]);

  const syncSingletonModeWithState = useCallback((workspaceKind: WorkspaceKind) => {
    if (activeInstance?.workspaceKind === workspaceKind) {
      return;
    }

    captureActiveSurfaceState();
    syncSingletonMode(workspaceKind);
  }, [activeInstance?.workspaceKind, captureActiveSurfaceState, syncSingletonMode]);

  const focusInstanceWithState = useCallback((instanceId: WorkspaceInstanceId) => {
    if (activeInstance?.id === instanceId) {
      return;
    }

    captureActiveSurfaceState();
    focusInstance(instanceId);
  }, [activeInstance?.id, captureActiveSurfaceState, focusInstance]);

  const createBlankInstanceWithState = useCallback((workspaceKind?: WorkspaceKind) => {
    captureActiveSurfaceState();
    createBlankInstance(workspaceKind);
  }, [captureActiveSurfaceState, createBlankInstance]);

  useLayoutEffect(() => {
    if (!activeInstance || restoredInstanceIdRef.current === activeInstance.id) {
      return;
    }

    const adapter = adaptersByKind.get(activeInstance.workspaceKind);
    if (!adapter) {
      restoredInstanceIdRef.current = activeInstance.id;
      return;
    }

    adapter.restoreSurfaceState(activeInstance.surfaceState);
    restoredInstanceIdRef.current = activeInstance.id;
  }, [activeInstance, adaptersByKind]);

  return useMemo(() => ({
    activateWorkspaceKind: activateWorkspaceKindWithState,
    captureActiveSurfaceState,
    createBlankInstance: createBlankInstanceWithState,
    focusInstance: focusInstanceWithState,
    syncSingletonMode: syncSingletonModeWithState,
  }), [
    activateWorkspaceKindWithState,
    captureActiveSurfaceState,
    createBlankInstanceWithState,
    focusInstanceWithState,
    syncSingletonModeWithState,
  ]);
}
