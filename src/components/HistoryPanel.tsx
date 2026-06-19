import { useEffect, useState } from 'react';
import { MathStatic } from './MathStatic';
import type { HistoryEntry, ModeId, PendingHistoryTicket } from '../types/calculator';
import { buildHistoryLaunchRows } from './history-launch-rows';
import {
  formatRuntimeElapsedFinal,
  formatRuntimeElapsedRunning,
  runtimeElapsedMs,
} from '../app/runtime/runtimeElapsedTime';

type HistoryPanelPresentation = 'outboard' | 'overlay';

type HistoryPanelProps = {
  presentation: HistoryPanelPresentation;
  history: HistoryEntry[];
  pendingHistory?: PendingHistoryTicket[];
  modeLabels: Record<ModeId, string>;
  onClear: () => void;
  onClose: () => void;
  onDelete: (id: string) => void;
  onReplay: (entry: HistoryEntry) => void;
  onStopPending?: (ticket: PendingHistoryTicket) => void;
};

export function HistoryPanel({
  presentation,
  history,
  pendingHistory = [],
  modeLabels,
  onClear,
  onClose,
  onDelete,
  onReplay,
  onStopPending,
}: HistoryPanelProps) {
  const [expandedEntryIds, setExpandedEntryIds] = useState<Set<string>>(() => new Set());
  const [elapsedNowMs, setElapsedNowMs] = useState(() => Date.now());
  const rows = buildHistoryLaunchRows(history, pendingHistory);
  const hasTimedPendingRows = pendingHistory.some((ticket) =>
    typeof ticket.startedAtMs === 'number');

  useEffect(() => {
    if (!hasTimedPendingRows) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setElapsedNowMs(Date.now());
    }, 250);

    return () => window.clearInterval(intervalId);
  }, [hasTimedPendingRows]);

  function toggleEntry(entryId: string) {
    setExpandedEntryIds((currentIds) => {
      const nextIds = new Set(currentIds);
      if (nextIds.has(entryId)) {
        nextIds.delete(entryId);
      } else {
        nextIds.add(entryId);
      }
      return nextIds;
    });
  }

  return (
    <aside
      className={`history-panel history-panel--${presentation}`}
      data-testid="history-panel"
      data-history-presentation={presentation}
    >
      <div className="history-header">
        <strong>History</strong>
        <div className="history-actions">
          <button type="button" onClick={onClear}>
            Clear
          </button>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
      <div className="history-list">
        {rows.length === 0 ? (
          <div className="history-empty">No stored history yet.</div>
        ) : (
          rows
            .map((row) => {
              if (row.kind === 'pending') {
                const ticket = row.ticket;
                const pendingStatusLabel = ticket.status === 'stopping' ? 'Stopping' : 'Running';
                const pendingElapsedLabel = typeof ticket.startedAtMs === 'number'
                  ? formatRuntimeElapsedRunning(runtimeElapsedMs(ticket.startedAtMs, elapsedNowMs))
                  : null;
                return (
                  <article
                    key={ticket.id}
                    className="history-entry history-entry--pending"
                    data-testid="history-entry-pending"
                  >
                    <div className="history-entry-header">
                      <div className="history-entry-pending-summary">
                        <div className="history-entry-replay history-entry-replay--pending">
                          <span className="history-meta">{modeLabels[ticket.mode]}</span>
                          <span className="history-entry-hint">
                            {pendingElapsedLabel
                              ? `${pendingStatusLabel} · ${pendingElapsedLabel}`
                              : pendingStatusLabel}
                          </span>
                        </div>
                        {ticket.workspaceInstanceLabel ? (
                          <span
                            className="history-entry-tab-label"
                            data-testid="history-entry-tab-label"
                          >
                            Tab: {ticket.workspaceInstanceLabel}
                          </span>
                        ) : null}
                      </div>
                      <div className="history-entry-actions">
                        <button
                          type="button"
                          className="history-entry-stop"
                          data-testid="history-entry-stop"
                          disabled={ticket.status === 'stopping'}
                          onClick={() => onStopPending?.(ticket)}
                        >
                          Stop
                        </button>
                      </div>
                    </div>
                    <div className="history-entry-body history-entry-body--pending">
                      <div className="history-entry-preview" data-testid="history-entry-preview">
                        <MathStatic className="history-math" latex={ticket.inputLatex} />
                      </div>
                    </div>
                  </article>
                );
              }

              const entry = row.entry;
              const isExpanded = expandedEntryIds.has(entry.id);
              const hasExpandedContent =
                Boolean(entry.resultLatex)
                || Boolean(entry.approxText)
                || Boolean(entry.exactSupplementLatex && entry.exactSupplementLatex.length > 0);
              return (
                <article
                  key={entry.id}
                  className={`history-entry ${isExpanded ? 'is-expanded' : ''}`}
                  data-testid="history-entry"
                  onClick={(event) => {
                    if ((event.target as HTMLElement).closest('button')) {
                      return;
                    }
                    onReplay(entry);
                  }}
                >
                  <div className="history-entry-header">
                    <button
                      type="button"
                      className="history-entry-replay"
                      data-testid="history-entry-replay"
                      onClick={() => onReplay(entry)}
                    >
                      <span className="history-meta">{modeLabels[entry.mode]}</span>
                      {typeof entry.runtimeElapsedMs === 'number' ? (
                        <span
                          className="history-entry-elapsed"
                          data-testid="history-entry-runtime-elapsed"
                        >
                          {formatRuntimeElapsedFinal(entry.runtimeElapsedMs)}
                        </span>
                      ) : null}
                      <span className="history-entry-hint">Replay</span>
                    </button>
                    <div className="history-entry-actions">
                      <button
                        type="button"
                        className="history-entry-icon"
                        data-testid="history-entry-toggle"
                        aria-label={isExpanded ? 'Collapse history entry' : 'Expand history entry'}
                        aria-expanded={isExpanded}
                        onClick={() => toggleEntry(entry.id)}
                      >
                        {isExpanded ? '^' : 'v'}
                      </button>
                      <button
                        type="button"
                        className="history-entry-icon"
                        data-testid="history-entry-delete"
                        aria-label="Delete history entry"
                        onClick={() => onDelete(entry.id)}
                      >
                        x
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="history-entry-body"
                    data-testid="history-entry-body"
                    onClick={() => onReplay(entry)}
                  >
                    <div className="history-entry-preview" data-testid="history-entry-preview">
                      <MathStatic className="history-math" latex={entry.inputLatex} />
                    </div>
                    {isExpanded ? (
                      <div className="history-entry-expanded" data-testid="history-entry-expanded">
                        {entry.resultLatex ? (
                          <div className="history-entry-section">
                            <span className="history-entry-section-label">Answer</span>
                            <MathStatic className="history-math result" latex={entry.resultLatex} />
                          </div>
                        ) : null}
                        {entry.approxText ? (
                          <div className="history-entry-section">
                            <span className="history-entry-section-label">Approx</span>
                            <span className="history-entry-text">{entry.approxText}</span>
                          </div>
                        ) : null}
                        {entry.answerDomain === 'complex' ? (
                          <div className="history-entry-section">
                            <span className="history-entry-section-label">Domain</span>
                            <span className="history-entry-text">Complex</span>
                          </div>
                        ) : null}
                        {entry.solutionKind === 'inequality-solution-set' ? (
                          <div className="history-entry-section">
                            <span className="history-entry-section-label">Solution</span>
                            <span className="history-entry-text">Inequality set</span>
                          </div>
                        ) : null}
                        {entry.exactSupplementLatex && entry.exactSupplementLatex.length > 0 ? (
                          <div className="history-entry-section">
                            <span className="history-entry-section-label">Valid when</span>
                            {entry.exactSupplementLatex.map((line, index) => (
                              <MathStatic
                                key={`${entry.id}-valid-${index}`}
                                className="history-math result"
                                latex={line}
                              />
                            ))}
                          </div>
                        ) : null}
                        {!hasExpandedContent ? (
                          <div className="history-entry-section">
                            <span className="history-entry-section-label">Answer</span>
                            <span className="history-entry-text">
                              Replay this entry to refresh its saved answer.
                            </span>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </button>
                </article>
              );
            })
        )}
      </div>
    </aside>
  );
}
