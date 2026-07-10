import { beforeEach, describe, expect, it } from 'vitest';
import type { DisplayOutcome } from '../../types/calculator';
import { clearOoeJobRegistry, listRecentOoeJobs } from '../ooe/job-launch/active-job-registry';
import { clearOoeDiagnostics, listOoeDiagnostics } from '../ooe/diagnostics/diagnostics-buffer';
import type {
  LinearAlgebraWorkerInboundMessage,
  LinearAlgebraWorkerOutboundMessage,
} from './worker-entrypoints/linear-algebra-worker-contract';
import { runMatrixModeViaIsolatedWorker } from './worker-clients/matrix-worker-client';
import { runVectorModeViaIsolatedWorker } from './worker-clients/vector-worker-client';
import {
  buildMatrixOoeSnapshot,
  runMatrixMode,
  runMatrixModeWithOoePilot,
  type RunMatrixModeRequest,
} from './matrix';
import {
  buildVectorOoeSnapshot,
  runVectorMode,
  runVectorModeWithOoePilot,
  type RunVectorModeRequest,
} from './vector';

type Listener = (event: MessageEvent<LinearAlgebraWorkerOutboundMessage>) => void;
type ErrorListener = (event: Event) => void;

class FakeWorkspaceWorker<TRequest> {
  readonly listeners = new Set<Listener>();
  readonly errorListeners = new Set<ErrorListener>();
  terminated = false;
  private readonly behavior: 'complete' | 'fail' | 'silent';
  private readonly run: (request: TRequest) => DisplayOutcome;

  constructor(
    behavior: 'complete' | 'fail' | 'silent',
    run: (request: TRequest) => DisplayOutcome,
  ) {
    this.behavior = behavior;
    this.run = run;
  }

  addEventListener(type: 'message', listener: Listener): void;
  addEventListener(type: 'error', listener: ErrorListener): void;
  addEventListener(type: 'message' | 'error', listener: Listener | ErrorListener): void {
    if (type === 'message') this.listeners.add(listener as Listener);
    else this.errorListeners.add(listener as ErrorListener);
  }

  removeEventListener(type: 'message', listener: Listener): void;
  removeEventListener(type: 'error', listener: ErrorListener): void;
  removeEventListener(type: 'message' | 'error', listener: Listener | ErrorListener): void {
    if (type === 'message') this.listeners.delete(listener as Listener);
    else this.errorListeners.delete(listener as ErrorListener);
  }

  postMessage(message: LinearAlgebraWorkerInboundMessage<TRequest>) {
    if (this.behavior === 'silent') return;
    this.emit({ kind: 'started', requestId: message.requestId });
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
      payload: this.run(message.request),
    });
  }

  terminate() {
    this.terminated = true;
  }

  private emit(message: LinearAlgebraWorkerOutboundMessage) {
    const event = { data: message } as MessageEvent<LinearAlgebraWorkerOutboundMessage>;
    for (const listener of this.listeners) listener(event);
  }
}

const matrixRequest: RunMatrixModeRequest = {
  operation: 'multiply',
  matrixA: [[1, 2], [3, 4]],
  matrixB: [[5, 6], [7, 8]],
  matrixValues: [
    { id: 'matrix-a', name: 'A', value: [[1, 2], [3, 4]] },
    { id: 'matrix-b', name: 'B', value: [[5, 6], [7, 8]] },
  ],
  activeMatrixLeftId: 'matrix-a',
  activeMatrixRightId: 'matrix-b',
};

const vectorRequest: RunVectorModeRequest = {
  operation: 'angle',
  vectorA: [1, 0],
  vectorB: [0, 1],
  angleUnit: 'deg',
  vectorValues: [
    { id: 'vector-u', name: 'u', value: [1, 0] },
    { id: 'vector-v', name: 'v', value: [0, 1] },
  ],
  activeVectorLeftId: 'vector-u',
  activeVectorRightId: 'vector-v',
};

const runtimeContext = (shouldCancel: () => boolean) => ({
  registryId: 'test.linear-algebra.cancel',
  checkpoint: () => undefined,
  shouldCancel,
  yieldIfBudgetExceeded: async () => false,
});

beforeEach(() => {
  clearOoeJobRegistry();
  clearOoeDiagnostics();
});

