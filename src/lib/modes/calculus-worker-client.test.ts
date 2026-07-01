import { describe, expect, it, vi } from 'vitest';
import type { DisplayOutcome } from '../../types/calculator';
import type { OoeRuntimeControlContext } from '../ooe/runtime-control/runtime-coordinator';
import type {
  CalculusWorkerInboundMessage,
  CalculusWorkerOutboundMessage,
} from './worker-entrypoints/calculus.worker';
import {
  CALCULUS_WORKER_RUNTIME_FALLBACK_HOST_ID,
  CALCULUS_WORKER_RUNTIME_HOST_ID,
  runCalculusModeViaIsolatedWorker,
} from './worker-clients/calculus-worker-client';
import type { RunCalculusModeRequest } from './calculus';

function makeRequest(): RunCalculusModeRequest {
  return {
    screen: 'finiteLimit',
    indefiniteIntegral: { bodyLatex: '' },
    definiteIntegral: { bodyLatex: '', lower: '0', upper: '1' },
    improperIntegral: {
      bodyLatex: '',
      lowerKind: 'finite',
      lower: '1',
      upperKind: 'posInfinity',
      upper: '',
    },
    finiteLimit: { bodyLatex: 'x^2', target: '2', direction: 'two-sided' },
    infiniteLimit: { bodyLatex: '', targetKind: 'posInfinity' },
    limit: { requestLatex: '' },
    maclaurin: { bodyLatex: '', kind: 'maclaurin', center: '0', order: 3 },
    taylor: { bodyLatex: '', kind: 'taylor', center: '0', order: 3 },
    laplace: { bodyLatex: '' },
    partialDerivative: { bodyLatex: '', variable: 'x' },
    firstOrderOde: { lhsLatex: '', rhsLatex: '', classification: 'separable' },
    secondOrderOde: { a2: '1', a1: '0', a0: '1', forcingLatex: '0' },
    numericIvp: { bodyLatex: '', x0: '0', y0: '1', xEnd: '1', step: '0.1', method: 'rk4' },
  };
}

function successOutcome(): DisplayOutcome {
  return {
    kind: 'success',
    title: 'Calculus',
    exactLatex: '4',
    warnings: [],
  };
}

type FakePostMessageHandler = (
  message: CalculusWorkerInboundMessage,
  worker: FakeCalculusWorker,
) => void;

class FakeCalculusWorker {
  readonly messageListeners = new Set<(event: MessageEvent<CalculusWorkerOutboundMessage>) => void>();
  readonly errorListeners = new Set<(event: Event) => void>();
  terminated = false;
  private readonly onPostMessage?: FakePostMessageHandler;

  constructor(onPostMessage?: FakePostMessageHandler) {
    this.onPostMessage = onPostMessage;
  }

  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<CalculusWorkerOutboundMessage>) => void,
  ): void;
  addEventListener(type: 'error', listener: (event: Event) => void): void;
  addEventListener(
    type: 'message' | 'error',
    listener: ((event: MessageEvent<CalculusWorkerOutboundMessage>) => void) | ((event: Event) => void),
  ) {
    if (type === 'message') {
      this.messageListeners.add(listener as (event: MessageEvent<CalculusWorkerOutboundMessage>) => void);
      return;
    }

    this.errorListeners.add(listener as (event: Event) => void);
  }

  removeEventListener(
    type: 'message',
    listener: (event: MessageEvent<CalculusWorkerOutboundMessage>) => void,
  ): void;
  removeEventListener(type: 'error', listener: (event: Event) => void): void;
  removeEventListener(
    type: 'message' | 'error',
    listener: ((event: MessageEvent<CalculusWorkerOutboundMessage>) => void) | ((event: Event) => void),
  ) {
    if (type === 'message') {
      this.messageListeners.delete(listener as (event: MessageEvent<CalculusWorkerOutboundMessage>) => void);
      return;
    }

    this.errorListeners.delete(listener as (event: Event) => void);
  }

  postMessage(message: CalculusWorkerInboundMessage) {
    this.onPostMessage?.(message, this);
  }

  terminate() {
    this.terminated = true;
  }

  emitMessage(data: CalculusWorkerOutboundMessage) {
    const event = { data } as MessageEvent<CalculusWorkerOutboundMessage>;
    for (const listener of this.messageListeners) {
      listener(event);
    }
  }

  emitError() {
    const event = new Event('error');
    for (const listener of this.errorListeners) {
      listener(event);
    }
  }
}

