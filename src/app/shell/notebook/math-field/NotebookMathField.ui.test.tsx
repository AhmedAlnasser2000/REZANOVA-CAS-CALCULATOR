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
      <output data-testid="typography-enabled">{String(controller.canApplyTypography())}</output>
      <output data-testid="cancellation-enabled">{String(controller.canApplyCancellation())}</output>
      <button type="button" onClick={() => controller.insert('\\frac{#0}{#?}')}>Insert fraction</button>
      <button type="button" onClick={() => controller.execute('undo')}>Undo math</button>
      <button type="button" onClick={() => controller.applyFontSize(149)}>Apply math size</button>
      <button type="button" onClick={() => controller.resetFontSize()}>Reset math size</button>
      <button type="button" onClick={() => controller.applyCancellation('diagonal')}>Cancel selected math</button>
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
      menuItems: readonly unknown[];
      mathVirtualKeyboardPolicy: string;
    };
    fireEvent.focus(field);

    expect(field.mathVirtualKeyboardPolicy).toBe('manual');
    expect(field.menuItems).toEqual([]);
    expect(window.mathVirtualKeyboard.layouts).toBe(layouts);
    expect(screen.getByTestId('active-field')).toHaveTextContent('math.1');
  });

  it('suppresses the native menu and routes context input through the Notebook field', () => {
    render(<FieldHarness />);
    const field = screen.getByTestId('notebook-field');

    expect(fireEvent.contextMenu(field)).toBe(false);
    expect(screen.getByTestId('active-field')).toHaveTextContent('math.1');
    expect(document.activeElement).toBe(field);
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

  it('collapses a newly selected template slot to a thin insertion caret', () => {
    render(<FieldHarness />);
    const field = screen.getByTestId('notebook-field') as HTMLElement & {
      position: number;
      selectionIsCollapsed: boolean;
    };
    Object.defineProperty(field, 'selection', {
      configurable: true,
      value: { ranges: [[1, 2]], direction: 'none' },
    });
    field.selectionIsCollapsed = false;
    field.focus();
    fireEvent.focus(field);

    fireEvent.click(screen.getByRole('button', { name: 'Insert fraction' }));

    expect(field.position).toBe(1);
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

  it('snaps selected math to MathLive native size levels and restores focus', () => {
    render(<FieldHarness />);
    const field = screen.getByTestId('notebook-field') as HTMLElement & {
      applyStyle: (style: { fontSize?: number | 'auto' }) => void;
      selectionIsCollapsed: boolean;
    };
    field.applyStyle = vi.fn();
    const applyStyle = vi.spyOn(field, 'applyStyle');
    field.focus();
    fireEvent.focus(field);

    expect(screen.getByTestId('typography-enabled')).toHaveTextContent('false');
    fireEvent.click(screen.getByRole('button', { name: 'Apply math size' }));
    expect(applyStyle).not.toHaveBeenCalled();

    Object.defineProperty(field, 'selection', {
      configurable: true,
      value: { ranges: [[0, 1]], direction: 'none' },
    });
    field.selectionIsCollapsed = false;
    fireEvent(field, new Event('selection-change'));

    expect(screen.getByTestId('typography-enabled')).toHaveTextContent('true');
    fireEvent.click(screen.getByRole('button', { name: 'Apply math size' }));
    expect(applyStyle).toHaveBeenLastCalledWith({ fontSize: 8 });
    expect(document.activeElement).toBe(field);

    fireEvent.click(screen.getByRole('button', { name: 'Reset math size' }));
    expect(applyStyle).toHaveBeenLastCalledWith({ fontSize: 'auto' });
    expect(document.activeElement).toBe(field);
  });

  it('only applies document-only cancellation to a selected math term', () => {
    render(<FieldHarness />);
    const field = screen.getByTestId('notebook-field') as HTMLElement & {
      getValue: () => string;
      selectionIsCollapsed: boolean;
    };
    field.focus();
    fireEvent.focus(field);

    expect(screen.getByTestId('cancellation-enabled')).toHaveTextContent('false');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel selected math' }));
    expect(field.getValue()).toBe('x');

    Object.defineProperty(field, 'selection', {
      configurable: true,
      value: { ranges: [[0, 1]], direction: 'none' },
    });
    field.selectionIsCollapsed = false;
    fireEvent(field, new Event('selection-change'));
    expect(screen.getByTestId('cancellation-enabled')).toHaveTextContent('true');

    fireEvent.click(screen.getByRole('button', { name: 'Cancel selected math' }));
    expect(field.getValue()).toContain('\\cancel');
    expect(document.activeElement).toBe(field);
  });
});
