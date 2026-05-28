import type { DisplayOutcome } from '../../types/calculator';
import {
  listSharedEquationSolveStageOrder,
  runSharedEquationSolveWithTrace,
  type SharedSolveRequest,
} from '../equation/shared-solve';
import type { GuardedEquationStageReplayTrace } from '../equation/guarded-solve';
import { type OoeTraceEvent } from './ooe-bridge';
import {
  completeOoeJob,
  failOoeJob,
  startOoeJob,
} from './active-job-registry';
import {
  buildOoeJobIdentity,
  buildOoeJobCommitContext,
  type OoeJobContextOptions,
} from './job-contract';
import {
  buildOoeRuntimeEnvelope,
  buildOoePreflightTraceEvent,
  prepareOoePlanPreflight,
  type OoePilotStatus,
  type OoeRuntimeEnvelope,
  type OoeRuntimeMetadata,
} from './runtime-envelope';
import {
  buildOoeFinalOutcomeTraceEvent,
  buildOoeStageAttemptTraceEvent,
} from './trace';

export const OOE_EQUATION_SOLVE_PLAN_ID = 'plan.equation.solve' as const;
export const OOE_EQUATION_SOLVE_CAPABILITY_ID = 'equation.solve' as const;
export const OOE_EQUATION_SOLVE_HOST_ID = 'equation-runtime' as const;
export const OOE_EQUATION_SOLVE_NODE_ID = 'node.equation.solve' as const;
export const OOE_EQUATION_SOLVE_PHASE_ID = 'equation.solve' as const;

type EquationPilotDefinition = {
  planId: typeof OOE_EQUATION_SOLVE_PLAN_ID;
  capabilityId: typeof OOE_EQUATION_SOLVE_CAPABILITY_ID;
  hostId: typeof OOE_EQUATION_SOLVE_HOST_ID;
  nodeId: typeof OOE_EQUATION_SOLVE_NODE_ID;
  phaseId: typeof OOE_EQUATION_SOLVE_PHASE_ID;
};

export type EquationOoePilotStatus = OoePilotStatus<typeof OOE_EQUATION_SOLVE_PLAN_ID>;

export type EquationOoePilotMetadata = OoeRuntimeMetadata<
  EquationPilotDefinition,
  EquationOoePilotStatus
> & {
  stageOrder: string[];
  guardedTrace?: GuardedEquationStageReplayTrace;
};

export type EquationOoePilotSolveResult = OoeRuntimeEnvelope<
  DisplayOutcome,
  EquationOoePilotMetadata
>;

function equationPilotDefinition(): EquationPilotDefinition {
  return {
    planId: OOE_EQUATION_SOLVE_PLAN_ID,
    capabilityId: OOE_EQUATION_SOLVE_CAPABILITY_ID,
    hostId: OOE_EQUATION_SOLVE_HOST_ID,
    nodeId: OOE_EQUATION_SOLVE_NODE_ID,
    phaseId: OOE_EQUATION_SOLVE_PHASE_ID,
  };
}

export async function prepareEquationOoePilot(): Promise<EquationOoePilotStatus> {
  return prepareOoePlanPreflight(equationPilotDefinition());
}

function traceMessageForStatus(status: EquationOoePilotStatus) {
  switch (status.kind) {
    case 'ready':
      return 'OOE equation solve plan is available and valid.';
    case 'unavailable':
      return `OOE bridge unavailable: ${status.reason}.`;
    case 'missing-plan':
      return 'OOE equation solve plan was not found.';
    case 'invalid-plan':
      return `OOE equation solve plan failed validation with ${status.errors.length} error(s).`;
    case 'bridge-error':
      return `OOE bridge error: ${status.message}`;
  }
}

function buildEquationOoeStatusTraceEvent(
  status: EquationOoePilotStatus,
  jobContext: ReturnType<typeof buildOoeJobCommitContext>,
): OoeTraceEvent {
  return buildOoePreflightTraceEvent(
    equationPilotDefinition(),
    status,
    traceMessageForStatus(status),
    jobContext.job,
  );
}

function buildEquationOoeTraceEvents(
  status: EquationOoePilotStatus,
  jobContext: ReturnType<typeof buildOoeJobCommitContext>,
  guardedTrace?: GuardedEquationStageReplayTrace,
): OoeTraceEvent[] {
  const stageEvents = guardedTrace?.attempts.map((attempt) => buildOoeStageAttemptTraceEvent({
    planId: OOE_EQUATION_SOLVE_PLAN_ID,
    nodeId: OOE_EQUATION_SOLVE_NODE_ID,
    capabilityId: OOE_EQUATION_SOLVE_CAPABILITY_ID,
    hostId: OOE_EQUATION_SOLVE_HOST_ID,
    phaseId: OOE_EQUATION_SOLVE_PHASE_ID,
    stageId: attempt.stageId,
    depth: attempt.depth,
    returnedOutcome: attempt.returnedOutcome,
    job: jobContext.job,
  })) ?? [];

  return [
    buildEquationOoeStatusTraceEvent(status, jobContext),
    ...stageEvents,
    buildOoeFinalOutcomeTraceEvent({
      planId: OOE_EQUATION_SOLVE_PLAN_ID,
      nodeId: OOE_EQUATION_SOLVE_NODE_ID,
      capabilityId: OOE_EQUATION_SOLVE_CAPABILITY_ID,
      hostId: OOE_EQUATION_SOLVE_HOST_ID,
      phaseId: OOE_EQUATION_SOLVE_PHASE_ID,
      job: jobContext.job,
      commitDecision: jobContext.commitAssessment.commitDecision,
    }),
  ];
}

export function buildEquationOoePilotMetadata(
  status: EquationOoePilotStatus,
  guardedTrace?: GuardedEquationStageReplayTrace,
  routeSnapshot: unknown = { capabilityId: OOE_EQUATION_SOLVE_CAPABILITY_ID },
  options?: OoeJobContextOptions,
): EquationOoePilotMetadata {
  const jobContext = buildOoeJobCommitContext(equationPilotDefinition(), routeSnapshot, options);
  return {
    ...equationPilotDefinition(),
    status,
    job: jobContext.job,
    commitAssessment: jobContext.commitAssessment,
    stageOrder: listSharedEquationSolveStageOrder(),
    guardedTrace,
    traceEvents: buildEquationOoeTraceEvents(status, jobContext, guardedTrace),
  };
}

export async function runSharedEquationSolveWithOoePilot(
  request: SharedSolveRequest,
  options?: OoeJobContextOptions,
): Promise<EquationOoePilotSolveResult> {
  const routeSnapshot = { request };
  const definition = equationPilotDefinition();
  const activeJob = startOoeJob({
    job: buildOoeJobIdentity(definition, routeSnapshot),
    routeLabel: 'equation.solve',
  });

  try {
    const status = await prepareEquationOoePilot();
    const traced = runSharedEquationSolveWithTrace(request);
    const metadata = buildEquationOoePilotMetadata(
      status,
      traced.trace,
      routeSnapshot,
      options,
    );
    completeOoeJob(activeJob, metadata);
    return buildOoeRuntimeEnvelope(traced.outcome, metadata);
  } catch (error) {
    failOoeJob(activeJob, error);
    throw error;
  }
}
