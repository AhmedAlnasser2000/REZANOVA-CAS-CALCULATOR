import type { CalculateAction, DisplayOutcome } from '../../types/calculator';
import {
  buildCoarseLifecycleOoeTraceEvents,
  buildOoeRuntimeEnvelope,
  prepareOoePlanPreflight,
  type OoePilotStatus,
  type OoeRuntimeEnvelope,
  type OoeRuntimeMetadata,
} from './runtime-envelope';

type ExpressionPilotDefinition = {
  planId: `plan.expression.${CalculateAction}`;
  capabilityId: `expression.${CalculateAction}`;
  hostId: 'expression-runtime';
  nodeId: `node.expression.${CalculateAction}`;
  phaseId: `expression.${CalculateAction}`;
};

export type ExpressionOoePilotStatus = OoePilotStatus<ExpressionPilotDefinition['planId']>;

export type ExpressionOoePilotMetadata = OoeRuntimeMetadata<
  ExpressionPilotDefinition,
  ExpressionOoePilotStatus
> & {
  action: CalculateAction;
};

export type ExpressionOoePilotRunResult = OoeRuntimeEnvelope<
  DisplayOutcome,
  ExpressionOoePilotMetadata
>;

function expressionPilotDefinition(action: CalculateAction): ExpressionPilotDefinition {
  return {
    planId: `plan.expression.${action}`,
    capabilityId: `expression.${action}`,
    hostId: 'expression-runtime',
    nodeId: `node.expression.${action}`,
    phaseId: `expression.${action}`,
  };
}

export async function prepareExpressionOoePilot(
  action: CalculateAction,
): Promise<ExpressionOoePilotStatus> {
  return prepareOoePlanPreflight(expressionPilotDefinition(action));
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
) {
  const definition = expressionPilotDefinition(action);
  return buildCoarseLifecycleOoeTraceEvents({
    definition,
    status,
    preflightMessage: traceMessageForStatus(action, status),
    startedMessage: `Expression ${action} started through the TypeScript runtime.`,
    finalMessage: `Expression ${action} pilot produced a stable DisplayOutcome.`,
  });
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
  return buildOoeRuntimeEnvelope(run(), buildExpressionOoePilotMetadata(action, status));
}
