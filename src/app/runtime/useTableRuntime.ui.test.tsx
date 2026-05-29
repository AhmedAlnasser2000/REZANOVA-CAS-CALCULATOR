import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  DisplayOutcome,
  TableResponse,
} from '../../types/calculator';
import {
  buildTableOoeInputRevisionId,
  runTableModeWithOoePilot,
  type RunTableModeRequest,
} from '../../lib/modes/table';
import type { OoeJobContextOptions } from '../../lib/ooe/job-contract';
import { useTableRuntime } from './useTableRuntime';

vi.mock('../../lib/modes/table', () => ({
  buildTableOoeInputRevisionId: vi.fn((request: RunTableModeRequest) => {
    const formula = request.primaryLatex.replace(/[^A-Za-z0-9]+/gu, '_');
    return `input.table.build.${formula}.${request.start}.${request.end}.${request.step}`;
  }),
  runTableModeWithOoePilot: vi.fn(),
}));

function tablePayload(label: string) {
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
  legality: 'commitAllowed' | 'staleDrop',
  payload = tablePayload('x^2'),
) {
  const job = {
    jobId: 'job.table.build.test',
    planId: 'plan.table.build',
    capabilityId: 'table.build',
    hostId: 'table-runtime',
    nodeId: 'node.table.build',
    phaseId: 'table.build',
    inputRevisionId: 'input.table.build.test',
  };
  return {
    payload,
    ooe: {
      planId: 'plan.table.build',
      capabilityId: 'table.build',
      hostId: 'table-runtime',
      nodeId: 'node.table.build',
      phaseId: 'table.build',
      status: { kind: 'ready', planId: 'plan.table.build' },
      job,
      commitAssessment: {
        job,
        activeInputRevisionId: legality === 'commitAllowed'
          ? job.inputRevisionId
          : 'input.table.build.stale',
        commitPolicy: 'commitLatestOnly',
        legality,
        commitDecision: legality === 'commitAllowed' ? 'committed' : 'staleDropped',
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
          hostId: 'table-runtime',
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
