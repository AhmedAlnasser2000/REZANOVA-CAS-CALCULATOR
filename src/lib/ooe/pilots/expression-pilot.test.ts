import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CalculateAction } from '../../../types/calculator';
import {
  runCalculateMode,
  runCalculateModeWithOoePilot,
  type RunCalculateModeRequest,
} from '../../modes/calculate';
import {
  getBuiltinOoePlan,
  validateOoePlan,
  type OoePlan,
} from '../bridge-schema/ooe-bridge';
import {
  buildExpressionOoePilotMetadata,
  prepareExpressionOoePilot,
  runExpressionWithOoePilot,
} from './expression-pilot';
import {
  clearOoeJobRegistry,
  listActiveOoeJobs,
  listRecentOoeJobs,
} from '../job-launch/active-job-registry';
import {
  clearOoeDiagnostics,
  getLatestOoeDiagnostics,
} from '../diagnostics/diagnostics-buffer';

vi.mock('../bridge-schema/ooe-bridge', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../bridge-schema/ooe-bridge')>();
  return {
    ...actual,
    getBuiltinOoePlan: vi.fn(),
    validateOoePlan: vi.fn(),
  };
});

const actions: CalculateAction[] = ['evaluate', 'simplify', 'factor', 'expand'];

function expressionPlan(action: CalculateAction): OoePlan {
  return {
    id: `plan.expression.${action}`,
    schemaVersion: 1,
    nodes: [
      {
        id: `node.expression.${action}`,
        capabilityId: `expression.${action}`,
        hostId: 'expression-runtime',
        phaseId: `expression.${action}`,
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
}

function calculateRequest(action: CalculateAction, latex = '2+2'): RunCalculateModeRequest {
  return {
    action,
    latex,
    angleUnit: 'deg',
    outputStyle: 'both',
    ansLatex: '0',
    calculateScreen: 'standard',
  };
}

function mockReadyExpressionPlans() {
  vi.mocked(getBuiltinOoePlan).mockImplementation(async (planId) => ({
    kind: 'ready',
    data: expressionPlan(planId.replace('plan.expression.', '') as CalculateAction),
  }));
  vi.mocked(validateOoePlan).mockResolvedValue({
    kind: 'ready',
    data: { ok: true, errors: [] },
  });
}

describe('Expression OOE pilot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearOoeJobRegistry();
    clearOoeDiagnostics();
  });

  it('reports ready for each standard Calculate action when the matching plan validates', async () => {
    mockReadyExpressionPlans();

    for (const action of actions) {
      await expect(prepareExpressionOoePilot(action)).resolves.toEqual({
        kind: 'ready',
        planId: `plan.expression.${action}`,
      });
    }

    expect(getBuiltinOoePlan).toHaveBeenCalledTimes(actions.length);
    expect(validateOoePlan).toHaveBeenCalledTimes(actions.length);
  });

  it('reports fail-open unavailable, missing, invalid, and bridge-error states', async () => {
    vi.mocked(getBuiltinOoePlan).mockResolvedValueOnce({
      kind: 'unavailable',
      reason: 'desktop-runtime-unavailable',
      data: null,
    });
    const unavailable = await runExpressionWithOoePilot('evaluate', () => runCalculateMode(calculateRequest('evaluate')));
    expect(unavailable.ooe.status).toEqual({
      kind: 'unavailable',
      planId: 'plan.expression.evaluate',
      reason: 'desktop-runtime-unavailable',
    });
    expect(unavailable.payload).toEqual(runCalculateMode(calculateRequest('evaluate')));

    vi.mocked(getBuiltinOoePlan).mockResolvedValueOnce({
      kind: 'ready',
      data: null,
    });
    await expect(prepareExpressionOoePilot('simplify')).resolves.toEqual({
      kind: 'missing-plan',
      planId: 'plan.expression.simplify',
    });

    vi.mocked(getBuiltinOoePlan).mockResolvedValueOnce({
      kind: 'ready',
      data: expressionPlan('factor'),
    });
    vi.mocked(validateOoePlan).mockResolvedValueOnce({
      kind: 'ready',
      data: { ok: false, errors: [{ kind: 'missingTerminalResult' }] },
    });
    await expect(prepareExpressionOoePilot('factor')).resolves.toEqual({
      kind: 'invalid-plan',
      planId: 'plan.expression.factor',
      errors: [{ kind: 'missingTerminalResult' }],
    });

    vi.mocked(getBuiltinOoePlan).mockRejectedValueOnce(new Error('invoke failed'));
    await expect(prepareExpressionOoePilot('expand')).resolves.toEqual({
      kind: 'bridge-error',
      planId: 'plan.expression.expand',
      message: 'invoke failed',
    });
  });

  it('keeps wrapped Calculate outcomes identical for evaluate, simplify, factor, and expand', async () => {
    mockReadyExpressionPlans();
    const cases: Array<[CalculateAction, string]> = [
      ['evaluate', '\\frac{1}{3}+\\frac{1}{6}'],
      ['simplify', 'x+0'],
      ['factor', 'x^2-1'],
      ['expand', '(x+1)^2'],
    ];

    for (const [action, latex] of cases) {
      const request = calculateRequest(action, latex);
      const wrapped = await runCalculateModeWithOoePilot(request);
      expect(wrapped.payload).toEqual(runCalculateMode(request));
      expect(wrapped.ooe.job.jobId).toMatch(new RegExp(`^job\\.expression\\.${action}\\.[a-z0-9]+$`, 'u'));
      expect(wrapped.ooe.job.inputRevisionId).toMatch(new RegExp(`^input\\.expression\\.${action}\\.[a-z0-9]+$`, 'u'));
      expect(wrapped.ooe.commitAssessment).toMatchObject({
        legality: 'commitAllowed',
        commitDecision: 'committed',
        resultStability: 'stable',
      });
      expect(listActiveOoeJobs()).toEqual([]);
      expect(listRecentOoeJobs()[0]).toMatchObject({
        jobId: wrapped.ooe.job.jobId,
        routeLabel: `expression.${action}`,
        status: 'completed',
      });
      expect(getLatestOoeDiagnostics()).toMatchObject({
        jobId: wrapped.ooe.job.jobId,
        routeLabel: `expression.${action}`,
        terminalStatus: 'completed',
        provenance: {
          mode: 'calculate',
          action,
          outputSummary: {
            kind: wrapped.payload.kind,
            title: wrapped.payload.title,
          },
        },
      });
    }
  });

  it('adds coarse lifecycle trace events without storing user-visible data', () => {
    const metadata = buildExpressionOoePilotMetadata('evaluate', {
      kind: 'ready',
      planId: 'plan.expression.evaluate',
    });

    expect(metadata).toMatchObject({
      action: 'evaluate',
      planId: 'plan.expression.evaluate',
      capabilityId: 'expression.evaluate',
      hostId: 'expression-runtime',
      nodeId: 'node.expression.evaluate',
      phaseId: 'expression.evaluate',
    });
    expect(metadata.job.jobId).toMatch(/^job\.expression\.evaluate\.[a-z0-9]+$/u);
    expect(metadata.job.inputRevisionId).toMatch(/^input\.expression\.evaluate\.[a-z0-9]+$/u);
    expect(metadata.commitAssessment).toMatchObject({
      job: metadata.job,
      activeInputRevisionId: metadata.job.inputRevisionId,
      legality: 'commitAllowed',
      commitDecision: 'committed',
      resultStability: 'stable',
    });
    expect(metadata.traceEvents).toHaveLength(3);
    expect(metadata.traceEvents[0]).toMatchObject({
      status: 'completed',
      resultStability: 'stable',
      jobId: metadata.job.jobId,
      inputRevisionId: metadata.job.inputRevisionId,
      commitDecision: 'notApplicable',
      message: 'OOE expression evaluate plan is available and valid.',
    });
    expect(metadata.traceEvents[1]).toMatchObject({
      status: 'started',
      resultStability: 'draft',
      jobId: metadata.job.jobId,
      inputRevisionId: metadata.job.inputRevisionId,
      commitDecision: 'notApplicable',
      message: 'Expression evaluate started through the TypeScript runtime.',
    });
    expect(metadata.traceEvents[2]).toMatchObject({
      status: 'completed',
      resultStability: 'stable',
      jobId: metadata.job.jobId,
      inputRevisionId: metadata.job.inputRevisionId,
      commitDecision: 'committed',
      message: 'Expression evaluate pilot produced a stable DisplayOutcome.',
    });
  });

  it('records stale commit assessments as metadata without blocking payloads', async () => {
    mockReadyExpressionPlans();
    const request = calculateRequest('evaluate', '3+4');

    const wrapped = await runExpressionWithOoePilot(
      'evaluate',
      () => runCalculateMode(request),
      { action: 'evaluate', request },
      { activeInputRevisionId: 'input.expression.evaluate.stale' },
    );

    expect(wrapped.payload).toEqual(runCalculateMode(request));
    expect(wrapped.ooe.commitAssessment).toMatchObject({
      activeInputRevisionId: 'input.expression.evaluate.stale',
      legality: 'staleDrop',
      commitDecision: 'staleDropped',
      resultStability: 'stale',
    });
    expect(wrapped.ooe.traceEvents.at(-1)).toMatchObject({
      jobId: wrapped.ooe.job.jobId,
      inputRevisionId: wrapped.ooe.job.inputRevisionId,
      commitDecision: 'staleDropped',
    });
    expect(listActiveOoeJobs()).toEqual([]);
    expect(listRecentOoeJobs()[0]).toMatchObject({
      jobId: wrapped.ooe.job.jobId,
      routeLabel: 'expression.evaluate',
      status: 'staleDropped',
    });
    expect(getLatestOoeDiagnostics()).toMatchObject({
      jobId: wrapped.ooe.job.jobId,
      terminalStatus: 'staleDropped',
      provenance: {
        route: 'expression.evaluate',
      },
    });
  });

  it('marks throwing wrapped runtimes as failed and rethrows', async () => {
    mockReadyExpressionPlans();

    await expect(runExpressionWithOoePilot('evaluate', () => {
      throw new Error('boom');
    })).rejects.toThrow('boom');

    expect(listActiveOoeJobs()).toEqual([]);
    expect(listRecentOoeJobs()[0]).toMatchObject({
      routeLabel: 'expression.evaluate',
      status: 'failed',
      errorMessage: 'boom',
    });
  });
});
