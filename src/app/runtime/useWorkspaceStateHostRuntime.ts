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
  retargetActiveWorkspaceKind: (workspaceKind: WorkspaceKind) => void;
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
  retargetActiveWorkspaceKind,
  syncSingletonMode,
  updateInstanceSurfaceState,
}: UseWorkspaceStateHostRuntimeOptions) {
  const adaptersByKind = useMemo(() => adapterMap(adapters), [adapters]);
  const restoredInstanceKeyRef = useRef<string | null>(null);
  const restoreKey = activeInstance
    ? `${activeInstance.id}:${activeInstance.navigationRevision}`
    : null;

  const captureActiveSurfaceState = useCallback(() => {
    if (!activeInstance) {
      return undefined;
    }

    const adapter = adaptersByKind.get(activeInstance.workspaceKind);
    if (!adapter) {
      return undefined;
    }

    const surfaceState = adapter.captureSurfaceState();
    updateInstanceSurfaceState(
      activeInstance.id,
      surfaceState,
    );
    return surfaceState;
  }, [activeInstance, adaptersByKind, updateInstanceSurfaceState]);

  const restoreActiveSurfaceState = useCallback((state: WorkspaceInstanceStateSlot) => {
    if (!activeInstance) {
      return;
    }

    const adapter = adaptersByKind.get(activeInstance.workspaceKind);
    if (!adapter) {
      return;
    }

    adapter.restoreSurfaceState(state);
    restoredInstanceKeyRef.current = restoreKey;
  }, [activeInstance, adaptersByKind, restoreKey]);

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

  const retargetActiveWorkspaceKindWithState = useCallback((workspaceKind: WorkspaceKind) => {
    if (activeInstance?.workspaceKind === workspaceKind) {
      return;
    }

    captureActiveSurfaceState();
    retargetActiveWorkspaceKind(workspaceKind);
  }, [activeInstance?.workspaceKind, captureActiveSurfaceState, retargetActiveWorkspaceKind]);

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
    if (!activeInstance || restoredInstanceKeyRef.current === restoreKey) {
      return;
    }

    const adapter = adaptersByKind.get(activeInstance.workspaceKind);
    if (!adapter) {
      restoredInstanceKeyRef.current = restoreKey;
      return;
    }

    adapter.restoreSurfaceState(activeInstance.surfaceState);
    restoredInstanceKeyRef.current = restoreKey;
  }, [activeInstance, adaptersByKind, restoreKey]);

  return useMemo(() => ({
    activateWorkspaceKind: activateWorkspaceKindWithState,
    captureActiveSurfaceState,
    createBlankInstance: createBlankInstanceWithState,
    focusInstance: focusInstanceWithState,
    retargetActiveWorkspaceKind: retargetActiveWorkspaceKindWithState,
    restoreActiveSurfaceState,
    syncSingletonMode: syncSingletonModeWithState,
  }), [
    activateWorkspaceKindWithState,
    captureActiveSurfaceState,
    createBlankInstanceWithState,
    focusInstanceWithState,
    retargetActiveWorkspaceKindWithState,
    restoreActiveSurfaceState,
    syncSingletonModeWithState,
  ]);
}
