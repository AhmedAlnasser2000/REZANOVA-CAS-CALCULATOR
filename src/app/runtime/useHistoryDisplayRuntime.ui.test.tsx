import { act, renderHook, waitFor } from '@testing-library/react';
import { startTransition } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  HistoryEntry,
  ModeId,
  WorkspaceInstanceRuntimeContext,
  VariableSubstitutionSnapshot,
} from '../../types/calculator';
import { DEFAULT_SETTINGS } from '../../types/calculator';
import {
  appendHistoryEntry,
  clearHistoryEntries,
  deleteHistoryEntry,
} from '../../lib/app-state/persistence';
import {
  listActiveOoeJobs,
  requestLatestOoeCapabilityCancellation,
  requestOoeJobCancellation,
} from '../../lib/ooe/job-launch/active-job-registry';
import type { PendingHistoryTicketReservation } from '../../lib/ooe/job-launch/launch-tickets';
import {
  useHistoryDisplayRuntime,
  type HistoryDisplayReplayVariableSubstitutions,
} from './useHistoryDisplayRuntime';
import type {
  WorkspaceInstanceStateSlot,
  WorkspaceInstanceStateSlotUpdater,
} from './workspace-instances';

vi.mock('../../lib/app-state/persistence', () => ({
  appendHistoryEntry: vi.fn(),
  clearHistoryEntries: vi.fn(),
  deleteHistoryEntry: vi.fn(),
}));

vi.mock('../../lib/ooe/job-launch/active-job-registry', () => ({
  listActiveOoeJobs: vi.fn(),
  requestLatestOoeCapabilityCancellation: vi.fn(),
  requestOoeJobCancellation: vi.fn(),
}));

type RuntimeDelegates = ReturnType<typeof createDelegates>;

function createDelegates() {
  let replayVariableSubstitutions: HistoryDisplayReplayVariableSubstitutions = null;

  return {
    applyCalculusSeed: vi.fn(),
    clearCalculateReplayVariableSubstitutions: vi.fn(),
    closeHistoryPanel: vi.fn(),
    currentCalculusHistoryContext: vi.fn((): Partial<HistoryEntry> => ({
      calculusScreen: 'finiteLimit',
    })),
    currentCalculateHistoryContext: vi.fn((): Partial<HistoryEntry> => ({
      calculateScreen: 'standard',
    })),
    getGeometryScreen: vi.fn(() => 'triangleArea' as const),
    getReplayVariableSubstitutions: () => replayVariableSubstitutions,
    getStatisticsScreen: vi.fn(() => 'regression' as const),
    getTrigScreen: vi.fn(() => 'equationSolve' as const),
    openCalculusScreen: vi.fn(),
    restoreCalculateHistoryEntry: vi.fn(),
    restoreCalculusHistoryEntry: vi.fn(),
    restoreEquationHistoryEntry: vi.fn(),
    restoreGeometryHistoryEntry: vi.fn(),
    restoreLinearAlgebraTableHistoryEntry: vi.fn(),
    restoreStatisticsHistoryEntry: vi.fn(),
    restoreTrigHistoryEntry: vi.fn(),
    setClipboardNotice: vi.fn(),
    setLauncherSurfaceApp: vi.fn(),
    setMode: vi.fn(),
    setReplayVariableSubstitutions: vi.fn((next) => {
      replayVariableSubstitutions =
        typeof next === 'function' ? next(replayVariableSubstitutions) : next;
    }),
    setRuntimeElapsedMs: vi.fn(),
    setRuntimeStatusOverride: vi.fn(),
    switchToEquationWithLatex: vi.fn(),
  };
}

