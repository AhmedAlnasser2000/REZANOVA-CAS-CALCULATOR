import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearOoeEvents,
  configureOoeEventLimit,
  getLatestOoeEvent,
  listOoeEvents,
  recordOoeEvent,
  resetOoeEventOutboxForTests,
  subscribeToOoeEvents,
} from './event-outbox';
import {
  OOE_EVENT_COMPARTMENT_OPTIONS,
  resolveOoeEventCompartment,
} from './compartment-labels';

describe('OOE event outbox', () => {
  beforeEach(() => {
    resetOoeEventOutboxForTests();
  });

  it('records OOE events in chronological order with monotonic sequence ids', () => {
    recordOoeEvent({
      type: 'ooe.job.started',
      severity: 'info',
      jobId: 'job.one',
      routeLabel: 'equation.solve',
    });
    recordOoeEvent({
      type: 'ooe.result.committed',
      severity: 'info',
      jobId: 'job.one',
      routeLabel: 'equation.solve',
    });

    expect(listOoeEvents()).toMatchObject([
      {
        eventId: 'ooe.event.1',
        sequence: 1,
        type: 'ooe.job.started',
        version: 1,
        source: 'ooe',
        jobId: 'job.one',
      },
      {
        eventId: 'ooe.event.2',
        sequence: 2,
        type: 'ooe.result.committed',
        version: 1,
        source: 'ooe',
        jobId: 'job.one',
      },
    ]);
  });

  it('preserves optional compartment metadata on event snapshots', () => {
    recordOoeEvent({
      type: 'ooe.job.started',
      severity: 'info',
      jobId: 'job.equation.solve.1',
      routeLabel: 'equation.solve',
      compartmentId: 'equation',
      compartmentLabel: 'Equation',
    });

    expect(listOoeEvents()[0]).toMatchObject({
      compartmentId: 'equation',
      compartmentLabel: 'Equation',
    });
  });

  it('preserves optional workspace instance metadata on event snapshots', () => {
    recordOoeEvent({
      type: 'ooe.job.started',
      severity: 'info',
      jobId: 'job.equation.solve.1',
      workspaceInstanceId: 'workspace.equation.1',
      workspaceInstanceLabel: 'Equation A',
    });

    expect(listOoeEvents()[0]).toMatchObject({
      workspaceInstanceId: 'workspace.equation.1',
      workspaceInstanceLabel: 'Equation A',
    });
  });

  it('resolves OOE lifecycle facts to known compartment labels without guessing unknowns', () => {
    expect(OOE_EVENT_COMPARTMENT_OPTIONS.map((option) => option.compartmentId)).toEqual([
      'calculate',
      'equation',
      'calculus',
      'trigonometry',
      'statistics',
      'geometry',
      'linear-algebra',
      'table',
      'navigation-input-kernel',
    ]);
    expect(resolveOoeEventCompartment({ capabilityId: 'expression.evaluate' })).toEqual({
      compartmentId: 'calculate',
      compartmentLabel: 'Calculate',
    });
    expect(resolveOoeEventCompartment({ capabilityId: 'calculate.workbench' })).toEqual({
      compartmentId: 'calculate',
      compartmentLabel: 'Calculate',
    });
    expect(resolveOoeEventCompartment({ capabilityId: 'equation.solve' })).toEqual({
      compartmentId: 'equation',
      compartmentLabel: 'Equation',
    });
    expect(resolveOoeEventCompartment({ capabilityId: 'calculus.evaluate' })).toEqual({
      compartmentId: 'calculus',
      compartmentLabel: 'Calculus',
    });
    expect(resolveOoeEventCompartment({ capabilityId: 'trigonometry.evaluate' })).toEqual({
      compartmentId: 'trigonometry',
      compartmentLabel: 'Trigonometry',
    });
    expect(resolveOoeEventCompartment({ capabilityId: 'statistics.evaluate' })).toEqual({
      compartmentId: 'statistics',
      compartmentLabel: 'Statistics',
    });
    expect(resolveOoeEventCompartment({ capabilityId: 'geometry.evaluate' })).toEqual({
      compartmentId: 'geometry',
      compartmentLabel: 'Geometry',
    });
    expect(resolveOoeEventCompartment({ capabilityId: 'linearAlgebra.matrix' })).toEqual({
      compartmentId: 'linear-algebra',
      compartmentLabel: 'Linear Algebra',
    });
    expect(resolveOoeEventCompartment({ capabilityId: 'linearAlgebra.vector' })).toEqual({
      compartmentId: 'linear-algebra',
      compartmentLabel: 'Linear Algebra',
    });
    expect(resolveOoeEventCompartment({ capabilityId: 'table.build' })).toEqual({
      compartmentId: 'table',
      compartmentLabel: 'Table',
    });
    expect(resolveOoeEventCompartment({ capabilityId: 'editor.variableHints' })).toEqual({
      compartmentId: 'navigation-input-kernel',
      compartmentLabel: 'Navigation/Input',
    });
    expect(resolveOoeEventCompartment({ capabilityId: 'test.route' })).toBeUndefined();
  });

  it('keeps a bounded buffer by evicting oldest events', () => {
    configureOoeEventLimit(2);

    recordOoeEvent({ type: 'ooe.job.started', severity: 'info', jobId: 'job.one' });
    recordOoeEvent({ type: 'ooe.host.selected', severity: 'debug', jobId: 'job.one' });
    recordOoeEvent({ type: 'ooe.result.skipped', severity: 'info', jobId: 'job.one' });

    expect(listOoeEvents().map((event) => event.type)).toEqual([
      'ooe.host.selected',
      'ooe.result.skipped',
    ]);
  });

  it('notifies subscribers and supports unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToOoeEvents(listener);

    recordOoeEvent({ type: 'ooe.job.started', severity: 'info', jobId: 'job.one' });
    unsubscribe();
    recordOoeEvent({ type: 'ooe.job.completed', severity: 'info', jobId: 'job.one' });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({
      type: 'ooe.job.started',
      sequence: 1,
    }));
  });

  it('returns cloned event snapshots from list, latest, record, and subscribers', () => {
    const listener = vi.fn((event) => {
      event.payload = { mutated: true };
    });
    subscribeToOoeEvents(listener);

    const recorded = recordOoeEvent({
      type: 'ooe.host.selected',
      severity: 'debug',
      payload: { status: 'ready' },
    });
    recorded.payload = { mutated: true };
    const listed = listOoeEvents();
    listed[0].payload = { mutated: true };

    expect(getLatestOoeEvent()).toMatchObject({
      payload: { status: 'ready' },
    });
  });

  it('gets the latest event matching a predicate', () => {
    recordOoeEvent({ type: 'ooe.job.started', severity: 'info', jobId: 'job.one' });
    recordOoeEvent({ type: 'ooe.job.started', severity: 'info', jobId: 'job.two' });
    recordOoeEvent({ type: 'ooe.job.failed', severity: 'error', jobId: 'job.one' });

    expect(getLatestOoeEvent((event) => event.jobId === 'job.two')).toMatchObject({
      jobId: 'job.two',
      type: 'ooe.job.started',
    });
  });

  it('clears events and resets sequence by default', () => {
    recordOoeEvent({ type: 'ooe.job.started', severity: 'info' });
    clearOoeEvents();

    expect(listOoeEvents()).toEqual([]);
    expect(recordOoeEvent({ type: 'ooe.job.started', severity: 'info' })).toMatchObject({
      sequence: 1,
    });
  });

  it('rejects shallow non-serializable payload fields', () => {
    expect(() => {
      recordOoeEvent({
        type: 'ooe.job.failed',
        severity: 'error',
        payload: { callback: () => undefined },
      });
    }).toThrow(/not serializable/u);
  });

  it('requires a positive integer retention limit', () => {
    expect(() => configureOoeEventLimit(0)).toThrow(/positive integer/u);
    expect(() => configureOoeEventLimit(1.5)).toThrow(/positive integer/u);
  });
});
