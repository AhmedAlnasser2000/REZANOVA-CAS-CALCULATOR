import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildTableOoeInputRevisionId,
  runTableMode,
  runTableModeCooperatively,
  runTableModeWithOoePilot,
  type RunTableModeRequest,
} from '../../modes/table';
import { buildCanonicalTableModeResult } from '../../modes/table-core';
import {
  getBuiltinOoePlan,
  validateOoePlan,
  type OoePlan,
} from '../bridge-schema/ooe-bridge';
import {
  buildTableOoePilotMetadata,
  prepareTableOoePilot,
  runTableWithOoePilot,
} from './table-pilot';
import {
  clearOoeJobRegistry,
  listActiveOoeJobs,
  listRecentOoeJobs,
  requestLatestOoeCapabilityCancellation,
} from '../job-launch/active-job-registry';
import {
  clearOoeDiagnostics,
  getLatestOoeDiagnostics,
} from '../diagnostics/diagnostics-buffer';

vi.mock('../bridge-schema/ooe-bridge', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../bridge-schema/ooe-bridge')>();
  return {
    ...actual,
    getBuiltinOoePlan: vi.fn(),
    validateOoePlan: vi.fn(),
  };
});

function tablePlan(): OoePlan {
  return {
    id: 'plan.table.build',
    schemaVersion: 1,
    nodes: [
      {
        id: 'node.table.build',
        capabilityId: 'table.build',
        hostId: 'table-worker-runtime',
        phaseId: 'table.build',
        taskClass: 'explicit',
        priorityClass: 'userVisible',
        cancellationPolicy: 'hardStop',
        commitPolicy: 'commitLatestOnly',
        threadSafety: 'workerSafe',
        resultStability: 'draft',
        solverMode: 'classic',
        chunkingPolicy: 'none',
        checkpointPolicy: 'none',
        streamingPolicy: 'finalOnly',
        materializationPolicy: 'full',
        computeTopology: 'local',
        resourcePolicy: 'normal',
        dependsOn: [],
        isTerminalResult: true,
      },
    ],
  };
}

function tableRequest(): RunTableModeRequest {
  return {
    primaryLatex: 'a x^2+x',
    secondaryLatex: 'k+x',
    secondaryEnabled: true,
    start: 1,
    end: 2,
    step: 1,
    storedVariables: [
      { name: 'a', valueLatex: '4', numericValue: 4 },
      { name: 'k', valueLatex: '-2', numericValue: -2 },
      { name: 'x', valueLatex: '9', numericValue: 9 },
    ],
  };
}

function mockReadyTablePlan() {
  vi.mocked(getBuiltinOoePlan).mockResolvedValue({
    kind: 'ready',
    data: tablePlan(),
  });
  vi.mocked(validateOoePlan).mockResolvedValue({
    kind: 'ready',
    data: { ok: true, errors: [] },
  });
}

