import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearOoeJobRegistry,
  clearRecentOoeJobs,
  completeOoeJob,
  failOoeJob,
  isOoeJobCancellationRequested,
  listActiveOoeJobs,
  listRecentOoeJobs,
  markOoeJobCancelled,
  requestLatestOoeCapabilityCancellation,
  requestOoeJobCancellation,
  startOoeJob,
  subscribeToOoeActiveJobChanges,
} from './active-job-registry';
import {
  buildOoeJobCommitContext,
  type OoeJobIdentityDefinition,
} from './job-contract';

const definition: OoeJobIdentityDefinition = {
  planId: 'plan.expression.evaluate',
  capabilityId: 'expression.evaluate',
  hostId: 'expression-runtime',
  nodeId: 'node.expression.evaluate',
  phaseId: 'expression.evaluate',
};

function context(snapshot: unknown = { latex: '1+1' }, activeInputRevisionId?: string | null) {
  return buildOoeJobCommitContext(
    definition,
    snapshot,
    activeInputRevisionId === undefined ? undefined : { activeInputRevisionId },
  );
}

describe('active OOE job registry', () => {
  beforeEach(() => {
    clearOoeJobRegistry();
  });

  it('starts jobs, lists active jobs, and moves completed jobs to recent records', () => {
    const jobContext = context();
    const started = startOoeJob({
      job: jobContext.job,
      routeLabel: 'expression.evaluate',
    });

    expect(listActiveOoeJobs()).toMatchObject([
      {
        registryId: started.registryId,
        jobId: jobContext.job.jobId,
        routeLabel: 'expression.evaluate',
        status: 'started',
      },
    ]);

    const completed = completeOoeJob(started, {
      commitAssessment: jobContext.commitAssessment,
      traceEvents: [],
    });

    expect(completed).toMatchObject({
      registryId: started.registryId,
      status: 'completed',
      commitAssessment: jobContext.commitAssessment,
    });
    expect(listActiveOoeJobs()).toEqual([]);
    expect(listRecentOoeJobs()).toMatchObject([
      {
        registryId: started.registryId,
        status: 'completed',
      },
    ]);
  });

  it('publishes active-job changes through an unsubscribe-safe registry seam', () => {
    let revisions = 0;
    const unsubscribe = subscribeToOoeActiveJobChanges(() => {
      revisions += 1;
    });
    const jobContext = context();
    const started = startOoeJob({
      job: jobContext.job,
      routeLabel: 'expression.evaluate',
    });
    completeOoeJob(started, {
      commitAssessment: jobContext.commitAssessment,
      traceEvents: [],
    });
    expect(revisions).toBe(2);

    unsubscribe();
    startOoeJob({
      job: context({ latex: 'after unsubscribe' }).job,
      routeLabel: 'expression.evaluate',
    });
    expect(revisions).toBe(2);
  });

  it('keeps a bounded recent lifecycle buffer', () => {
    clearOoeJobRegistry({ recentJobLimit: 2 });

    for (const latex of ['1+1', '2+2', '3+3']) {
      const jobContext = context({ latex });
      const started = startOoeJob({
        job: jobContext.job,
        routeLabel: 'expression.evaluate',
      });
      completeOoeJob(started, {
        commitAssessment: jobContext.commitAssessment,
        traceEvents: [],
      });
    }

    const recent = listRecentOoeJobs();
    expect(recent).toHaveLength(2);
    expect(recent.map((record) => record.sequence)).toEqual([3, 2]);
  });

  it('clears recent jobs without cancelling active jobs', () => {
    const completedContext = context({ latex: 'completed' });
    const completedStarted = startOoeJob({
      job: completedContext.job,
      routeLabel: 'expression.evaluate',
    });
    completeOoeJob(completedStarted, {
      commitAssessment: completedContext.commitAssessment,
      traceEvents: [],
    });

    const activeContext = context({ latex: 'active' });
    const activeStarted = startOoeJob({
      job: activeContext.job,
      routeLabel: 'expression.evaluate',
    });

    clearRecentOoeJobs();

    expect(listRecentOoeJobs()).toEqual([]);
    expect(listActiveOoeJobs()).toMatchObject([
      {
        registryId: activeStarted.registryId,
        status: 'started',
      },
    ]);
  });

  it('records stale dropped and skipped jobs from commit assessments', () => {
    const staleContext = context({ latex: 'x' }, 'input.expression.evaluate.stale');
    const staleStarted = startOoeJob({
      job: staleContext.job,
      routeLabel: 'expression.evaluate',
    });
    completeOoeJob(staleStarted, {
      commitAssessment: staleContext.commitAssessment,
      traceEvents: [],
    });

    const skippedContext = buildOoeJobCommitContext(
      definition,
      { latex: 'y' },
      { commitPolicy: 'commitIfCurrent', activeInputRevisionId: null },
    );
    const skippedStarted = startOoeJob({
      job: skippedContext.job,
      routeLabel: 'expression.evaluate',
    });
    completeOoeJob(skippedStarted, {
      commitAssessment: skippedContext.commitAssessment,
      traceEvents: [],
    });

    expect(listRecentOoeJobs()).toMatchObject([
      { status: 'skipped' },
      { status: 'staleDropped' },
    ]);
  });

  it('records failed jobs and clears the active slot', () => {
    const jobContext = context();
    const started = startOoeJob({
      job: jobContext.job,
      routeLabel: 'expression.evaluate',
    });

    const failed = failOoeJob(started, new Error('runtime exploded'));

    expect(failed).toMatchObject({
      status: 'failed',
      errorMessage: 'runtime exploded',
    });
    expect(listActiveOoeJobs()).toEqual([]);
    expect(listRecentOoeJobs()).toMatchObject([
      {
        status: 'failed',
        errorMessage: 'runtime exploded',
      },
    ]);
  });

  it('marks an active job as cancel requested and stores request metadata', () => {
    const jobContext = context();
    const started = startOoeJob({
      job: jobContext.job,
      routeLabel: 'expression.evaluate',
    });

    const requested = requestOoeJobCancellation(started.registryId, {
      requestedBy: 'test',
      reason: 'user pressed stop',
    });

    expect(requested).toMatchObject({
      registryId: started.registryId,
      status: 'cancelRequested',
      cancellationRequest: {
        requestedBy: 'test',
        reason: 'user pressed stop',
      },
    });
    expect(listActiveOoeJobs()).toMatchObject([
      {
        registryId: started.registryId,
        status: 'cancelRequested',
        cancellationRequest: {
          requestedBy: 'test',
          reason: 'user pressed stop',
        },
      },
    ]);
  });

  it('requests cancellation for the latest active job in a capability', () => {
    const firstContext = context({ latex: '1+1' });
    const secondContext = context({ latex: '2+2' });
    const firstStarted = startOoeJob({
      job: firstContext.job,
      routeLabel: 'expression.evaluate',
    });
    const secondStarted = startOoeJob({
      job: secondContext.job,
      routeLabel: 'expression.evaluate',
    });

    const requested = requestLatestOoeCapabilityCancellation('expression.evaluate', {
      requestedBy: 'test',
    });

    expect(requested).toMatchObject({
      registryId: secondStarted.registryId,
      status: 'cancelRequested',
    });
    expect(listActiveOoeJobs()).toMatchObject([
      {
        registryId: firstStarted.registryId,
        status: 'started',
      },
      {
        registryId: secondStarted.registryId,
        status: 'cancelRequested',
      },
    ]);
    expect(requestLatestOoeCapabilityCancellation('equation.solve')).toBeNull();
  });

  it('queries cancellation requests for active and recent records', () => {
    const jobContext = context();
    const started = startOoeJob({
      job: jobContext.job,
      routeLabel: 'expression.evaluate',
    });

    expect(isOoeJobCancellationRequested(started.registryId)).toBe(false);
    const requested = requestOoeJobCancellation(started.registryId, {
      requestedBy: 'test',
    });
    expect(requested).not.toBeNull();
    expect(isOoeJobCancellationRequested(started.registryId)).toBe(true);
    expect(isOoeJobCancellationRequested(requested!)).toBe(true);

    completeOoeJob(started, {
      commitAssessment: jobContext.commitAssessment,
      traceEvents: [],
    });

    expect(isOoeJobCancellationRequested(started.registryId)).toBe(true);
    expect(isOoeJobCancellationRequested('missing-registry-id')).toBe(false);
  });

  it('marks an active job as cancelled and moves it to recent records', () => {
    const jobContext = context();
    const started = startOoeJob({
      job: jobContext.job,
      routeLabel: 'expression.evaluate',
    });
    requestOoeJobCancellation(started.registryId, {
      requestedBy: 'test',
      reason: 'contract test',
    });

    const cancelled = markOoeJobCancelled(started.registryId);

    expect(cancelled).toMatchObject({
      registryId: started.registryId,
      status: 'cancelled',
      cancellationRequest: {
        requestedBy: 'test',
        reason: 'contract test',
      },
    });
    expect(listActiveOoeJobs()).toEqual([]);
    expect(listRecentOoeJobs()).toMatchObject([
      {
        registryId: started.registryId,
        status: 'cancelled',
      },
    ]);
    expect(markOoeJobCancelled(started.registryId)).toBeNull();
  });

  it('preserves cancellation request metadata when completing or failing normally', () => {
    const completedContext = context({ latex: 'complete' });
    const completedStarted = startOoeJob({
      job: completedContext.job,
      routeLabel: 'expression.evaluate',
    });
    requestOoeJobCancellation(completedStarted.registryId, {
      requestedBy: 'test',
      reason: 'complete anyway',
    });
    const completed = completeOoeJob(completedStarted, {
      commitAssessment: completedContext.commitAssessment,
      traceEvents: [],
    });

    const failedContext = context({ latex: 'fail' });
    const failedStarted = startOoeJob({
      job: failedContext.job,
      routeLabel: 'expression.evaluate',
    });
    requestOoeJobCancellation(failedStarted.registryId, {
      requestedBy: 'test',
      reason: 'fail anyway',
    });
    const failed = failOoeJob(failedStarted, new Error('runtime failed'));

    expect(completed).toMatchObject({
      status: 'completed',
      cancellationRequest: {
        requestedBy: 'test',
        reason: 'complete anyway',
      },
    });
    expect(failed).toMatchObject({
      status: 'failed',
      cancellationRequest: {
        requestedBy: 'test',
        reason: 'fail anyway',
      },
    });
    expect(listRecentOoeJobs()).toMatchObject([
      { status: 'failed', cancellationRequest: { reason: 'fail anyway' } },
      { status: 'completed', cancellationRequest: { reason: 'complete anyway' } },
    ]);
  });
});
