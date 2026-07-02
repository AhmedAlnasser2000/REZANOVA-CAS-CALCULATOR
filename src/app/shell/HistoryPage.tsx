import {
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
  type UIEvent,
} from 'react';
import { MathStatic } from '../../components/MathStatic';
import {
  formatRuntimeElapsedFinal,
  formatRuntimeElapsedRunning,
  runtimeElapsedMs,
} from '../runtime/runtimeElapsedTime';
import { useLanguage } from '../../lib/language/language-context';
import type {
  HistoryEntry,
  ModeId,
  PendingHistoryTicket,
} from '../../types/calculator';
import {
  buildHistoryDateGroups,
  buildHistoryLedgerRows,
  filterHistoryLedgerRows,
  historyVisibleRange,
  type HistoryLedgerRow,
} from './history-page-model';

type HistoryPageProps = {
  history: HistoryEntry[];
  pendingHistory?: PendingHistoryTicket[];
  modeLabels: Record<ModeId, string>;
  onCopyResult: (text: string) => void;
  onDelete: (id: string) => void;
  onDeleteSelected: (ids: string[]) => void;
  onReplay: (entry: HistoryEntry) => void;
  onReplayInNewTab: (entry: HistoryEntry) => void;
  onStopPending?: (ticket: PendingHistoryTicket) => void;
};

const HISTORY_PAGE_ROW_HEIGHT = 86;
const HISTORY_PAGE_DEFAULT_VIEWPORT_HEIGHT = 560;

