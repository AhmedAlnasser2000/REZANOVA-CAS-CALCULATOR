import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearOoeJobRegistry,
  completeOoeJob,
  failOoeJob,
  listActiveOoeJobs,
  listRecentOoeJobs,
  startOoeJob,
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
});
