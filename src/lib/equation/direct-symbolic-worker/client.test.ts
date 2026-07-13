import { describe, expect, it, vi } from 'vitest';
import type { DisplayOutcome, GuardedSolveRequest } from '../../../types/calculator';
import {
  runEquationDirectSymbolicViaIsolatedWorker,
  EQUATION_DIRECT_SYMBOLIC_FALLBACK_HOST_ID,
  EQUATION_DIRECT_SYMBOLIC_WORKER_HOST_ID,
} from '../equation-direct-symbolic-worker-client';
import { runGuardedDirectSymbolicFallback } from '../guarded-solve';
import type { EquationDirectSymbolicWorkerOutboundMessage } from '../equation-direct-symbolic.worker';
import { projectDisplayOutcomeToCanonicalRuntimeOutcome } from '../../result-contract';

const guardedRequest: GuardedSolveRequest = {
  originalLatex: '\\sin\\left(x\\right)+x=1',
  resolvedLatex: '\\sin\\left(x\\right)+x=1',
  angleUnit: 'deg',
  outputStyle: 'both',
  ansLatex: '0',
};

type FakePostMessageHandler = (
  message: unknown,
  worker: FakeEquationDirectSymbolicWorker,
) => void;

class FakeEquationDirectSymbolicWorker {
  readonly messageListeners = new Set<(event: MessageEvent<EquationDirectSymbolicWorkerOutboundMessage>) => void>();
  readonly errorListeners = new Set<(event: Event) => void>();
  terminated = false;
  private readonly onPostMessage?: FakePostMessageHandler;

  constructor(onPostMessage?: FakePostMessageHandler) {
    this.onPostMessage = onPostMessage;
  }

  addEventListener(type: 'message', listener: (event: MessageEvent<EquationDirectSymbolicWorkerOutboundMessage>) => void): void;
  addEventListener(type: 'error', listener: (event: Event) => void): void;
  addEventListener(type: 'message' | 'error', listener: ((event: MessageEvent<EquationDirectSymbolicWorkerOutboundMessage>) => void) | ((event: Event) => void)) {
    if (type === 'message') {
      this.messageListeners.add(listener as (event: MessageEvent<EquationDirectSymbolicWorkerOutboundMessage>) => void);
      return;
    }

    this.errorListeners.add(listener as (event: Event) => void);
  }

  removeEventListener(type: 'message', listener: (event: MessageEvent<EquationDirectSymbolicWorkerOutboundMessage>) => void): void;
  removeEventListener(type: 'error', listener: (event: Event) => void): void;
  removeEventListener(type: 'message' | 'error', listener: ((event: MessageEvent<EquationDirectSymbolicWorkerOutboundMessage>) => void) | ((event: Event) => void)) {
    if (type === 'message') {
      this.messageListeners.delete(listener as (event: MessageEvent<EquationDirectSymbolicWorkerOutboundMessage>) => void);
      return;
    }

    this.errorListeners.delete(listener as (event: Event) => void);
  }

  postMessage(message: unknown) {
    this.onPostMessage?.(message, this);
  }

  terminate() {
    this.terminated = true;
  }

