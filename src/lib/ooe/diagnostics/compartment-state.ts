import type { CompartmentId } from '../../compartments/manifest';
import type { CompartmentUiBoundaryRecord } from '../../compartments/ui-boundary-records';
import {
  getCompartmentManifestEntry,
} from '../../compartments/manifest';
import {
  OOE_EVENT_COMPARTMENT_OPTIONS,
  resolveOoeEventCompartment,
} from '../events/compartment-labels';
import type { OoeEventEnvelope, OoeEventType } from '../events/event-outbox';
import type {
  OoeActiveJobRecord,
  OoeActiveJobStatus,
} from '../job-launch/active-job-registry';
import type {
  OoeDiagnosticsRecord,
  OoeDiagnosticsTerminalStatus,
} from './diagnostics-buffer';

export type OoeCompartmentHealth = 'idle' | 'active' | 'warning' | 'failed' | 'unknown';
export type OoeCompartmentIssueSeverity = 'warning' | 'error';
export type OoeCompartmentIssueSource =
  | 'ooe-event'
  | 'diagnostics-record'
  | 'job-registry'
  | 'validator-report'
  | 'ui-boundary';
export type OoeCompartmentInspectPanel = 'records' | 'events' | 'jobs' | 'compartments';

export type OoeCompartmentLatestEvent = {
  type: OoeEventType;
  sequence: number;
  timestamp: number;
  routeLabel?: string;
  capabilityId?: string;
  hostId?: string;
  message?: string;
};

export type OoeCompartmentLatestIssue = {
  severity: OoeCompartmentIssueSeverity;
  source: OoeCompartmentIssueSource;
  summary: string;
  timestamp: number;
  routeLabel?: string;
  capabilityId?: string;
  hostId?: string;
  evidenceId?: string;
};

export type OoeCompartmentInspectTarget = {
  panel: OoeCompartmentInspectPanel;
  id?: string;
};

export type OoeCompartmentStateSummary = {
  compartmentId: CompartmentId;
  compartmentLabel: string;
  health: OoeCompartmentHealth;
  activeJobCount: number;
  recentJobCount: number;
  latestEvent?: OoeCompartmentLatestEvent;
  latestIssue?: OoeCompartmentLatestIssue;
  inspectTarget?: OoeCompartmentInspectTarget;
};

type BuildOoeCompartmentStateSnapshotInput = {
  diagnostics: readonly OoeDiagnosticsRecord[];
  activeJobs: readonly OoeActiveJobRecord[];
  recentJobs: readonly OoeActiveJobRecord[];
  events: readonly OoeEventEnvelope[];
  uiBoundaryRecords?: readonly CompartmentUiBoundaryRecord[];
};

type MutableCompartmentState = OoeCompartmentStateSummary & {
  latestCommitTimestamp?: number;
};

const WARNING_EVENT_TYPES: ReadonlySet<OoeEventType> = new Set([
  'ooe.preflight.failed',
  'ooe.result.staleDropped',
  'ooe.result.skipped',
  'ooe.job.cancelled',
]);

const FAILED_EVENT_TYPES: ReadonlySet<OoeEventType> = new Set([
  'ooe.job.failed',
]);

const WARNING_DIAGNOSTICS_STATUSES: ReadonlySet<OoeDiagnosticsTerminalStatus> = new Set([
  'staleDropped',
  'skipped',
  'cancelled',
]);

const WARNING_JOB_STATUSES: ReadonlySet<OoeActiveJobStatus> = new Set([
  'staleDropped',
  'skipped',
  'cancelled',
  'cancelRequested',
]);

function normalizeSummary(value: string | undefined, fallback: string) {
  const normalized = value?.replace(/\s+/g, ' ').trim();
  return normalized || fallback;
}

function emptyStateMap() {
  const map = new Map<CompartmentId, MutableCompartmentState>();
  for (const option of OOE_EVENT_COMPARTMENT_OPTIONS) {
    map.set(option.compartmentId, {
      compartmentId: option.compartmentId,
      compartmentLabel: option.compartmentLabel,
      health: 'idle',
      activeJobCount: 0,
      recentJobCount: 0,
    });
  }
  return map;
}

