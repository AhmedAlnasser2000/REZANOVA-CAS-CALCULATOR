import { beforeEach, describe, expect, it } from 'vitest';
import { clearOoeJobRegistry, listRecentOoeJobs } from '../ooe/job-launch/active-job-registry';
import { clearOoeDiagnostics, listOoeDiagnostics } from '../ooe/diagnostics-buffer';
import type { RunTrigonometryRuntimeRequest } from '../trigonometry/runtime-input';
import { buildTrigonometryModeRunPayload } from '../trigonometry/runtime-run';
import {
  runTrigonometryModeViaIsolatedWorker,
  type CreateTrigonometryWorker,
} from './worker-clients/trigonometry-worker-client';
import {
  runTrigonometryModeWithOoePilot,
} from './trigonometry';
import type {
  TrigonometryWorkerInboundMessage,
  TrigonometryWorkerOutboundMessage,
} from './worker-entrypoints/trigonometry.worker';

type Listener = (event: MessageEvent<TrigonometryWorkerOutboundMessage>) => void;
type ErrorListener = (event: Event) => void;

class FakeTrigonometryWorker {
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

  postMessage(message: TrigonometryWorkerInboundMessage) {
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
        message: 'synthetic trig worker failure',
      });
      return;
    }

    this.emit({
      kind: 'completed',
      requestId: message.requestId,
      payload: buildTrigonometryModeRunPayload(message.request),
    });
  }

  terminate() {
    this.terminated = true;
  }

  private emit(message: TrigonometryWorkerOutboundMessage) {
    const event = { data: message } as MessageEvent<TrigonometryWorkerOutboundMessage>;
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}

const representativeRequests: RunTrigonometryRuntimeRequest[] = [
  {
    inputLatex: '\\sin^2\\left(x\\right)+\\cos^2\\left(x\\right)',
    screenHint: 'identitySimplify',
    angleUnit: 'deg',
  },
  {
    inputLatex: 'rightTriangle(a=3, b=4)',
    screenHint: 'rightTriangle',
    angleUnit: 'deg',
  },
  {
    inputLatex: 'angleConvert(value=30, from=deg, to=rad)',
    screenHint: 'angleConvert',
    angleUnit: 'deg',
  },
  {
    inputLatex: '2\\sin\\left(3x-\\pi\\right)+1',
    screenHint: 'periodPhase',
    angleUnit: 'deg',
  },
];

const createWorker = (behavior: 'complete' | 'fail' | 'silent'): CreateTrigonometryWorker =>
  () => new FakeTrigonometryWorker(behavior);

beforeEach(() => {
  clearOoeJobRegistry();
  clearOoeDiagnostics();
});

describe('trigonometry worker runtime shell', () => {
  it('returns worker payloads matching the main-thread Trigonometry core', async () => {
    for (const request of representativeRequests) {
      const result = await runTrigonometryModeWithOoePilot(request, {
        commitPolicy: 'alwaysCommit',
        createWorker: createWorker('complete'),
      });

      expect(result.payload).toEqual(buildTrigonometryModeRunPayload(request));
      expect(result.ooe.trigonometryHostExecution).toMatchObject({
        kind: 'worker',
        hostId: 'trigonometry-worker-runtime',
        terminalStatus: 'completed',
      });
      expect(result.ooe.runtimeShell).toMatchObject({
        shellId: 'trigonometry-worker-shell',
        selectedHostId: 'trigonometry-worker-runtime',
        lifecycle: 'completed',
      });
    }
  });

  it('falls back only before worker startup when no worker is available', async () => {
    const request = representativeRequests[0];
    const result = await runTrigonometryModeWithOoePilot(request, {
      commitPolicy: 'alwaysCommit',
    });

    expect(result.payload).toEqual(buildTrigonometryModeRunPayload(request));
    expect(result.ooe.trigonometryHostExecution).toMatchObject({
      kind: 'fallback',
      hostId: 'trigonometry-runtime',
      fallbackFromHostId: 'trigonometry-worker-runtime',
    });
  });

  it('records runtime worker failures without silently retrying on the main thread', async () => {
    await expect(runTrigonometryModeWithOoePilot(representativeRequests[0], {
      commitPolicy: 'alwaysCommit',
      createWorker: createWorker('fail'),
    })).rejects.toThrow('Trigonometry worker runtime failed: synthetic trig worker failure');

    const failedJob = listRecentOoeJobs()[0];
    const failedDiagnostic = listOoeDiagnostics().find((record) => record.job.jobId === failedJob.jobId);

    expect(failedJob.status).toBe('failed');
    expect(failedDiagnostic?.terminalStatus).toBe('failed');
    expect(failedDiagnostic?.provenance?.runtimeHost).toBe('trigonometry-worker-runtime');
  });

  it('hard-stops a running worker when cancellation is requested', async () => {
    const request = representativeRequests[3];
    const worker = new FakeTrigonometryWorker('silent');
    let shouldCancel = false;
    const promise = runTrigonometryModeViaIsolatedWorker(
      request,
      {
        registryId: 'test.trigonometry.cancel',
        checkpoint: () => undefined,
        shouldCancel: () => shouldCancel,
        yieldIfBudgetExceeded: async () => false,
      },
      {
        createWorker: () => worker,
        fallback: () => buildTrigonometryModeRunPayload(request),
      },
    );

    await new Promise((resolve) => setTimeout(resolve, 5));
    shouldCancel = true;
    const result = await promise;

    expect(worker.terminated).toBe(true);
    expect(result.payload.outcome.kind).toBe('error');
    expect(result.hostExecution).toMatchObject({
      kind: 'worker-cancelled',
      hostId: 'trigonometry-worker-runtime',
      terminalStatus: 'cancelled',
      termination: 'hardStop',
    });
  });
});
