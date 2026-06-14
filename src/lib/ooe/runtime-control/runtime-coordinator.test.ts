import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearOoeJobRegistry,
  listActiveOoeJobs,
  listRecentOoeJobs,
  requestLatestOoeCapabilityCancellation,
} from '../job-launch/active-job-registry';
import {
  getBuiltinOoeHost,
  getBuiltinOoePlan,
  validateOoePlan,
  type OoeBuiltinHostDescriptor,
  type OoePlan,
} from '../bridge-schema/ooe-bridge';
import {
  clearOoeDiagnostics,
  listOoeDiagnostics,
} from '../diagnostics/diagnostics-buffer';
import {
  listOoeEvents,
  resetOoeEventOutboxForTests,
  type OoeEventType,
} from '../events/event-outbox';
import {
  buildCoarseLifecycleOoeTraceEvents,
  type OoePilotDefinition,
  type OoePilotStatus,
  type OoeRuntimeMetadata,
} from './runtime-envelope';
import { runOoeRuntimeJob } from './runtime-coordinator';
import type { OoeJobCommitContext } from '../job-launch/job-contract';

vi.mock('../bridge-schema/ooe-bridge', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../bridge-schema/ooe-bridge')>();
  return {
    ...actual,
    getBuiltinOoeHost: vi.fn(),
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

const declaredRuntimeCoordinatorEventTypes = [
  'ooe.job.started',
  'ooe.host.selected',
  'ooe.preflight.completed',
  'ooe.preflight.failed',
  'ooe.result.committed',
  'ooe.result.staleDropped',
  'ooe.result.skipped',
  'ooe.job.cancelled',
  'ooe.job.failed',
  'ooe.job.completed',
] satisfies OoeEventType[];

const runtimeCoordinatorEventCoverage = {
  'ooe.job.started': true,
  'ooe.host.selected': true,
  'ooe.preflight.completed': true,
  'ooe.preflight.failed': true,
  'ooe.result.committed': true,
  'ooe.result.staleDropped': true,
  'ooe.result.skipped': true,
  'ooe.job.cancelled': true,
  'ooe.job.failed': true,
  'ooe.job.completed': true,
} satisfies Record<OoeEventType, true>;

const hostDescriptor: OoeBuiltinHostDescriptor = {
  hostId: definition.hostId,
  hostKind: 'mainThreadTypeScript',
  threadSafety: 'mainThreadOnly',
  supportedTaskClasses: ['explicit'],
  budgetPolicy: 'unbudgeted',
  cancellationPolicy: 'staleDrop',
  defaultResultStability: 'draft',
  description: 'Test main-thread TypeScript host.',
};

type TestMetadata = OoeRuntimeMetadata & {
  routeKind: 'test';
};

type BuildTestMetadataInput = {
  payload: TestPayload;
  status: OoePilotStatus;
  jobContext: OoeJobCommitContext;
  controlTraceEvents?: readonly ReturnType<typeof buildCoarseLifecycleOoeTraceEvents>[number][];
};

function validPlan(planDefinition: OoePilotDefinition = definition): OoePlan {
  return {
    id: planDefinition.planId,
    schemaVersion: 1,
    nodes: [
      {
        id: planDefinition.nodeId,
        capabilityId: planDefinition.capabilityId,
        hostId: planDefinition.hostId,
        phaseId: planDefinition.phaseId,
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

function mockReadyPlan(planDefinition: OoePilotDefinition = definition) {
  vi.mocked(getBuiltinOoeHost).mockResolvedValue({
    kind: 'ready',
    data: {
      ...hostDescriptor,
      hostId: planDefinition.hostId,
    },
  });
  vi.mocked(getBuiltinOoePlan).mockResolvedValue({
    kind: 'ready',
    data: validPlan(planDefinition),
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
    resetOoeEventOutboxForTests();
  });

  it('accounts for every declared OOE runtime lifecycle event type', () => {
    expect(Object.keys(runtimeCoordinatorEventCoverage).sort()).toEqual(
      [...declaredRuntimeCoordinatorEventTypes].sort(),
    );
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
      hostAdapter: {
        kind: 'ready',
        hostId: definition.hostId,
        descriptor: hostDescriptor,
      },
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
      hostAdapter: {
        status: 'ready',
        hostId: definition.hostId,
        hostKind: 'mainThreadTypeScript',
        budgetPolicy: 'unbudgeted',
      },
    });
    expect(listOoeEvents().map((event) => event.type)).toEqual([
      'ooe.job.started',
      'ooe.host.selected',
      'ooe.preflight.completed',
      'ooe.result.committed',
      'ooe.job.completed',
    ]);
    expect(listOoeEvents()[0]).toMatchObject({
      jobId: envelope.ooe.job.jobId,
      registryId: expect.stringMatching(/^ooe-job-/u),
      planId: definition.planId,
      capabilityId: definition.capabilityId,
      hostId: definition.hostId,
      routeLabel: 'test.route',
    });
    expect(listOoeEvents()[0]).not.toHaveProperty('compartmentId');
  });

  it('labels runtime lifecycle facts with known compartment metadata', async () => {
    const equationDefinition: OoePilotDefinition = {
      planId: 'plan.equation.solve',
      capabilityId: 'equation.solve',
      hostId: 'equation-runtime',
      nodeId: 'node.equation.solve',
      phaseId: 'equation.solve',
    };
    mockReadyPlan(equationDefinition);

    const envelope = await runOoeRuntimeJob({
      definition: equationDefinition,
      routeLabel: 'equation.solve',
      routeSnapshot: { latex: 'x=1' },
      run: () => ({ value: 1 }),
      buildMetadata: ({ status, jobContext }) => ({
        ...equationDefinition,
        routeKind: 'test' as const,
        status,
        job: jobContext.job,
        commitAssessment: jobContext.commitAssessment,
        traceEvents: [],
      }),
    });

    expect(envelope.ooe.capabilityId).toBe('equation.solve');
    expect(listOoeEvents()).toHaveLength(5);
    expect(listOoeEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'ooe.job.started',
          compartmentId: 'equation',
          compartmentLabel: 'Equation',
        }),
        expect.objectContaining({
          type: 'ooe.result.committed',
          compartmentId: 'equation',
          compartmentLabel: 'Equation',
        }),
      ]),
    );
  });

  it('keeps fail-open preflight statuses from blocking the runtime payload', async () => {
    vi.mocked(getBuiltinOoeHost).mockResolvedValue({
      kind: 'ready',
      data: hostDescriptor,
    });
    vi.mocked(getBuiltinOoePlan).mockResolvedValueOnce({
      kind: 'ready',
      data: validPlan(),
    }).mockResolvedValueOnce({
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
    expect(envelope.ooe.hostAdapter).toMatchObject({
      kind: 'ready',
      hostId: definition.hostId,
    });
    expect(listRecentOoeJobs()[0]).toMatchObject({
      status: 'completed',
    });
    expect(listOoeDiagnostics()[0]).toMatchObject({
      terminalStatus: 'completed',
    });
    expect(listOoeEvents().map((event) => event.type)).toEqual([
      'ooe.job.started',
      'ooe.host.selected',
      'ooe.preflight.failed',
      'ooe.result.committed',
      'ooe.job.completed',
    ]);
    expect(listOoeEvents()[2]).toMatchObject({
      severity: 'warning',
      payload: {
        status: 'unavailable',
        reason: 'desktop-runtime-unavailable',
      },
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
    expect(listOoeEvents().map((event) => event.type)).toContain('ooe.result.staleDropped');
  });

  it('emits skipped result lifecycle facts when commit-if-current has no active revision', async () => {
    mockReadyPlan();

    const envelope = await runOoeRuntimeJob({
      definition,
      routeLabel: 'test.route',
      routeSnapshot: { latex: 'detached-result' },
      options: {
        commitPolicy: 'commitIfCurrent',
        activeInputRevisionId: null,
      },
      run: () => ({ value: 13 }),
      buildMetadata,
    });

    expect(envelope.ooe.commitAssessment).toMatchObject({
      activeInputRevisionId: null,
      commitPolicy: 'commitIfCurrent',
      legality: 'skipped',
      commitDecision: 'skipped',
      resultStability: 'stale',
    });
    expect(listRecentOoeJobs()[0]).toMatchObject({
      status: 'skipped',
      jobId: envelope.ooe.job.jobId,
      commitAssessment: {
        legality: 'skipped',
        commitDecision: 'skipped',
        resultStability: 'stale',
      },
    });
    expect(listOoeDiagnostics()[0]).toMatchObject({
      terminalStatus: 'skipped',
      jobId: envelope.ooe.job.jobId,
      commitAssessment: {
        legality: 'skipped',
        commitDecision: 'skipped',
        resultStability: 'stale',
      },
    });
    const events = listOoeEvents();
    expect(events.map((event) => event.type)).toEqual([
      'ooe.job.started',
      'ooe.host.selected',
      'ooe.preflight.completed',
      'ooe.result.skipped',
      'ooe.job.completed',
    ]);
    expect(events.find((event) => event.type === 'ooe.result.skipped')).toMatchObject({
      payload: {
        commitDecision: 'skipped',
        resultStability: 'stale',
        legality: 'skipped',
      },
    });
    expect(events.at(-1)).toMatchObject({
      type: 'ooe.job.completed',
      payload: {
        terminalStatus: 'skipped',
      },
    });
  });

  it('passes cooperative context and records cancelled jobs without treating them as failures', async () => {
    mockReadyPlan();
    const payload: TestPayload = { value: 0 };

    const envelope = await runOoeRuntimeJob({
      definition,
      routeLabel: 'test.route',
      routeSnapshot: { latex: 'cancel-me' },
      cooperativeBudget: { sliceMs: 0 },
      run: async (context) => {
        expect(context.registryId).toMatch(/^ooe-job-/u);
        expect(context.shouldCancel()).toBe(false);
        context.checkpoint('test checkpoint reached');
        requestLatestOoeCapabilityCancellation(definition.capabilityId, {
          requestedBy: 'test',
          reason: 'unit test cancellation',
        });
        await context.yieldIfBudgetExceeded('test runtime yielded');
        expect(context.shouldCancel()).toBe(true);
        return payload;
      },
      buildMetadata: ({ status, jobContext, controlTraceEvents }) => ({
        ...buildMetadata({ payload, status, jobContext }),
        completion: {
          kind: 'cancelled',
          reason: 'unit test cancellation',
        },
        commitAssessment: {
          ...jobContext.commitAssessment,
          legality: 'notApplicable',
          commitDecision: 'notApplicable',
          resultStability: 'stale',
        },
        traceEvents: [...controlTraceEvents],
      }),
    });

    expect(envelope.payload).toBe(payload);
    expect(envelope.ooe.completion).toEqual({
      kind: 'cancelled',
      reason: 'unit test cancellation',
    });
    expect(listActiveOoeJobs()).toEqual([]);
    expect(listRecentOoeJobs()[0]).toMatchObject({
      routeLabel: 'test.route',
      status: 'cancelled',
      cancellationRequest: {
        requestedBy: 'test',
        reason: 'unit test cancellation',
      },
      commitAssessment: {
        commitDecision: 'notApplicable',
        resultStability: 'stale',
      },
    });
    expect(listOoeDiagnostics()[0]).toMatchObject({
      routeLabel: 'test.route',
      terminalStatus: 'cancelled',
      commitAssessment: {
        commitDecision: 'notApplicable',
        resultStability: 'stale',
      },
    });
    expect(listOoeDiagnostics()[0].traceEvents.map((event) => event.status)).toEqual([
      'provisionalReady',
      'slowPhase',
    ]);
    expect(listOoeEvents().map((event) => event.type)).toEqual([
      'ooe.job.started',
      'ooe.host.selected',
      'ooe.preflight.completed',
      'ooe.job.cancelled',
    ]);
    expect(listOoeEvents().map((event) => event.type)).not.toContain('ooe.yield.performed');
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
      hostAdapter: {
        status: 'ready',
        hostId: definition.hostId,
      },
      commitAssessment: {
        commitDecision: 'notApplicable',
        resultStability: 'failed',
      },
    });
    expect(listOoeEvents().at(-1)).toMatchObject({
      type: 'ooe.job.failed',
      severity: 'error',
      payload: { errorMessage: 'runtime exploded' },
    });
  });
});