function renderHistoryDisplayRuntime(options: {
  activeWorkspaceInstance?: WorkspaceInstanceRuntimeContext | null;
  activeWorkspaceInstanceRef?: { current: WorkspaceInstanceRuntimeContext | null };
  autoSwitchToEquation?: boolean;
  delegates?: RuntimeDelegates;
  historyEnabled?: boolean;
  updateWorkspaceInstanceDisplayState?: (
    workspaceInstanceId: string,
    displayState: WorkspaceInstanceStateSlot | WorkspaceInstanceStateSlotUpdater,
  ) => void;
  updateWorkspaceInstanceRuntimeState?: (
    workspaceInstanceId: string,
    runtimeState: WorkspaceInstanceStateSlot | WorkspaceInstanceStateSlotUpdater,
  ) => void;
  workspaceInstanceOpen?: boolean;
} = {}) {
  const delegates = options.delegates ?? createDelegates();
  const activeWorkspaceInstance = options.activeWorkspaceInstance === undefined
    ? {
        workspaceInstanceId: 'workspace.calculate.1',
        workspaceInstanceLabel: 'Calculate A',
        workspaceKind: 'calculate',
      }
    : options.activeWorkspaceInstance;
  const activeWorkspaceInstanceRef = options.activeWorkspaceInstanceRef
    ?? { current: activeWorkspaceInstance };
  const hook = renderHook(
    (props: { autoSwitchToEquation: boolean; historyEnabled: boolean }) =>
      useHistoryDisplayRuntime({
        autoSwitchToEquation: props.autoSwitchToEquation,
        closeHistoryPanel: delegates.closeHistoryPanel,
        currentCalculusHistoryContext: delegates.currentCalculusHistoryContext,
        currentCalculateHistoryContext: delegates.currentCalculateHistoryContext,
        getGeometryScreen: delegates.getGeometryScreen,
        getReplayVariableSubstitutions: delegates.getReplayVariableSubstitutions,
        getStatisticsScreen: delegates.getStatisticsScreen,
        getTrigScreen: delegates.getTrigScreen,
        getActiveWorkspaceInstanceRuntimeContext: () => activeWorkspaceInstanceRef.current,
        historyEnabled: props.historyEnabled,
        isWorkspaceInstanceOpen: () => options.workspaceInstanceOpen ?? true,
        openCalculusScreen: delegates.openCalculusScreen,
        restoreCalculateHistoryEntry: delegates.restoreCalculateHistoryEntry,
        restoreCalculusHistoryEntry: delegates.restoreCalculusHistoryEntry,
        restoreEquationHistoryEntry: delegates.restoreEquationHistoryEntry,
        restoreGeometryHistoryEntry: delegates.restoreGeometryHistoryEntry,
        restoreLinearAlgebraTableHistoryEntry: delegates.restoreLinearAlgebraTableHistoryEntry,
        restoreStatisticsHistoryEntry: delegates.restoreStatisticsHistoryEntry,
        restoreTrigHistoryEntry: delegates.restoreTrigHistoryEntry,
        setClipboardNotice: delegates.setClipboardNotice,
        setLauncherSurfaceApp: delegates.setLauncherSurfaceApp,
        setMode: delegates.setMode,
        setReplayVariableSubstitutions: delegates.setReplayVariableSubstitutions,
        setRuntimeElapsedMs: delegates.setRuntimeElapsedMs,
        setRuntimeStatusOverride: delegates.setRuntimeStatusOverride,
        switchToEquationWithLatex: delegates.switchToEquationWithLatex,
        updateWorkspaceInstanceDisplayState: options.updateWorkspaceInstanceDisplayState,
        updateWorkspaceInstanceRuntimeState: options.updateWorkspaceInstanceRuntimeState,
        applyCalculusSeed: delegates.applyCalculusSeed,
        clearCalculateReplayVariableSubstitutions:
          delegates.clearCalculateReplayVariableSubstitutions,
      }),
    {
      initialProps: {
        autoSwitchToEquation: options.autoSwitchToEquation ?? true,
        historyEnabled: options.historyEnabled ?? true,
      },
    },
  );

  return {
    delegates,
    hook,
  };
}

