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
import type { WorkspaceDisplayState } from './workspace-display-state';

type UseWorkspaceDisplayStateHostRuntimeOptions = {
  activeDisplayState: WorkspaceDisplayState;
  activeInstance: WorkspaceInstance | null;
  captureDisplayState: () => WorkspaceInstanceStateSlot;
  restoreDisplayState: (state: WorkspaceInstanceStateSlot) => void;
  updateInstanceDisplayState: (
    instanceId: WorkspaceInstanceId,
    displayState: WorkspaceInstanceStateSlot,
  ) => void;
};

export function useWorkspaceDisplayStateHostRuntime({
  activeDisplayState,
  activeInstance,
  captureDisplayState,
  restoreDisplayState,
  updateInstanceDisplayState,
}: UseWorkspaceDisplayStateHostRuntimeOptions) {
  const restoredInstanceIdRef = useRef<WorkspaceInstanceId | null>(null);

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
    restoredInstanceIdRef.current = activeInstance.id;
  }, [activeInstance, restoreDisplayState]);

  useLayoutEffect(() => {
    if (!activeInstance || restoredInstanceIdRef.current === activeInstance.id) {
      return;
    }

    restoreDisplayState(activeInstance.displayState);
    restoredInstanceIdRef.current = activeInstance.id;
  }, [activeInstance, restoreDisplayState]);

  useEffect(() => {
    if (!activeInstance) {
      return;
    }

    updateInstanceDisplayState(activeInstance.id, activeDisplayState);
  }, [activeDisplayState, activeInstance, updateInstanceDisplayState]);

  return useMemo(() => ({
    captureActiveDisplayState,
    restoreActiveDisplayState,
  }), [
    captureActiveDisplayState,
    restoreActiveDisplayState,
  ]);
}
