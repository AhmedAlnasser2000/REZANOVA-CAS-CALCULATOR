import { useMemo } from 'react';
import type { HistoryEntry, ModeId, PendingHistoryTicket } from '../types/calculator';
import { buildHistoryLaunchRows } from './history-launch-rows';
import {
  formatRuntimeElapsedFinal,
  formatRuntimeElapsedRunning,
  runtimeElapsedMs,
} from '../app/runtime/runtimeElapsedTime';
import { usePendingElapsedNow } from '../app/runtime/usePendingElapsedNow';
import { latexToVisibleText } from '../lib/display/math-notation';
import { useLanguage } from '../lib/language/language-context';

const QUICK_HISTORY_COMMITTED_ROW_LIMIT = 20;

type HistoryPanelPresentation = 'outboard' | 'overlay';

type HistoryPanelProps = {
  presentation: HistoryPanelPresentation;
  history: HistoryEntry[];
  pendingHistory?: PendingHistoryTicket[];
  modeLabels: Record<ModeId, string>;
  onClear: () => void;
  onClose: () => void;
  onDelete: (id: string) => void;
  onOpenFullPage?: () => void;
  onReplay: (entry: HistoryEntry) => void;
  onStopPending?: (ticket: PendingHistoryTicket) => void;
};

function quickHistoryPreviewText(latex: string) {
  return latexToVisibleText(latex, 'plainText').trim() || latex;
}

function HistoryPanelPendingEntry({
  modeLabel,
  onStopPending,
  ticket,
}: {
  modeLabel: string;
  onStopPending?: (ticket: PendingHistoryTicket) => void;
  ticket: PendingHistoryTicket;
}) {
  const { strings } = useLanguage();
  const historyText = strings.history;
  const elapsedNowMs = usePendingElapsedNow(typeof ticket.startedAtMs === 'number');
  const pendingStatusLabel = ticket.status === 'stopping'
    ? historyText.pending.stopping
    : historyText.pending.running;
  const pendingElapsedLabel = typeof ticket.startedAtMs === 'number'
    ? formatRuntimeElapsedRunning(runtimeElapsedMs(ticket.startedAtMs, elapsedNowMs))
    : null;

  return (
    <article
      className="history-entry history-entry--pending"
      data-testid="history-entry-pending"
    >
      <div className="history-entry-header">
        <div className="history-entry-pending-summary">
          <div className="history-entry-replay history-entry-replay--pending">
            <span className="history-meta">{modeLabel}</span>
            <span className="history-entry-hint">
              {pendingElapsedLabel
                ? historyText.pending.statusWithElapsed(
                  pendingStatusLabel,
                  pendingElapsedLabel,
                )
                : pendingStatusLabel}
            </span>
          </div>
          {ticket.workspaceInstanceLabel ? (
            <span
              className="history-entry-tab-label"
              data-testid="history-entry-tab-label"
            >
              {historyText.pending.tabLabel(ticket.workspaceInstanceLabel)}
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
            {historyText.actions.stop}
          </button>
        </div>
      </div>
      <div className="history-entry-body history-entry-body--pending">
        <div className="history-entry-preview" data-testid="history-entry-preview">
          <span className="history-entry-preview-text">
            {quickHistoryPreviewText(ticket.inputLatex)}
          </span>
        </div>
      </div>
    </article>
  );
}

export function HistoryPanel({
  presentation,
  history,
  pendingHistory = [],
  modeLabels,
  onClear,
  onClose,
  onDelete,
  onOpenFullPage,
  onReplay,
  onStopPending,
}: HistoryPanelProps) {
  const { strings } = useLanguage();
  const historyText = strings.history;
  const rows = useMemo(() => {
    let committedRows = 0;
    return buildHistoryLaunchRows(history, pendingHistory).filter((row) => {
      if (row.kind === 'pending') {
        return true;
      }
      if (committedRows >= QUICK_HISTORY_COMMITTED_ROW_LIMIT) {
        return false;
      }
      committedRows += 1;
      return true;
    });
  }, [history, pendingHistory]);
  return (
    <aside
      className={`history-panel history-panel--${presentation}`}
      data-testid="history-panel"
      data-history-presentation={presentation}
    >
      <div className="history-header">
        <strong>{historyText.title}</strong>
        <div className="history-actions">
          {onOpenFullPage ? (
            <button
              type="button"
              data-testid="history-open-full-page"
              onClick={onOpenFullPage}
            >
              {historyText.actions.openFullPage}
            </button>
          ) : null}
          <button type="button" onClick={onClear}>
            {historyText.actions.clear}
          </button>
          <button type="button" onClick={onClose}>
            {historyText.actions.close}
          </button>
        </div>
      </div>
      <div className="history-list">
        {rows.length === 0 ? (
          <div className="history-empty">{historyText.empty}</div>
        ) : (
          rows
            .map((row) => {
              if (row.kind === 'pending') {
                const ticket = row.ticket;
                return (
                  <HistoryPanelPendingEntry
                    key={ticket.id}
                    modeLabel={modeLabels[ticket.mode]}
                    onStopPending={onStopPending}
                    ticket={ticket}
                  />
                );
              }

              const entry = row.entry;
              const resultPreview = entry.resultLatex
                ? quickHistoryPreviewText(entry.resultLatex)
                : entry.approxText;
              return (
                <article
                  key={entry.id}
                  className="history-entry"
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
                      <span className="history-entry-hint">{historyText.replay}</span>
                    </button>
                    <div className="history-entry-actions">
                      <button
                        type="button"
                        className="history-entry-icon"
                        data-testid="history-entry-delete"
                        aria-label={historyText.aria.deleteEntry}
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
                      <span className="history-entry-preview-text">
                        {quickHistoryPreviewText(entry.inputLatex)}
                      </span>
                    </div>
                    {resultPreview ? (
                      <div
                        className="history-entry-preview history-entry-preview--result"
                        data-testid="history-entry-result-preview"
                      >
                        <span className="history-entry-section-label">
                          {entry.resultLatex ? historyText.labels.answer : historyText.labels.approx}
                        </span>
                        <span className="history-entry-preview-text">{resultPreview}</span>
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
