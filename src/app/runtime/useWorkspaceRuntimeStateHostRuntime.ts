import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';
import type {
  WorkspaceInstance,
  WorkspaceInstanceId,
  WorkspaceInstanceStateSlot,
} from './workspace-instances';
import {
  normalizeWorkspaceRuntimeState,
  type WorkspaceRuntimeState,
} from './workspace-runtime-state';

type UseWorkspaceRuntimeStateHostRuntimeOptions = {
  activeInstance: WorkspaceInstance | null;
  activeRuntimeState: WorkspaceRuntimeState;
  restoreRuntimeState: (state: WorkspaceRuntimeState) => void;
  updateInstanceRuntimeState: (
    instanceId: WorkspaceInstanceId,
    runtimeState: WorkspaceInstanceStateSlot,
  ) => void;
};

export function useWorkspaceRuntimeStateHostRuntime({
  activeInstance,
  activeRuntimeState,
  restoreRuntimeState,
  updateInstanceRuntimeState,
}: UseWorkspaceRuntimeStateHostRuntimeOptions) {
  const restoredInstanceKeyRef = useRef<string | null>(null);
  const restoreKey = activeInstance
    ? `${activeInstance.id}:${activeInstance.navigationRevision}`
    : null;

  const captureActiveRuntimeState = useCallback(() => {
    if (!activeInstance) {
      return undefined;
    }

    updateInstanceRuntimeState(activeInstance.id, activeRuntimeState);
    return activeRuntimeState;
  }, [activeInstance, activeRuntimeState, updateInstanceRuntimeState]);

  const restoreActiveRuntimeState = useCallback((state: WorkspaceInstanceStateSlot) => {
    if (!activeInstance) {
      return;
    }

    restoreRuntimeState(normalizeWorkspaceRuntimeState(state));
    restoredInstanceKeyRef.current = restoreKey;
  }, [activeInstance, restoreKey, restoreRuntimeState]);

  useLayoutEffect(() => {
    if (!activeInstance || restoredInstanceKeyRef.current === restoreKey) {
      return;
    }

    restoreRuntimeState(normalizeWorkspaceRuntimeState(activeInstance.runtimeState));
    restoredInstanceKeyRef.current = restoreKey;
  }, [activeInstance, restoreKey, restoreRuntimeState]);

  useEffect(() => {
    if (!activeInstance) {
      return;
    }

    updateInstanceRuntimeState(activeInstance.id, activeRuntimeState);
  }, [activeInstance, activeRuntimeState, updateInstanceRuntimeState]);

  return useMemo(() => ({
    captureActiveRuntimeState,
    restoreActiveRuntimeState,
  }), [
    captureActiveRuntimeState,
    restoreActiveRuntimeState,
  ]);
}
