import type { CanonicalRuntimeOutcome } from '../../../types/calculator';
import { summarizeCanonicalRuntimeOutcome } from '../diagnostics/diagnostics-buffer';
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
import type { OoeTraceEvent } from '../bridge-schema/ooe-bridge';

type GeometryRouteRequestSnapshot = {
  inputLatex?: string;
  screenHint?: string;
};

export const OOE_GEOMETRY_EVALUATE_PLAN_ID = 'plan.geometry.evaluate' as const;
export const OOE_GEOMETRY_EVALUATE_CAPABILITY_ID = 'geometry.evaluate' as const;
export const OOE_GEOMETRY_EVALUATE_HOST_ID = 'geometry-worker-runtime' as const;
export const OOE_GEOMETRY_EVALUATE_FALLBACK_HOST_ID = 'geometry-runtime' as const;
export const OOE_GEOMETRY_EVALUATE_NODE_ID = 'node.geometry.evaluate' as const;
export const OOE_GEOMETRY_EVALUATE_PHASE_ID = 'geometry.evaluate' as const;

type GeometryPilotDefinition = {
  planId: typeof OOE_GEOMETRY_EVALUATE_PLAN_ID;
  capabilityId: typeof OOE_GEOMETRY_EVALUATE_CAPABILITY_ID;
  hostId: typeof OOE_GEOMETRY_EVALUATE_HOST_ID;
  nodeId: typeof OOE_GEOMETRY_EVALUATE_NODE_ID;
  phaseId: typeof OOE_GEOMETRY_EVALUATE_PHASE_ID;
};

export type GeometryOoePilotStatus = OoePilotStatus<typeof OOE_GEOMETRY_EVALUATE_PLAN_ID>;

export type GeometryHostExecution =
  | {
      kind: 'worker';
      hostId: typeof OOE_GEOMETRY_EVALUATE_HOST_ID;
      isolated: true;
      terminalStatus: 'completed';
    }
  | {
      kind: 'worker-cancelled';
      hostId: typeof OOE_GEOMETRY_EVALUATE_HOST_ID;
      isolated: true;
      terminalStatus: 'cancelled';
      termination: 'hardStop';
      reason?: string;
    }
  | {
      kind: 'fallback';
      hostId: typeof OOE_GEOMETRY_EVALUATE_FALLBACK_HOST_ID;
      isolated: false;
      terminalStatus: 'fallback';
      fallbackFromHostId: typeof OOE_GEOMETRY_EVALUATE_HOST_ID;
      reason: string;
    };

export type GeometryOoePilotMetadata = OoeRuntimeMetadata<
  GeometryPilotDefinition,
  GeometryOoePilotStatus
> & {
  geometryHostExecution?: GeometryHostExecution;
  runtimeShell?: OoeRuntimeShellEvidence;
};

export type GeometryOoePilotRunResult<TPayload> = OoeRuntimeEnvelope<
  TPayload,
  GeometryOoePilotMetadata
>;

export function geometryPilotDefinition(): GeometryPilotDefinition {
  return {
    planId: OOE_GEOMETRY_EVALUATE_PLAN_ID,
    capabilityId: OOE_GEOMETRY_EVALUATE_CAPABILITY_ID,
    hostId: OOE_GEOMETRY_EVALUATE_HOST_ID,
    nodeId: OOE_GEOMETRY_EVALUATE_NODE_ID,
    phaseId: OOE_GEOMETRY_EVALUATE_PHASE_ID,
  };
}

export async function prepareGeometryOoePilot(): Promise<GeometryOoePilotStatus> {
  return prepareOoePlanPreflight(geometryPilotDefinition());
}

function traceMessageForStatus(status: GeometryOoePilotStatus) {
  switch (status.kind) {
    case 'ready':
      return 'OOE Geometry evaluate plan is available and valid.';
    case 'unavailable':
      return `OOE bridge unavailable: ${status.reason}.`;
    case 'missing-plan':
      return 'OOE Geometry evaluate plan was not found.';
    case 'invalid-plan':
      return `OOE Geometry evaluate plan failed validation with ${status.errors.length} error(s).`;
    case 'bridge-error':
      return `OOE bridge error: ${status.message}`;
  }
}

function buildGeometryOoeTraceEvents(
  status: GeometryOoePilotStatus,
  jobContext: ReturnType<typeof buildOoeJobCommitContext>,
  controlTraceEvents: readonly OoeTraceEvent[] = [],
  hostExecution?: GeometryHostExecution,
): OoeTraceEvent[] {
  const definition = geometryPilotDefinition();
  const cancelled = hostExecution?.terminalStatus === 'cancelled';
  const baseEvents = buildCoarseLifecycleOoeTraceEvents({
    definition,
    status,
    job: jobContext.job,
    commitAssessment: jobContext.commitAssessment,
    preflightMessage: traceMessageForStatus(status),
    startedMessage: 'Geometry evaluation started through the isolated Geometry runtime shell.',
    finalMessage: 'Geometry evaluation pilot produced a stable CanonicalRuntimeOutcome.',
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
          ? `Geometry worker runtime fell back from ${hostExecution.fallbackFromHostId} to ${hostExecution.hostId}: ${hostExecution.reason}.`
          : hostExecution.kind === 'worker-cancelled'
            ? `Geometry worker runtime ${hostExecution.hostId} was hard-stopped.`
            : `Geometry worker runtime ran on ${hostExecution.hostId}.`,
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
      message: hostExecution?.reason ?? 'Geometry evaluation stopped before it finished.',
    }),
  ];
}

