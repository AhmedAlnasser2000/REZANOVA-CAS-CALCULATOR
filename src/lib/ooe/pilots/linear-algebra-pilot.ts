import type { DisplayOutcome } from '../../../types/calculator';
import { summarizeDisplayOutcome } from '../diagnostics-buffer';
import {
  buildOoeJobCommitContext,
  type OoeJobCommitContext,
  type OoeJobContextOptions,
} from '../job-launch/job-contract';
import type { OoeTraceEvent } from '../ooe-bridge';
import {
  runOoeRuntimeJob,
  type OoeRuntimeControlContext,
} from '../runtime-control/runtime-coordinator';
import {
  buildCoarseLifecycleOoeTraceEvents,
  prepareOoePlanPreflight,
  type OoePilotStatus,
  type OoeRuntimeEnvelope,
  type OoeRuntimeMetadata,
} from '../runtime-control/runtime-envelope';
import { buildOoeTraceEvent } from '../runtime-control/trace';
import {
  buildOoeRuntimeShellEvidence,
  type OoeRuntimeShellEvidence,
} from '../runtime-control/runtime-shell-contract';

export type LinearAlgebraRuntimeKind = 'matrix' | 'vector';

export const OOE_LINEAR_ALGEBRA_WORKER_HOST_ID = 'linear-algebra-worker-runtime' as const;
export const OOE_LINEAR_ALGEBRA_FALLBACK_HOST_ID = 'linear-algebra-runtime' as const;

const LINEAR_ALGEBRA_DEFINITIONS = {
  matrix: {
    planId: 'plan.linearAlgebra.matrix',
    capabilityId: 'linearAlgebra.matrix',
    hostId: OOE_LINEAR_ALGEBRA_WORKER_HOST_ID,
    nodeId: 'node.linearAlgebra.matrix',
    phaseId: 'linearAlgebra.matrix',
  },
  vector: {
    planId: 'plan.linearAlgebra.vector',
    capabilityId: 'linearAlgebra.vector',
    hostId: OOE_LINEAR_ALGEBRA_WORKER_HOST_ID,
    nodeId: 'node.linearAlgebra.vector',
    phaseId: 'linearAlgebra.vector',
  },
} as const;

type LinearAlgebraPilotDefinition =
  | typeof LINEAR_ALGEBRA_DEFINITIONS.matrix
  | typeof LINEAR_ALGEBRA_DEFINITIONS.vector;

type LinearAlgebraRouteSnapshot = {
  kind: LinearAlgebraRuntimeKind;
  request?: {
    operation?: string;
    rowsA?: number;
    rowsB?: number;
    lengthA?: number;
    lengthB?: number;
    angleUnit?: string;
  };
};

export type LinearAlgebraOoePilotStatus = OoePilotStatus<LinearAlgebraPilotDefinition['planId']>;

export type LinearAlgebraHostExecution =
  | {
      kind: 'worker';
      hostId: typeof OOE_LINEAR_ALGEBRA_WORKER_HOST_ID;
      isolated: true;
      terminalStatus: 'completed';
    }
  | {
      kind: 'worker-cancelled';
      hostId: typeof OOE_LINEAR_ALGEBRA_WORKER_HOST_ID;
      isolated: true;
      terminalStatus: 'cancelled';
      termination: 'hardStop';
      reason?: string;
    }
  | {
      kind: 'fallback';
      hostId: typeof OOE_LINEAR_ALGEBRA_FALLBACK_HOST_ID;
      isolated: false;
      terminalStatus: 'fallback';
      fallbackFromHostId: typeof OOE_LINEAR_ALGEBRA_WORKER_HOST_ID;
      reason: string;
    };

export type LinearAlgebraOoePilotMetadata = OoeRuntimeMetadata<
  LinearAlgebraPilotDefinition,
  LinearAlgebraOoePilotStatus
> & {
  linearAlgebraHostExecution?: LinearAlgebraHostExecution;
  runtimeShell?: OoeRuntimeShellEvidence;
};

export type LinearAlgebraOoePilotRunResult<TPayload> = OoeRuntimeEnvelope<
  TPayload,
  LinearAlgebraOoePilotMetadata
>;

