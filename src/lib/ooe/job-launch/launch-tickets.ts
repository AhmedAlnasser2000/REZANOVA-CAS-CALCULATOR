import type { HistoryEntry, PendingHistoryTicket } from '../../../types/calculator';
import type { WorkspaceInstanceRuntimeContext } from '../../../types/calculator/workspace-instance-types';
import type { OoeJobContextOptions } from './job-contract';

export type PendingHistoryTicketReservation = {
  id: string;
  historyLaunchOrder: number;
  workspaceInstance?: WorkspaceInstanceRuntimeContext | null;
  isWorkspaceInstanceOpen?: (workspaceInstanceId: string) => boolean;
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

type OoeHistoryTicketJobContext = Pick<
  OoeJobContextOptions,
  'launchTicket' | 'workspaceInstance' | 'isWorkspaceInstanceOpen'
>;

export function ooeJobContextFromHistoryTicket(
  ticket?: PendingHistoryTicketReservation | null,
): OoeHistoryTicketJobContext {
  if (!ticket) {
    return {};
  }

  return {
    launchTicket: {
      id: ticket.id,
      historyLaunchOrder: ticket.historyLaunchOrder,
      ...(ticket.workspaceInstance
        ? {
            workspaceInstanceId: ticket.workspaceInstance.workspaceInstanceId,
            workspaceInstanceLabel: ticket.workspaceInstance.workspaceInstanceLabel,
          }
        : {}),
    },
    workspaceInstance: ticket.workspaceInstance ?? undefined,
    isWorkspaceInstanceOpen: ticket.isWorkspaceInstanceOpen
      ? (workspaceInstanceId) => ticket.isWorkspaceInstanceOpen?.(workspaceInstanceId) ?? false
      : undefined,
  };
}

function historyEntryLaunchOrder(entry: HistoryEntry, index: number) {
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