function rowTimestamp(row: HistoryLedgerRow) {
  return new Date(row.timestamp).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function rowStatus(row: HistoryLedgerRow, elapsedNowMs: number) {
  if (row.kind === 'pending') {
    const status = row.ticket.status === 'stopping' ? 'Stopping' : 'Running';
    return typeof row.ticket.startedAtMs === 'number'
      ? `${status} ${formatRuntimeElapsedRunning(runtimeElapsedMs(row.ticket.startedAtMs, elapsedNowMs))}`
      : status;
  }

  return typeof row.entry.runtimeElapsedMs === 'number'
    ? formatRuntimeElapsedFinal(row.entry.runtimeElapsedMs)
    : 'Stored';
}

function entryCopyText(entry: HistoryEntry) {
  return entry.resultLatex || entry.approxText || entry.inputLatex;
}

function HistoryDetailInspector({
  row,
  modeLabels,
  onCopyResult,
  onDelete,
  onReplay,
  onReplayInNewTab,
  onStopPending,
}: {
  row: HistoryLedgerRow | null;
  modeLabels: Record<ModeId, string>;
  onCopyResult: (text: string) => void;
  onDelete: (id: string) => void;
  onReplay: (entry: HistoryEntry) => void;
  onReplayInNewTab: (entry: HistoryEntry) => void;
  onStopPending?: (ticket: PendingHistoryTicket) => void;
}) {
  const { strings } = useLanguage();
  const historyText = strings.history;

  if (!row) {
    return (
      <aside className="history-page-inspector" data-testid="history-page-inspector">
        <strong>{historyText.labels.details}</strong>
        <p>{historyText.empty}</p>
      </aside>
    );
  }

  if (row.kind === 'pending') {
    return (
      <aside className="history-page-inspector" data-testid="history-page-inspector">
        <strong>{modeLabels[row.ticket.mode]}</strong>
        <span className="history-page-chip">{historyText.pending.running}</span>
        <section>
          <span>{historyText.labels.input}</span>
          <MathStatic latex={row.ticket.inputLatex} />
        </section>
        {row.ticket.workspaceInstanceLabel ? (
          <section>
            <span>{historyText.labels.status}</span>
            <p>{historyText.pending.tabLabel(row.ticket.workspaceInstanceLabel)}</p>
          </section>
        ) : null}
        <button
          type="button"
          disabled={row.ticket.status === 'stopping'}
          onClick={() => onStopPending?.(row.ticket)}
        >
          {historyText.actions.stop}
        </button>
      </aside>
    );
  }

  const entry = row.entry;
  return (
    <aside className="history-page-inspector" data-testid="history-page-inspector">
      <strong>{modeLabels[entry.mode]}</strong>
      <div className="history-page-inspector-actions">
        <button type="button" onClick={() => onReplay(entry)}>
          {historyText.actions.replayCurrentTab}
        </button>
        <button type="button" onClick={() => onReplayInNewTab(entry)}>
          {historyText.actions.openInNewTab}
        </button>
        <button type="button" onClick={() => onCopyResult(entryCopyText(entry))}>
          {historyText.actions.copyResult}
        </button>
        <button type="button" onClick={() => onDelete(entry.id)}>
          {historyText.actions.deleteEntry}
        </button>
      </div>
      <section>
        <span>{historyText.labels.input}</span>
        <MathStatic latex={entry.inputLatex} />
      </section>
      {entry.resultLatex ? (
        <section>
          <span>{historyText.labels.result}</span>
          <MathStatic latex={entry.resultLatex} />
        </section>
      ) : null}
      {entry.approxText ? (
        <section>
          <span>{historyText.labels.approx}</span>
          <p>{entry.approxText}</p>
        </section>
      ) : null}
      {entry.exactSupplementLatex?.length ? (
        <section>
          <span>{historyText.labels.validWhen}</span>
          {entry.exactSupplementLatex.map((latex, index) => (
            <MathStatic key={`${entry.id}.supplement.${index}`} latex={latex} />
          ))}
        </section>
      ) : null}
    </aside>
  );
}

export function HistoryPage({
  history,
  pendingHistory = [],
  modeLabels,
  onCopyResult,
  onDelete,
  onDeleteSelected,
  onReplay,
  onReplayInNewTab,
  onStopPending,
}: HistoryPageProps) {
  const { strings } = useLanguage();
  const historyText = strings.history;
  const [query, setQuery] = useState('');
  const [modeFilter, setModeFilter] = useState<ModeId | 'all'>('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [scrollTop, setScrollTop] = useState(0);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(() => new Set());
  const [selectionAnchorRowId, setSelectionAnchorRowId] = useState<string | null>(null);
  const [elapsedNowMs, setElapsedNowMs] = useState(() => Date.now());
  const allRows = useMemo(() =>
    buildHistoryLedgerRows({ history, modeLabels, pendingHistory }),
  [history, modeLabels, pendingHistory]);
  const dateGroups = useMemo(() => buildHistoryDateGroups(allRows), [allRows]);
  const modesInRows = useMemo(() =>
    [...new Set(allRows.map((row) => row.mode))],
  [allRows]);
  const rows = useMemo(() =>
    filterHistoryLedgerRows({
      dateKey: dateFilter,
      mode: modeFilter,
      query,
      rows: allRows,
    }),
  [allRows, dateFilter, modeFilter, query]);
  const selectedRow = useMemo(() =>
    rows.find((row) => row.id === selectedRowId) ?? rows[0] ?? null,
  [rows, selectedRowId]);
  const visibleRange = historyVisibleRange({
    itemCount: rows.length,
    rowHeight: HISTORY_PAGE_ROW_HEIGHT,
    scrollTop,
    viewportHeight: HISTORY_PAGE_DEFAULT_VIEWPORT_HEIGHT,
  });
  const visibleRows = rows.slice(visibleRange.startIndex, visibleRange.endIndex);

  useEffect(() => {
    if (!selectedRowId && rows[0]) {
      setSelectedRowId(rows[0].id);
    }
  }, [rows, selectedRowId]);

  useEffect(() => {
    if (!pendingHistory.some((ticket) => typeof ticket.startedAtMs === 'number')) {
      return undefined;
    }
    const intervalId = window.setInterval(() => setElapsedNowMs(Date.now()), 250);
    return () => window.clearInterval(intervalId);
  }, [pendingHistory]);

  function entryIdsInRange(fromRowId: string, toRowId: string) {
    const fromIndex = rows.findIndex((row) => row.id === fromRowId);
    const toIndex = rows.findIndex((row) => row.id === toRowId);
    if (fromIndex < 0 || toIndex < 0) {
      return [];
    }

    const [startIndex, endIndex] = fromIndex <= toIndex
      ? [fromIndex, toIndex]
      : [toIndex, fromIndex];
    return rows.slice(startIndex, endIndex + 1)
      .filter((row): row is Extract<HistoryLedgerRow, { kind: 'entry' }> => row.kind === 'entry')
      .map((row) => row.entry.id);
  }

  function focusEntryRow(
    event: MouseEvent<HTMLElement>,
    row: Extract<HistoryLedgerRow, { kind: 'entry' }>,
  ) {
    setSelectedRowId(row.id);

    if (event.shiftKey && selectionAnchorRowId) {
      const rangeIds = entryIdsInRange(selectionAnchorRowId, row.id);
      setSelectedEntryIds(new Set(rangeIds));
      return;
    }

    if (event.ctrlKey || event.metaKey) {
      setSelectedEntryIds((currentIds) => {
        const nextIds = new Set(currentIds);
        if (nextIds.has(row.entry.id)) {
          nextIds.delete(row.entry.id);
        } else {
          nextIds.add(row.entry.id);
        }
        return nextIds;
      });
      setSelectionAnchorRowId(row.id);
      return;
    }

    setSelectedEntryIds(new Set([row.entry.id]));
    setSelectionAnchorRowId(row.id);
  }

  function toggleSelectedEntry(row: Extract<HistoryLedgerRow, { kind: 'entry' }>) {
    setSelectedRowId(row.id);
    setSelectionAnchorRowId(row.id);
    setSelectedEntryIds((currentIds) => {
      const nextIds = new Set(currentIds);
      if (nextIds.has(row.entry.id)) {
        nextIds.delete(row.entry.id);
      } else {
        nextIds.add(row.entry.id);
      }
      return nextIds;
    });
  }

  function deleteSelectedEntries() {
    const ids = [...selectedEntryIds];
    if (ids.length === 0) {
      return;
    }
    onDeleteSelected(ids);
    setSelectedEntryIds(new Set());
  }

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    setScrollTop(event.currentTarget.scrollTop);
  }

  return (
    <section className="app-page app-page--history" data-testid="history-page">
      <header className="app-page-header">
        <div>
          <span className="app-page-kicker">App Page</span>
          <h1>{historyText.title}</h1>
          <p>{historyText.timeline.entries(rows.length)}</p>
        </div>
        <div className="history-page-bulk-actions">
          <button
            type="button"
            disabled={selectedEntryIds.size === 0}
            onClick={deleteSelectedEntries}
          >
            {historyText.actions.deleteSelected}
          </button>
        </div>
      </header>

      <div className="history-page-toolbar">
        <label>
          <span>{historyText.filters.search}</span>
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.currentTarget.value);
              setScrollTop(0);
            }}
          />
        </label>
        <label>
          <span>{historyText.filters.allWorkspaces}</span>
          <select
            value={modeFilter}
            onChange={(event) => {
              setModeFilter(event.currentTarget.value as ModeId | 'all');
              setScrollTop(0);
            }}
          >
            <option value="all">{historyText.filters.allWorkspaces}</option>
            {modesInRows.map((mode) => (
              <option key={mode} value={mode}>{modeLabels[mode]}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="history-page-layout">
        <nav className="history-page-timeline" aria-label="History timeline">
          <button
            type="button"
            className={dateFilter === 'all' ? 'is-active' : ''}
            onClick={() => setDateFilter('all')}
          >
            <span>{historyText.filters.allDates}</span>
            <span>{historyText.timeline.entries(allRows.length)}</span>
          </button>
          {dateGroups.map((group) => (
            <button
              key={group.key}
              type="button"
              className={dateFilter === group.key ? 'is-active' : ''}
              onClick={() => {
                setDateFilter(group.key);
                setScrollTop(0);
              }}
            >
              <span>{group.label}</span>
              <span>{historyText.timeline.entries(group.count)}</span>
            </button>
          ))}
        </nav>

        <div className="history-page-ledger" data-testid="history-page-ledger" onScroll={handleScroll}>
          {rows.length === 0 ? (
            <div className="history-page-empty">{historyText.empty}</div>
          ) : (
            <div
              className="history-page-ledger-spacer"
              style={{ height: rows.length * HISTORY_PAGE_ROW_HEIGHT }}
            >
              <div
                className="history-page-ledger-window"
                style={{ transform: `translateY(${visibleRange.offsetTop}px)` }}
              >
                {visibleRows.map((row) => {
                  const isSelected = selectedRow?.id === row.id;
                  if (row.kind === 'pending') {
                    return (
                      <article
                        key={row.id}
                        className={`history-page-row history-page-row--pending ${isSelected ? 'is-selected' : ''}`}
                        data-testid="history-page-row-pending"
                        style={{ height: HISTORY_PAGE_ROW_HEIGHT }}
                        onClick={() => setSelectedRowId(row.id)}
                      >
                        <div>
                          <span>{modeLabels[row.mode]}</span>
                          <strong>{row.ticket.inputLatex}</strong>
                        </div>
                        <span className="history-page-chip">{rowStatus(row, elapsedNowMs)}</span>
                        <button
                          type="button"
                          disabled={row.ticket.status === 'stopping'}
                          onClick={(event) => {
                            event.stopPropagation();
                            onStopPending?.(row.ticket);
                          }}
                        >
                          {historyText.actions.stop}
                        </button>
                      </article>
                    );
                  }

                  return (
                    <article
                      key={row.id}
                      className={`history-page-row ${isSelected ? 'is-selected' : ''}`}
                      data-testid="history-page-row"
                      style={{ height: HISTORY_PAGE_ROW_HEIGHT }}
                      onClick={(event) => focusEntryRow(event, row)}
                      onDoubleClick={() => onReplay(row.entry)}
                    >
                      <label onClick={(event) => event.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={historyText.actions.selectEntry}
                          checked={selectedEntryIds.has(row.entry.id)}
                          onChange={() => toggleSelectedEntry(row)}
                        />
                      </label>
                      <div className="history-page-row-main">
                        <span>{modeLabels[row.mode]} · {rowTimestamp(row)}</span>
                        <MathStatic latex={row.entry.inputLatex} />
                      </div>
                      <span className="history-page-chip">{rowStatus(row, elapsedNowMs)}</span>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <HistoryDetailInspector
          row={selectedRow}
          modeLabels={modeLabels}
          onCopyResult={onCopyResult}
          onDelete={onDelete}
          onReplay={onReplay}
          onReplayInNewTab={onReplayInNewTab}
          onStopPending={onStopPending}
        />
      </div>
    </section>
  );
}
