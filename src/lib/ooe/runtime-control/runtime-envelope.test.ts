import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getBuiltinOoePlan,
  validateOoePlan,
  type OoePlan,
} from '../ooe-bridge';
import {
  buildCoarseLifecycleOoeTraceEvents,
  buildOoeRuntimeEnvelope,
  prepareOoePlanPreflight,
  type OoePilotDefinition,
} from './runtime-envelope';
import { buildOoeJobCommitContext } from '../job-launch/job-contract';

vi.mock('../ooe-bridge', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../ooe-bridge')>();
  return {
    ...actual,
    getBuiltinOoePlan: vi.fn(),
    validateOoePlan: vi.fn(),
  };
});

const definition: OoePilotDefinition = {
  planId: 'plan.test.route',
  capabilityId: 'test.route',
  hostId: 'test-runtime',
  nodeId: 'node.test.route',
  phaseId: 'test.route',
};

function validPlan(): OoePlan {
  return {
    id: definition.planId,
    schemaVersion: 1,
    nodes: [
      {
        id: definition.nodeId,
        capabilityId: definition.capabilityId,
        hostId: definition.hostId,
        phaseId: definition.phaseId,
        taskClass: 'explicit',
        priorityClass: 'userVisible',
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

const jobContext = buildOoeJobCommitContext(definition, { request: { latex: '2+2' } });

describe('OOE runtime envelope', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('wraps payload and metadata without mutating the payload', () => {
    const payload = { kind: 'payload', value: 42 };
    const ooe = {
      ...definition,
      status: { kind: 'ready' as const, planId: definition.planId },
      job: jobContext.job,
      commitAssessment: jobContext.commitAssessment,
      traceEvents: [],
    };

    const envelope = buildOoeRuntimeEnvelope(payload, ooe);

    expect(envelope).toEqual({ payload, ooe });
    expect(envelope.payload).toBe(payload);
    expect(envelope.ooe).toBe(ooe);
  });

  it('reports all fail-open preflight statuses', async () => {
    vi.mocked(getBuiltinOoePlan).mockResolvedValueOnce({
      kind: 'ready',
      data: validPlan(),
    });
    vi.mocked(validateOoePlan).mockResolvedValueOnce({
      kind: 'ready',
      data: { ok: true, errors: [] },
    });
    await expect(prepareOoePlanPreflight(definition)).resolves.toEqual({
      kind: 'ready',
      planId: definition.planId,
    });

    vi.mocked(getBuiltinOoePlan).mockResolvedValueOnce({
      kind: 'unavailable',
      reason: 'desktop-runtime-unavailable',
      data: null,
    });
    await expect(prepareOoePlanPreflight(definition)).resolves.toEqual({
      kind: 'unavailable',
      planId: definition.planId,
      reason: 'desktop-runtime-unavailable',
    });

    vi.mocked(getBuiltinOoePlan).mockResolvedValueOnce({
      kind: 'ready',
      data: null,
    });
    await expect(prepareOoePlanPreflight(definition)).resolves.toEqual({
      kind: 'missing-plan',
      planId: definition.planId,
    });

    vi.mocked(getBuiltinOoePlan).mockResolvedValueOnce({
      kind: 'ready',
      data: validPlan(),
    });
    vi.mocked(validateOoePlan).mockResolvedValueOnce({
      kind: 'ready',
      data: { ok: false, errors: [{ kind: 'missingTerminalResult' }] },
    });
    await expect(prepareOoePlanPreflight(definition)).resolves.toEqual({
      kind: 'invalid-plan',
      planId: definition.planId,
      errors: [{ kind: 'missingTerminalResult' }],
    });

    vi.mocked(getBuiltinOoePlan).mockRejectedValueOnce(new Error('invoke failed'));
    await expect(prepareOoePlanPreflight(definition)).resolves.toEqual({
      kind: 'bridge-error',
      planId: definition.planId,
      message: 'invoke failed',
    });
  });

  it('builds coarse lifecycle trace events', () => {
    const traceEvents = buildCoarseLifecycleOoeTraceEvents({
      definition,
      status: { kind: 'ready', planId: definition.planId },
      job: jobContext.job,
      commitAssessment: jobContext.commitAssessment,
      preflightMessage: 'preflight ready',
      startedMessage: 'runtime started',
      finalMessage: 'runtime stable',
    });

    expect(traceEvents).toHaveLength(3);
    expect(traceEvents[0]).toMatchObject({
      planId: definition.planId,
      status: 'completed',
      resultStability: 'stable',
      jobId: jobContext.job.jobId,
      inputRevisionId: jobContext.job.inputRevisionId,
      commitDecision: 'notApplicable',
      message: 'preflight ready',
    });
    expect(traceEvents[1]).toMatchObject({
      status: 'started',
      resultStability: 'draft',
      jobId: jobContext.job.jobId,
      inputRevisionId: jobContext.job.inputRevisionId,
      message: 'runtime started',
    });
    expect(traceEvents[2]).toMatchObject({
      status: 'completed',
      resultStability: 'stable',
      jobId: jobContext.job.jobId,
      inputRevisionId: jobContext.job.inputRevisionId,
      commitDecision: 'committed',
      message: 'runtime stable',
    });
  });
});
