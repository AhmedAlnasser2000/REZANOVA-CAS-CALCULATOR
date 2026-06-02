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
import {
  clearOoeJobRegistry,
  listActiveOoeJobs,
  listRecentOoeJobs,
} from './active-job-registry';
import {
  clearOoeDiagnostics,
  getLatestOoeDiagnostics,
} from './diagnostics-buffer';
import {
  buildOoeFinalOutcomeTraceEvent,
  buildOoeStageAttemptTraceEvent,
  buildOoeTraceEvent,
} from './trace';

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
      solverMode: 'classic',
      chunkingPolicy: 'none',
      checkpointPolicy: 'none',
      streamingPolicy: 'finalOnly',
      materializationPolicy: 'full',
      computeTopology: 'local',
      resourcePolicy: 'normal',
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
    clearOoeJobRegistry();
    clearOoeDiagnostics();
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

    expect(result.ooe.status).toEqual({
      kind: 'unavailable',
      planId: OOE_EQUATION_SOLVE_PLAN_ID,
      reason: 'desktop-runtime-unavailable',
    });
    expect(result.payload).toEqual(runGuardedEquationSolve(guardedRequest));
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

    expect(result.ooe.stageOrder).toEqual(
      listGuardedEquationStageDescriptors().map((stage) => stage.id),
    );
    expect(result.ooe.guardedTrace?.attempts.length).toBeGreaterThan(0);
    expect(result.ooe.guardedTrace?.winningStageId).toBeDefined();
    expect(result.ooe.job.jobId).toMatch(/^job\.equation\.solve\.[a-z0-9]+$/u);
    expect(result.ooe.job.inputRevisionId).toMatch(/^input\.equation\.solve\.[a-z0-9]+$/u);
    expect(result.ooe.commitAssessment).toMatchObject({
      job: result.ooe.job,
      activeInputRevisionId: result.ooe.job.inputRevisionId,
      legality: 'commitAllowed',
      commitDecision: 'committed',
      resultStability: 'stable',
    });
    expect(result.ooe.traceEvents[0]).toMatchObject({
      planId: OOE_EQUATION_SOLVE_PLAN_ID,
      status: 'completed',
      resultStability: 'stable',
      jobId: result.ooe.job.jobId,
      inputRevisionId: result.ooe.job.inputRevisionId,
      commitDecision: 'notApplicable',
    });
    expect(result.ooe.traceEvents.some((event) => (
      event.stageId === result.ooe.guardedTrace?.winningStageId
      && event.jobId === result.ooe.job.jobId
      && event.inputRevisionId === result.ooe.job.inputRevisionId
    ))).toBe(true);
    expect(result.ooe.traceEvents.at(-1)).toMatchObject({
      status: 'completed',
      resultStability: 'stable',
      jobId: result.ooe.job.jobId,
      inputRevisionId: result.ooe.job.inputRevisionId,
      commitDecision: 'committed',
      message: 'Equation pilot produced a stable DisplayOutcome.',
    });
    expect(listActiveOoeJobs()).toEqual([]);
    expect(listRecentOoeJobs()[0]).toMatchObject({
      jobId: result.ooe.job.jobId,
      routeLabel: 'equation.solve',
      status: 'completed',
    });
    expect(getLatestOoeDiagnostics()).toMatchObject({
      jobId: result.ooe.job.jobId,
      routeLabel: 'equation.solve',
      terminalStatus: 'completed',
      provenance: {
        mode: 'equation',
        depth: 'rich',
        equation: {
          domainIntent: 'real',
          stageOrder: result.ooe.stageOrder,
          winningStageId: result.ooe.guardedTrace?.winningStageId,
        },
      },
    });
  });

  it('keeps traced guarded solve outcomes identical to the current guarded solve', async () => {
    mockReadyPlan();

    const success = await runSharedEquationSolveWithOoePilot(guardedRequest);
    expect(success.payload).toEqual(runGuardedEquationSolve(guardedRequest));

    const unsupportedRequest: GuardedSolveRequest = {
      ...guardedRequest,
      originalLatex: 'x+e^x=1',
      resolvedLatex: 'x+e^x=1',
    };
    const unsupported = await runSharedEquationSolveWithOoePilot(unsupportedRequest);
    expect(unsupported.payload).toEqual(runGuardedEquationSolve(unsupportedRequest));
  });

  it('records stale commit assessments as metadata without blocking equation payloads', async () => {
    mockReadyPlan();

    const result = await runSharedEquationSolveWithOoePilot(guardedRequest, {
      activeInputRevisionId: 'input.equation.solve.stale',
    });

    expect(result.payload).toEqual(runGuardedEquationSolve(guardedRequest));
    expect(result.ooe.commitAssessment).toMatchObject({
      activeInputRevisionId: 'input.equation.solve.stale',
      legality: 'staleDrop',
      commitDecision: 'staleDropped',
      resultStability: 'stale',
    });
    expect(result.ooe.traceEvents.at(-1)).toMatchObject({
      jobId: result.ooe.job.jobId,
      inputRevisionId: result.ooe.job.inputRevisionId,
      commitDecision: 'staleDropped',
    });
    expect(listActiveOoeJobs()).toEqual([]);
    expect(listRecentOoeJobs()[0]).toMatchObject({
      jobId: result.ooe.job.jobId,
      routeLabel: 'equation.solve',
      status: 'staleDropped',
    });
  });

  it('builds deterministic trace events for validation, stage attempts, and final outcomes', () => {
    expect(buildOoeTraceEvent({
      planId: OOE_EQUATION_SOLVE_PLAN_ID,
      status: 'completed',
      resultStability: 'stable',
      capabilityId: 'equation.solve',
      hostId: 'equation-runtime',
      phaseId: 'equation.solve',
      commitDecision: 'notApplicable',
      message: 'valid plan',
    })).toEqual({
      traceId: null,
      jobId: null,
      planId: OOE_EQUATION_SOLVE_PLAN_ID,
      nodeId: null,
      capabilityId: 'equation.solve',
      hostId: 'equation-runtime',
      phaseId: 'equation.solve',
      stageId: null,
      inputRevisionId: null,
      status: 'completed',
      resultStability: 'stable',
      durationMs: null,
      commitDecision: 'notApplicable',
      message: 'valid plan',
    });

    expect(buildOoeStageAttemptTraceEvent({
      planId: OOE_EQUATION_SOLVE_PLAN_ID,
      nodeId: 'node.equation.solve',
      capabilityId: 'equation.solve',
      hostId: 'equation-runtime',
      phaseId: 'equation.solve',
      stageId: 'direct-symbolic',
      depth: 0,
      returnedOutcome: true,
    })).toMatchObject({
      stageId: 'direct-symbolic',
      status: 'provisionalReady',
      resultStability: 'provisional',
      commitDecision: 'notApplicable',
    });

    expect(buildOoeFinalOutcomeTraceEvent({
      planId: OOE_EQUATION_SOLVE_PLAN_ID,
      nodeId: 'node.equation.solve',
      capabilityId: 'equation.solve',
      hostId: 'equation-runtime',
      phaseId: 'equation.solve',
    })).toMatchObject({
      status: 'completed',
      resultStability: 'stable',
      commitDecision: 'notApplicable',
    });
  });
});
