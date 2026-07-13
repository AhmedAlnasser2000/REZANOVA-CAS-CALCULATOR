import { useCallback, useSyncExternalStore } from 'react';

import {
  DEFAULT_NOTEBOOK_UI_STATE,
  type NotebookUiState,
} from '../../../lib/notebook';

const notebookUiStateByInstance = new Map<string, NotebookUiState>();
const notebookUiListenersByInstance = new Map<string, Set<() => void>>();

function getNotebookUiState(instanceId: string) {
  let state = notebookUiStateByInstance.get(instanceId);
  if (!state) {
    state = { ...DEFAULT_NOTEBOOK_UI_STATE };
    notebookUiStateByInstance.set(instanceId, state);
  }
  return state;
}

function subscribeNotebookUiState(instanceId: string, listener: () => void) {
  const listeners = notebookUiListenersByInstance.get(instanceId) ?? new Set();
  listeners.add(listener);
  notebookUiListenersByInstance.set(instanceId, listeners);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      notebookUiListenersByInstance.delete(instanceId);
    }
  };
}

export function useNotebookUiState(instanceId: string) {
  const subscribe = useCallback(
    (listener: () => void) => subscribeNotebookUiState(instanceId, listener),
    [instanceId],
  );
  const getSnapshot = useCallback(() => getNotebookUiState(instanceId), [instanceId]);
  const uiState = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const patchUiState = useCallback((patch: Partial<NotebookUiState>) => {
    const next = { ...getNotebookUiState(instanceId), ...patch };
    notebookUiStateByInstance.set(instanceId, next);
    notebookUiListenersByInstance.get(instanceId)?.forEach((listener) => listener());
  }, [instanceId]);

  return { patchUiState, uiState };
}
