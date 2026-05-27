import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GuardedSolveRequest } from '../../types/calculator';
import {
  listGuardedEquationStageDescriptors,
  runGuardedEquationSolve,
} from '../equation/guarded-solve';
import {
  getBuiltinOoePlan,
  validateOoePlan,
  type OoePlan,
} from './ooe-bridge';
import {
  OOE_EQUATION_SOLVE_PLAN_ID,
  prepareEquationOoePilot,
  runSharedEquationSolveWithOoePilot,
} from './equation-pilot';

vi.mock('./ooe-bridge', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./ooe-bridge')>();
  return {
    ...actual,
    getBuiltinOoePlan: vi.fn(),
    validateOoePlan: vi.fn(),
  };
});

const validEquationPlan: OoePlan = {
  id: OOE_EQUATION_SOLVE_PLAN_ID,
  schemaVersion: 1,
  nodes: [
    {
      id: 'node.equation.solve',
      capabilityId: 'equation.solve',
      hostId: 'equation-runtime',
      phaseId: 'equation.solve',
      taskClass: 'explicit',
      priorityClass: 'userBlocking',
      cancellationPolicy: 'staleDrop',
      commitPolicy: 'commitLatestOnly',
      threadSafety: 'mainThreadOnly',
      resultStability: 'draft',
      dependsOn: [],
      isTerminalResult: true,
    },
  ],
};

const guardedRequest: GuardedSolveRequest = {
  originalLatex: 'x^2-5x+6=0',
  resolvedLatex: 'x^2-5x+6=0',
  angleUnit: 'deg',
  outputStyle: 'both',
  ansLatex: '0',
};

function mockReadyPlan() {
  vi.mocked(getBuiltinOoePlan).mockResolvedValue({
    kind: 'ready',
    data: validEquationPlan,
  });
  vi.mocked(validateOoePlan).mockResolvedValue({
    kind: 'ready',
    data: { ok: true, errors: [] },
  });
}

describe('Equation OOE pilot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports ready when Rust returns and validates the equation solve plan', async () => {
    mockReadyPlan();

    await expect(prepareEquationOoePilot()).resolves.toEqual({
      kind: 'ready',
      planId: OOE_EQUATION_SOLVE_PLAN_ID,
    });
  });

  it('reports unavailable without blocking the solve', async () => {
    vi.mocked(getBuiltinOoePlan).mockResolvedValue({
      kind: 'unavailable',
      reason: 'desktop-runtime-unavailable',
      data: null,
    });

    const result = await runSharedEquationSolveWithOoePilot(guardedRequest);

    expect(result.ooePilot.status).toEqual({
      kind: 'unavailable',
      planId: OOE_EQUATION_SOLVE_PLAN_ID,
      reason: 'desktop-runtime-unavailable',
    });
    expect(result.outcome).toEqual(runGuardedEquationSolve(guardedRequest));
  });

  it('reports missing, invalid, and bridge-error states as data', async () => {
    vi.mocked(getBuiltinOoePlan).mockResolvedValueOnce({
      kind: 'ready',
      data: null,
    });
    await expect(prepareEquationOoePilot()).resolves.toEqual({
      kind: 'missing-plan',
      planId: OOE_EQUATION_SOLVE_PLAN_ID,
    });

    vi.mocked(getBuiltinOoePlan).mockResolvedValueOnce({
      kind: 'ready',
      data: validEquationPlan,
    });
    vi.mocked(validateOoePlan).mockResolvedValueOnce({
      kind: 'ready',
      data: { ok: false, errors: [{ kind: 'missingTerminalResult' }] },
    });
    await expect(prepareEquationOoePilot()).resolves.toEqual({
      kind: 'invalid-plan',
      planId: OOE_EQUATION_SOLVE_PLAN_ID,
      errors: [{ kind: 'missingTerminalResult' }],
    });

    vi.mocked(getBuiltinOoePlan).mockRejectedValueOnce(new Error('invoke failed'));
    await expect(prepareEquationOoePilot()).resolves.toEqual({
      kind: 'bridge-error',
      planId: OOE_EQUATION_SOLVE_PLAN_ID,
      message: 'invoke failed',
    });
  });

  it('captures the guarded stage order, attempts, and winning stage', async () => {
    mockReadyPlan();

    const result = await runSharedEquationSolveWithOoePilot(guardedRequest);

    expect(result.ooePilot.stageOrder).toEqual(
      listGuardedEquationStageDescriptors().map((stage) => stage.id),
    );
    expect(result.ooePilot.guardedTrace?.attempts.length).toBeGreaterThan(0);
    expect(result.ooePilot.guardedTrace?.winningStageId).toBeDefined();
  });

  it('keeps traced guarded solve outcomes identical to the current guarded solve', async () => {
    mockReadyPlan();

    const success = await runSharedEquationSolveWithOoePilot(guardedRequest);
    expect(success.outcome).toEqual(runGuardedEquationSolve(guardedRequest));

    const unsupportedRequest: GuardedSolveRequest = {
      ...guardedRequest,
      originalLatex: 'x+e^x=1',
      resolvedLatex: 'x+e^x=1',
    };
    const unsupported = await runSharedEquationSolveWithOoePilot(unsupportedRequest);
    expect(unsupported.outcome).toEqual(runGuardedEquationSolve(unsupportedRequest));
  });
});
