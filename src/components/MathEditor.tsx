import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import type { MathfieldElement, VirtualKeyboardLayout } from 'mathlive';

type MathEditorProps = {
  value: string;
  onChange: (latex: string) => void;
  onFocus?: (field: MathfieldElement) => void;
  className?: string;
  readOnly?: boolean;
  placeholder?: string;
  keyboardLayouts?: readonly VirtualKeyboardLayout[];
};

function configureVirtualKeyboard(layouts: readonly VirtualKeyboardLayout[] | undefined) {
  if (typeof window === 'undefined' || !window.mathVirtualKeyboard || !layouts) {
    return;
  }

  window.mathVirtualKeyboard.layouts = layouts;
  window.mathVirtualKeyboard.editToolbar = 'default';
}

export const MathEditor = forwardRef<MathfieldElement, MathEditorProps>(
  function MathEditor(
    { value, onChange, onFocus, className, readOnly = false, placeholder, keyboardLayouts },
    forwardedRef,
  ) {
    const elementRef = useRef<MathfieldElement | null>(null);

    useImperativeHandle(forwardedRef, () => elementRef.current as MathfieldElement, []);

    useEffect(() => {
      const field = elementRef.current;
      if (!field) {
        return;
      }

      field.readOnly = readOnly;
      field.smartFence = true;
      field.inlineShortcuts = {};
      field.placeholder = placeholder ?? '';
      field.mathVirtualKeyboardPolicy = 'auto';

      const handleInput = () => {
        onChange(field.getValue('latex'));
      };

      const handleFocus = () => {
        configureVirtualKeyboard(keyboardLayouts);
        onFocus?.(field);
      };

      field.addEventListener('input', handleInput);
      field.addEventListener('focus', handleFocus);

      return () => {
        field.removeEventListener('input', handleInput);
        field.removeEventListener('focus', handleFocus);
      };
    }, [keyboardLayouts, onChange, onFocus, placeholder, readOnly]);

  useEffect(() => {
      const field = elementRef.current;
      if (!field) {
        return;
      }

      if (field.getValue('latex') !== value) {
        field.setValue(value);
      }
    }, [value]);

    useEffect(() => {
      const field = elementRef.current;
      if (!field || document.activeElement !== field) {
        return;
      }

      configureVirtualKeyboard(keyboardLayouts);
    }, [keyboardLayouts]);

    return (
      <math-field
        className={className}
        ref={(node: MathfieldElement | null) => {
          elementRef.current = node;
        }}
      />
    );
  },
);