describe('Table OOE pilot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearOoeJobRegistry();
    clearOoeDiagnostics();
  });

  it('reports ready when the table build plan validates', async () => {
    mockReadyTablePlan();

    await expect(prepareTableOoePilot()).resolves.toEqual({
      kind: 'ready',
      planId: 'plan.table.build',
    });

    expect(getBuiltinOoePlan).toHaveBeenCalledWith('plan.table.build');
    expect(validateOoePlan).toHaveBeenCalledWith(tablePlan());
  });

  it('reports fail-open unavailable, missing, invalid, and bridge-error states', async () => {
    vi.mocked(getBuiltinOoePlan).mockResolvedValueOnce({
      kind: 'unavailable',
      reason: 'desktop-runtime-unavailable',
      data: null,
    });
    const unavailable = await runTableWithOoePilot(() => runTableMode(tableRequest()));
    expect(unavailable.ooe.status).toEqual({
      kind: 'unavailable',
      planId: 'plan.table.build',
      reason: 'desktop-runtime-unavailable',
    });
    expect(unavailable.payload).toEqual(runTableMode(tableRequest()));

    vi.mocked(getBuiltinOoePlan).mockResolvedValueOnce({
      kind: 'ready',
      data: null,
    });
    await expect(prepareTableOoePilot()).resolves.toEqual({
      kind: 'missing-plan',
      planId: 'plan.table.build',
    });

    vi.mocked(getBuiltinOoePlan).mockResolvedValueOnce({
      kind: 'ready',
      data: tablePlan(),
    });
    vi.mocked(validateOoePlan).mockResolvedValueOnce({
      kind: 'ready',
      data: { ok: false, errors: [{ kind: 'missingTerminalResult' }] },
    });
    await expect(prepareTableOoePilot()).resolves.toEqual({
      kind: 'invalid-plan',
      planId: 'plan.table.build',
      errors: [{ kind: 'missingTerminalResult' }],
    });

    vi.mocked(getBuiltinOoePlan).mockRejectedValueOnce(new Error('invoke failed'));
    await expect(prepareTableOoePilot()).resolves.toEqual({
      kind: 'bridge-error',
      planId: 'plan.table.build',
      message: 'invoke failed',
    });
  });

  it('keeps wrapped Table outcomes and responses identical', async () => {
    mockReadyTablePlan();
    const request = tableRequest();

    const wrapped = await runTableModeWithOoePilot(request);

    expect(wrapped.payload).toEqual(buildCanonicalTableModeResult(runTableMode(request)));
    expect(wrapped.ooe.job.jobId).toMatch(/^job\.table\.build\.[a-z0-9]+$/u);
    expect(wrapped.ooe.job.inputRevisionId).toMatch(/^input\.table\.build\.[a-z0-9]+$/u);
    expect(wrapped.ooe.commitAssessment).toMatchObject({
      legality: 'commitAllowed',
      commitDecision: 'committed',
      resultStability: 'stable',
    });
    expect(listActiveOoeJobs()).toEqual([]);
    expect(listRecentOoeJobs()[0]).toMatchObject({
      jobId: wrapped.ooe.job.jobId,
      routeLabel: 'table.build',
      status: 'completed',
    });
    expect(getLatestOoeDiagnostics()).toMatchObject({
      jobId: wrapped.ooe.job.jobId,
      routeLabel: 'table.build',
      terminalStatus: 'completed',
      provenance: {
        mode: 'table',
        table: {
          rowsStored: false,
        },
      },
    });
  });

  it('adds coarse lifecycle trace events without storing table rows', () => {
    const metadata = buildTableOoePilotMetadata({
      kind: 'ready',
      planId: 'plan.table.build',
    });

    expect(metadata).toMatchObject({
      planId: 'plan.table.build',
      capabilityId: 'table.build',
      hostId: 'table-worker-runtime',
      nodeId: 'node.table.build',
      phaseId: 'table.build',
    });
    expect(metadata.job.jobId).toMatch(/^job\.table\.build\.[a-z0-9]+$/u);
    expect(metadata.job.inputRevisionId).toMatch(/^input\.table\.build\.[a-z0-9]+$/u);
    expect(metadata.commitAssessment).toMatchObject({
      job: metadata.job,
      activeInputRevisionId: metadata.job.inputRevisionId,
      legality: 'commitAllowed',
      commitDecision: 'committed',
      resultStability: 'stable',
    });
    expect(metadata.traceEvents).toHaveLength(3);
    expect(metadata.traceEvents[0]).toMatchObject({
      status: 'completed',
      resultStability: 'stable',
      jobId: metadata.job.jobId,
      inputRevisionId: metadata.job.inputRevisionId,
      commitDecision: 'notApplicable',
      message: 'OOE table build plan is available and valid.',
    });
    expect(metadata.traceEvents[1]).toMatchObject({
      status: 'started',
      resultStability: 'draft',
      jobId: metadata.job.jobId,
      inputRevisionId: metadata.job.inputRevisionId,
      commitDecision: 'notApplicable',
      message: 'Table build started through the isolated Table runtime.',
    });
    expect(metadata.traceEvents[2]).toMatchObject({
      status: 'completed',
      resultStability: 'stable',
      jobId: metadata.job.jobId,
      inputRevisionId: metadata.job.inputRevisionId,
      commitDecision: 'committed',
      message: 'Table build pilot produced a stable CanonicalRuntimeOutcome.',
    });
    expect(JSON.stringify(metadata.traceEvents)).not.toContain('"rows"');
  });

  it('records stale commit assessments as metadata without blocking table payloads', async () => {
    mockReadyTablePlan();
    const request = tableRequest();

    const wrapped = await runTableModeWithOoePilot(request, {
      activeInputRevisionId: 'input.table.build.stale',
    });

    expect(wrapped.payload).toEqual(buildCanonicalTableModeResult(runTableMode(request)));
    expect(wrapped.ooe.commitAssessment).toMatchObject({
      activeInputRevisionId: 'input.table.build.stale',
      legality: 'staleDrop',
      commitDecision: 'staleDropped',
      resultStability: 'stale',
    });
    expect(wrapped.ooe.traceEvents.at(-1)).toMatchObject({
      jobId: wrapped.ooe.job.jobId,
      inputRevisionId: wrapped.ooe.job.inputRevisionId,
      commitDecision: 'staleDropped',
    });
    expect(listActiveOoeJobs()).toEqual([]);
    expect(listRecentOoeJobs()[0]).toMatchObject({
      jobId: wrapped.ooe.job.jobId,
      routeLabel: 'table.build',
      status: 'staleDropped',
    });
  });

  it('stops cooperative table builds with a controlled cancellation outcome', async () => {
    mockReadyTablePlan();
    const request: RunTableModeRequest = {
      ...tableRequest(),
      primaryLatex: 'x^2',
      secondaryEnabled: false,
      start: 1,
      end: 40,
      step: 1,
    };

    const wrapped = await runTableWithOoePilot((context) => runTableModeCooperatively(request, {
      rowsPerBatch: 5,
      shouldCancel: context.shouldCancel,
      onCheckpoint: ({ completedRows, totalRows }) => {
        context.checkpoint(`Table test checkpoint: ${completedRows}/${totalRows} row(s).`);
        requestLatestOoeCapabilityCancellation('table.build', {
          requestedBy: 'test',
          reason: 'unit test stop',
        });
      },
      yieldIfBudgetExceeded: context.yieldIfBudgetExceeded,
    }), { request });

    expect(wrapped.payload.runtimeStatus).toBe('cancelled');
    expect(wrapped.payload.response.rows).toEqual([]);
    expect(wrapped.payload.outcome).toMatchObject({
      kind: 'error',
      title: 'Table',
      error: 'Table build was stopped before it finished.',
    });
    expect(wrapped.ooe.completion).toEqual({
      kind: 'cancelled',
      reason: 'Table build stopped before it finished.',
    });
    expect(wrapped.ooe.commitAssessment).toMatchObject({
      legality: 'notApplicable',
      commitDecision: 'notApplicable',
      resultStability: 'stale',
    });
    expect(wrapped.ooe.traceEvents.map((event) => event.status)).toContain('cancelled');
    expect(wrapped.ooe.traceEvents.map((event) => event.status)).toContain('provisionalReady');
    expect(listActiveOoeJobs()).toEqual([]);
    expect(listRecentOoeJobs()[0]).toMatchObject({
      routeLabel: 'table.build',
      status: 'cancelled',
      cancellationRequest: {
        requestedBy: 'test',
        reason: 'unit test stop',
      },
    });
    expect(getLatestOoeDiagnostics()).toMatchObject({
      routeLabel: 'table.build',
      terminalStatus: 'cancelled',
      provenance: {
        table: {
          rowsStored: false,
        },
      },
    });
    expect(JSON.stringify(getLatestOoeDiagnostics())).not.toContain('"rows"');
  });

  it('uses the canonical Table revision helper for current requests', async () => {
    mockReadyTablePlan();
    const request = tableRequest();
    const activeInputRevisionId = buildTableOoeInputRevisionId(request);

    const wrapped = await runTableModeWithOoePilot(request, {
      activeInputRevisionId,
    });

    expect(wrapped.ooe.job.inputRevisionId).toBe(activeInputRevisionId);
    expect(wrapped.ooe.commitAssessment).toMatchObject({
      activeInputRevisionId,
      legality: 'commitAllowed',
      commitDecision: 'committed',
    });
  });

  it('marks throwing table runtimes as failed and rethrows', async () => {
    mockReadyTablePlan();

    await expect(runTableWithOoePilot(() => {
      throw new Error('table exploded');
    })).rejects.toThrow('table exploded');

    expect(listActiveOoeJobs()).toEqual([]);
    expect(listRecentOoeJobs()[0]).toMatchObject({
      routeLabel: 'table.build',
      status: 'failed',
      errorMessage: 'table exploded',
    });
  });
});
