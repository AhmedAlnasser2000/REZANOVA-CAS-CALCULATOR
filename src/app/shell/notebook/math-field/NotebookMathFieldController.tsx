import type { MathfieldElement } from 'mathlive';
import {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  NotebookMathFieldContext,
  type ActiveNotebookMathField,
  type NotebookMathFieldController,
  type NotebookMathFieldRole,
} from './notebookMathFieldContext';

function focusField(field: MathfieldElement) {
  field.focus();
}

function collapseInsertedPlaceholder(field: MathfieldElement) {
  if (field.selectionIsCollapsed) {
    return;
  }
  const firstRange = field.selection.ranges[0];
  if (firstRange) {
    field.position = firstRange[0];
  }
}

function runWithInputFallback(
  field: MathfieldElement,
  operation: () => boolean,
) {
  const before = field.getValue('latex');
  let emitted = false;
  const markInput = () => {
    emitted = true;
  };
  field.addEventListener('input', markInput);
  const completed = operation();
  field.removeEventListener('input', markInput);
  if (!emitted && field.getValue('latex') !== before) {
    field.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      inputType: 'insertText',
    }));
  }
  return completed;
}

export function NotebookMathFieldProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveNotebookMathField | null>(null);

  const activate = useCallback((
    field: MathfieldElement,
    nodeId: string,
    role: NotebookMathFieldRole,
  ) => {
    setActive({ field, nodeId, role });
  }, []);

  const release = useCallback((field: MathfieldElement) => {
    setActive((current) => current?.field === field ? null : current);
  }, []);

  const focusActive = useCallback(() => {
    if (!active?.field.isConnected) {
      return false;
    }
    focusField(active.field);
    return true;
  }, [active]);

  const insert = useCallback((latex: string) => {
    if (!active?.field.isConnected || !latex) {
      return false;
    }
    const inserted = runWithInputFallback(active.field, () => active.field.insert(latex, {
      focus: true,
      mode: 'math',
      selectionMode: 'placeholder',
    }));
    collapseInsertedPlaceholder(active.field);
    focusField(active.field);
    return inserted;
  }, [active]);

  const execute = useCallback((command: string | [string, ...unknown[]]) => {
    if (!active?.field.isConnected) {
      return false;
    }
    const runCommand = active.field.executeCommand as (
      nextCommand: string | [string, ...unknown[]],
    ) => boolean;
    const executed = runWithInputFallback(
      active.field,
      () => runCommand.call(active.field, command),
    );
    focusField(active.field);
    return executed;
  }, [active]);

  const value = useMemo<NotebookMathFieldController>(() => ({
    active,
    activate,
    execute,
    focusActive,
    insert,
    release,
  }), [active, activate, execute, focusActive, insert, release]);

  return (
    <NotebookMathFieldContext.Provider value={value}>
      {children}
    </NotebookMathFieldContext.Provider>
  );
}
