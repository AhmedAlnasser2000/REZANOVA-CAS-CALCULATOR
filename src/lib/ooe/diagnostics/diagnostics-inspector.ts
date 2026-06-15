import type {
  OoeActiveJobRecord,
  OoeActiveJobStatus,
} from '../job-launch/active-job-registry';
import type {
  OoeDiagnosticsRecord,
  OoeDiagnosticsTerminalStatus,
} from './diagnostics-buffer';
import { runtimeShellEvidenceLines } from '../runtime-control/runtime-shell-contract';
import type { OoeEventEnvelope } from '../events/event-outbox';
import type { OoeEventCompartmentId } from '../events/compartment-labels';
import type { CompartmentUiBoundaryRecord } from '../../compartments/ui-boundary-records';
import {
  buildOoeCompartmentStateSnapshot,
  type OoeCompartmentStateSummary,
} from './compartment-state';

export type OoeDiagnosticsInspectorStatusFilter = 'all'
  | OoeDiagnosticsTerminalStatus
  | OoeActiveJobStatus;
export type OoeDiagnosticsInspectorEventCompartmentFilter = 'all' | OoeEventCompartmentId;

export type OoeDiagnosticsInspectorItemKind = 'diagnostics' | 'active-job' | 'recent-job';

export type OoeDiagnosticsInspectorItem = {
  id: string;
  kind: OoeDiagnosticsInspectorItemKind;
  routeLabel: string;
  status: string;
  capabilityId: string;
  hostId: string;
  planId: string;
  jobId: string;
  inputRevisionId: string;
  durationLabel: string;
  commitDecision?: string;
  hostStatus?: string;
  startedAt: number;
  finishedAt?: number;
  evidenceLines: string[];
  raw: OoeDiagnosticsRecord | OoeActiveJobRecord;
};

export type OoeDiagnosticsInspectorEventItem = {
  id: string;
  type: OoeEventEnvelope['type'];
  sequence: number;
  timestamp: number;
  severity: OoeEventEnvelope['severity'];
  routeLabel?: string;
  capabilityId?: string;
  hostId?: string;
  jobId?: string;
  compartmentId?: OoeEventEnvelope['compartmentId'];
  compartmentLabel?: string;
  message?: string;
  summary: string;
  raw: OoeEventEnvelope;
};

export type OoeDiagnosticsInspectorSnapshot = {
  items: OoeDiagnosticsInspectorItem[];
  events: OoeDiagnosticsInspectorEventItem[];
  compartments: OoeCompartmentStateSummary[];
  diagnosticsCount: number;
  activeJobCount: number;
  recentJobCount: number;
  eventCount: number;
};

type BuildOoeDiagnosticsInspectorSnapshotInput = {
  diagnostics: readonly OoeDiagnosticsRecord[];
  activeJobs: readonly OoeActiveJobRecord[];
  recentJobs: readonly OoeActiveJobRecord[];
  events?: readonly OoeEventEnvelope[];
  uiBoundaryRecords?: readonly CompartmentUiBoundaryRecord[];
  statusFilter?: OoeDiagnosticsInspectorStatusFilter;
  eventCompartmentFilter?: OoeDiagnosticsInspectorEventCompartmentFilter;
  query?: string;
};

function durationLabel(startedAt: number, finishedAt?: number, explicitDurationMs?: number) {
  const durationMs = explicitDurationMs ?? (
    finishedAt === undefined ? Date.now() - startedAt : finishedAt - startedAt
  );

  return `${Math.max(0, Math.round(durationMs))} ms`;
}

function stringifyEvidenceValue(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value);
}

function evidenceLinesFromDiagnostics(record: OoeDiagnosticsRecord) {
  const lines: string[] = [];
  const equation = record.provenance?.equation;
  const cancellation = equation?.cancellation;
  const helperHosts = equation?.directSymbolicHelperHostExecutions;
  const runtimeShell = record.provenance?.runtimeShell;

  lines.push(...runtimeShellEvidenceLines(runtimeShell));

  if (cancellation && typeof cancellation === 'object') {
    lines.push(`Cancellation: ${stringifyEvidenceValue(cancellation)}`);
  }

  if (Array.isArray(helperHosts) && helperHosts.length > 0) {
    lines.push(`Helper hosts: ${helperHosts.length}`);
  }

  if (record.traceEvents.length > 0) {
    const terminalTrace = record.traceEvents.at(-1);
    if (terminalTrace?.message) {
      lines.push(`Final trace: ${terminalTrace.message}`);
    }
  }

  if (record.errorMessage) {
    lines.push(`Error: ${record.errorMessage}`);
  }

  return lines;
}

function evidenceLinesFromJob(record: OoeActiveJobRecord) {
  const lines: string[] = [];
  if (record.cancellationRequest) {
    lines.push(
      `Cancellation requested by ${record.cancellationRequest.requestedBy}`
        + (record.cancellationRequest.reason ? `: ${record.cancellationRequest.reason}` : ''),
    );
  }
  if (record.traceEvents.length > 0) {
    const terminalTrace = record.traceEvents.at(-1);
    if (terminalTrace?.message) {
      lines.push(`Final trace: ${terminalTrace.message}`);
    }
  }
  if (record.errorMessage) {
    lines.push(`Error: ${record.errorMessage}`);
  }
  return lines;
}

