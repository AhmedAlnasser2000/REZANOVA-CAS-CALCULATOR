import type { MathfieldElement } from 'mathlive';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

type LinearAlgebraScalarCellProps = {
  ariaLabel: string;
  columnIndex: number;
  groupId: string;
  onCommit: (latex: string) => string | null;
  onFocus?: (field: MathfieldElement) => void;
  resolvedLatex?: string;
  rowIndex: number;
  validationKey: string;
  value: string;
};

function linearAlgebraCellFields(groupId: string) {
  return [...document.querySelectorAll<MathfieldElement>('math-field[data-linear-algebra-cell]')]
    .filter((field) => field.dataset.linearAlgebraCellGroup === groupId)
    .sort((left, right) => {
      const leftIndex = Number(left.dataset.linearAlgebraCellIndex ?? 0);
      const rightIndex = Number(right.dataset.linearAlgebraCellIndex ?? 0);
      return leftIndex - rightIndex;
    });
}

function focusCell(field: MathfieldElement, edge: 'start' | 'end' | 'preserve' = 'preserve') {
  field.focus();
  if (edge === 'start') field.position = 0;
  if (edge === 'end') field.position = field.lastOffset;
}

function focusRelativeCell(field: MathfieldElement, delta: number) {
  const groupId = field.dataset.linearAlgebraCellGroup;
  if (!groupId) return;
  const fields = linearAlgebraCellFields(groupId);
  const index = fields.indexOf(field);
  if (index < 0 || fields.length === 0) return;
  const next = fields[(index + delta + fields.length) % fields.length];
  focusCell(next, delta < 0 ? 'end' : 'start');
}

function focusCoordinateCell(field: MathfieldElement, rowDelta: number) {
  const groupId = field.dataset.linearAlgebraCellGroup;
  if (!groupId) return false;
  const row = Number(field.dataset.linearAlgebraCellRow ?? 0);
  const column = Number(field.dataset.linearAlgebraCellColumn ?? 0);
  const fields = linearAlgebraCellFields(groupId);
  const sameColumn = fields.filter((candidate) =>
    Number(candidate.dataset.linearAlgebraCellColumn ?? -1) === column);
  if (sameColumn.length <= 1) return false;
  const currentIndex = sameColumn.indexOf(field);
  if (currentIndex < 0) return false;
  const target = sameColumn[(currentIndex + rowDelta + sameColumn.length) % sameColumn.length];
  if (Number(target.dataset.linearAlgebraCellRow ?? row) === row) return false;
  focusCell(target);
  return true;
}

export function LinearAlgebraScalarCell({
  ariaLabel,
  columnIndex,
  groupId,
  onCommit,
  onFocus,
  resolvedLatex,
  rowIndex,
  validationKey,
  value,
}: LinearAlgebraScalarCellProps) {
  const fieldRef = useRef<MathfieldElement | null>(null);
  const draftRef = useRef(value);
  const validationKeyRef = useRef(validationKey);
  const [feedback, setFeedback] = useState<string | null>(null);

  useLayoutEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    field.smartFence = true;
    field.smartSuperscript = false;
    field.mathVirtualKeyboardPolicy = 'manual';
    const commit = () => {
      const error = onCommit(draftRef.current);
      setFeedback(error);
      return error;
    };
    const handleInput = () => {
      draftRef.current = field.getValue('latex');
      setFeedback(null);
    };
    const handleBlur = () => commit();
    const handleFocus = () => onFocus?.(field);
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        if (!commit()) {
          focusRelativeCell(field, event.shiftKey ? -1 : 1);
        }
      } else if (event.key === 'Tab') {
        commit();
      } else if (event.key === 'ArrowRight') {
        if (field.selectionIsCollapsed && field.position >= field.lastOffset) {
          event.preventDefault();
          event.stopPropagation();
          focusRelativeCell(field, 1);
        }
      } else if (event.key === 'ArrowLeft') {
        if (field.selectionIsCollapsed && field.position <= 0) {
          event.preventDefault();
          event.stopPropagation();
          focusRelativeCell(field, -1);
        }
      } else if (event.key === 'ArrowDown') {
        if (focusCoordinateCell(field, 1)) {
          event.preventDefault();
          event.stopPropagation();
        }
      } else if (event.key === 'ArrowUp') {
        if (focusCoordinateCell(field, -1)) {
          event.preventDefault();
          event.stopPropagation();
        }
      }
    };
    field.addEventListener('input', handleInput);
    field.addEventListener('blur', handleBlur);
    field.addEventListener('focus', handleFocus);
    field.addEventListener('keydown', handleKeydown);
    return () => {
      field.removeEventListener('input', handleInput);
      field.removeEventListener('blur', handleBlur);
      field.removeEventListener('focus', handleFocus);
      field.removeEventListener('keydown', handleKeydown);
    };
  }, [onCommit, onFocus]);

  useEffect(() => {
    const field = fieldRef.current;
    draftRef.current = value;
    if (field && field.getValue('latex') !== value) field.setValue(value);
    setFeedback(null);
  }, [value]);

  useEffect(() => {
    const previousKey = validationKeyRef.current;
    validationKeyRef.current = validationKey;
    if (previousKey === validationKey) return;
    const error = onCommit(draftRef.current);
    setFeedback(error);
  }, [onCommit, validationKey]);

  const showResolved = Boolean(resolvedLatex && resolvedLatex !== value);
  const cellIndex = rowIndex * 100 + columnIndex;
  return (
    <span className="linear-algebra-scalar-cell">
      <math-field
        aria-label={ariaLabel}
        className="linear-algebra-cell-mathfield"
        data-linear-algebra-cell="true"
        data-linear-algebra-cell-column={columnIndex}
        data-linear-algebra-cell-group={groupId}
        data-linear-algebra-cell-index={cellIndex}
        data-linear-algebra-cell-row={rowIndex}
        ref={(node: MathfieldElement | null) => {
          fieldRef.current = node;
        }}
        role="textbox"
        tabIndex={0}
      />
      {showResolved ? (
        <span className="linear-algebra-cell-preview" title="Resolved stored-value preview">
          → {resolvedLatex}
        </span>
      ) : null}
      {feedback ? <span className="linear-algebra-validation-message" role="alert">{feedback}</span> : null}
    </span>
  );
}
