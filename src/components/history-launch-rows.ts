import type { HistoryEntry, PendingHistoryTicket } from '../types/calculator';

export type HistoryLaunchRow =
  | {
      kind: 'entry';
      entry: HistoryEntry;
      order: number;
    }
  | {
      kind: 'pending';
      ticket: PendingHistoryTicket;
      order: number;
    };

function historyEntryLaunchOrder(entry: HistoryEntry, index: number) {
  return entry.historyLaunchOrder ?? index;
}

export function buildHistoryLaunchRows(
  history: readonly HistoryEntry[],
  pendingHistory: readonly PendingHistoryTicket[] = [],
): HistoryLaunchRow[] {
  return [
    ...history.map((entry, index) => ({
      kind: 'entry' as const,
      entry,
      order: historyEntryLaunchOrder(entry, index),
    })),
    ...pendingHistory.map((ticket) => ({
      kind: 'pending' as const,
      ticket,
      order: ticket.historyLaunchOrder,
    })),
  ].sort((left, right) => right.order - left.order);
}