function ensureState(
  states: Map<CompartmentId, MutableCompartmentState>,
  compartmentId: CompartmentId,
  compartmentLabel?: string,
) {
  const existing = states.get(compartmentId);
  if (existing) {
    return existing;
  }

  const manifestEntry = getCompartmentManifestEntry(compartmentId);
  const state: MutableCompartmentState = {
    compartmentId,
    compartmentLabel: compartmentLabel ?? manifestEntry?.diagnosticsLabel ?? compartmentId,
    health: 'idle',
    activeJobCount: 0,
    recentJobCount: 0,
  };
  states.set(compartmentId, state);
  return state;
}

function eventCompartment(event: OoeEventEnvelope) {
  if (event.compartmentId && event.compartmentLabel) {
    return {
      compartmentId: event.compartmentId,
      compartmentLabel: event.compartmentLabel,
    };
  }

  return resolveOoeEventCompartment({
    capabilityId: event.capabilityId,
    routeLabel: event.routeLabel,
    hostId: event.hostId,
  });
}

function jobCompartment(record: Pick<
  OoeActiveJobRecord | OoeDiagnosticsRecord,
  'capabilityId' | 'routeLabel' | 'hostId'
>) {
  return resolveOoeEventCompartment({
    capabilityId: record.capabilityId,
    routeLabel: record.routeLabel,
    hostId: record.hostId,
  });
}

function laterIssue(
  current: OoeCompartmentLatestIssue | undefined,
  candidate: OoeCompartmentLatestIssue,
) {
  if (!current) {
    return candidate;
  }
  if (candidate.timestamp > current.timestamp) {
    return candidate;
  }
  if (candidate.timestamp === current.timestamp && candidate.severity === 'error') {
    return candidate;
  }
  return current;
}

function addIssue(
  state: MutableCompartmentState,
  issue: OoeCompartmentLatestIssue,
  inspectTarget: OoeCompartmentInspectTarget,
) {
  const previousIssue = state.latestIssue;
  state.latestIssue = laterIssue(state.latestIssue, issue);
  if (state.latestIssue !== previousIssue) {
    state.inspectTarget = inspectTarget;
  }
}

function addEvent(
  state: MutableCompartmentState,
  event: OoeEventEnvelope,
) {
  if (!state.latestEvent || event.sequence > state.latestEvent.sequence) {
    state.latestEvent = {
      type: event.type,
      sequence: event.sequence,
      timestamp: event.timestamp,
      routeLabel: event.routeLabel,
      capabilityId: event.capabilityId,
      hostId: event.hostId,
      message: event.message,
    };
  }

  if (event.type === 'ooe.result.committed') {
    state.latestCommitTimestamp = Math.max(
      state.latestCommitTimestamp ?? Number.NEGATIVE_INFINITY,
      event.timestamp,
    );
  }

  if (FAILED_EVENT_TYPES.has(event.type)) {
    addIssue(state, {
      severity: 'error',
      source: 'ooe-event',
      summary: normalizeSummary(event.message, event.type),
      timestamp: event.timestamp,
      routeLabel: event.routeLabel,
      capabilityId: event.capabilityId,
      hostId: event.hostId,
      evidenceId: `event:${event.eventId}`,
    }, {
      panel: 'events',
      id: `event:${event.eventId}`,
    });
  } else if (WARNING_EVENT_TYPES.has(event.type)) {
    addIssue(state, {
      severity: 'warning',
      source: 'ooe-event',
      summary: normalizeSummary(event.message, event.type),
      timestamp: event.timestamp,
      routeLabel: event.routeLabel,
      capabilityId: event.capabilityId,
      hostId: event.hostId,
      evidenceId: `event:${event.eventId}`,
    }, {
      panel: 'events',
      id: `event:${event.eventId}`,
    });
  }
}

function addDiagnostics(
  state: MutableCompartmentState,
  record: OoeDiagnosticsRecord,
) {
  const timestamp = record.finishedAt;
  if (record.terminalStatus === 'failed') {
    addIssue(state, {
      severity: 'error',
      source: 'diagnostics-record',
      summary: normalizeSummary(record.errorMessage, `${record.routeLabel} failed`),
      timestamp,
      routeLabel: record.routeLabel,
      capabilityId: record.capabilityId,
      hostId: record.hostId,
      evidenceId: `diagnostics:${record.diagnosticsId}`,
    }, {
      panel: 'records',
      id: `diagnostics:${record.diagnosticsId}`,
    });
  } else if (WARNING_DIAGNOSTICS_STATUSES.has(record.terminalStatus)) {
    addIssue(state, {
      severity: 'warning',
      source: 'diagnostics-record',
      summary: `${record.routeLabel} ${record.terminalStatus}`,
      timestamp,
      routeLabel: record.routeLabel,
      capabilityId: record.capabilityId,
      hostId: record.hostId,
      evidenceId: `diagnostics:${record.diagnosticsId}`,
    }, {
      panel: 'records',
      id: `diagnostics:${record.diagnosticsId}`,
    });
  }
}

