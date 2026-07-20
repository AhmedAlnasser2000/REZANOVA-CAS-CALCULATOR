import {
  Component,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type ReactNode,
} from 'react';
import type {
  MathfieldElement,
  VirtualKeyboardLayout,
} from 'mathlive';
import {
  canonicalizeMathInput,
  normalizeLiveInputOperatorLatex,
} from '../lib/input/input-canonicalization';
import type { ModeId } from '../types/calculator';
import {
  shouldHandlePlainEnter,
  shouldHandlePlainMathOperator,
  shouldHandlePlainSpace,
} from './math-editor-keyflow';
import { buildInlineShortcutOverrides } from './math-editor-shortcuts';
import { useEditorAnalysisControl } from '../lib/editor/editor-analysis-control';
import { readMathClipboardEvent } from '../lib/clipboard';

type MathEditorProps = {
  value: string;
  onChange: (latex: string) => void;
  onSubmit?: () => void;
  onFocus?: (field: MathfieldElement) => void;
  onBlur?: () => void;
  className?: string;
  dataTestId?: string;
  readOnly?: boolean;
  placeholder?: string;
  keyboardLayouts?: readonly VirtualKeyboardLayout[];
  modeId?: ModeId;
  shortcutProfile?: 'default' | 'graphing';
  screenHint?: string;
  onPasteCanonicalize?: (text: string) => string | null | undefined;
};

type MathEditorContainmentProps = {
  children: ReactNode;
  onRestart?: () => void;
  resetKey?: number;
};

type MathEditorContainmentState = {
  error: Error | null;
};

export class MathEditorContainment extends Component<
  MathEditorContainmentProps,
  MathEditorContainmentState
> {
  state: MathEditorContainmentState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): MathEditorContainmentState {
    return { error };
  }

  componentDidUpdate(previousProps: MathEditorContainmentProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div
          className="math-editor-containment-fallback"
          data-testid="math-editor-containment-fallback"
          role="alert"
        >
          <span>Editor crashed.</span>
          {this.props.onRestart ? (
            <button type="button" onClick={this.props.onRestart}>
              Restart Editor
            </button>
          ) : null}
        </div>
      );
    }

    return this.props.children;
  }
}

function configureVirtualKeyboard(layouts: readonly VirtualKeyboardLayout[] | undefined) {
  if (typeof window === 'undefined' || !window.mathVirtualKeyboard || !layouts) {
    return;
  }

  window.mathVirtualKeyboard.layouts = layouts;
  window.mathVirtualKeyboard.editToolbar = 'default';
}

const MathEditorInner = forwardRef<MathfieldElement, MathEditorProps>(
  function MathEditorInner(
    {
      value,
      onChange,
      onSubmit,
      onFocus,
      onBlur,
      className,
      dataTestId,
      readOnly = false,
      placeholder,
      keyboardLayouts,
      modeId,
      shortcutProfile,
      screenHint,
      onPasteCanonicalize,
    },
    forwardedRef,
  ) {
    const elementRef = useRef<MathfieldElement | null>(null);
    const hasSyncedValueRef = useRef(false);

    useImperativeHandle(forwardedRef, () => elementRef.current as MathfieldElement, []);

    useLayoutEffect(() => {
      const field = elementRef.current;
      if (!field) {
        return;
      }

      field.readOnly = readOnly;
      field.smartFence = true;
      field.smartSuperscript = false;
      field.inlineShortcuts = buildInlineShortcutOverrides(field.inlineShortcuts, {
        modeId,
        profile: shortcutProfile,
        screenHint,
      });
      field.placeholder = placeholder ?? '';
      field.setAttribute('data-placeholder', placeholder ?? '');
      field.mathVirtualKeyboardPolicy = 'auto';

      const handleInput = () => {
        const rawLatex = field.getValue('latex');
        onChange(normalizeLiveInputOperatorLatex(rawLatex, modeId ? {
          mode: modeId,
          screenHint,
        } : undefined));
      };

      const handleFocus = () => {
        configureVirtualKeyboard(keyboardLayouts);
        onFocus?.(field);
      };

      const handleBlur = () => onBlur?.();

      const handleKeydown = (event: KeyboardEvent) => {
        if (shouldHandlePlainEnter(event)) {
          event.preventDefault();
          onSubmit?.();
          return;
        }

        if (shouldHandlePlainSpace(event)) {
          event.preventDefault();
          field.insert('\\quad');
          return;
        }

        if (shouldHandlePlainMathOperator(event)) {
          event.preventDefault();
          field.insert(event.key);
        }
      };

      const handlePaste = (event: ClipboardEvent) => {
        const readResult = readMathClipboardEvent(event);
        const text = readResult.ok ? readResult.canonicalLatex : readResult.textFallback;
        if (!text?.trim()) {
          return;
        }

        const hasCanonicalEnvelope = readResult.ok && readResult.source !== 'text';
        let nextLatex = text;
        if (!hasCanonicalEnvelope && onPasteCanonicalize) {
          nextLatex = onPasteCanonicalize(text) ?? text;
        } else if (!hasCanonicalEnvelope && modeId) {
          const canonicalized = canonicalizeMathInput(text, {
            mode: modeId,
            screenHint,
            liveAssist: true,
          });
          nextLatex = canonicalized.ok ? canonicalized.canonicalLatex : text;
        }
        if (!hasCanonicalEnvelope && nextLatex === text) {
          return;
        }

        event.preventDefault();
        field.insert(nextLatex);
      };

      field.addEventListener('input', handleInput);
      field.addEventListener('focus', handleFocus);
      field.addEventListener('blur', handleBlur);
      field.addEventListener('keydown', handleKeydown);
      field.addEventListener('paste', handlePaste);

      return () => {
        field.removeEventListener('input', handleInput);
        field.removeEventListener('focus', handleFocus);
        field.removeEventListener('blur', handleBlur);
        field.removeEventListener('keydown', handleKeydown);
        field.removeEventListener('paste', handlePaste);
      };
    }, [keyboardLayouts, modeId, onBlur, onChange, onFocus, onPasteCanonicalize, onSubmit, placeholder, readOnly, screenHint, shortcutProfile]);

    useEffect(() => {
      const field = elementRef.current;
      if (!field) {
        return;
      }

      if (!hasSyncedValueRef.current || field.getValue('latex') !== value) {
        field.setValue(value);
        hasSyncedValueRef.current = true;
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
        data-testid={dataTestId}
        tabIndex={readOnly ? -1 : 0}
        ref={(node: MathfieldElement | null) => {
          elementRef.current = node;
        }}
      />
    );
  },
);

export const MathEditor = forwardRef<MathfieldElement, MathEditorProps>(
  function MathEditor(props, forwardedRef) {
    const editorControl = useEditorAnalysisControl();

    return (
      <MathEditorContainment
        onRestart={editorControl.restartEditor}
        resetKey={editorControl.generation}
      >
        <MathEditorInner
          key={editorControl.generation}
          {...props}
          ref={forwardedRef}
        />
      </MathEditorContainment>
    );
  },
);
