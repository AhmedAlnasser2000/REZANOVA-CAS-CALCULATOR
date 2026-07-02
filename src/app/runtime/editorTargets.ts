import type { MathfieldElement } from 'mathlive';

type MathfieldRef = {
  current: MathfieldElement | null;
};

export function isLatexInsertTarget(field: unknown): field is {
  focus?: () => void;
  insert: (latex: string) => void;
} {
  return Boolean(field && typeof (field as { insert?: unknown }).insert === 'function');
}

export function isLatexValueTarget(field: unknown): field is {
  focus?: () => void;
  getValue?: (format?: string) => string;
  setValue: (latex: string) => void;
  dispatchEvent?: (event: Event) => boolean;
} {
  return Boolean(field && typeof (field as { setValue?: unknown }).setValue === 'function');
}

export function isConnectedLatexEditorTarget(field: unknown): field is MathfieldElement {
  if (!(isLatexInsertTarget(field) || isLatexValueTarget(field))) {
    return false;
  }
  return !(field instanceof HTMLElement) || field.isConnected;
}

export function resolveLatexEditorTarget(
  activeField: unknown,
  mainField: unknown,
): MathfieldElement | null {
  if (isConnectedLatexEditorTarget(activeField)) {
    return activeField;
  }
  if (isConnectedLatexEditorTarget(mainField)) {
    return mainField;
  }
  return null;
}

export function focusLatexEditorTarget(
  activeFieldRef: MathfieldRef,
  mainFieldRef: MathfieldRef,
) {
  const field = resolveLatexEditorTarget(activeFieldRef.current, mainFieldRef.current);
  if (!field) {
    return null;
  }

  activeFieldRef.current = field;
  field.focus?.();
  return field;
}

export function blurLatexEditorTarget(activeFieldRef: MathfieldRef) {
  activeFieldRef.current?.blur?.();
}

export function executeLatexEditorCommand(
  activeFieldRef: MathfieldRef,
  mainFieldRef: MathfieldRef,
  command: string,
) {
  focusLatexEditorTarget(activeFieldRef, mainFieldRef)?.executeCommand(command);
}

export function insertLatexIntoEditor(
  activeFieldRef: MathfieldRef,
  mainFieldRef: MathfieldRef,
  latex: string,
) {
  const field = focusLatexEditorTarget(activeFieldRef, mainFieldRef);
  if (!field) {
    return;
  }

  if (isLatexInsertTarget(field)) {
    field.insert(latex);
    return;
  }

  const currentLatex = field.getValue?.('latex') ?? '';
  field.setValue(`${currentLatex}${latex}`);
  field.dispatchEvent?.(new Event('input', { bubbles: true }));
}
