import { beforeEach, describe, expect, it } from 'vitest';
import type { RunGeometryRuntimeRequest } from '../geometry/runtime-input';
import { buildGeometryModeRunPayload } from '../geometry/runtime-run';
import { clearOoeJobRegistry, listRecentOoeJobs } from '../ooe/active-job-registry';
import { clearOoeDiagnostics, listOoeDiagnostics } from '../ooe/diagnostics-buffer';
import {
  runGeometryModeWithOoePilot,
} from './geometry';
import {
  runGeometryModeViaIsolatedWorker,
  type CreateGeometryWorker,
} from './worker-clients/geometry-worker-client';
import type {
  GeometryWorkerInboundMessage,
  GeometryWorkerOutboundMessage,
} from './worker-entrypoints/geometry.worker';

type Listener = (event: MessageEvent<GeometryWorkerOutboundMessage>) => void;
type ErrorListener = (event: Event) => void;

class FakeGeometryWorker {
  readonly listeners = new Set<Listener>();
  readonly errorListeners = new Set<ErrorListener>();
  terminated = false;
  private readonly behavior: 'complete' | 'fail' | 'silent';

  constructor(behavior: 'complete' | 'fail' | 'silent') {
    this.behavior = behavior;
  }

  addEventListener(type: 'message', listener: Listener): void;
  addEventListener(type: 'error', listener: ErrorListener): void;
  addEventListener(type: 'message' | 'error', listener: Listener | ErrorListener): void {
    if (type === 'message') {
      this.listeners.add(listener as Listener);
      return;
    }
    this.errorListeners.add(listener as ErrorListener);
  }

  removeEventListener(type: 'message', listener: Listener): void;
  removeEventListener(type: 'error', listener: ErrorListener): void;
  removeEventListener(type: 'message' | 'error', listener: Listener | ErrorListener): void {
    if (type === 'message') {
      this.listeners.delete(listener as Listener);
      return;
    }
    this.errorListeners.delete(listener as ErrorListener);
  }

  postMessage(message: GeometryWorkerInboundMessage) {
    if (this.behavior === 'silent') {
      return;
    }

    this.emit({
      kind: 'started',
      requestId: message.requestId,
    });

    if (this.behavior === 'fail') {
      this.emit({
        kind: 'failed',
        requestId: message.requestId,
        message: 'synthetic geometry worker failure',
      });
      return;
    }

    this.emit({
      kind: 'completed',
      requestId: message.requestId,
      payload: buildGeometryModeRunPayload(message.request),
    });
  }

  terminate() {
    this.terminated = true;
  }

  private emit(message: GeometryWorkerOutboundMessage) {
    const event = { data: message } as MessageEvent<GeometryWorkerOutboundMessage>;
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}

const representativeRequests: RunGeometryRuntimeRequest[] = [
  {
    inputLatex: 'square(side=4)',
    screenHint: 'square',
  },
  {
    inputLatex: 'sphere(radius=3)',
    screenHint: 'sphere',
  },
  {
    inputLatex: 'distance(p1=(0,0), p2=(3,4))',
    screenHint: 'distance',
  },
  {
    inputLatex: 'circle(radius=?, circumference=10*pi)',
    screenHint: 'circle',
  },
];

const createWorker = (behavior: 'complete' | 'fail' | 'silent'): CreateGeometryWorker =>
  () => new FakeGeometryWorker(behavior);

beforeEach(() => {
  clearOoeJobRegistry();
  clearOoeDiagnostics();
});

describe('geometry worker runtime shell', () => {
  it('returns worker payloads matching the main-thread Geometry core', async () => {
    for (const request of representativeRequests) {
      const result = await runGeometryModeWithOoePilot(request, {
        commitPolicy: 'alwaysCommit',
        createWorker: createWorker('complete'),
      });

      expect(result.payload).toEqual(buildGeometryModeRunPayload(request));
      expect(result.ooe.geometryHostExecution).toMatchObject({
        kind: 'worker',
        hostId: 'geometry-worker-runtime',
        terminalStatus: 'completed',
      });
      expect(result.ooe.runtimeShell).toMatchObject({
        shellId: 'geometry-worker-shell',
        selectedHostId: 'geometry-worker-runtime',
        lifecycle: 'completed',
      });
    }
  });

  it('falls back only before worker startup when no worker is available', async () => {
    const request = representativeRequests[0];
    const result = await runGeometryModeWithOoePilot(request, {
      commitPolicy: 'alwaysCommit',
    });

    expect(result.payload).toEqual(buildGeometryModeRunPayload(request));
    expect(result.ooe.geometryHostExecution).toMatchObject({
      kind: 'fallback',
      hostId: 'geometry-runtime',
      fallbackFromHostId: 'geometry-worker-runtime',
    });
  });

  it('records runtime worker failures without silently retrying on the main thread', async () => {
    await expect(runGeometryModeWithOoePilot(representativeRequests[0], {
      commitPolicy: 'alwaysCommit',
      createWorker: createWorker('fail'),
    })).rejects.toThrow('Geometry worker runtime failed: synthetic geometry worker failure');

    const failedJob = listRecentOoeJobs()[0];
    const failedDiagnostic = listOoeDiagnostics().find((record) => record.job.jobId === failedJob.jobId);

    expect(failedJob.status).toBe('failed');
    expect(failedDiagnostic?.terminalStatus).toBe('failed');
    expect(failedDiagnostic?.provenance?.runtimeHost).toBe('geometry-worker-runtime');
  });

  it('hard-stops a running worker when cancellation is requested', async () => {
    const request = representativeRequests[3];
    const worker = new FakeGeometryWorker('silent');
    let shouldCancel = false;
    const promise = runGeometryModeViaIsolatedWorker(
      request,
      {
        registryId: 'test.geometry.cancel',
        checkpoint: () => undefined,
        shouldCancel: () => shouldCancel,
        yieldIfBudgetExceeded: async () => false,
      },
      {
        createWorker: () => worker,
        fallback: () => buildGeometryModeRunPayload(request),
      },
    );

    await new Promise((resolve) => setTimeout(resolve, 5));
    shouldCancel = true;
    const result = await promise;

    expect(worker.terminated).toBe(true);
    expect(result.payload.outcome.kind).toBe('error');
    expect(result.hostExecution).toMatchObject({
      kind: 'worker-cancelled',
      hostId: 'geometry-worker-runtime',
      terminalStatus: 'cancelled',
      termination: 'hardStop',
    });
  });
});
