import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MutableRefObject } from 'react';
import type {
  DisplayOutcome,
  HistoryEntry,
  ModeId,
} from '../../types/calculator';
import {
  buildCalculusOoeInputRevisionId,
  runCalculusModeWithOoePilot,
} from '../../lib/modes/calculus';
import type { PendingHistoryTicketReservation } from '../../lib/ooe/job-launch/launch-tickets';
import { useCalculusRuntime } from './useCalculusRuntime';

vi.mock('../../lib/modes/calculus', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/modes/calculus')>();
  return {
    ...actual,
    runCalculusModeWithOoePilot: vi.fn(),
  };
});

const DERIVATIVE_LATEX = '\\frac{d}{dx}\\left(x^2\\right)';

function calculusPayload(): DisplayOutcome {
  return {
    kind: 'success',
    title: 'Derivative',
    exactLatex: '2x',
    warnings: [],
  };
}

function calculusEnvelope(
  legality: 'commitAllowed' | 'staleDrop' | 'cancelled',
  payload = calculusPayload(),
) {
  const job = {
    jobId: 'job.calculus.evaluate.test',
    planId: 'plan.calculus.evaluate',
    capabilityId: 'calculus.evaluate',
    hostId: 'calculus-worker-runtime',
    nodeId: 'node.calculus.evaluate',
    phaseId: 'calculus.evaluate',
    inputRevisionId: 'input.calculus.evaluate.test',
  };
  return {
    payload,
    ooe: {
      completion: legality === 'cancelled'
        ? {
            kind: 'cancelled',
            reason: 'Calculus evaluation stopped before it finished.',
          }
        : undefined,
      commitAssessment: {
        job,
        activeInputRevisionId: legality === 'commitAllowed'
          ? job.inputRevisionId
          : 'input.calculus.evaluate.stale',
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
  } as Awaited<ReturnType<typeof runCalculusModeWithOoePilot>>;
}

function renderCalculusRuntime(
  initialProps: {
    currentMode?: ModeId;
    isLauncherOpen?: boolean;
  } = {},
) {
  const currentModeRef = {
    current: initialProps.currentMode ?? 'calculus',
  } as MutableRefObject<ModeId>;
  const clearReplayVariableSubstitutions = vi.fn();
  const commitOutcome = vi.fn();
  const discardHistoryTicket = vi.fn();
  const openLauncher = vi.fn();
  const reserveHistoryTicket = vi.fn((): PendingHistoryTicketReservation | null => null);
  const setDisplayOutcome = vi.fn();
  const setRuntimeStatusOverride = vi.fn();
  const startTransition = vi.fn((callback: () => void) => callback());

  const hook = renderHook(
    (props: { currentMode: ModeId; isLauncherOpen: boolean }) => {
      currentModeRef.current = props.currentMode;
      return useCalculusRuntime({
        ansLatex: '0',
        clearReplayVariableSubstitutions,
        commitOutcome,
        currentMode: props.currentMode,
        currentModeRef,
        discardHistoryTicket,
        isLauncherOpen: props.isLauncherOpen,
        openLauncher,
        replayVariableSubstitutions: null,
        reserveHistoryTicket,
        settings: {
          angleUnit: 'rad',
          outputStyle: 'exact',
        },
        setDisplayOutcome,
        setRuntimeStatusOverride,
        startTransition,
        storedVariables: [],
      });
    },
    {
      initialProps: {
        currentMode: initialProps.currentMode ?? 'calculus',
        isLauncherOpen: initialProps.isLauncherOpen ?? false,
      },
    },
  );

  return {
    clearReplayVariableSubstitutions,
    commitOutcome,
    currentModeRef,
    discardHistoryTicket,
    hook,
    openLauncher,
    reserveHistoryTicket,
    setDisplayOutcome,
    setRuntimeStatusOverride,
    startTransition,
  };
}

describe('useCalculusRuntime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports empty Calculus input before launching the runtime', () => {
    const { hook, setDisplayOutcome } = renderCalculusRuntime();

    act(() => {
      hook.result.current.openAdvancedCalcScreen('derivative');
    });
    act(() => {
      hook.result.current.runAdvancedCalcAction();
    });

    expect(setDisplayOutcome).toHaveBeenCalledWith({
      kind: 'error',
      title: 'Derivative',
      error: 'Fill the derivative inputs before evaluating.',
      warnings: [],
    });
    expect(runCalculusModeWithOoePilot).not.toHaveBeenCalled();
  });

  it('loads seeds and legacy advancedCalculus replay through the hook boundary', () => {
    const { hook } = renderCalculusRuntime();

    act(() => {
      hook.result.current.openAdvancedCalcScreen('derivative');
      hook.result.current.applyAdvancedCalcSeed('derivative', { bodyLatex: 'x^2' });
    });

    expect(hook.result.current.advancedCalcScreen).toBe('derivative');
    expect(hook.result.current.derivativeWorkbench.bodyLatex).toBe('x^2');
    expect(hook.result.current.advancedCalcWorkbenchExpression).toBe(DERIVATIVE_LATEX);

    const legacyEntry = {
      id: 'history.advanced-calculus.legacy',
      mode: 'advancedCalculus',
      inputLatex: '\\left.\\frac{d}{dx}\\left(x^2\\right)\\right|_{x=3}',
      resultLatex: '6',
      advancedCalcScreen: 'derivativePoint',
      advancedCalcSeed: {
        bodyLatex: 'x^2',
        point: '3',
      },
      timestamp: '2026-06-13T00:00:00.000Z',
    } satisfies HistoryEntry;

    act(() => {
      hook.result.current.restoreCalculusHistoryEntry(legacyEntry);
    });

    expect(hook.result.current.advancedCalcScreen).toBe('derivativePoint');
    expect(hook.result.current.derivativePointWorkbench).toMatchObject({
      bodyLatex: 'x^2',
      point: '3',
    });
  });

  it('reserves a Calculus ticket and commits the latest successful runtime payload', async () => {
    const payload = calculusPayload();
    vi.mocked(runCalculusModeWithOoePilot).mockResolvedValue(
      calculusEnvelope('commitAllowed', payload),
    );
    const {
      clearReplayVariableSubstitutions,
      commitOutcome,
      hook,
      reserveHistoryTicket,
    } = renderCalculusRuntime();
    reserveHistoryTicket.mockReturnValue({
      id: 'ticket.calculus.success',
      historyLaunchOrder: 71,
    });

    act(() => {
      hook.result.current.openAdvancedCalcScreen('derivative');
      hook.result.current.applyAdvancedCalcSeed('derivative', { bodyLatex: 'x^2' });
    });
    act(() => {
      hook.result.current.runAdvancedCalcAction();
    });

    await waitFor(() => expect(commitOutcome).toHaveBeenCalledTimes(1));

    const request = vi.mocked(runCalculusModeWithOoePilot).mock.calls[0][0];
    expect(reserveHistoryTicket).toHaveBeenCalledWith({
      mode: 'calculus',
      inputLatex: DERIVATIVE_LATEX,
      capabilityId: 'calculus.evaluate',
      inputRevisionId: buildCalculusOoeInputRevisionId(request, DERIVATIVE_LATEX),
    });
    expect(runCalculusModeWithOoePilot).toHaveBeenCalledWith(
      expect.objectContaining({
        screen: 'derivative',
        derivative: { bodyLatex: 'x^2' },
      }),
      expect.objectContaining({
        generatedLatex: DERIVATIVE_LATEX,
        launchTicket: {
          id: 'ticket.calculus.success',
          historyLaunchOrder: 71,
        },
      }),
    );
    expect(commitOutcome).toHaveBeenCalledWith(
      payload,
      DERIVATIVE_LATEX,
      'calculus',
      {
        calculusScreen: 'derivative',
        calculusSeed: { bodyLatex: 'x^2' },
        historyTicketId: 'ticket.calculus.success',
        historyLaunchOrder: 71,
        suppressDisplayCommit: false,
      },
    );
    expect(clearReplayVariableSubstitutions).toHaveBeenCalledTimes(1);
  });

  it('drops stale Calculus commits without publishing an outcome', async () => {
    vi.mocked(runCalculusModeWithOoePilot).mockResolvedValue(
      calculusEnvelope('staleDrop'),
    );
    const {
      clearReplayVariableSubstitutions,
      commitOutcome,
      discardHistoryTicket,
      hook,
      reserveHistoryTicket,
    } = renderCalculusRuntime();
    reserveHistoryTicket.mockReturnValue({
      id: 'ticket.calculus.stale',
      historyLaunchOrder: 72,
    });

    act(() => {
      hook.result.current.openAdvancedCalcScreen('derivative');
      hook.result.current.applyAdvancedCalcSeed('derivative', { bodyLatex: 'x' });
    });
    act(() => {
      hook.result.current.runAdvancedCalcAction();
    });

    await waitFor(() =>
      expect(discardHistoryTicket).toHaveBeenCalledWith('ticket.calculus.stale'));
    expect(commitOutcome).not.toHaveBeenCalled();
    expect(clearReplayVariableSubstitutions).not.toHaveBeenCalled();
  });

  it('drops cancelled Calculus work and reports the stopped status', async () => {
    vi.mocked(runCalculusModeWithOoePilot).mockResolvedValue(
      calculusEnvelope('cancelled'),
    );
    const {
      commitOutcome,
      discardHistoryTicket,
      hook,
      reserveHistoryTicket,
      setRuntimeStatusOverride,
    } = renderCalculusRuntime();
    reserveHistoryTicket.mockReturnValue({
      id: 'ticket.calculus.cancelled',
      historyLaunchOrder: 73,
    });

    act(() => {
      hook.result.current.openAdvancedCalcScreen('derivative');
      hook.result.current.applyAdvancedCalcSeed('derivative', { bodyLatex: 'x' });
    });
    act(() => {
      hook.result.current.runAdvancedCalcAction();
    });

    await waitFor(() =>
      expect(setRuntimeStatusOverride).toHaveBeenCalledWith('Calculus evaluation stopped'));

    expect(discardHistoryTicket).toHaveBeenCalledWith('ticket.calculus.cancelled');
    expect(commitOutcome).not.toHaveBeenCalled();
  });

  it('resets current-screen and full Calculus state from the hook', () => {
    const { hook } = renderCalculusRuntime();

    act(() => {
      hook.result.current.openAdvancedCalcScreen('derivative');
      hook.result.current.applyAdvancedCalcSeed('derivative', { bodyLatex: 'x^3' });
    });
    act(() => {
      hook.result.current.resetCurrentCalculusScreen();
    });

    expect(hook.result.current.derivativeWorkbench.bodyLatex).toBe('');

    act(() => {
      hook.result.current.openAdvancedCalcScreen('taylor');
      hook.result.current.applyAdvancedCalcSeed('taylor', {
        bodyLatex: '\\sin x',
        center: '0',
        order: 6,
      });
    });
    act(() => {
      hook.result.current.resetCalculusRuntime();
    });

    expect(hook.result.current.advancedCalcScreen).toBe('home');
    expect(hook.result.current.taylorState).toMatchObject({
      bodyLatex: '',
      center: '1',
      order: 4,
    });
  });

  it('restores canonical Calculus history entries through calculusSeed', () => {
    const { hook } = renderCalculusRuntime();
    const entry = {
      id: 'history.calculus.canonical',
      mode: 'calculus',
      inputLatex: '\\lim_{x\\to 0}\\frac{\\sin x}{x}',
      resultLatex: '1',
      calculusScreen: 'finiteLimit',
      calculusSeed: {
        bodyLatex: '\\frac{\\sin x}{x}',
        target: '0',
        direction: 'two-sided',
      },
      timestamp: '2026-06-13T00:00:00.000Z',
    } satisfies HistoryEntry;

    act(() => {
      hook.result.current.restoreCalculusHistoryEntry(entry);
    });

    expect(hook.result.current.advancedCalcScreen).toBe('finiteLimit');
    expect(hook.result.current.advancedFiniteLimit).toMatchObject({
      bodyLatex: '\\frac{\\sin x}{x}',
      target: '0',
      direction: 'two-sided',
    });
  });
});
