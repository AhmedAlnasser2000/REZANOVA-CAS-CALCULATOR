export type NotebookFloatingPosition = {
  x: number;
  y: number;
};

export type NotebookInspectorMode = 'auto' | 'manual' | 'pinned' | 'collapsed';

export type NotebookProseSelectionState = {
  from: number;
  to: number;
};

export type NotebookUiState = {
  inspectorMode: NotebookInspectorMode;
  inspectorWidth: number;
  mathAuthoringPosition: NotebookFloatingPosition | null;
  outlineCollapsed: boolean;
  outlineWidth: number;
  proseSelection: NotebookProseSelectionState | null;
};

export const DEFAULT_NOTEBOOK_UI_STATE: NotebookUiState = {
  inspectorMode: 'auto',
  inspectorWidth: 300,
  mathAuthoringPosition: null,
  outlineCollapsed: false,
  outlineWidth: 320,
  proseSelection: null,
};
