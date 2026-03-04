import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  formatSignedNumberInput,
  parseSignedNumberInput,
} from '../lib/signed-number';

type SignedNumberDraftInputProps = {
  value: string;
  onValueChange: (value: string) => void;
  onFocus?: (element: HTMLInputElement) => void;
  className?: string;
  disabled?: boolean;
};

export const SignedNumberDraftInput = forwardRef<HTMLInputElement, SignedNumberDraftInputProps>(
  function SignedNumberDraftInput(
    { value, onValueChange, onFocus, className, disabled = false },
    forwardedRef,
  ) {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    useImperativeHandle(forwardedRef, () => inputRef.current as HTMLInputElement, []);

    function normalizeDraft(nextValue: string) {
      const trimmed = nextValue.trim();
      if (!trimmed || trimmed === '+' || trimmed === '-' || trimmed === '.' || trimmed === '+.' || trimmed === '-.') {
        return nextValue;
      }

      const parsed = parseSignedNumberInput(nextValue);
      return parsed === null ? nextValue : formatSignedNumberInput(parsed);
    }

    return (
      <input
        ref={(node) => {
          inputRef.current = node;
        }}
        className={className}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        value={isEditing ? value : normalizeDraft(value)}
        onChange={(event) => {
          onValueChange(event.target.value);
        }}
        onBlur={() => {
          setIsEditing(false);
          onValueChange(normalizeDraft(value));
        }}
        onFocus={(event) => {
          setIsEditing(true);
          onFocus?.(event.currentTarget);
          event.currentTarget.select();
        }}
      />
    );
  },
);
