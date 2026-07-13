import type { MathfieldElement } from 'mathlive';
import { createContext, useContext } from 'react';

export type NotebookMathFieldRole = 'inline' | 'display';

export type NotebookMathCancellationVariant = 'diagonal' | 'reverse-diagonal' | 'cross';

export type NotebookMathFontSizeResult = {
  applied: number;
  requested: number;
};

export type ActiveNotebookMathField = {
  field: MathfieldElement;
  nodeId: string;
  role: NotebookMathFieldRole;
};

export type NotebookMathFieldController = {
  active: ActiveNotebookMathField | null;
  activate: (field: MathfieldElement, nodeId: string, role: NotebookMathFieldRole) => void;
  release: (field: MathfieldElement) => void;
  insert: (latex: string) => boolean;
  execute: (command: string | [string, ...unknown[]]) => boolean;
  applyFontSize: (size: number) => NotebookMathFontSizeResult | null;
  resetFontSize: () => boolean;
  canApplyTypography: () => boolean;
  canApplyCancellation: () => boolean;
  applyCancellation: (variant: NotebookMathCancellationVariant) => boolean;
  focusActive: () => boolean;
};

export const NotebookMathFieldContext = createContext<NotebookMathFieldController | null>(null);

export function useNotebookMathFieldController() {
  const controller = useContext(NotebookMathFieldContext);
  if (!controller) {
    throw new Error('Notebook math fields require NotebookMathFieldProvider.');
  }
  return controller;
}
