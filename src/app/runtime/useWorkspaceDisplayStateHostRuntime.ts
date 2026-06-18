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
} from './workspace-instances';

type UseWorkspaceDisplayStateHostRuntimeOptions = {
  activeInstance: WorkspaceInstance | null;
  captureDisplayState: () => WorkspaceInstanceStateSlot;
  restoreDisplayState: (state: WorkspaceInstanceStateSlot) => void;
  updateInstanceDisplayState: (
    instanceId: WorkspaceInstanceId,
    displayState: WorkspaceInstanceStateSlot,
  ) => void;
};

export function useWorkspaceDisplayStateHostRuntime({
  activeInstance,
  captureDisplayState,
  restoreDisplayState,
  updateInstanceDisplayState,
}: UseWorkspaceDisplayStateHostRuntimeOptions) {
  const restoredInstanceKeyRef = useRef<string | null>(null);
  const restoreKey = activeInstance
    ? `${activeInstance.id}:${activeInstance.navigationRevision}`
    : null;

  const captureActiveDisplayState = useCallback(() => {
    if (!activeInstance) {
      return undefined;
    }

    const displayState = captureDisplayState();
    updateInstanceDisplayState(activeInstance.id, displayState);
    return displayState;
  }, [activeInstance, captureDisplayState, updateInstanceDisplayState]);

  const restoreActiveDisplayState = useCallback((state: WorkspaceInstanceStateSlot) => {
    if (!activeInstance) {
      return;
    }

    restoreDisplayState(state);
    restoredInstanceKeyRef.current = restoreKey;
  }, [activeInstance, restoreDisplayState, restoreKey]);

  useLayoutEffect(() => {
    if (!activeInstance || restoredInstanceKeyRef.current === restoreKey) {
      return;
    }

    restoreDisplayState(activeInstance.displayState);
    restoredInstanceKeyRef.current = restoreKey;
  }, [activeInstance, restoreDisplayState, restoreKey]);

  return useMemo(() => ({
    captureActiveDisplayState,
    restoreActiveDisplayState,
  }), [
    captureActiveDisplayState,
    restoreActiveDisplayState,
  ]);
}