function control(
  checkpoints: string[] = [],
  shouldCancel = () => false,
): OoeRuntimeControlContext {
  return {
    registryId: 'registry.test.calculus',
    shouldCancel,
    checkpoint: (message) => {
      checkpoints.push(message);
    },
    yieldIfBudgetExceeded: vi.fn(async () => false),
  };
}

function waitForTimerTick() {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, 5);
  });
}

describe('runCalculusModeViaIsolatedWorker', () => {
  it('returns the worker payload and records isolated host evidence on completion', async () => {
    const fallback = vi.fn(async () => successOutcome());
    const createdWorkers: FakeCalculusWorker[] = [];

    const result = await runCalculusModeViaIsolatedWorker(makeRequest(), control(), {
      fallback,
      createWorker: () => {
        const worker = new FakeCalculusWorker((message, fakeWorker) => {
          fakeWorker.emitMessage({
            kind: 'completed',
            requestId: message.requestId,
            payload: successOutcome(),
          });
        });
        createdWorkers.push(worker);
        return worker;
      },
    });

    expect(result.payload).toEqual(successOutcome());
    expect(result.hostExecution).toEqual({
      kind: 'worker',
      hostId: CALCULUS_WORKER_RUNTIME_HOST_ID,
      isolated: true,
      terminalStatus: 'completed',
    });
    expect(createdWorkers[0]?.terminated).toBe(false);
    expect(fallback).not.toHaveBeenCalled();
  });

  it('falls back to the main-thread Calculus runtime when worker creation fails', async () => {
    const checkpoints: string[] = [];
    const fallback = vi.fn(async () => successOutcome());

    const result = await runCalculusModeViaIsolatedWorker(makeRequest(), control(checkpoints), {
      fallback,
      createWorker: () => {
        throw new Error('blocked by test');
      },
    });

    expect(result.payload).toEqual(successOutcome());
    expect(result.hostExecution).toMatchObject({
      kind: 'fallback',
      hostId: CALCULUS_WORKER_RUNTIME_FALLBACK_HOST_ID,
      fallbackFromHostId: CALCULUS_WORKER_RUNTIME_HOST_ID,
      terminalStatus: 'fallback',
      reason: 'worker-initialization-failed: blocked by test',
    });
    expect(checkpoints.join('\n')).toContain('falling back to main-thread Calculus runtime');
    expect(fallback).toHaveBeenCalledTimes(1);
  });

  it('does not fall back after a worker runtime failure', async () => {
    const fallback = vi.fn(async () => successOutcome());
    const createdWorkers: FakeCalculusWorker[] = [];

    await expect(
      runCalculusModeViaIsolatedWorker(makeRequest(), control(), {
        fallback,
        createWorker: () => {
          const worker = new FakeCalculusWorker((message, fakeWorker) => {
            fakeWorker.emitMessage({
              kind: 'failed',
              requestId: message.requestId,
              message: 'worker exploded',
            });
          });
          createdWorkers.push(worker);
          return worker;
        },
      }),
    ).rejects.toThrow('Calculus worker runtime failed: worker exploded');

    expect(createdWorkers[0]?.terminated).toBe(true);
    expect(fallback).not.toHaveBeenCalled();
  });

  it('hard-stops the worker on cancellation and never falls back', async () => {
    let shouldCancel = false;
    const fallback = vi.fn(async () => successOutcome());
    const createdWorkers: FakeCalculusWorker[] = [];

    const pending = runCalculusModeViaIsolatedWorker(
      makeRequest(),
      control([], () => shouldCancel),
      {
        fallback,
        createWorker: () => {
          const worker = new FakeCalculusWorker();
          createdWorkers.push(worker);
          return worker;
        },
      },
    );
    shouldCancel = true;
    await waitForTimerTick();

    const result = await pending;

    expect(result.payload).toMatchObject({
      kind: 'error',
      title: 'Calculus',
    });
    expect(result.hostExecution).toMatchObject({
      kind: 'worker-cancelled',
      hostId: CALCULUS_WORKER_RUNTIME_HOST_ID,
      isolated: true,
      terminalStatus: 'cancelled',
      termination: 'hardStop',
    });
    expect(createdWorkers[0]?.terminated).toBe(true);
    expect(fallback).not.toHaveBeenCalled();
  });
});
