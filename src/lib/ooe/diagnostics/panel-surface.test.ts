import { beforeEach, describe, expect, it } from 'vitest';
import { recordCompartmentUiBoundaryError, resetCompartmentUiBoundaryRecordsForTests } from '../../compartments/ui-boundary-records';
import type { OoeCommitAssessment, OoeJobIdentity } from '../bridge-schema/ooe-bridge';
import { recordOoeEvent, resetOoeEventOutboxForTests } from '../events/event-outbox';
import {
  clearOoeJobRegistry,
  listActiveOoeJobs,
  listRecentOoeJobs,
  markOoeJobCancelled,
  requestOoeJobCancellation,
  startOoeJob,
} from '../job-launch/active-job-registry';
import {
  listOoeDiagnostics,
  recordOoeDiagnostics,
} from './diagnostics-buffer';
import {
  buildOoeDiagnosticsPanelSnapshot,
  clearOoeDiagnosticsPanelData,
  OOE_DIAGNOSTICS_PANEL_COMPARTMENT_OPTIONS,
  serializeOoeDiagnosticsPanelItem,
} from './panel-surface';

const equationJob: OoeJobIdentity = {
  jobId: 'job.equation.solve.1',
  planId: 'plan.equation.solve',
  capabilityId: 'equation.solve',
  hostId: 'equation-runtime',
  nodeId: 'node.equation.solve',
  phaseId: 'equation.solve',
  inputRevisionId: 'input.equation.solve.1',
};

const committedAssessment: OoeCommitAssessment = {
  job: equationJob,
  activeInputRevisionId: equationJob.inputRevisionId,
  commitPolicy: 'commitLatestOnly',
  legality: 'commitAllowed',
  commitDecision: 'committed',
  resultStability: 'stable',
};

function seedDiagnosticsRecord() {
  return recordOoeDiagnostics({
    job: equationJob,
    routeLabel: 'equation.solve',
    terminalStatus: 'completed',
    commitAssessment: committedAssessment,
    traceEvents: [{
      planId: equationJob.planId,
      nodeId: equationJob.nodeId ?? null,
      phaseId: equationJob.phaseId ?? null,
      status: 'completed',
      resultStability: 'stable',
      durationMs: 4,
      commitDecision: 'committed',
      message: 'Equation solve completed.',
    }],
    provenance: {
      depth: 'rich',
      mode: 'equation',
      route: 'equation.solve',
      equation: {},
    },
    startedAt: 10,
    finishedAt: 14,
  });
}

function seedActiveEquationJob() {
  return startOoeJob({
    job: equationJob,
    routeLabel: 'equation.solve',
  });
}

function seedRecentTableJob() {
  const tableJob = startOoeJob({
    job: {
      ...equationJob,
      jobId: 'job.table.build.1',
      capabilityId: 'table.build',
      planId: 'plan.table.build',
      hostId: 'table-runtime',
      inputRevisionId: 'input.table.build.1',
    },
    routeLabel: 'table.build',
  });
  requestOoeJobCancellation(tableJob.registryId, {
    requestedBy: 'user',
    reason: 'Stop pressed',
  });
  markOoeJobCancelled(tableJob.registryId);
}

function seedEvents() {
  recordOoeEvent({
    type: 'ooe.job.started',
    severity: 'info',
    routeLabel: 'table.build',
    capabilityId: 'table.build',
    hostId: 'table-runtime',
    compartmentId: 'table',
    compartmentLabel: 'Table',
    jobId: 'job.table.build.1',
    message: 'Table job started.',
  });
  recordOoeEvent({
    type: 'ooe.result.committed',
    severity: 'info',
    routeLabel: 'equation.solve',
    capabilityId: 'equation.solve',
    hostId: 'equation-runtime',
    compartmentId: 'equation',
    compartmentLabel: 'Equation',
    jobId: equationJob.jobId,
    message: 'Result committed.',
  });
}

