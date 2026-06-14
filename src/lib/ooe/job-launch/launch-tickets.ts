import type { HistoryEntry, PendingHistoryTicket } from '../../../types/calculator';

export type PendingHistoryTicketReservation = {
  id: string;
  historyLaunchOrder: number;
};

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

export function buildPendingHistoryTicket(input: Omit<
  PendingHistoryTicket,
  'status' | 'timestamp'
> & {
  timestamp?: string;
  status?: PendingHistoryTicket['status'];
}): PendingHistoryTicket {
  return {
    ...input,
    status: input.status ?? 'running',
    timestamp: input.timestamp ?? new Date().toISOString(),
  };
}

export function historyEntryLaunchOrder(entry: HistoryEntry, index: number) {
  return entry.historyLaunchOrder ?? index;
}

export function sortHistoryEntriesByLaunchOrder(entries: readonly HistoryEntry[]) {
  return [...entries]
    .map((entry, index) => ({
      entry,
      order: historyEntryLaunchOrder(entry, index),
    }))
    .sort((left, right) => left.order - right.order)
    .map((item) => item.entry);
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

export function discardPendingHistoryTicket(
  tickets: readonly PendingHistoryTicket[],
  ticketId?: string | null,
) {
  if (!ticketId) {
    return [...tickets];
  }

  return tickets.filter((ticket) => ticket.id !== ticketId);
}

export function markPendingHistoryTicketStopping(
  tickets: readonly PendingHistoryTicket[],
  ticketId?: string | null,
) {
  if (!ticketId) {
    return [...tickets];
  }

  return tickets.map((ticket) =>
    ticket.id === ticketId
      ? {
          ...ticket,
          status: 'stopping' as const,
        }
      : ticket);
}

export function hasActivePendingHistoryTickets(
  tickets: readonly PendingHistoryTicket[],
  capabilityIds?: readonly string[],
) {
  return tickets.some((ticket) =>
    !capabilityIds || (ticket.capabilityId && capabilityIds.includes(ticket.capabilityId)));
}

export function hasStoppingPendingHistoryTickets(
  tickets: readonly PendingHistoryTicket[],
  capabilityIds?: readonly string[],
) {
  return tickets.some((ticket) =>
    ticket.status === 'stopping'
    && (!capabilityIds || (ticket.capabilityId && capabilityIds.includes(ticket.capabilityId))));
}