function diagnosticsItem(record: OoeDiagnosticsRecord): OoeDiagnosticsInspectorItem {
  return {
    id: `diagnostics:${record.diagnosticsId}`,
    kind: 'diagnostics',
    routeLabel: record.routeLabel,
    status: record.terminalStatus,
    capabilityId: record.capabilityId,
    hostId: record.hostId,
    planId: record.planId,
    jobId: record.jobId,
    inputRevisionId: record.inputRevisionId,
    durationLabel: durationLabel(record.startedAt, record.finishedAt, record.durationMs),
    commitDecision: record.commitAssessment?.commitDecision,
    hostStatus: record.hostAdapter?.status,
    startedAt: record.startedAt,
    finishedAt: record.finishedAt,
    evidenceLines: evidenceLinesFromDiagnostics(record),
    raw: record,
  };
}

function jobItem(
  record: OoeActiveJobRecord,
  kind: Extract<OoeDiagnosticsInspectorItemKind, 'active-job' | 'recent-job'>,
): OoeDiagnosticsInspectorItem {
  return {
    id: `${kind}:${record.registryId}`,
    kind,
    routeLabel: record.routeLabel,
    status: record.status,
    capabilityId: record.capabilityId,
    hostId: record.hostId,
    planId: record.planId,
    jobId: record.jobId,
    inputRevisionId: record.inputRevisionId,
    durationLabel: durationLabel(record.startedAt, record.finishedAt),
    commitDecision: record.commitAssessment?.commitDecision,
    startedAt: record.startedAt,
    finishedAt: record.finishedAt,
    evidenceLines: evidenceLinesFromJob(record),
    raw: record,
  };
}

function matchesQuery(item: OoeDiagnosticsInspectorItem, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return [
    item.routeLabel,
    item.capabilityId,
    item.hostId,
    item.planId,
    item.jobId,
    item.status,
  ].some((value) => value.toLowerCase().includes(normalized));
}

function eventSummary(event: OoeEventEnvelope) {
  return [
    event.routeLabel,
    event.compartmentLabel,
    event.capabilityId,
    event.hostId,
    event.message,
  ].find((value) => value && value.trim().length > 0) ?? event.type;
}

function eventItem(event: OoeEventEnvelope): OoeDiagnosticsInspectorEventItem {
  return {
    id: `event:${event.eventId}`,
    type: event.type,
    sequence: event.sequence,
    timestamp: event.timestamp,
    severity: event.severity,
    routeLabel: event.routeLabel,
    capabilityId: event.capabilityId,
    hostId: event.hostId,
    jobId: event.jobId,
    compartmentId: event.compartmentId,
    compartmentLabel: event.compartmentLabel,
    message: event.message,
    summary: eventSummary(event),
    raw: event,
  };
}

function eventMatchesQuery(event: OoeDiagnosticsInspectorEventItem, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return [
    event.type,
    event.routeLabel,
    event.capabilityId,
    event.hostId,
    event.jobId,
    event.compartmentId,
    event.compartmentLabel,
    event.message,
  ].some((value) => value?.toLowerCase().includes(normalized));
}

export function buildOoeDiagnosticsInspectorSnapshot({
  diagnostics,
  activeJobs,
  recentJobs,
  events = [],
  uiBoundaryRecords = [],
  statusFilter = 'all',
  eventCompartmentFilter = 'all',
  query = '',
}: BuildOoeDiagnosticsInspectorSnapshotInput): OoeDiagnosticsInspectorSnapshot {
  const items = [
    ...diagnostics.map(diagnosticsItem),
    ...activeJobs.map((record) => jobItem(record, 'active-job')),
    ...recentJobs.map((record) => jobItem(record, 'recent-job')),
  ]
    .filter((item) => statusFilter === 'all' || item.status === statusFilter)
    .filter((item) => matchesQuery(item, query))
    .sort((left, right) => {
      const rightTime = right.finishedAt ?? right.startedAt;
      const leftTime = left.finishedAt ?? left.startedAt;
      return rightTime - leftTime;
    });

  const eventItems = events
    .map(eventItem)
    .filter((event) =>
      eventCompartmentFilter === 'all' || event.compartmentId === eventCompartmentFilter)
    .filter((event) => eventMatchesQuery(event, query))
    .sort((left, right) => right.sequence - left.sequence)
    .slice(0, 12);

  const compartments = buildOoeCompartmentStateSnapshot({
    diagnostics,
    activeJobs,
    recentJobs,
    events,
    uiBoundaryRecords,
  });

  return {
    items,
    events: eventItems,
    compartments,
    diagnosticsCount: diagnostics.length,
    activeJobCount: activeJobs.length,
    recentJobCount: recentJobs.length,
    eventCount: events.length,
  };
}

export function serializeOoeDiagnosticsInspectorItem(item: OoeDiagnosticsInspectorItem) {
  return JSON.stringify(item.raw, null, 2);
}
