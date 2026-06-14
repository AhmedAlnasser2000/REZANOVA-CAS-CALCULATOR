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
