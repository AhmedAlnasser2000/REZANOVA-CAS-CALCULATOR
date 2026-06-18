import type { PendingHistoryTicket } from '../../types/calculator';
import type {
  WorkspaceInstance,
  WorkspaceInstanceId,
} from './workspace-instances';
import {
  listActiveOoeJobs,
  requestOoeJobCancellation,
} from '../../lib/ooe/job-launch/active-job-registry';

export type WorkspaceTabJobSummary = {
  activeJobCount: number;
  pendingTicketCount: number;
  stoppingTicketCount: number;
};

export type WorkspaceTabJobSummaryById = Record<WorkspaceInstanceId, WorkspaceTabJobSummary>;

function emptySummary(): WorkspaceTabJobSummary {
  return {
    activeJobCount: 0,
    pendingTicketCount: 0,
    stoppingTicketCount: 0,
  };
}

function incrementSummary(
  summaries: WorkspaceTabJobSummaryById,
  workspaceInstanceId: WorkspaceInstanceId,
  field: keyof WorkspaceTabJobSummary,
) {
  const summary = summaries[workspaceInstanceId] ?? emptySummary();
  summaries[workspaceInstanceId] = {
    ...summary,
    [field]: summary[field] + 1,
  };
}

function matchesCurrentWorkspaceRevision(
  instance: WorkspaceInstance,
  workspaceInstanceRevision?: number | null,
) {
  return workspaceInstanceRevision == null
    || workspaceInstanceRevision === instance.navigationRevision;
}

export function summarizeWorkspaceTabJobs(input: {
  workspaceInstances: readonly WorkspaceInstance[];
  pendingHistoryTickets: readonly PendingHistoryTicket[];
}): WorkspaceTabJobSummaryById {
  const instancesById = new Map(input.workspaceInstances.map((instance) => [instance.id, instance]));
  const summaries = Object.fromEntries(
    input.workspaceInstances.map((instance) => [instance.id, emptySummary()]),
  ) as WorkspaceTabJobSummaryById;

  for (const ticket of input.pendingHistoryTickets) {
    const instance = ticket.workspaceInstanceId
      ? instancesById.get(ticket.workspaceInstanceId)
      : null;
    if (!ticket.workspaceInstanceId || !instance) {
      continue;
    }
    if (!matchesCurrentWorkspaceRevision(instance, ticket.workspaceInstanceRevision)) {
      continue;
    }
    incrementSummary(summaries, ticket.workspaceInstanceId, 'pendingTicketCount');
    if (ticket.status === 'stopping') {
      incrementSummary(summaries, ticket.workspaceInstanceId, 'stoppingTicketCount');
    }
  }

  for (const job of listActiveOoeJobs()) {
    const instance = job.workspaceInstanceId
      ? instancesById.get(job.workspaceInstanceId)
      : null;
    if (!job.workspaceInstanceId || !instance) {
      continue;
    }
    if (!matchesCurrentWorkspaceRevision(instance, job.job.workspaceInstanceRevision)) {
      continue;
    }
    incrementSummary(summaries, job.workspaceInstanceId, 'activeJobCount');
  }

  return summaries;
}

export function requestWorkspaceTabJobCancellation(
  workspaceInstanceId: WorkspaceInstanceId,
  reason: string,
) {
  const jobs = listActiveOoeJobs().filter((job) =>
    job.workspaceInstanceId === workspaceInstanceId);

  for (const job of jobs) {
    requestOoeJobCancellation(job.registryId, {
      requestedBy: 'user',
      reason,
    });
  }

  return jobs.length;
}
