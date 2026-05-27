import type { DisplayOutcome } from '../../types/calculator';
import {
  listSharedEquationSolveStageOrder,
  runSharedEquationSolveWithTrace,
  type SharedSolveRequest,
} from '../equation/shared-solve';
import type { GuardedEquationStageReplayTrace } from '../equation/guarded-solve';
import {
  getBuiltinOoePlan,
  OOE_DESKTOP_UNAVAILABLE_REASON,
  validateOoePlan,
  type OoeTraceEvent,
  type OoeValidationError,
} from './ooe-bridge';
import {
  buildOoeFinalOutcomeTraceEvent,
  buildOoeStageAttemptTraceEvent,
  buildOoeTraceEvent,
} from './trace';

export const OOE_EQUATION_SOLVE_PLAN_ID = 'plan.equation.solve' as const;
export const OOE_EQUATION_SOLVE_CAPABILITY_ID = 'equation.solve' as const;
export const OOE_EQUATION_SOLVE_HOST_ID = 'equation-runtime' as const;
export const OOE_EQUATION_SOLVE_NODE_ID = 'node.equation.solve' as const;
export const OOE_EQUATION_SOLVE_PHASE_ID = 'equation.solve' as const;

export type EquationOoePilotStatus =
  | {
      kind: 'ready';
      planId: typeof OOE_EQUATION_SOLVE_PLAN_ID;
    }
  | {
      kind: 'unavailable';
      planId: typeof OOE_EQUATION_SOLVE_PLAN_ID;
      reason: typeof OOE_DESKTOP_UNAVAILABLE_REASON;
    }
  | {
      kind: 'missing-plan';
      planId: typeof OOE_EQUATION_SOLVE_PLAN_ID;
    }
  | {
      kind: 'invalid-plan';
      planId: typeof OOE_EQUATION_SOLVE_PLAN_ID;
      errors: OoeValidationError[];
    }
  | {
      kind: 'bridge-error';
      planId: typeof OOE_EQUATION_SOLVE_PLAN_ID;
      message: string;
    };

export type EquationOoePilotMetadata = {
  planId: typeof OOE_EQUATION_SOLVE_PLAN_ID;
  capabilityId: typeof OOE_EQUATION_SOLVE_CAPABILITY_ID;
  hostId: typeof OOE_EQUATION_SOLVE_HOST_ID;
  status: EquationOoePilotStatus;
  stageOrder: string[];
  guardedTrace?: GuardedEquationStageReplayTrace;
  traceEvents: OoeTraceEvent[];
};

export type EquationOoePilotSolveResult = {
  outcome: DisplayOutcome;
  ooePilot: EquationOoePilotMetadata;
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function prepareEquationOoePilot(): Promise<EquationOoePilotStatus> {
  try {
    const planResult = await getBuiltinOoePlan(OOE_EQUATION_SOLVE_PLAN_ID);

    if (planResult.kind === 'unavailable') {
      return {
        kind: 'unavailable',
        planId: OOE_EQUATION_SOLVE_PLAN_ID,
        reason: planResult.reason,
      };
    }

    if (!planResult.data) {
      return {
        kind: 'missing-plan',
        planId: OOE_EQUATION_SOLVE_PLAN_ID,
      };
    }

    const validationResult = await validateOoePlan(planResult.data);
    if (validationResult.kind === 'unavailable') {
      return {
        kind: 'unavailable',
        planId: OOE_EQUATION_SOLVE_PLAN_ID,
        reason: validationResult.reason,
      };
    }

    if (!validationResult.data.ok) {
      return {
        kind: 'invalid-plan',
        planId: OOE_EQUATION_SOLVE_PLAN_ID,
        errors: validationResult.data.errors,
      };
    }

    return {
      kind: 'ready',
      planId: OOE_EQUATION_SOLVE_PLAN_ID,
    };
  } catch (error) {
    return {
      kind: 'bridge-error',
      planId: OOE_EQUATION_SOLVE_PLAN_ID,
      message: errorMessage(error),
    };
  }
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

function buildEquationOoeStatusTraceEvent(status: EquationOoePilotStatus): OoeTraceEvent {
  const failed = status.kind !== 'ready';
  return buildOoeTraceEvent({
    planId: OOE_EQUATION_SOLVE_PLAN_ID,
    nodeId: OOE_EQUATION_SOLVE_NODE_ID,
    capabilityId: OOE_EQUATION_SOLVE_CAPABILITY_ID,
    hostId: OOE_EQUATION_SOLVE_HOST_ID,
    phaseId: OOE_EQUATION_SOLVE_PHASE_ID,
    status: failed ? 'failed' : 'completed',
    resultStability: failed ? 'failed' : 'stable',
    commitDecision: 'notApplicable',
    message: traceMessageForStatus(status),
  });
}

function buildEquationOoeTraceEvents(
  status: EquationOoePilotStatus,
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
  })) ?? [];

  return [
    buildEquationOoeStatusTraceEvent(status),
    ...stageEvents,
    buildOoeFinalOutcomeTraceEvent({
      planId: OOE_EQUATION_SOLVE_PLAN_ID,
      nodeId: OOE_EQUATION_SOLVE_NODE_ID,
      capabilityId: OOE_EQUATION_SOLVE_CAPABILITY_ID,
      hostId: OOE_EQUATION_SOLVE_HOST_ID,
      phaseId: OOE_EQUATION_SOLVE_PHASE_ID,
    }),
  ];
}

export function buildEquationOoePilotMetadata(
  status: EquationOoePilotStatus,
  guardedTrace?: GuardedEquationStageReplayTrace,
): EquationOoePilotMetadata {
  return {
    planId: OOE_EQUATION_SOLVE_PLAN_ID,
    capabilityId: OOE_EQUATION_SOLVE_CAPABILITY_ID,
    hostId: OOE_EQUATION_SOLVE_HOST_ID,
    status,
    stageOrder: listSharedEquationSolveStageOrder(),
    guardedTrace,
    traceEvents: buildEquationOoeTraceEvents(status, guardedTrace),
  };
}

export async function runSharedEquationSolveWithOoePilot(
  request: SharedSolveRequest,
): Promise<EquationOoePilotSolveResult> {
  const status = await prepareEquationOoePilot();
  const traced = runSharedEquationSolveWithTrace(request);
  return {
    outcome: traced.outcome,
    ooePilot: buildEquationOoePilotMetadata(status, traced.trace),
  };
}
