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

const DERIVATIVE_LATEX = '\\frac{d}{dt}\\left(t^2\\right)';

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
      hook.result.current.openCalculusScreen('derivative');
    });
    act(() => {
      hook.result.current.runCalculusAction();
    });

    expect(setDisplayOutcome).toHaveBeenCalledWith({
      kind: 'error',
      title: 'Derivative',
      error: 'Fill the derivative inputs before evaluating.',
      warnings: [],
    });
    expect(runCalculusModeWithOoePilot).not.toHaveBeenCalled();
  });

  it('loads seeds and canonical Calculus replay through the hook boundary', () => {
    const { hook } = renderCalculusRuntime();

    act(() => {
      hook.result.current.openCalculusScreen('derivative');
      hook.result.current.applyCalculusSeed('derivative', { bodyLatex: 't^2', variable: 't' });
    });

    expect(hook.result.current.calculusScreen).toBe('derivative');
    expect(hook.result.current.derivativeWorkbench).toMatchObject({ bodyLatex: 't^2', variable: 't' });
    expect(hook.result.current.calculusMainEditorActive).toBe(true);
    expect(hook.result.current.calculusMainEditorLatex).toBe('t^2');
    expect(hook.result.current.calculusMainEditorVariable).toBe('t');
    expect(hook.result.current.calculusWorkbenchExpression).toBe(DERIVATIVE_LATEX);

    act(() => {
      hook.result.current.setCalculusMainEditorLatex('sin(t)');
    });

    expect(hook.result.current.derivativeWorkbench).toMatchObject({ bodyLatex: 'sin(t)', variable: 't' });
    expect(hook.result.current.calculusMainEditorLatex).toBe('sin(t)');
    expect(hook.result.current.calculusWorkbenchExpression).toBe(
      '\\frac{d}{dt}\\left(sin(t)\\right)',
    );

    const replayEntry = {
      id: 'history.calculus.replay',
      mode: 'calculus',
      inputLatex: '\\left.\\frac{d}{dt}\\left(t^2\\right)\\right|_{t=3}',
      resultLatex: '6',
      calculusScreen: 'derivativePoint',
      calculusSeed: {
        bodyLatex: 't^2',
        point: '3',
        variable: 't',
      },
      timestamp: '2026-06-13T00:00:00.000Z',
    } satisfies HistoryEntry;

    act(() => {
      hook.result.current.restoreCalculusHistoryEntry(replayEntry);
    });

    expect(hook.result.current.calculusScreen).toBe('derivativePoint');
    expect(hook.result.current.derivativePointWorkbench).toMatchObject({
      bodyLatex: 't^2',
      point: '3',
      variable: 't',
    });
    expect(hook.result.current.calculusMainEditorActive).toBe(true);
    expect(hook.result.current.calculusMainEditorLatex).toBe('t^2');
    expect(hook.result.current.calculusMainEditorVariable).toBe('t');
    expect(hook.result.current.calculusWorkbenchExpression).toBe(
      '\\left.\\frac{d}{dt}\\left(t^2\\right)\\right|_{t=3}',
    );
  });

  it('captures and restores Calculus surface state for workspace instances', () => {
    const { hook } = renderCalculusRuntime();

    act(() => {
      hook.result.current.openCalculusScreen('finiteLimit');
      hook.result.current.setCalculusFiniteLimit({
        bodyLatex: '\\frac{\\sin x}{x}',
        target: '0',
        direction: 'two-sided',
      });
      hook.result.current.setDerivativeWorkbench({ bodyLatex: 't^4', variable: 't' });
    });

    const snapshot = hook.result.current.captureCalculusSurfaceState();

    act(() => {
      hook.result.current.restoreCalculusSurfaceState(null);
    });
    expect(hook.result.current.calculusScreen).toBe('home');
    expect(hook.result.current.derivativeWorkbench.bodyLatex).toBe('');

    act(() => {
      hook.result.current.restoreCalculusSurfaceState(snapshot);
    });
    expect(hook.result.current.calculusScreen).toBe('finiteLimit');
    expect(hook.result.current.calculusFiniteLimit).toMatchObject({
      bodyLatex: '\\frac{\\sin x}{x}',
      target: '0',
      direction: 'two-sided',
    });
    expect(hook.result.current.derivativeWorkbench).toMatchObject({ bodyLatex: 't^4', variable: 't' });
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
      hook.result.current.openCalculusScreen('derivative');
      hook.result.current.applyCalculusSeed('derivative', { bodyLatex: 't^2', variable: 't' });
    });
    act(() => {
      hook.result.current.runCalculusAction();
    });

    await waitFor(() => expect(commitOutcome).toHaveBeenCalledTimes(1));

    const request = vi.mocked(runCalculusModeWithOoePilot).mock.calls[0][0];
    expect(reserveHistoryTicket).toHaveBeenCalledWith({
      mode: 'calculus',
      inputLatex: DERIVATIVE_LATEX,
      capabilityId: 'calculus.evaluate',
      inputRevisionId: buildCalculusOoeInputRevisionId(request, DERIVATIVE_LATEX),
      workspaceInstance: null,
    });
    expect(runCalculusModeWithOoePilot).toHaveBeenCalledWith(
      expect.objectContaining({
        screen: 'derivative',
        derivative: { bodyLatex: 't^2', variable: 't' },
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
        calculusSeed: { bodyLatex: 't^2', variable: 't' },
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
      hook.result.current.openCalculusScreen('derivative');
      hook.result.current.applyCalculusSeed('derivative', { bodyLatex: 'x' });
    });
    act(() => {
      hook.result.current.runCalculusAction();
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
      hook.result.current.openCalculusScreen('derivative');
      hook.result.current.applyCalculusSeed('derivative', { bodyLatex: 'x' });
    });
    act(() => {
      hook.result.current.runCalculusAction();
    });

    await waitFor(() =>
      expect(setRuntimeStatusOverride).toHaveBeenCalledWith('Calculus evaluation stopped'));

    expect(discardHistoryTicket).toHaveBeenCalledWith('ticket.calculus.cancelled');
    expect(commitOutcome).not.toHaveBeenCalled();
  });

  it('resets current-screen and full Calculus state from the hook', () => {
    const { hook } = renderCalculusRuntime();

    act(() => {
      hook.result.current.openCalculusScreen('derivative');
      hook.result.current.applyCalculusSeed('derivative', { bodyLatex: 'x^3' });
    });
    act(() => {
      hook.result.current.resetCurrentCalculusScreen();
    });

    expect(hook.result.current.derivativeWorkbench.bodyLatex).toBe('');

    act(() => {
      hook.result.current.openCalculusScreen('taylor');
      hook.result.current.applyCalculusSeed('taylor', {
        bodyLatex: '\\sin x',
        center: '0',
        order: 6,
      });
    });
    act(() => {
      hook.result.current.resetCalculusRuntime();
    });

    expect(hook.result.current.calculusScreen).toBe('home');
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

    expect(hook.result.current.calculusScreen).toBe('finiteLimit');
    expect(hook.result.current.calculusFiniteLimit).toMatchObject({
      bodyLatex: '\\frac{\\sin x}{x}',
      target: '0',
      direction: 'two-sided',
    });
  });

  it('roundtrips integral integrationVariable through preview, history context, and runtime request', async () => {
    vi.mocked(runCalculusModeWithOoePilot).mockResolvedValue(
      calculusEnvelope('commitAllowed'),
    );
    const { hook } = renderCalculusRuntime();

    act(() => {
      hook.result.current.openCalculusScreen('indefiniteIntegral');
      hook.result.current.applyCalculusSeed('indefiniteIntegral', {
        bodyLatex: 't^2',
        integrationVariable: 't',
      });
    });

    expect(hook.result.current.calculusWorkbenchExpression).toBe('\\int t^2\\,dt');
    expect(hook.result.current.currentCalculusHistoryContext()).toEqual({
      calculusScreen: 'indefiniteIntegral',
      calculusSeed: {
        bodyLatex: 't^2',
        integrationVariable: 't',
      },
    });

    act(() => {
      hook.result.current.runCalculusAction();
    });

    await waitFor(() => expect(runCalculusModeWithOoePilot).toHaveBeenCalledTimes(1));
    expect(vi.mocked(runCalculusModeWithOoePilot).mock.calls[0][0]).toEqual(
      expect.objectContaining({
        screen: 'indefiniteIntegral',
        indefiniteIntegral: {
          bodyLatex: 't^2',
          integrationVariable: 't',
        },
      }),
    );

    const replayEntry = {
      id: 'history.calculus.integral-variable',
      mode: 'calculus',
      inputLatex: '\\int y^2\\,dy',
      resultLatex: '\\frac{y^3}{3}',
      calculusScreen: 'indefiniteIntegral',
      calculusSeed: {
        bodyLatex: 'y^2',
        integrationVariable: 'y',
      },
      timestamp: '2026-06-27T00:00:00.000Z',
    } satisfies HistoryEntry;

    act(() => {
      hook.result.current.restoreCalculusHistoryEntry(replayEntry);
    });

    expect(hook.result.current.calculusScreen).toBe('indefiniteIntegral');
    expect(hook.result.current.calculusIndefiniteIntegral).toMatchObject({
      bodyLatex: 'y^2',
      integrationVariable: 'y',
    });
    expect(hook.result.current.calculusWorkbenchExpression).toBe('\\int y^2\\,dy');
  });

  it('roundtrips Laplace state through main-editor Calculus runtime state', () => {
    const { hook } = renderCalculusRuntime();
    const entry = {
      id: 'history.calculus.laplace',
      mode: 'calculus',
      inputLatex: '\\mathcal{L}\\left\\{t^2\\right\\}\\left(s\\right)',
      resultLatex: '\\frac{2}{s^3}',
      calculusScreen: 'laplace',
      calculusSeed: {
        bodyLatex: 't^2',
      },
      timestamp: '2026-06-27T00:00:00.000Z',
    } satisfies HistoryEntry;

    act(() => {
      hook.result.current.restoreCalculusHistoryEntry(entry);
    });

    expect(hook.result.current.calculusScreen).toBe('laplace');
    expect(hook.result.current.laplaceState).toEqual({ bodyLatex: 't^2' });
    expect(hook.result.current.calculusMainEditorActive).toBe(true);
    expect(hook.result.current.calculusMainEditorLatex).toBe('t^2');
    expect(hook.result.current.calculusWorkbenchExpression).toBe(
      '\\mathcal{L}\\left\\{t^2\\right\\}\\left(s\\right)',
    );
    expect(hook.result.current.currentCalculusHistoryContext()).toEqual({
      calculusScreen: 'laplace',
      calculusSeed: { bodyLatex: 't^2' },
    });
  });

  it('roundtrips partial derivatives through main-editor Calculus runtime state', () => {
    const { hook } = renderCalculusRuntime();
    const entry = {
      id: 'history.calculus.partial',
      mode: 'calculus',
      inputLatex: '\\frac{\\partial}{\\partial y}\\left(x^2y+y^3\\right)',
      resultLatex: 'x^2+3y^2',
      calculusScreen: 'partialDerivative',
      calculusSeed: {
        bodyLatex: 'x^2y+y^3',
        variable: 'y',
      },
      timestamp: '2026-06-29T00:00:00.000Z',
    } satisfies HistoryEntry;

    act(() => {
      hook.result.current.restoreCalculusHistoryEntry(entry);
    });

    expect(hook.result.current.calculusScreen).toBe('partialDerivative');
    expect(hook.result.current.partialDerivativeState).toEqual({
      bodyLatex: 'x^2y+y^3',
      variable: 'y',
    });
    expect(hook.result.current.calculusMainEditorActive).toBe(true);
    expect(hook.result.current.calculusMainEditorLatex).toBe('x^2y+y^3');
    expect(hook.result.current.calculusMainEditorVariable).toBe('y');
    expect(hook.result.current.calculusWorkbenchExpression).toBe(
      '\\frac{\\partial}{\\partial y}\\left(x^2y+y^3\\right)',
    );

    act(() => {
      hook.result.current.setCalculusMainEditorLatex('xy+y^2');
    });

    expect(hook.result.current.partialDerivativeState).toEqual({
      bodyLatex: 'xy+y^2',
      variable: 'y',
    });
    expect(hook.result.current.currentCalculusHistoryContext()).toEqual({
      calculusScreen: 'partialDerivative',
      calculusSeed: {
        bodyLatex: 'xy+y^2',
        variable: 'y',
      },
    });
  });
});
