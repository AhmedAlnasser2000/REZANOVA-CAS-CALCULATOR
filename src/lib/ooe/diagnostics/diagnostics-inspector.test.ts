import { describe, expect, it } from 'vitest';
import type { OoeActiveJobRecord } from '../job-launch/active-job-registry';
import {
  buildOoeDiagnosticsInspectorSnapshot,
  serializeOoeDiagnosticsInspectorItem,
} from './diagnostics-inspector';
import type { OoeDiagnosticsRecord } from './diagnostics-buffer';
import type { OoeCommitAssessment, OoeJobIdentity } from '../bridge-schema/ooe-bridge';
import type { OoeEventEnvelope } from '../events/event-outbox';
import type { CompartmentUiBoundaryRecord } from '../../compartments/ui-boundary-records';

const job: OoeJobIdentity = {
  jobId: 'job.equation.solve.1',
  planId: 'plan.equation.solve',
  capabilityId: 'equation.solve',
  hostId: 'equation-runtime',
  nodeId: 'node.equation.solve',
  phaseId: 'equation.solve',
  inputRevisionId: 'input.equation.solve.1',
};

const committedAssessment: OoeCommitAssessment = {
  job,
  activeInputRevisionId: job.inputRevisionId,
  commitPolicy: 'commitLatestOnly',
  legality: 'commitAllowed',
  commitDecision: 'committed',
  resultStability: 'stable',
};

function diagnosticsRecord(input: Partial<OoeDiagnosticsRecord> = {}): OoeDiagnosticsRecord {
  return {
    diagnosticsId: 'ooe-diagnostics-1',
    sequence: 1,
    job,
    jobId: job.jobId,
    inputRevisionId: job.inputRevisionId,
    routeLabel: 'equation.solve',
    planId: job.planId,
    capabilityId: job.capabilityId,
    hostId: job.hostId,
    nodeId: job.nodeId ?? null,
    phaseId: job.phaseId ?? null,
    terminalStatus: 'completed',
    commitAssessment: committedAssessment,
    traceEvents: [],
    provenance: {
      depth: 'rich',
      mode: 'equation',
      route: 'equation.solve',
      equation: {},
    },
    startedAt: 10,
    finishedAt: 14,
    durationMs: 4,
    ...input,
  };
}

function activeJob(input: Partial<OoeActiveJobRecord> = {}): OoeActiveJobRecord {
  return {
    registryId: 'ooe-job-1',
    sequence: 1,
    job,
    jobId: job.jobId,
    inputRevisionId: job.inputRevisionId,
    planId: job.planId,
    capabilityId: job.capabilityId,
    hostId: job.hostId,
    nodeId: job.nodeId ?? null,
    phaseId: job.phaseId ?? null,
    routeLabel: 'equation.solve',
    status: 'started',
    startedAt: 20,
    traceEvents: [],
    ...input,
  };
}

function ooeEvent(input: Partial<OoeEventEnvelope> = {}): OoeEventEnvelope {
  return {
    eventId: 'ooe.event.1',
    sequence: 1,
    type: 'ooe.job.started',
    version: 1,
    timestamp: 100,
    source: 'ooe',
    jobId: job.jobId,
    inputRevisionId: job.inputRevisionId,
    planId: job.planId,
    capabilityId: job.capabilityId,
    hostId: job.hostId,
    nodeId: job.nodeId ?? null,
    phaseId: job.phaseId ?? null,
    routeLabel: 'equation.solve',
    severity: 'info',
    ...input,
  };
}

function uiBoundaryRecord(
  input: Partial<CompartmentUiBoundaryRecord> = {},
): CompartmentUiBoundaryRecord {
  return {
    recordId: 'compartment.ui.1',
    sequence: 1,
    compartmentId: 'app-shell',
    compartmentLabel: 'App Shell',
    errorMessage: 'Workspace render failed',
    timestamp: 150,
    source: 'ui-boundary',
    ...input,
  };
}

