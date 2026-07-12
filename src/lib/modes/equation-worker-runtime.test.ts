import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DisplayOutcome } from '../../types/calculator';
import {
  buildEquationCancelledOutcomeBoundary,
  projectEquationDisplayOutcomeToBoundaryOrThrow,
  projectEquationOutcomeBoundaryToDisplay,
} from '../equation/equation-solve-result';
import { runEquationModeViaIsolatedWorker } from './worker-clients/equation-worker-client';
import type { EquationWorkerInboundMessage, EquationWorkerOutboundMessage } from './worker-entrypoints/equation.worker';
import type { OoeRuntimeControlContext } from '../ooe/runtime-control/runtime-coordinator';
import type { RunEquationModeRequest } from './equation';
import { WORKER_CANCEL_POLL_INTERVAL_MS } from './worker-clients/runtime-config';

const successPayload: DisplayOutcome = {
  kind: 'success',
  title: 'Solve',
  exactLatex: 'x=1',
  canonicalMath: {
    version: 1,
    canonicalLatex: 'x=1',
    mathJson: ['Equal', 'x', 1],
  },
  warnings: [],
};
const successBoundary = projectEquationDisplayOutcomeToBoundaryOrThrow(successPayload);

const request: RunEquationModeRequest = {
  equationScreen: 'symbolic',
  equationLatex: 'x=1',
  equationAnswerMode: 'exact',
  equationDomainIntent: 'real',
  complexExactForm: 'rectangular',
  quadraticCoefficients: [1, 0, 0],
  cubicCoefficients: [1, 0, 0, 0],
  quarticCoefficients: [1, 0, 0, 0, 0],
  polynomialSystem2Latex: ['', ''],
  system2: [],
  system3: [],
  angleUnit: 'deg',
  outputStyle: 'both',
  ansLatex: '0',
  storedVariables: [],
};

function controlContext(input: {
  shouldCancel?: () => boolean;
  checkpoint?: (message: string) => void;
} = {}): OoeRuntimeControlContext {
  return {
    registryId: 'registry.equation.worker.test',
    shouldCancel: input.shouldCancel ?? (() => false),
    checkpoint: input.checkpoint ?? vi.fn(),
    yieldIfBudgetExceeded: vi.fn(async () => false),
  };
}

class FakeEquationWorker {
  readonly messages: EquationWorkerInboundMessage[] = [];
  terminated = false;
  private messageListeners = new Set<(event: MessageEvent<EquationWorkerOutboundMessage>) => void>();
  private errorListeners = new Set<(event: Event) => void>();

  addEventListener(
    type: 'message' | 'error',
    listener: ((event: MessageEvent<EquationWorkerOutboundMessage>) => void) | ((event: Event) => void),
  ) {
    if (type === 'message') {
      this.messageListeners.add(listener as unknown as (event: MessageEvent<EquationWorkerOutboundMessage>) => void);
      return;
    }

    this.errorListeners.add(listener as unknown as (event: Event) => void);
  }

  removeEventListener(
    type: 'message' | 'error',
    listener: ((event: MessageEvent<EquationWorkerOutboundMessage>) => void) | ((event: Event) => void),
  ) {
    if (type === 'message') {
      this.messageListeners.delete(listener as unknown as (event: MessageEvent<EquationWorkerOutboundMessage>) => void);
      return;
    }

    this.errorListeners.delete(listener as unknown as (event: Event) => void);
  }

  postMessage(message: EquationWorkerInboundMessage) {
    this.messages.push(message);
  }

  terminate() {
    this.terminated = true;
  }

  emit(message: EquationWorkerOutboundMessage) {
    const event = { data: message } as MessageEvent<EquationWorkerOutboundMessage>;
    for (const listener of this.messageListeners) {
      listener(event);
    }
  }

  emitError() {
    for (const listener of this.errorListeners) {
      listener(new Event('error'));
    }
  }
}

