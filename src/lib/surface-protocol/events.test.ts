import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  recordOoeEvent,
  resetOoeEventOutboxForTests,
} from '../ooe/events/event-outbox';
import {
  listSurfaceLifecycleEvents,
  mapOoeEventToSurfaceLifecycleEvent,
  subscribeToSurfaceLifecycleEvents,
} from './events';
import { SURFACE_PROTOCOL_VERSION } from './dto';

describe('Surface Protocol event adapter', () => {
  beforeEach(() => {
    resetOoeEventOutboxForTests();
  });

  it('maps curated Equation lifecycle events without raw internals', () => {
    recordOoeEvent({
      type: 'ooe.job.started',
      severity: 'info',
      jobId: 'job.equation.1',
      planId: 'plan.equation.solve',
      hostId: 'equation-worker-runtime',
      capabilityId: 'equation.solve',
      payload: { privateDiagnostic: 'hidden' },
      message: 'Internal host message should not cross.',
    });

    expect(listSurfaceLifecycleEvents()).toEqual([
      {
        protocolVersion: SURFACE_PROTOCOL_VERSION,
        eventId: 'surface.event.1',
        sequence: 1,
        timestamp: expect.any(Number),
        type: 'surface.job.started',
        status: 'started',
        severity: 'info',
        workspaceKind: 'equation',
        surfaceJobId: 'job.equation.1',
        summary: 'Compute started.',
      },
    ]);
    const serialized = JSON.stringify(listSurfaceLifecycleEvents()[0]);
    expect(serialized).not.toContain('privateDiagnostic');
    expect(serialized).not.toContain('equation-worker-runtime');
    expect(serialized).not.toContain('plan.equation.solve');
    expect(serialized).not.toContain('Internal host message');
  });

  it('maps Calculate events from expression capabilities', () => {
    const event = recordOoeEvent({
      type: 'ooe.result.committed',
      severity: 'info',
      jobId: 'job.calculate.1',
      capabilityId: 'expression.evaluate',
    });

    expect(mapOoeEventToSurfaceLifecycleEvent(event)).toMatchObject({
      type: 'surface.result.committed',
      status: 'committed',
      workspaceKind: 'calculate',
      surfaceJobId: 'job.calculate.1',
    });
  });

  it('drops host selection, preflight, diagnostics-like payloads, and unsupported workspaces', () => {
    recordOoeEvent({
      type: 'ooe.host.selected',
      severity: 'debug',
      capabilityId: 'equation.solve',
      hostId: 'equation-worker-runtime',
    });
    recordOoeEvent({
      type: 'ooe.preflight.completed',
      severity: 'debug',
      capabilityId: 'expression.evaluate',
    });
    recordOoeEvent({
      type: 'ooe.result.committed',
      severity: 'info',
      capabilityId: 'table.build',
    });

    expect(listSurfaceLifecycleEvents()).toEqual([]);
  });

  it('subscribes read-only to mapped lifecycle events', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToSurfaceLifecycleEvents(listener);

    recordOoeEvent({
      type: 'ooe.job.failed',
      severity: 'error',
      jobId: 'job.equation.failed',
      capabilityId: 'equation.solve',
      payload: { error: 'raw stack' },
    });
    recordOoeEvent({
      type: 'ooe.host.selected',
      severity: 'debug',
      capabilityId: 'equation.solve',
    });
    unsubscribe();
    recordOoeEvent({
      type: 'ooe.job.cancelled',
      severity: 'warning',
      jobId: 'job.equation.cancelled',
      capabilityId: 'equation.solve',
    });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({
      type: 'surface.job.failed',
      status: 'failed',
      summary: 'Compute failed.',
    }));
  });
});
