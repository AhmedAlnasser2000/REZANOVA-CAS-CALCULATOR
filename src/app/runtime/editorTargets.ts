import type { MathfieldElement } from 'mathlive';

type MathfieldRef = {
  current: MathfieldElement | null;
};

export function isLatexInsertTarget(field: unknown): field is {
  focus?: (options?: FocusOptions) => void;
  dispatchEvent?: (event: Event) => boolean;
  insert: (latex: string) => void;
} {
  return Boolean(field && typeof (field as { insert?: unknown }).insert === 'function');
}

export function isLatexValueTarget(field: unknown): field is {
  focus?: (options?: FocusOptions) => void;
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
  options?: FocusOptions,
) {
  const field = resolveLatexEditorTarget(activeFieldRef.current, mainFieldRef.current);
  if (!field) {
    return null;
  }

  activeFieldRef.current = field;
  (field as { focus?: (options?: FocusOptions) => void }).focus?.(options);
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
  const field = focusLatexEditorTarget(activeFieldRef, mainFieldRef, { preventScroll: true }) as
    | ({ executeCommand?: (command: string) => unknown })
    | null;
  field?.executeCommand?.(command);
}

export function insertLatexIntoEditor(
  activeFieldRef: MathfieldRef,
  mainFieldRef: MathfieldRef,
  latex: string,
) {
  const field = focusLatexEditorTarget(activeFieldRef, mainFieldRef, { preventScroll: true });
  if (!field) {
    return;
  }

  const insertTarget = isLatexInsertTarget(field) ? field : null;
  if (insertTarget) {
    insertTarget.insert(latex);
    insertTarget.dispatchEvent?.(new Event('input', { bubbles: true }));
    return;
  }

  const valueTarget = isLatexValueTarget(field) ? field : null;
  if (!valueTarget) {
    return;
  }

  const currentLatex = valueTarget.getValue?.('latex') ?? '';
  valueTarget.setValue(`${currentLatex}${latex}`);
  valueTarget.dispatchEvent?.(new Event('input', { bubbles: true }));
}
