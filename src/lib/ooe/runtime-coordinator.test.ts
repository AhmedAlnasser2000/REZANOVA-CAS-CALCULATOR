import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearOoeJobRegistry,
  listActiveOoeJobs,
  listRecentOoeJobs,
} from './active-job-registry';
import {
  getBuiltinOoePlan,
  validateOoePlan,
  type OoePlan,
} from './ooe-bridge';
import {
  clearOoeDiagnostics,
  listOoeDiagnostics,
} from './diagnostics-buffer';
import {
  buildCoarseLifecycleOoeTraceEvents,
  type OoePilotDefinition,
  type OoePilotStatus,
  type OoeRuntimeMetadata,
} from './runtime-envelope';
import { runOoeRuntimeJob } from './runtime-coordinator';
import type { OoeJobCommitContext } from './job-contract';

vi.mock('./ooe-bridge', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./ooe-bridge')>();
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

type TestPayload = {
  value: number;
};

type TestMetadata = OoeRuntimeMetadata & {
  routeKind: 'test';
};

type BuildTestMetadataInput = {
  payload: TestPayload;
  status: OoePilotStatus;
  jobContext: OoeJobCommitContext;
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

function mockReadyPlan() {
  vi.mocked(getBuiltinOoePlan).mockResolvedValue({
    kind: 'ready',
    data: validPlan(),
  });
  vi.mocked(validateOoePlan).mockResolvedValue({
    kind: 'ready',
    data: { ok: true, errors: [] },
  });
}

function buildMetadata(input: BuildTestMetadataInput): TestMetadata {
  return {
    ...definition,
    routeKind: 'test',
    status: input.status,
    job: input.jobContext.job,
    commitAssessment: input.jobContext.commitAssessment,
    traceEvents: buildCoarseLifecycleOoeTraceEvents({
      definition,
      status: input.status,
      job: input.jobContext.job,
      commitAssessment: input.jobContext.commitAssessment,
      preflightMessage: 'preflight finished',
      startedMessage: 'runtime started',
      finalMessage: 'runtime finished',
    }),
  };
}

describe('OOE runtime coordinator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearOoeJobRegistry();
    clearOoeDiagnostics();
  });

  it('runs a job through preflight, active registry, completion, and envelope return', async () => {
    mockReadyPlan();
    const payload: TestPayload = { value: 42 };

    const envelope = await runOoeRuntimeJob({
      definition,
      routeLabel: 'test.route',
      routeSnapshot: { latex: '2+2' },
      run: () => {
        expect(listActiveOoeJobs()).toHaveLength(1);
        return payload;
      },
      buildMetadata,
    });

    expect(envelope.payload).toBe(payload);
    expect(envelope.ooe).toMatchObject({
      ...definition,
      routeKind: 'test',
      status: { kind: 'ready', planId: definition.planId },
      commitAssessment: {
        legality: 'commitAllowed',
        commitDecision: 'committed',
        resultStability: 'stable',
      },
    });
    expect(listActiveOoeJobs()).toEqual([]);
    expect(listRecentOoeJobs()[0]).toMatchObject({
      routeLabel: 'test.route',
      status: 'completed',
      jobId: envelope.ooe.job.jobId,
    });
    expect(listOoeDiagnostics()[0]).toMatchObject({
      routeLabel: 'test.route',
      terminalStatus: 'completed',
      jobId: envelope.ooe.job.jobId,
      commitAssessment: {
        commitDecision: 'committed',
      },
    });
  });

  it('keeps fail-open preflight statuses from blocking the runtime payload', async () => {
    vi.mocked(getBuiltinOoePlan).mockResolvedValueOnce({
      kind: 'unavailable',
      reason: 'desktop-runtime-unavailable',
      data: null,
    });
    const run = vi.fn(() => ({ value: 7 }));

    const envelope = await runOoeRuntimeJob({
      definition,
      routeLabel: 'test.route',
      routeSnapshot: { latex: '3+4' },
      run,
      buildMetadata,
    });

    expect(run).toHaveBeenCalledTimes(1);
    expect(envelope.payload).toEqual({ value: 7 });
    expect(envelope.ooe.status).toEqual({
      kind: 'unavailable',
      planId: definition.planId,
      reason: 'desktop-runtime-unavailable',
    });
    expect(listRecentOoeJobs()[0]).toMatchObject({
      status: 'completed',
    });
    expect(listOoeDiagnostics()[0]).toMatchObject({
      terminalStatus: 'completed',
    });
  });

  it('resolves active input revisions after runtime execution so stale commits are recorded', async () => {
    mockReadyPlan();
    let activeRevision = '';

    const envelope = await runOoeRuntimeJob({
      definition,
      routeLabel: 'test.route',
      routeSnapshot: { latex: 'x+1' },
      options: {
        activeInputRevisionId: () => activeRevision,
      },
      run: () => {
        activeRevision = 'input.test.route.changed';
        return { value: 9 };
      },
      buildMetadata,
    });

    expect(envelope.ooe.commitAssessment).toMatchObject({
      activeInputRevisionId: 'input.test.route.changed',
      legality: 'staleDrop',
      commitDecision: 'staleDropped',
      resultStability: 'stale',
    });
    expect(listActiveOoeJobs()).toEqual([]);
    expect(listRecentOoeJobs()[0]).toMatchObject({
      status: 'staleDropped',
      jobId: envelope.ooe.job.jobId,
    });
    expect(listOoeDiagnostics()[0]).toMatchObject({
      terminalStatus: 'staleDropped',
      jobId: envelope.ooe.job.jobId,
    });
  });

  it('marks throwing runtimes as failed and rethrows', async () => {
    mockReadyPlan();

    await expect(runOoeRuntimeJob({
      definition,
      routeLabel: 'test.route',
      routeSnapshot: { latex: 'bad' },
      run: () => {
        throw new Error('runtime exploded');
      },
      buildMetadata,
    })).rejects.toThrow('runtime exploded');

    expect(listActiveOoeJobs()).toEqual([]);
    expect(listRecentOoeJobs()[0]).toMatchObject({
      routeLabel: 'test.route',
      status: 'failed',
      errorMessage: 'runtime exploded',
    });
    expect(listOoeDiagnostics()[0]).toMatchObject({
      routeLabel: 'test.route',
      terminalStatus: 'failed',
      errorMessage: 'runtime exploded',
      commitAssessment: {
        commitDecision: 'notApplicable',
        resultStability: 'failed',
      },
    });
  });
});
