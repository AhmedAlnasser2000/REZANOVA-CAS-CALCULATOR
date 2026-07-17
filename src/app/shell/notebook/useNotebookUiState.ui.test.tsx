import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DEFAULT_NOTEBOOK_PREFERENCES, type NotebookPreferences } from '../../../lib/notebook';
import { useNotebookUiState } from './useNotebookUiState';

describe('useNotebookUiState', () => {
  it('seeds a new Notebook session from Notebook preferences', () => {
    const preferences: NotebookPreferences = {
      ...DEFAULT_NOTEBOOK_PREFERENCES,
      interface: {
        ...DEFAULT_NOTEBOOK_PREFERENCES.interface,
        initialInspectorMode: 'manual',
        initialOutlineState: 'collapsed',
      },
      newDocuments: {
        ...DEFAULT_NOTEBOOK_PREFERENCES.newDocuments,
        defaultViewMode: 'draft',
      },
    };

    const hook = renderHook(() => useNotebookUiState('notebook.ui.preferences.test', preferences));

    expect(hook.result.current.uiState.inspectorMode).toBe('manual');
    expect(hook.result.current.uiState.outlineCollapsed).toBe(true);
    expect(hook.result.current.uiState.viewMode).toBe('draft');
  });
});
