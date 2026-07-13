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
import {
  runTableMode,
  runTableModeWithOoePilot,
  type RunTableModeRequest,
} from './table';
import {
  runTableModeViaIsolatedWorker,
  type CreateTableWorker,
} from './worker-clients/table-worker-client';
import type {
  TableWorkerInboundMessage,
  TableWorkerOutboundMessage,
} from './worker-entrypoints/table.worker';
import { buildCanonicalTableModeResult } from './table-core';
import type { CanonicalTableModeResult } from './table-core';

type Listener = (event: MessageEvent<TableWorkerOutboundMessage>) => void;
type ErrorListener = (event: Event) => void;

class FakeTableRuntimeWorker {
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

  postMessage(message: TableWorkerInboundMessage) {
    if (this.behavior === 'silent') return;
    this.emit({ kind: 'started', requestId: message.requestId });
    if (this.behavior === 'fail') {
      this.emit({
        kind: 'failed',
        requestId: message.requestId,
        message: 'synthetic table worker failure',
      });
      return;
    }
    if (this.behavior === 'invalid') {
      this.emit({
        kind: 'completed',
        requestId: message.requestId,
        payload: {
          ...buildCanonicalTableModeResult(runTableMode(message.request)),
          outcome: { kind: 'success' },
        } as unknown as CanonicalTableModeResult,
      });
      return;
    }
    this.emit({
      kind: 'completed',
      requestId: message.requestId,
      payload: buildCanonicalTableModeResult(runTableMode(message.request)),
    });
  }

  terminate() {
    this.terminated = true;
  }

  private emit(message: TableWorkerOutboundMessage) {
    const event = { data: message } as MessageEvent<TableWorkerOutboundMessage>;
    for (const listener of this.listeners) listener(event);
  }
}

const request: RunTableModeRequest = {
  primaryLatex: 'x^2',
  secondaryLatex: '',
  secondaryEnabled: false,
  start: -1,
  end: 1,
  step: 1,
};

function createWorker(behavior: 'complete' | 'fail' | 'invalid' | 'silent'): CreateTableWorker {
  return () => new FakeTableRuntimeWorker(behavior) as unknown as ReturnType<CreateTableWorker>;
}

function control(shouldCancel = () => false): OoeRuntimeControlContext {
  return {
    registryId: 'runtime-probe.table.cancel',
    shouldCancel,
    checkpoint: () => undefined,
    yieldIfBudgetExceeded: async () => false,
  };
}

beforeEach(() => {
  clearOoeJobRegistry();
  clearOoeDiagnostics();
});

describe('Table worker runtime shell', () => {
  it('returns native worker payloads with Table host evidence', async () => {
    const result = await runTableModeWithOoePilot(request, {
      commitPolicy: 'alwaysCommit',
      createWorker: createWorker('complete'),
    });

    expect(result.payload).toEqual(runTableMode(request));
    expect(result.ooe.tableHostExecution).toMatchObject({
      kind: 'worker',
      hostId: 'table-worker-runtime',
    });
    expect(result.ooe.runtimeShell).toMatchObject({
      shellId: 'table-worker-shell',
      selectedHostId: 'table-worker-runtime',
      lifecycle: 'completed',
    });
  });

  it('falls back before Table worker startup when workers are unavailable', async () => {
    const result = await runTableModeWithOoePilot(request, {
      commitPolicy: 'alwaysCommit',
    });

    expect(result.payload).toEqual(runTableMode(request));
    expect(result.ooe.tableHostExecution).toMatchObject({
      kind: 'fallback',
      hostId: 'table-runtime',
      fallbackFromHostId: 'table-worker-runtime',
      reason: 'worker-unavailable',
    });
  });

  it('preserves Table cooperative fallback after worker runtime failure', async () => {
    const result = await runTableModeWithOoePilot(request, {
      commitPolicy: 'alwaysCommit',
      createWorker: createWorker('fail'),
    });

    expect(result.payload).toEqual(runTableMode(request));
    expect(result.ooe.tableHostExecution).toMatchObject({
      kind: 'fallback',
      hostId: 'table-runtime',
      fallbackFromHostId: 'table-worker-runtime',
      reason: 'worker-runtime-failed: synthetic table worker failure',
    });
    expect(listRecentOoeJobs()[0].status).toBe('completed');
    expect(listOoeDiagnostics()[0]?.provenance?.runtimeHost).toBe('table-runtime');
  });

  it('preserves Table fallback semantics for malformed canonical completions', async () => {
    const result = await runTableModeWithOoePilot(request, {
      commitPolicy: 'alwaysCommit',
      createWorker: createWorker('invalid'),
    });

    expect(result.payload).toEqual(runTableMode(request));
    expect(result.ooe.tableHostExecution).toMatchObject({
      kind: 'fallback',
      hostId: 'table-runtime',
      fallbackFromHostId: 'table-worker-runtime',
    });
    expect(result.ooe.tableHostExecution?.kind === 'fallback'
      ? result.ooe.tableHostExecution.reason
      : '').toContain('invalid-completed-outcome');
  });

  it('hard-stops a running Table worker on cancellation', async () => {
    const worker = new FakeTableRuntimeWorker('silent');
    let cancelled = false;
    const pending = runTableModeViaIsolatedWorker(
      request,
      control(() => cancelled),
      {
        createWorker: () => worker as unknown as ReturnType<CreateTableWorker>,
        fallback: async () => buildCanonicalTableModeResult(runTableMode(request)),
      },
    );

    await new Promise((resolve) => setTimeout(resolve, 5));
    cancelled = true;
    const result = await pending;

    expect(worker.terminated).toBe(true);
    expect(result.payload.outcome.kind).toBe('error');
    expect(result.hostExecution).toMatchObject({
      kind: 'worker-cancelled',
      hostId: 'table-worker-runtime',
      termination: 'hardStop',
    });
  });
});
