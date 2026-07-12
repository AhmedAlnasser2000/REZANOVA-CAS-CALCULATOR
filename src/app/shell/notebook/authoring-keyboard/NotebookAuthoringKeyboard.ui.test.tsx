import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { NotebookMathField, NotebookMathFieldProvider } from '../math-field';
import { NotebookTransientLayerProvider } from '../transient-ui';
import { NotebookAuthoringKeyboard } from './NotebookAuthoringKeyboard';

function KeyboardHarness({
  instanceId = 'notebook.keyboard',
  onChange = vi.fn(),
}: {
  instanceId?: string;
  onChange?: (latex: string) => void;
}) {
  const [value, setValue] = useState('');
  return (
    <NotebookTransientLayerProvider>
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
        <NotebookAuthoringKeyboard instanceId={instanceId} />
      </NotebookMathFieldProvider>
    </NotebookTransientLayerProvider>
  );
}

function focusKeyboardField() {
  const field = screen.getByTestId('keyboard-field');
  field.focus();
  fireEvent.focus(field);
  return field as HTMLElement & { getValue: () => string };
}

describe('NotebookAuthoringKeyboard', () => {
  it('opens one compact Math Field Tools surface for the active field', () => {
    render(<KeyboardHarness />);
    expect(screen.queryByTestId('notebook-authoring-keyboard')).not.toBeInTheDocument();

    focusKeyboardField();
    const surface = screen.getByTestId('notebook-authoring-keyboard');
    expect(surface).toHaveClass('is-compact');
    expect(within(surface).getByText('Math Field Tools')).toBeInTheDocument();
    expect(within(surface).getByText('Separate equation')).toBeInTheDocument();
    expect(screen.queryByTestId('notebook-template-toolbar')).not.toBeInTheDocument();
  });

  it('renders symbol-first shortcuts and inserts through the active field', () => {
    const onChange = vi.fn();
    render(<KeyboardHarness onChange={onChange} />);
    const field = focusKeyboardField();
    const surface = screen.getByTestId('notebook-authoring-keyboard');

    const fraction = within(surface).getByRole('button', { name: 'Fraction' });
    expect(fraction).toHaveTextContent('a⁄b');
    expect(fraction).not.toHaveTextContent('Fraction');
    fireEvent.click(fraction);
    expect(field.getValue()).toContain('\\frac');
    expect(onChange).toHaveBeenCalled();
    expect(document.activeElement).toBe(field);
  });

  it('expands the same surface for categories and an accessible 8 by 8 matrix picker', () => {
    render(<KeyboardHarness />);
    const field = focusKeyboardField();
    const surface = screen.getByTestId('notebook-authoring-keyboard');

    fireEvent.click(within(surface).getByRole('button', { name: 'Open symbol keyboard' }));
    expect(surface).toHaveClass('is-expanded');
    fireEvent.click(within(surface).getByRole('tab', { name: 'Calculus' }));
    expect(within(surface).getByRole('button', { name: 'Integral' })).toHaveTextContent('∫');

    fireEvent.change(within(surface).getByRole('searchbox'), { target: { value: 'matrix' } });
    fireEvent.click(within(surface).getByRole('button', { name: 'Matrix, document only' }));
    const picker = screen.getByLabelText('Choose matrix dimensions');
    expect(within(picker).getAllByRole('gridcell')).toHaveLength(64);
    const threeByFour = within(picker).getByRole('gridcell', { name: '3 by 4 matrix' });
    fireEvent.pointerEnter(threeByFour);
    expect(within(picker).getByText('3 × 4')).toBeInTheDocument();
    fireEvent.click(threeByFour);
    expect(field.getValue()).toContain('\\begin{bmatrix}');
    expect(field.getValue().match(/&/gu)).toHaveLength(9);
    expect(screen.queryByLabelText('Choose matrix dimensions')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(field);
  });

  it('dismisses matrix, symbols, and compact tools one Escape at a time', () => {
    render(<KeyboardHarness />);
    const field = focusKeyboardField();
    const surface = screen.getByTestId('notebook-authoring-keyboard');
    fireEvent.click(within(surface).getByRole('button', { name: 'Open symbol keyboard' }));
    fireEvent.change(within(surface).getByRole('searchbox'), { target: { value: 'matrix' } });
    fireEvent.click(within(surface).getByRole('button', { name: 'Matrix, document only' }));

    fireEvent.keyDown(document, { key: 'Escape', repeat: false });
    expect(screen.queryByLabelText('Choose matrix dimensions')).not.toBeInTheDocument();
    expect(within(surface).getByRole('searchbox')).toBeInTheDocument();
    fireEvent.keyUp(document, { key: 'Escape' });
    fireEvent.keyDown(document, { key: 'Escape', repeat: false });
    expect(within(surface).queryByRole('searchbox')).not.toBeInTheDocument();
    fireEvent.keyUp(document, { key: 'Escape' });
    fireEvent.keyDown(document, { key: 'Escape', repeat: false });
    expect(screen.queryByTestId('notebook-authoring-keyboard')).not.toBeInTheDocument();
    expect(field).toHaveAttribute('data-notebook-field-role', 'display');
  });

  it('restores a dragged Math Authoring position for the same Notebook tab only', async () => {
    const first = render(<KeyboardHarness instanceId="notebook.position-a" />);
    focusKeyboardField();
    const surface = screen.getByTestId('notebook-authoring-keyboard');
    const handle = within(surface).getByRole('button', { name: 'Move Math Authoring' });
    fireEvent.pointerDown(handle, { clientX: 10, clientY: 10 });
    fireEvent.pointerMove(window, { clientX: 430, clientY: 270 });
    fireEvent.pointerUp(window, { clientX: 430, clientY: 270 });
    expect(surface).toHaveStyle({ left: '420px', top: '260px' });

    first.unmount();
    render(<KeyboardHarness instanceId="notebook.position-a" />);
    focusKeyboardField();
    await waitFor(() => {
      expect(screen.getByTestId('notebook-authoring-keyboard')).toHaveStyle({
        left: '420px',
        top: '260px',
      });
    });
  });
});
