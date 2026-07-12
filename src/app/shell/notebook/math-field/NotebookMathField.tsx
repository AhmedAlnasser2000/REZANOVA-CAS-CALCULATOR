import type { MathfieldElement } from 'mathlive';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from 'react';

import type { NotebookWorkspaceTarget } from '../../../../lib/notebook';
import { normalizeLiveInputOperatorLatex } from '../../../../lib/input/input-canonicalization';
import {
  useNotebookMathFieldController,
  type NotebookMathFieldRole,
} from './notebookMathFieldContext';

type NotebookMathFieldProps = {
  className?: string;
  dataTestId?: string;
  nodeId: string;
  onChange: (latex: string) => void;
  onFocus?: () => void;
  onSubmit?: () => void;
  placeholder?: string;
  readOnly?: boolean;
  role: NotebookMathFieldRole;
  value: string;
  workspaceTarget: NotebookWorkspaceTarget;
};

export const NotebookMathField = forwardRef<MathfieldElement, NotebookMathFieldProps>(
  function NotebookMathField({
    className,
    dataTestId,
    nodeId,
    onChange,
    onFocus,
    onSubmit,
    placeholder,
    readOnly = false,
    role,
    value,
    workspaceTarget,
  }, forwardedRef) {
    const fieldRef = useRef<MathfieldElement | null>(null);
    const hasSyncedValueRef = useRef(false);
    const onChangeRef = useRef(onChange);
    const onFocusRef = useRef(onFocus);
    const onSubmitRef = useRef(onSubmit);
    const workspaceTargetRef = useRef(workspaceTarget);
    const { activate, release } = useNotebookMathFieldController();

    useImperativeHandle(forwardedRef, () => fieldRef.current as MathfieldElement, []);

    useLayoutEffect(() => {
      const field = fieldRef.current;
      if (!field) {
        return;
      }
      field.readOnly = readOnly;
      field.smartFence = true;
      field.smartSuperscript = false;
      field.placeholder = placeholder ?? '';
      field.setAttribute('data-placeholder', placeholder ?? '');
      field.mathVirtualKeyboardPolicy = 'manual';
      const suppressNativeMenu = () => {
        try {
          field.menuItems = [];
        } catch {
          // MathLive rejects menu configuration until its mount event fires.
        }
      };

      const handleInput = () => {
        onChangeRef.current(normalizeLiveInputOperatorLatex(field.getValue('latex'), {
          mode: workspaceTargetRef.current,
        }));
      };
      const handleFocus = () => {
        activate(field, nodeId, role);
        onFocusRef.current?.();
      };
      const handleContextMenu = (event: MouseEvent) => {
        event.preventDefault();
        activate(field, nodeId, role);
        field.focus();
      };
      const handleKeydown = (event: KeyboardEvent) => {
        if (event.key === 'Enter' && !event.shiftKey && onSubmitRef.current) {
          event.preventDefault();
          onSubmitRef.current();
        }
      };

      field.addEventListener('input', handleInput);
      field.addEventListener('focus', handleFocus);
      field.addEventListener('contextmenu', handleContextMenu);
      field.addEventListener('keydown', handleKeydown);
      field.addEventListener('mount', suppressNativeMenu);
      suppressNativeMenu();
      return () => {
        field.removeEventListener('input', handleInput);
        field.removeEventListener('focus', handleFocus);
        field.removeEventListener('contextmenu', handleContextMenu);
        field.removeEventListener('keydown', handleKeydown);
        field.removeEventListener('mount', suppressNativeMenu);
        release(field);
      };
    }, [activate, nodeId, placeholder, readOnly, release, role]);

    useEffect(() => {
      onChangeRef.current = onChange;
      onFocusRef.current = onFocus;
      onSubmitRef.current = onSubmit;
      workspaceTargetRef.current = workspaceTarget;
    }, [onChange, onFocus, onSubmit, workspaceTarget]);

    useEffect(() => {
      const field = fieldRef.current;
      if (!field) {
        return;
      }
      if (!hasSyncedValueRef.current || field.getValue('latex') !== value) {
        field.setValue(value);
        hasSyncedValueRef.current = true;
      }
    }, [value]);

    return (
      <math-field
        className={`notebook-math-field${className ? ` ${className}` : ''}`}
        data-notebook-field-role={role}
        data-notebook-node-id={nodeId}
        data-testid={dataTestId}
        tabIndex={0}
        ref={(node: MathfieldElement | null) => {
          fieldRef.current = node;
        }}
      />
    );
  },
);
