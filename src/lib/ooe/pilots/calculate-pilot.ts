import type { DisplayOutcome } from '../../../types/calculator';
import { summarizeDisplayOutcome } from '../diagnostics-buffer';
import {
  buildOoeJobCommitContext,
  type OoeJobCommitContext,
  type OoeJobContextOptions,
} from '../job-launch/job-contract';
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
import type { OoeTraceEvent } from '../ooe-bridge';

export type CalculateOoeCapabilityId =
  | 'expression.evaluate'
  | 'expression.simplify'
  | 'expression.factor'
  | 'expression.expand'
  | 'calculate.algebraTransform'
  | 'calculate.workbench';

export const OOE_CALCULATE_WORKER_HOST_ID = 'calculate-worker-runtime' as const;
export const OOE_CALCULATE_FALLBACK_HOST_ID = 'calculate-runtime' as const;

type CalculateRuntimeRouteSnapshot = {
  kind?: string;
  request?: {
    request?: {
      action?: string;
      latex?: string;
      calculateScreen?: string;
    };
  };
};

function routeSnapshotInput(routeSnapshot: unknown) {
  const snapshot = routeSnapshot as CalculateRuntimeRouteSnapshot;
  return snapshot.request?.request;
}

type CalculatePilotDefinition = {
  planId: string;
  capabilityId: CalculateOoeCapabilityId;
  hostId: typeof OOE_CALCULATE_WORKER_HOST_ID;
  nodeId: string;
  phaseId: CalculateOoeCapabilityId;
};

export type CalculateOoePilotStatus = OoePilotStatus<string>;

export type CalculateHostExecution =
  | {
      kind: 'worker';
      hostId: typeof OOE_CALCULATE_WORKER_HOST_ID;
      isolated: true;
      terminalStatus: 'completed';
    }
  | {
      kind: 'worker-cancelled';
      hostId: typeof OOE_CALCULATE_WORKER_HOST_ID;
      isolated: true;
      terminalStatus: 'cancelled';
      termination: 'hardStop';
      reason?: string;
    }
  | {
      kind: 'fallback';
      hostId: typeof OOE_CALCULATE_FALLBACK_HOST_ID;
      isolated: false;
      terminalStatus: 'fallback';
      fallbackFromHostId: typeof OOE_CALCULATE_WORKER_HOST_ID;
      reason: string;
    };

export type CalculateOoePilotMetadata = OoeRuntimeMetadata<
  CalculatePilotDefinition,
  CalculateOoePilotStatus
> & {
  calculateHostExecution?: CalculateHostExecution;
  runtimeShell?: OoeRuntimeShellEvidence;
};

export type CalculateOoePilotRunResult<TPayload> = OoeRuntimeEnvelope<
  TPayload,
  CalculateOoePilotMetadata
>;

export function calculatePilotDefinition(
  capabilityId: CalculateOoeCapabilityId,
): CalculatePilotDefinition {
  return {
    planId: `plan.${capabilityId}`,
    capabilityId,
    hostId: OOE_CALCULATE_WORKER_HOST_ID,
    nodeId: `node.${capabilityId}`,
    phaseId: capabilityId,
  };
}

export async function prepareCalculateOoePilot(
  capabilityId: CalculateOoeCapabilityId,
): Promise<CalculateOoePilotStatus> {
  return prepareOoePlanPreflight(calculatePilotDefinition(capabilityId));
}

function traceMessageForStatus(status: CalculateOoePilotStatus) {
  switch (status.kind) {
    case 'ready':
      return 'OOE Calculate plan is available and valid.';
    case 'unavailable':
      return `OOE bridge unavailable: ${status.reason}.`;
    case 'missing-plan':
      return 'OOE Calculate plan was not found.';
    case 'invalid-plan':
      return `OOE Calculate plan failed validation with ${status.errors.length} error(s).`;
    case 'bridge-error':
      return `OOE bridge error: ${status.message}`;
  }
}

