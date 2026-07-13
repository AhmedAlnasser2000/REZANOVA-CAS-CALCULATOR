import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearOoeDiagnostics,
  listOoeDiagnostics,
} from '../ooe/diagnostics/diagnostics-buffer';
import {
  clearOoeJobRegistry,
  listRecentOoeJobs,
} from '../ooe/job-launch/active-job-registry';
import type { OoeRuntimeControlContext } from '../ooe/runtime-control/runtime-coordinator';
import type { RunStatisticsRuntimeRequest } from '../statistics/runtime-input';
import {
  buildCanonicalStatisticsModeRunPayload,
  buildStatisticsModeRunPayload,
} from '../statistics/runtime-run';
import { runStatisticsModeWithOoePilot } from './statistics';
import {
  runStatisticsModeViaIsolatedWorker,
  type CreateStatisticsWorker,
} from './worker-clients/statistics-worker-client';
import type {
  StatisticsWorkerInboundMessage,
  StatisticsWorkerOutboundMessage,
} from './worker-entrypoints/statistics.worker';

type Listener = (event: MessageEvent<StatisticsWorkerOutboundMessage>) => void;
type ErrorListener = (event: Event) => void;

class FakeStatisticsWorker {
  readonly listeners = new Set<Listener>();
  readonly errorListeners = new Set<ErrorListener>();
  terminated = false;
  private readonly behavior: 'complete' | 'fail' | 'invalid' | 'silent';

  constructor(behavior: 'complete' | 'fail' | 'invalid' | 'silent') {
    this.behavior = behavior;
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

  postMessage(message: StatisticsWorkerInboundMessage) {
    if (this.behavior === 'silent') return;
    this.emit({ kind: 'started', requestId: message.requestId });
    if (this.behavior === 'fail') {
      this.emit({
        kind: 'failed',
        requestId: message.requestId,
        message: 'synthetic statistics worker failure',
      });
      return;
    }
    this.emit({
      kind: 'completed',
      requestId: message.requestId,
      payload: this.behavior === 'invalid'
        ? { ...buildCanonicalStatisticsModeRunPayload(message.request), outcome: { kind: 'success' } as never }
        : buildCanonicalStatisticsModeRunPayload(message.request),
    });
  }

  terminate() {
    this.terminated = true;
  }

  private emit(message: StatisticsWorkerOutboundMessage) {
    const event = { data: message } as MessageEvent<StatisticsWorkerOutboundMessage>;
    for (const listener of this.listeners) listener(event);
  }
}

const request: RunStatisticsRuntimeRequest = {
  inputLatex: 'descriptive(values={1,2,3,4,5})',
  screenHint: 'descriptive',
  workingSourceHint: 'dataset',
};

const createWorker = (behavior: 'complete' | 'fail' | 'invalid' | 'silent'): CreateStatisticsWorker =>
  () => new FakeStatisticsWorker(behavior);

function control(shouldCancel = () => false): OoeRuntimeControlContext {
  return {
    registryId: 'runtime-probe.statistics.cancel',
    shouldCancel,
    checkpoint: () => undefined,
    yieldIfBudgetExceeded: async () => false,
  };
}

beforeEach(() => {
  clearOoeJobRegistry();
  clearOoeDiagnostics();
});

function serialized(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

describe('Statistics worker runtime shell', () => {
  it('returns native worker payloads with Statistics host evidence', async () => {
    const result = await runStatisticsModeWithOoePilot(request, {
      commitPolicy: 'alwaysCommit',
      createWorker: createWorker('complete'),
    });

    expect(serialized(result.payload)).toEqual(serialized(buildStatisticsModeRunPayload(request)));
    expect(result.ooe.statisticsHostExecution).toMatchObject({
      kind: 'worker',
      hostId: 'statistics-worker-runtime',
      terminalStatus: 'completed',
    });
    expect(result.ooe.runtimeShell).toMatchObject({
      shellId: 'statistics-worker-shell',
      selectedHostId: 'statistics-worker-runtime',
      lifecycle: 'completed',
    });
  });

  it('falls back only before Statistics worker startup', async () => {
    const result = await runStatisticsModeWithOoePilot(request, {
      commitPolicy: 'alwaysCommit',
    });

    expect(serialized(result.payload)).toEqual(serialized(buildStatisticsModeRunPayload(request)));
    expect(result.ooe.statisticsHostExecution).toMatchObject({
      kind: 'fallback',
      hostId: 'statistics-runtime',
      fallbackFromHostId: 'statistics-worker-runtime',
    });
  });

  it('records Statistics worker failure without retrying after startup', async () => {
    await expect(runStatisticsModeWithOoePilot(request, {
      commitPolicy: 'alwaysCommit',
      createWorker: createWorker('fail'),
    })).rejects.toThrow('Statistics worker runtime failed: synthetic statistics worker failure');

    const failedJob = listRecentOoeJobs()[0];
    const failedDiagnostic = listOoeDiagnostics()
      .find((record) => record.job.jobId === failedJob.jobId);
    expect(failedJob.status).toBe('failed');
    expect(failedDiagnostic?.terminalStatus).toBe('failed');
    expect(failedDiagnostic?.provenance?.runtimeHost).toBe('statistics-worker-runtime');
  });

  it('fails closed for an invalid canonical worker outcome', async () => {
    await expect(runStatisticsModeWithOoePilot(request, {
      commitPolicy: 'alwaysCommit',
      createWorker: createWorker('invalid'),
    })).rejects.toThrow('invalid completed outcome');
  });

  it('hard-stops a running Statistics worker on cancellation', async () => {
    const worker = new FakeStatisticsWorker('silent');
    let cancelled = false;
    const pending = runStatisticsModeViaIsolatedWorker(
      request,
      control(() => cancelled),
      {
        createWorker: () => worker,
        fallback: () => buildCanonicalStatisticsModeRunPayload(request),
      },
    );

    await new Promise((resolve) => setTimeout(resolve, 5));
    cancelled = true;
    const result = await pending;

    expect(worker.terminated).toBe(true);
    expect(result.payload.outcome.kind).toBe('error');
    expect(result.hostExecution).toMatchObject({
      kind: 'worker-cancelled',
      hostId: 'statistics-worker-runtime',
      terminalStatus: 'cancelled',
      termination: 'hardStop',
    });
  });
});
