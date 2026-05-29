import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { KeypadPanel } from './KeypadPanel';
import type { KeypadButton } from '../../lib/navigation/menu';

const rows: KeypadButton[][] = [
  [
    {
      id: 'sin',
      label: 'sin',
      secondary: 'asin',
      alpha: 'a',
      ctrl: 'Solve',
      variant: 'function',
      latex: '\\sin\\left(#0\\right)',
      layers: {
        shift: { label: 'asin', latex: '\\arcsin\\left(#0\\right)' },
        alpha: { label: 'a', latex: 'a' },
        ctrl: { label: 'Solve', command: 'evaluate' },
      },
    },
  ],
];

describe('KeypadPanel', () => {
  it('renders layer controls, legends, and keeps base key clicks unchanged', () => {
    const onKeypad = vi.fn();
    const onSelectLayer = vi.fn();
    const onToggleLayerLock = vi.fn();

    render(
      <KeypadPanel
        rows={rows}
        activeLayer="ctrl"
        layerLocked
        onKeypad={onKeypad}
        onSelectLayer={onSelectLayer}
        onToggleLayerLock={onToggleLayerLock}
      />,
    );

    fireEvent.click(screen.getByTestId('keypad-layer-alpha'));
    expect(onSelectLayer).toHaveBeenCalledWith('alpha');

    fireEvent.click(screen.getByTestId('keypad-layer-lock'));
    expect(onToggleLayerLock).toHaveBeenCalled();
    expect(screen.getByText('asin')).toBeInTheDocument();
    expect(screen.getByText('a')).toBeInTheDocument();
    expect(screen.getAllByText('Solve')).toHaveLength(2);

    fireEvent.click(screen.getByTestId('keypad-sin'));
    expect(onKeypad).toHaveBeenCalledWith(rows[0][0]);
  });
});
