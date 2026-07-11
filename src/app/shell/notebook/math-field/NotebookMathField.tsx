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

      const handleInput = () => {
        onChangeRef.current(normalizeLiveInputOperatorLatex(field.getValue('latex'), {
          mode: workspaceTargetRef.current,
        }));
      };
      const handleFocus = () => activate(field, nodeId, role);
      const handleKeydown = (event: KeyboardEvent) => {
        if (event.key === 'Enter' && !event.shiftKey && onSubmitRef.current) {
          event.preventDefault();
          onSubmitRef.current();
        }
      };

      field.addEventListener('input', handleInput);
      field.addEventListener('focus', handleFocus);
      field.addEventListener('keydown', handleKeydown);
      return () => {
        field.removeEventListener('input', handleInput);
        field.removeEventListener('focus', handleFocus);
        field.removeEventListener('keydown', handleKeydown);
        release(field);
      };
    }, [activate, nodeId, placeholder, readOnly, release, role]);

    useEffect(() => {
      onChangeRef.current = onChange;
      onSubmitRef.current = onSubmit;
      workspaceTargetRef.current = workspaceTarget;
    }, [onChange, onSubmit, workspaceTarget]);

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