function buildCalculateOoeTraceEvents(
  definition: CalculatePilotDefinition,
  status: CalculateOoePilotStatus,
  jobContext: OoeJobCommitContext,
  controlTraceEvents: readonly OoeTraceEvent[] = [],
  hostExecution?: CalculateHostExecution,
): OoeTraceEvent[] {
  const cancelled = hostExecution?.terminalStatus === 'cancelled';
  const baseEvents = buildCoarseLifecycleOoeTraceEvents({
    definition,
    status,
    job: jobContext.job,
    commitAssessment: jobContext.commitAssessment,
    preflightMessage: traceMessageForStatus(status),
    startedMessage: 'Calculate started through the isolated Calculate runtime shell.',
    finalMessage: 'Calculate runtime shell produced a stable DisplayOutcome.',
  });
  const hostEvent = hostExecution
    ? buildOoeTraceEvent({
        ...definition,
        hostId: hostExecution.hostId,
        jobId: jobContext.job.jobId,
        inputRevisionId: jobContext.job.inputRevisionId,
        status: hostExecution.terminalStatus === 'cancelled'
          ? 'cancelled'
          : hostExecution.kind === 'fallback'
            ? 'provisionalReady'
            : 'provisionalReady',
        resultStability: hostExecution.terminalStatus === 'cancelled' ? 'stale' : 'provisional',
        commitDecision: 'notApplicable',
        message: hostExecution.kind === 'fallback'
          ? `Calculate worker runtime fell back from ${hostExecution.fallbackFromHostId} to ${hostExecution.hostId}: ${hostExecution.reason}.`
          : hostExecution.kind === 'worker-cancelled'
            ? `Calculate worker runtime ${hostExecution.hostId} was hard-stopped.`
            : `Calculate worker runtime ran on ${hostExecution.hostId}.`,
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
      message: hostExecution?.reason ?? 'Calculate stopped before it finished.',
    }),
  ];
}

export function buildCalculateOoePilotMetadata(
  capabilityId: CalculateOoeCapabilityId,
  status: CalculateOoePilotStatus,
  routeSnapshot: unknown = { capabilityId },
  options?: OoeJobContextOptions,
  jobContext: OoeJobCommitContext = buildOoeJobCommitContext(
    calculatePilotDefinition(capabilityId),
    routeSnapshot,
    options,
  ),
  controlTraceEvents: readonly OoeTraceEvent[] = [],
  hostExecution?: CalculateHostExecution,
): CalculateOoePilotMetadata {
  const definition = calculatePilotDefinition(capabilityId);
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
    shellId: 'calculate-worker-shell',
    capabilityId,
    primaryHostId: OOE_CALCULATE_WORKER_HOST_ID,
    fallbackHostId: OOE_CALCULATE_FALLBACK_HOST_ID,
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
          reason: hostExecution?.reason ?? 'Calculate stopped before it finished.',
        }
      : undefined,
    commitAssessment,
    calculateHostExecution: hostExecution,
    runtimeShell,
    traceEvents: buildCalculateOoeTraceEvents(
      definition,
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

export async function runCalculateWithOoePilot<TPayload>(
  capabilityId: CalculateOoeCapabilityId,
  run: (context: OoeRuntimeControlContext) => TPayload | Promise<TPayload>,
  routeSnapshot: unknown = { capabilityId },
  options?: OoeJobContextOptions,
  getHostExecution?: () => CalculateHostExecution | undefined,
): Promise<CalculateOoePilotRunResult<TPayload>> {
  const definition = calculatePilotDefinition(capabilityId);
  return runOoeRuntimeJob({
    definition,
    routeLabel: capabilityId,
    routeSnapshot,
    options,
    prepareStatus: () => prepareCalculateOoePilot(capabilityId),
    run,
    buildMetadata: ({ status, jobContext, controlTraceEvents }) => buildCalculateOoePilotMetadata(
      capabilityId,
      status,
      routeSnapshot,
      options,
      jobContext,
      controlTraceEvents,
      getHostExecution?.(),
    ),
    buildProvenance: ({ payload, metadata, routeSnapshot }) => {
      const snapshot = routeSnapshot as CalculateRuntimeRouteSnapshot;
      const input = routeSnapshotInput(routeSnapshot);
      const output = payload as DisplayOutcome;
      return {
        depth: 'coarse',
        mode: 'calculate',
        route: capabilityId,
        screen: input?.calculateScreen,
        action: input?.action,
        inputSummary: {
          kind: snapshot.kind,
          action: input?.action,
          screen: input?.calculateScreen,
          latexLength: input?.latex?.length,
        },
        outputSummary: summarizeDisplayOutcome(output),
        runtimeHost: metadata.calculateHostExecution?.hostId ?? metadata.hostId,
        runtimeShell: metadata.runtimeShell,
        commitDecision: metadata.commitAssessment.commitDecision,
        calculate: {
          kind: snapshot.kind,
          capabilityId,
          hostExecution: metadata.calculateHostExecution,
        },
      };
    },
    buildFailureProvenance: ({ error, routeSnapshot }) => {
      const snapshot = routeSnapshot as CalculateRuntimeRouteSnapshot;
      const input = routeSnapshotInput(routeSnapshot);
      return {
        depth: 'coarse',
        mode: 'calculate',
        route: capabilityId,
        screen: input?.calculateScreen,
        action: input?.action,
        inputSummary: {
          kind: snapshot.kind,
          action: input?.action,
          screen: input?.calculateScreen,
          latexLength: input?.latex?.length,
        },
        runtimeHost: OOE_CALCULATE_WORKER_HOST_ID,
        commitDecision: 'notApplicable',
        notes: [`Calculate runtime failed: ${errorMessage(error)}`],
      };
    },
  });
}
