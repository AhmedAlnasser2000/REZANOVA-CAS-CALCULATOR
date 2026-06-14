import type {
  OoeCommitAssessment,
  OoeCommitDecision,
  OoeCommitLegality,
  OoeCommitPolicy,
  OoeJobIdentity,
  OoeResultStability,
} from '../bridge-schema/ooe-bridge';

export type OoeJobIdentityDefinition = {
  planId: string;
  capabilityId: string;
  hostId: string;
  nodeId?: string | null;
  phaseId?: string | null;
};

export type OoeActiveInputRevisionResolver = (job: OoeJobIdentity) => string | null;

export type OoeJobContextOptions = {
  activeInputRevisionId?: string | null | OoeActiveInputRevisionResolver;
  commitPolicy?: OoeCommitPolicy;
  launchTicket?: {
    id: string;
    historyLaunchOrder: number;
  };
};

export type OoeJobCommitContext = {
  job: OoeJobIdentity;
  commitAssessment: OoeCommitAssessment;
};

type NormalizedSnapshot =
  | null
  | boolean
  | number
  | string
  | NormalizedSnapshot[]
  | { [key: string]: NormalizedSnapshot };

function normalizeSnapshotValue(
  value: unknown,
  seen: Set<object>,
): NormalizedSnapshot {
  if (value == null) {
    return null;
  }

  if (typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : `number:${String(value)}`;
  }

  if (typeof value === 'bigint') {
    return `bigint:${value.toString()}`;
  }

  if (typeof value === 'function' || typeof value === 'symbol') {
    return null;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeSnapshotValue(item, seen));
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'object') {
    if (seen.has(value)) {
      return '[circular]';
    }

    seen.add(value);
    const object = value as Record<string, unknown>;
    const normalized: { [key: string]: NormalizedSnapshot } = {};
    for (const key of Object.keys(object).sort()) {
      const fieldValue = object[key];
      if (
        fieldValue === undefined
        || typeof fieldValue === 'function'
        || typeof fieldValue === 'symbol'
      ) {
        continue;
      }
      normalized[key] = normalizeSnapshotValue(fieldValue, seen);
    }
    seen.delete(value);
    return normalized;
  }

  return String(value);
}

export function canonicalizeOoeJobSnapshot(snapshot: unknown): string {
  return JSON.stringify(normalizeSnapshotValue(snapshot, new Set()));
}

export function hashOoeJobSnapshot(snapshot: unknown): string {
  const canonical = canonicalizeOoeJobSnapshot(snapshot);
  let hash = 0x811c9dc5;
  for (let index = 0; index < canonical.length; index += 1) {
    hash ^= canonical.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36).padStart(7, '0');
}

export function buildOoeInputRevisionId(
  capabilityId: string,
  snapshot: unknown,
): string {
  return `input.${capabilityId}.${hashOoeJobSnapshot(snapshot)}`;
}

export function buildOoeJobId(
  capabilityId: string,
  snapshot: unknown,
): string {
  return `job.${capabilityId}.${hashOoeJobSnapshot(snapshot)}`;
}

export function buildOoeJobIdentity(
  definition: OoeJobIdentityDefinition,
  snapshot: unknown,
): OoeJobIdentity {
  return {
    jobId: buildOoeJobId(definition.capabilityId, snapshot),
    planId: definition.planId,
    capabilityId: definition.capabilityId,
    hostId: definition.hostId,
    nodeId: definition.nodeId ?? null,
    phaseId: definition.phaseId ?? null,
    inputRevisionId: buildOoeInputRevisionId(definition.capabilityId, snapshot),
  };
}

function resolveActiveInputRevisionId(
  job: OoeJobIdentity,
  options: OoeJobContextOptions = {},
) {
  return options.activeInputRevisionId === undefined
    ? job.inputRevisionId
    : typeof options.activeInputRevisionId === 'function'
      ? options.activeInputRevisionId(job)
      : options.activeInputRevisionId;
}

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

export function buildOoeJobCommitContext(
  definition: OoeJobIdentityDefinition,
  snapshot: unknown,
  options: OoeJobContextOptions = {},
): OoeJobCommitContext {
  const job = buildOoeJobIdentity(definition, snapshot);
  return buildOoeJobCommitContextForJob(job, options);
}

export function buildOoeJobCommitContextForJob(
  job: OoeJobIdentity,
  options: OoeJobContextOptions = {},
): OoeJobCommitContext {
  const activeInputRevisionId = resolveActiveInputRevisionId(job, options);
  const commitPolicy = options.commitPolicy ?? 'commitLatestOnly';

  return {
    job,
    commitAssessment: assessOoeCommit(job, activeInputRevisionId, commitPolicy),
  };
}

export function isOoeCommitAllowed(assessment: OoeCommitAssessment): boolean {
  return assessment.legality === 'commitAllowed';
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
