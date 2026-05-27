import type {
  OoeCommitDecision,
  OoeResultStability,
  OoeTraceEvent,
  OoeTraceStatus,
} from './ooe-bridge';

type BuildOoeTraceEventInput = {
  planId: string;
  status: OoeTraceStatus;
  resultStability: OoeResultStability;
  traceId?: string | null;
  jobId?: string | null;
  nodeId?: string | null;
  capabilityId?: string | null;
  hostId?: string | null;
  phaseId?: string | null;
  stageId?: string | null;
  inputRevisionId?: string | null;
  durationMs?: number | null;
  commitDecision?: OoeCommitDecision | null;
  message?: string | null;
};

export function buildOoeTraceEvent(input: BuildOoeTraceEventInput): OoeTraceEvent {
  return {
    traceId: input.traceId ?? null,
    jobId: input.jobId ?? null,
    planId: input.planId,
    nodeId: input.nodeId ?? null,
    capabilityId: input.capabilityId ?? null,
    hostId: input.hostId ?? null,
    phaseId: input.phaseId ?? null,
    stageId: input.stageId ?? null,
    inputRevisionId: input.inputRevisionId ?? null,
    status: input.status,
    resultStability: input.resultStability,
    durationMs: input.durationMs ?? null,
    commitDecision: input.commitDecision ?? null,
    message: input.message ?? null,
  };
}

type BuildOoeStageAttemptTraceEventInput = {
  planId: string;
  nodeId: string;
  capabilityId: string;
  hostId: string;
  phaseId: string;
  stageId: string;
  depth?: number;
  returnedOutcome: boolean;
};

export function buildOoeStageAttemptTraceEvent(
  input: BuildOoeStageAttemptTraceEventInput,
): OoeTraceEvent {
  return buildOoeTraceEvent({
    planId: input.planId,
    nodeId: input.nodeId,
    capabilityId: input.capabilityId,
    hostId: input.hostId,
    phaseId: input.phaseId,
    stageId: input.stageId,
    status: input.returnedOutcome ? 'provisionalReady' : 'completed',
    resultStability: input.returnedOutcome ? 'provisional' : 'draft',
    commitDecision: 'notApplicable',
    message: input.returnedOutcome
      ? `Guarded stage ${input.stageId} returned an outcome at depth ${input.depth ?? 0}.`
      : `Guarded stage ${input.stageId} passed without an outcome at depth ${input.depth ?? 0}.`,
  });
}

export function buildOoeFinalOutcomeTraceEvent(input: {
  planId: string;
  nodeId: string;
  capabilityId: string;
  hostId: string;
  phaseId: string;
  message?: string;
}): OoeTraceEvent {
  return buildOoeTraceEvent({
    ...input,
    status: 'completed',
    resultStability: 'stable',
    commitDecision: 'notApplicable',
    message: input.message ?? 'Equation pilot produced a stable DisplayOutcome.',
  });
}
