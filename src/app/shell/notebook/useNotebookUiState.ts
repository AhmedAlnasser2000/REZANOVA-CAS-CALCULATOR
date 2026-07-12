import { useCallback, useState } from 'react';

import {
  DEFAULT_NOTEBOOK_UI_STATE,
  type NotebookUiState,
} from '../../../lib/notebook';

const notebookUiStateByInstance = new Map<string, NotebookUiState>();

export function useNotebookUiState(instanceId: string) {
  const [uiState, setUiState] = useState<NotebookUiState>(() => (
    notebookUiStateByInstance.get(instanceId) ?? { ...DEFAULT_NOTEBOOK_UI_STATE }
  ));

  const patchUiState = useCallback((patch: Partial<NotebookUiState>) => {
    setUiState((current) => {
      const next = { ...current, ...patch };
      notebookUiStateByInstance.set(instanceId, next);
      return next;
    });
  }, [instanceId]);

  return { patchUiState, uiState };
}
