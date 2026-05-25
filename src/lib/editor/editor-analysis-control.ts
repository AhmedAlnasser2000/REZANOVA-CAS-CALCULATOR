import { createContext, useContext } from 'react';

export type EditorAnalysisControlState = {
  stopped: boolean;
  generation: number;
};

export const defaultEditorAnalysisControl: EditorAnalysisControlState = {
  stopped: false,
  generation: 0,
};

export const EditorAnalysisControlContext = createContext<EditorAnalysisControlState>(
  defaultEditorAnalysisControl,
);

export function useEditorAnalysisControl() {
  return useContext(EditorAnalysisControlContext);
}
