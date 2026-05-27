import type { CalculateAction, DisplayOutcome } from '../../types/calculator';
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

type ExpressionPilotDefinition = {
  planId: `plan.expression.${CalculateAction}`;
  capabilityId: `expression.${CalculateAction}`;
  hostId: 'expression-runtime';
  nodeId: `node.expression.${CalculateAction}`;
  phaseId: `expression.${CalculateAction}`;
};

export type ExpressionOoePilotStatus =
  | {
      kind: 'ready';
      planId: ExpressionPilotDefinition['planId'];
    }
  | {
      kind: 'unavailable';
      planId: ExpressionPilotDefinition['planId'];
      reason: typeof OOE_DESKTOP_UNAVAILABLE_REASON;
    }
  | {
      kind: 'missing-plan';
      planId: ExpressionPilotDefinition['planId'];
    }
  | {
      kind: 'invalid-plan';
      planId: ExpressionPilotDefinition['planId'];
      errors: OoeValidationError[];
    }
  | {
      kind: 'bridge-error';
      planId: ExpressionPilotDefinition['planId'];
      message: string;
    };

export type ExpressionOoePilotMetadata = ExpressionPilotDefinition & {
  action: CalculateAction;
  status: ExpressionOoePilotStatus;
  traceEvents: OoeTraceEvent[];
};

export type ExpressionOoePilotRunResult = {
  outcome: DisplayOutcome;
  ooePilot: ExpressionOoePilotMetadata;
};

function expressionPilotDefinition(action: CalculateAction): ExpressionPilotDefinition {
  return {
    planId: `plan.expression.${action}`,
    capabilityId: `expression.${action}`,
    hostId: 'expression-runtime',
    nodeId: `node.expression.${action}`,
    phaseId: `expression.${action}`,
  };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function prepareExpressionOoePilot(
  action: CalculateAction,
): Promise<ExpressionOoePilotStatus> {
  const { planId } = expressionPilotDefinition(action);

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

function traceMessageForStatus(action: CalculateAction, status: ExpressionOoePilotStatus) {
  switch (status.kind) {
    case 'ready':
      return `OOE expression ${action} plan is available and valid.`;
    case 'unavailable':
      return `OOE bridge unavailable: ${status.reason}.`;
    case 'missing-plan':
      return `OOE expression ${action} plan was not found.`;
    case 'invalid-plan':
      return `OOE expression ${action} plan failed validation with ${status.errors.length} error(s).`;
    case 'bridge-error':
      return `OOE bridge error: ${status.message}`;
  }
}

function buildExpressionOoeTraceEvents(
  action: CalculateAction,
  status: ExpressionOoePilotStatus,
): OoeTraceEvent[] {
  const definition = expressionPilotDefinition(action);
  const failed = status.kind !== 'ready';

  return [
    buildOoeTraceEvent({
      ...definition,
      status: failed ? 'failed' : 'completed',
      resultStability: failed ? 'failed' : 'stable',
      commitDecision: 'notApplicable',
      message: traceMessageForStatus(action, status),
    }),
    buildOoeTraceEvent({
      ...definition,
      status: 'started',
      resultStability: 'draft',
      commitDecision: 'notApplicable',
      message: `Expression ${action} started through the TypeScript runtime.`,
    }),
    buildOoeFinalOutcomeTraceEvent({
      ...definition,
      message: `Expression ${action} pilot produced a stable DisplayOutcome.`,
    }),
  ];
}

export function buildExpressionOoePilotMetadata(
  action: CalculateAction,
  status: ExpressionOoePilotStatus,
): ExpressionOoePilotMetadata {
  return {
    action,
    ...expressionPilotDefinition(action),
    status,
    traceEvents: buildExpressionOoeTraceEvents(action, status),
  };
}

export async function runExpressionWithOoePilot(
  action: CalculateAction,
  run: () => DisplayOutcome,
): Promise<ExpressionOoePilotRunResult> {
  const status = await prepareExpressionOoePilot(action);
  return {
    outcome: run(),
    ooePilot: buildExpressionOoePilotMetadata(action, status),
  };
}
