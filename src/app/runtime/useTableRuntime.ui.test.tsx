import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  DisplayOutcome,
  TableResponse,
} from '../../types/calculator';
import {
  buildTableOoeInputRevisionId,
  runTableModeWithOoePilot,
  type TableModeResult,
  type RunTableModeRequest,
} from '../../lib/modes/table';
import type { OoeJobContextOptions } from '../../lib/ooe/job-launch/job-contract';
import { useTableRuntime } from './useTableRuntime';

vi.mock('../../lib/modes/table', () => ({
  buildTableOoeInputRevisionId: vi.fn((request: RunTableModeRequest) => {
    const formula = request.primaryLatex.replace(/[^A-Za-z0-9]+/gu, '_');
    return `input.table.build.${formula}.${request.start}.${request.end}.${request.step}`;
  }),
  runTableModeWithOoePilot: vi.fn(),
}));

function tablePayload(label: string): TableModeResult {
  const response: TableResponse = {
    headers: ['x', label],
    rows: [{ x: '0', primary: label, secondary: undefined }],
    warnings: [],
  };
  const outcome: DisplayOutcome = {
    kind: 'success',
    title: 'Table',
    exactLatex: `f(x)=${label}`,
    approxText: '1 row generated',
    warnings: [],
  };
  return { outcome, response };
}

function tableEnvelope(
  legality: 'commitAllowed' | 'staleDrop' | 'cancelled',
  payload: TableModeResult = tablePayload('x^2'),
) {
  const job = {
    jobId: 'job.table.build.test',
    planId: 'plan.table.build',
    capabilityId: 'table.build',
    hostId: 'table-worker-runtime',
    nodeId: 'node.table.build',
    phaseId: 'table.build',
    inputRevisionId: 'input.table.build.test',
  };
  return {
    payload,
    ooe: {
      planId: 'plan.table.build',
      capabilityId: 'table.build',
      hostId: 'table-worker-runtime',
      nodeId: 'node.table.build',
      phaseId: 'table.build',
      status: { kind: 'ready', planId: 'plan.table.build' },
      completion: legality === 'cancelled'
          ? {
            kind: 'cancelled',
            reason: 'Table build stopped before it finished.',
          }
        : undefined,
      job,
      commitAssessment: {
        job,
        activeInputRevisionId: legality === 'commitAllowed'
          ? job.inputRevisionId
          : 'input.table.build.stale',
        commitPolicy: 'commitLatestOnly',
        legality: legality === 'cancelled' ? 'notApplicable' : legality,
        commitDecision: legality === 'commitAllowed'
          ? 'committed'
          : legality === 'staleDrop'
            ? 'staleDropped'
            : 'notApplicable',
        resultStability: legality === 'commitAllowed' ? 'stable' : 'stale',
      },
      traceEvents: [],
    },
  } as Awaited<ReturnType<typeof runTableModeWithOoePilot>>;
}

