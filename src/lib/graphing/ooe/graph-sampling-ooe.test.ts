import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getBuiltinOoeHost,
  getBuiltinOoePlan,
  validateOoePlan,
  type OoePlan,
} from '../../ooe/bridge-schema/ooe-bridge';
import {
  clearOoeJobRegistry,
  listActiveOoeJobs,
  listRecentOoeJobs,
} from '../../ooe/job-launch/active-job-registry';
import {
  clearOoeDiagnostics,
  getLatestOoeDiagnostics,
} from '../../ooe/diagnostics/diagnostics-buffer';
import { requestWorkspaceTabJobCancellation } from '../../../app/runtime/workspaceTabJobs';
import type { GraphSampleRequestV6 } from '../contracts';
import { runGraphSampleRequest } from '../sampling/request';
import { GraphSamplingApplicationHost } from './application-host';
import {
  probeGraphSamplingRuntime,
} from './runtime-probe';
import {
  prepareGraphSampleOoePilot,
  runGraphSampleWithOoe,
} from './pilot';
import type {
  GraphSamplingWorkerInboundMessage,
  GraphSamplingWorkerLike,
  GraphSamplingWorkerOutboundMessage,
} from './worker-contract';

vi.mock('../../ooe/bridge-schema/ooe-bridge', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../ooe/bridge-schema/ooe-bridge')>();
  return {
    ...actual,
    getBuiltinOoeHost: vi.fn(),
    getBuiltinOoePlan: vi.fn(),
    validateOoePlan: vi.fn(),
  };
});

function request(overrides: Partial<GraphSampleRequestV6> = {}): GraphSampleRequestV6 {
  return {
    version: 6,
    requestId: 'graph-request-1',
    workspaceInstanceId: 'graph-tab-1',
    documentId: 'graph-document-1',
    revisions: { scene: 4, mathematics: 1, viewport: 2, parameter: 3 },
    items: [{
      version: 1,
      kind: 'relation',
      itemId: 'curve-1',
      source: {
        sourceKind: 'mathlive-latex',
        sourceLatex: 'x',
        sourceRevision: 1,
      },
      relation: {
        kind: 'explicit-y',
        origin: 'bare-expression',
        rhs: { mathJson: 'x', freeSymbols: ['x'] },
      },
      visible: true,
    }],
    parameterEnvironment: {},
    viewport: {
      coordinateSystem: 'cartesian',
      xMin: -10,
      xMax: 10,
      yMin: -5,
      yMax: 5,
    },
    cssSize: { width: 1_000, height: 500 },
    overlays: { unitCircle: false },
    quality: 'preview',
    priority: { dependentItemIds: [] },
    movement: { panVelocityX: 0, panVelocityY: 0, zoomRatio: 1 },
    ...overrides,
  };
}

function graphPlan(): OoePlan {
  return {
    id: 'plan.graph.sample',
    schemaVersion: 1,
    nodes: [{
      id: 'node.graph.sample',
      capabilityId: 'graph.sample',
      hostId: 'graph-sampling-worker-runtime',
      phaseId: 'graph.sample',
      taskClass: 'explicit',
      priorityClass: 'userVisible',
      cancellationPolicy: 'hardStop',
      commitPolicy: 'commitLatestOnly',
      threadSafety: 'workerSafe',
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
    }],
  };
}

function mockReadyPlan() {
  vi.mocked(getBuiltinOoeHost).mockResolvedValue({
    kind: 'ready',
    data: {
      hostId: 'graph-sampling-worker-runtime',
      hostKind: 'webWorker',
      threadSafety: 'workerSafe',
      supportedTaskClasses: ['explicit'],
      budgetPolicy: 'isolated',
      cancellationPolicy: 'hardStop',
      defaultResultStability: 'draft',
      description: 'Graph sampling test host.',
    },
  });
  vi.mocked(getBuiltinOoePlan).mockResolvedValue({
    kind: 'ready',
    data: graphPlan(),
  });
  vi.mocked(validateOoePlan).mockResolvedValue({
    kind: 'ready',
    data: { ok: true, errors: [] },
  });
}