describe('OOE diagnostics inspector view model', () => {
  it('combines diagnostics and jobs newest first with compact summaries', () => {
    const snapshot = buildOoeDiagnosticsInspectorSnapshot({
      diagnostics: [
        diagnosticsRecord({
          diagnosticsId: 'old-record',
          finishedAt: 14,
          durationMs: 4,
        }),
      ],
      activeJobs: [
        activeJob({
          registryId: 'active-record',
          startedAt: 30,
        }),
      ],
      recentJobs: [
        activeJob({
          registryId: 'recent-record',
          status: 'cancelled',
          startedAt: 22,
          finishedAt: 25,
          cancellationRequest: {
            requestedAt: 23,
            requestedBy: 'user',
            reason: 'Stop pressed',
          },
        }),
      ],
    });

    expect(snapshot).toMatchObject({
      diagnosticsCount: 1,
      activeJobCount: 1,
      recentJobCount: 1,
      eventCount: 0,
    });
    expect(snapshot.items.map((item) => item.id)).toEqual([
      'active-job:active-record',
      'recent-job:recent-record',
      'diagnostics:old-record',
    ]);
    expect(snapshot.items[1].evidenceLines).toContain('Cancellation requested by user: Stop pressed');
  });

  it('adds recent OOE lifecycle event snapshots without changing record rows', () => {
    const snapshot = buildOoeDiagnosticsInspectorSnapshot({
      diagnostics: [diagnosticsRecord()],
      activeJobs: [],
      recentJobs: [],
      events: [
        ooeEvent({
          eventId: 'ooe.event.1',
          sequence: 1,
          type: 'ooe.job.started',
          severity: 'info',
          message: 'Job started.',
        }),
        ooeEvent({
          eventId: 'ooe.event.2',
          sequence: 2,
          type: 'ooe.preflight.failed',
          severity: 'warning',
          routeLabel: 'table.build',
          capabilityId: 'table.build',
          hostId: 'table-runtime',
          compartmentId: 'table',
          compartmentLabel: 'Table',
          message: 'Desktop host unavailable.',
        }),
      ],
      query: 'Table',
    });

    expect(snapshot.items).toHaveLength(0);
    expect(snapshot.eventCount).toBe(2);
    expect(snapshot.events).toEqual([
      expect.objectContaining({
        id: 'event:ooe.event.2',
        type: 'ooe.preflight.failed',
        severity: 'warning',
        compartmentId: 'table',
        compartmentLabel: 'Table',
        summary: 'table.build',
      }),
    ]);
  });

  it('filters only OOE lifecycle event snapshots by compartment label', () => {
    const snapshot = buildOoeDiagnosticsInspectorSnapshot({
      diagnostics: [diagnosticsRecord()],
      activeJobs: [],
      recentJobs: [],
      events: [
        ooeEvent({
          eventId: 'ooe.event.1',
          sequence: 1,
          type: 'ooe.job.started',
          routeLabel: 'equation.solve',
          capabilityId: 'equation.solve',
          compartmentId: 'equation',
          compartmentLabel: 'Equation',
        }),
        ooeEvent({
          eventId: 'ooe.event.2',
          sequence: 2,
          type: 'ooe.job.started',
          routeLabel: 'table.build',
          capabilityId: 'table.build',
          compartmentId: 'table',
          compartmentLabel: 'Table',
        }),
        ooeEvent({
          eventId: 'ooe.event.3',
          sequence: 3,
          type: 'ooe.job.started',
          routeLabel: 'test.route',
          capabilityId: 'test.route',
        }),
      ],
      eventCompartmentFilter: 'equation',
    });

    expect(snapshot.items).toHaveLength(1);
    expect(snapshot.eventCount).toBe(3);
    expect(snapshot.events).toEqual([
      expect.objectContaining({
        id: 'event:ooe.event.1',
        compartmentId: 'equation',
      }),
    ]);

    const allSnapshot = buildOoeDiagnosticsInspectorSnapshot({
      diagnostics: [],
      activeJobs: [],
      recentJobs: [],
      events: [
        ooeEvent({
          eventId: 'ooe.event.unlabeled',
          sequence: 4,
          type: 'ooe.job.started',
          routeLabel: 'test.route',
          capabilityId: 'test.route',
        }),
      ],
    });
    expect(allSnapshot.events).toEqual([
      expect.objectContaining({
        id: 'event:ooe.event.unlabeled',
        compartmentId: undefined,
      }),
    ]);
  });

  it('filters by terminal status and route/capability query', () => {
    const snapshot = buildOoeDiagnosticsInspectorSnapshot({
      diagnostics: [
        diagnosticsRecord({ diagnosticsId: 'equation', terminalStatus: 'cancelled' }),
        diagnosticsRecord({
          diagnosticsId: 'table',
          routeLabel: 'table.build',
          capabilityId: 'table.build',
          terminalStatus: 'completed',
        }),
      ],
      activeJobs: [],
      recentJobs: [],
      statusFilter: 'cancelled',
      query: 'equation',
    });

    expect(snapshot.items).toHaveLength(1);
    expect(snapshot.items[0]).toMatchObject({
      id: 'diagnostics:equation',
      status: 'cancelled',
      routeLabel: 'equation.solve',
    });
  });

  it('includes UI boundary records as failed compartment evidence', () => {
    const snapshot = buildOoeDiagnosticsInspectorSnapshot({
      diagnostics: [],
      activeJobs: [],
      recentJobs: [],
      uiBoundaryRecords: [uiBoundaryRecord()],
    });

    expect(snapshot.compartments).toEqual(expect.arrayContaining([
      expect.objectContaining({
        compartmentId: 'app-shell',
        compartmentLabel: 'App Shell',
        health: 'failed',
        latestIssue: expect.objectContaining({
          source: 'ui-boundary',
          severity: 'error',
          summary: 'Workspace render failed',
          evidenceId: 'ui-boundary:compartment.ui.1',
        }),
        inspectTarget: {
          panel: 'compartments',
          id: 'ui-boundary:compartment.ui.1',
        },
      }),
    ]));
  });

  it('projects active and warning compartment state from OOE facts', () => {
    const snapshot = buildOoeDiagnosticsInspectorSnapshot({
      diagnostics: [],
      activeJobs: [
        activeJob({
          registryId: 'equation-active',
          routeLabel: 'equation.solve',
          capabilityId: 'equation.solve',
        }),
      ],
      recentJobs: [
        activeJob({
          registryId: 'table-skipped',
          routeLabel: 'table.build',
          capabilityId: 'table.build',
          hostId: 'table-runtime',
          status: 'skipped',
          startedAt: 40,
          finishedAt: 45,
        }),
      ],
      events: [
        ooeEvent({
          eventId: 'ooe.event.table.skipped',
          sequence: 7,
          type: 'ooe.result.skipped',
          timestamp: 70,
          routeLabel: 'table.build',
          capabilityId: 'table.build',
          hostId: 'table-runtime',
          compartmentId: 'table',
          compartmentLabel: 'Table',
          severity: 'warning',
          message: 'Result skipped.',
        }),
      ],
    });

    expect(snapshot.compartments.find((entry) => entry.compartmentId === 'equation')).toMatchObject({
      compartmentLabel: 'Equation',
      health: 'active',
      activeJobCount: 1,
    });
    expect(snapshot.compartments.find((entry) => entry.compartmentId === 'table')).toMatchObject({
      compartmentLabel: 'Table',
      health: 'warning',
      recentJobCount: 1,
      latestIssue: expect.objectContaining({
        source: 'ooe-event',
        severity: 'warning',
        summary: 'Result skipped.',
      }),
      inspectTarget: {
        panel: 'events',
        id: 'event:ooe.event.table.skipped',
      },
    });
  });

  it('projects failed compartment state without guessing unknown ownership', () => {
    const snapshot = buildOoeDiagnosticsInspectorSnapshot({
      diagnostics: [
        diagnosticsRecord({
          diagnosticsId: 'equation-failed',
          terminalStatus: 'failed',
          errorMessage: 'Equation runtime crashed.',
          finishedAt: 80,
        }),
      ],
      activeJobs: [],
      recentJobs: [],
      events: [
        ooeEvent({
          eventId: 'ooe.event.unknown',
          sequence: 9,
          type: 'ooe.preflight.failed',
          timestamp: 90,
          routeLabel: 'test.route',
          capabilityId: 'test.route',
          hostId: 'test-runtime',
          severity: 'warning',
          message: 'Unknown test route.',
        }),
      ],
    });

    expect(snapshot.compartments.find((entry) => entry.compartmentId === 'equation')).toMatchObject({
      health: 'failed',
      latestIssue: expect.objectContaining({
        source: 'diagnostics-record',
        severity: 'error',
        summary: 'Equation runtime crashed.',
      }),
      inspectTarget: {
        panel: 'records',
        id: 'diagnostics:equation-failed',
      },
    });
    const calculateState = snapshot.compartments.find((entry) => entry.compartmentId === 'calculate');
    expect(calculateState).toMatchObject({
      health: 'idle',
    });
    expect(calculateState).not.toHaveProperty('latestIssue');
  });

  it('serializes the selected raw record as stable pretty JSON', () => {
    const snapshot = buildOoeDiagnosticsInspectorSnapshot({
      diagnostics: [diagnosticsRecord()],
      activeJobs: [],
      recentJobs: [],
    });

    expect(serializeOoeDiagnosticsInspectorItem(snapshot.items[0])).toContain(
      '"routeLabel": "equation.solve"',
    );
  });

  it('summarizes normalized runtime shell and launch-ticket evidence', () => {
    const snapshot = buildOoeDiagnosticsInspectorSnapshot({
      diagnostics: [
        diagnosticsRecord({
          provenance: {
            depth: 'rich',
            mode: 'equation',
            route: 'equation.solve',
            runtimeShell: {
              contractVersion: 1,
              shellId: 'equation-worker-shell',
              capabilityId: 'equation.solve',
              primaryHostId: 'equation-worker-runtime',
              selectedHostId: 'equation-worker-runtime',
              fallbackHostId: 'equation-runtime',
              lifecycle: 'completed',
              isolated: true,
              hostStatus: 'worker',
              launchTicket: {
                id: 'ticket.equation.1',
                historyLaunchOrder: 9001,
              },
            },
            equation: {},
          },
        }),
      ],
      activeJobs: [],
      recentJobs: [],
    });

    expect(snapshot.items[0].evidenceLines).toContain(
      'Runtime shell: equation-worker-shell (completed)',
    );
    expect(snapshot.items[0].evidenceLines).toContain(
      'Launch ticket: ticket.equation.1 order 9001',
    );
  });
});
