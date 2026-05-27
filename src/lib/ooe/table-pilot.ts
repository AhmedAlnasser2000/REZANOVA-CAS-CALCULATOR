import type { TableModeResult } from '../modes/table';
import type { OoeTraceEvent } from './ooe-bridge';
import {
  buildCoarseLifecycleOoeTraceEvents,
  buildOoeRuntimeEnvelope,
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

function buildTableOoeTraceEvents(status: TableOoePilotStatus): OoeTraceEvent[] {
  const definition = tablePilotDefinition();
  return buildCoarseLifecycleOoeTraceEvents({
    definition,
    status,
    preflightMessage: traceMessageForStatus(status),
    startedMessage: 'Table build started through the TypeScript runtime.',
    finalMessage: 'Table build pilot produced a stable DisplayOutcome.',
  });
}

export function buildTableOoePilotMetadata(
  status: TableOoePilotStatus,
): TableOoePilotMetadata {
  return {
    ...tablePilotDefinition(),
    status,
    traceEvents: buildTableOoeTraceEvents(status),
  };
}

export async function runTableWithOoePilot(
  run: () => TableModeResult,
): Promise<TableOoePilotRunResult> {
  const status = await prepareTableOoePilot();
  return buildOoeRuntimeEnvelope(run(), buildTableOoePilotMetadata(status));
}
