import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MutableRefObject } from 'react';
import type { MathfieldElement } from 'mathlive';
import type {
  DisplayOutcome,
  ModeId,
} from '../../types/calculator';
import {
  buildStatisticsOoeInputRevisionId,
  type RunStatisticsRuntimeRequest,
  type StatisticsModeRunPayload,
  runStatisticsModeWithOoePilot,
} from '../../lib/modes/statistics';
import type { PendingHistoryTicketReservation } from '../../lib/ooe/job-launch/launch-tickets';
import { useStatisticsRuntime } from './useStatisticsRuntime';

vi.mock('../../lib/modes/statistics', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/modes/statistics')>();
  return {
    ...actual,
    runStatisticsModeWithOoePilot: vi.fn(),
  };
});

const BINOMIAL_LATEX = 'binomial(n=10,p=0.5,x=3,mode=pmf)';

function statisticsPayload(): StatisticsModeRunPayload {
  return {
    outcome: {
      kind: 'success',
      title: 'Statistics',
      exactLatex: 'P\\left(X=3\\right)=0.1171875',
      warnings: [],
    } satisfies DisplayOutcome,
    parsed: {
      ok: true,
      request: {
        kind: 'binomial',
        n: '10',
        p: '0.5',
        x: '3',
        mode: 'pmf',
      },
      style: 'structured',
    },
    replayScreen: 'binomial',
    replaySeed: {
      screen: 'binomial',
      request: {
        kind: 'binomial',
        n: '10',
        p: '0.5',
        x: '3',
        mode: 'pmf',
      },
      workingSource: 'dataset',
    },
  };
}

function statisticsEnvelope(
  legality: 'commitAllowed' | 'staleDrop' | 'cancelled',
  payload = statisticsPayload(),
) {
  const job = {
    jobId: 'job.statistics.evaluate.test',
    planId: 'plan.statistics.evaluate',
    capabilityId: 'statistics.evaluate',
    hostId: 'statistics-worker-runtime',
    nodeId: 'node.statistics.evaluate',
    phaseId: 'statistics.evaluate',
    inputRevisionId: 'input.statistics.evaluate.test',
  };
  return {
    payload,
    ooe: {
      completion: legality === 'cancelled'
        ? {
            kind: 'cancelled',
            reason: 'Statistics evaluation stopped before it finished.',
          }
        : undefined,
      commitAssessment: {
        job,
        activeInputRevisionId: legality === 'commitAllowed'
          ? job.inputRevisionId
          : 'input.statistics.evaluate.stale',
        commitPolicy: 'commitLatestOnly',
        legality: legality === 'cancelled' ? 'notApplicable' : legality,
        commitDecision: legality === 'commitAllowed'
          ? 'committed'
          : legality === 'staleDrop'
            ? 'staleDropped'
            : 'notApplicable',
        resultStability: legality === 'commitAllowed' ? 'stable' : 'stale',
      },
    },
  } as Awaited<ReturnType<typeof runStatisticsModeWithOoePilot>>;
}

function renderStatisticsRuntime(
  initialProps: {
    currentMode?: ModeId;
    isLauncherOpen?: boolean;
  } = {},
) {
  const activeFieldRef = { current: null } as MutableRefObject<MathfieldElement | null>;
  const currentModeRef = {
    current: initialProps.currentMode ?? 'statistics',
  } as MutableRefObject<ModeId>;
  const commitOutcome = vi.fn();
  const discardHistoryTicket = vi.fn();
  const openLauncher = vi.fn();
  const reserveHistoryTicket = vi.fn((): PendingHistoryTicketReservation | null => null);
  const setClipboardNotice = vi.fn();
  const setDisplayOutcome = vi.fn();
  const setRuntimeStatusOverride = vi.fn();
  const startTransition = vi.fn((callback: () => void) => callback());

  const hook = renderHook(
    (props: { currentMode: ModeId; isLauncherOpen: boolean }) => {
      currentModeRef.current = props.currentMode;
      return useStatisticsRuntime({
        activeFieldRef,
        commitOutcome,
        currentMode: props.currentMode,
        currentModeRef,
        discardHistoryTicket,
        isLauncherOpen: props.isLauncherOpen,
        openLauncher,
        reserveHistoryTicket,
        setClipboardNotice,
        setDisplayOutcome,
        setRuntimeStatusOverride,
        startTransition,
      });
    },
    {
      initialProps: {
        currentMode: initialProps.currentMode ?? 'statistics',
        isLauncherOpen: initialProps.isLauncherOpen ?? false,
      },
    },
  );

  return {
    activeFieldRef,
    commitOutcome,
    currentModeRef,
    discardHistoryTicket,
    hook,
    openLauncher,
    reserveHistoryTicket,
    setClipboardNotice,
    setDisplayOutcome,
    setRuntimeStatusOverride,
    startTransition,
  };
}