describe('Equation worker runtime client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns worker completion with worker host evidence', async () => {
    const worker = new FakeEquationWorker();
    const resultPromise = runEquationModeViaIsolatedWorker(request, controlContext(), {
      createWorker: () => worker,
      fallback: async () => ({ boundary: successBoundary }),
    });

    await vi.waitFor(() => {
      expect(worker.messages).toHaveLength(1);
    });
    worker.emit({
      kind: 'completed',
      requestId: worker.messages[0].requestId,
      boundary: successBoundary,
    });

    const result = await resultPromise;
    expect(result).toMatchObject({
      boundary: successBoundary,
      hostExecution: {
        kind: 'worker',
        hostId: 'equation-worker-runtime',
        isolated: true,
        terminalStatus: 'completed',
      },
    });
    expect(projectEquationOutcomeBoundaryToDisplay(result.boundary)).toMatchObject(successPayload);
    expect(structuredClone(successBoundary)).toEqual(successBoundary);
  });

  it('falls back only when the worker is unavailable before start', async () => {
    vi.stubGlobal('Worker', undefined);
    const checkpoint = vi.fn();
    const fallback = vi.fn(async () => ({ boundary: successBoundary }));

    const result = await runEquationModeViaIsolatedWorker(request, controlContext({ checkpoint }), {
      fallback,
    });

    expect(fallback).toHaveBeenCalled();
    expect(checkpoint).toHaveBeenCalledWith(expect.stringContaining('falling back'));
    expect(result.hostExecution).toMatchObject({
      kind: 'fallback',
      hostId: 'equation-runtime',
      fallbackFromHostId: 'equation-worker-runtime',
    });
  });

  it('does not fallback after worker runtime failure', async () => {
    const worker = new FakeEquationWorker();
    const fallback = vi.fn(async () => ({ boundary: successBoundary }));
    const resultPromise = runEquationModeViaIsolatedWorker(request, controlContext(), {
      createWorker: () => worker,
      fallback,
    });

    await vi.waitFor(() => {
      expect(worker.messages).toHaveLength(1);
    });
    worker.emit({
      kind: 'failed',
      requestId: worker.messages[0].requestId,
      message: 'runtime boom',
    });

    await expect(resultPromise).rejects.toThrow('Equation worker runtime failed: runtime boom');
    expect(fallback).not.toHaveBeenCalled();
    expect(worker.terminated).toBe(true);
  });

  it('rejects malformed completed boundaries without falling back', async () => {
    const worker = new FakeEquationWorker();
    const fallback = vi.fn(async () => ({ boundary: successBoundary }));
    const resultPromise = runEquationModeViaIsolatedWorker(request, controlContext(), {
      createWorker: () => worker,
      fallback,
    });

    await vi.waitFor(() => {
      expect(worker.messages).toHaveLength(1);
    });
    worker.emit({
      kind: 'completed',
      requestId: worker.messages[0].requestId,
      boundary: {
        ...successBoundary,
        result: { ...successBoundary.result, status: 'unknown' },
      },
    } as unknown as EquationWorkerOutboundMessage);

    await expect(resultPromise).rejects.toThrow('invalid completed boundary: invalid-result');
    expect(fallback).not.toHaveBeenCalled();
    expect(worker.terminated).toBe(true);
  });

  it('rejects cancellation-shaped completed messages', async () => {
    const worker = new FakeEquationWorker();
    const fallback = vi.fn(async () => ({ boundary: successBoundary }));
    const resultPromise = runEquationModeViaIsolatedWorker(request, controlContext(), {
      createWorker: () => worker,
      fallback,
    });

    await vi.waitFor(() => {
      expect(worker.messages).toHaveLength(1);
    });
    worker.emit({
      kind: 'completed',
      requestId: worker.messages[0].requestId,
      boundary: buildEquationCancelledOutcomeBoundary('Forged cancellation.'),
    } as unknown as EquationWorkerOutboundMessage);

    await expect(resultPromise).rejects.toThrow(
      'A completed Equation worker message requires a result boundary.',
    );
    expect(fallback).not.toHaveBeenCalled();
    expect(worker.terminated).toBe(true);
  });

  it('hard-stops the worker when cancellation is requested', async () => {
    vi.useFakeTimers();
    let cancelled = false;
    const worker = new FakeEquationWorker();
    const resultPromise = runEquationModeViaIsolatedWorker(
      request,
      controlContext({ shouldCancel: () => cancelled }),
      {
        createWorker: () => worker,
        fallback: async () => ({ boundary: successBoundary }),
      },
    );

    await vi.waitFor(() => {
      expect(worker.messages).toHaveLength(1);
    });
    cancelled = true;
    await vi.advanceTimersByTimeAsync(WORKER_CANCEL_POLL_INTERVAL_MS + 1);

    await expect(resultPromise).resolves.toMatchObject({
      boundary: {
        kind: 'cancelled',
        reason: 'Equation solve was stopped before it finished.',
      },
      hostExecution: {
        kind: 'worker-cancelled',
        hostId: 'equation-worker-runtime',
        terminalStatus: 'cancelled',
        termination: 'hardStop',
      },
    });
    expect(worker.terminated).toBe(true);
    vi.useRealTimers();
  });
});