function addJob(
  state: MutableCompartmentState,
  record: OoeActiveJobRecord,
  kind: 'active-job' | 'recent-job',
) {
  if (kind === 'active-job') {
    state.activeJobCount += 1;
  } else {
    state.recentJobCount += 1;
  }

  const timestamp = record.finishedAt ?? record.startedAt;
  if (record.status === 'failed') {
    addIssue(state, {
      severity: 'error',
      source: 'job-registry',
      summary: normalizeSummary(record.errorMessage, `${record.routeLabel} failed`),
      timestamp,
      routeLabel: record.routeLabel,
      capabilityId: record.capabilityId,
      hostId: record.hostId,
      evidenceId: `${kind}:${record.registryId}`,
    }, {
      panel: 'jobs',
      id: `${kind}:${record.registryId}`,
    });
  } else if (WARNING_JOB_STATUSES.has(record.status)) {
    addIssue(state, {
      severity: 'warning',
      source: 'job-registry',
      summary: `${record.routeLabel} ${record.status}`,
      timestamp,
      routeLabel: record.routeLabel,
      capabilityId: record.capabilityId,
      hostId: record.hostId,
      evidenceId: `${kind}:${record.registryId}`,
    }, {
      panel: 'jobs',
      id: `${kind}:${record.registryId}`,
    });
  }
}

function addUiBoundaryRecord(
  state: MutableCompartmentState,
  record: CompartmentUiBoundaryRecord,
) {
  addIssue(state, {
    severity: 'error',
    source: 'ui-boundary',
    summary: record.errorMessage,
    timestamp: record.timestamp,
    evidenceId: `ui-boundary:${record.recordId}`,
  }, {
    panel: 'compartments',
    id: `ui-boundary:${record.recordId}`,
  });
}

function finalizeHealth(state: MutableCompartmentState): OoeCompartmentFinalState {
  const latestIssue = state.latestIssue;
  const latestCommitTimestamp = state.latestCommitTimestamp ?? Number.NEGATIVE_INFINITY;
  const currentIssue = latestIssue && latestIssue.timestamp > latestCommitTimestamp
    ? latestIssue
    : undefined;

  const health: OoeCompartmentHealth = currentIssue
    ? currentIssue.severity === 'error' ? 'failed' : 'warning'
    : state.activeJobCount > 0 ? 'active' : 'idle';

  const publicState = { ...state };
  delete publicState.latestCommitTimestamp;

  return {
    ...publicState,
    health,
  };
}

type OoeCompartmentFinalState = OoeCompartmentStateSummary;

export function buildOoeCompartmentStateSnapshot({
  diagnostics,
  activeJobs,
  recentJobs,
  events,
  uiBoundaryRecords = [],
}: BuildOoeCompartmentStateSnapshotInput): OoeCompartmentStateSummary[] {
  const states = emptyStateMap();

  for (const event of events) {
    const metadata = eventCompartment(event);
    if (!metadata) {
      continue;
    }
    addEvent(ensureState(states, metadata.compartmentId, metadata.compartmentLabel), event);
  }

  for (const record of diagnostics) {
    const metadata = jobCompartment(record);
    if (!metadata) {
      continue;
    }
    addDiagnostics(ensureState(states, metadata.compartmentId, metadata.compartmentLabel), record);
  }

  for (const record of activeJobs) {
    const metadata = jobCompartment(record);
    if (!metadata) {
      continue;
    }
    addJob(ensureState(states, metadata.compartmentId, metadata.compartmentLabel), record, 'active-job');
  }

  for (const record of recentJobs) {
    const metadata = jobCompartment(record);
    if (!metadata) {
      continue;
    }
    addJob(ensureState(states, metadata.compartmentId, metadata.compartmentLabel), record, 'recent-job');
  }

  for (const record of uiBoundaryRecords) {
    const state = ensureState(states, record.compartmentId, record.compartmentLabel);
    addUiBoundaryRecord(state, record);
  }

  return Array.from(states.values(), finalizeHealth);
}
