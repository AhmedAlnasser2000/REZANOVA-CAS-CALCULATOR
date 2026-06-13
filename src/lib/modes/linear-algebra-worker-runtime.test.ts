import { beforeEach, describe, expect, it } from 'vitest';
import { clearOoeJobRegistry, listRecentOoeJobs } from '../ooe/active-job-registry';
import { clearOoeDiagnostics, listOoeDiagnostics } from '../ooe/diagnostics-buffer';
import { runLinearAlgebraModeViaIsolatedWorker } from './worker-clients/linear-algebra-worker-client';
import type {
  LinearAlgebraWorkerInboundMessage,
  LinearAlgebraWorkerOutboundMessage,
  LinearAlgebraWorkerRunPayload,
} from './worker-entrypoints/linear-algebra.worker';
import {
  runMatrixMode,
  runMatrixModeWithOoePilot,
  type RunMatrixModeRequest,
} from './matrix';
import {
  runVectorMode,
  runVectorModeWithOoePilot,
  type RunVectorModeRequest,
} from './vector';

type Listener = (event: MessageEvent<LinearAlgebraWorkerOutboundMessage>) => void;
type ErrorListener = (event: Event) => void;

class FakeLinearAlgebraWorker {
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

  postMessage(message: LinearAlgebraWorkerInboundMessage) {
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
        message: 'synthetic worker failure',
      });
      return;
    }

    this.emit({
      kind: 'completed',
      requestId: message.requestId,
      payload: message.payload.kind === 'matrix'
        ? runMatrixMode(message.payload.request)
        : runVectorMode(message.payload.request),
    });
  }

  terminate() {
    this.terminated = true;
  }

  private emit(message: LinearAlgebraWorkerOutboundMessage) {
    const event = { data: message } as MessageEvent<LinearAlgebraWorkerOutboundMessage>;
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}

const matrixRequest: RunMatrixModeRequest = {
  operation: 'multiply',
  matrixA: [[1, 2], [3, 4]],
  matrixB: [[5, 6], [7, 8]],
};

const vectorRequest: RunVectorModeRequest = {
  operation: 'angle',
  vectorA: [1, 0],
  vectorB: [0, 1],
  angleUnit: 'deg',
};

beforeEach(() => {
  clearOoeJobRegistry();
  clearOoeDiagnostics();
});

describe('linear algebra worker runtime shell', () => {
  it('returns Matrix and Vector worker payloads matching the main-thread adapters', async () => {
    const matrix = await runMatrixModeWithOoePilot(matrixRequest, {
      commitPolicy: 'alwaysCommit',
      createWorker: () => new FakeLinearAlgebraWorker('complete'),
    });
    const vector = await runVectorModeWithOoePilot(vectorRequest, {
      commitPolicy: 'alwaysCommit',
      createWorker: () => new FakeLinearAlgebraWorker('complete'),
    });

    expect(matrix.payload).toEqual(runMatrixMode(matrixRequest));
    expect(vector.payload).toEqual(runVectorMode(vectorRequest));
    expect(matrix.ooe.linearAlgebraHostExecution).toMatchObject({
      kind: 'worker',
      hostId: 'linear-algebra-worker-runtime',
      terminalStatus: 'completed',
    });
    expect(vector.ooe.runtimeShell).toMatchObject({
      shellId: 'linear-algebra-worker-shell',
      selectedHostId: 'linear-algebra-worker-runtime',
      lifecycle: 'completed',
    });
  });

  it('falls back only before worker startup when no worker is available', async () => {
    const result = await runMatrixModeWithOoePilot(matrixRequest, {
      commitPolicy: 'alwaysCommit',
    });

    expect(result.payload).toEqual(runMatrixMode(matrixRequest));
    expect(result.ooe.linearAlgebraHostExecution).toMatchObject({
      kind: 'fallback',
      hostId: 'linear-algebra-runtime',
      fallbackFromHostId: 'linear-algebra-worker-runtime',
    });
  });

  it('records runtime worker failures without silently retrying on the main thread', async () => {
    await expect(runVectorModeWithOoePilot(vectorRequest, {
      commitPolicy: 'alwaysCommit',
      createWorker: () => new FakeLinearAlgebraWorker('fail'),
    })).rejects.toThrow('Linear Algebra worker runtime failed: synthetic worker failure');

    const failedJob = listRecentOoeJobs()[0];
    const failedDiagnostic = listOoeDiagnostics().find((record) => record.job.jobId === failedJob.jobId);

    expect(failedJob.status).toBe('failed');
    expect(failedDiagnostic?.terminalStatus).toBe('failed');
    expect(failedDiagnostic?.provenance?.runtimeHost).toBe('linear-algebra-worker-runtime');
  });

  it('hard-stops a running worker when cancellation is requested', async () => {
    const worker = new FakeLinearAlgebraWorker('silent');
    let shouldCancel = false;
    const promise = runLinearAlgebraModeViaIsolatedWorker(
      {
        kind: 'matrix',
        request: matrixRequest,
      } satisfies LinearAlgebraWorkerRunPayload,
      {
        registryId: 'test.linear-algebra.cancel',
        checkpoint: () => undefined,
        shouldCancel: () => shouldCancel,
        yieldIfBudgetExceeded: async () => false,
      },
      {
        createWorker: () => worker,
        fallback: () => runMatrixMode(matrixRequest),
      },
    );

    await new Promise((resolve) => setTimeout(resolve, 5));
    shouldCancel = true;
    const result = await promise;

    expect(worker.terminated).toBe(true);
    expect(result.payload.kind).toBe('error');
    expect(result.hostExecution).toMatchObject({
      kind: 'worker-cancelled',
      hostId: 'linear-algebra-worker-runtime',
      terminalStatus: 'cancelled',
      termination: 'hardStop',
    });
  });
});
