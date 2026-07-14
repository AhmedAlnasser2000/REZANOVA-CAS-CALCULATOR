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

type TrigonometryRouteRequestSnapshot = {
  inputLatex?: string;
  screenHint?: string;
  angleUnit?: string;
  identityTargetForm?: string;
};

export const OOE_TRIGONOMETRY_EVALUATE_PLAN_ID = 'plan.trigonometry.evaluate' as const;
export const OOE_TRIGONOMETRY_EVALUATE_CAPABILITY_ID = 'trigonometry.evaluate' as const;
export const OOE_TRIGONOMETRY_EVALUATE_HOST_ID = 'trigonometry-worker-runtime' as const;
export const OOE_TRIGONOMETRY_EVALUATE_FALLBACK_HOST_ID = 'trigonometry-runtime' as const;
export const OOE_TRIGONOMETRY_EVALUATE_NODE_ID = 'node.trigonometry.evaluate' as const;
export const OOE_TRIGONOMETRY_EVALUATE_PHASE_ID = 'trigonometry.evaluate' as const;

type TrigonometryPilotDefinition = {
  planId: typeof OOE_TRIGONOMETRY_EVALUATE_PLAN_ID;
  capabilityId: typeof OOE_TRIGONOMETRY_EVALUATE_CAPABILITY_ID;
  hostId: typeof OOE_TRIGONOMETRY_EVALUATE_HOST_ID;
  nodeId: typeof OOE_TRIGONOMETRY_EVALUATE_NODE_ID;
  phaseId: typeof OOE_TRIGONOMETRY_EVALUATE_PHASE_ID;
};

export type TrigonometryOoePilotStatus = OoePilotStatus<typeof OOE_TRIGONOMETRY_EVALUATE_PLAN_ID>;

export type TrigonometryHostExecution =
  | {
      kind: 'worker';
      hostId: typeof OOE_TRIGONOMETRY_EVALUATE_HOST_ID;
      isolated: true;
      terminalStatus: 'completed';
    }
  | {
      kind: 'worker-cancelled';
      hostId: typeof OOE_TRIGONOMETRY_EVALUATE_HOST_ID;
      isolated: true;
      terminalStatus: 'cancelled';
      termination: 'hardStop';
      reason?: string;
    }
  | {
      kind: 'fallback';
      hostId: typeof OOE_TRIGONOMETRY_EVALUATE_FALLBACK_HOST_ID;
      isolated: false;
      terminalStatus: 'fallback';
      fallbackFromHostId: typeof OOE_TRIGONOMETRY_EVALUATE_HOST_ID;
      reason: string;
    };

export type TrigonometryOoePilotMetadata = OoeRuntimeMetadata<
  TrigonometryPilotDefinition,
  TrigonometryOoePilotStatus
> & {
  trigonometryHostExecution?: TrigonometryHostExecution;
  runtimeShell?: OoeRuntimeShellEvidence;
};

export type TrigonometryOoePilotRunResult<TPayload> = OoeRuntimeEnvelope<
  TPayload,
  TrigonometryOoePilotMetadata
>;

export function trigonometryPilotDefinition(): TrigonometryPilotDefinition {
  return {
    planId: OOE_TRIGONOMETRY_EVALUATE_PLAN_ID,
    capabilityId: OOE_TRIGONOMETRY_EVALUATE_CAPABILITY_ID,
    hostId: OOE_TRIGONOMETRY_EVALUATE_HOST_ID,
    nodeId: OOE_TRIGONOMETRY_EVALUATE_NODE_ID,
    phaseId: OOE_TRIGONOMETRY_EVALUATE_PHASE_ID,
  };
}

export async function prepareTrigonometryOoePilot(): Promise<TrigonometryOoePilotStatus> {
  return prepareOoePlanPreflight(trigonometryPilotDefinition());
}

function traceMessageForStatus(status: TrigonometryOoePilotStatus) {
  switch (status.kind) {
    case 'ready':
      return 'OOE Trigonometry evaluate plan is available and valid.';
    case 'unavailable':
      return `OOE bridge unavailable: ${status.reason}.`;
    case 'missing-plan':
      return 'OOE Trigonometry evaluate plan was not found.';
    case 'invalid-plan':
      return `OOE Trigonometry evaluate plan failed validation with ${status.errors.length} error(s).`;
    case 'bridge-error':
      return `OOE bridge error: ${status.message}`;
  }
}

function buildTrigonometryOoeTraceEvents(
  status: TrigonometryOoePilotStatus,
  jobContext: ReturnType<typeof buildOoeJobCommitContext>,
  controlTraceEvents: readonly OoeTraceEvent[] = [],
  hostExecution?: TrigonometryHostExecution,
): OoeTraceEvent[] {
  const definition = trigonometryPilotDefinition();
  const cancelled = hostExecution?.terminalStatus === 'cancelled';
  const baseEvents = buildCoarseLifecycleOoeTraceEvents({
    definition,
    status,
    job: jobContext.job,
    commitAssessment: jobContext.commitAssessment,
    preflightMessage: traceMessageForStatus(status),
    startedMessage: 'Trigonometry evaluation started through the isolated Trigonometry runtime shell.',
    finalMessage: 'Trigonometry evaluation pilot produced a stable CanonicalRuntimeOutcome.',
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
          ? `Trigonometry worker runtime fell back from ${hostExecution.fallbackFromHostId} to ${hostExecution.hostId}: ${hostExecution.reason}.`
          : hostExecution.kind === 'worker-cancelled'
            ? `Trigonometry worker runtime ${hostExecution.hostId} was hard-stopped.`
            : `Trigonometry worker runtime ran on ${hostExecution.hostId}.`,
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
      message: hostExecution?.reason ?? 'Trigonometry evaluation stopped before it finished.',
    }),
  ];
}

