export type NotebookFloatingPosition = {
  x: number;
  y: number;
};

export type NotebookInspectorMode = 'auto' | 'pinned' | 'collapsed';

export type NotebookUiState = {
  inspectorMode: NotebookInspectorMode;
  inspectorWidth: number;
  mathAuthoringPosition: NotebookFloatingPosition | null;
  outlineCollapsed: boolean;
  outlineWidth: number;
};

export const DEFAULT_NOTEBOOK_UI_STATE: NotebookUiState = {
  inspectorMode: 'auto',
  inspectorWidth: 300,
  mathAuthoringPosition: null,
  outlineCollapsed: false,
  outlineWidth: 320,
};
