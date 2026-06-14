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

type CalculusRouteRequestSnapshot = {
  screen?: string;
};

export const OOE_CALCULUS_EVALUATE_PLAN_ID = 'plan.calculus.evaluate' as const;
export const OOE_CALCULUS_EVALUATE_CAPABILITY_ID = 'calculus.evaluate' as const;
export const OOE_CALCULUS_EVALUATE_HOST_ID = 'calculus-worker-runtime' as const;
export const OOE_CALCULUS_EVALUATE_FALLBACK_HOST_ID = 'calculus-runtime' as const;
export const OOE_CALCULUS_EVALUATE_NODE_ID = 'node.calculus.evaluate' as const;
export const OOE_CALCULUS_EVALUATE_PHASE_ID = 'calculus.evaluate' as const;

type CalculusPilotDefinition = {
  planId: typeof OOE_CALCULUS_EVALUATE_PLAN_ID;
  capabilityId: typeof OOE_CALCULUS_EVALUATE_CAPABILITY_ID;
  hostId: typeof OOE_CALCULUS_EVALUATE_HOST_ID;
  nodeId: typeof OOE_CALCULUS_EVALUATE_NODE_ID;
  phaseId: typeof OOE_CALCULUS_EVALUATE_PHASE_ID;
};

export type CalculusOoePilotStatus = OoePilotStatus<typeof OOE_CALCULUS_EVALUATE_PLAN_ID>;

export type CalculusHostExecution =
  | {
      kind: 'worker';
      hostId: typeof OOE_CALCULUS_EVALUATE_HOST_ID;
      isolated: true;
      terminalStatus: 'completed';
    }
  | {
      kind: 'worker-cancelled';
      hostId: typeof OOE_CALCULUS_EVALUATE_HOST_ID;
      isolated: true;
      terminalStatus: 'cancelled';
      termination: 'hardStop';
      reason?: string;
    }
  | {
      kind: 'fallback';
      hostId: typeof OOE_CALCULUS_EVALUATE_FALLBACK_HOST_ID;
      isolated: false;
      terminalStatus: 'fallback';
      fallbackFromHostId: typeof OOE_CALCULUS_EVALUATE_HOST_ID;
      reason: string;
    };

export type CalculusOoePilotMetadata = OoeRuntimeMetadata<
  CalculusPilotDefinition,
  CalculusOoePilotStatus
> & {
  calculusHostExecution?: CalculusHostExecution;
  runtimeShell?: OoeRuntimeShellEvidence;
};

export type CalculusOoePilotRunResult = OoeRuntimeEnvelope<
  DisplayOutcome,
  CalculusOoePilotMetadata
>;

export function calculusPilotDefinition(): CalculusPilotDefinition {
  return {
    planId: OOE_CALCULUS_EVALUATE_PLAN_ID,
    capabilityId: OOE_CALCULUS_EVALUATE_CAPABILITY_ID,
    hostId: OOE_CALCULUS_EVALUATE_HOST_ID,
    nodeId: OOE_CALCULUS_EVALUATE_NODE_ID,
    phaseId: OOE_CALCULUS_EVALUATE_PHASE_ID,
  };
}

export async function prepareCalculusOoePilot(): Promise<CalculusOoePilotStatus> {
  return prepareOoePlanPreflight(calculusPilotDefinition());
}

function traceMessageForStatus(status: CalculusOoePilotStatus) {
  switch (status.kind) {
    case 'ready':
      return 'OOE Calculus evaluate plan is available and valid.';
    case 'unavailable':
      return `OOE bridge unavailable: ${status.reason}.`;
    case 'missing-plan':
      return 'OOE Calculus evaluate plan was not found.';
    case 'invalid-plan':
      return `OOE Calculus evaluate plan failed validation with ${status.errors.length} error(s).`;
    case 'bridge-error':
      return `OOE bridge error: ${status.message}`;
  }
}

function buildCalculusOoeTraceEvents(
  status: CalculusOoePilotStatus,
  jobContext: ReturnType<typeof buildOoeJobCommitContext>,
  controlTraceEvents: readonly OoeTraceEvent[] = [],
  hostExecution?: CalculusHostExecution,
): OoeTraceEvent[] {
  const definition = calculusPilotDefinition();
  const cancelled = hostExecution?.terminalStatus === 'cancelled';
  const baseEvents = buildCoarseLifecycleOoeTraceEvents({
    definition,
    status,
    job: jobContext.job,
    commitAssessment: jobContext.commitAssessment,
    preflightMessage: traceMessageForStatus(status),
    startedMessage: 'Calculus evaluation started through the isolated Calculus runtime shell.',
    finalMessage: 'Calculus evaluation pilot produced a stable DisplayOutcome.',
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
          ? `Calculus worker runtime fell back from ${hostExecution.fallbackFromHostId} to ${hostExecution.hostId}: ${hostExecution.reason}.`
          : hostExecution.kind === 'worker-cancelled'
            ? `Calculus worker runtime ${hostExecution.hostId} was hard-stopped.`
            : `Calculus worker runtime ran on ${hostExecution.hostId}.`,
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
      message: hostExecution?.reason ?? 'Calculus evaluation stopped before it finished.',
    }),
  ];
}

