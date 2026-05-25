import type { ReactNode } from 'react';
import {
  EditorAnalysisControlContext,
  type EditorAnalysisControlState,
} from './editor-analysis-control';

export function EditorAnalysisControlProvider({
  value,
  children,
}: {
  value: EditorAnalysisControlState;
  children: ReactNode;
}) {
  return (
    <EditorAnalysisControlContext.Provider value={value}>
      {children}
    </EditorAnalysisControlContext.Provider>
  );
}
