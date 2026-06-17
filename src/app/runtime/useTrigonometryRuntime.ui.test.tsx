import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MutableRefObject } from 'react';
import type { MathfieldElement } from 'mathlive';
import type {
  DisplayOutcome,
  ModeId,
} from '../../types/calculator';
import {
  buildTrigonometryOoeInputRevisionId,
  type RunTrigonometryRuntimeRequest,
  type TrigonometryModeRunPayload,
  runTrigonometryModeWithOoePilot,
} from '../../lib/modes/trigonometry';
import type { PendingHistoryTicketReservation } from '../../lib/ooe/job-launch/launch-tickets';
import { useTrigonometryRuntime } from './useTrigonometryRuntime';

vi.mock('../../lib/modes/trigonometry', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/modes/trigonometry')>();
  return {
    ...actual,
    runTrigonometryModeWithOoePilot: vi.fn(),
  };
});

function trigPayload(label = '\\cos\\left(0\\right)'): TrigonometryModeRunPayload {
  return {
    outcome: {
      kind: 'success',
      title: 'Trigonometry',
      exactLatex: label,
      warnings: [],
    } satisfies DisplayOutcome,
    parsed: {
      ok: true,
      request: {
        kind: 'function',
        expressionLatex: label,
      },
      style: 'shorthand',
    },
    replayScreen: 'functions',
    replaySeed: {
      screen: 'functions',
      request: {
        kind: 'function',
        expressionLatex: label,
      },
    },
  };
}

