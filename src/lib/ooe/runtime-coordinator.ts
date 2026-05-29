import {
  completeOoeJob,
  failOoeJob,
  startOoeJob,
} from './active-job-registry';
import {
  buildOoeJobCommitContextForJob,
  buildOoeJobIdentity,
  type OoeJobCommitContext,
  type OoeJobContextOptions,
} from './job-contract';
import {
  recordOoeDiagnostics,
  type OoeDiagnosticsProvenance,
  type OoeDiagnosticsTerminalStatus,
} from './diagnostics-buffer';
import {
  resolveOoeHostAdapter,
  summarizeOoeHostAdapterStatus,
  type OoeHostAdapterStatus,
} from './host-adapter';
import type { OoeCommitAssessment } from './ooe-bridge';
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
  prepareStatus?: () => Promise<TStatus>;
  run: () => TPayload | Promise<TPayload>;
  buildMetadata: (input: {
    payload: TPayload;
    status: TStatus;
    jobContext: OoeJobCommitContext;
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

function now() {
  return Date.now();
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function terminalStatusForAssessment(
  assessment: OoeCommitAssessment,
): Exclude<OoeDiagnosticsTerminalStatus, 'failed'> {
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

  try {
    hostAdapter = await resolveOoeHostAdapter(input.definition);
    const status = input.prepareStatus
      ? await input.prepareStatus()
      : await prepareOoePlanPreflight(input.definition) as TStatus;
    const payload = await input.run();
    const jobContext = buildOoeJobCommitContextForJob(job, input.options);
    const metadata = {
      ...input.buildMetadata({ payload, status, jobContext }),
      hostAdapter,
    };
    const finishedAt = now();

    completeOoeJob(activeJob, metadata);
    recordOoeDiagnostics({
      job: jobContext.job,
      routeLabel: input.routeLabel,
      terminalStatus: terminalStatusForAssessment(metadata.commitAssessment),
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
