import {
  completeOoeJob,
  failOoeJob,
  isOoeJobCancellationRequested,
  markOoeJobCancelled,
  startOoeJob,
} from '../job-launch/active-job-registry';
import {
  buildOoeJobCommitContextForJob,
  buildOoeJobIdentity,
  type OoeJobCommitContext,
  type OoeJobContextOptions,
} from '../job-launch/job-contract';
import {
  recordOoeDiagnostics,
  type OoeDiagnosticsProvenance,
  type OoeDiagnosticsTerminalStatus,
} from '../diagnostics/diagnostics-buffer';
import {
  recordOoeEvent,
  type OoeEventPayload,
  type OoeEventType,
} from '../events/event-outbox';
import { resolveOoeEventCompartment } from '../events/compartment-labels';
import {
  resolveOoeHostAdapter,
  summarizeOoeHostAdapterStatus,
  type OoeHostAdapterStatus,
} from './host-adapter';
import type { OoeCommitAssessment } from '../bridge-schema/ooe-bridge';
import {
  buildOoeRuntimeEnvelope,
  prepareOoePlanPreflight,
  type OoePilotDefinition,
  type OoePilotStatus,
  type OoeRuntimeEnvelope,
  type OoeRuntimeMetadata,
} from './runtime-envelope';
import { buildOoeTraceEvent } from './trace';

type RunOoeRuntimeJobInput<
  TPayload,
  TDefinition extends OoePilotDefinition,
  TStatus extends OoePilotStatus<TDefinition['planId']>,
  TMetadata extends OoeRuntimeMetadata<TDefinition, TStatus>,
> = {
  definition: TDefinition;
  routeLabel: string;
  routeSnapshot: unknown;
  options?: OoeJobContextOptions;
  cooperativeBudget?: {
    sliceMs?: number;
  };
  prepareStatus?: () => Promise<TStatus>;
  run: (context: OoeRuntimeControlContext) => TPayload | Promise<TPayload>;
  buildMetadata: (input: {
    payload: TPayload;
    status: TStatus;
    jobContext: OoeJobCommitContext;
    controlTraceEvents: readonly ReturnType<typeof buildOoeTraceEvent>[];
  }) => TMetadata;
  buildProvenance?: (input: {
    payload: TPayload;
    status: TStatus;
    jobContext: OoeJobCommitContext;
    metadata: TMetadata;
    routeSnapshot: unknown;
  }) => OoeDiagnosticsProvenance | undefined;
  buildFailureProvenance?: (input: {
    error: unknown;
    jobContext: OoeJobCommitContext;
    routeSnapshot: unknown;
  }) => OoeDiagnosticsProvenance | undefined;
};

export type OoeRuntimeControlContext = {
  registryId: string;
  shouldCancel: () => boolean;
  checkpoint: (message: string) => void;
  yieldIfBudgetExceeded: (message?: string) => Promise<boolean>;
};

