import { useEffect, useState } from 'react';

import {
  isNotebookRichDocument,
  measureNotebookDocument,
  type NotebookDocumentMetrics,
  type NotebookRichDocument,
} from '../../../lib/notebook';

export type NotebookDocumentAnalysis = NotebookDocumentMetrics & {
  documentId: string;
  structurallyValid: boolean;
};

type IdleWindow = Window & typeof globalThis & {
  requestIdleCallback?: (
    callback: () => void,
    options?: { timeout: number },
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

export function useNotebookDocumentAnalysis(document: NotebookRichDocument) {
  const [analysis, setAnalysis] = useState<NotebookDocumentAnalysis | null>(null);

  useEffect(() => {
    const idleWindow = window as IdleWindow;
    let cancelled = false;
    const analyze = () => {
      if (cancelled) {
        return;
      }
      setAnalysis({
        documentId: document.id,
        ...measureNotebookDocument(document.content),
        structurallyValid: isNotebookRichDocument(document),
      });
    };
    const idleHandle = idleWindow.requestIdleCallback?.(analyze, { timeout: 250 });
    const timeoutHandle = idleHandle === undefined
      ? window.setTimeout(analyze, 0)
      : undefined;

    return () => {
      cancelled = true;
      if (idleHandle !== undefined) {
        idleWindow.cancelIdleCallback?.(idleHandle);
      }
      if (timeoutHandle !== undefined) {
        window.clearTimeout(timeoutHandle);
      }
    };
  }, [document]);

  return analysis?.documentId === document.id ? analysis : null;
}