describe('OOE diagnostics panel surface', () => {
  beforeEach(() => {
    clearOoeJobRegistry();
    clearOoeDiagnosticsPanelData();
    resetOoeEventOutboxForTests();
    resetCompartmentUiBoundaryRecordsForTests();
  });

  it('builds the panel-facing records, jobs, events, and compartment snapshot', () => {
    seedDiagnosticsRecord();
    seedActiveEquationJob();
    seedRecentTableJob();
    seedEvents();
    recordCompartmentUiBoundaryError({
      compartmentId: 'app-shell',
      error: new Error('Workspace render failed'),
      timestamp: 100,
    });

    const snapshot = buildOoeDiagnosticsPanelSnapshot();

    expect(snapshot).toMatchObject({
      diagnosticsCount: 1,
      activeJobCount: 1,
      recentJobCount: 1,
      eventCount: 2,
      uiIssueCount: 1,
    });
    expect(snapshot.compartmentCount).toBeGreaterThanOrEqual(9);
    expect(snapshot.recordItems).toEqual([
      expect.objectContaining({
        kind: 'diagnostics',
        routeLabel: 'equation.solve',
      }),
    ]);
    expect(snapshot.jobItems.map((item) => item.kind)).toEqual(
      expect.arrayContaining(['recent-job', 'active-job']),
    );
    expect(snapshot.eventItems.map((event) => event.type)).toEqual([
      'ooe.result.committed',
      'ooe.job.started',
    ]);
    expect(snapshot.compartments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          compartmentId: 'app-shell',
          health: 'failed',
          contract: expect.objectContaining({
            ownedPaths: expect.arrayContaining(['src/AppMain.tsx']),
            surfaceExposureCandidate: 'internal-diagnostics',
          }),
          evidenceCounts: expect.objectContaining({
            uiBoundaryRecords: 1,
          }),
        }),
      ]),
    );
  });

  it('filters lifecycle events by compartment without guessing unlabeled events', () => {
    seedEvents();
    recordOoeEvent({
      type: 'ooe.job.started',
      severity: 'debug',
      routeLabel: 'test.route',
      capabilityId: 'test.route',
      hostId: 'test-runtime',
      message: 'Unlabeled test event.',
    });

    const equationSnapshot = buildOoeDiagnosticsPanelSnapshot({
      eventCompartmentFilter: 'equation',
    });
    expect(equationSnapshot.eventItems).toEqual([
      expect.objectContaining({
        compartmentId: 'equation',
        routeLabel: 'equation.solve',
      }),
    ]);

    const allSnapshot = buildOoeDiagnosticsPanelSnapshot();
    expect(allSnapshot.eventItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          routeLabel: 'test.route',
          compartmentId: undefined,
        }),
      ]),
    );
    expect(OOE_DIAGNOSTICS_PANEL_COMPARTMENT_OPTIONS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ compartmentId: 'equation' }),
        expect.objectContaining({ compartmentId: 'table' }),
      ]),
    );
  });

  it('serializes selected diagnostics and job items through the panel seam', () => {
    seedDiagnosticsRecord();
    seedRecentTableJob();

    const snapshot = buildOoeDiagnosticsPanelSnapshot();
    expect(serializeOoeDiagnosticsPanelItem(snapshot.recordItems[0])).toContain(
      '"routeLabel": "equation.solve"',
    );
    expect(serializeOoeDiagnosticsPanelItem(snapshot.jobItems[0])).toContain(
      '"routeLabel": "table.build"',
    );
  });

  it('exposes workspace instance labels on panel records, jobs, and events', () => {
    const instanceJob: OoeJobIdentity = {
      ...equationJob,
      workspaceInstanceId: 'workspace.equation.1',
      workspaceInstanceLabel: 'Equation A',
    };
    recordOoeDiagnostics({
      job: instanceJob,
      routeLabel: 'equation.solve',
      terminalStatus: 'completed',
      commitAssessment: {
        ...committedAssessment,
        job: instanceJob,
        workspaceInstanceId: 'workspace.equation.1',
        workspaceInstanceLabel: 'Equation A',
        workspaceInstanceOpen: true,
      },
      startedAt: 10,
      finishedAt: 12,
    });
    startOoeJob({
      job: instanceJob,
      routeLabel: 'equation.solve',
    });
    recordOoeEvent({
      type: 'ooe.job.started',
      severity: 'info',
      routeLabel: 'equation.solve',
      capabilityId: 'equation.solve',
      hostId: 'equation-runtime',
      jobId: instanceJob.jobId,
      workspaceInstanceId: 'workspace.equation.1',
      workspaceInstanceLabel: 'Equation A',
    });

    const snapshot = buildOoeDiagnosticsPanelSnapshot();

    expect(snapshot.recordItems[0]).toMatchObject({
      workspaceInstanceId: 'workspace.equation.1',
      workspaceInstanceLabel: 'Equation A',
    });
    expect(snapshot.jobItems[0]).toMatchObject({
      workspaceInstanceId: 'workspace.equation.1',
      workspaceInstanceLabel: 'Equation A',
    });
    expect(snapshot.eventItems[0]).toMatchObject({
      workspaceInstanceId: 'workspace.equation.1',
      workspaceInstanceLabel: 'Equation A',
    });
  });

  it('clears panel-owned records while preserving active jobs', () => {
    seedDiagnosticsRecord();
    seedActiveEquationJob();
    seedRecentTableJob();
    seedEvents();
    recordCompartmentUiBoundaryError({
      compartmentId: 'app-shell',
      error: 'Workspace render failed',
    });

    clearOoeDiagnosticsPanelData();

    expect(listOoeDiagnostics()).toEqual([]);
    expect(listRecentOoeJobs()).toEqual([]);
    expect(listActiveOoeJobs()).toHaveLength(1);
    expect(buildOoeDiagnosticsPanelSnapshot()).toMatchObject({
      diagnosticsCount: 0,
      activeJobCount: 1,
      recentJobCount: 0,
      eventCount: 0,
      uiIssueCount: 0,
    });
  });
});
