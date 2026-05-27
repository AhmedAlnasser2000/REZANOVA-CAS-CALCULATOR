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
  type OoeValidationError,
} from './ooe-bridge';

export const OOE_EQUATION_SOLVE_PLAN_ID = 'plan.equation.solve' as const;
export const OOE_EQUATION_SOLVE_CAPABILITY_ID = 'equation.solve' as const;
export const OOE_EQUATION_SOLVE_HOST_ID = 'equation-runtime' as const;

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