function now() {
  return Date.now();
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function terminalStatusForAssessment(
  assessment: OoeCommitAssessment,
): Exclude<OoeDiagnosticsTerminalStatus, 'cancelled' | 'failed'> {
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

function cooperativeYield() {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

function failedCommitAssessment(
  jobContext: OoeJobCommitContext,
): OoeCommitAssessment {
  return {
    ...jobContext.commitAssessment,
    legality: 'notApplicable',
    commitDecision: 'notApplicable',
    resultStability: 'failed',
  };
}

function eventPayloadForPreflight(status: OoePilotStatus): OoeEventPayload {
  switch (status.kind) {
    case 'ready':
      return { status: status.kind };
    case 'unavailable':
      return { status: status.kind, reason: status.reason };
    case 'missing-plan':
      return { status: status.kind };
    case 'invalid-plan':
      return { status: status.kind, errorsCount: status.errors.length };
    case 'bridge-error':
      return { status: status.kind, message: status.message };
  }
}

function resultEventType(terminalStatus: Exclude<OoeDiagnosticsTerminalStatus, 'cancelled' | 'failed'>): OoeEventType {
  switch (terminalStatus) {
    case 'completed':
      return 'ooe.result.committed';
    case 'staleDropped':
      return 'ooe.result.staleDropped';
    case 'skipped':
      return 'ooe.result.skipped';
  }
}

function recordRuntimeEvent(input: {
  type: OoeEventType;
  severity?: 'debug' | 'info' | 'warning' | 'error';
  definition: OoePilotDefinition;
  job: ReturnType<typeof buildOoeJobIdentity>;
  registryId: string;
  routeLabel: string;
  message?: string;
  payload?: OoeEventPayload;
}) {
  const compartment = resolveOoeEventCompartment({
    capabilityId: input.definition.capabilityId,
    routeLabel: input.routeLabel,
    hostId: input.definition.hostId,
  });
  recordOoeEvent({
    type: input.type,
    severity: input.severity ?? 'info',
    registryId: input.registryId,
    jobId: input.job.jobId,
    inputRevisionId: input.job.inputRevisionId,
    planId: input.definition.planId,
    capabilityId: input.definition.capabilityId,
    hostId: input.definition.hostId,
    nodeId: input.definition.nodeId,
    phaseId: input.definition.phaseId,
    ...(input.job.workspaceInstanceId
      ? {
          workspaceInstanceId: input.job.workspaceInstanceId,
          workspaceInstanceLabel: input.job.workspaceInstanceLabel ?? undefined,
        }
      : {}),
    routeLabel: input.routeLabel,
    ...compartment,
    message: input.message,
    payload: input.payload,
  });
}

export async function runOoeRuntimeJob<
  TPayload,
  TDefinition extends OoePilotDefinition,
  TStatus extends OoePilotStatus<TDefinition['planId']>,
  TMetadata extends OoeRuntimeMetadata<TDefinition, TStatus>,
>(
  input: RunOoeRuntimeJobInput<TPayload, TDefinition, TStatus, TMetadata>,
): Promise<OoeRuntimeEnvelope<TPayload, TMetadata>> {
  const job = buildOoeJobIdentity(
    input.definition,
    input.routeSnapshot,
    input.options?.workspaceInstance,
  );
  const startedAt = now();
  const activeJob = startOoeJob({
    job,
    routeLabel: input.routeLabel,
  });
  recordRuntimeEvent({
    type: 'ooe.job.started',
    definition: input.definition,
    job,
    registryId: activeJob.registryId,
    routeLabel: input.routeLabel,
    message: `${input.routeLabel} job started.`,
  });
  let hostAdapter: OoeHostAdapterStatus | undefined;
  const controlTraceEvents: ReturnType<typeof buildOoeTraceEvent>[] = [];
  let sliceStartedAt = startedAt;
  const sliceMs = input.cooperativeBudget?.sliceMs ?? 8;
  const controlContext: OoeRuntimeControlContext = {
    registryId: activeJob.registryId,
    shouldCancel: () => isOoeJobCancellationRequested(activeJob.registryId),
    checkpoint: (message) => {
      controlTraceEvents.push(buildOoeTraceEvent({
        ...input.definition,
        jobId: job.jobId,
        inputRevisionId: job.inputRevisionId,
        status: 'provisionalReady',
        resultStability: 'provisional',
        commitDecision: 'notApplicable',
        message,
      }));
    },
    yieldIfBudgetExceeded: async (message) => {
      if (now() - sliceStartedAt < sliceMs) {
        return false;
      }

      controlTraceEvents.push(buildOoeTraceEvent({
        ...input.definition,
        jobId: job.jobId,
        inputRevisionId: job.inputRevisionId,
        status: 'slowPhase',
        resultStability: 'draft',
        commitDecision: 'notApplicable',
        message: message ?? `${input.routeLabel} yielded to the event loop after its budget slice.`,
      }));
      await cooperativeYield();
      sliceStartedAt = now();
      return true;
    },
  };

  try {
    hostAdapter = await resolveOoeHostAdapter(input.definition);
    recordRuntimeEvent({
      type: 'ooe.host.selected',
      severity: hostAdapter.kind === 'ready' ? 'debug' : 'warning',
      definition: input.definition,
      job,
      registryId: activeJob.registryId,
      routeLabel: input.routeLabel,
      message: `${input.routeLabel} resolved host ${hostAdapter.hostId}.`,
      payload: summarizeOoeHostAdapterStatus(hostAdapter),
    });
    const status = input.prepareStatus
      ? await input.prepareStatus()
      : await prepareOoePlanPreflight(input.definition) as TStatus;
    recordRuntimeEvent({
      type: status.kind === 'ready' ? 'ooe.preflight.completed' : 'ooe.preflight.failed',
      severity: status.kind === 'ready' ? 'debug' : 'warning',
      definition: input.definition,
      job,
      registryId: activeJob.registryId,
      routeLabel: input.routeLabel,
      message: `${input.routeLabel} preflight ${status.kind}.`,
      payload: eventPayloadForPreflight(status),
    });
    const payload = await input.run(controlContext);
    const jobContext = buildOoeJobCommitContextForJob(job, input.options);
    const metadata = {
      ...input.buildMetadata({
        payload,
        status,
        jobContext,
        controlTraceEvents,
      }),
      hostAdapter,
    };
    const finishedAt = now();
    const cancellation = metadata.completion?.kind === 'cancelled'
      ? metadata.completion
      : undefined;
    const terminalStatus = cancellation
      ? 'cancelled'
      : terminalStatusForAssessment(metadata.commitAssessment);

    if (cancellation) {
      markOoeJobCancelled(activeJob.registryId, {
        requestedBy: 'system',
        reason: cancellation.reason,
        commitAssessment: metadata.commitAssessment,
        traceEvents: metadata.traceEvents,
      });
      recordRuntimeEvent({
        type: 'ooe.job.cancelled',
        severity: 'warning',
        definition: input.definition,
        job,
        registryId: activeJob.registryId,
        routeLabel: input.routeLabel,
        message: cancellation.reason
          ? `${input.routeLabel} job cancelled: ${cancellation.reason}`
          : `${input.routeLabel} job cancelled.`,
        payload: {
          commitDecision: metadata.commitAssessment.commitDecision,
          resultStability: metadata.commitAssessment.resultStability,
        },
      });
    } else {
      completeOoeJob(activeJob, metadata);
      const resultTerminalStatus = terminalStatusForAssessment(metadata.commitAssessment);
      recordRuntimeEvent({
        type: resultEventType(resultTerminalStatus),
        definition: input.definition,
        job,
        registryId: activeJob.registryId,
        routeLabel: input.routeLabel,
        message: `${input.routeLabel} result ${metadata.commitAssessment.commitDecision}.`,
        payload: {
          commitDecision: metadata.commitAssessment.commitDecision,
          resultStability: metadata.commitAssessment.resultStability,
          legality: metadata.commitAssessment.legality,
        },
      });
      recordRuntimeEvent({
        type: 'ooe.job.completed',
        severity: 'debug',
        definition: input.definition,
        job,
        registryId: activeJob.registryId,
        routeLabel: input.routeLabel,
        message: `${input.routeLabel} job completed.`,
        payload: { terminalStatus: resultTerminalStatus },
      });
    }
    recordOoeDiagnostics({
      job: jobContext.job,
      routeLabel: input.routeLabel,
      terminalStatus,
      commitAssessment: metadata.commitAssessment,
      hostAdapter: summarizeOoeHostAdapterStatus(hostAdapter),
      traceEvents: metadata.traceEvents,
      provenance: input.buildProvenance?.({
        payload,
        status,
        jobContext,
        metadata,
        routeSnapshot: input.routeSnapshot,
      }),
      startedAt,
      finishedAt,
    });
    return buildOoeRuntimeEnvelope(payload, metadata);
  } catch (error) {
    const finishedAt = now();
    const jobContext = buildOoeJobCommitContextForJob(job, input.options);
    const assessment = failedCommitAssessment(jobContext);
    const traceEvents = [
      ...controlTraceEvents,
      buildOoeTraceEvent({
        ...input.definition,
        jobId: jobContext.job.jobId,
        inputRevisionId: jobContext.job.inputRevisionId,
        status: 'failed',
        resultStability: 'failed',
        commitDecision: 'notApplicable',
        message: `${input.routeLabel} runtime failed: ${errorMessage(error)}`,
      }),
    ];
    failOoeJob(activeJob, error);
    recordRuntimeEvent({
      type: 'ooe.job.failed',
      severity: 'error',
      definition: input.definition,
      job,
      registryId: activeJob.registryId,
      routeLabel: input.routeLabel,
      message: `${input.routeLabel} runtime failed: ${errorMessage(error)}`,
      payload: { errorMessage: errorMessage(error) },
    });
    recordOoeDiagnostics({
      job: jobContext.job,
      routeLabel: input.routeLabel,
      terminalStatus: 'failed',
      commitAssessment: assessment,
      hostAdapter: hostAdapter
        ? summarizeOoeHostAdapterStatus(hostAdapter)
        : undefined,
      traceEvents,
      provenance: input.buildFailureProvenance?.({
        error,
        jobContext,
        routeSnapshot: input.routeSnapshot,
      }),
      startedAt,
      finishedAt,
      errorMessage: errorMessage(error),
    });
    throw error;
  }
}
