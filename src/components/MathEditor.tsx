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
import { mathFieldPlaceholder } from './math-field-placeholder';

type MathEditorProps = {
  value: string;
  onChange: (latex: string) => void;
  onSubmit?: () => void;
  onFocus?: (field: MathfieldElement) => void;
  onBlur?: () => void;
  className?: string;
  dataTestId?: string;
  readOnly?: boolean;
  /** Readable words, shown as text. Never LaTeX. */
  placeholder?: string;
  /** A math example such as `x^2`, or `\text{…}` mixed with math. */
  placeholderLatex?: string;
  keyboardLayouts?: readonly VirtualKeyboardLayout[];
  modeId?: ModeId;
  shortcutProfile?: 'default' | 'graphing';
  screenHint?: string;
  onPasteCanonicalize?: (
    text: string,
  ) => string | null | undefined | Promise<string | null | undefined>;
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

const configuredLinearAlgebraMenuFields = new WeakSet<MathfieldElement>();

function configureLinearAlgebraMatrixMenu(field: MathfieldElement) {
  if (configuredLinearAlgebraMenuFields.has(field)) return;
  const menuItems: MathfieldElement['menuItems'] | undefined = field.menuItems;
  if (!menuItems) return;
  const items = menuItems.map((item) => {
    if (!('submenu' in item) || !('id' in item) || item.id !== 'insert-matrix') return item;
    return {
      ...item,
      submenu: item.submenu.map((cell) => {
        if (!('onMenuSelect' in cell) || !/^insert-matrix-\d+x\d+$/u.test(cell.id ?? '')) {
          return cell;
        }
        return {
          ...cell,
          onMenuSelect: (selection: Parameters<NonNullable<typeof cell.onMenuSelect>>[0]) => {
            cell.onMenuSelect?.(selection);
            const range = field.selection.ranges[0];
            if (range && !field.selectionIsCollapsed) {
              field.selection = range[0];
              field.executeCommand('moveToNextPlaceholder');
            }
          },
        };
      }),
    };
  });
  field.menuItems = items;
  configuredLinearAlgebraMenuFields.add(field);
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
      placeholderLatex,
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
    // Callers pass inline callbacks; reading them through a ref keeps a parent
    // re-render from reconfiguring the field, which makes MathLive re-typeset.
    const callbacksRef = useRef({ keyboardLayouts, onBlur, onChange, onFocus, onPasteCanonicalize, onSubmit });
    useLayoutEffect(() => {
      callbacksRef.current = { keyboardLayouts, onBlur, onChange, onFocus, onPasteCanonicalize, onSubmit };
    });

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
      const shownPlaceholder = mathFieldPlaceholder({ text: placeholder, latex: placeholderLatex });
      field.placeholder = shownPlaceholder.latex;
      field.setAttribute('data-placeholder', shownPlaceholder.readable);
      field.mathVirtualKeyboardPolicy = 'auto';
      if (modeId === 'matrix' || modeId === 'vector') {
        configureLinearAlgebraMatrixMenu(field);
      }

      const handleInput = () => {
        const rawLatex = field.getValue('latex');
        callbacksRef.current.onChange(normalizeLiveInputOperatorLatex(rawLatex, modeId ? {
          mode: modeId,
          screenHint,
        } : undefined));
      };

      const handleFocus = () => {
        configureVirtualKeyboard(callbacksRef.current.keyboardLayouts);
        callbacksRef.current.onFocus?.(field);
      };

      const handleBlur = () => callbacksRef.current.onBlur?.();

      const handleKeydown = (event: KeyboardEvent) => {
        if (shouldHandlePlainEnter(event)) {
          event.preventDefault();
          callbacksRef.current.onSubmit?.();
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
        const { onPasteCanonicalize } = callbacksRef.current;
        if (!hasCanonicalEnvelope && onPasteCanonicalize) {
          const canonicalized = onPasteCanonicalize(text);
          if (canonicalized instanceof Promise) {
            event.preventDefault();
            void canonicalized
              .then((resolved) => field.insert(resolved ?? text))
              .catch(() => field.insert(text));
            return;
          }
          nextLatex = canonicalized ?? text;
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
    }, [modeId, placeholder, placeholderLatex, readOnly, screenHint, shortcutProfile]);

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
