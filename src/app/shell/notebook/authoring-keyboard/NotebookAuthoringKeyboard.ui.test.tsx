import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { NotebookMathField, NotebookMathFieldProvider } from '../math-field';
import { NotebookAuthoringKeyboard } from './NotebookAuthoringKeyboard';

function KeyboardHarness({ onChange = vi.fn() }: { onChange?: (latex: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <NotebookMathFieldProvider>
      <NotebookMathField
        dataTestId="keyboard-field"
        nodeId="math.keyboard"
        role="display"
        value={value}
        workspaceTarget="calculate"
        onChange={(latex) => {
          setValue(latex);
          onChange(latex);
        }}
      />
      <NotebookAuthoringKeyboard />
    </NotebookMathFieldProvider>
  );
}

function focusKeyboardField() {
  const field = screen.getByTestId('keyboard-field');
  field.focus();
  fireEvent.focus(field);
  return field as HTMLElement & { getValue: () => string };
}

describe('NotebookAuthoringKeyboard', () => {
  it('appears only for an active Notebook math field', () => {
    render(<KeyboardHarness />);
    expect(screen.queryByTestId('notebook-authoring-keyboard')).not.toBeInTheDocument();

    focusKeyboardField();
    expect(screen.getByTestId('notebook-authoring-keyboard')).toBeInTheDocument();
    expect(screen.getByTestId('notebook-template-toolbar')).toBeInTheDocument();
    expect(screen.getByText('Display math')).toBeInTheDocument();
  });

  it('inserts novice-friendly templates through the active field', () => {
    const onChange = vi.fn();
    render(<KeyboardHarness onChange={onChange} />);
    const field = focusKeyboardField();
    const keyboard = screen.getByTestId('notebook-authoring-keyboard');

    fireEvent.click(within(keyboard).getByRole('button', { name: 'Fraction' }));
    expect(field.getValue()).toContain('\\frac');
    expect(onChange).toHaveBeenCalled();
    expect(document.activeElement).toBe(field);
  });

  it('supports category navigation and searchable document-only structures', () => {
    render(<KeyboardHarness />);
    focusKeyboardField();
    const keyboard = screen.getByTestId('notebook-authoring-keyboard');

    fireEvent.click(within(keyboard).getByRole('tab', { name: 'Calculus' }));
    expect(within(keyboard).getByRole('button', { name: 'Integral' })).toBeInTheDocument();

    fireEvent.change(within(keyboard).getByRole('searchbox'), {
      target: { value: 'matrix' },
    });
    const matrix = within(keyboard).getByRole('button', { name: /2 by 2 matrix/ });
    expect(matrix).toHaveTextContent('Document');
    expect(within(keyboard).queryByText('External link')).not.toBeInTheDocument();
  });

  it('collapses without discarding the active field', () => {
    render(<KeyboardHarness />);
    focusKeyboardField();

    fireEvent.click(screen.getByRole('button', { name: 'Collapse math keyboard' }));
    expect(screen.queryByTestId('notebook-template-toolbar')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Expand math keyboard' })).toBeInTheDocument();
  });
});
