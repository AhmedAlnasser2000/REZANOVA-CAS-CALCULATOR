import type { TableModeResult } from '../modes/table';
import {
  getBuiltinOoePlan,
  OOE_DESKTOP_UNAVAILABLE_REASON,
  validateOoePlan,
  type OoeTraceEvent,
  type OoeValidationError,
} from './ooe-bridge';
import {
  buildOoeFinalOutcomeTraceEvent,
  buildOoeTraceEvent,
} from './trace';

type TablePilotDefinition = {
  planId: 'plan.table.build';
  capabilityId: 'table.build';
  hostId: 'table-runtime';
  nodeId: 'node.table.build';
  phaseId: 'table.build';
};

export type TableOoePilotStatus =
  | {
      kind: 'ready';
      planId: TablePilotDefinition['planId'];
    }
  | {
      kind: 'unavailable';
      planId: TablePilotDefinition['planId'];
      reason: typeof OOE_DESKTOP_UNAVAILABLE_REASON;
    }
  | {
      kind: 'missing-plan';
      planId: TablePilotDefinition['planId'];
    }
  | {
      kind: 'invalid-plan';
      planId: TablePilotDefinition['planId'];
      errors: OoeValidationError[];
    }
  | {
      kind: 'bridge-error';
      planId: TablePilotDefinition['planId'];
      message: string;
    };

export type TableOoePilotMetadata = TablePilotDefinition & {
  status: TableOoePilotStatus;
  traceEvents: OoeTraceEvent[];
};

export type TableOoePilotRunResult = TableModeResult & {
  ooePilot: TableOoePilotMetadata;
};

function tablePilotDefinition(): TablePilotDefinition {
  return {
    planId: 'plan.table.build',
    capabilityId: 'table.build',
    hostId: 'table-runtime',
    nodeId: 'node.table.build',
    phaseId: 'table.build',
  };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function prepareTableOoePilot(): Promise<TableOoePilotStatus> {
  const { planId } = tablePilotDefinition();

  try {
    const planResult = await getBuiltinOoePlan(planId);

    if (planResult.kind === 'unavailable') {
      return {
        kind: 'unavailable',
        planId,
        reason: planResult.reason,
      };
    }

    if (!planResult.data) {
      return {
        kind: 'missing-plan',
        planId,
      };
    }

    const validationResult = await validateOoePlan(planResult.data);
    if (validationResult.kind === 'unavailable') {
      return {
        kind: 'unavailable',
        planId,
        reason: validationResult.reason,
      };
    }

    if (!validationResult.data.ok) {
      return {
        kind: 'invalid-plan',
        planId,
        errors: validationResult.data.errors,
      };
    }

    return {
      kind: 'ready',
      planId,
    };
  } catch (error) {
    return {
      kind: 'bridge-error',
      planId,
      message: errorMessage(error),
    };
  }
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
  const failed = status.kind !== 'ready';

  return [
    buildOoeTraceEvent({
      ...definition,
      status: failed ? 'failed' : 'completed',
      resultStability: failed ? 'failed' : 'stable',
      commitDecision: 'notApplicable',
      message: traceMessageForStatus(status),
    }),
    buildOoeTraceEvent({
      ...definition,
      status: 'started',
      resultStability: 'draft',
      commitDecision: 'notApplicable',
      message: 'Table build started through the TypeScript runtime.',
    }),
    buildOoeFinalOutcomeTraceEvent({
      ...definition,
      message: 'Table build pilot produced a stable DisplayOutcome.',
    }),
  ];
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
  return {
    ...run(),
    ooePilot: buildTableOoePilotMetadata(status),
  };
}
