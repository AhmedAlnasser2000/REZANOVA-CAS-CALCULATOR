import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RefObject } from 'react';
import type { MathfieldElement } from 'mathlive';
import type {
  DisplayOutcome,
  ModeId,
} from '../../types/calculator';
import {
  buildGeometryOoeInputRevisionId,
  type GeometryModeRunPayload,
  type RunGeometryRuntimeRequest,
  runGeometryModeWithOoePilot,
} from '../../lib/modes/geometry';
import type { PendingHistoryTicketReservation } from '../../lib/ooe/job-launch/launch-tickets';
import { useGeometryRuntime } from './useGeometryRuntime';

vi.mock('../../lib/modes/geometry', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/modes/geometry')>();
  return {
    ...actual,
    runGeometryModeWithOoePilot: vi.fn(),
  };
});

const SQUARE_LATEX = 'square(side=2+3)';

function geometryPayload(): GeometryModeRunPayload {
  return {
    outcome: {
      kind: 'success',
      title: 'Geometry',
      exactLatex: 'A=25\\quad P=20',
      warnings: [],
    } satisfies DisplayOutcome,
    parsed: {
      ok: true,
      request: {
        kind: 'square',
        sideLatex: '2+3',
      },
      style: 'structured',
    },
    replayScreen: 'square',
    replaySeed: {
      screen: 'square',
      request: {
        kind: 'square',
        sideLatex: '2+3',
      },
    },
  };
}

