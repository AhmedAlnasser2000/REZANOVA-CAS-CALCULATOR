import type { CalculateAction, DisplayOutcome } from '../../types/calculator';
import {
  buildOoeJobCommitContext,
  type OoeJobContextOptions,
} from './job-contract';
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

function buildExpressionOoeTraceEvents(input: {
  action: CalculateAction;
  status: ExpressionOoePilotStatus;
  jobContext: ReturnType<typeof buildOoeJobCommitContext>;
}) {
  const definition = expressionPilotDefinition(input.action);
  return buildCoarseLifecycleOoeTraceEvents({
    definition,
    status: input.status,
    job: input.jobContext.job,
    commitAssessment: input.jobContext.commitAssessment,
    preflightMessage: traceMessageForStatus(input.action, input.status),
    startedMessage: `Expression ${input.action} started through the TypeScript runtime.`,
    finalMessage: `Expression ${input.action} pilot produced a stable DisplayOutcome.`,
  });
}

export function buildExpressionOoePilotMetadata(
  action: CalculateAction,
  status: ExpressionOoePilotStatus,
  routeSnapshot: unknown = { action },
  options?: OoeJobContextOptions,
): ExpressionOoePilotMetadata {
  const definition = expressionPilotDefinition(action);
  const jobContext = buildOoeJobCommitContext(definition, routeSnapshot, options);
  return {
    action,
    ...definition,
    status,
    job: jobContext.job,
    commitAssessment: jobContext.commitAssessment,
    traceEvents: buildExpressionOoeTraceEvents({ action, status, jobContext }),
  };
}

export async function runExpressionWithOoePilot(
  action: CalculateAction,
  run: () => DisplayOutcome,
  routeSnapshot: unknown = { action },
  options?: OoeJobContextOptions,
): Promise<ExpressionOoePilotRunResult> {
  const status = await prepareExpressionOoePilot(action);
  return buildOoeRuntimeEnvelope(
    run(),
    buildExpressionOoePilotMetadata(action, status, routeSnapshot, options),
  );
}
