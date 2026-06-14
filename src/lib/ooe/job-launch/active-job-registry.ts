import type {
  OoeCommitAssessment,
  OoeJobIdentity,
  OoeTraceEvent,
} from '../bridge-schema/ooe-bridge';

export const DEFAULT_OOE_RECENT_JOB_LIMIT = 50;

export type OoeActiveJobStatus =
  | 'started'
  | 'cancelRequested'
  | 'completed'
  | 'staleDropped'
  | 'skipped'
  | 'cancelled'
  | 'failed';

export type OoeCancellationRequester = 'internal' | 'user' | 'system' | 'test';

export type OoeCancellationRequest = {
  requestedAt: number;
  requestedBy: OoeCancellationRequester;
  reason?: string;
};

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
  cancellationRequest?: OoeCancellationRequest;
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

type RequestOoeJobCancellationOptions = {
  requestedBy?: OoeCancellationRequester;
  reason?: string;
};

type MarkOoeJobCancelledOptions = RequestOoeJobCancellationOptions & {
  commitAssessment?: OoeCommitAssessment;
  traceEvents?: readonly OoeTraceEvent[];
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
    cancellationRequest: record.cancellationRequest
      ? { ...record.cancellationRequest }
      : undefined,
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
): Exclude<
  OoeActiveJobStatus,
  'started' | 'cancelRequested' | 'cancelled' | 'failed'
> {
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

function buildCancellationRequest(
  options: RequestOoeJobCancellationOptions = {},
): OoeCancellationRequest {
  return {
    requestedAt: now(),
    requestedBy: options.requestedBy ?? 'internal',
    reason: options.reason,
  };
}

function findRecentJob(registryId: string) {
  return recentJobs.find((record) => record.registryId === registryId) ?? null;
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

export function requestOoeJobCancellation(
  registryId: string,
  options?: RequestOoeJobCancellationOptions,
): OoeActiveJobRecord | null {
  const activeRecord = activeJobs.get(registryId);
  if (!activeRecord) {
    return null;
  }

  if (!activeRecord.cancellationRequest) {
    activeRecord.cancellationRequest = buildCancellationRequest(options);
  }
  activeRecord.status = 'cancelRequested';

  return cloneRecord(activeRecord);
}

export function requestLatestOoeCapabilityCancellation(
  capabilityId: string,
  options?: RequestOoeJobCancellationOptions,
): OoeActiveJobRecord | null {
  const latest = Array.from(activeJobs.values())
    .filter((record) => record.capabilityId === capabilityId)
    .sort((left, right) => right.sequence - left.sequence)[0];

  return latest ? requestOoeJobCancellation(latest.registryId, options) : null;
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

export function markOoeJobCancelled(
  registryId: string,
  options?: MarkOoeJobCancelledOptions,
): OoeActiveJobRecord | null {
  const activeRecord = activeJobs.get(registryId);
  if (!activeRecord) {
    return null;
  }

  const cancelled: OoeActiveJobRecord = {
    ...activeRecord,
    status: 'cancelled',
    finishedAt: now(),
    commitAssessment: options?.commitAssessment,
    cancellationRequest: activeRecord.cancellationRequest
      ?? buildCancellationRequest(options),
    traceEvents: options?.traceEvents ? [...options.traceEvents] : activeRecord.traceEvents,
  };
  activeJobs.delete(registryId);
  pushRecentJob(cancelled);
  return cloneRecord(cancelled);
}

export function isOoeJobCancellationRequested(
  recordOrRegistryId: OoeActiveJobRecord | string,
): boolean {
  if (typeof recordOrRegistryId !== 'string') {
    return Boolean(recordOrRegistryId.cancellationRequest);
  }

  const record = activeJobs.get(recordOrRegistryId) ?? findRecentJob(recordOrRegistryId);
  return Boolean(record?.cancellationRequest);
}

export function listActiveOoeJobs(): OoeActiveJobRecord[] {
  return Array.from(activeJobs.values(), cloneRecord);
}

export function listRecentOoeJobs(): OoeActiveJobRecord[] {
  return recentJobs.map(cloneRecord);
}

export function clearRecentOoeJobs(options?: { recentJobLimit?: number }) {
  recentJobs.length = 0;
  recentJobLimit = options?.recentJobLimit ?? DEFAULT_OOE_RECENT_JOB_LIMIT;
}

export function clearOoeJobRegistry(options?: { recentJobLimit?: number }) {
  activeJobs.clear();
  recentJobs.length = 0;
  nextSequence = 1;
  recentJobLimit = options?.recentJobLimit ?? DEFAULT_OOE_RECENT_JOB_LIMIT;
}
