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
import {
  listOoeEvents,
  recordOoeEvent,
  resetOoeEventOutboxForTests,
} from '../lib/ooe/events/event-outbox';
import {
  listCompartmentUiBoundaryErrors,
  recordCompartmentUiBoundaryError,
  resetCompartmentUiBoundaryRecordsForTests,
} from '../lib/compartments/ui-boundary-records';
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

function seedOoeEvents() {
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
    type: 'ooe.job.started',
    severity: 'debug',
    routeLabel: 'test.route',
    capabilityId: 'test.route',
    hostId: 'test-runtime',
    jobId: 'job.test.route.1',
    message: 'Unlabeled test event.',
  });
  recordOoeEvent({
    type: 'ooe.job.started',
    severity: 'info',
    routeLabel: 'equation.solve',
    capabilityId: 'equation.solve',
    hostId: 'equation-runtime',
    compartmentId: 'equation',
    compartmentLabel: 'Equation',
    jobId: job.jobId,
    message: 'Equation job started.',
  });
  recordOoeEvent({
    type: 'ooe.result.committed',
    severity: 'info',
    routeLabel: 'equation.solve',
    capabilityId: 'equation.solve',
    hostId: 'equation-runtime',
    compartmentId: 'equation',
    compartmentLabel: 'Equation',
    jobId: job.jobId,
    message: 'Result committed.',
  });
}

function seedSkippedTableEvent() {
  recordOoeEvent({
    type: 'ooe.result.skipped',
    severity: 'warning',
    routeLabel: 'table.build',
    capabilityId: 'table.build',
    hostId: 'table-runtime',
    compartmentId: 'table',
    compartmentLabel: 'Table',
    jobId: 'job.table.build.skipped',
    message: 'Result skipped.',
  });
}

