import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { NotebookMathField } from './NotebookMathField';
import {
  NotebookMathFieldProvider,
} from './NotebookMathFieldController';
import { useNotebookMathFieldController } from './notebookMathFieldContext';

function ControllerProbe() {
  const controller = useNotebookMathFieldController();
  return (
    <div>
      <output data-testid="active-field">{controller.active?.nodeId ?? 'none'}</output>
      <button type="button" onClick={() => controller.insert('\\frac{#0}{#?}')}>Insert fraction</button>
      <button type="button" onClick={() => controller.execute('undo')}>Undo math</button>
    </div>
  );
}

function FieldHarness({ onChange = vi.fn() }: { onChange?: (latex: string) => void }) {
  const [value, setValue] = useState('x');
  return (
    <NotebookMathFieldProvider>
      <NotebookMathField
        dataTestId="notebook-field"
        nodeId="math.1"
        role="inline"
        value={value}
        workspaceTarget="calculate"
        onChange={(latex) => {
          setValue(latex);
          onChange(latex);
        }}
      />
      <ControllerProbe />
    </NotebookMathFieldProvider>
  );
}

describe('NotebookMathField', () => {
  it('uses manual keyboard policy without changing the global layout registry', () => {
    const layouts = window.mathVirtualKeyboard.layouts;
    render(<FieldHarness />);

    const field = screen.getByTestId('notebook-field') as HTMLElement & {
      mathVirtualKeyboardPolicy: string;
    };
    fireEvent.focus(field);

    expect(field.mathVirtualKeyboardPolicy).toBe('manual');
    expect(window.mathVirtualKeyboard.layouts).toBe(layouts);
    expect(screen.getByTestId('active-field')).toHaveTextContent('math.1');
  });

  it('inserts through the active field and restores focus after keyboard actions', () => {
    render(<FieldHarness />);
    const field = screen.getByTestId('notebook-field') as HTMLElement & {
      commandLog: string[];
      getValue: () => string;
    };
    field.focus();
    fireEvent.focus(field);

    fireEvent.click(screen.getByRole('button', { name: 'Insert fraction' }));
    expect(field.getValue()).toContain('\\frac');
    expect(document.activeElement).toBe(field);

    fireEvent.click(screen.getByRole('button', { name: 'Undo math' }));
    expect(field.commandLog).toContain('undo');
    expect(document.activeElement).toBe(field);
  });

  it('reports normalized relation input through the Notebook-local wrapper', () => {
    const onChange = vi.fn();
    render(<FieldHarness onChange={onChange} />);
    const field = screen.getByTestId('notebook-field') as HTMLElement & {
      setValue: (value: string) => void;
    };

    field.setValue('x < = 2');
    field.focus();
    fireEvent.focus(field);
    fireEvent.input(field);
    expect(onChange).toHaveBeenCalledWith('x \\le 2');
    expect(screen.getByTestId('active-field')).toHaveTextContent('math.1');
  });
});