export function buildCalculusOoePilotMetadata(
  status: CalculusOoePilotStatus,
  routeSnapshot: unknown = { capabilityId: OOE_CALCULUS_EVALUATE_CAPABILITY_ID },
  options?: OoeJobContextOptions,
  jobContext: OoeJobCommitContext = buildOoeJobCommitContext(
    calculusPilotDefinition(),
    routeSnapshot,
    options,
  ),
  controlTraceEvents: readonly OoeTraceEvent[] = [],
  hostExecution?: CalculusHostExecution,
): CalculusOoePilotMetadata {
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
    shellId: 'calculus-worker-shell',
    capabilityId: OOE_CALCULUS_EVALUATE_CAPABILITY_ID,
    primaryHostId: OOE_CALCULUS_EVALUATE_HOST_ID,
    fallbackHostId: OOE_CALCULUS_EVALUATE_FALLBACK_HOST_ID,
    lifecycle: cancelled ? 'cancelled' : 'completed',
    hostExecution,
    launchTicket: options?.launchTicket,
  });

  return {
    ...calculusPilotDefinition(),
    status,
    job: jobContext.job,
    completion: cancelled
      ? {
          kind: 'cancelled',
          reason: hostExecution?.reason ?? 'Calculus evaluation stopped before it finished.',
        }
      : undefined,
    commitAssessment,
    calculusHostExecution: hostExecution,
    runtimeShell,
    traceEvents: buildCalculusOoeTraceEvents(
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

export async function runCalculusWithOoePilot(
  run: (context: OoeRuntimeControlContext) => DisplayOutcome | Promise<DisplayOutcome>,
  routeSnapshot: unknown = { capabilityId: OOE_CALCULUS_EVALUATE_CAPABILITY_ID },
  options?: OoeJobContextOptions,
  getHostExecution?: () => CalculusHostExecution | undefined,
): Promise<CalculusOoePilotRunResult> {
  const definition = calculusPilotDefinition();
  return runOoeRuntimeJob({
    definition,
    routeLabel: OOE_CALCULUS_EVALUATE_CAPABILITY_ID,
    routeSnapshot,
    options,
    prepareStatus: prepareCalculusOoePilot,
    run,
    buildMetadata: ({ status, jobContext, controlTraceEvents }) => buildCalculusOoePilotMetadata(
      status,
      routeSnapshot,
      options,
      jobContext,
      controlTraceEvents,
      getHostExecution?.(),
    ),
    buildProvenance: ({ payload, metadata, routeSnapshot }) => {
      const snapshot = routeSnapshot as {
        request?: CalculusRouteRequestSnapshot;
        generatedLatex?: string;
      };
      return {
        depth: 'coarse',
        mode: 'calculus',
        route: OOE_CALCULUS_EVALUATE_CAPABILITY_ID,
        screen: snapshot.request?.screen,
        action: 'evaluate',
        inputSummary: {
          screen: snapshot.request?.screen,
          latexLength: snapshot.generatedLatex?.length,
        },
        outputSummary: summarizeDisplayOutcome(payload),
        runtimeHost: metadata.calculusHostExecution?.hostId ?? metadata.hostId,
        runtimeShell: metadata.runtimeShell,
        commitDecision: metadata.commitAssessment.commitDecision,
        calculus: {
          screen: snapshot.request?.screen,
          hostExecution: metadata.calculusHostExecution,
        },
      };
    },
    buildFailureProvenance: ({ error, routeSnapshot }) => {
      const snapshot = routeSnapshot as {
        request?: CalculusRouteRequestSnapshot;
        generatedLatex?: string;
      };
      return {
        depth: 'coarse',
        mode: 'calculus',
        route: OOE_CALCULUS_EVALUATE_CAPABILITY_ID,
        screen: snapshot.request?.screen,
        action: 'evaluate',
        inputSummary: {
          screen: snapshot.request?.screen,
          latexLength: snapshot.generatedLatex?.length,
        },
        runtimeHost: OOE_CALCULUS_EVALUATE_HOST_ID,
        commitDecision: 'notApplicable',
        notes: [`Calculus runtime failed: ${errorMessage(error)}`],
      };
    },
  });
}