describe('Matrix and Vector worker runtime shells', () => {
  it('includes named value snapshots in the separate OOE requests', () => {
    expect(buildMatrixOoeSnapshot(matrixRequest).request).toMatchObject({
      matrixValues: matrixRequest.matrixValues,
      activeMatrixLeftId: 'matrix-a',
      activeMatrixRightId: 'matrix-b',
    });
    expect(buildVectorOoeSnapshot(vectorRequest).request).toMatchObject({
      vectorValues: vectorRequest.vectorValues,
      activeVectorLeftId: 'vector-u',
      activeVectorRightId: 'vector-v',
    });
  });

  it('returns parity payloads through distinct primary hosts and shells', async () => {
    const matrix = await runMatrixModeWithOoePilot(matrixRequest, {
      commitPolicy: 'alwaysCommit',
      createWorker: () => new FakeWorkspaceWorker('complete', runMatrixMode),
    });
    const vector = await runVectorModeWithOoePilot(vectorRequest, {
      commitPolicy: 'alwaysCommit',
      createWorker: () => new FakeWorkspaceWorker('complete', runVectorMode),
    });

    expect(matrix.payload).toEqual(runMatrixMode(matrixRequest));
    expect(vector.payload).toEqual(runVectorMode(vectorRequest));
    expect(matrix.ooe.linearAlgebraHostExecution).toMatchObject({
      kind: 'worker',
      hostId: 'matrix-worker-runtime',
      terminalStatus: 'completed',
    });
    expect(matrix.ooe.runtimeShell).toMatchObject({
      shellId: 'matrix-worker-shell',
      selectedHostId: 'matrix-worker-runtime',
    });
    expect(vector.ooe.linearAlgebraHostExecution).toMatchObject({
      kind: 'worker',
      hostId: 'vector-worker-runtime',
      terminalStatus: 'completed',
    });
    expect(vector.ooe.runtimeShell).toMatchObject({
      shellId: 'vector-worker-shell',
      selectedHostId: 'vector-worker-runtime',
    });
  });

  it('uses distinct fallback hosts only before worker startup', async () => {
    const matrix = await runMatrixModeWithOoePilot(matrixRequest, { commitPolicy: 'alwaysCommit' });
    const vector = await runVectorModeWithOoePilot(vectorRequest, { commitPolicy: 'alwaysCommit' });

    expect(matrix.ooe.linearAlgebraHostExecution).toMatchObject({
      kind: 'fallback',
      hostId: 'matrix-runtime',
      fallbackFromHostId: 'matrix-worker-runtime',
    });
    expect(vector.ooe.linearAlgebraHostExecution).toMatchObject({
      kind: 'fallback',
      hostId: 'vector-runtime',
      fallbackFromHostId: 'vector-worker-runtime',
    });
  });

  it('records Matrix and Vector worker failures without main-thread retry', async () => {
    await expect(runMatrixModeWithOoePilot(matrixRequest, {
      commitPolicy: 'alwaysCommit',
      createWorker: () => new FakeWorkspaceWorker('fail', runMatrixMode),
    })).rejects.toThrow('Matrix worker runtime failed: synthetic worker failure');
    await expect(runVectorModeWithOoePilot(vectorRequest, {
      commitPolicy: 'alwaysCommit',
      createWorker: () => new FakeWorkspaceWorker('fail', runVectorMode),
    })).rejects.toThrow('Vector worker runtime failed: synthetic worker failure');

    const diagnostics = listOoeDiagnostics().filter((record) => record.terminalStatus === 'failed');
    expect(listRecentOoeJobs().filter((job) => job.status === 'failed')).toHaveLength(2);
    expect(diagnostics.map((record) => record.provenance?.runtimeHost).sort()).toEqual([
      'matrix-worker-runtime',
      'vector-worker-runtime',
    ]);
  });

  it('hard-stops Matrix and Vector workers independently', async () => {
    const matrixWorker = new FakeWorkspaceWorker<RunMatrixModeRequest>('silent', runMatrixMode);
    const vectorWorker = new FakeWorkspaceWorker<RunVectorModeRequest>('silent', runVectorMode);
    let shouldCancel = false;
    const matrixPromise = runMatrixModeViaIsolatedWorker(
      matrixRequest,
      runtimeContext(() => shouldCancel),
      { createWorker: () => matrixWorker, fallback: () => runMatrixMode(matrixRequest) },
    );
    const vectorPromise = runVectorModeViaIsolatedWorker(
      vectorRequest,
      runtimeContext(() => shouldCancel),
      { createWorker: () => vectorWorker, fallback: () => runVectorMode(vectorRequest) },
    );

    await new Promise((resolve) => setTimeout(resolve, 5));
    shouldCancel = true;
    const [matrix, vector] = await Promise.all([matrixPromise, vectorPromise]);

    expect(matrixWorker.terminated).toBe(true);
    expect(vectorWorker.terminated).toBe(true);
    expect(matrix.hostExecution).toMatchObject({
      kind: 'worker-cancelled',
      hostId: 'matrix-worker-runtime',
      termination: 'hardStop',
    });
    expect(vector.hostExecution).toMatchObject({
      kind: 'worker-cancelled',
      hostId: 'vector-worker-runtime',
      termination: 'hardStop',
    });
  });
});
