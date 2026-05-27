import { describe, expect, it } from 'vitest';
import type { OoeJobIdentity } from './ooe-bridge';
import {
  assessOoeCommit,
  assessOoeCommitWithoutJob,
  buildOoeJobCommitContext,
  buildOoeJobIdentity,
  canonicalizeOoeJobSnapshot,
} from './job-contract';

const definition = {
  planId: 'plan.equation.solve',
  capabilityId: 'equation.solve',
  hostId: 'equation-runtime',
  nodeId: 'node.equation.solve',
  phaseId: 'equation.solve',
};

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
  it('creates stable deterministic IDs for equivalent snapshots', () => {
    const first = {
      request: {
        latex: 'x+1=2',
        angleUnit: 'deg',
        nested: [{ b: 2, a: 1 }],
      },
    };
    const second = {
      request: {
        nested: [{ a: 1, b: 2 }],
        angleUnit: 'deg',
        latex: 'x+1=2',
      },
    };

    expect(canonicalizeOoeJobSnapshot(first)).toBe(canonicalizeOoeJobSnapshot(second));
    expect(buildOoeJobIdentity(definition, first)).toEqual(buildOoeJobIdentity(definition, second));
    expect(buildOoeJobIdentity(definition, first)).toMatchObject({
      planId: definition.planId,
      capabilityId: definition.capabilityId,
      hostId: definition.hostId,
      nodeId: definition.nodeId,
      phaseId: definition.phaseId,
    });
    expect(buildOoeJobIdentity(definition, first).jobId).toMatch(/^job\.equation\.solve\.[a-z0-9]+$/u);
    expect(buildOoeJobIdentity(definition, first).inputRevisionId)
      .toMatch(/^input\.equation\.solve\.[a-z0-9]+$/u);
  });

  it('changes revision when meaningful route input changes', () => {
    const first = buildOoeJobIdentity(definition, { request: { latex: 'x+1=2' } });
    const second = buildOoeJobIdentity(definition, { request: { latex: 'x+2=3' } });

    expect(first.inputRevisionId).not.toBe(second.inputRevisionId);
    expect(first.jobId).not.toBe(second.jobId);
  });

  it('builds default commit-allowed context for current metadata-only pilots', () => {
    const context = buildOoeJobCommitContext(definition, { request: { latex: 'x+1=2' } });

    expect(context.commitAssessment).toMatchObject({
      job: context.job,
      activeInputRevisionId: context.job.inputRevisionId,
      commitPolicy: 'commitLatestOnly',
      legality: 'commitAllowed',
      commitDecision: 'committed',
      resultStability: 'stable',
    });
  });

  it('supports test overrides for stale and skipped assessments', () => {
    expect(buildOoeJobCommitContext(
      definition,
      { request: { latex: 'x+1=2' } },
      { activeInputRevisionId: 'input.equation.solve.other' },
    ).commitAssessment).toMatchObject({
      legality: 'staleDrop',
      commitDecision: 'staleDropped',
      resultStability: 'stale',
    });

    expect(buildOoeJobCommitContext(
      definition,
      { request: { latex: 'x+1=2' } },
      { activeInputRevisionId: null, commitPolicy: 'commitIfCurrent' },
    ).commitAssessment).toMatchObject({
      legality: 'skipped',
      commitDecision: 'skipped',
      resultStability: 'stale',
    });
  });

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