export function linearAlgebraPilotDefinition(kind: LinearAlgebraRuntimeKind): LinearAlgebraPilotDefinition {
  return LINEAR_ALGEBRA_DEFINITIONS[kind];
}

export async function prepareLinearAlgebraOoePilot(
  kind: LinearAlgebraRuntimeKind,
): Promise<LinearAlgebraOoePilotStatus> {
  return prepareOoePlanPreflight(linearAlgebraPilotDefinition(kind));
}

function traceMessageForStatus(status: LinearAlgebraOoePilotStatus, kind: LinearAlgebraRuntimeKind) {
  switch (status.kind) {
    case 'ready':
      return `OOE Linear Algebra ${kind} plan is available and valid.`;
    case 'unavailable':
      return `OOE bridge unavailable: ${status.reason}.`;
    case 'missing-plan':
      return `OOE Linear Algebra ${kind} plan was not found.`;
    case 'invalid-plan':
      return `OOE Linear Algebra ${kind} plan failed validation with ${status.errors.length} error(s).`;
    case 'bridge-error':
      return `OOE bridge error: ${status.message}`;
  }
}

function buildLinearAlgebraTraceEvents(
  kind: LinearAlgebraRuntimeKind,
  status: LinearAlgebraOoePilotStatus,
  jobContext: ReturnType<typeof buildOoeJobCommitContext>,
  controlTraceEvents: readonly OoeTraceEvent[] = [],
  hostExecution?: LinearAlgebraHostExecution,
): OoeTraceEvent[] {
  const definition = linearAlgebraPilotDefinition(kind);
  const cancelled = hostExecution?.terminalStatus === 'cancelled';
  const baseEvents = buildCoarseLifecycleOoeTraceEvents({
    definition,
    status,
    job: jobContext.job,
    commitAssessment: jobContext.commitAssessment,
    preflightMessage: traceMessageForStatus(status, kind),
    startedMessage: `Linear Algebra ${kind} started through the isolated worker runtime shell.`,
    finalMessage: `Linear Algebra ${kind} pilot produced a stable DisplayOutcome.`,
  });
  const hostEvent = hostExecution
    ? buildOoeTraceEvent({
        ...definition,
        hostId: hostExecution.hostId,
        jobId: jobContext.job.jobId,
        inputRevisionId: jobContext.job.inputRevisionId,
        status: hostExecution.terminalStatus === 'cancelled' ? 'cancelled' : 'provisionalReady',
        resultStability: hostExecution.terminalStatus === 'cancelled' ? 'stale' : 'provisional',
        commitDecision: 'notApplicable',
        message: hostExecution.kind === 'fallback'
          ? `Linear Algebra worker runtime fell back from ${hostExecution.fallbackFromHostId} to ${hostExecution.hostId}: ${hostExecution.reason}.`
          : hostExecution.kind === 'worker-cancelled'
            ? `Linear Algebra worker runtime ${hostExecution.hostId} was hard-stopped.`
            : `Linear Algebra worker runtime ran on ${hostExecution.hostId}.`,
      })
    : null;

  if (!cancelled) {
    return [
      baseEvents[0],
      baseEvents[1],
      ...controlTraceEvents,
      ...(hostEvent ? [hostEvent] : []),
      baseEvents[2],
    ];
  }

  return [
    baseEvents[0],
    baseEvents[1],
    ...controlTraceEvents,
    ...(hostEvent ? [hostEvent] : []),
    buildOoeTraceEvent({
      ...definition,
      jobId: jobContext.job.jobId,
      inputRevisionId: jobContext.job.inputRevisionId,
      status: 'cancelled',
      resultStability: 'stale',
      commitDecision: 'notApplicable',
      message: hostExecution?.reason ?? `Linear Algebra ${kind} stopped before it finished.`,
    }),
  ];
}