function trigEnvelope(
  legality: 'commitAllowed' | 'staleDrop' | 'cancelled',
  payload = trigPayload(),
) {
  const job = {
    jobId: 'job.trigonometry.evaluate.test',
    planId: 'plan.trigonometry.evaluate',
    capabilityId: 'trigonometry.evaluate',
    hostId: 'trigonometry-worker-runtime',
    nodeId: 'node.trigonometry.evaluate',
    phaseId: 'trigonometry.evaluate',
    inputRevisionId: 'input.trigonometry.evaluate.test',
  };
  return {
    payload,
    ooe: {
      completion: legality === 'cancelled'
        ? {
            kind: 'cancelled',
            reason: 'Trigonometry evaluation stopped before it finished.',
          }
        : undefined,
      commitAssessment: {
        job,
        activeInputRevisionId: legality === 'commitAllowed'
          ? job.inputRevisionId
          : 'input.trigonometry.evaluate.stale',
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
  } as Awaited<ReturnType<typeof runTrigonometryModeWithOoePilot>>;
}

function renderTrigRuntime(
  initialProps: {
    currentMode?: ModeId;
    isLauncherOpen?: boolean;
  } = {},
) {
  const activeFieldRef = { current: null } as MutableRefObject<MathfieldElement | null>;
  const currentModeRef = {
    current: initialProps.currentMode ?? 'trigonometry',
  } as MutableRefObject<ModeId>;
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
      return useTrigonometryRuntime({
        activeFieldRef,
        angleUnit: 'deg',
        commitOutcome,
        currentMode: props.currentMode,
        currentModeRef,
        discardHistoryTicket,
        isLauncherOpen: props.isLauncherOpen,
        openLauncher,
        reserveHistoryTicket,
        setDisplayOutcome,
        setRuntimeStatusOverride,
        startTransition,
      });
    },
    {
      initialProps: {
        currentMode: initialProps.currentMode ?? 'trigonometry',
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
    setDisplayOutcome,
    setRuntimeStatusOverride,
    startTransition,
  };
}

describe('useTrigonometryRuntime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates the shared Trigonometry draft without changing AppMain contracts', () => {
    const { hook } = renderTrigRuntime();

    act(() => {
      hook.result.current.loadTrigDraft('\\cos\\left(0\\right)', 'manual', true);
    });

    expect(hook.result.current.trigDraftState).toMatchObject({
      rawLatex: '\\cos\\left(0\\right)',
      source: 'manual',
      executable: true,
    });
    expect(hook.result.current.trigDraftLatex).toBe('\\cos\\left(0\\right)');
  });

  it('applies guide seeds and example state through the hook boundary', () => {
    const { hook } = renderTrigRuntime();

    act(() => {
      hook.result.current.applyTrigSeed('periodPhase', {
        expressionLatex: '\\tan\\left(x-\\frac{\\pi}{4}\\right)',
        variable: 'x',
      });
    });

    expect(hook.result.current.periodPhaseState.expressionLatex)
      .toBe('\\tan\\left(x-\\frac{\\pi}{4}\\right)');
    expect(hook.result.current.trigDraftState.rawLatex)
      .toContain('\\tan\\left(x-\\frac{\\pi}{4}\\right)');

    act(() => {
      hook.result.current.loadTrigExample(
        'equationSolve',
        '\\cos\\left(x\\right)=0',
        undefined,
      );
    });

    expect(hook.result.current.trigEquationState.equationLatex)
      .toBe('\\cos\\left(x\\right)=0');
  });

  it('reports an empty Trigonometry draft before launching the runtime', () => {
    const { hook, setDisplayOutcome } = renderTrigRuntime();

    act(() => {
      hook.result.current.openTrigScreen('functions');
      hook.result.current.updateTrigDraft('', 'manual', true);
    });

    act(() => {
      hook.result.current.runTrigAction();
    });

    expect(setDisplayOutcome).toHaveBeenCalledWith({
      kind: 'error',
      title: 'Functions',
      error: 'Enter a Trigonometry request or use a guided trig tool before evaluating.',
      warnings: [],
    });
    expect(runTrigonometryModeWithOoePilot).not.toHaveBeenCalled();
  });

  it('reserves a Trigonometry ticket and commits the latest successful runtime payload', async () => {
    const payload = trigPayload('\\cos\\left(0\\right)');
    vi.mocked(runTrigonometryModeWithOoePilot).mockResolvedValue(
      trigEnvelope('commitAllowed', payload),
    );
    const {
      commitOutcome,
      hook,
      reserveHistoryTicket,
    } = renderTrigRuntime();
    reserveHistoryTicket.mockReturnValue({
      id: 'ticket.trig.success',
      historyLaunchOrder: 41,
    });

    act(() => {
      hook.result.current.openTrigScreen('functions');
      hook.result.current.applyTrigSeed('functions', {
        expressionLatex: '\\cos\\left(0\\right)',
      });
    });

    act(() => {
      hook.result.current.runTrigAction();
    });

    await waitFor(() => expect(commitOutcome).toHaveBeenCalledTimes(1));

    const expectedRequest: RunTrigonometryRuntimeRequest = {
      inputLatex: '\\cos\\left(0\\right)',
      screenHint: 'functions',
      angleUnit: 'deg',
      identityTargetForm: 'simplified',
    };
    expect(reserveHistoryTicket).toHaveBeenCalledWith({
      mode: 'trigonometry',
      inputLatex: '\\cos\\left(0\\right)',
      capabilityId: 'trigonometry.evaluate',
      inputRevisionId: buildTrigonometryOoeInputRevisionId(expectedRequest),
    });
    expect(runTrigonometryModeWithOoePilot).toHaveBeenCalledWith(
      expectedRequest,
      expect.objectContaining({
        launchTicket: {
          id: 'ticket.trig.success',
          historyLaunchOrder: 41,
        },
      }),
    );
    expect(commitOutcome).toHaveBeenCalledWith(
      payload.outcome,
      '\\cos\\left(0\\right)',
      'trigonometry',
      {
        trigScreen: 'functions',
        trigSeed: payload.replaySeed,
        historyTicketId: 'ticket.trig.success',
        historyLaunchOrder: 41,
        suppressDisplayCommit: false,
      },
    );
  });

  it('drops stale Trigonometry commits without publishing an outcome', async () => {
    vi.mocked(runTrigonometryModeWithOoePilot).mockResolvedValue(
      trigEnvelope('staleDrop'),
    );
    const { commitOutcome, discardHistoryTicket, hook, reserveHistoryTicket } = renderTrigRuntime();
    reserveHistoryTicket.mockReturnValue({
      id: 'ticket.trig.stale',
      historyLaunchOrder: 42,
    });

    act(() => {
      hook.result.current.openTrigScreen('functions');
    });
    act(() => {
      hook.result.current.runTrigAction();
    });

    await waitFor(() => expect(discardHistoryTicket).toHaveBeenCalledWith('ticket.trig.stale'));
    expect(commitOutcome).not.toHaveBeenCalled();
  });

  it('drops cancelled Trigonometry work and reports the stopped status', async () => {
    vi.mocked(runTrigonometryModeWithOoePilot).mockResolvedValue(
      trigEnvelope('cancelled'),
    );
    const {
      commitOutcome,
      discardHistoryTicket,
      hook,
      reserveHistoryTicket,
      setRuntimeStatusOverride,
    } = renderTrigRuntime();
    reserveHistoryTicket.mockReturnValue({
      id: 'ticket.trig.cancelled',
      historyLaunchOrder: 43,
    });

    act(() => {
      hook.result.current.openTrigScreen('functions');
    });
    act(() => {
      hook.result.current.runTrigAction();
    });

    await waitFor(() =>
      expect(setRuntimeStatusOverride).toHaveBeenCalledWith('Trigonometry evaluation stopped'));

    expect(discardHistoryTicket).toHaveBeenCalledWith('ticket.trig.cancelled');
    expect(commitOutcome).not.toHaveBeenCalled();
  });

  it('captures and restores Trigonometry surface state', () => {
    const { hook } = renderTrigRuntime();

    act(() => {
      hook.result.current.openTrigScreen('periodPhase');
      hook.result.current.applyTrigSeed('periodPhase', {
        expressionLatex: '\\tan\\left(x-\\frac{\\pi}{4}\\right)',
        variable: 'x',
      });
      hook.result.current.setSpecialAnglesExpression('\\sin\\left(45\\right)');
    });

    const snapshot = hook.result.current.captureTrigonometrySurfaceState();

    act(() => {
      hook.result.current.restoreTrigonometrySurfaceState(null);
    });

    expect(hook.result.current.trigScreen).toBe('home');
    expect(hook.result.current.periodPhaseState.expressionLatex)
      .toBe('2\\sin\\left(3x-\\pi\\right)+1');
    expect(hook.result.current.specialAnglesExpression)
      .toBe('\\cos\\left(\\frac{\\pi}{3}\\right)');

    act(() => {
      hook.result.current.restoreTrigonometrySurfaceState(snapshot);
    });

    expect(hook.result.current.trigScreen).toBe('periodPhase');
    expect(hook.result.current.periodPhaseState.expressionLatex)
      .toBe('\\tan\\left(x-\\frac{\\pi}{4}\\right)');
    expect(hook.result.current.specialAnglesExpression).toBe('\\sin\\left(45\\right)');
    expect(hook.result.current.trigDraftState.rawLatex)
      .toContain('\\tan\\left(x-\\frac{\\pi}{4}\\right)');
  });

  it('resets current-screen and full Trigonometry state from the hook', () => {
    const { hook } = renderTrigRuntime();

    act(() => {
      hook.result.current.openTrigScreen('functions');
      hook.result.current.applyTrigSeed('functions', {
        expressionLatex: '\\cos\\left(0\\right)',
      });
    });
    act(() => {
      hook.result.current.resetCurrentTrigScreen();
    });

    expect(hook.result.current.trigFunctionState.expressionLatex)
      .toBe('\\sin\\left(30\\right)');

    act(() => {
      hook.result.current.openTrigScreen('periodPhase');
      hook.result.current.applyTrigSeed('periodPhase', {
        expressionLatex: '\\tan\\left(x-\\frac{\\pi}{4}\\right)',
        variable: 'x',
      });
    });
    act(() => {
      hook.result.current.resetTrigonometryRuntime();
    });

    expect(hook.result.current.trigScreen).toBe('home');
    expect(hook.result.current.periodPhaseState.expressionLatex)
      .toBe('2\\sin\\left(3x-\\pi\\right)+1');
    expect(hook.result.current.trigDraftState.rawLatex).toBe('');
  });
});
