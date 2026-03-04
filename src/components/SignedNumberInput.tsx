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

type SignedNumberInputProps = {
  value: number;
  onValueChange: (value: number) => void;
  onFocus?: (element: HTMLInputElement) => void;
  className?: string;
};

export const SignedNumberInput = forwardRef<HTMLInputElement, SignedNumberInputProps>(
  function SignedNumberInput(
    { value, onValueChange, onFocus, className },
    forwardedRef,
  ) {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [draft, setDraft] = useState(() => formatSignedNumberInput(value));
    const [isEditing, setIsEditing] = useState(false);

    useImperativeHandle(forwardedRef, () => inputRef.current as HTMLInputElement, []);

    function commitDraft(nextDraft: string) {
      const parsed = parseSignedNumberInput(nextDraft);
      if (parsed === null) {
        setDraft(formatSignedNumberInput(value));
        return;
      }

      onValueChange(parsed);
      setDraft(formatSignedNumberInput(parsed));
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
        value={isEditing ? draft : formatSignedNumberInput(value)}
        onChange={(event) => {
          const nextDraft = event.target.value;
          setDraft(nextDraft);

          const parsed = parseSignedNumberInput(nextDraft);
          if (parsed !== null) {
            onValueChange(parsed);
          }
        }}
        onBlur={() => {
          setIsEditing(false);
          commitDraft(draft);
        }}
        onFocus={(event) => {
          setIsEditing(true);
          setDraft(formatSignedNumberInput(value));
          onFocus?.(event.currentTarget);
          event.currentTarget.select();
        }}
      />
    );
  },
);