export function buildLinearAlgebraOoePilotMetadata(
  kind: LinearAlgebraRuntimeKind,
  status: LinearAlgebraOoePilotStatus,
  routeSnapshot: unknown = { capabilityId: linearAlgebraPilotDefinition(kind).capabilityId },
  options?: OoeJobContextOptions,
  jobContext: OoeJobCommitContext = buildOoeJobCommitContext(
    linearAlgebraPilotDefinition(kind),
    routeSnapshot,
    options,
  ),
  controlTraceEvents: readonly OoeTraceEvent[] = [],
  hostExecution?: LinearAlgebraHostExecution,
): LinearAlgebraOoePilotMetadata {
  const definition = linearAlgebraPilotDefinition(kind);
  const cancelled = hostExecution?.terminalStatus === 'cancelled';
  const commitAssessment = cancelled
    ? {
        ...jobContext.commitAssessment,
        legality: 'notApplicable' as const,
        commitDecision: 'notApplicable' as const,
        resultStability: 'stale' as const,
      }
    : jobContext.commitAssessment;
  const runtimeShell = buildOoeRuntimeShellEvidence({
    shellId: 'linear-algebra-worker-shell',
    capabilityId: definition.capabilityId,
    primaryHostId: OOE_LINEAR_ALGEBRA_WORKER_HOST_ID,
    fallbackHostId: OOE_LINEAR_ALGEBRA_FALLBACK_HOST_ID,
    lifecycle: cancelled ? 'cancelled' : 'completed',
    hostExecution,
    launchTicket: options?.launchTicket,
  });

  return {
    ...definition,
    status,
    job: jobContext.job,
    completion: cancelled
      ? {
          kind: 'cancelled',
          reason: hostExecution?.reason ?? `Linear Algebra ${kind} stopped before it finished.`,
        }
      : undefined,
    commitAssessment,
    linearAlgebraHostExecution: hostExecution,
    runtimeShell,
    traceEvents: buildLinearAlgebraTraceEvents(
      kind,
      status,
      {
        ...jobContext,
        commitAssessment,
      },
      controlTraceEvents,
      hostExecution,
    ),
  };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function runLinearAlgebraWithOoePilot<TPayload>(
  kind: LinearAlgebraRuntimeKind,
  run: (context: OoeRuntimeControlContext) => TPayload | Promise<TPayload>,
  routeSnapshot: unknown = { capabilityId: linearAlgebraPilotDefinition(kind).capabilityId },
  options?: OoeJobContextOptions,
  getHostExecution?: () => LinearAlgebraHostExecution | undefined,
): Promise<LinearAlgebraOoePilotRunResult<TPayload>> {
  const definition = linearAlgebraPilotDefinition(kind);
  return runOoeRuntimeJob({
    definition,
    routeLabel: definition.capabilityId,
    routeSnapshot,
    options,
    prepareStatus: () => prepareLinearAlgebraOoePilot(kind),
    run,
    buildMetadata: ({ status, jobContext, controlTraceEvents }) => buildLinearAlgebraOoePilotMetadata(
      kind,
      status,
      routeSnapshot,
      options,
      jobContext,
      controlTraceEvents,
      getHostExecution?.(),
    ),
    buildProvenance: ({ payload, metadata, routeSnapshot }) => {
      const snapshot = routeSnapshot as LinearAlgebraRouteSnapshot;
      return {
        depth: 'coarse',
        mode: snapshot.kind,
        route: definition.capabilityId,
        screen: snapshot.kind,
        action: snapshot.request?.operation,
        inputSummary: snapshot.request,
        outputSummary: summarizeDisplayOutcome(payload as DisplayOutcome),
        runtimeHost: metadata.linearAlgebraHostExecution?.hostId ?? metadata.hostId,
        runtimeShell: metadata.runtimeShell,
        commitDecision: metadata.commitAssessment.commitDecision,
        linearAlgebra: {
          kind: snapshot.kind,
          operation: snapshot.request?.operation,
          hostExecution: metadata.linearAlgebraHostExecution,
        },
      };
    },
    buildFailureProvenance: ({ error, routeSnapshot }) => {
      const snapshot = routeSnapshot as LinearAlgebraRouteSnapshot;
      return {
        depth: 'coarse',
        mode: snapshot.kind,
        route: definition.capabilityId,
        screen: snapshot.kind,
        action: snapshot.request?.operation,
        inputSummary: snapshot.request,
        runtimeHost: OOE_LINEAR_ALGEBRA_WORKER_HOST_ID,
        commitDecision: 'notApplicable',
        notes: [`Linear Algebra runtime failed: ${errorMessage(error)}`],
      };
    },
  });
}
