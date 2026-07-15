import type { MathfieldElement } from 'mathlive';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

type LinearAlgebraScalarCellProps = {
  ariaLabel: string;
  onCommit: (latex: string) => string | null;
  resolvedLatex?: string;
  value: string;
};

export function LinearAlgebraScalarCell({
  ariaLabel,
  onCommit,
  resolvedLatex,
  value,
}: LinearAlgebraScalarCellProps) {
  const fieldRef = useRef<MathfieldElement | null>(null);
  const draftRef = useRef(value);
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
    const handleKeydown = (event: KeyboardEvent) => {
      event.stopPropagation();
      if (event.key === 'Enter') {
        event.preventDefault();
        if (!commit()) {
          const fields = [...document.querySelectorAll<MathfieldElement>('math-field[data-linear-algebra-cell]')];
          const next = fields[fields.indexOf(field) + 1] ?? fields[0];
          next?.focus();
        }
      } else if (event.key === 'Tab') {
        commit();
      }
    };
    field.addEventListener('input', handleInput);
    field.addEventListener('blur', handleBlur);
    field.addEventListener('keydown', handleKeydown);
    return () => {
      field.removeEventListener('input', handleInput);
      field.removeEventListener('blur', handleBlur);
      field.removeEventListener('keydown', handleKeydown);
    };
  }, [onCommit]);

  useEffect(() => {
    const field = fieldRef.current;
    draftRef.current = value;
    if (field && field.getValue('latex') !== value) field.setValue(value);
  }, [value]);

  const showResolved = Boolean(resolvedLatex && resolvedLatex !== value);
  return (
    <span className="linear-algebra-scalar-cell">
      <math-field
        aria-label={ariaLabel}
        className="linear-algebra-cell-mathfield"
        data-linear-algebra-cell="true"
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
