import {
  act,
  render,
  screen,
} from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HistoryPanel } from '../../components/HistoryPanel';
import type {
  HistoryEntry,
  ModeId,
  PendingHistoryTicket,
} from '../../types/calculator';
import { HistoryPage } from './HistoryPage';
import '../../styles/app/shell.css';
import '../../styles/app/side-surfaces.css';

const modeLabels: Record<ModeId, string> = {
  calculate: 'Calculate',
  calculus: 'Calculus',
  equation: 'Equation',
  geometry: 'Geometry',
  guide: 'Guide',
  labs: 'Labs',
  matrix: 'Matrix',
  statistics: 'Statistics',
  table: 'Table',
  trigonometry: 'Trigonometry',
  vector: 'Vector',
};

function historyEntry(index: number): HistoryEntry {
  return {
    id: `entry.${index}`,
    historyLaunchOrder: index,
    inputLatex: `x^2+${index}x+1=0`,
    mode: index % 2 === 0 ? 'equation' : 'calculate',
    resultLatex: `x=${index}`,
    runtimeElapsedMs: 42,
    timestamp: index % 2 === 0
      ? '2026-07-02T12:00:00Z'
      : '2026-07-01T12:00:00Z',
  };
}

function pendingTicket(id: string, order: number, startedAtMs?: number): PendingHistoryTicket {
  return {
    id,
    historyLaunchOrder: order,
    inputLatex: `x^4+${order}=0`,
    mode: 'equation',
    startedAtMs: startedAtMs ?? new Date('2026-07-02T12:00:00Z').getTime(),
    timestamp: '2026-07-02T12:00:00Z',
  };
}

describe('History performance conformance', () => {
  it('keeps the quick panel capped and free of rich row math', () => {
    render(
      <HistoryPanel
        presentation="overlay"
        history={Array.from({ length: 35 }, (_, index) => historyEntry(index + 1))}
        pendingHistory={[
          pendingTicket('pending.high', 100),
          pendingTicket('pending.low', -1),
        ]}
        modeLabels={modeLabels}
        notationMode="plainText"
        onClear={vi.fn()}
        onClose={vi.fn()}
        onDelete={vi.fn()}
        onReplay={vi.fn()}
      />,
    );

    expect(screen.getAllByTestId('history-entry')).toHaveLength(20);
    expect(screen.getAllByTestId('history-entry-pending')).toHaveLength(2);
    expect(screen.getByTestId('history-panel').querySelector('[data-raw-latex]')).toBeNull();
  });

  it('keeps full History rows virtualized/plain while selected inspector stays rich', () => {
    render(
      <HistoryPage
        history={Array.from({ length: 80 }, (_, index) => historyEntry(index + 1))}
        historyNotationMode="plainText"
        pendingHistory={[]}
        modeLabels={modeLabels}
        onCopyResult={vi.fn()}
        onDelete={vi.fn()}
        onDeleteSelected={vi.fn()}
        onReplay={vi.fn()}
        onReplayInNewTab={vi.fn()}
      />,
    );

    const rows = screen.getAllByTestId('history-page-row');
    expect(rows.length).toBeGreaterThan(5);
    expect(rows.length).toBeLessThan(80);
    for (const row of rows) {
      expect(row.querySelector('[data-raw-latex]')).toBeNull();
    }
    expect(
      screen.getByTestId('history-page-inspector').querySelector('[data-raw-latex]'),
    ).not.toBeNull();
  });

  it('keeps pending elapsed labels live without rich row math', () => {
    vi.useFakeTimers();
    const startedAtMs = new Date('2026-07-02T12:00:00Z').getTime();
    vi.setSystemTime(startedAtMs + 1000);

    try {
      render(
        <HistoryPage
          history={[historyEntry(1)]}
          historyNotationMode="plainText"
          pendingHistory={[pendingTicket('pending.elapsed', 2, startedAtMs)]}
          modeLabels={modeLabels}
          onCopyResult={vi.fn()}
          onDelete={vi.fn()}
          onDeleteSelected={vi.fn()}
          onReplay={vi.fn()}
          onReplayInNewTab={vi.fn()}
          onStopPending={vi.fn()}
        />,
      );

      const pendingRow = screen.getByTestId('history-page-row-pending');
      expect(pendingRow).toHaveTextContent('Running 1s');
      expect(pendingRow.querySelector('[data-raw-latex]')).toBeNull();

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(pendingRow).toHaveTextContent('Running 2s');
    } finally {
      vi.useRealTimers();
    }
  });
});
