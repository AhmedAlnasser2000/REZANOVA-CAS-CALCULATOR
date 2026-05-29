import type { TableModeResult } from '../modes/table';
import type { OoeTraceEvent } from './ooe-bridge';
import { summarizeDisplayOutcome } from './diagnostics-buffer';
import {
  buildOoeJobCommitContext,
  type OoeJobCommitContext,
  type OoeJobContextOptions,
} from './job-contract';
import { runOoeRuntimeJob } from './runtime-coordinator';
import {
  buildCoarseLifecycleOoeTraceEvents,
  prepareOoePlanPreflight,
  type OoePilotStatus,
  type OoeRuntimeEnvelope,
  type OoeRuntimeMetadata,
} from './runtime-envelope';

type TablePilotDefinition = {
  planId: 'plan.table.build';
  capabilityId: 'table.build';
  hostId: 'table-runtime';
  nodeId: 'node.table.build';
  phaseId: 'table.build';
};

export type TableOoePilotStatus = OoePilotStatus<TablePilotDefinition['planId']>;

export type TableOoePilotMetadata = OoeRuntimeMetadata<
  TablePilotDefinition,
  TableOoePilotStatus
>;

export type TableOoePilotRunResult = OoeRuntimeEnvelope<TableModeResult, TableOoePilotMetadata>;

function tablePilotDefinition(): TablePilotDefinition {
  return {
    planId: 'plan.table.build',
    capabilityId: 'table.build',
    hostId: 'table-runtime',
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
): OoeTraceEvent[] {
  const definition = tablePilotDefinition();
  return buildCoarseLifecycleOoeTraceEvents({
    definition,
    status,
    job: jobContext.job,
    commitAssessment: jobContext.commitAssessment,
    preflightMessage: traceMessageForStatus(status),
    startedMessage: 'Table build started through the TypeScript runtime.',
    finalMessage: 'Table build pilot produced a stable DisplayOutcome.',
  });
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
): TableOoePilotMetadata {
  return {
    ...tablePilotDefinition(),
    status,
    job: jobContext.job,
    commitAssessment: jobContext.commitAssessment,
    traceEvents: buildTableOoeTraceEvents(status, jobContext),
  };
}

export async function runTableWithOoePilot(
  run: () => TableModeResult,
  routeSnapshot: unknown = { capabilityId: 'table.build' },
  options?: OoeJobContextOptions,
): Promise<TableOoePilotRunResult> {
  const definition = tablePilotDefinition();
  return runOoeRuntimeJob({
    definition,
    routeLabel: 'table.build',
    routeSnapshot,
    options,
    prepareStatus: prepareTableOoePilot,
    run,
    buildMetadata: ({ status, jobContext }) => buildTableOoePilotMetadata(
      status,
      routeSnapshot,
      options,
      jobContext,
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
        runtimeHost: metadata.hostId,
        commitDecision: metadata.commitAssessment.commitDecision,
        table: {
          rowsStored: false,
          warningsCount: payload.response.warnings.length,
          hasError: Boolean(payload.response.error),
        },
      };
    },
  });
}
