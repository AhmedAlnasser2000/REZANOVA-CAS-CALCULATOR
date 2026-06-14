import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearOoeJobRegistry,
  listActiveOoeJobs,
  listRecentOoeJobs,
  markOoeJobCancelled,
  requestOoeJobCancellation,
  startOoeJob,
} from '../lib/ooe/job-launch/active-job-registry';
import {
  clearOoeDiagnostics,
  listOoeDiagnostics,
  recordOoeDiagnostics,
} from '../lib/ooe/diagnostics/diagnostics-buffer';
import type { OoeCommitAssessment, OoeJobIdentity } from '../lib/ooe/bridge-schema/ooe-bridge';
import { OoeDiagnosticsPanel } from './OoeDiagnosticsPanel';
import '../styles/app/shell.css';

const job: OoeJobIdentity = {
  jobId: 'job.equation.solve.1',
  planId: 'plan.equation.solve',
  capabilityId: 'equation.solve',
  hostId: 'equation-runtime',
  nodeId: 'node.equation.solve',
  phaseId: 'equation.solve',
  inputRevisionId: 'input.equation.solve.1',
};

const cancelledAssessment: OoeCommitAssessment = {
  job,
  activeInputRevisionId: job.inputRevisionId,
  commitPolicy: 'commitLatestOnly',
  legality: 'notApplicable',
  commitDecision: 'notApplicable',
  resultStability: 'stale',
};

function seedDiagnosticsRecord() {
  return recordOoeDiagnostics({
    job,
    routeLabel: 'equation.solve',
    terminalStatus: 'cancelled',
    commitAssessment: cancelledAssessment,
    hostAdapter: {
      status: 'ready',
      hostId: 'equation-runtime',
      hostKind: 'mainThreadTypeScript',
      threadSafety: 'mainThreadOnly',
      supportedTaskClasses: ['explicit'],
      budgetPolicy: 'cooperative',
      cancellationPolicy: 'cooperative',
      defaultResultStability: 'stable',
      description: 'Equation host.',
    },
    traceEvents: [{
      planId: job.planId,
      nodeId: job.nodeId ?? null,
      phaseId: job.phaseId ?? null,
      status: 'cancelled',
      resultStability: 'stale',
      durationMs: 7,
      commitDecision: 'notApplicable',
      message: 'Equation solve stopped at branch 2.',
    }],
    provenance: {
      depth: 'rich',
      mode: 'equation',
      route: 'equation.solve',
      equation: {
        cancellation: {
          phase: 'complex-preimage',
          branchIndex: 2,
        },
        directSymbolicHelperHostExecutions: [{
          hostId: 'equation-direct-symbolic-worker-runtime',
          status: 'cancelled',
        }],
      },
    },
    startedAt: 10,
    finishedAt: 20,
  });
}

function seedActiveAndRecentJobs() {
  const recentStarted = startOoeJob({
    job: {
      ...job,
      jobId: 'job.table.build.1',
      capabilityId: 'table.build',
      planId: 'plan.table.build',
      hostId: 'table-worker-runtime',
    },
    routeLabel: 'table.build',
  });
  requestOoeJobCancellation(recentStarted.registryId, {
    requestedBy: 'user',
    reason: 'Stop pressed',
  });
  markOoeJobCancelled(recentStarted.registryId);

  startOoeJob({
    job: {
      ...job,
      jobId: 'job.equation.solve.active',
      inputRevisionId: 'input.equation.solve.active',
    },
    routeLabel: 'equation.solve',
  });
}

describe('OoeDiagnosticsPanel', () => {
  beforeEach(() => {
    clearOoeDiagnostics();
    clearOoeJobRegistry();
  });

  it('renders records, filters them, and copies the selected raw record', async () => {
    seedDiagnosticsRecord();
    seedActiveAndRecentJobs();
    const copyText = vi.fn();

    render(
      <OoeDiagnosticsPanel
        presentation="overlay"
        onClose={vi.fn()}
        copyText={copyText}
      />,
    );

    expect(screen.getByTestId('ooe-diagnostics-summary')).toHaveTextContent('1 records');
    expect(screen.getByTestId('ooe-diagnostics-summary')).toHaveTextContent('1 active');
    expect(screen.getByTestId('ooe-diagnostics-summary')).toHaveTextContent('1 recent jobs');
    expect(screen.getAllByTestId('ooe-diagnostics-row')).toHaveLength(3);
    expect(screen.getByTestId('ooe-diagnostics-detail')).toHaveTextContent('equation.solve');

    fireEvent.change(screen.getByTestId('ooe-diagnostics-query'), {
      target: { value: 'table' },
    });
    expect(screen.getAllByTestId('ooe-diagnostics-row')).toHaveLength(1);
    expect(screen.getByTestId('ooe-diagnostics-row')).toHaveTextContent('table.build');

    fireEvent.change(screen.getByTestId('ooe-diagnostics-query'), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByTestId('ooe-diagnostics-status-filter'), {
      target: { value: 'cancelled' },
    });
    expect(screen.getAllByTestId('ooe-diagnostics-row')).toHaveLength(2);

    fireEvent.click(screen.getAllByTestId('ooe-diagnostics-row')[0]);
    fireEvent.click(within(screen.getByTestId('ooe-diagnostics-detail')).getByRole('button', {
      name: /copy/i,
    }));
    expect(copyText).toHaveBeenCalledWith(expect.stringContaining('"routeLabel": "table.build"'));
  });

  it('clears diagnostics and recent jobs without touching active jobs', () => {
    seedDiagnosticsRecord();
    seedActiveAndRecentJobs();

    render(
      <OoeDiagnosticsPanel
        presentation="overlay"
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /clear/i }));

    expect(listOoeDiagnostics()).toEqual([]);
    expect(listRecentOoeJobs()).toEqual([]);
    expect(listActiveOoeJobs()).toHaveLength(1);
    expect(screen.getByTestId('ooe-diagnostics-summary')).toHaveTextContent('0 records');
    expect(screen.getByTestId('ooe-diagnostics-summary')).toHaveTextContent('1 active');
  });

  it('closes through the panel action', () => {
    const onClose = vi.fn();

    render(
      <OoeDiagnosticsPanel
        presentation="overlay"
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /close/i }));

    expect(onClose).toHaveBeenCalled();
  });
});
