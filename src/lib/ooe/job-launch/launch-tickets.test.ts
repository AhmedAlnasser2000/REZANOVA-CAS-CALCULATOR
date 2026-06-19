import { describe, expect, it } from 'vitest';
import type { HistoryEntry, PendingHistoryTicket } from '../../../types/calculator';
import {
  buildPendingHistoryTicket,
  discardPendingHistoryTicket,
  hasActivePendingHistoryTickets,
  hasStoppingPendingHistoryTickets,
  markPendingHistoryTicketStopping,
  ooeJobContextFromHistoryTicket,
  sortHistoryEntriesByLaunchOrder,
} from './launch-tickets';

function entry(id: string, order?: number): HistoryEntry {
  return {
    id,
    mode: 'equation',
    inputLatex: `x+${id}=0`,
    resultLatex: `x=-${id}`,
    timestamp: `2026-06-06T00:00:0${id}Z`,
    ...(order !== undefined ? { historyLaunchOrder: order } : {}),
  };
}

function ticket(id: string, order: number): PendingHistoryTicket {
  return buildPendingHistoryTicket({
    id,
    mode: 'table',
    inputLatex: 'x^2',
    capabilityId: 'table.build',
    inputRevisionId: `input.${id}`,
    historyLaunchOrder: order,
    startedAtMs: order * 1000,
    timestamp: `2026-06-06T00:00:${order.toString().padStart(2, '0')}Z`,
  });
}

describe('OOE launch tickets', () => {
  it('builds pending tickets with a running default', () => {
    expect(ticket('ticket-1', 10)).toMatchObject({
      id: 'ticket-1',
      status: 'running',
      capabilityId: 'table.build',
      historyLaunchOrder: 10,
      startedAtMs: 10000,
    });
  });

  it('marks and discards tickets without mutating the original collection', () => {
    const tickets = [ticket('a', 1), ticket('b', 2)];
    const stopping = markPendingHistoryTicketStopping(tickets, 'a');

    expect(stopping[0].status).toBe('stopping');
    expect(tickets[0].status).toBe('running');
    expect(discardPendingHistoryTicket(stopping, 'a').map((item) => item.id)).toEqual(['b']);
  });

  it('detects active and stopping ticket state by capability', () => {
    const tickets = markPendingHistoryTicketStopping([ticket('a', 1), ticket('b', 2)], 'a');

    expect(hasActivePendingHistoryTickets(tickets, ['table.build'])).toBe(true);
    expect(hasStoppingPendingHistoryTickets(tickets, ['table.build'])).toBe(true);
    expect(hasActivePendingHistoryTickets(tickets, ['equation.solve'])).toBe(false);
  });

  it('preserves finalized launch ordering for reloads', () => {
    expect(sortHistoryEntriesByLaunchOrder([entry('late', 50), entry('early', 10)])
      .map((item) => item.id)).toEqual(['early', 'late']);
  });

  it('builds OOE-safe workspace context from ticket reservations', () => {
    const isWorkspaceInstanceOpen = (
      instanceId: string,
      job?: { workspaceInstanceRevision?: number | null },
    ) => instanceId === 'workspace.equation.1' && job?.workspaceInstanceRevision === 7;
    const context = ooeJobContextFromHistoryTicket({
      id: 'ticket-1',
      historyLaunchOrder: 42,
      startedAtMs: 42000,
      workspaceInstance: {
        workspaceInstanceId: 'workspace.equation.1',
        workspaceInstanceLabel: 'Equation A',
        workspaceInstanceRevision: 7,
      },
      isWorkspaceInstanceOpen,
    });

    expect(context.launchTicket).toEqual({
      id: 'ticket-1',
      historyLaunchOrder: 42,
      workspaceInstanceId: 'workspace.equation.1',
      workspaceInstanceLabel: 'Equation A',
      workspaceInstanceRevision: 7,
    });
    expect(context.workspaceInstance).toMatchObject({
      workspaceInstanceId: 'workspace.equation.1',
      workspaceInstanceLabel: 'Equation A',
      workspaceInstanceRevision: 7,
    });
    expect(context.isWorkspaceInstanceOpen?.('workspace.equation.1', {
      jobId: 'job.test',
      planId: 'plan.test',
      capabilityId: 'test',
      hostId: 'test-runtime',
      nodeId: null,
      phaseId: null,
      inputRevisionId: 'input.test',
      workspaceInstanceId: 'workspace.equation.1',
      workspaceInstanceRevision: 7,
    })).toBe(true);
    expect(context.isWorkspaceInstanceOpen?.('workspace.equation.1', {
      jobId: 'job.test',
      planId: 'plan.test',
      capabilityId: 'test',
      hostId: 'test-runtime',
      nodeId: null,
      phaseId: null,
      inputRevisionId: 'input.test',
      workspaceInstanceId: 'workspace.equation.1',
      workspaceInstanceRevision: 8,
    })).toBe(false);
  });
});
