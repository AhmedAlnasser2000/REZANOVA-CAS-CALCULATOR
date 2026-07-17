import { useCallback, useSyncExternalStore } from 'react';

import {
  DEFAULT_NOTEBOOK_UI_STATE,
  type NotebookPreferences,
  type NotebookUiState,
} from '../../../lib/notebook';

const notebookUiStateByInstance = new Map<string, NotebookUiState>();
const notebookUiListenersByInstance = new Map<string, Set<() => void>>();

function notebookUiStateFromPreferences(preferences?: NotebookPreferences): NotebookUiState {
  return {
    ...DEFAULT_NOTEBOOK_UI_STATE,
    inspectorMode: preferences?.interface.initialInspectorMode
      ?? DEFAULT_NOTEBOOK_UI_STATE.inspectorMode,
    outlineCollapsed: preferences?.interface.initialOutlineState === 'collapsed',
    viewMode: preferences?.newDocuments.defaultViewMode
      ?? DEFAULT_NOTEBOOK_UI_STATE.viewMode,
  };
}

function getNotebookUiState(instanceId: string, preferences?: NotebookPreferences) {
  let state = notebookUiStateByInstance.get(instanceId);
  if (!state) {
    state = notebookUiStateFromPreferences(preferences);
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

export function useNotebookUiState(instanceId: string, preferences?: NotebookPreferences) {
  const subscribe = useCallback(
    (listener: () => void) => subscribeNotebookUiState(instanceId, listener),
    [instanceId],
  );
  const getSnapshot = useCallback(() => getNotebookUiState(instanceId, preferences), [instanceId, preferences]);
  const uiState = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const patchUiState = useCallback((patch: Partial<NotebookUiState>) => {
    const next = { ...getNotebookUiState(instanceId, preferences), ...patch };
    notebookUiStateByInstance.set(instanceId, next);
    notebookUiListenersByInstance.get(instanceId)?.forEach((listener) => listener());
  }, [instanceId, preferences]);

  return { patchUiState, uiState };
}
