export type NotebookFloatingPosition = {
  x: number;
  y: number;
};

export type NotebookUiState = {
  inspectorWidth: number;
  mathAuthoringPosition: NotebookFloatingPosition | null;
  outlineWidth: number;
};

export const DEFAULT_NOTEBOOK_UI_STATE: NotebookUiState = {
  inspectorWidth: 300,
  mathAuthoringPosition: null,
  outlineWidth: 320,
};
