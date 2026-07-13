import type { DisplayOutcome } from '../../../types/calculator';
import { summarizeDisplayOutcome } from '../diagnostics/diagnostics-buffer';
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

type StatisticsRouteRequestSnapshot = {
  inputLatex?: string;
  screenHint?: string;
  workingSourceHint?: string;
};

export const OOE_STATISTICS_EVALUATE_PLAN_ID = 'plan.statistics.evaluate' as const;
export const OOE_STATISTICS_EVALUATE_CAPABILITY_ID = 'statistics.evaluate' as const;
export const OOE_STATISTICS_EVALUATE_HOST_ID = 'statistics-worker-runtime' as const;
export const OOE_STATISTICS_EVALUATE_FALLBACK_HOST_ID = 'statistics-runtime' as const;
export const OOE_STATISTICS_EVALUATE_NODE_ID = 'node.statistics.evaluate' as const;
export const OOE_STATISTICS_EVALUATE_PHASE_ID = 'statistics.evaluate' as const;

type StatisticsPilotDefinition = {
  planId: typeof OOE_STATISTICS_EVALUATE_PLAN_ID;
  capabilityId: typeof OOE_STATISTICS_EVALUATE_CAPABILITY_ID;
  hostId: typeof OOE_STATISTICS_EVALUATE_HOST_ID;
  nodeId: typeof OOE_STATISTICS_EVALUATE_NODE_ID;
  phaseId: typeof OOE_STATISTICS_EVALUATE_PHASE_ID;
};

export type StatisticsOoePilotStatus = OoePilotStatus<typeof OOE_STATISTICS_EVALUATE_PLAN_ID>;

export type StatisticsHostExecution =
  | {
      kind: 'worker';
      hostId: typeof OOE_STATISTICS_EVALUATE_HOST_ID;
      isolated: true;
      terminalStatus: 'completed';
    }
  | {
      kind: 'worker-cancelled';
      hostId: typeof OOE_STATISTICS_EVALUATE_HOST_ID;
      isolated: true;
      terminalStatus: 'cancelled';
      termination: 'hardStop';
      reason?: string;
    }
  | {
      kind: 'fallback';
      hostId: typeof OOE_STATISTICS_EVALUATE_FALLBACK_HOST_ID;
      isolated: false;
      terminalStatus: 'fallback';
      fallbackFromHostId: typeof OOE_STATISTICS_EVALUATE_HOST_ID;
      reason: string;
    };

export type StatisticsOoePilotMetadata = OoeRuntimeMetadata<
  StatisticsPilotDefinition,
  StatisticsOoePilotStatus
> & {
  statisticsHostExecution?: StatisticsHostExecution;
  runtimeShell?: OoeRuntimeShellEvidence;
};

export type StatisticsOoePilotRunResult<TPayload> = OoeRuntimeEnvelope<
  TPayload,
  StatisticsOoePilotMetadata
>;

export function statisticsPilotDefinition(): StatisticsPilotDefinition {
  return {
    planId: OOE_STATISTICS_EVALUATE_PLAN_ID,
    capabilityId: OOE_STATISTICS_EVALUATE_CAPABILITY_ID,
    hostId: OOE_STATISTICS_EVALUATE_HOST_ID,
    nodeId: OOE_STATISTICS_EVALUATE_NODE_ID,
    phaseId: OOE_STATISTICS_EVALUATE_PHASE_ID,
  };
}

export async function prepareStatisticsOoePilot(): Promise<StatisticsOoePilotStatus> {
  return prepareOoePlanPreflight(statisticsPilotDefinition());
}

function traceMessageForStatus(status: StatisticsOoePilotStatus) {
  switch (status.kind) {
    case 'ready':
      return 'OOE Statistics evaluate plan is available and valid.';
    case 'unavailable':
      return `OOE bridge unavailable: ${status.reason}.`;
    case 'missing-plan':
      return 'OOE Statistics evaluate plan was not found.';
    case 'invalid-plan':
      return `OOE Statistics evaluate plan failed validation with ${status.errors.length} error(s).`;
    case 'bridge-error':
      return `OOE bridge error: ${status.message}`;
  }
}

function buildStatisticsOoeTraceEvents(
  status: StatisticsOoePilotStatus,
  jobContext: ReturnType<typeof buildOoeJobCommitContext>,
  controlTraceEvents: readonly OoeTraceEvent[] = [],
  hostExecution?: StatisticsHostExecution,
): OoeTraceEvent[] {
  const definition = statisticsPilotDefinition();
  const cancelled = hostExecution?.terminalStatus === 'cancelled';
  const baseEvents = buildCoarseLifecycleOoeTraceEvents({
    definition,
    status,
    job: jobContext.job,
    commitAssessment: jobContext.commitAssessment,
    preflightMessage: traceMessageForStatus(status),
    startedMessage: 'Statistics evaluation started through the isolated Statistics runtime shell.',
    finalMessage: 'Statistics evaluation pilot produced a stable DisplayOutcome.',
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
          ? `Statistics worker runtime fell back from ${hostExecution.fallbackFromHostId} to ${hostExecution.hostId}: ${hostExecution.reason}.`
          : hostExecution.kind === 'worker-cancelled'
            ? `Statistics worker runtime ${hostExecution.hostId} was hard-stopped.`
            : `Statistics worker runtime ran on ${hostExecution.hostId}.`,
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
      message: hostExecution?.reason ?? 'Statistics evaluation stopped before it finished.',
    }),
  ];
}

