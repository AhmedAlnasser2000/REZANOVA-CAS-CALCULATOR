import { describe, expect, it } from 'vitest';
import type { OoeJobIdentity } from './ooe-bridge';
import { assessOoeCommit, assessOoeCommitWithoutJob } from './job-contract';

const job: OoeJobIdentity = {
  jobId: 'job.equation.solve.42',
  planId: 'plan.equation.solve',
  capabilityId: 'equation.solve',
  hostId: 'equation-runtime',
  nodeId: 'node.equation.solve',
  phaseId: 'equation.solve',
  inputRevisionId: 'input.42',
};

describe('OOE job commit contract', () => {
  it('always commits for alwaysCommit', () => {
    expect(assessOoeCommit(job, 'input.other', 'alwaysCommit')).toMatchObject({
      legality: 'commitAllowed',
      commitDecision: 'committed',
      resultStability: 'stable',
    });
  });

  it('commitLatestOnly commits only the active input revision', () => {
    expect(assessOoeCommit(job, 'input.42', 'commitLatestOnly')).toMatchObject({
      activeInputRevisionId: 'input.42',
      legality: 'commitAllowed',
      commitDecision: 'committed',
      resultStability: 'stable',
    });

    expect(assessOoeCommit(job, 'input.43', 'commitLatestOnly')).toMatchObject({
      activeInputRevisionId: 'input.43',
      legality: 'staleDrop',
      commitDecision: 'staleDropped',
      resultStability: 'stale',
    });

    expect(assessOoeCommit(job, null, 'commitLatestOnly')).toMatchObject({
      activeInputRevisionId: null,
      legality: 'staleDrop',
      commitDecision: 'staleDropped',
      resultStability: 'stale',
    });
  });

  it('commitIfCurrent skips when no active input revision exists', () => {
    expect(assessOoeCommit(job, 'input.42', 'commitIfCurrent')).toMatchObject({
      legality: 'commitAllowed',
      commitDecision: 'committed',
      resultStability: 'stable',
    });

    expect(assessOoeCommit(job, 'input.43', 'commitIfCurrent')).toMatchObject({
      legality: 'staleDrop',
      commitDecision: 'staleDropped',
      resultStability: 'stale',
    });

    expect(assessOoeCommit(job, null, 'commitIfCurrent')).toMatchObject({
      legality: 'skipped',
      commitDecision: 'skipped',
      resultStability: 'stale',
    });
  });

  it('marks routes without job context as not applicable', () => {
    expect(assessOoeCommitWithoutJob('commitLatestOnly')).toEqual({
      job: null,
      activeInputRevisionId: null,
      commitPolicy: 'commitLatestOnly',
      legality: 'notApplicable',
      commitDecision: 'notApplicable',
      resultStability: 'draft',
    });
  });
});