describe('useStatisticsRuntime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates the shared Statistics draft and source workflow through the hook', () => {
    const { hook, setClipboardNotice } = renderStatisticsRuntime();

    act(() => {
      hook.result.current.loadStatisticsDraft(BINOMIAL_LATEX, 'manual', true);
    });

    expect(hook.result.current.statisticsDraftState).toMatchObject({
      rawLatex: BINOMIAL_LATEX,
      source: 'manual',
      executable: true,
    });
    expect(hook.result.current.statisticsDraftLatex).toBe(BINOMIAL_LATEX);

    act(() => {
      hook.result.current.updateStatisticsDataset('1 1 2 3');
    });
    act(() => {
      hook.result.current.importDatasetIntoFrequencyTable();
    });

    expect(hook.result.current.statisticsWorkingSource).toBe('frequencyTable');
    expect(hook.result.current.frequencyTable.rows).toEqual([
      { value: '1', frequency: '2' },
      { value: '2', frequency: '1' },
      { value: '3', frequency: '1' },
    ]);
    expect(setClipboardNotice).toHaveBeenCalledWith('Frequency table built from dataset');
  });

  it('applies requests and guide examples through the hook boundary', () => {
    const { hook } = renderStatisticsRuntime();

    act(() => {
      hook.result.current.applyStatisticsRequest({
        kind: 'normal',
        mean: '10',
        standardDeviation: '2',
        x: '12',
        mode: 'cdf',
      });
    });

    expect(hook.result.current.normalState).toMatchObject({
      mean: '10',
      standardDeviation: '2',
      x: '12',
      mode: 'cdf',
    });

    act(() => {
      hook.result.current.loadStatisticsExample('binomial', BINOMIAL_LATEX);
    });

    expect(hook.result.current.statisticsScreen).toBe('binomial');
    expect(hook.result.current.statisticsDraftState).toMatchObject({
      rawLatex: BINOMIAL_LATEX,
      source: 'manual',
      executable: true,
    });
  });

  it('reports an empty Statistics draft before launching the runtime', () => {
    const { activeFieldRef, hook, setDisplayOutcome } = renderStatisticsRuntime();

    act(() => {
      hook.result.current.openStatisticsScreen('binomial');
    });
    act(() => {
      hook.result.current.updateStatisticsDraft('', 'manual', true);
    });
    const field = {
      getValue: () => '',
    } as MathfieldElement;
    hook.result.current.statisticsDraftFieldRef.current = field;
    activeFieldRef.current = field;
    setDisplayOutcome.mockClear();

    act(() => {
      hook.result.current.runStatisticsAction();
    });

    expect(setDisplayOutcome).toHaveBeenCalledWith({
      kind: 'error',
      title: 'Binomial',
      error: 'Enter a Statistics request or use a guided statistics tool before evaluating.',
      warnings: [],
    });
    expect(runStatisticsModeWithOoePilot).not.toHaveBeenCalled();
  });

  it('reserves a Statistics ticket and commits the latest successful runtime payload', async () => {
    const payload = statisticsPayload();
    vi.mocked(runStatisticsModeWithOoePilot).mockResolvedValue(
      statisticsEnvelope('commitAllowed', payload),
    );
    const {
      activeFieldRef,
      commitOutcome,
      hook,
      reserveHistoryTicket,
    } = renderStatisticsRuntime();
    reserveHistoryTicket.mockReturnValue({
      id: 'ticket.statistics.success',
      historyLaunchOrder: 51,
    });

    act(() => {
      hook.result.current.openStatisticsScreen('binomial');
    });
    act(() => {
      hook.result.current.loadStatisticsDraft(BINOMIAL_LATEX, 'manual', true);
    });
    const field = {
      getValue: () => BINOMIAL_LATEX,
    } as MathfieldElement;
    hook.result.current.statisticsDraftFieldRef.current = field;
    activeFieldRef.current = field;

    act(() => {
      hook.result.current.runStatisticsAction();
    });

    await waitFor(() => expect(commitOutcome).toHaveBeenCalledTimes(1));

    const expectedRequest: RunStatisticsRuntimeRequest = {
      inputLatex: BINOMIAL_LATEX,
      screenHint: 'binomial',
      workingSourceHint: 'dataset',
    };
    expect(reserveHistoryTicket).toHaveBeenCalledWith({
      mode: 'statistics',
      inputLatex: BINOMIAL_LATEX,
      capabilityId: 'statistics.evaluate',
      inputRevisionId: buildStatisticsOoeInputRevisionId(expectedRequest),
      workspaceInstance: null,
    });
    expect(runStatisticsModeWithOoePilot).toHaveBeenCalledWith(
      expectedRequest,
      expect.objectContaining({
        launchTicket: {
          id: 'ticket.statistics.success',
          historyLaunchOrder: 51,
        },
      }),
    );
    expect(commitOutcome).toHaveBeenCalledWith(
      payload.outcome,
      BINOMIAL_LATEX,
      'statistics',
      {
        statisticsScreen: 'binomial',
        statisticsSeed: payload.replaySeed,
        historyTicketId: 'ticket.statistics.success',
        historyLaunchOrder: 51,
        suppressDisplayCommit: false,
      },
    );
  });

  it('drops stale Statistics commits without publishing an outcome', async () => {
    vi.mocked(runStatisticsModeWithOoePilot).mockResolvedValue(
      statisticsEnvelope('staleDrop'),
    );
    const { commitOutcome, discardHistoryTicket, hook, reserveHistoryTicket } =
      renderStatisticsRuntime();
    reserveHistoryTicket.mockReturnValue({
      id: 'ticket.statistics.stale',
      historyLaunchOrder: 52,
    });

    act(() => {
      hook.result.current.openStatisticsScreen('binomial');
    });
    act(() => {
      hook.result.current.runStatisticsAction();
    });

    await waitFor(() =>
      expect(discardHistoryTicket).toHaveBeenCalledWith('ticket.statistics.stale'));
    expect(commitOutcome).not.toHaveBeenCalled();
  });

  it('drops cancelled Statistics work and reports the stopped status', async () => {
    vi.mocked(runStatisticsModeWithOoePilot).mockResolvedValue(
      statisticsEnvelope('cancelled'),
    );
    const {
      commitOutcome,
      discardHistoryTicket,
      hook,
      reserveHistoryTicket,
      setRuntimeStatusOverride,
    } = renderStatisticsRuntime();
    reserveHistoryTicket.mockReturnValue({
      id: 'ticket.statistics.cancelled',
      historyLaunchOrder: 53,
    });

    act(() => {
      hook.result.current.openStatisticsScreen('binomial');
    });
    act(() => {
      hook.result.current.runStatisticsAction();
    });

    await waitFor(() =>
      expect(setRuntimeStatusOverride).toHaveBeenCalledWith('Statistics evaluation stopped'));

    expect(discardHistoryTicket).toHaveBeenCalledWith('ticket.statistics.cancelled');
    expect(commitOutcome).not.toHaveBeenCalled();
  });

  it('captures and restores Statistics surface state', () => {
    const { hook } = renderStatisticsRuntime();

    act(() => {
      hook.result.current.openStatisticsScreen('binomial');
      hook.result.current.applyStatisticsRequest({
        kind: 'binomial',
        n: '20',
        p: '0.25',
        x: '4',
        mode: 'cdf',
      });
      hook.result.current.updateStatisticsDataset('2 2 5 8');
    });
    act(() => {
      hook.result.current.importDatasetIntoFrequencyTable();
    });

    const snapshot = hook.result.current.captureStatisticsSurfaceState();

    act(() => {
      hook.result.current.restoreStatisticsSurfaceState(null);
    });

    expect(hook.result.current.statisticsScreen).toBe('home');
    expect(hook.result.current.statisticsWorkingSource).toBe('dataset');
    expect(hook.result.current.binomialState).toMatchObject({
      n: '10',
      p: '0.5',
      x: '3',
      mode: 'pmf',
    });

    act(() => {
      hook.result.current.restoreStatisticsSurfaceState(snapshot);
    });

    expect(hook.result.current.statisticsScreen).toBe('binomial');
    expect(hook.result.current.statisticsWorkingSource).toBe('frequencyTable');
    expect(hook.result.current.binomialState).toMatchObject({
      n: '20',
      p: '0.25',
      x: '4',
      mode: 'cdf',
    });
    expect(hook.result.current.frequencyTable.rows).toEqual([
      { value: '2', frequency: '2' },
      { value: '5', frequency: '1' },
      { value: '8', frequency: '1' },
    ]);
  });

  it('resets current-screen and full Statistics state from the hook', () => {
    const { hook } = renderStatisticsRuntime();

    act(() => {
      hook.result.current.openStatisticsScreen('binomial');
      hook.result.current.applyStatisticsRequest({
        kind: 'binomial',
        n: '20',
        p: '0.25',
        x: '4',
        mode: 'cdf',
      });
    });
    act(() => {
      hook.result.current.resetCurrentStatisticsScreen();
    });

    expect(hook.result.current.binomialState).toMatchObject({
      n: '10',
      p: '0.5',
      x: '3',
      mode: 'pmf',
    });

    act(() => {
      hook.result.current.openStatisticsScreen('normal');
      hook.result.current.applyStatisticsRequest({
        kind: 'normal',
        mean: '10',
        standardDeviation: '2',
        x: '12',
        mode: 'cdf',
      });
    });
    act(() => {
      hook.result.current.resetStatisticsRuntime();
    });

    expect(hook.result.current.statisticsScreen).toBe('home');
    expect(hook.result.current.normalState.mean).toBe('0');
    expect(hook.result.current.statisticsDraftState.rawLatex).toBe('');
  });
});
