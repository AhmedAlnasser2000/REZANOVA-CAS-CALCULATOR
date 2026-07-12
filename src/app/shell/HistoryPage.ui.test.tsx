import {
  act,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type {
  HistoryEntry,
  MathNotationDisplay,
  ModeId,
  PendingHistoryTicket,
} from '../../types/calculator';
import { getLanguageCatalog } from '../../lib/language';
import { HistoryPage } from './HistoryPage';
import '../../styles/app/shell.css';

const historyText = getLanguageCatalog('en').history;

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

function entry(id: string, inputLatex = `x+${id}=5`): HistoryEntry {
  return {
    id,
    historyLaunchOrder: Number(id),
    inputLatex,
    mode: Number(id) % 2 === 0 ? 'equation' : 'calculate',
    resultLatex: `x=${id}`,
    runtimeElapsedMs: 42,
    timestamp: Number(id) % 2 === 0
      ? '2026-07-01T12:00:00Z'
      : '2026-06-30T12:00:00Z',
  };
}

function renderHistoryPage(options: {
  history?: HistoryEntry[];
  historyNotationMode?: MathNotationDisplay;
  pendingHistory?: PendingHistoryTicket[];
} = {}) {
  const handlers = {
    onCopyResult: vi.fn(),
    onDelete: vi.fn(),
    onDeleteSelected: vi.fn(),
    onReplay: vi.fn(),
    onReplayInNewTab: vi.fn(),
    onStopPending: vi.fn(),
  };

  render(
    <HistoryPage
      history={options.history ?? [entry('1'), entry('2')]}
      historyNotationMode={options.historyNotationMode ?? 'latex'}
      pendingHistory={options.pendingHistory ?? []}
      modeLabels={modeLabels}
      {...handlers}
    />,
  );

  return handlers;
}

describe('HistoryPage', () => {
  it('groups rows by local date and filters by search and workspace', () => {
    renderHistoryPage({
      history: [
        entry('1', 'alpha+1'),
        entry('2', 'beta+2'),
        entry('3', 'gamma+3'),
      ],
    });

    expect(screen.getByTestId('history-page')).toBeInTheDocument();
    expect(screen.getByTestId('history-page-table-header')).toHaveTextContent('Workspace');
    expect(screen.getByTestId('history-page-table-header')).toHaveTextContent('Expression / Input');
    expect(screen.getByTestId('history-page-table-header')).toHaveTextContent('Result preview');
    expect(screen.queryByRole('button', { name: /export/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /All dates/ })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /item/ }).length).toBeGreaterThan(1);

    fireEvent.change(screen.getByLabelText(historyText.filters.search), {
      target: { value: 'beta' },
    });

    expect(screen.getAllByTestId('history-page-row')).toHaveLength(1);

    fireEvent.click(within(screen.getByTestId('history-page-workspace-filters')).getByRole('button', {
      name: modeLabels.calculate,
    }));

    expect(screen.getAllByText(historyText.empty).length).toBeGreaterThan(0);
  });

  it('virtualizes dense rows and keeps offscreen math unmounted', () => {
    renderHistoryPage({
      history: Array.from({ length: 80 }, (_, index) => entry(`${index + 1}`)),
    });

    const renderedRows = screen.getAllByTestId('history-page-row');
    expect(renderedRows.length).toBeLessThan(80);
    expect(renderedRows.length).toBeGreaterThan(5);
    for (const row of renderedRows) {
      expect(row.querySelector('[data-raw-latex]')).toBeNull();
    }
    expect(
      screen.getByTestId('history-page-inspector').querySelector('[data-raw-latex]'),
    ).not.toBeNull();
  });

  it('can render visible ledger rows as math when explicitly selected', () => {
    renderHistoryPage({
      history: Array.from({ length: 24 }, (_, index) => entry(`${index + 1}`)),
      historyNotationMode: 'rendered',
    });

    const renderedRows = screen.getAllByTestId('history-page-row');
    expect(renderedRows.length).toBeLessThan(24);
    expect(renderedRows.some((row) => row.querySelector('[data-raw-latex]'))).toBe(true);
  });

  it('selects rows on click, opens on double click, and keeps inspector actions explicit', () => {
    const handlers = renderHistoryPage({
      history: [entry('1'), entry('2')],
    });
    const firstRenderedRow = screen.getAllByTestId('history-page-row')[0];

    fireEvent.click(firstRenderedRow);
    expect(handlers.onReplay).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: historyText.actions.replayCurrentTab }));
    fireEvent.click(screen.getByRole('button', { name: historyText.actions.openInNewTab }));
    fireEvent.click(screen.getByRole('button', { name: historyText.actions.copyResult }));
    fireEvent.click(screen.getByRole('button', { name: historyText.actions.deleteEntry }));

    expect(handlers.onReplay).toHaveBeenCalledWith(entry('2'));
    expect(handlers.onReplayInNewTab).toHaveBeenCalledWith(entry('2'));
    expect(handlers.onCopyResult).toHaveBeenCalledWith('x=2');
    expect(handlers.onDelete).toHaveBeenCalledWith('2');
    expect(screen.queryByRole('button', { name: /Formula Viewer/i })).not.toBeInTheDocument();

    fireEvent.doubleClick(firstRenderedRow);
    expect(handlers.onReplay).toHaveBeenCalledTimes(2);
    expect(handlers.onReplay).toHaveBeenLastCalledWith(entry('2'));

    fireEvent.click(screen.getByRole('button', { name: historyText.actions.deleteSelected }));

    expect(handlers.onDeleteSelected).toHaveBeenCalledWith(['2']);
  });

  it('reads structured results before intentionally stale legacy projections', () => {
    const structuredEntry: HistoryEntry = {
      ...entry('1'),
      resultLatex: 'legacy-result-must-not-win',
      resultDocument: {
        version: 1,
        outcomeKind: 'success',
        title: 'Original Equation Card',
        primaryMath: { canonicalLatex: 'x=4' },
        supplements: [{ canonicalLatex: 'x\\in\\mathbb{R}' }],
        warnings: [],
      },
    };
    const handlers = renderHistoryPage({ history: [structuredEntry] });

    expect(screen.getByTestId('history-page-row')).toHaveTextContent('x=4');
    expect(screen.getByTestId('history-page-inspector')).toHaveTextContent('x=4');
    expect(screen.getByTestId('history-page-inspector')).toHaveTextContent(/x\u2208R/);
    expect(screen.queryByText('legacy-result-must-not-win')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: historyText.actions.copyResult }));
    expect(handlers.onCopyResult).toHaveBeenCalledWith('x=4');
  });

  it('supports Shift range selection and Ctrl toggled multi-selection', () => {
    const handlers = renderHistoryPage({
      history: [entry('1'), entry('2'), entry('3')],
    });
    const rows = screen.getAllByTestId('history-page-row');

    fireEvent.click(rows[0]);
    fireEvent.click(rows[2], { shiftKey: true });
    fireEvent.click(screen.getByRole('button', { name: historyText.actions.deleteSelected }));

    expect(handlers.onDeleteSelected).toHaveBeenCalledWith(['3', '2', '1']);

    fireEvent.click(rows[0]);
    fireEvent.click(rows[1], { ctrlKey: true });
    fireEvent.click(screen.getByRole('button', { name: historyText.actions.deleteSelected }));

    expect(handlers.onDeleteSelected).toHaveBeenLastCalledWith(['3', '2']);
  });

  it('renders pending rows with stop controls', () => {
    vi.useFakeTimers();
    const startedAtMs = new Date('2026-07-02T12:00:00Z').getTime();
    vi.setSystemTime(startedAtMs + 1000);
    const pendingTicket: PendingHistoryTicket = {
      id: 'ticket.1',
      historyLaunchOrder: 3,
      inputLatex: 'x^4+1=0',
      mode: 'equation',
      startedAtMs,
      timestamp: '2026-07-01T12:00:00Z',
      workspaceInstanceLabel: 'Equation tab',
    };
    try {
      const handlers = renderHistoryPage({
        history: [entry('1')],
        pendingHistory: [pendingTicket],
      });

      const pendingRow = screen.getByTestId('history-page-row-pending');
      expect(pendingRow).toHaveTextContent('Running 1s');
      expect(pendingRow.querySelector('[data-raw-latex]')).toBeNull();

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(pendingRow).toHaveTextContent('Running 2s');

      fireEvent.click(within(pendingRow).getByRole('button', { name: historyText.actions.stop }));

      expect(handlers.onStopPending).toHaveBeenCalledWith(pendingTicket);
    } finally {
      vi.useRealTimers();
    }
  });
});
