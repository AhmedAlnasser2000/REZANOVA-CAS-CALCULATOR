import { describe, expect, it } from 'vitest';
import type { OoeActiveJobRecord } from '../job-launch/active-job-registry';
import {
  buildOoeDiagnosticsInspectorSnapshot,
  serializeOoeDiagnosticsInspectorItem,
} from './diagnostics-inspector';
import type { OoeDiagnosticsRecord } from './diagnostics-buffer';
import type { OoeCommitAssessment, OoeJobIdentity } from '../bridge-schema/ooe-bridge';
import type { OoeEventEnvelope } from '../events/event-outbox';

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
