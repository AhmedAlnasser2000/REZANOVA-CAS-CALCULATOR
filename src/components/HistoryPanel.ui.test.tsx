import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HistoryPanel } from './HistoryPanel';
import type { HistoryEntry, ModeId } from '../types/calculator';

const modeLabels: Record<ModeId, string> = {
  calculate: 'Calculate',
  equation: 'Equation',
  matrix: 'Matrix',
  vector: 'Vector',
  table: 'Table',
  guide: 'Guide',
  advancedCalculus: 'Advanced Calc',
  trigonometry: 'Trigonometry',
  statistics: 'Statistics',
  geometry: 'Geometry',
  labs: 'Labs',
};

function historyEntry(id: string): HistoryEntry {
  return {
    id,
    mode: 'equation',
    inputLatex: `x+${id}=5`,
    resultLatex: `x=${id}`,
    exactSupplementLatex: [`x\\ne${id}`],
    timestamp: `2026-05-29T00:00:0${id}Z`,
  };
}

describe('HistoryPanel', () => {
  it('expands, replays, and deletes individual history cards', () => {
    const onDelete = vi.fn();
    const onReplay = vi.fn();

    render(
      <HistoryPanel
        presentation="overlay"
        history={[historyEntry('1'), historyEntry('2')]}
        modeLabels={modeLabels}
        onClear={vi.fn()}
        onClose={vi.fn()}
        onDelete={onDelete}
        onReplay={onReplay}
      />,
    );

    const entries = screen.getAllByTestId('history-entry');
    expect(entries).toHaveLength(2);
    expect(within(entries[0]).getByTestId('history-entry-preview')).toBeInTheDocument();
    expect(within(entries[0]).queryByTestId('history-entry-expanded')).not.toBeInTheDocument();

    fireEvent.click(within(entries[0]).getByTestId('history-entry-toggle'));
    expect(within(entries[0]).getByTestId('history-entry-toggle')).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(within(entries[0]).getByTestId('history-entry-expanded')).toBeInTheDocument();
    expect(within(entries[0]).getByText('Answer')).toBeInTheDocument();
    expect(within(entries[0]).getByText('Valid when')).toBeInTheDocument();

    fireEvent.click(within(entries[0]).getByTestId('history-entry-body'));
    expect(onReplay).toHaveBeenCalledWith(historyEntry('2'));

    fireEvent.click(within(entries[0]).getByTestId('history-entry-delete'));
    expect(onDelete).toHaveBeenCalledWith('2');
  });
});