class FakeGraphWorker implements GraphSamplingWorkerLike {
  readonly messages = new Set<(event: MessageEvent<GraphSamplingWorkerOutboundMessage>) => void>();
  readonly errors = new Set<(event: Event) => void>();
  readonly behavior: 'complete' | 'mismatched' | 'silent';
  terminated = false;

  constructor(behavior: 'complete' | 'mismatched' | 'silent' = 'complete') {
    this.behavior = behavior;
  }

  addEventListener(type: 'message' | 'error', listener: never) {
    if (type === 'message') this.messages.add(listener);
    else this.errors.add(listener);
  }

  removeEventListener(type: 'message' | 'error', listener: never) {
    if (type === 'message') this.messages.delete(listener);
    else this.errors.delete(listener);
  }

  postMessage(message: GraphSamplingWorkerInboundMessage) {
    if (message.kind === 'cancel') return;
    if (this.behavior === 'silent') return;
    queueMicrotask(() => this.emit({ kind: 'started', requestId: message.requestId }));
    void runGraphSampleRequest(message.request).then((execution) => {
      this.emit({
        kind: 'completed',
        requestId: message.requestId,
        result: this.behavior === 'mismatched'
          ? { ...execution.result, requestId: 'wrong-graph-request' }
          : execution.result,
      });
    });
  }

  terminate() {
    this.terminated = true;
  }

  private emit(message: GraphSamplingWorkerOutboundMessage) {
    const event = { data: message } as MessageEvent<GraphSamplingWorkerOutboundMessage>;
    for (const listener of this.messages) listener(event);
  }
}

async function waitForActiveJob() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (listActiveOoeJobs().length > 0) return;
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
  throw new Error('Graph OOE job did not become active.');
}

async function waitForHostRequest(host: GraphSamplingApplicationHost) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (host.evidence.activeRequestCount === 1) return;
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
  throw new Error('Graph sampling host request did not become active.');
}

