import type {
  OoeCommitAssessment,
  OoeJobIdentity,
  OoeTraceEvent,
} from './ooe-bridge';

export const DEFAULT_OOE_RECENT_JOB_LIMIT = 50;

export type OoeActiveJobStatus =
  | 'started'
  | 'completed'
  | 'staleDropped'
  | 'skipped'
  | 'failed';

export type OoeActiveJobRecord = {
  registryId: string;
  sequence: number;
  job: OoeJobIdentity;
  jobId: string;
  inputRevisionId: string;
  planId: string;
  capabilityId: string;
  hostId: string;
  nodeId: string | null;
  phaseId: string | null;
  routeLabel: string;
  status: OoeActiveJobStatus;
  startedAt: number;
  finishedAt?: number;
  commitAssessment?: OoeCommitAssessment;
  traceEvents: OoeTraceEvent[];
  errorMessage?: string;
};

type StartOoeJobInput = {
  job: OoeJobIdentity;
  routeLabel: string;
  traceEvents?: OoeTraceEvent[];
};

type CompleteOoeJobMetadata = {
  commitAssessment: OoeCommitAssessment;
  traceEvents: OoeTraceEvent[];
};

const activeJobs = new Map<string, OoeActiveJobRecord>();
const recentJobs: OoeActiveJobRecord[] = [];
let nextSequence = 1;
let recentJobLimit = DEFAULT_OOE_RECENT_JOB_LIMIT;

function now() {
  return Date.now();
}

function cloneRecord(record: OoeActiveJobRecord): OoeActiveJobRecord {
  return {
    ...record,
    traceEvents: [...record.traceEvents],
  };
}

function pushRecentJob(record: OoeActiveJobRecord) {
  recentJobs.unshift(cloneRecord(record));
  if (recentJobs.length > recentJobLimit) {
    recentJobs.length = recentJobLimit;
  }
}

function terminalStatusForAssessment(
  assessment: OoeCommitAssessment,
): Exclude<OoeActiveJobStatus, 'started' | 'failed'> {
  switch (assessment.legality) {
    case 'commitAllowed':
      return 'completed';
    case 'staleDrop':
      return 'staleDropped';
    case 'skipped':
    case 'notApplicable':
      return 'skipped';
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function startOoeJob(input: StartOoeJobInput): OoeActiveJobRecord {
  const sequence = nextSequence;
  nextSequence += 1;
  const record: OoeActiveJobRecord = {
    registryId: `ooe-job-${sequence}`,
    sequence,
    job: input.job,
    jobId: input.job.jobId,
    inputRevisionId: input.job.inputRevisionId,
    planId: input.job.planId,
    capabilityId: input.job.capabilityId,
    hostId: input.job.hostId,
    nodeId: input.job.nodeId ?? null,
    phaseId: input.job.phaseId ?? null,
    routeLabel: input.routeLabel,
    status: 'started',
    startedAt: now(),
    traceEvents: input.traceEvents ? [...input.traceEvents] : [],
  };
  activeJobs.set(record.registryId, record);
  return cloneRecord(record);
}

export function completeOoeJob(
  record: OoeActiveJobRecord,
  metadata: CompleteOoeJobMetadata,
): OoeActiveJobRecord {
  const activeRecord = activeJobs.get(record.registryId) ?? record;
  const completed: OoeActiveJobRecord = {
    ...activeRecord,
    status: terminalStatusForAssessment(metadata.commitAssessment),
    finishedAt: now(),
    commitAssessment: metadata.commitAssessment,
    traceEvents: [...metadata.traceEvents],
  };
  activeJobs.delete(record.registryId);
  pushRecentJob(completed);
  return cloneRecord(completed);
}

export function failOoeJob(
  record: OoeActiveJobRecord,
  error: unknown,
): OoeActiveJobRecord {
  const activeRecord = activeJobs.get(record.registryId) ?? record;
  const failed: OoeActiveJobRecord = {
    ...activeRecord,
    status: 'failed',
    finishedAt: now(),
    errorMessage: errorMessage(error),
  };
  activeJobs.delete(record.registryId);
  pushRecentJob(failed);
  return cloneRecord(failed);
}

export function listActiveOoeJobs(): OoeActiveJobRecord[] {
  return Array.from(activeJobs.values(), cloneRecord);
}

export function listRecentOoeJobs(): OoeActiveJobRecord[] {
  return recentJobs.map(cloneRecord);
}

export function clearOoeJobRegistry(options?: { recentJobLimit?: number }) {
  activeJobs.clear();
  recentJobs.length = 0;
  nextSequence = 1;
  recentJobLimit = options?.recentJobLimit ?? DEFAULT_OOE_RECENT_JOB_LIMIT;
}
