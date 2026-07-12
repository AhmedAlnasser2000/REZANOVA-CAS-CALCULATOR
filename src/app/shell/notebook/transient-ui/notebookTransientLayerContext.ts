import { createContext } from 'react';

export type NotebookTransientLayerRegistration = {
  id: string;
  parentId: string | null;
};

export type NotebookTransientLayerContextValue = {
  close: (id: string, restoreFocus?: boolean) => void;
  closeChain: () => void;
  open: (id: string) => void;
  register: (id: string, parentId: string | null) => () => void;
  stack: readonly string[];
};

export const NotebookTransientLayerContext = createContext<NotebookTransientLayerContextValue | null>(null);
