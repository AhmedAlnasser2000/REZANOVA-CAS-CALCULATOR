import { fireEvent, render, screen } from '@testing-library/react';
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
