import type { CalculateAction, DisplayOutcome } from '../../types/calculator';
import {
  buildOoeJobCommitContext,
  type OoeJobCommitContext,
  type OoeJobContextOptions,
} from './job-contract';
import { summarizeDisplayOutcome } from './diagnostics-buffer';
import { runOoeRuntimeJob } from './runtime-coordinator';
import {
  buildCoarseLifecycleOoeTraceEvents,
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
  jobContext: OoeJobCommitContext = buildOoeJobCommitContext(
    expressionPilotDefinition(action),
    routeSnapshot,
    options,
  ),
): ExpressionOoePilotMetadata {
  const definition = expressionPilotDefinition(action);
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
  const definition = expressionPilotDefinition(action);
  return runOoeRuntimeJob({
    definition,
    routeLabel: `expression.${action}`,
    routeSnapshot,
    options,
    prepareStatus: () => prepareExpressionOoePilot(action),
    run,
    buildMetadata: ({ status, jobContext }) => buildExpressionOoePilotMetadata(
      action,
      status,
      routeSnapshot,
      options,
      jobContext,
    ),
    buildProvenance: ({ payload, metadata }) => ({
      depth: 'coarse',
      mode: 'calculate',
      route: `expression.${action}`,
      screen: typeof routeSnapshot === 'object'
        && routeSnapshot !== null
        && 'request' in routeSnapshot
        && typeof routeSnapshot.request === 'object'
        && routeSnapshot.request !== null
        && 'calculateScreen' in routeSnapshot.request
        && typeof routeSnapshot.request.calculateScreen === 'string'
        ? routeSnapshot.request.calculateScreen
        : 'standard',
      action,
      inputSummary: {
        action,
        latexLength: typeof routeSnapshot === 'object'
          && routeSnapshot !== null
          && 'request' in routeSnapshot
          && typeof routeSnapshot.request === 'object'
          && routeSnapshot.request !== null
          && 'latex' in routeSnapshot.request
          && typeof routeSnapshot.request.latex === 'string'
          ? routeSnapshot.request.latex.length
          : undefined,
      },
      outputSummary: summarizeDisplayOutcome(payload),
      runtimeHost: metadata.hostId,
      commitDecision: metadata.commitAssessment.commitDecision,
    }),
  });
}