export function buildStatisticsOoePilotMetadata(
  status: StatisticsOoePilotStatus,
  routeSnapshot: unknown = { capabilityId: OOE_STATISTICS_EVALUATE_CAPABILITY_ID },
  options?: OoeJobContextOptions,
  jobContext: OoeJobCommitContext = buildOoeJobCommitContext(
    statisticsPilotDefinition(),
    routeSnapshot,
    options,
  ),
  controlTraceEvents: readonly OoeTraceEvent[] = [],
  hostExecution?: StatisticsHostExecution,
): StatisticsOoePilotMetadata {
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
    shellId: 'statistics-worker-shell',
    capabilityId: OOE_STATISTICS_EVALUATE_CAPABILITY_ID,
    primaryHostId: OOE_STATISTICS_EVALUATE_HOST_ID,
    fallbackHostId: OOE_STATISTICS_EVALUATE_FALLBACK_HOST_ID,
    lifecycle: cancelled ? 'cancelled' : 'completed',
    hostExecution,
    launchTicket: options?.launchTicket,
  });

  return {
    ...statisticsPilotDefinition(),
    status,
    job: jobContext.job,
    completion: cancelled
      ? {
          kind: 'cancelled',
          reason: hostExecution?.reason ?? 'Statistics evaluation stopped before it finished.',
        }
      : undefined,
    commitAssessment,
    statisticsHostExecution: hostExecution,
    runtimeShell,
    traceEvents: buildStatisticsOoeTraceEvents(
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

export async function runStatisticsWithOoePilot<TPayload>(
  run: (context: OoeRuntimeControlContext) => TPayload | Promise<TPayload>,
  routeSnapshot: unknown = { capabilityId: OOE_STATISTICS_EVALUATE_CAPABILITY_ID },
  options?: OoeJobContextOptions,
  getHostExecution?: () => StatisticsHostExecution | undefined,
  resolveDisplayOutcome?: (payload: TPayload) => DisplayOutcome,
): Promise<StatisticsOoePilotRunResult<TPayload>> {
  const definition = statisticsPilotDefinition();
  return runOoeRuntimeJob({
    definition,
    routeLabel: OOE_STATISTICS_EVALUATE_CAPABILITY_ID,
    routeSnapshot,
    options,
    prepareStatus: prepareStatisticsOoePilot,
    run,
    buildMetadata: ({ status, jobContext, controlTraceEvents }) => buildStatisticsOoePilotMetadata(
      status,
      routeSnapshot,
      options,
      jobContext,
      controlTraceEvents,
      getHostExecution?.(),
    ),
    buildProvenance: ({ payload, metadata, routeSnapshot }) => {
      const snapshot = routeSnapshot as {
        request?: StatisticsRouteRequestSnapshot;
      };
      const output = resolveDisplayOutcome
        ? resolveDisplayOutcome(payload)
        : (payload as { outcome?: DisplayOutcome }).outcome ?? payload as DisplayOutcome;
      return {
        depth: 'coarse',
        mode: 'statistics',
        route: OOE_STATISTICS_EVALUATE_CAPABILITY_ID,
        screen: snapshot.request?.screenHint,
        action: 'evaluate',
        inputSummary: {
          screen: snapshot.request?.screenHint,
          workingSource: snapshot.request?.workingSourceHint,
          latexLength: snapshot.request?.inputLatex?.length,
        },
        outputSummary: summarizeDisplayOutcome(output),
        runtimeHost: metadata.statisticsHostExecution?.hostId ?? metadata.hostId,
        runtimeShell: metadata.runtimeShell,
        commitDecision: metadata.commitAssessment.commitDecision,
        statistics: {
          screen: snapshot.request?.screenHint,
          workingSource: snapshot.request?.workingSourceHint,
          hostExecution: metadata.statisticsHostExecution,
        },
      };
    },
    buildFailureProvenance: ({ error, routeSnapshot }) => {
      const snapshot = routeSnapshot as {
        request?: StatisticsRouteRequestSnapshot;
      };
      return {
        depth: 'coarse',
        mode: 'statistics',
        route: OOE_STATISTICS_EVALUATE_CAPABILITY_ID,
        screen: snapshot.request?.screenHint,
        action: 'evaluate',
        inputSummary: {
          screen: snapshot.request?.screenHint,
          workingSource: snapshot.request?.workingSourceHint,
          latexLength: snapshot.request?.inputLatex?.length,
        },
        runtimeHost: OOE_STATISTICS_EVALUATE_HOST_ID,
        commitDecision: 'notApplicable',
        notes: [`Statistics runtime failed: ${errorMessage(error)}`],
      };
    },
  });
}