describe('Graph sampling OOE runtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearOoeJobRegistry();
    clearOoeDiagnostics();
    mockReadyPlan();
  });

  it('registers the dedicated plan without a History launch contract', async () => {
    await expect(prepareGraphSampleOoePilot()).resolves.toEqual({
      kind: 'ready',
      planId: 'plan.graph.sample',
    });
    expect(getBuiltinOoePlan).toHaveBeenCalledWith('plan.graph.sample');
  });

  it('reuses one application worker for sequential requests', async () => {
    const worker = new FakeGraphWorker();
    const host = new GraphSamplingApplicationHost({ createWorker: () => worker });
    const context = {
      registryId: 'test',
      shouldCancel: () => false,
      checkpoint: () => undefined,
      yieldIfBudgetExceeded: async () => false,
    };

    const first = await host.run(request(), context);
    const second = await host.run(request({ requestId: 'graph-request-2' }), context);

    expect(first.result.snapshotHash).toBe(second.result.snapshotHash);
    expect(host.evidence).toEqual({
      activeRequestCount: 0,
      workerGenerationCount: 1,
      hasRetainedWorker: true,
    });
    host.dispose();
    expect(worker.terminated).toBe(true);
  });

  it('supersedes ordinary work cooperatively without replacing the retained worker', async () => {
    const worker = new FakeGraphWorker();
    const host = new GraphSamplingApplicationHost({ createWorker: () => worker });
    const context = {
      registryId: 'test', shouldCancel: () => false, checkpoint: () => undefined,
      yieldIfBudgetExceeded: async () => false,
    };
    const firstPromise = host.run(request(), context);
    await waitForHostRequest(host);
    const second = await host.run(request({ requestId: 'graph-request-latest' }), context);
    const first = await firstPromise;

    expect(first.hostExecution).toMatchObject({ kind: 'worker-cancelled', termination: 'cooperative' });
    expect(second.hostExecution.kind).toBe('worker');
    expect(worker.terminated).toBe(false);
    expect(host.evidence.workerGenerationCount).toBe(1);
    host.dispose();
  });

  it('keeps worker and cooperative fallback scene semantics identical', async () => {
    const workerHost = new GraphSamplingApplicationHost({
      createWorker: () => new FakeGraphWorker(),
    });
    const fallbackHost = new GraphSamplingApplicationHost();
    const context = {
      registryId: 'test',
      shouldCancel: () => false,
      checkpoint: () => undefined,
      yieldIfBudgetExceeded: async () => false,
    };

    const worker = await workerHost.run(request(), context);
    const fallback = await fallbackHost.run(request(), context);

    expect(worker.result.snapshotHash).toBe(fallback.result.snapshotHash);
    expect(worker.result.evidence.vertexCount).toBe(fallback.result.evidence.vertexCount);
    expect(fallback.hostExecution.kind).toBe('fallback');
    workerHost.dispose();
    fallbackHost.dispose();
  });

  it('rejects a worker result that does not match the active request identity', async () => {
    const worker = new FakeGraphWorker('mismatched');
    const host = new GraphSamplingApplicationHost({ createWorker: () => worker });
    const context = {
      registryId: 'test',
      shouldCancel: () => false,
      checkpoint: () => undefined,
      yieldIfBudgetExceeded: async () => false,
    };

    await expect(host.run(request(), context)).rejects.toThrow(
      'result identity or revisions did not match the active request',
    );
    expect(worker.terminated).toBe(true);
    host.dispose();
  });

  it('hard-stops the active worker when its Graph tab requests cancellation', async () => {
    const worker = new FakeGraphWorker('silent');
    const host = new GraphSamplingApplicationHost({
      createWorker: () => worker,
      cancellationPollMs: 1,
    });
    const pending = runGraphSampleWithOoe(request(), { host });
    await waitForActiveJob();
    await waitForHostRequest(host);

    expect(requestWorkspaceTabJobCancellation('graph-tab-1', 'Graph tab became inactive.')).toBe(1);
    const envelope = await pending;

    expect(envelope.payload.status).toBe('cancelled');
    expect(envelope.ooe).toMatchObject({
      completion: { kind: 'cancelled' },
      graphHostExecution: {
        kind: 'worker-cancelled',
        termination: 'hardStop',
      },
      commitAssessment: {
        legality: 'notApplicable',
        commitDecision: 'notApplicable',
      },
    });
    expect(worker.terminated).toBe(true);
    expect(listRecentOoeJobs()[0]?.status).toBe('cancelled');
    host.dispose();
  });

  it('detaches a stale or closed result before it can flash', async () => {
    const host = new GraphSamplingApplicationHost({
      createWorker: () => new FakeGraphWorker(),
    });
    const envelope = await runGraphSampleWithOoe(request(), {
      host,
      activeInputRevisionId: 'input.graph.sample.newer',
      isWorkspaceInstanceOpen: () => false,
    });
    const coordinates = envelope.payload.scene.planarScene.paths[0]!.coordinates;

    expect(envelope.ooe.commitAssessment).toMatchObject({
      legality: 'staleDrop',
      commitDecision: 'staleDropped',
      workspaceInstanceOpen: false,
    });
    expect(envelope.ooe.releasedBufferBytes).toBeGreaterThan(0);
    expect(coordinates.byteLength).toBe(0);
    expect(getLatestOoeDiagnostics()).toMatchObject({
      terminalStatus: 'staleDropped',
      provenance: {
        mode: 'graphing',
        route: 'graph.sample',
      },
    });
    host.dispose();
  });

  it('probes a current fallback scene with no History launch ticket', async () => {
    const host = new GraphSamplingApplicationHost();
    const probe = await probeGraphSamplingRuntime(request(), { host });

    expect(probe).toMatchObject({
      ok: true,
      capabilityId: 'graph.sample',
      selectedHostId: 'graph-sampling-runtime',
      commitDecision: 'committed',
      launchTicketPresent: false,
    });
    expect(getLatestOoeDiagnostics()?.provenance?.runtimeShell?.launchTicket).toBeUndefined();
    host.dispose();
  });
});
