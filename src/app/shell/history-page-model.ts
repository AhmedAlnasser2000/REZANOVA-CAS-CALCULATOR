import { buildHistoryLaunchRows } from '../../components/history-launch-rows';
import type {
  HistoryEntry,
  ModeId,
  PendingHistoryTicket,
} from '../../types/calculator';

export type HistoryLedgerRow =
  | {
      dateKey: string;
      kind: 'entry';
      entry: HistoryEntry;
      id: string;
      mode: ModeId;
      order: number;
      searchText: string;
      timestamp: string;
    }
  | {
      dateKey: string;
      kind: 'pending';
      id: string;
      mode: ModeId;
      order: number;
      searchText: string;
      ticket: PendingHistoryTicket;
      timestamp: string;
    };

export type HistoryDateGroup = {
  key: string;
  label: string;
  count: number;
};

export type HistoryVisibleRange = {
  endIndex: number;
  offsetTop: number;
  startIndex: number;
};

function dateFromTimestamp(timestamp: string) {
  const parsed = new Date(timestamp);
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

export function historyLocalDateKey(timestamp: string) {
  const date = dateFromTimestamp(timestamp);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function historyDateLabel(timestamp: string) {
  return dateFromTimestamp(timestamp).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function entrySearchText(entry: HistoryEntry, modeLabel: string) {
  return [
    modeLabel,
    entry.inputLatex,
    entry.resolvedInputLatex,
    entry.resultLatex,
    entry.approxText,
    entry.answerDomain,
    entry.solutionKind,
    ...(entry.exactSupplementLatex ?? []),
  ].filter(Boolean).join(' ').toLowerCase();
}

function pendingSearchText(ticket: PendingHistoryTicket, modeLabel: string) {
  return [
    modeLabel,
    ticket.inputLatex,
    ticket.capabilityId,
    ticket.workspaceInstanceLabel,
    ticket.status,
  ].filter(Boolean).join(' ').toLowerCase();
}

export function buildHistoryLedgerRows({
  history,
  modeLabels,
  pendingHistory,
}: {
  history: readonly HistoryEntry[];
  modeLabels: Record<ModeId, string>;
  pendingHistory: readonly PendingHistoryTicket[];
}): HistoryLedgerRow[] {
  return buildHistoryLaunchRows(history, pendingHistory).map((row) => {
    if (row.kind === 'pending') {
      const ticket = row.ticket;
      return {
        dateKey: historyLocalDateKey(ticket.timestamp),
        id: `pending:${ticket.id}`,
        kind: 'pending' as const,
        mode: ticket.mode,
        order: row.order,
        searchText: pendingSearchText(ticket, modeLabels[ticket.mode]),
        ticket,
        timestamp: ticket.timestamp,
      };
    }

    const entry = row.entry;
    return {
      dateKey: historyLocalDateKey(entry.timestamp),
      entry,
      id: entry.id,
      kind: 'entry' as const,
      mode: entry.mode,
      order: row.order,
      searchText: entrySearchText(entry, modeLabels[entry.mode]),
      timestamp: entry.timestamp,
    };
  });
}

export function buildHistoryDateGroups(rows: readonly HistoryLedgerRow[]): HistoryDateGroup[] {
  const groups = new Map<string, HistoryDateGroup>();
  for (const row of rows) {
    const current = groups.get(row.dateKey);
    if (current) {
      current.count += 1;
    } else {
      groups.set(row.dateKey, {
        count: 1,
        key: row.dateKey,
        label: historyDateLabel(row.timestamp),
      });
    }
  }
  return [...groups.values()];
}

export function filterHistoryLedgerRows({
  dateKey,
  mode,
  query,
  rows,
}: {
  dateKey: string;
  mode: ModeId | 'all';
  query: string;
  rows: readonly HistoryLedgerRow[];
}) {
  const normalizedQuery = query.trim().toLowerCase();
  return rows.filter((row) => {
    if (dateKey !== 'all' && row.dateKey !== dateKey) {
      return false;
    }
    if (mode !== 'all' && row.mode !== mode) {
      return false;
    }
    return !normalizedQuery || row.searchText.includes(normalizedQuery);
  });
}

export function historyVisibleRange({
  itemCount,
  rowHeight,
  scrollTop,
  viewportHeight,
}: {
  itemCount: number;
  rowHeight: number;
  scrollTop: number;
  viewportHeight: number;
}): HistoryVisibleRange {
  const overscan = 5;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const visibleCount = Math.ceil(viewportHeight / rowHeight) + overscan * 2;
  const endIndex = Math.min(itemCount, startIndex + visibleCount);
  return {
    endIndex,
    offsetTop: startIndex * rowHeight,
    startIndex,
  };
}