function geometryEnvelope(
  legality: 'commitAllowed' | 'staleDrop' | 'cancelled',
  payload = geometryPayload(),
) {
  const job = {
    jobId: 'job.geometry.evaluate.test',
    planId: 'plan.geometry.evaluate',
    capabilityId: 'geometry.evaluate',
    hostId: 'geometry-worker-runtime',
    nodeId: 'node.geometry.evaluate',
    phaseId: 'geometry.evaluate',
    inputRevisionId: 'input.geometry.evaluate.test',
  };
  return {
    payload,
    ooe: {
      completion: legality === 'cancelled'
        ? {
            kind: 'cancelled',
            reason: 'Geometry evaluation stopped before it finished.',
          }
        : undefined,
      commitAssessment: {
        job,
        activeInputRevisionId: legality === 'commitAllowed'
          ? job.inputRevisionId
          : 'input.geometry.evaluate.stale',
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
  } as Awaited<ReturnType<typeof runGeometryModeWithOoePilot>>;
}

function renderGeometryRuntime(
  initialProps: {
    currentMode?: ModeId;
    isLauncherOpen?: boolean;
  } = {},
) {
  const activeFieldRef = { current: null } as RefObject<MathfieldElement | null>;
  const currentModeRef = {
    current: initialProps.currentMode ?? 'geometry',
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
      return useGeometryRuntime({
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
        currentMode: initialProps.currentMode ?? 'geometry',
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

describe('useGeometryRuntime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates Geometry drafts and solve-missing templates through the hook', () => {
    const { hook, setClipboardNotice } = renderGeometryRuntime();

    act(() => {
      hook.result.current.loadGeometryDraft(SQUARE_LATEX, 'manual', true);
    });

    expect(hook.result.current.geometryDraftState).toMatchObject({
      rawLatex: SQUARE_LATEX,
      source: 'manual',
      executable: true,
    });
    expect(hook.result.current.geometryDraftLatex).toBe(SQUARE_LATEX);

    act(() => {
      hook.result.current.loadGeometrySolveMissingTemplate('square(side=?, area=25)');
    });

    expect(hook.result.current.geometryDraftState.rawLatex).toBe('square(side=?, area=25)');
    expect(setClipboardNotice).toHaveBeenCalledWith('Geometry solve-missing template loaded');
  });

  it('loads Geometry guide examples and seed state through the hook boundary', () => {
    const { hook } = renderGeometryRuntime();

    act(() => {
      hook.result.current.loadGeometryExample('circle', 'circle(radius=7)', { radius: '7' });
    });

    expect(hook.result.current.geometryScreen).toBe('circle');
    expect(hook.result.current.circleState.radius).toBe('7');
    expect(hook.result.current.geometryDraftState).toMatchObject({
      rawLatex: 'circle(radius=7)',
      source: 'manual',
      executable: true,
    });
  });

  it('reports an empty Geometry draft before launching the runtime', () => {
    const { activeFieldRef, hook, setDisplayOutcome } = renderGeometryRuntime();

    act(() => {
      hook.result.current.openGeometryScreen('square');
    });
    act(() => {
      hook.result.current.updateGeometryDraft('', 'manual', true);
    });
    const field = {
      getValue: () => '',
    } as MathfieldElement;
    hook.result.current.geometryDraftFieldRef.current = field;
    activeFieldRef.current = field;
    setDisplayOutcome.mockClear();

    act(() => {
      hook.result.current.runGeometryAction();
    });

    expect(setDisplayOutcome).toHaveBeenCalledWith({
      kind: 'error',
      title: 'Square',
      error: 'Enter a Geometry request or use a guided tool before evaluating.',
      warnings: [],
    });
    expect(runGeometryModeWithOoePilot).not.toHaveBeenCalled();
  });

  it('reserves a Geometry ticket and commits the latest successful runtime payload', async () => {
    const payload = geometryPayload();
    vi.mocked(runGeometryModeWithOoePilot).mockResolvedValue(
      geometryEnvelope('commitAllowed', payload),
    );
    const {
      activeFieldRef,
      commitOutcome,
      hook,
      reserveHistoryTicket,
    } = renderGeometryRuntime();
    reserveHistoryTicket.mockReturnValue({
      id: 'ticket.geometry.success',
      historyLaunchOrder: 61,
    });

    act(() => {
      hook.result.current.openGeometryScreen('square');
    });
    act(() => {
      hook.result.current.loadGeometryDraft(SQUARE_LATEX, 'manual', true);
    });
    const field = {
      getValue: () => SQUARE_LATEX,
    } as MathfieldElement;
    hook.result.current.geometryDraftFieldRef.current = field;
    activeFieldRef.current = field;

    act(() => {
      hook.result.current.runGeometryAction();
    });

    await waitFor(() => expect(commitOutcome).toHaveBeenCalledTimes(1));

    const expectedRequest: RunGeometryRuntimeRequest = {
      inputLatex: SQUARE_LATEX,
      screenHint: 'square',
    };
    expect(reserveHistoryTicket).toHaveBeenCalledWith({
      mode: 'geometry',
      inputLatex: SQUARE_LATEX,
      capabilityId: 'geometry.evaluate',
      inputRevisionId: buildGeometryOoeInputRevisionId(expectedRequest),
      workspaceInstance: null,
    });
    expect(runGeometryModeWithOoePilot).toHaveBeenCalledWith(
      expectedRequest,
      expect.objectContaining({
        launchTicket: {
          id: 'ticket.geometry.success',
          historyLaunchOrder: 61,
        },
      }),
    );
    expect(commitOutcome).toHaveBeenCalledWith(
      payload.outcome,
      SQUARE_LATEX,
      'geometry',
      {
        geometryScreen: 'square',
        geometrySeed: payload.replaySeed,
        historyTicketId: 'ticket.geometry.success',
        historyLaunchOrder: 61,
        suppressDisplayCommit: false,
      },
    );
  });

  it('drops stale Geometry commits without publishing an outcome', async () => {
    vi.mocked(runGeometryModeWithOoePilot).mockResolvedValue(
      geometryEnvelope('staleDrop'),
    );
    const { commitOutcome, discardHistoryTicket, hook, reserveHistoryTicket } =
      renderGeometryRuntime();
    reserveHistoryTicket.mockReturnValue({
      id: 'ticket.geometry.stale',
      historyLaunchOrder: 62,
    });

    act(() => {
      hook.result.current.openGeometryScreen('square');
    });
    act(() => {
      hook.result.current.runGeometryAction();
    });

    await waitFor(() =>
      expect(discardHistoryTicket).toHaveBeenCalledWith('ticket.geometry.stale'));
    expect(commitOutcome).not.toHaveBeenCalled();
  });

  it('drops cancelled Geometry work and reports the stopped status', async () => {
    vi.mocked(runGeometryModeWithOoePilot).mockResolvedValue(
      geometryEnvelope('cancelled'),
    );
    const {
      commitOutcome,
      discardHistoryTicket,
      hook,
      reserveHistoryTicket,
      setRuntimeStatusOverride,
    } = renderGeometryRuntime();
    reserveHistoryTicket.mockReturnValue({
      id: 'ticket.geometry.cancelled',
      historyLaunchOrder: 63,
    });

    act(() => {
      hook.result.current.openGeometryScreen('square');
    });
    act(() => {
      hook.result.current.runGeometryAction();
    });

    await waitFor(() =>
      expect(setRuntimeStatusOverride).toHaveBeenCalledWith('Geometry evaluation stopped'));

    expect(discardHistoryTicket).toHaveBeenCalledWith('ticket.geometry.cancelled');
    expect(commitOutcome).not.toHaveBeenCalled();
  });

  it('captures and restores Geometry surface state', () => {
    const { hook } = renderGeometryRuntime();

    act(() => {
      hook.result.current.loadGeometryExample('circle', 'circle(radius=7)', { radius: '7' });
      hook.result.current.setSquareState({ side: '9' });
    });

    const snapshot = hook.result.current.captureGeometrySurfaceState();

    act(() => {
      hook.result.current.restoreGeometrySurfaceState(null);
    });

    expect(hook.result.current.geometryScreen).toBe('home');
    expect(hook.result.current.circleState.radius).toBe('3');
    expect(hook.result.current.squareState.side).toBe('4');
    expect(hook.result.current.geometryDraftState.rawLatex).toBe('');

    act(() => {
      hook.result.current.restoreGeometrySurfaceState(snapshot);
    });

    expect(hook.result.current.geometryScreen).toBe('circle');
    expect(hook.result.current.circleState.radius).toBe('7');
    expect(hook.result.current.squareState.side).toBe('9');
    expect(hook.result.current.geometryDraftState.rawLatex).toBe('circle(radius=7)');
  });

  it('resets current-screen and full Geometry state from the hook', () => {
    const { hook } = renderGeometryRuntime();

    act(() => {
      hook.result.current.loadGeometryExample('square', 'square(side=9)', { side: '9' });
    });
    act(() => {
      hook.result.current.resetCurrentGeometryScreen();
    });

    expect(hook.result.current.squareState.side).toBe('4');
    expect(hook.result.current.geometryDraftState.rawLatex).toBe('square(side=4)');

    act(() => {
      hook.result.current.loadGeometryExample('circle', 'circle(radius=7)', { radius: '7' });
    });
    act(() => {
      hook.result.current.resetGeometryRuntime();
    });

    expect(hook.result.current.geometryScreen).toBe('home');
    expect(hook.result.current.circleState.radius).toBe('3');
    expect(hook.result.current.geometryDraftState.rawLatex).toBe('');
  });
});
