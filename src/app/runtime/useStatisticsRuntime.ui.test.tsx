import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RefObject } from 'react';
import type { MathfieldElement } from 'mathlive';
import type {
  ResultProducerDraft,
  ModeId,
} from '../../types/calculator';
import {
  buildStatisticsOoeInputRevisionId,
  type RunStatisticsRuntimeRequest,
  type StatisticsModeRunPayload,
  runStatisticsModeWithOoePilot,
} from '../../lib/modes/statistics';
import { createCanonicalRuntimeError } from '../../lib/result-contract';
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
    } satisfies ResultProducerDraft,
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
  const activeFieldRef = { current: null } as RefObject<MathfieldElement | null>;
  const currentModeRef = {
    current: initialProps.currentMode ?? 'statistics',
  } as RefObject<ModeId>;
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

  it('preserves in-progress dataset delimiters while deriving parsed values', () => {
    const { hook } = renderStatisticsRuntime();

    act(() => {
      hook.result.current.updateStatisticsDataset('12,');
    });

    expect(hook.result.current.statisticsDatasetText).toBe('12,');
    expect(hook.result.current.statsDataset.values).toEqual(['12']);

    const snapshot = hook.result.current.captureStatisticsSurfaceState();
    act(() => {
      hook.result.current.updateStatisticsDataset('99');
      hook.result.current.restoreStatisticsSurfaceState(snapshot);
    });

    expect(hook.result.current.statisticsDatasetText).toBe('12,');
    expect(hook.result.current.statsDataset.values).toEqual(['12']);
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
    expect(hook.result.current.statisticsInputMode).toBe('expression');
  });

  it('seeds Expression once and preserves its draft across section changes', () => {
    const { hook } = renderStatisticsRuntime();

    expect(hook.result.current.statisticsInputMode).toBe('guided');
    expect(hook.result.current.statisticsExpressionDraftInitialized).toBe(false);
    expect(hook.result.current.statisticsDraftLatex).toBe('');

    act(() => {
      hook.result.current.changeStatisticsInputMode('expression');
    });

    expect(hook.result.current.statisticsInputMode).toBe('expression');
    expect(hook.result.current.statisticsDraftLatex).toContain('descriptive(values=');

    act(() => {
      hook.result.current.updateStatisticsDraft('normal(mean=3,sd=2,event=atLeast,x=5)', 'manual', true);
      hook.result.current.openStatisticsSection('probability');
    });

    expect(hook.result.current.statisticsDraftLatex)
      .toBe('normal(mean=3,sd=2,event=atLeast,x=5)');
  });

  it('imports a valid Expression into Guided and activates its section', () => {
    const { hook } = renderStatisticsRuntime();

    act(() => {
      hook.result.current.loadStatisticsDraft(
        'meanInference(values={12,15,18},mode=test,level=95%,mu0=14,alternative=greater)',
        'manual',
        false,
      );
    });
    act(() => {
      hook.result.current.changeStatisticsInputMode('guided');
    });

    expect(hook.result.current.statisticsInputMode).toBe('guided');
    expect(hook.result.current.statisticsSection).toBe('inference');
    expect(hook.result.current.meanInferenceState).toMatchObject({
      mode: 'test',
      level: '95%',
      mu0: '14',
      alternative: 'greater',
    });
    expect(hook.result.current.statsDataset.values).toEqual(['12', '15', '18']);
    expect(hook.result.current.statisticsExpressionError).toBeNull();
  });

  it('keeps an invalid Expression intact and refuses the Guided switch', () => {
    const { hook } = renderStatisticsRuntime();

    act(() => {
      hook.result.current.loadStatisticsDraft('normal(mean=0,sd=1,event=between)', 'manual', false);
    });
    act(() => {
      hook.result.current.changeStatisticsInputMode('guided');
    });

    expect(hook.result.current.statisticsInputMode).toBe('expression');
    expect(hook.result.current.statisticsDraftLatex)
      .toBe('normal(mean=0,sd=1,event=between)');
    expect(hook.result.current.statisticsExpressionError)
      .toBe('event=between needs lower=... and upper=....');
  });

  it('keeps one paired dataset while switching relationship analyses', () => {
    const { hook } = renderStatisticsRuntime();

    act(() => {
      hook.result.current.openStatisticsScreen('regression');
      hook.result.current.updateRegressionPointDraft('regression', 0, 'x', '12');
      hook.result.current.updateRegressionPointDraft('regression', 1, 'y', '');
    });

    expect(hook.result.current.relationshipsState).toMatchObject({
      analysis: 'regression',
      points: [
        { x: '12', y: '2' },
        { x: '2', y: '' },
        { x: '3', y: '6' },
      ],
    });

    act(() => {
      hook.result.current.openStatisticsScreen('correlation');
    });

    expect(hook.result.current.relationshipsState.analysis).toBe('correlation');
    expect(hook.result.current.relationshipsState.points[1]).toEqual({ x: '2', y: '' });
    expect(hook.result.current.statisticsWorkbenchExpression).toContain('correlation(points=');

    act(() => {
      hook.result.current.applyStatisticsRequest({
        kind: 'regression',
        points: [{ x: '5', y: '8' }, { x: '7', y: '13' }],
      });
    });

    expect(hook.result.current.relationshipsState).toEqual({
      analysis: 'regression',
      points: [{ x: '5', y: '8' }, { x: '7', y: '13' }],
    });
    expect(hook.result.current.captureStatisticsSurfaceState().relationshipsState)
      .toEqual(hook.result.current.relationshipsState);
  });

  it('reports an empty Statistics draft before launching the runtime', () => {
    const { activeFieldRef, hook, setDisplayOutcome } = renderStatisticsRuntime();

    act(() => {
      hook.result.current.openStatisticsScreen('binomial');
    });
    act(() => {
      hook.result.current.loadStatisticsDraft('', 'manual', false);
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

    expect(setDisplayOutcome).toHaveBeenCalledWith(createCanonicalRuntimeError(
      'Binomial',
      'Enter a Statistics request or use a guided statistics tool before evaluating.',
    ));
    expect(runStatisticsModeWithOoePilot).not.toHaveBeenCalled();
  });

  it('reserves a Statistics ticket and commits the latest successful runtime payload', async () => {
    const payload = statisticsPayload();
    vi.mocked(runStatisticsModeWithOoePilot).mockResolvedValue(
      statisticsEnvelope('commitAllowed', payload),
    );
    const {
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
        suppressWorkspaceDisplayCommit: false,
      },
    );
  });

  it('caches a hidden completion in its originating section without replacing the visible section', async () => {
    let resolveRun: ((value: ReturnType<typeof statisticsEnvelope>) => void) | undefined;
    vi.mocked(runStatisticsModeWithOoePilot).mockImplementation(() => new Promise((resolve) => {
      resolveRun = resolve;
    }));
    const { commitOutcome, hook, setDisplayOutcome } = renderStatisticsRuntime();

    act(() => {
      hook.result.current.openStatisticsScreen('binomial');
    });
    act(() => {
      hook.result.current.runStatisticsAction();
    });
    act(() => {
      hook.result.current.openStatisticsSection('inference');
    });
    expect(hook.result.current.statisticsSection).toBe('inference');

    await waitFor(() => expect(runStatisticsModeWithOoePilot).toHaveBeenCalledTimes(1));
    await act(async () => {
      resolveRun?.(statisticsEnvelope('commitAllowed'));
    });
    await waitFor(() => expect(commitOutcome).toHaveBeenCalledTimes(1));
    expect(commitOutcome).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.any(String),
      'statistics',
      expect.objectContaining({
        suppressDisplayCommit: true,
        suppressWorkspaceDisplayCommit: true,
      }),
    );
    expect(hook.result.current.activeStatisticsSectionResult).toBeNull();

    setDisplayOutcome.mockClear();
    act(() => {
      hook.result.current.openStatisticsSection('probability');
    });
    expect(setDisplayOutcome).toHaveBeenCalledWith(statisticsPayload().outcome);
    expect(hook.result.current.activeStatisticsSectionResult?.outcome).toEqual(
      statisticsPayload().outcome,
    );
  });

  it('clears only the active section and resets shared data only from Data & Summary', () => {
    const { hook } = renderStatisticsRuntime();

    act(() => {
      hook.result.current.updateStatisticsDataset('4, 8, 15, 16, 23, 42');
      hook.result.current.openStatisticsSection('inference');
    });
    act(() => {
      hook.result.current.resetCurrentStatisticsScreen();
    });
    expect(hook.result.current.statsDataset.values).toEqual(['4', '8', '15', '16', '23', '42']);

    act(() => {
      hook.result.current.openStatisticsSection('dataSummary');
    });
    act(() => {
      hook.result.current.resetCurrentStatisticsScreen();
    });
    expect(hook.result.current.statsDataset.values).toEqual(['12', '15', '15', '18', '20']);
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

    expect(hook.result.current.statisticsScreen).toBe('descriptive');
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

    expect(hook.result.current.statisticsScreen).toBe('descriptive');
    expect(hook.result.current.normalState.mean).toBe('0');
    expect(hook.result.current.statisticsInputMode).toBe('guided');
    expect(hook.result.current.statisticsExpressionDraftInitialized).toBe(false);
    expect(hook.result.current.statisticsDraftState.rawLatex).toBe('');
  });
});
