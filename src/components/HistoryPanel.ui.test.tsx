import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HistoryPanel } from './HistoryPanel';
import { getLanguageCatalog } from '../lib/language';
import type { HistoryEntry, ModeId } from '../types/calculator';
import '../styles/app/shell.css';
import '../styles/app/side-surfaces.css';

const historyText = getLanguageCatalog('en').history;

const modeLabels: Record<ModeId, string> = {
  calculate: 'Calculate',
  equation: 'Equation',
  matrix: 'Matrix',
  vector: 'Vector',
  table: 'Table',
  guide: 'Guide',
  calculus: 'Calculus',
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
  it('renders panel chrome and empty state from the language catalog', () => {
    const onClear = vi.fn();
    const onClose = vi.fn();

    render(
      <HistoryPanel
        presentation="overlay"
        history={[]}
        modeLabels={modeLabels}
        onClear={onClear}
        onClose={onClose}
        onDelete={vi.fn()}
        onReplay={vi.fn()}
      />,
    );

    expect(screen.getByText(historyText.title)).toBeInTheDocument();
    expect(screen.getByText(historyText.empty)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: historyText.actions.clear }));
    fireEvent.click(screen.getByRole('button', { name: historyText.actions.close }));

    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

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
    expect(within(entries[0]).getByText(historyText.labels.answer)).toBeInTheDocument();
    expect(within(entries[0]).getByText(historyText.labels.validWhen)).toBeInTheDocument();
    expect(within(entries[0]).getByLabelText(historyText.aria.collapseEntry)).toBeInTheDocument();

    fireEvent.click(within(entries[0]).getByTestId('history-entry-body'));
    expect(onReplay).toHaveBeenCalledWith(historyEntry('2'));

    fireEvent.click(within(entries[0]).getByTestId('history-entry-delete'));
    expect(onDelete).toHaveBeenCalledWith('2');
  });

  it('keeps many restored history entries compact and non-shrinking until expanded', () => {
    render(
      <HistoryPanel
        presentation="outboard"
        history={Array.from({ length: 48 }, (_, index) => historyEntry(`${index + 1}`))}
        modeLabels={modeLabels}
        onClear={vi.fn()}
        onClose={vi.fn()}
        onDelete={vi.fn()}
        onReplay={vi.fn()}
      />,
    );

    const list = screen.getByTestId('history-panel').querySelector('.history-list');
    expect(list).not.toBeNull();
    expect(getComputedStyle(list as Element).display).toBe('flex');
    expect(getComputedStyle(list as Element).overflowY).toBe('auto');

    const entries = screen.getAllByTestId('history-entry');
    expect(entries).toHaveLength(48);
    for (const entry of entries.slice(0, 8)) {
      expect(getComputedStyle(entry).flexShrink).toBe('0');
      expect(within(entry).getByTestId('history-entry-preview')).toBeInTheDocument();
      expect(within(entry).queryByTestId('history-entry-expanded')).not.toBeInTheDocument();
    }

    fireEvent.click(within(entries[0]).getByTestId('history-entry-toggle'));
    const expanded = within(entries[0]).getByTestId('history-entry-expanded');
    expect(expanded).toBeInTheDocument();
    expect(getComputedStyle(expanded).overflowY).toBe('auto');
    expect(within(entries[0]).getByText(historyText.labels.answer)).toBeInTheDocument();
    expect(within(entries[0]).getByText(historyText.labels.validWhen)).toBeInTheDocument();
    expect(within(entries[1]).queryByTestId('history-entry-expanded')).not.toBeInTheDocument();
  });

  it('renders pending tickets in launch order with a Stop action only', () => {
    const onStopPending = vi.fn();
    const pendingTicket = {
      id: 'ticket.equation.pending',
      mode: 'equation' as const,
      inputLatex: 'x^4+1=0',
      capabilityId: 'equation.solve',
      inputRevisionId: 'input.equation.solve.pending',
      workspaceInstanceLabel: 'Equation scratch',
      historyLaunchOrder: 3,
      startedAtMs: Date.now() - 1200,
      timestamp: '2026-06-06T00:00:03Z',
    };

    render(
      <HistoryPanel
        presentation="overlay"
        history={[
          { ...historyEntry('1'), historyLaunchOrder: 1 },
          { ...historyEntry('2'), historyLaunchOrder: 4 },
        ]}
        pendingHistory={[pendingTicket]}
        modeLabels={modeLabels}
        onClear={vi.fn()}
        onClose={vi.fn()}
        onDelete={vi.fn()}
        onReplay={vi.fn()}
        onStopPending={onStopPending}
      />,
    );

    const finalizedEntries = screen.getAllByTestId('history-entry');
    const pendingEntries = screen.getAllByTestId('history-entry-pending');
    expect(finalizedEntries).toHaveLength(2);
    expect(pendingEntries).toHaveLength(1);

    const rows = screen.getByTestId('history-panel').querySelectorAll('.history-entry');
    expect(within(rows[0] as HTMLElement).getByText(historyText.replay)).toBeInTheDocument();
    expect(
      within(rows[1] as HTMLElement).getByText(
        historyText.pending.statusWithElapsed(historyText.pending.running, '1s'),
      ),
    ).toBeInTheDocument();
    expect(
      within(rows[1] as HTMLElement).getByText(historyText.pending.tabLabel('Equation scratch')),
    ).toBeInTheDocument();
    expect(within(rows[2] as HTMLElement).getByText(historyText.replay)).toBeInTheDocument();
    expect(within(rows[0] as HTMLElement).queryByText(/Tab:/)).not.toBeInTheDocument();
    expect(within(rows[2] as HTMLElement).queryByText(/Tab:/)).not.toBeInTheDocument();
    expect(within(pendingEntries[0]).queryByTestId('history-entry-delete')).not.toBeInTheDocument();
    expect(within(pendingEntries[0]).queryByTestId('history-entry-replay')).not.toBeInTheDocument();
    expect(within(pendingEntries[0]).getByRole('button', {
      name: historyText.actions.stop,
    })).toBeInTheDocument();

    fireEvent.click(within(pendingEntries[0]).getByTestId('history-entry-stop'));
    expect(onStopPending).toHaveBeenCalledWith(pendingTicket);
  });

  it('shows persisted runtime duration as compact finalized history metadata', () => {
    render(
      <HistoryPanel
        presentation="overlay"
        history={[
          { ...historyEntry('1'), runtimeElapsedMs: 40 },
          historyEntry('2'),
        ]}
        modeLabels={modeLabels}
        onClear={vi.fn()}
        onClose={vi.fn()}
        onDelete={vi.fn()}
        onReplay={vi.fn()}
      />,
    );

    const entries = screen.getAllByTestId('history-entry');
    expect(within(entries[1]).getByTestId('history-entry-runtime-elapsed')).toHaveTextContent(
      '0.04s',
    );
    expect(within(entries[0]).queryByTestId('history-entry-runtime-elapsed')).not.toBeInTheDocument();
  });
});