export function buildGeometryOoePilotMetadata(
  status: GeometryOoePilotStatus,
  routeSnapshot: unknown = { capabilityId: OOE_GEOMETRY_EVALUATE_CAPABILITY_ID },
  options?: OoeJobContextOptions,
  jobContext: OoeJobCommitContext = buildOoeJobCommitContext(
    geometryPilotDefinition(),
    routeSnapshot,
    options,
  ),
  controlTraceEvents: readonly OoeTraceEvent[] = [],
  hostExecution?: GeometryHostExecution,
): GeometryOoePilotMetadata {
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
    shellId: 'geometry-worker-shell',
    capabilityId: OOE_GEOMETRY_EVALUATE_CAPABILITY_ID,
    primaryHostId: OOE_GEOMETRY_EVALUATE_HOST_ID,
    fallbackHostId: OOE_GEOMETRY_EVALUATE_FALLBACK_HOST_ID,
    lifecycle: cancelled ? 'cancelled' : 'completed',
    hostExecution,
    launchTicket: options?.launchTicket,
  });

  return {
    ...geometryPilotDefinition(),
    status,
    job: jobContext.job,
    completion: cancelled
      ? {
          kind: 'cancelled',
          reason: hostExecution?.reason ?? 'Geometry evaluation stopped before it finished.',
        }
      : undefined,
    commitAssessment,
    geometryHostExecution: hostExecution,
    runtimeShell,
    traceEvents: buildGeometryOoeTraceEvents(
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

export async function runGeometryWithOoePilot<TPayload>(
  run: (context: OoeRuntimeControlContext) => TPayload | Promise<TPayload>,
  routeSnapshot: unknown = { capabilityId: OOE_GEOMETRY_EVALUATE_CAPABILITY_ID },
  options?: OoeJobContextOptions,
  getHostExecution?: () => GeometryHostExecution | undefined,
  resolveCanonicalOutcome?: (payload: TPayload) => CanonicalRuntimeOutcome,
): Promise<GeometryOoePilotRunResult<TPayload>> {
  const definition = geometryPilotDefinition();
  return runOoeRuntimeJob({
    definition,
    routeLabel: OOE_GEOMETRY_EVALUATE_CAPABILITY_ID,
    routeSnapshot,
    options,
    prepareStatus: prepareGeometryOoePilot,
    run,
    buildMetadata: ({ status, jobContext, controlTraceEvents }) => buildGeometryOoePilotMetadata(
      status,
      routeSnapshot,
      options,
      jobContext,
      controlTraceEvents,
      getHostExecution?.(),
    ),
    buildProvenance: ({ payload, metadata, routeSnapshot }) => {
      const snapshot = routeSnapshot as {
        request?: GeometryRouteRequestSnapshot;
      };
      const output = resolveCanonicalOutcome
        ? resolveCanonicalOutcome(payload)
        : (payload as { outcome?: CanonicalRuntimeOutcome }).outcome ?? payload as CanonicalRuntimeOutcome;
      return {
        depth: 'coarse',
        mode: 'geometry',
        route: OOE_GEOMETRY_EVALUATE_CAPABILITY_ID,
        screen: snapshot.request?.screenHint,
        action: 'evaluate',
        inputSummary: {
          screen: snapshot.request?.screenHint,
          latexLength: snapshot.request?.inputLatex?.length,
        },
        outputSummary: summarizeCanonicalRuntimeOutcome(output),
        runtimeHost: metadata.geometryHostExecution?.hostId ?? metadata.hostId,
        runtimeShell: metadata.runtimeShell,
        commitDecision: metadata.commitAssessment.commitDecision,
        geometry: {
          screen: snapshot.request?.screenHint,
          hostExecution: metadata.geometryHostExecution,
        },
      };
    },
    buildFailureProvenance: ({ error, routeSnapshot }) => {
      const snapshot = routeSnapshot as {
        request?: GeometryRouteRequestSnapshot;
      };
      return {
        depth: 'coarse',
        mode: 'geometry',
        route: OOE_GEOMETRY_EVALUATE_CAPABILITY_ID,
        screen: snapshot.request?.screenHint,
        action: 'evaluate',
        inputSummary: {
          screen: snapshot.request?.screenHint,
          latexLength: snapshot.request?.inputLatex?.length,
        },
        runtimeHost: OOE_GEOMETRY_EVALUATE_HOST_ID,
        commitDecision: 'notApplicable',
        notes: [`Geometry runtime failed: ${errorMessage(error)}`],
      };
    },
  });
}
