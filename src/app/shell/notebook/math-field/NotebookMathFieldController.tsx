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
  type NotebookMathCancellationVariant,
  type NotebookMathFieldController,
  type NotebookMathFieldRole,
} from './notebookMathFieldContext';

const MATH_FONT_SIZE_STEPS = [
  { level: 1, percentage: 50 },
  { level: 2, percentage: 62 },
  { level: 3, percentage: 75 },
  { level: 4, percentage: 87 },
  { level: 5, percentage: 100 },
  { level: 6, percentage: 115 },
  { level: 7, percentage: 130 },
  { level: 8, percentage: 155 },
  { level: 9, percentage: 185 },
  { level: 10, percentage: 225 },
] as const;

const CANCELLATION_LATEX: Record<NotebookMathCancellationVariant, string> = {
  diagonal: '\\cancel{#@}',
  'reverse-diagonal': '\\bcancel{#@}',
  cross: '\\xcancel{#@}',
};

function closestMathFontSize(requested: number) {
  return MATH_FONT_SIZE_STEPS.reduce((closest, step) => (
    Math.abs(step.percentage - requested) < Math.abs(closest.percentage - requested)
      ? step
      : closest
  ));
}

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

  const applyFontSize = useCallback((requested: number) => {
    if (!active?.field.isConnected || active.field.selectionIsCollapsed) {
      return null;
    }
    const step = closestMathFontSize(requested);
    runWithInputFallback(active.field, () => {
      active.field.applyStyle({ fontSize: step.level });
      return true;
    });
    focusField(active.field);
    return { applied: step.percentage, requested };
  }, [active]);

  const resetFontSize = useCallback(() => {
    if (!active?.field.isConnected || active.field.selectionIsCollapsed) {
      return false;
    }
    runWithInputFallback(active.field, () => {
      active.field.applyStyle({ fontSize: 'auto' });
      return true;
    });
    focusField(active.field);
    return true;
  }, [active]);

  const canApplyCancellation = useCallback(() => Boolean(
    active?.field.isConnected && !active.field.selectionIsCollapsed,
  ), [active]);

  const canApplyTypography = useCallback(() => Boolean(
    active?.field.isConnected && !active.field.selectionIsCollapsed,
  ), [active]);

  const applyCancellation = useCallback((variant: NotebookMathCancellationVariant) => {
    if (!active?.field.isConnected || active.field.selectionIsCollapsed) {
      return false;
    }
    const applied = runWithInputFallback(active.field, () => active.field.insert(
      CANCELLATION_LATEX[variant],
      { focus: true, mode: 'math', selectionMode: 'item' },
    ));
    focusField(active.field);
    return applied;
  }, [active]);

  const value = useMemo<NotebookMathFieldController>(() => ({
    active,
    activate,
    applyCancellation,
    applyFontSize,
    canApplyCancellation,
    canApplyTypography,
    execute,
    focusActive,
    insert,
    release,
    resetFontSize,
  }), [
    active,
    activate,
    applyCancellation,
    applyFontSize,
    canApplyCancellation,
    canApplyTypography,
    execute,
    focusActive,
    insert,
    release,
    resetFontSize,
  ]);

  return (
    <NotebookMathFieldContext.Provider value={value}>
      {children}
    </NotebookMathFieldContext.Provider>
  );
}
