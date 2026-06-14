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

export async function runOoeRuntimeJob<
  TPayload,
  TDefinition extends OoePilotDefinition,
  TStatus extends OoePilotStatus<TDefinition['planId']>,
  TMetadata extends OoeRuntimeMetadata<TDefinition, TStatus>,
>(
  input: RunOoeRuntimeJobInput<TPayload, TDefinition, TStatus, TMetadata>,
): Promise<OoeRuntimeEnvelope<TPayload, TMetadata>> {
  const job = buildOoeJobIdentity(input.definition, input.routeSnapshot);
  const startedAt = now();
  const activeJob = startOoeJob({
    job,
    routeLabel: input.routeLabel,
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
    const status = input.prepareStatus
      ? await input.prepareStatus()
      : await prepareOoePlanPreflight(input.definition) as TStatus;
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
    } else {
      completeOoeJob(activeJob, metadata);
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