describe('useTableRuntime OOE stale gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('commits table response and outcome when the active revision matches', async () => {
    const commitOutcome = vi.fn();
    const clearReplayVariableSubstitutions = vi.fn();
    const payload = tablePayload('current');
    vi.mocked(runTableModeWithOoePilot).mockResolvedValue(
      tableEnvelope('commitAllowed', payload),
    );

    const { result } = renderHook(() => useTableRuntime({
      commitOutcome,
      variableMemory: [],
      clearReplayVariableSubstitutions,
    }));

    act(() => {
      result.current.runTableAction();
    });

    await waitFor(() => expect(commitOutcome).toHaveBeenCalledTimes(1));

    expect(result.current.tableResponse).toEqual(payload.response);
    expect(commitOutcome).toHaveBeenCalledWith(payload.outcome, 'x^2', 'table');
    expect(clearReplayVariableSubstitutions).toHaveBeenCalledTimes(1);
  });

  it('drops stale table commits while keeping the previous visible response', async () => {
    const commitOutcome = vi.fn();
    const clearReplayVariableSubstitutions = vi.fn();
    const previousPayload = tablePayload('previous');
    const stalePayload = tablePayload('stale');
    vi.mocked(runTableModeWithOoePilot)
      .mockResolvedValueOnce(tableEnvelope('commitAllowed', previousPayload))
      .mockResolvedValueOnce(tableEnvelope('staleDrop', stalePayload));

    const { result } = renderHook(() => useTableRuntime({
      commitOutcome,
      variableMemory: [],
      clearReplayVariableSubstitutions,
    }));

    act(() => {
      result.current.runTableAction();
    });
    await waitFor(() => expect(commitOutcome).toHaveBeenCalledTimes(1));
    expect(result.current.tableResponse).toEqual(previousPayload.response);

    act(() => {
      result.current.runTableAction();
    });
    await waitFor(() => expect(runTableModeWithOoePilot).toHaveBeenCalledTimes(2));

    expect(commitOutcome).toHaveBeenCalledTimes(1);
    expect(clearReplayVariableSubstitutions).toHaveBeenCalledTimes(1);
    expect(result.current.tableResponse).toEqual(previousPayload.response);
  });

  it('drops a cancellation ticket without replacing the previous table response', async () => {
    const commitOutcome = vi.fn();
    const clearReplayVariableSubstitutions = vi.fn();
    const setRuntimeStatusOverride = vi.fn();
    const reserveHistoryTicket = vi.fn(() => ({
      id: 'ticket.table.cancelled',
      historyLaunchOrder: 10,
    }));
    const discardHistoryTicket = vi.fn();
    const previousPayload = tablePayload('previous');
    const cancelledPayload: TableModeResult = {
      outcome: {
        kind: 'error',
        title: 'Table',
        error: 'Table build was stopped before it finished.',
        warnings: [],
      } satisfies DisplayOutcome,
      response: {
        headers: [],
        rows: [],
        warnings: [],
      } satisfies TableResponse,
      runtimeStatus: 'cancelled' as const,
    };
    vi.mocked(runTableModeWithOoePilot)
      .mockResolvedValueOnce(tableEnvelope('commitAllowed', previousPayload))
      .mockResolvedValueOnce(tableEnvelope('cancelled', cancelledPayload));

    const { result } = renderHook(() => useTableRuntime({
      commitOutcome,
      variableMemory: [],
      clearReplayVariableSubstitutions,
      setRuntimeStatusOverride,
      reserveHistoryTicket,
      discardHistoryTicket,
    }));

    act(() => {
      result.current.runTableAction();
    });
    await waitFor(() => expect(commitOutcome).toHaveBeenCalledTimes(1));
    expect(result.current.tableResponse).toEqual(previousPayload.response);

    act(() => {
      result.current.runTableAction();
    });
    await waitFor(() => expect(setRuntimeStatusOverride).toHaveBeenCalledWith('Table build stopped'));

    expect(commitOutcome).toHaveBeenCalledTimes(1);
    expect(discardHistoryTicket).toHaveBeenCalledWith('ticket.table.cancelled');
    expect(result.current.tableResponse).toEqual(previousPayload.response);
    expect(clearReplayVariableSubstitutions).toHaveBeenCalledTimes(1);
  });

  it('reserves and finalizes a Table launch ticket on successful commit', async () => {
    const commitOutcome = vi.fn();
    const reserveHistoryTicket = vi.fn(() => ({
      id: 'ticket.table.success',
      historyLaunchOrder: 33,
    }));
    const payload = tablePayload('current');
    vi.mocked(runTableModeWithOoePilot).mockResolvedValue(
      tableEnvelope('commitAllowed', payload),
    );

    const { result } = renderHook(() => useTableRuntime({
      commitOutcome,
      variableMemory: [],
      reserveHistoryTicket,
    }));

    act(() => {
      result.current.runTableAction();
    });

    await waitFor(() => expect(commitOutcome).toHaveBeenCalledTimes(1));

    expect(reserveHistoryTicket).toHaveBeenCalledWith({
      mode: 'table',
      inputLatex: 'x^2',
      capabilityId: 'table.build',
      inputRevisionId: 'input.table.build.x_2.-2.2.1',
    });
    expect(runTableModeWithOoePilot).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        launchTicket: {
          id: 'ticket.table.success',
          historyLaunchOrder: 33,
        },
      }),
    );
    expect(commitOutcome).toHaveBeenCalledWith(
      payload.outcome,
      'x^2',
      'table',
      {
        historyTicketId: 'ticket.table.success',
        historyLaunchOrder: 33,
      },
    );
  });

  it('captures and restores Table surface state including the visible response', async () => {
    const commitOutcome = vi.fn();
    const payload = tablePayload('x^3');
    vi.mocked(runTableModeWithOoePilot).mockResolvedValue(
      tableEnvelope('commitAllowed', payload),
    );

    const { result } = renderHook(() => useTableRuntime({
      commitOutcome,
      variableMemory: [],
    }));

    act(() => {
      result.current.setTablePrimaryLatex('x^3');
      result.current.setTableSecondaryEnabled(true);
      result.current.setTableSecondaryLatex('x+1');
      result.current.setTableStart(-1);
      result.current.setTableEnd(3);
      result.current.setTableStep(2);
      result.current.runTableAction();
    });

    await waitFor(() => expect(commitOutcome).toHaveBeenCalledTimes(1));

    const snapshot = result.current.captureTableSurfaceState();

    act(() => {
      result.current.restoreTableSurfaceState(null);
    });

    expect(result.current.tablePrimaryLatex).toBe('x^2');
    expect(result.current.tableSecondaryEnabled).toBe(false);
    expect(result.current.tableResponse).toBeNull();

    act(() => {
      result.current.restoreTableSurfaceState(snapshot);
    });

    expect(result.current.tablePrimaryLatex).toBe('x^3');
    expect(result.current.tableSecondaryEnabled).toBe(true);
    expect(result.current.tableSecondaryLatex).toBe('x+1');
    expect(result.current.tableStart).toBe(-1);
    expect(result.current.tableEnd).toBe(3);
    expect(result.current.tableStep).toBe(2);
    expect(result.current.tableResponse).toEqual(payload.response);
  });

  it('resolves active revisions from the latest Table draft', async () => {
    let capturedOptions: OoeJobContextOptions | undefined;
    let resolveRun: ((value: Awaited<ReturnType<typeof runTableModeWithOoePilot>>) => void)
      | undefined;
    const commitOutcome = vi.fn();

    vi.mocked(runTableModeWithOoePilot).mockImplementation((_request, options) => {
      capturedOptions = options;
      return new Promise((resolve) => {
        resolveRun = resolve;
      });
    });

    const { result } = renderHook(() => useTableRuntime({
      commitOutcome,
      variableMemory: [],
    }));

    act(() => {
      result.current.runTableAction();
    });
    await waitFor(() => expect(capturedOptions).toBeDefined());

    act(() => {
      result.current.setTablePrimaryLatex('x+1');
    });

    expect(typeof capturedOptions?.activeInputRevisionId).toBe('function');
    const activeRevision = typeof capturedOptions?.activeInputRevisionId === 'function'
      ? capturedOptions.activeInputRevisionId({
          jobId: 'job.table.build.test',
          planId: 'plan.table.build',
          capabilityId: 'table.build',
          hostId: 'table-worker-runtime',
          nodeId: 'node.table.build',
          phaseId: 'table.build',
          inputRevisionId: 'input.table.build.old',
        })
      : null;

    expect(activeRevision).toBe('input.table.build.x_1.-2.2.1');
    expect(buildTableOoeInputRevisionId).toHaveBeenLastCalledWith(
      expect.objectContaining({ primaryLatex: 'x+1' }),
    );

    act(() => {
      resolveRun?.(tableEnvelope('staleDrop'));
    });

    await waitFor(() => expect(runTableModeWithOoePilot).toHaveBeenCalledTimes(1));
    expect(commitOutcome).not.toHaveBeenCalled();
  });
});
