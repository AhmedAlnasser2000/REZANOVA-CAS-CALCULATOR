import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VariablesPanel } from './VariablesPanel';

describe('VariablesPanel', () => {
  it('sets, edits, clears, and clears all stored variables through callbacks', () => {
    const onSet = vi.fn(() => null);
    const onClear = vi.fn();
    const onClearAll = vi.fn();

    const { rerender } = render(
      <VariablesPanel
        presentation="overlay"
        variables={[]}
        onClose={vi.fn()}
        onSet={onSet}
        onClear={onClear}
        onClearAll={onClearAll}
      />,
    );

    fireEvent.change(screen.getByTestId('variables-name-input'), { target: { value: 'a' } });
    fireEvent.change(screen.getByTestId('variables-value-input'), { target: { value: '4' } });
    fireEvent.click(screen.getByTestId('variables-set-button'));

    expect(onSet).toHaveBeenCalledWith('a', '4');

    rerender(
      <VariablesPanel
        presentation="overlay"
        variables={[{ name: 'a', valueLatex: '4', numericValue: 4 }]}
        onClose={vi.fn()}
        onSet={onSet}
        onClear={onClear}
        onClearAll={onClearAll}
      />,
    );

    expect(screen.getByTestId('variables-entry')).toHaveTextContent('a');
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    expect(screen.getByTestId('variables-name-input')).toHaveValue('a');
    expect(screen.getByTestId('variables-value-input')).toHaveValue('4');

    fireEvent.click(screen.getByRole('button', { name: /^clear$/i }));
    expect(onClear).toHaveBeenCalledWith('a');

    fireEvent.click(screen.getByRole('button', { name: /clear all/i }));
    expect(onClearAll).toHaveBeenCalled();
  });

  it('uses explicit syntax when editing multi-character variables', () => {
    const onSet = vi.fn(() => null);

    render(
      <VariablesPanel
        presentation="overlay"
        variables={[{ name: 'mass', valueLatex: '5', numericValue: 5 }]}
        onClose={vi.fn()}
        onSet={onSet}
        onClear={vi.fn()}
        onClearAll={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));

    expect(screen.getByTestId('variables-entry')).toHaveTextContent('mass');
    expect(screen.getByTestId('variables-name-input')).toHaveValue('@mass');
    expect(screen.getByTestId('variables-value-input')).toHaveValue('5');
  });

  it('inserts single-letter and explicit named variables into the active editor', () => {
    const onInsert = vi.fn();

    render(
      <VariablesPanel
        presentation="overlay"
        variables={[
          { name: 'x', valueLatex: '2', numericValue: 2 },
          { name: 'mass', valueLatex: '5', numericValue: 5 },
        ]}
        onClose={vi.fn()}
        onSet={vi.fn(() => null)}
        onInsert={onInsert}
        onClear={vi.fn()}
        onClearAll={vi.fn()}
      />,
    );

    const entries = screen.getAllByTestId('variables-entry');
    fireEvent.click(within(entries[0]).getByRole('button', { name: /insert/i }));
    fireEvent.click(within(entries[1]).getByRole('button', { name: /insert/i }));

    expect(onInsert).toHaveBeenNthCalledWith(1, { name: 'x', valueLatex: '2', numericValue: 2 });
    expect(onInsert).toHaveBeenNthCalledWith(2, { name: 'mass', valueLatex: '5', numericValue: 5 });
    expect(screen.getByTestId('variables-message')).toHaveTextContent('@mass inserted.');
  });

  it('surfaces explicit named-variable validation from the app shell', () => {
    render(
      <VariablesPanel
        presentation="overlay"
        variables={[]}
        onClose={vi.fn()}
        onSet={(name) =>
          name === 'mass'
            ? 'Use @name or var(name) to store a multi-character named variable.'
            : null}
        onClear={vi.fn()}
        onClearAll={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByTestId('variables-name-input'), { target: { value: 'mass' } });
    fireEvent.change(screen.getByTestId('variables-value-input'), { target: { value: '5' } });
    fireEvent.click(screen.getByTestId('variables-set-button'));

    expect(screen.getByTestId('variables-message')).toHaveTextContent(
      'Use @name or var(name) to store a multi-character named variable.',
    );
  });

  it('shows validation messages returned by the app shell', () => {
    render(
      <VariablesPanel
        presentation="overlay"
        variables={[]}
        onClose={vi.fn()}
        onSet={() => 'Reserved constants and functions cannot be stored variables.'}
        onClear={vi.fn()}
        onClearAll={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId('variables-set-button'));

    expect(screen.getByTestId('variables-message')).toHaveTextContent(
      'Reserved constants and functions cannot be stored variables.',
    );
  });
});