describe('useHistoryDisplayRuntime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reserves, discards, marks, resets, and deletes history tickets and entries', () => {
    const { delegates, hook } = renderHistoryDisplayRuntime();
    vi.useFakeTimers();
    vi.setSystemTime(100_000);

    let firstTicket: { id: string; historyLaunchOrder: number; startedAtMs?: number } | null = null;
    let secondTicket: { id: string; historyLaunchOrder: number; startedAtMs?: number } | null = null;
    act(() => {
      firstTicket = hook.result.current.reservePendingHistoryTicket({
        mode: 'calculate',
        inputLatex: '1+1',
        capabilityId: 'expression.evaluate',
        inputRevisionId: 'rev-1',
      });
      secondTicket = hook.result.current.reservePendingHistoryTicket({
        mode: 'equation',
        inputLatex: 'x+1=2',
        capabilityId: 'equation.solve',
        inputRevisionId: 'rev-2',
      });
    });

    expect(firstTicket).not.toBeNull();
    expect(secondTicket).not.toBeNull();
    expect(firstTicket!.startedAtMs).toBe(100_000);
    expect(hook.result.current.pendingHistoryTickets[0]?.startedAtMs).toBe(100_000);
    expect(secondTicket!.historyLaunchOrder).toBeGreaterThanOrEqual(
      firstTicket!.historyLaunchOrder,
    );
    expect(hook.result.current.pendingHistoryTickets).toHaveLength(2);

    act(() => {
      hook.result.current.markPendingHistoryTicketAsStopping(firstTicket!.id);
    });

    expect(hook.result.current.pendingHistoryTickets[0]?.status).toBe('stopping');

    act(() => {
      hook.result.current.discardPendingHistoryTicket(firstTicket!.id);
    });

    expect(hook.result.current.pendingHistoryTickets).toHaveLength(1);
    expect(hook.result.current.pendingHistoryTickets[0]?.id).toBe(secondTicket!.id);

    act(() => {
      hook.result.current.resetHistory();
    });

    expect(hook.result.current.pendingHistoryTickets).toHaveLength(0);
    expect(hook.result.current.history).toHaveLength(0);
    expect(clearHistoryEntries).toHaveBeenCalledTimes(1);
    expect(delegates.setClipboardNotice).toHaveBeenCalledWith('History reset');

    act(() => {
      hook.result.current.restoreLoadedHistory([
        {
          id: 'entry.delete',
          mode: 'calculate',
          inputLatex: '2+2',
          resultLatex: '4',
          timestamp: '2026-06-14T00:00:00Z',
        },
      ]);
      hook.result.current.deleteHistoryEntryById('entry.delete');
    });

    expect(hook.result.current.history).toHaveLength(0);
    expect(deleteHistoryEntry).toHaveBeenCalledWith('entry.delete');
  });

  it('scopes pending runtime labels to the requested workspace instance', () => {
    const activeWorkspaceInstanceRef: { current: WorkspaceInstanceRuntimeContext | null } = {
      current: {
        workspaceInstanceId: 'workspace.calculate.1',
        workspaceInstanceLabel: 'Calculate A',
        workspaceInstanceRevision: 0,
        workspaceKind: 'calculate' as const,
      },
    };
    const { hook } = renderHistoryDisplayRuntime({ activeWorkspaceInstanceRef });

    act(() => {
      hook.result.current.reservePendingHistoryTicket({
        mode: 'calculate',
        inputLatex: '56+76',
        capabilityId: 'expression.evaluate',
        inputRevisionId: 'rev-calculate',
      });
      activeWorkspaceInstanceRef.current = {
        workspaceInstanceId: 'workspace.equation.2',
        workspaceInstanceLabel: 'Equation',
        workspaceInstanceRevision: 0,
        workspaceKind: 'equation',
      };
      hook.result.current.reservePendingHistoryTicket({
        mode: 'equation',
        inputLatex: 'x+1=2',
        capabilityId: 'equation.solve',
        inputRevisionId: 'rev-equation',
      });
    });

    expect(hook.result.current.getPendingRuntimeStatusLabel(
      ['expression.evaluate', 'equation.solve'],
      {
        workspaceInstanceId: 'workspace.calculate.1',
        workspaceInstanceRevision: 0,
      },
    )).toBe('Computing');
    expect(hook.result.current.getPendingRuntimeStatus(
      ['expression.evaluate', 'equation.solve'],
      {
        workspaceInstanceId: 'workspace.calculate.1',
        workspaceInstanceRevision: 0,
      },
    )).toMatchObject({
      label: 'Computing',
      status: 'computing',
      ticketId: hook.result.current.pendingHistoryTickets[0]?.id,
      startedAtMs: hook.result.current.pendingHistoryTickets[0]?.startedAtMs,
    });
    expect(hook.result.current.getPendingRuntimeStatusLabel(
      ['expression.evaluate', 'equation.solve'],
      {
        workspaceInstanceId: 'workspace.equation.2',
        workspaceInstanceRevision: 0,
      },
    )).toBe('Computing');
    expect(hook.result.current.getPendingRuntimeStatusLabel(
      ['expression.evaluate', 'equation.solve'],
      {
        workspaceInstanceId: 'workspace.calculate.1',
        workspaceInstanceRevision: 1,
      },
    )).toBeNull();

    act(() => {
      const equationTicket = hook.result.current.pendingHistoryTickets.find((ticket) =>
        ticket.workspaceInstanceId === 'workspace.equation.2');
      hook.result.current.markPendingHistoryTicketAsStopping(equationTicket?.id);
    });

    expect(hook.result.current.getPendingRuntimeStatusLabel(
      ['expression.evaluate', 'equation.solve'],
      {
        workspaceInstanceId: 'workspace.calculate.1',
        workspaceInstanceRevision: 0,
      },
    )).toBe('Computing');
    expect(hook.result.current.getPendingRuntimeStatusLabel(
      ['expression.evaluate', 'equation.solve'],
      {
        workspaceInstanceId: 'workspace.equation.2',
        workspaceInstanceRevision: 0,
      },
    )).toBe('Stopping');
  });

  it('publishes pending runtime status immediately when launch is scheduled in a transition', () => {
    const { hook } = renderHistoryDisplayRuntime();
    let immediateStatus:
      | ReturnType<typeof hook.result.current.getPendingRuntimeStatus>
      | null = null;

    act(() => {
      startTransition(() => {
        hook.result.current.reservePendingHistoryTicket({
          mode: 'equation',
          inputLatex: 'x+1=2',
          capabilityId: 'equation.solve',
          inputRevisionId: 'rev-equation-transition',
        });
        immediateStatus = hook.result.current.getPendingRuntimeStatus(['equation.solve'], {
          workspaceInstanceId: 'workspace.calculate.1',
        });
      });
    });

    expect(immediateStatus).toMatchObject({
      label: 'Computing',
      status: 'computing',
    });
  });

  it('commits success outcomes to visible display, Ans, and ordered history', () => {
    vi.useFakeTimers();
    vi.setSystemTime(200_000);
    const { delegates, hook } = renderHistoryDisplayRuntime();

    let ticket: { id: string; historyLaunchOrder: number } | null = null;
    act(() => {
      ticket = hook.result.current.reservePendingHistoryTicket({
        mode: 'calculate',
        inputLatex: '2+2',
        capabilityId: 'expression.evaluate',
      });
    });

    vi.setSystemTime(200_042);
    act(() => {
      hook.result.current.commitOutcome(
        {
          kind: 'success',
          title: 'Simplify',
          exactLatex: '4',
          resolvedInputLatex: '2+2',
          variableSubstitutions: [
            { name: 'a', valueLatex: '2', numericValue: 2 },
          ],
          warnings: [],
        },
        '2+2',
        'calculate',
        {
          calculateScreen: 'standard',
          historyLaunchOrder: ticket!.historyLaunchOrder,
          historyTicketId: ticket!.id,
        },
      );
    });

    expect(hook.result.current.displayOutcome).toMatchObject({
      kind: 'success',
      exactLatex: '4',
    });
    expect(hook.result.current.ansLatex).toBe('4');
    expect(hook.result.current.pendingHistoryTickets).toHaveLength(0);
    expect(hook.result.current.history).toHaveLength(1);
    expect(hook.result.current.history[0]).toMatchObject({
      mode: 'calculate',
      inputLatex: '2+2',
      resultLatex: '4',
      runtimeElapsedMs: 42,
      calculateScreen: 'standard',
      variableSubstitutions: [
        { name: 'a', valueLatex: '2', numericValue: 2 },
      ],
    });
    expect(appendHistoryEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        inputLatex: '2+2',
        resultLatex: '4',
        runtimeElapsedMs: 42,
      }),
    );
    expect(delegates.setRuntimeElapsedMs).toHaveBeenLastCalledWith(42);
  });

  it('commits inactive workspace outcomes into the origin display state without changing visible display', () => {
    vi.useFakeTimers();
    vi.setSystemTime(300_000);
    let savedDisplayState: unknown = null;
    const updateWorkspaceInstanceDisplayState = vi.fn((_: string, nextState: unknown) => {
      savedDisplayState = typeof nextState === 'function'
        ? nextState(savedDisplayState)
        : nextState;
    });
    let savedRuntimeState: unknown = null;
    const updateWorkspaceInstanceRuntimeState = vi.fn((_: string, nextState: unknown) => {
      savedRuntimeState = typeof nextState === 'function'
        ? nextState(savedRuntimeState)
        : nextState;
    });
    const activeWorkspaceInstanceRef = {
      current: {
        workspaceInstanceId: 'workspace.calculate.1',
        workspaceInstanceLabel: 'Calculate A',
        workspaceKind: 'calculate',
      } satisfies WorkspaceInstanceRuntimeContext,
    };
    const { hook } = renderHistoryDisplayRuntime({
      activeWorkspaceInstanceRef,
      updateWorkspaceInstanceDisplayState,
      updateWorkspaceInstanceRuntimeState,
    });

    let ticket: { id: string; historyLaunchOrder: number } | null = null;
    act(() => {
      ticket = hook.result.current.reservePendingHistoryTicket({
        mode: 'calculate',
        inputLatex: '6+7',
        capabilityId: 'expression.evaluate',
      });
    });

    activeWorkspaceInstanceRef.current = {
      workspaceInstanceId: 'workspace.equation.2',
      workspaceInstanceLabel: 'Equation',
      workspaceKind: 'equation',
    };

    vi.setSystemTime(300_125);
    act(() => {
      hook.result.current.commitOutcome(
        {
          kind: 'success',
          title: 'Simplify',
          exactLatex: '13',
          resolvedInputLatex: '6+7',
          warnings: [],
        },
        '6+7',
        'calculate',
        {
          historyLaunchOrder: ticket!.historyLaunchOrder,
          historyTicketId: ticket!.id,
          suppressDisplayCommit: true,
        },
      );
    });

    expect(hook.result.current.displayOutcome).toBeNull();
    expect(hook.result.current.ansLatex).toBe('0');
    expect(updateWorkspaceInstanceDisplayState).toHaveBeenCalledWith(
      'workspace.calculate.1',
      expect.any(Function),
    );
    expect(updateWorkspaceInstanceRuntimeState).toHaveBeenLastCalledWith(
      'workspace.calculate.1',
      expect.any(Function),
    );
    expect(savedDisplayState).toMatchObject({
      ansLatex: '13',
      displayOutcome: {
        kind: 'success',
        exactLatex: '13',
      },
    });
    expect(savedRuntimeState).toMatchObject({
      lastRuntimeElapsedMs: 125,
    });
    expect(hook.result.current.history).toHaveLength(1);
    expect(hook.result.current.history[0]).toMatchObject({
      mode: 'calculate',
      inputLatex: '6+7',
      resultLatex: '13',
      runtimeElapsedMs: 125,
    });
  });

  it('uses an explicit launch workspace when reserving after another tab is active', () => {
    let savedDisplayState: unknown = null;
    const updateWorkspaceInstanceDisplayState = vi.fn((_: string, nextState: unknown) => {
      savedDisplayState = typeof nextState === 'function'
        ? nextState(savedDisplayState)
        : nextState;
    });
    const launchWorkspaceInstance = {
      workspaceInstanceId: 'workspace.calculate.1',
      workspaceInstanceLabel: 'Calculate launch',
      workspaceInstanceRevision: 0,
      workspaceKind: 'calculate',
    } satisfies WorkspaceInstanceRuntimeContext;
    const activeWorkspaceInstanceRef = {
      current: {
        workspaceInstanceId: 'workspace.equation.2',
        workspaceInstanceLabel: 'Equation now',
        workspaceInstanceRevision: 0,
        workspaceKind: 'equation',
      } satisfies WorkspaceInstanceRuntimeContext,
    };
    const { hook } = renderHistoryDisplayRuntime({
      activeWorkspaceInstanceRef,
      updateWorkspaceInstanceDisplayState,
    });

    let ticket: PendingHistoryTicketReservation | null = null;
    act(() => {
      ticket = hook.result.current.reservePendingHistoryTicket({
        mode: 'calculate',
        inputLatex: '8+5',
        capabilityId: 'expression.evaluate',
        workspaceInstance: launchWorkspaceInstance,
      });
    });

    const currentTicket = ticket as unknown as PendingHistoryTicketReservation;
    expect(currentTicket.workspaceInstance).toMatchObject({
      workspaceInstanceId: 'workspace.calculate.1',
      workspaceInstanceLabel: 'Calculate launch',
    });
    expect(hook.result.current.pendingHistoryTickets[0]).toMatchObject({
      workspaceInstanceId: 'workspace.calculate.1',
      workspaceInstanceLabel: 'Calculate launch',
    });

    act(() => {
      hook.result.current.commitOutcome(
        {
          kind: 'success',
          title: 'Simplify',
          exactLatex: '13',
          resolvedInputLatex: '8+5',
          warnings: [],
        },
        '8+5',
        'calculate',
        {
          historyLaunchOrder: ticket!.historyLaunchOrder,
          historyTicketId: currentTicket.id,
        },
      );
    });

    expect(hook.result.current.displayOutcome).toBeNull();
    expect(updateWorkspaceInstanceDisplayState).toHaveBeenCalledWith(
      'workspace.calculate.1',
      expect.any(Function),
    );
    expect(savedDisplayState).toMatchObject({
      ansLatex: '13',
      displayOutcome: {
        kind: 'success',
        exactLatex: '13',
      },
    });
  });

  it('preserves visible display and history state when display commit is suppressed', () => {
    const { hook } = renderHistoryDisplayRuntime();

    act(() => {
      hook.result.current.commitOutcome(
        {
          kind: 'success',
          title: 'Background',
          exactLatex: '9',
          warnings: [],
        },
        '3^2',
        'calculus',
        {
          suppressDisplayCommit: true,
          calculusScreen: 'finiteLimit',
        },
      );
    });

    expect(hook.result.current.displayOutcome).toBeNull();
    expect(hook.result.current.ansLatex).toBe('0');
    expect(hook.result.current.history).toHaveLength(1);
    expect(hook.result.current.history[0]).toMatchObject({
      mode: 'calculus',
      resultLatex: '9',
      calculusScreen: 'finiteLimit',
    });
  });

  it('switches prompt outcomes to Equation without committing display or history', () => {
    const { delegates, hook } = renderHistoryDisplayRuntime();

    act(() => {
      hook.result.current.commitOutcome(
        {
          kind: 'prompt',
          title: 'Solve in Equation',
          message: 'Equation can solve this.',
          targetMode: 'equation',
          carryLatex: 'x+1=2',
          warnings: [],
        },
        'x+1=2',
        'calculate',
        { historyTicketId: 'ticket.prompt' },
      );
    });

    expect(delegates.switchToEquationWithLatex).toHaveBeenCalledWith('x+1=2');
    expect(hook.result.current.displayOutcome).toBeNull();
    expect(hook.result.current.history).toHaveLength(0);
    expect(appendHistoryEntry).not.toHaveBeenCalled();
  });

  it('keeps display and Ans while discarding history when history is disabled', () => {
    const { hook } = renderHistoryDisplayRuntime({ historyEnabled: false });
    let reservation: PendingHistoryTicketReservation | null = null;

    act(() => {
      reservation = hook.result.current.reservePendingHistoryTicket({
        mode: 'calculate',
        inputLatex: '5+5',
      });
      expect(reservation).toMatchObject({
        workspaceInstance: {
          workspaceInstanceId: 'workspace.calculate.1',
          workspaceInstanceLabel: 'Calculate A',
        },
      });
    });

    expect(hook.result.current.pendingHistoryTickets).toHaveLength(1);

    act(() => {
      hook.result.current.commitOutcome(
        {
          kind: 'success',
          title: 'Simplify',
          exactLatex: '10',
          warnings: [],
        },
        '5+5',
        'calculate',
        {
          historyLaunchOrder: reservation!.historyLaunchOrder,
          historyTicketId: reservation!.id,
        },
      );
    });

    expect(hook.result.current.displayOutcome).toMatchObject({
      kind: 'success',
      exactLatex: '10',
    });
    expect(hook.result.current.ansLatex).toBe('10');
    expect(hook.result.current.history).toHaveLength(0);
    expect(hook.result.current.pendingHistoryTickets).toHaveLength(0);
    expect(appendHistoryEntry).not.toHaveBeenCalled();
  });

  it('attaches workspace instance context to pending history reservations', () => {
    const { hook } = renderHistoryDisplayRuntime();

    let reservation: PendingHistoryTicketReservation | null = null;
    act(() => {
      reservation = hook.result.current.reservePendingHistoryTicket({
        mode: 'calculate',
        inputLatex: '2+2',
      });
    });

    const currentReservation = reservation as unknown as PendingHistoryTicketReservation;
    expect(currentReservation).toMatchObject({
      workspaceInstance: {
        workspaceInstanceId: 'workspace.calculate.1',
        workspaceInstanceLabel: 'Calculate A',
      },
    });
    expect(currentReservation.isWorkspaceInstanceOpen?.('workspace.calculate.1')).toBe(true);
    expect(hook.result.current.pendingHistoryTickets[0]).toMatchObject({
      workspaceInstanceId: 'workspace.calculate.1',
      workspaceInstanceLabel: 'Calculate A',
    });
  });

  it('keeps pending history labels pinned to the launch-time tab title', () => {
    const activeWorkspaceInstanceRef = {
      current: {
        workspaceInstanceId: 'workspace.calculate.1',
        workspaceInstanceLabel: 'Original Calculate',
        workspaceKind: 'calculate' as ModeId,
      },
    };
    const { hook } = renderHistoryDisplayRuntime({ activeWorkspaceInstanceRef });

    act(() => {
      hook.result.current.reservePendingHistoryTicket({
        mode: 'calculate',
        inputLatex: '2+2',
      });
      activeWorkspaceInstanceRef.current = {
        ...activeWorkspaceInstanceRef.current,
        workspaceInstanceLabel: 'Renamed Calculate',
      };
    });

    expect(hook.result.current.pendingHistoryTickets[0]).toMatchObject({
      workspaceInstanceId: 'workspace.calculate.1',
      workspaceInstanceLabel: 'Original Calculate',
    });
  });

  it('replays normal and legacy Calculate calculus entries through injected delegates', () => {
    const delegates = createDelegates();
    const { hook } = renderHistoryDisplayRuntime({ delegates });
    const substitutions: VariableSubstitutionSnapshot[] = [
      { name: 'a', valueLatex: '2', numericValue: 2 },
    ];

    act(() => {
      hook.result.current.replayHistoryEntry({
        id: 'history.equation',
        mode: 'equation',
        inputLatex: 'x+a=4',
        resultLatex: 'x=2',
        detailSections: [
          {
            title: 'Replay Proof',
            lines: ['x+a=4'],
            lineKind: 'math',
          },
        ],
        variableSubstitutions: substitutions,
        timestamp: '2026-06-14T00:00:00Z',
      });
    });

    expect(delegates.setLauncherSurfaceApp).toHaveBeenCalledTimes(1);
    expect(delegates.setMode).toHaveBeenCalledWith('equation');
    expect(delegates.clearCalculateReplayVariableSubstitutions).toHaveBeenCalledTimes(1);
    expect(delegates.getReplayVariableSubstitutions()).toEqual({
      mode: 'equation',
      inputLatex: 'x+a=4',
      substitutions,
    });
    expect(delegates.restoreLinearAlgebraTableHistoryEntry).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'history.equation' }),
    );
    expect(delegates.restoreEquationHistoryEntry).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'history.equation' }),
    );
    expect(hook.result.current.displayOutcome).toMatchObject({
      kind: 'success',
      title: 'History',
      exactLatex: 'x=2',
      detailSections: [
        {
          title: 'Replay Proof',
          lines: ['x+a=4'],
          lineKind: 'math',
        },
      ],
    });
    expect(delegates.closeHistoryPanel).toHaveBeenCalledTimes(1);

    act(() => {
      hook.result.current.replayHistoryEntry({
        id: 'history.legacy-calculus',
        mode: 'calculate',
        inputLatex: '\\int x dx',
        resultLatex: '\\frac{x^2}{2}+C',
        calculateScreen: 'integral',
        calculateSeed: { kind: 'definite' },
        variableSubstitutions: substitutions,
        timestamp: '2026-06-14T00:00:01Z',
      });
    });

    expect(delegates.setMode).toHaveBeenCalledWith('calculus');
    expect(delegates.openCalculusScreen).toHaveBeenCalledWith('definiteIntegral');
    expect(delegates.applyCalculusSeed).toHaveBeenCalledWith(
      'definiteIntegral',
      { kind: 'definite' },
    );
    expect(delegates.restoreCalculateHistoryEntry).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: 'history.legacy-calculus' }),
    );
    expect(delegates.getReplayVariableSubstitutions()).toEqual({
      mode: 'calculus',
      inputLatex: '\\int x dx',
      substitutions,
    });
  });

  it('requests Stop for an exact pending OOE job and marks the ticket stopping', async () => {
    const { delegates, hook } = renderHistoryDisplayRuntime();
    vi.mocked(listActiveOoeJobs).mockReturnValue([
      {
        registryId: 'ooe-job-1',
        capabilityId: 'equation.solve',
        inputRevisionId: 'rev.current',
      } as ReturnType<typeof listActiveOoeJobs>[number],
    ]);
    vi.mocked(requestOoeJobCancellation).mockReturnValue({
      registryId: 'ooe-job-1',
    } as ReturnType<typeof requestOoeJobCancellation>);

    act(() => {
      hook.result.current.reservePendingHistoryTicket({
        mode: 'equation',
        inputLatex: 'x+1=2',
        capabilityId: 'equation.solve',
        inputRevisionId: 'rev.current',
      });
    });

    const [ticket] = hook.result.current.pendingHistoryTickets;
    act(() => {
      hook.result.current.stopPendingHistoryTicket(ticket);
    });

    await waitFor(() => {
      expect(requestOoeJobCancellation).toHaveBeenCalledWith('ooe-job-1', {
        requestedBy: 'user',
        reason: 'Pending History ticket Stop requested.',
      });
    });
    expect(requestLatestOoeCapabilityCancellation).not.toHaveBeenCalled();
    expect(hook.result.current.pendingHistoryTickets[0]?.status).toBe('stopping');
    expect(delegates.setRuntimeStatusOverride).toHaveBeenCalledWith('Stop requested');
  });

  it('restores history/display memory snapshots without restoring visible results', () => {
    const { hook } = renderHistoryDisplayRuntime();
    const snapshot = {
      version: 1 as const,
      savedAt: '2026-06-14T00:00:00Z',
      currentMode: 'calculate' as ModeId,
      settings: DEFAULT_SETTINGS,
      history: [
        {
          id: 'memory.entry',
          mode: 'calculate' as ModeId,
          inputLatex: '6*7',
          resultLatex: '42',
          timestamp: '2026-06-14T00:00:00Z',
        },
      ],
      variableMemory: [],
      ansLatex: '42',
      displayOutcome: {
        kind: 'success',
        title: 'Memory',
        exactLatex: '42',
        warnings: [],
      },
      session: {},
    };

    act(() => {
      hook.result.current.restoreHistoryDisplayMemorySnapshot(snapshot);
    });

    expect(hook.result.current.history).toHaveLength(1);
    expect(hook.result.current.ansLatex).toBe('42');
    expect(hook.result.current.displayOutcome).toBeNull();
  });
});