  emitMessage(data: EquationDirectSymbolicWorkerOutboundMessage) {
    const event = { data } as MessageEvent<EquationDirectSymbolicWorkerOutboundMessage>;
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

function control(checkpoints: string[] = [], shouldCancel = () => false) {
  return {
    shouldCancel,
    checkpoint: (message: string) => {
      checkpoints.push(message);
    },
  };
}

function fallbackOutcome(): DisplayOutcome {
  return {
    kind: 'prompt',
    title: 'Fallback',
    message: 'fallback',
    targetMode: 'equation',
    carryLatex: '',
    warnings: [],
  };
}

describe('runEquationDirectSymbolicViaIsolatedWorker', () => {
  it('returns the worker payload and records isolated host evidence on completion', async () => {
    const expected = runGuardedDirectSymbolicFallback(guardedRequest);
    const createdWorkers: FakeEquationDirectSymbolicWorker[] = [];
    const fallback = vi.fn(fallbackOutcome);

    const result = await runEquationDirectSymbolicViaIsolatedWorker(
      { request: guardedRequest, depth: 2 },
      control(),
      {
        createWorker: () => {
          const worker = new FakeEquationDirectSymbolicWorker((message, fakeWorker) => {
            const requestId = (message as { requestId: string }).requestId;
            fakeWorker.emitMessage({
              kind: 'completed',
              requestId,
              outcome: projectDisplayOutcomeToCanonicalRuntimeOutcome(expected, 'Equation test'),
            });
          });
          createdWorkers.push(worker);
          return worker;
        },
        fallback,
      },
    );

    expect(JSON.parse(JSON.stringify(result.outcome))).toEqual(
      JSON.parse(JSON.stringify(expected)),
    );
    expect(result.hostEvidence).toMatchObject({
      helperId: 'direct-symbolic',
      stageId: 'direct-symbolic',
      depth: 2,
      selectedHostId: EQUATION_DIRECT_SYMBOLIC_WORKER_HOST_ID,
      isolated: true,
      terminalStatus: 'completed',
    });
    expect(createdWorkers[0]?.terminated).toBe(false);
    expect(fallback).not.toHaveBeenCalled();
  });

  it('keeps worker completion payload parity for complex-shaped exact input', async () => {
    const complexRequest: GuardedSolveRequest = {
      ...guardedRequest,
      originalLatex: 'x^2+1=0',
      resolvedLatex: 'x^2+1=0',
    };
    const expected = runGuardedDirectSymbolicFallback(complexRequest);
    const fallback = vi.fn(fallbackOutcome);

    const result = await runEquationDirectSymbolicViaIsolatedWorker(
      { request: complexRequest, depth: 3 },
      control(),
      {
        createWorker: () => new FakeEquationDirectSymbolicWorker((message, fakeWorker) => {
          fakeWorker.emitMessage({
            kind: 'completed',
            requestId: (message as { requestId: string }).requestId,
            outcome: projectDisplayOutcomeToCanonicalRuntimeOutcome(expected, 'Equation test'),
          });
        }),
        fallback,
      },
    );

    expect(JSON.parse(JSON.stringify(result.outcome))).toEqual(
      JSON.parse(JSON.stringify(expected)),
    );
    expect(result.hostEvidence).toMatchObject({
      selectedHostId: EQUATION_DIRECT_SYMBOLIC_WORKER_HOST_ID,
      terminalStatus: 'completed',
      isolated: true,
    });
    expect(fallback).not.toHaveBeenCalled();
  });

  it('falls back to the main-thread helper when the worker cannot be created', async () => {
    const checkpoints: string[] = [];
    const fallback = vi.fn(fallbackOutcome);

    const result = await runEquationDirectSymbolicViaIsolatedWorker(
      { request: guardedRequest, depth: 1 },
      control(checkpoints),
      {
        createWorker: () => {
          throw new Error('blocked by test');
        },
        fallback,
      },
    );

    expect(result.outcome).toEqual(fallbackOutcome());
    expect(result.hostEvidence).toMatchObject({
      selectedHostId: EQUATION_DIRECT_SYMBOLIC_FALLBACK_HOST_ID,
      fallbackFromHostId: EQUATION_DIRECT_SYMBOLIC_WORKER_HOST_ID,
      fallbackReason: 'worker-initialization-failed: blocked by test',
      terminalStatus: 'fallback',
      isolated: false,
    });
    expect(checkpoints.join('\n')).toContain('falling back to main-thread helper');
    expect(fallback).toHaveBeenCalledTimes(1);
  });

  it('falls back on worker runtime failure when cancellation was not requested', async () => {
    const fallback = vi.fn(fallbackOutcome);
    const createdWorkers: FakeEquationDirectSymbolicWorker[] = [];

    const result = await runEquationDirectSymbolicViaIsolatedWorker(
      { request: guardedRequest, depth: 0 },
      control(),
      {
        createWorker: () => {
          const worker = new FakeEquationDirectSymbolicWorker((message, fakeWorker) => {
            fakeWorker.emitMessage({
              kind: 'failed',
              requestId: (message as { requestId: string }).requestId,
              message: 'worker exploded',
            });
          });
          createdWorkers.push(worker);
          return worker;
        },
        fallback,
      },
    );

    expect(result.outcome).toEqual(fallbackOutcome());
    expect(result.hostEvidence).toMatchObject({
      selectedHostId: EQUATION_DIRECT_SYMBOLIC_FALLBACK_HOST_ID,
      fallbackReason: 'worker-runtime-failed: worker exploded',
      terminalStatus: 'fallback',
    });
    expect(createdWorkers[0]?.terminated).toBe(true);
    expect(fallback).toHaveBeenCalledTimes(1);
  });

  it('hard-stops the worker on cancellation and never falls back', async () => {
    let shouldCancel = false;
    const createdWorkers: FakeEquationDirectSymbolicWorker[] = [];
    const fallback = vi.fn(fallbackOutcome);

    const pending = runEquationDirectSymbolicViaIsolatedWorker(
      { request: guardedRequest, depth: 0 },
      control([], () => shouldCancel),
      {
        createWorker: () => {
          const worker = new FakeEquationDirectSymbolicWorker();
          createdWorkers.push(worker);
          return worker;
        },
        fallback,
      },
    );
    shouldCancel = true;

    const result = await pending;

    expect(result.outcome).toMatchObject({
      kind: 'error',
      error: 'Equation solve was stopped before it finished.',
    });
    expect(result.hostEvidence).toMatchObject({
      selectedHostId: EQUATION_DIRECT_SYMBOLIC_WORKER_HOST_ID,
      terminalStatus: 'cancelled',
      termination: 'hardStop',
      isolated: true,
    });
    expect(createdWorkers[0]?.terminated).toBe(true);
    expect(fallback).not.toHaveBeenCalled();
  });
});
