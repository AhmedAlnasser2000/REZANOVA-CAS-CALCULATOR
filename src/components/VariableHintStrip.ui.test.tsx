import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EDITOR_ANALYSIS_DEBOUNCE_MS } from '../lib/editor/editor-analysis-runtime';
import { VariableHintStrip } from './VariableHintStrip';

describe('VariableHintStrip editor analysis containment', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces workbench hints and preserves the last safe hints for huge input', async () => {
    vi.useFakeTimers();
    const { rerender } = render(
      <VariableHintStrip
        compact
        latex="x+a"
        mode="calculate"
        screenHint="derivative"
        activeVariable="x"
        storedVariables={[{ name: 'a', valueLatex: '4', numericValue: 4 }]}
      />,
    );

    expect(screen.queryByTestId('variable-hint-strip')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(EDITOR_ANALYSIS_DEBOUNCE_MS);
    });

    expect(screen.getByTestId('variable-hint-strip')).toHaveTextContent('x');
    expect(screen.getByTestId('variable-hint-strip')).toHaveTextContent('active');
    expect(screen.getByTestId('variable-hint-strip')).toHaveTextContent('a');
    expect(screen.getByTestId('variable-hint-strip')).toHaveTextContent('stored');

    rerender(
      <VariableHintStrip
        compact
        latex={'z'.repeat(5001)}
        mode="calculate"
        screenHint="derivative"
        activeVariable="x"
        storedVariables={[{ name: 'a', valueLatex: '4', numericValue: 4 }]}
      />,
    );

    expect(screen.getByTestId('variable-hint-strip')).toHaveAttribute(
      'data-editor-analysis-status',
      'guarded',
    );
    expect(screen.getByTestId('variable-hint-strip')).toHaveTextContent('x');
    expect(screen.getByTestId('variable-hint-strip')).toHaveTextContent('a');
  });
});
