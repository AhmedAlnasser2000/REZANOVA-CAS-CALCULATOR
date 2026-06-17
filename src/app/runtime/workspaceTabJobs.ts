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

export function summarizeWorkspaceTabJobs(input: {
  workspaceInstances: readonly WorkspaceInstance[];
  pendingHistoryTickets: readonly PendingHistoryTicket[];
}): WorkspaceTabJobSummaryById {
  const summaries = Object.fromEntries(
    input.workspaceInstances.map((instance) => [instance.id, emptySummary()]),
  ) as WorkspaceTabJobSummaryById;

  for (const ticket of input.pendingHistoryTickets) {
    if (!ticket.workspaceInstanceId || !summaries[ticket.workspaceInstanceId]) {
      continue;
    }
    incrementSummary(summaries, ticket.workspaceInstanceId, 'pendingTicketCount');
    if (ticket.status === 'stopping') {
      incrementSummary(summaries, ticket.workspaceInstanceId, 'stoppingTicketCount');
    }
  }

  for (const job of listActiveOoeJobs()) {
    if (!job.workspaceInstanceId || !summaries[job.workspaceInstanceId]) {
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
