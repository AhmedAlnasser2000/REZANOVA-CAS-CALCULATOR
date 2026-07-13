import {
  Minus,
  Plus,
  RotateCcw,
} from 'lucide-react';
import {
  useEffect,
  useState,
} from 'react';

import {
  isNotebookFontSize,
  NOTEBOOK_FONT_SIZE_MAX,
  NOTEBOOK_FONT_SIZE_MIN,
} from '../../../../lib/notebook';

const DEFAULT_FONT_SIZE = 100;

export function NotebookFontSizeControl({
  value,
  onApply,
  onReset,
  disabled = false,
  label = 'Font size',
}: {
  value: number | null;
  onApply: (size: number) => void;
  onReset: () => void;
  disabled?: boolean;
  label?: string;
}) {
  const displayedValue = value ?? DEFAULT_FONT_SIZE;
  const [text, setText] = useState(String(displayedValue));

  useEffect(() => {
    setText(String(displayedValue));
  }, [displayedValue]);

  function applyText() {
    const next = Number.parseInt(text, 10);
    if (!isNotebookFontSize(next)) {
      setText(String(displayedValue));
      return;
    }
    onApply(next);
  }

  function nudge(direction: -1 | 1) {
    const next = Math.max(
      NOTEBOOK_FONT_SIZE_MIN,
      Math.min(NOTEBOOK_FONT_SIZE_MAX, displayedValue + direction),
    );
    setText(String(next));
    onApply(next);
  }

  return (
    <div
      className="notebook-font-size-control"
      aria-label={label}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        aria-label="Decrease font size"
        title="Decrease font size"
        disabled={disabled || displayedValue <= NOTEBOOK_FONT_SIZE_MIN}
        onClick={() => nudge(-1)}
      ><Minus aria-hidden="true" size={14} /></button>
      <label>
        <span className="sr-only">{label} percent</span>
        <input
          aria-label={`${label} percent`}
          disabled={disabled}
          inputMode="numeric"
          max={NOTEBOOK_FONT_SIZE_MAX}
          min={NOTEBOOK_FONT_SIZE_MIN}
          pattern="[0-9]*"
          type="text"
          value={text}
          onBlur={applyText}
          onChange={(event) => setText(event.target.value.replace(/[^0-9]/gu, ''))}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              applyText();
            }
            if (event.key === 'ArrowUp') {
              event.preventDefault();
              nudge(1);
            }
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              nudge(-1);
            }
          }}
        />
      </label>
      <span aria-hidden="true">%</span>
      <button
        type="button"
        aria-label="Increase font size"
        title="Increase font size"
        disabled={disabled || displayedValue >= NOTEBOOK_FONT_SIZE_MAX}
        onClick={() => nudge(1)}
      ><Plus aria-hidden="true" size={14} /></button>
      <button
        type="button"
        aria-label="Reset font size"
        title="Reset font size"
        disabled={disabled || value === null}
        onClick={() => {
          setText(String(DEFAULT_FONT_SIZE));
          onReset();
        }}
      ><RotateCcw aria-hidden="true" size={13} /></button>
    </div>
  );
}
