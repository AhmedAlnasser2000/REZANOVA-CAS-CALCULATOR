import type { TableModeResult } from '../../modes/table-core';
import type { OoeTraceEvent } from '../bridge-schema/ooe-bridge';
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

type TablePilotDefinition = {
  planId: 'plan.table.build';
  capabilityId: 'table.build';
  hostId: 'table-worker-runtime';
  nodeId: 'node.table.build';
  phaseId: 'table.build';
};

export type TableOoePilotStatus = OoePilotStatus<TablePilotDefinition['planId']>;

export type TableHostExecution =
  | {
      kind: 'worker';
      hostId: 'table-worker-runtime';
      isolated: true;
    }
  | {
      kind: 'worker-cancelled';
      hostId: 'table-worker-runtime';
      isolated: true;
      termination: 'hardStop';
    }
  | {
      kind: 'fallback';
      hostId: 'table-runtime';
      isolated: false;
      fallbackFromHostId: 'table-worker-runtime';
      reason: string;
    };

export type TableOoePilotMetadata = OoeRuntimeMetadata<
  TablePilotDefinition,
  TableOoePilotStatus
> & {
  tableHostExecution?: TableHostExecution;
  runtimeShell?: OoeRuntimeShellEvidence;
};

export type TableOoePilotRunResult = OoeRuntimeEnvelope<TableModeResult, TableOoePilotMetadata>;

function tablePilotDefinition(): TablePilotDefinition {
  return {
    planId: 'plan.table.build',
    capabilityId: 'table.build',
    hostId: 'table-worker-runtime',
    nodeId: 'node.table.build',
    phaseId: 'table.build',
  };
}

export async function prepareTableOoePilot(): Promise<TableOoePilotStatus> {
  return prepareOoePlanPreflight(tablePilotDefinition());
}

function traceMessageForStatus(status: TableOoePilotStatus) {
  switch (status.kind) {
    case 'ready':
      return 'OOE table build plan is available and valid.';
    case 'unavailable':
      return `OOE bridge unavailable: ${status.reason}.`;
    case 'missing-plan':
      return 'OOE table build plan was not found.';
    case 'invalid-plan':
      return `OOE table build plan failed validation with ${status.errors.length} error(s).`;
    case 'bridge-error':
      return `OOE bridge error: ${status.message}`;
  }
}

function buildTableOoeTraceEvents(
  status: TableOoePilotStatus,
  jobContext: ReturnType<typeof buildOoeJobCommitContext>,
  controlTraceEvents: readonly OoeTraceEvent[] = [],
  cancelled = false,
): OoeTraceEvent[] {
  const definition = tablePilotDefinition();
  const baseEvents = buildCoarseLifecycleOoeTraceEvents({
    definition,
    status,
    job: jobContext.job,
    commitAssessment: jobContext.commitAssessment,
    preflightMessage: traceMessageForStatus(status),
    startedMessage: 'Table build started through the isolated Table runtime.',
    finalMessage: 'Table build pilot produced a stable DisplayOutcome.',
  });

  if (!cancelled) {
    return [
      baseEvents[0],
      baseEvents[1],
      ...controlTraceEvents,
      baseEvents[2],
    ];
  }

  return [
    baseEvents[0],
    baseEvents[1],
    ...controlTraceEvents,
    buildOoeTraceEvent({
      ...definition,
      jobId: jobContext.job.jobId,
      inputRevisionId: jobContext.job.inputRevisionId,
      status: 'cancelled',
      resultStability: 'stale',
      commitDecision: 'notApplicable',
      message: 'Table build stopped before it finished.',
    }),
  ];
}

export function buildTableOoePilotMetadata(
  status: TableOoePilotStatus,
  routeSnapshot: unknown = { capabilityId: 'table.build' },
  options?: OoeJobContextOptions,
  jobContext: OoeJobCommitContext = buildOoeJobCommitContext(
    tablePilotDefinition(),
    routeSnapshot,
    options,
  ),
  controlTraceEvents: readonly OoeTraceEvent[] = [],
  runtimeStatus?: TableModeResult['runtimeStatus'],
  hostExecution?: TableHostExecution,
): TableOoePilotMetadata {
  const cancelled = runtimeStatus === 'cancelled';
  const commitAssessment = cancelled
    ? {
        ...jobContext.commitAssessment,
        legality: 'notApplicable' as const,
        commitDecision: 'notApplicable' as const,
        resultStability: 'stale' as const,
      }
    : jobContext.commitAssessment;
  const runtimeShell = buildOoeRuntimeShellEvidence({
    shellId: 'table-worker-shell',
    capabilityId: 'table.build',
    primaryHostId: 'table-worker-runtime',
    fallbackHostId: 'table-runtime',
    lifecycle: cancelled ? 'cancelled' : 'completed',
    hostExecution,
    launchTicket: options?.launchTicket,
  });

  return {
    ...tablePilotDefinition(),
    status,
    job: jobContext.job,
    completion: cancelled
      ? {
          kind: 'cancelled',
          reason: 'Table build stopped before it finished.',
        }
      : undefined,
    commitAssessment,
    tableHostExecution: hostExecution,
    runtimeShell,
    traceEvents: buildTableOoeTraceEvents(
      status,
      {
        ...jobContext,
        commitAssessment,
      },
      controlTraceEvents,
      cancelled,
    ),
  };
}

export async function runTableWithOoePilot(
  run: (context: OoeRuntimeControlContext) => TableModeResult | Promise<TableModeResult>,
  routeSnapshot: unknown = { capabilityId: 'table.build' },
  options?: OoeJobContextOptions,
  getHostExecution?: () => TableHostExecution | undefined,
): Promise<TableOoePilotRunResult> {
  const definition = tablePilotDefinition();
  return runOoeRuntimeJob({
    definition,
    routeLabel: 'table.build',
    routeSnapshot,
    options,
    cooperativeBudget: { sliceMs: 0 },
    prepareStatus: prepareTableOoePilot,
    run,
    buildMetadata: ({ payload, status, jobContext, controlTraceEvents }) => buildTableOoePilotMetadata(
      status,
      routeSnapshot,
      options,
      jobContext,
      controlTraceEvents,
      payload.runtimeStatus,
      getHostExecution?.(),
    ),
    buildProvenance: ({ payload, metadata }) => {
      const snapshot = routeSnapshot as {
        request?: {
          primaryLatex?: string;
          secondaryLatex?: string;
          secondaryEnabled?: boolean;
          start?: number;
          end?: number;
          step?: number;
        };
      };
      return {
        depth: 'coarse',
        mode: 'table',
        route: 'table.build',
        action: 'build',
        inputSummary: {
          primaryLatexLength: snapshot.request?.primaryLatex?.length,
          secondaryLatexLength: snapshot.request?.secondaryLatex?.length,
          secondaryEnabled: snapshot.request?.secondaryEnabled,
          start: snapshot.request?.start,
          end: snapshot.request?.end,
          step: snapshot.request?.step,
        },
        outputSummary: summarizeDisplayOutcome(payload.outcome),
        runtimeHost: metadata.tableHostExecution?.hostId ?? metadata.hostId,
        runtimeShell: metadata.runtimeShell,
        commitDecision: metadata.commitAssessment.commitDecision,
        table: {
          rowsStored: false,
          warningsCount: payload.response.warnings.length,
          hasError: Boolean(payload.response.error),
          hostExecution: metadata.tableHostExecution,
        },
      };
    },
  });
}