export function buildTrigonometryOoePilotMetadata(
  status: TrigonometryOoePilotStatus,
  routeSnapshot: unknown = { capabilityId: OOE_TRIGONOMETRY_EVALUATE_CAPABILITY_ID },
  options?: OoeJobContextOptions,
  jobContext: OoeJobCommitContext = buildOoeJobCommitContext(
    trigonometryPilotDefinition(),
    routeSnapshot,
    options,
  ),
  controlTraceEvents: readonly OoeTraceEvent[] = [],
  hostExecution?: TrigonometryHostExecution,
): TrigonometryOoePilotMetadata {
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
    shellId: 'trigonometry-worker-shell',
    capabilityId: OOE_TRIGONOMETRY_EVALUATE_CAPABILITY_ID,
    primaryHostId: OOE_TRIGONOMETRY_EVALUATE_HOST_ID,
    fallbackHostId: OOE_TRIGONOMETRY_EVALUATE_FALLBACK_HOST_ID,
    lifecycle: cancelled ? 'cancelled' : 'completed',
    hostExecution,
    launchTicket: options?.launchTicket,
  });

  return {
    ...trigonometryPilotDefinition(),
    status,
    job: jobContext.job,
    completion: cancelled
      ? {
          kind: 'cancelled',
          reason: hostExecution?.reason ?? 'Trigonometry evaluation stopped before it finished.',
        }
      : undefined,
    commitAssessment,
    trigonometryHostExecution: hostExecution,
    runtimeShell,
    traceEvents: buildTrigonometryOoeTraceEvents(
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

export async function runTrigonometryWithOoePilot<TPayload>(
  run: (context: OoeRuntimeControlContext) => TPayload | Promise<TPayload>,
  routeSnapshot: unknown = { capabilityId: OOE_TRIGONOMETRY_EVALUATE_CAPABILITY_ID },
  options?: OoeJobContextOptions,
  getHostExecution?: () => TrigonometryHostExecution | undefined,
  resolveCanonicalOutcome?: (payload: TPayload) => CanonicalRuntimeOutcome,
): Promise<TrigonometryOoePilotRunResult<TPayload>> {
  const definition = trigonometryPilotDefinition();
  return runOoeRuntimeJob({
    definition,
    routeLabel: OOE_TRIGONOMETRY_EVALUATE_CAPABILITY_ID,
    routeSnapshot,
    options,
    prepareStatus: prepareTrigonometryOoePilot,
    run,
    buildMetadata: ({ status, jobContext, controlTraceEvents }) => buildTrigonometryOoePilotMetadata(
      status,
      routeSnapshot,
      options,
      jobContext,
      controlTraceEvents,
      getHostExecution?.(),
    ),
    buildProvenance: ({ payload, metadata, routeSnapshot }) => {
      const snapshot = routeSnapshot as {
        request?: TrigonometryRouteRequestSnapshot;
      };
      const output = resolveCanonicalOutcome
        ? resolveCanonicalOutcome(payload)
        : (payload as { outcome?: CanonicalRuntimeOutcome }).outcome ?? payload as CanonicalRuntimeOutcome;
      return {
        depth: 'coarse',
        mode: 'trigonometry',
        route: OOE_TRIGONOMETRY_EVALUATE_CAPABILITY_ID,
        screen: snapshot.request?.screenHint,
        action: 'evaluate',
        inputSummary: {
          screen: snapshot.request?.screenHint,
          angleUnit: snapshot.request?.angleUnit,
          identityTargetForm: snapshot.request?.identityTargetForm,
          latexLength: snapshot.request?.inputLatex?.length,
        },
        outputSummary: summarizeCanonicalRuntimeOutcome(output),
        runtimeHost: metadata.trigonometryHostExecution?.hostId ?? metadata.hostId,
        runtimeShell: metadata.runtimeShell,
        commitDecision: metadata.commitAssessment.commitDecision,
        trigonometry: {
          screen: snapshot.request?.screenHint,
          angleUnit: snapshot.request?.angleUnit,
          identityTargetForm: snapshot.request?.identityTargetForm,
          hostExecution: metadata.trigonometryHostExecution,
        },
      };
    },
    buildFailureProvenance: ({ error, routeSnapshot }) => {
      const snapshot = routeSnapshot as {
        request?: TrigonometryRouteRequestSnapshot;
      };
      return {
        depth: 'coarse',
        mode: 'trigonometry',
        route: OOE_TRIGONOMETRY_EVALUATE_CAPABILITY_ID,
        screen: snapshot.request?.screenHint,
        action: 'evaluate',
        inputSummary: {
          screen: snapshot.request?.screenHint,
          angleUnit: snapshot.request?.angleUnit,
          identityTargetForm: snapshot.request?.identityTargetForm,
          latexLength: snapshot.request?.inputLatex?.length,
        },
        runtimeHost: OOE_TRIGONOMETRY_EVALUATE_HOST_ID,
        commitDecision: 'notApplicable',
        notes: [`Trigonometry runtime failed: ${errorMessage(error)}`],
      };
    },
  });
}
