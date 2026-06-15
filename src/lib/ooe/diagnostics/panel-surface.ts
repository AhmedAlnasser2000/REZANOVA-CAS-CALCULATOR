import {
  clearCompartmentUiBoundaryErrors,
  listCompartmentUiBoundaryErrors,
} from '../../compartments/ui-boundary';
import { OOE_EVENT_COMPARTMENT_OPTIONS } from '../events/compartment-labels';
import {
  clearOoeEvents,
  listOoeEvents,
} from '../events/event-outbox';
import {
  clearRecentOoeJobs,
  listActiveOoeJobs,
  listRecentOoeJobs,
} from '../job-launch/active-job-registry';
import {
  clearOoeDiagnostics,
  listOoeDiagnostics,
} from './diagnostics-buffer';
import {
  buildOoeDiagnosticsInspectorSnapshot,
  serializeOoeDiagnosticsInspectorItem,
  type OoeDiagnosticsInspectorEventCompartmentFilter,
  type OoeDiagnosticsInspectorEventItem,
  type OoeDiagnosticsInspectorItem,
  type OoeDiagnosticsInspectorStatusFilter,
} from './diagnostics-inspector';
import type { OoeCompartmentStateSummary } from './compartment-state';

export type OoeDiagnosticsPanelStatusFilter = OoeDiagnosticsInspectorStatusFilter;
export type OoeDiagnosticsPanelEventCompartmentFilter =
  OoeDiagnosticsInspectorEventCompartmentFilter;
export type OoeDiagnosticsPanelItem = OoeDiagnosticsInspectorItem;
export type OoeDiagnosticsPanelEventItem = OoeDiagnosticsInspectorEventItem;
export type OoeDiagnosticsPanelCompartment = OoeCompartmentStateSummary;

export const OOE_DIAGNOSTICS_PANEL_COMPARTMENT_OPTIONS = OOE_EVENT_COMPARTMENT_OPTIONS;

export type BuildOoeDiagnosticsPanelSnapshotInput = {
  statusFilter?: OoeDiagnosticsPanelStatusFilter;
  eventCompartmentFilter?: OoeDiagnosticsPanelEventCompartmentFilter;
  query?: string;
};

export type OoeDiagnosticsPanelSnapshot = {
  diagnosticsCount: number;
  activeJobCount: number;
  recentJobCount: number;
  eventCount: number;
  uiIssueCount: number;
  compartmentCount: number;
  recordItems: OoeDiagnosticsPanelItem[];
  jobItems: OoeDiagnosticsPanelItem[];
  eventItems: OoeDiagnosticsPanelEventItem[];
  compartments: OoeDiagnosticsPanelCompartment[];
};

export function buildOoeDiagnosticsPanelSnapshot({
  statusFilter,
  eventCompartmentFilter,
  query,
}: BuildOoeDiagnosticsPanelSnapshotInput = {}): OoeDiagnosticsPanelSnapshot {
  const diagnostics = listOoeDiagnostics();
  const activeJobs = listActiveOoeJobs();
  const recentJobs = listRecentOoeJobs();
  const events = listOoeEvents();
  const uiBoundaryRecords = listCompartmentUiBoundaryErrors();

  const itemSnapshot = buildOoeDiagnosticsInspectorSnapshot({
    diagnostics,
    activeJobs,
    recentJobs,
    events: [],
    statusFilter,
    query,
  });
  const eventSnapshot = buildOoeDiagnosticsInspectorSnapshot({
    diagnostics: [],
    activeJobs: [],
    recentJobs: [],
    events,
    eventCompartmentFilter,
  });
  const compartmentSnapshot = buildOoeDiagnosticsInspectorSnapshot({
    diagnostics,
    activeJobs,
    recentJobs,
    events,
    uiBoundaryRecords,
  });

  return {
    diagnosticsCount: diagnostics.length,
    activeJobCount: activeJobs.length,
    recentJobCount: recentJobs.length,
    eventCount: events.length,
    uiIssueCount: uiBoundaryRecords.length,
    compartmentCount: compartmentSnapshot.compartments.length,
    recordItems: itemSnapshot.items.filter((item) => item.kind === 'diagnostics'),
    jobItems: itemSnapshot.items.filter((item) => item.kind !== 'diagnostics'),
    eventItems: eventSnapshot.events,
    compartments: compartmentSnapshot.compartments,
  };
}

export function serializeOoeDiagnosticsPanelItem(item: OoeDiagnosticsPanelItem) {
  return serializeOoeDiagnosticsInspectorItem(item);
}

export function clearOoeDiagnosticsPanelData() {
  clearOoeDiagnostics();
  clearRecentOoeJobs();
  clearOoeEvents();
  clearCompartmentUiBoundaryErrors();
}
