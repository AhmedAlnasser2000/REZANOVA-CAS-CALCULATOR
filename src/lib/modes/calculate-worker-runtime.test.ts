import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearOoeJobRegistry,
  listRecentOoeJobs,
} from '../ooe/job-launch/active-job-registry';
import {
  clearOoeDiagnostics,
  listOoeDiagnostics,
} from '../ooe/diagnostics/diagnostics-buffer';
import {
  runCalculateModeViaIsolatedWorker,
  type CreateCalculateWorker,
} from './worker-clients/calculate-worker-client';
import {
  runCalculateRuntimeRequest,
  runCalculateRuntimeWithOoePilot,
  type RunCalculateRuntimeRequest,
} from './calculate';
import type {
  CalculateWorkerInboundMessage,
  CalculateWorkerOutboundMessage,
} from './worker-entrypoints/calculate.worker';

type Listener = (event: MessageEvent<CalculateWorkerOutboundMessage>) => void;
type ErrorListener = (event: Event) => void;

class FakeCalculateWorker {
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

  postMessage(message: CalculateWorkerInboundMessage) {
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
        message: 'synthetic calculate worker failure',
      });
      return;
    }

    this.emit({
      kind: 'completed',
      requestId: message.requestId,
      payload: runCalculateRuntimeRequest(message.request),
    });
  }

  terminate() {
    this.terminated = true;
  }

  private emit(message: CalculateWorkerOutboundMessage) {
    const event = { data: message } as MessageEvent<CalculateWorkerOutboundMessage>;
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}

const representativeRequests: RunCalculateRuntimeRequest[] = [
  {
    kind: 'standard',
    request: {
      action: 'evaluate',
      latex: '2+2',
      angleUnit: 'deg',
      outputStyle: 'both',
      ansLatex: '0',
      calculateScreen: 'standard',
    },
  },
  {
    kind: 'standard',
    request: {
      action: 'simplify',
      latex: 'x+0',
      angleUnit: 'deg',
      outputStyle: 'both',
      ansLatex: '0',
      calculateScreen: 'standard',
    },
  },
  {
    kind: 'standard',
    request: {
      action: 'factor',
      latex: 'x^2-1',
      angleUnit: 'deg',
      outputStyle: 'both',
      ansLatex: '0',
      calculateScreen: 'standard',
    },
  },
  {
    kind: 'standard',
    request: {
      action: 'expand',
      latex: '(x+1)^2',
      angleUnit: 'deg',
      outputStyle: 'both',
      ansLatex: '0',
      calculateScreen: 'standard',
    },
  },
  {
    kind: 'algebraTransform',
    request: {
      action: 'cancelFactors',
      latex: '\\frac{x^2-1}{x-1}',
      angleUnit: 'deg',
    },
  },
];

const createWorker = (behavior: 'complete' | 'fail' | 'silent'): CreateCalculateWorker =>
  () => new FakeCalculateWorker(behavior);

beforeEach(() => {
  clearOoeJobRegistry();
  clearOoeDiagnostics();
});

describe('calculate worker runtime shell', () => {
  it('returns worker payloads matching the main-thread Calculate core', async () => {
    for (const request of representativeRequests) {
      const result = await runCalculateRuntimeWithOoePilot(request, {
        commitPolicy: 'alwaysCommit',
        createWorker: createWorker('complete'),
      });

      expect(result.payload).toEqual(runCalculateRuntimeRequest(request));
      expect(result.ooe.calculateHostExecution).toMatchObject({
        kind: 'worker',
        hostId: 'calculate-worker-runtime',
        terminalStatus: 'completed',
      });
      expect(result.ooe.runtimeShell).toMatchObject({
        shellId: 'calculate-worker-shell',
        selectedHostId: 'calculate-worker-runtime',
        lifecycle: 'completed',
      });
    }
  });

  it('falls back only before worker startup when no worker is available', async () => {
    const request = representativeRequests[0];
    const result = await runCalculateRuntimeWithOoePilot(request, {
      commitPolicy: 'alwaysCommit',
    });

    expect(result.payload).toEqual(runCalculateRuntimeRequest(request));
    expect(result.ooe.calculateHostExecution).toMatchObject({
      kind: 'fallback',
      hostId: 'calculate-runtime',
      fallbackFromHostId: 'calculate-worker-runtime',
    });
  });

  it('records runtime worker failures without silently retrying on the main thread', async () => {
    await expect(runCalculateRuntimeWithOoePilot(representativeRequests[0], {
      commitPolicy: 'alwaysCommit',
      createWorker: createWorker('fail'),
    })).rejects.toThrow('Calculate worker runtime failed: synthetic calculate worker failure');

    const failedJob = listRecentOoeJobs()[0];
    const failedDiagnostic = listOoeDiagnostics()
      .find((record) => record.job.jobId === failedJob.jobId);

    expect(failedJob.status).toBe('failed');
    expect(failedDiagnostic?.terminalStatus).toBe('failed');
    expect(failedDiagnostic?.provenance?.runtimeHost).toBe('calculate-worker-runtime');
  });

  it('hard-stops a running worker when cancellation is requested', async () => {
    const request = representativeRequests[0];
    const worker = new FakeCalculateWorker('silent');
    let shouldCancel = false;
    const promise = runCalculateModeViaIsolatedWorker(
      request,
      {
        registryId: 'test.calculate.cancel',
        checkpoint: () => undefined,
        shouldCancel: () => shouldCancel,
        yieldIfBudgetExceeded: async () => false,
      },
      {
        createWorker: () => worker,
        fallback: () => runCalculateRuntimeRequest(request),
      },
    );

    await new Promise((resolve) => setTimeout(resolve, 5));
    shouldCancel = true;
    const result = await promise;

    expect(worker.terminated).toBe(true);
    expect(result.payload.kind).toBe('error');
    expect(result.hostExecution).toMatchObject({
      kind: 'worker-cancelled',
      hostId: 'calculate-worker-runtime',
      terminalStatus: 'cancelled',
      termination: 'hardStop',
    });
  });
});
