import {
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Copy,
  Database,
  History as HistoryIcon,
  PanelRight,
  Play,
  Plus,
  Search,
  Shield,
  Square,
  StopCircle,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import {
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
  type UIEvent,
} from 'react';
import { MathStatic } from '../../components/MathStatic';
import { useLanguage } from '../../lib/language/language-context';
import type {
  HistoryEntry,
  ModeId,
  PendingHistoryTicket,
} from '../../types/calculator';
import {
  formatRuntimeElapsedFinal,
  formatRuntimeElapsedRunning,
  runtimeElapsedMs,
} from '../runtime/runtimeElapsedTime';
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

const HISTORY_PAGE_ROW_HEIGHT = 66;
const HISTORY_PAGE_DEFAULT_VIEWPORT_HEIGHT = 560;

function rowTimestamp(row: HistoryLedgerRow) {
  return new Date(row.timestamp).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function rowDateTime(row: HistoryLedgerRow) {
  return new Date(row.timestamp).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function rowElapsed(row: HistoryLedgerRow, elapsedNowMs: number) {
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

function rowResultKind(row: HistoryLedgerRow) {
  if (row.kind === 'pending') {
    return row.ticket.status === 'stopping' ? 'Stopping' : 'Running';
  }

  if (row.entry.resultLatex) {
    return 'Exact';
  }

  if (row.entry.approxText) {
    return 'Numeric';
  }

  return 'Stored';
}

function entryCopyText(entry: HistoryEntry) {
  return entry.resultLatex || entry.approxText || entry.inputLatex;
}

function modeTone(mode: ModeId) {
  if (mode === 'equation') {
    return 'blue';
  }
  if (mode === 'calculus') {
    return 'amber';
  }
  if (mode === 'matrix' || mode === 'vector') {
    return 'violet';
  }
  return 'green';
}

function ModeChip({
  label,
  mode,
}: {
  label: string;
  mode: ModeId;
}) {
  return <span className={`history-page-mode-chip is-${modeTone(mode)}`}>{label}</span>;
}

function InspectorButton({
  children,
  icon: Icon,
  onClick,
  tone = 'neutral',
}: {
  children: string;
  icon: LucideIcon;
  onClick: () => void;
  tone?: 'danger' | 'neutral' | 'primary';
}) {
  return (
    <button type="button" className={`history-page-inspector-action is-${tone}`} onClick={onClick}>
      <Icon aria-hidden="true" size={16} />
      <span>{children}</span>
    </button>
  );
}

function HistoryDetailInspector({
  row,
  elapsedNowMs,
  modeLabels,
  onCopyResult,
  onDelete,
  onReplay,
  onReplayInNewTab,
  onStopPending,
}: {
  row: HistoryLedgerRow | null;
  elapsedNowMs: number;
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
        <header className="history-page-inspector-header">
          <strong>{historyText.labels.details}</strong>
        </header>
        <p>{historyText.empty}</p>
      </aside>
    );
  }

  if (row.kind === 'pending') {
    return (
      <aside className="history-page-inspector" data-testid="history-page-inspector">
        <header className="history-page-inspector-header">
          <span>Selected result</span>
          <strong>{modeLabels[row.ticket.mode]}</strong>
        </header>
        <div className="history-page-inspector-meta">
          <ModeChip label={modeLabels[row.ticket.mode]} mode={row.ticket.mode} />
          <span><Clock3 aria-hidden="true" size={14} /> {rowElapsed(row, elapsedNowMs)}</span>
        </div>
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
        <div className="history-page-inspector-actions">
          <button
            type="button"
            className="history-page-inspector-action is-danger"
            disabled={row.ticket.status === 'stopping'}
            onClick={() => onStopPending?.(row.ticket)}
          >
            <StopCircle aria-hidden="true" size={16} />
            <span>{historyText.actions.stop}</span>
          </button>
        </div>
      </aside>
    );
  }

  const entry = row.entry;
  return (
    <aside className="history-page-inspector" data-testid="history-page-inspector">
      <header className="history-page-inspector-header">
        <span>Selected result</span>
        <strong>{modeLabels[entry.mode]}</strong>
      </header>
      <div className="history-page-inspector-meta">
        <ModeChip label={modeLabels[entry.mode]} mode={entry.mode} />
        <span>{rowDateTime(row)}</span>
        <span><Clock3 aria-hidden="true" size={14} /> {rowElapsed(row, elapsedNowMs)}</span>
        <span className="history-page-chip is-status">{rowResultKind(row)}</span>
      </div>
      <section>
        <span>{historyText.labels.input}</span>
        <div className="history-page-inspector-math">
          <MathStatic latex={entry.inputLatex} />
        </div>
      </section>
      {entry.resultLatex ? (
        <section>
          <span>{historyText.labels.result}</span>
          <div className="history-page-inspector-math">
            <MathStatic latex={entry.resultLatex} />
          </div>
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
          <span>Facts</span>
          <ul className="history-page-facts">
            {entry.exactSupplementLatex.map((latex, index) => (
              <li key={`${entry.id}.supplement.${index}`}>
                <MathStatic latex={latex} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section>
        <span>Actions</span>
        <div className="history-page-inspector-actions">
          <InspectorButton icon={Play} tone="primary" onClick={() => onReplay(entry)}>
            {historyText.actions.replayCurrentTab}
          </InspectorButton>
          <InspectorButton icon={Plus} onClick={() => onReplayInNewTab(entry)}>
            {historyText.actions.openInNewTab}
          </InspectorButton>
          <InspectorButton icon={Copy} onClick={() => onCopyResult(entryCopyText(entry))}>
            {historyText.actions.copyResult}
          </InspectorButton>
          <InspectorButton icon={Trash2} tone="danger" onClick={() => onDelete(entry.id)}>
            {historyText.actions.deleteEntry}
          </InspectorButton>
        </div>
      </section>
      <footer>
        <Shield aria-hidden="true" size={15} />
        <span>History is stored locally on this device.</span>
      </footer>
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
  const shownStart = rows.length === 0 ? 0 : visibleRange.startIndex + 1;

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

  function updateDateFilter(nextDateFilter: string) {
    setDateFilter(nextDateFilter);
    setScrollTop(0);
  }

  return (
    <section className="app-page app-page--history" data-testid="history-page">
      <div className="app-page-shell-header">
        <span>REZANOVA CLASSWIZ CALCULATOR</span>
      </div>
      <header className="history-page-hero">
        <div>
          <HistoryIcon aria-hidden="true" size={28} />
          <div>
            <h1>{historyText.title}</h1>
            <p>Review and manage your past calculations</p>
          </div>
        </div>
        <button
          type="button"
          className="history-page-delete-selected"
          disabled={selectedEntryIds.size === 0}
          onClick={deleteSelectedEntries}
        >
          <Trash2 aria-hidden="true" size={16} />
          <span>{historyText.actions.deleteSelected}</span>
        </button>
      </header>

      <div className="history-page-toolbar">
        <label className="history-page-search">
          <span>{historyText.filters.search}</span>
          <Search aria-hidden="true" size={17} />
          <input
            value={query}
            placeholder="Search history..."
            onChange={(event) => {
              setQuery(event.currentTarget.value);
              setScrollTop(0);
            }}
          />
        </label>
        <div
          className="history-page-filter-chips"
          role="group"
          aria-label={historyText.filters.allWorkspaces}
          data-testid="history-page-workspace-filters"
        >
          <button
            type="button"
            className={modeFilter === 'all' ? 'is-active' : ''}
            onClick={() => {
              setModeFilter('all');
              setScrollTop(0);
            }}
          >
            All
          </button>
          {modesInRows.map((mode) => (
            <button
              key={mode}
              type="button"
              className={modeFilter === mode ? 'is-active' : ''}
              onClick={() => {
                setModeFilter(mode);
                setScrollTop(0);
              }}
            >
              {modeLabels[mode]}
            </button>
          ))}
        </div>
        <label className="history-page-date-select">
          <span>Date range</span>
          <CalendarDays aria-hidden="true" size={16} />
          <select value={dateFilter} onChange={(event) => updateDateFilter(event.currentTarget.value)}>
            <option value="all">All time</option>
            {dateGroups.map((group) => (
              <option key={group.key} value={group.key}>{group.label}</option>
            ))}
          </select>
          <ChevronDown className="history-page-select-chevron" aria-hidden="true" size={16} />
        </label>
      </div>

      <div className="history-page-layout">
        <aside className="history-page-timeline" aria-label="History timeline">
          <header>
            <strong>Timeline</strong>
            <PanelRight aria-hidden="true" size={16} />
          </header>
          <button
            type="button"
            className={dateFilter === 'all' ? 'is-active' : ''}
            onClick={() => updateDateFilter('all')}
          >
            <span>{historyText.filters.allDates}</span>
            <strong>{historyText.timeline.entries(allRows.length)}</strong>
          </button>
          {dateGroups.map((group) => (
            <button
              key={group.key}
              type="button"
              className={dateFilter === group.key ? 'is-active' : ''}
              onClick={() => updateDateFilter(group.key)}
            >
              <span>{group.label}</span>
              <strong>{historyText.timeline.entries(group.count)}</strong>
            </button>
          ))}
          <footer>
            <Database aria-hidden="true" size={15} />
            <span>Local history</span>
            <strong>{historyText.timeline.entries(allRows.length)}</strong>
          </footer>
        </aside>

        <main className="history-page-ledger-panel">
          <header className="history-page-ledger-title">
            <label>
              <input
                aria-label="Select visible entries"
                type="checkbox"
                checked={visibleRows
                  .filter((row) => row.kind === 'entry')
                  .every((row) => selectedEntryIds.has(row.entry.id)) && visibleRows.some((row) => row.kind === 'entry')}
                onChange={(event) => {
                  const visibleEntryIds = visibleRows
                    .filter((row): row is Extract<HistoryLedgerRow, { kind: 'entry' }> => row.kind === 'entry')
                    .map((row) => row.entry.id);
                  if (event.currentTarget.checked) {
                    setSelectedEntryIds(new Set([...selectedEntryIds, ...visibleEntryIds]));
                  } else {
                    setSelectedEntryIds(new Set([...selectedEntryIds].filter((id) => !visibleEntryIds.includes(id))));
                  }
                }}
              />
              <span>Results ({rows.length})</span>
            </label>
          </header>
          <div className="history-page-table-header" data-testid="history-page-table-header">
            <span />
            <span>Workspace</span>
            <span>Expression / Input</span>
            <span>Result preview</span>
            <span>Time</span>
            <span>Status</span>
          </div>
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
                          <span />
                          <ModeChip label={modeLabels[row.mode]} mode={row.mode} />
                          <div className="history-page-row-expression">
                            <strong>{row.ticket.inputLatex}</strong>
                          </div>
                          <span className="history-page-muted">Pending</span>
                          <span>{rowTimestamp(row)}</span>
                          <span className="history-page-chip is-status">{rowElapsed(row, elapsedNowMs)}</span>
                          <button
                            type="button"
                            disabled={row.ticket.status === 'stopping'}
                            onClick={(event) => {
                              event.stopPropagation();
                              onStopPending?.(row.ticket);
                            }}
                          >
                            <StopCircle aria-hidden="true" size={16} />
                            <span>{historyText.actions.stop}</span>
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
                          {selectedEntryIds.has(row.entry.id)
                            ? <Check aria-hidden="true" size={14} />
                            : <Square aria-hidden="true" size={14} />}
                        </label>
                        <ModeChip label={modeLabels[row.mode]} mode={row.mode} />
                        <div className="history-page-row-expression">
                          <MathStatic latex={row.entry.inputLatex} />
                        </div>
                        <div className="history-page-row-result">
                          {row.entry.resultLatex
                            ? <MathStatic latex={row.entry.resultLatex} />
                            : <span>{row.entry.approxText ?? historyText.staleAnswer}</span>}
                        </div>
                        <span>{rowTimestamp(row)}</span>
                        <span className="history-page-chip is-status">{rowResultKind(row)}</span>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <footer className="history-page-ledger-footer">
            <span>Showing {shownStart}-{visibleRange.endIndex} of {rows.length} results</span>
            <span>Virtualized ledger</span>
          </footer>
        </main>

        <HistoryDetailInspector
          row={selectedRow}
          elapsedNowMs={elapsedNowMs}
          modeLabels={modeLabels}
          onCopyResult={onCopyResult}
          onDelete={onDelete}
          onReplay={onReplay}
          onReplayInNewTab={onReplayInNewTab}
          onStopPending={onStopPending}
        />
      </div>
      <footer className="app-page-shell-footer">
        <span><Check aria-hidden="true" size={14} /> Ready</span>
        <span>Workspace: History</span>
        <span>{historyText.timeline.entries(allRows.length)}</span>
      </footer>
    </section>
  );
}
