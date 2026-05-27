import type {
  OoeCommitAssessment,
  OoeCommitDecision,
  OoeCommitLegality,
  OoeCommitPolicy,
  OoeJobIdentity,
  OoeResultStability,
} from './ooe-bridge';

function buildAssessment(
  job: OoeJobIdentity | null,
  activeInputRevisionId: string | null,
  commitPolicy: OoeCommitPolicy,
  legality: OoeCommitLegality,
  commitDecision: OoeCommitDecision,
  resultStability: OoeResultStability,
): OoeCommitAssessment {
  return {
    job,
    activeInputRevisionId,
    commitPolicy,
    legality,
    commitDecision,
    resultStability,
  };
}

export function assessOoeCommit(
  job: OoeJobIdentity,
  activeInputRevisionId: string | null,
  commitPolicy: OoeCommitPolicy,
): OoeCommitAssessment {
  if (commitPolicy === 'alwaysCommit') {
    return buildAssessment(
      job,
      activeInputRevisionId,
      commitPolicy,
      'commitAllowed',
      'committed',
      'stable',
    );
  }

  if (commitPolicy === 'commitLatestOnly') {
    const matchesActiveRevision = activeInputRevisionId === job.inputRevisionId;
    return buildAssessment(
      job,
      activeInputRevisionId,
      commitPolicy,
      matchesActiveRevision ? 'commitAllowed' : 'staleDrop',
      matchesActiveRevision ? 'committed' : 'staleDropped',
      matchesActiveRevision ? 'stable' : 'stale',
    );
  }

  if (activeInputRevisionId == null) {
    return buildAssessment(job, null, commitPolicy, 'skipped', 'skipped', 'stale');
  }

  const matchesActiveRevision = activeInputRevisionId === job.inputRevisionId;
  return buildAssessment(
    job,
    activeInputRevisionId,
    commitPolicy,
    matchesActiveRevision ? 'commitAllowed' : 'staleDrop',
    matchesActiveRevision ? 'committed' : 'staleDropped',
    matchesActiveRevision ? 'stable' : 'stale',
  );
}

export function assessOoeCommitWithoutJob(
  commitPolicy: OoeCommitPolicy,
): OoeCommitAssessment {
  return buildAssessment(
    null,
    null,
    commitPolicy,
    'notApplicable',
    'notApplicable',
    'draft',
  );
}