describe('OoeDiagnosticsPanel', () => {
  beforeEach(() => {
    clearOoeDiagnostics();
    clearOoeJobRegistry();
    resetOoeEventOutboxForTests();
    resetCompartmentUiBoundaryRecordsForTests();
  });

  it('renders records by default, filters them, and copies the selected raw record', async () => {
    seedDiagnosticsRecord();
    seedActiveAndRecentJobs();
    seedOoeEvents();
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
    expect(screen.getByTestId('ooe-diagnostics-summary')).toHaveTextContent('4 events');
    expect(screen.getByTestId('ooe-diagnostics-tab-records')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getAllByTestId('ooe-diagnostics-row')).toHaveLength(1);
    expect(screen.queryByTestId('ooe-diagnostics-events')).not.toBeInTheDocument();
    expect(screen.getByTestId('ooe-diagnostics-detail')).toHaveTextContent('equation.solve');

    fireEvent.change(screen.getByTestId('ooe-diagnostics-status-filter'), {
      target: { value: 'cancelled' },
    });
    expect(screen.getAllByTestId('ooe-diagnostics-row')).toHaveLength(1);

    fireEvent.click(screen.getAllByTestId('ooe-diagnostics-row')[0]);
    fireEvent.click(within(screen.getByTestId('ooe-diagnostics-detail')).getByRole('button', {
      name: /copy/i,
    }));
    expect(copyText).toHaveBeenCalledWith(expect.stringContaining('"routeLabel": "equation.solve"'));
  });

  it('shows lifecycle events in the Events tab with a compartment-only filter', () => {
    seedDiagnosticsRecord();
    seedActiveAndRecentJobs();
    seedOoeEvents();

    render(
      <OoeDiagnosticsPanel
        presentation="overlay"
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId('ooe-diagnostics-tab-events'));

    expect(screen.getByTestId('ooe-diagnostics-tab-events')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByTestId('ooe-diagnostics-events')).toHaveTextContent('Event timeline');
    expect(screen.queryByTestId('ooe-diagnostics-status-filter')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ooe-diagnostics-query')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('ooe-diagnostics-event-row')).toHaveLength(4);
    expect(screen.getAllByTestId('ooe-diagnostics-event-row')[0]).toHaveTextContent(
      'ooe.result.committed',
    );
    expect(screen.getAllByTestId('ooe-diagnostics-event-row')[0]).toHaveTextContent(
      'Equation',
    );

    fireEvent.change(screen.getByTestId('ooe-diagnostics-event-compartment-filter'), {
      target: { value: 'table' },
    });
    expect(screen.getAllByTestId('ooe-diagnostics-event-row')).toHaveLength(1);
    expect(screen.getByTestId('ooe-diagnostics-event-row')).toHaveTextContent('Table');
    expect(screen.queryByTestId('ooe-diagnostics-detail')).not.toBeInTheDocument();
  });

  it('shows derived compartment health in a separate Compartments tab', () => {
    seedDiagnosticsRecord();
    seedActiveAndRecentJobs();
    seedOoeEvents();

    render(
      <OoeDiagnosticsPanel
        presentation="overlay"
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId('ooe-diagnostics-tab-compartments'));

    expect(screen.getByTestId('ooe-diagnostics-tab-compartments')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.queryByTestId('ooe-diagnostics-events')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ooe-diagnostics-status-filter')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('ooe-diagnostics-compartment-row')).toHaveLength(9);
    expect(screen.getByTestId('ooe-diagnostics-compartment-list')).toHaveTextContent('Equation');
    expect(screen.getByTestId('ooe-diagnostics-compartment-list')).toHaveTextContent('active');
    expect(screen.getByTestId('ooe-diagnostics-compartment-detail')).toHaveTextContent(
      'compartment',
    );
    expect(screen.getByTestId('ooe-diagnostics-compartment-detail')).toHaveTextContent('Health');
    expect(screen.getByTestId('ooe-diagnostics-compartment-detail')).toHaveTextContent(
      'Owned paths',
    );
    expect(screen.getByTestId('ooe-diagnostics-compartment-detail')).toHaveTextContent(
      'src/lib/equation/',
    );
    expect(screen.getByTestId('ooe-diagnostics-compartment-detail')).toHaveTextContent(
      'future-surface',
    );
    expect(screen.getByTestId('ooe-diagnostics-compartment-detail')).toHaveTextContent(
      'Evidence sources',
    );
    expect(
      within(screen.getByTestId('ooe-diagnostics-compartment-detail')).queryByRole('button', {
        name: /copy/i,
      }),
    ).not.toBeInTheDocument();
  });

  it('inspects event-backed compartment evidence from the Compartments tab', () => {
    seedSkippedTableEvent();

    render(
      <OoeDiagnosticsPanel
        presentation="overlay"
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId('ooe-diagnostics-tab-compartments'));
    fireEvent.click(within(screen.getByTestId('ooe-diagnostics-compartment-list')).getByRole(
      'button',
      { name: /Table/ },
    ));
    fireEvent.click(screen.getByRole('button', { name: /inspect evidence/i }));

    expect(screen.getByTestId('ooe-diagnostics-tab-events')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    const eventRow = screen.getByTestId('ooe-diagnostics-event-row');
    expect(eventRow).toHaveTextContent('ooe.result.skipped');
    expect(eventRow).toHaveClass('is-selected');
  });

  it('inspects diagnostics-record-backed compartment evidence from the Compartments tab', () => {
    seedDiagnosticsRecord();

    render(
      <OoeDiagnosticsPanel
        presentation="overlay"
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId('ooe-diagnostics-tab-compartments'));
    fireEvent.click(within(screen.getByTestId('ooe-diagnostics-compartment-list')).getByRole(
      'button',
      { name: /Equation/ },
    ));
    fireEvent.click(screen.getByRole('button', { name: /inspect evidence/i }));

    expect(screen.getByTestId('ooe-diagnostics-tab-records')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByTestId('ooe-diagnostics-detail')).toHaveTextContent('equation.solve');
    expect(screen.getByTestId('ooe-diagnostics-row')).toHaveClass('is-selected');
  });

  it('inspects job-backed compartment evidence from the Compartments tab', () => {
    seedActiveAndRecentJobs();

    render(
      <OoeDiagnosticsPanel
        presentation="overlay"
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId('ooe-diagnostics-tab-compartments'));
    fireEvent.click(within(screen.getByTestId('ooe-diagnostics-compartment-list')).getByRole(
      'button',
      { name: /Table/ },
    ));
    fireEvent.click(screen.getByRole('button', { name: /inspect evidence/i }));

    expect(screen.getByTestId('ooe-diagnostics-tab-jobs')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    const selectedJobRow = screen.getAllByTestId('ooe-diagnostics-row').find((row) =>
      row.classList.contains('is-selected'));
    expect(selectedJobRow).toBeDefined();
    expect(selectedJobRow!).toHaveTextContent('table.build');
  });

  it('shows UI boundary failures as compartment evidence without creating raw copy targets', () => {
    seedDiagnosticsRecord();
    recordCompartmentUiBoundaryError({
      compartmentId: 'app-shell',
      error: new Error('Workspace render failed'),
      componentStack: 'at WorkspaceHost',
      timestamp: 150,
    });

    render(
      <OoeDiagnosticsPanel
        presentation="overlay"
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByTestId('ooe-diagnostics-summary')).toHaveTextContent('1 UI issues');

    fireEvent.click(screen.getByTestId('ooe-diagnostics-tab-compartments'));

    expect(screen.getByTestId('ooe-diagnostics-compartment-list')).toHaveTextContent('App Shell');
    expect(screen.getByTestId('ooe-diagnostics-compartment-list')).toHaveTextContent('failed');
    fireEvent.click(screen.getByText('App Shell'));
    expect(screen.getByTestId('ooe-diagnostics-compartment-detail')).toHaveTextContent(
      'Workspace render failed',
    );
    expect(screen.getByTestId('ooe-diagnostics-compartment-detail')).toHaveTextContent(
      'ui-boundary',
    );
    fireEvent.click(screen.getByRole('button', { name: /inspect evidence/i }));
    expect(screen.getByTestId('ooe-diagnostics-tab-compartments')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByTestId('ooe-diagnostics-compartment-detail')).toHaveTextContent(
      'App Shell',
    );
    expect(
      within(screen.getByTestId('ooe-diagnostics-compartment-detail')).queryByRole('button', {
        name: /copy/i,
      }),
    ).not.toBeInTheDocument();
  });

  it('shows active and recent jobs in the Jobs tab with existing detail copy behavior', async () => {
    seedDiagnosticsRecord();
    seedActiveAndRecentJobs();
    seedOoeEvents();
    const copyText = vi.fn();

    render(
      <OoeDiagnosticsPanel
        presentation="overlay"
        onClose={vi.fn()}
        copyText={copyText}
      />,
    );

    fireEvent.click(screen.getByTestId('ooe-diagnostics-tab-jobs'));

    expect(screen.getByTestId('ooe-diagnostics-tab-jobs')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getAllByTestId('ooe-diagnostics-row')).toHaveLength(2);
    expect(screen.queryByTestId('ooe-diagnostics-events')).not.toBeInTheDocument();

    fireEvent.change(screen.getByTestId('ooe-diagnostics-query'), {
      target: { value: 'table' },
    });
    expect(screen.getAllByTestId('ooe-diagnostics-row')).toHaveLength(1);
    expect(screen.getByTestId('ooe-diagnostics-row')).toHaveTextContent('table.build');

    fireEvent.change(screen.getByTestId('ooe-diagnostics-status-filter'), {
      target: { value: 'cancelled' },
    });
    expect(screen.getAllByTestId('ooe-diagnostics-row')).toHaveLength(1);

    fireEvent.click(screen.getAllByTestId('ooe-diagnostics-row')[0]);
    fireEvent.click(within(screen.getByTestId('ooe-diagnostics-detail')).getByRole('button', {
      name: /copy/i,
    }));
    expect(copyText).toHaveBeenCalledWith(expect.stringContaining('"routeLabel": "table.build"'));
  });

  it('clears diagnostics and recent jobs without touching active jobs', () => {
    seedDiagnosticsRecord();
    seedActiveAndRecentJobs();
    seedOoeEvents();

    render(
      <OoeDiagnosticsPanel
        presentation="overlay"
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /clear/i }));

    expect(listOoeDiagnostics()).toEqual([]);
    expect(listRecentOoeJobs()).toEqual([]);
    expect(listOoeEvents()).toEqual([]);
    expect(listCompartmentUiBoundaryErrors()).toEqual([]);
    expect(listActiveOoeJobs()).toHaveLength(1);
    expect(screen.getByTestId('ooe-diagnostics-summary')).toHaveTextContent('0 records');
    expect(screen.getByTestId('ooe-diagnostics-summary')).toHaveTextContent('1 active');
    expect(screen.getByTestId('ooe-diagnostics-summary')).toHaveTextContent('0 events');
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
