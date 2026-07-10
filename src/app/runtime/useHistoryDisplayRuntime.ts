import {
  useCallback,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { flushSync } from 'react-dom';
import {
  isCalculusMode,
  mapLegacyCalculateScreenToCalculusScreen,
} from '../../lib/calculus/calculus-identity';
import {
  appendHistoryEntry,
  clearHistoryEntries,
  deleteHistoryEntry,
} from '../../lib/app-state/persistence';
import {
  buildPendingHistoryTicket,
  discardPendingHistoryTicket as discardPendingHistoryTicketById,
  hasActivePendingHistoryTickets,
  hasStoppingPendingHistoryTickets,
  markPendingHistoryTicketStopping,
  sortHistoryEntriesByLaunchOrder,
  type PendingHistoryTicketReservation,
} from '../../lib/ooe/job-launch/launch-tickets';
import { createId } from '../logic/appUtils';
import {
  applyWorkspaceDisplayOutcome,
  normalizeWorkspaceDisplayState,
  type WorkspaceDisplayReplayVariableSubstitutions,
  type WorkspaceDisplayState,
} from './workspace-display-state';
import {
  normalizeWorkspaceRuntimeState,
} from './workspace-runtime-state';
import type {
  WorkspaceInstanceStateSlot,
  WorkspaceInstanceStateSlotUpdater,
} from './workspace-instances';
import {
  buildHistoryDisplayEntry,
  type CommitHistoryDisplayContext,
} from './historyDisplayEntry';
import {
  runtimeElapsedMs,
  type RuntimeElapsedPendingStatus,
} from './runtimeElapsedTime';
import { buildHistoryReplaySnapshot } from '../../lib/history-replay/replay-snapshot';
import type {
  CalculusScreen,
  CalculatorMemorySnapshot,
  DisplayOutcome,
  GeometryScreen,
  GuideExample,
  HistoryEntry,
  HistoryReplaySnapshotV1,
  ModeId,
  PendingHistoryTicket,
  Settings,
  StatisticsScreen,
  StoredVariableValue,
  TrigScreen,
  WorkspaceInstanceRuntimeContext,
} from '../../types/calculator';

export type HistoryDisplayReplayVariableSubstitutions = WorkspaceDisplayReplayVariableSubstitutions;

export type CommitHistoryDisplayOutcome = (
  outcome: DisplayOutcome,
  inputLatex: string,
  mode: ModeId,
  context?: CommitHistoryDisplayContext,
) => void;

export type PendingRuntimeStatus = {
  label: 'Computing' | 'Stopping';
  status: RuntimeElapsedPendingStatus;
  startedAtMs: number;
  ticketId: string;
};

type UseHistoryDisplayRuntimeOptions = {
  autoSwitchToEquation: boolean;
  closeHistoryPanel: () => void;
  currentCalculusHistoryContext: () => Partial<HistoryEntry>;
  currentCalculateHistoryContext: () => Partial<HistoryEntry>;
  getGeometryScreen: () => GeometryScreen;
  getReplayVariableSubstitutions: () => WorkspaceDisplayReplayVariableSubstitutions;
  getStatisticsScreen: () => StatisticsScreen;
  getTrigScreen: () => TrigScreen;
  historyEnabled: boolean;
  settings: Settings;
  getActiveWorkspaceInstanceRuntimeContext?: () => WorkspaceInstanceRuntimeContext | null;
  isWorkspaceInstanceOpen?: (
    workspaceInstanceId: string,
    job?: { workspaceInstanceRevision?: number | null },
  ) => boolean;
  openCalculusScreen: (screen: CalculusScreen) => void;
  restoreCalculateHistoryEntry: (entry: HistoryEntry) => void;
  restoreCalculusHistoryEntry: (entry: HistoryEntry) => void;
  restoreEquationHistoryEntry: (entry: HistoryEntry) => void;
  restoreGeometryHistoryEntry: (entry: HistoryEntry) => void;
  restoreLinearAlgebraTableHistoryEntry: (entry: HistoryEntry) => void;
  restoreStatisticsHistoryEntry: (entry: HistoryEntry) => void;
  restoreTrigHistoryEntry: (entry: HistoryEntry) => void;
  routeToModeDestination?: (mode: ModeId, applyDestination: () => void) => boolean;
  routeToModeDestinationInNewTab?: (mode: ModeId, applyDestination: () => void) => boolean;
  setClipboardNotice: (notice: string | null) => void;
  setLauncherSurfaceApp: () => void;
  setMode: (mode: ModeId) => void;
  setReplayVariableSubstitutions: Dispatch<SetStateAction<HistoryDisplayReplayVariableSubstitutions>>;
  setRuntimeElapsedMs: (elapsedMs: number | null) => void;
  setRuntimeStatusOverride: (status: string | null) => void;
  switchToEquationWithLatex: (latex: string) => void;
  updateWorkspaceInstanceDisplayState?: (
    workspaceInstanceId: string,
    displayState: WorkspaceInstanceStateSlot | WorkspaceInstanceStateSlotUpdater,
  ) => void;
  updateWorkspaceInstanceRuntimeState?: (
    workspaceInstanceId: string,
    runtimeState: WorkspaceInstanceStateSlot | WorkspaceInstanceStateSlotUpdater,
  ) => void;
  applyCalculusSeed: (
    screen: CalculusScreen,
    seed: GuideExample['launch']['calculusSeed'],
  ) => void;
  clearCalculateReplayVariableSubstitutions: () => void;
};

export function useHistoryDisplayRuntime({
  autoSwitchToEquation,
  closeHistoryPanel,
  currentCalculusHistoryContext,
  currentCalculateHistoryContext,
  getGeometryScreen,
  getReplayVariableSubstitutions,
  getStatisticsScreen,
  getTrigScreen,
  getActiveWorkspaceInstanceRuntimeContext,
  historyEnabled,
  settings,
  isWorkspaceInstanceOpen,
  openCalculusScreen,
  restoreCalculateHistoryEntry,
  restoreCalculusHistoryEntry,
  restoreEquationHistoryEntry,
  restoreGeometryHistoryEntry,
  restoreLinearAlgebraTableHistoryEntry,
  restoreStatisticsHistoryEntry,
  restoreTrigHistoryEntry,
  routeToModeDestination,
  routeToModeDestinationInNewTab,
  setClipboardNotice,
  setLauncherSurfaceApp,
  setMode,
  setReplayVariableSubstitutions,
  setRuntimeElapsedMs,
  setRuntimeStatusOverride,
  switchToEquationWithLatex,
  updateWorkspaceInstanceDisplayState,
  updateWorkspaceInstanceRuntimeState,
  applyCalculusSeed,
  clearCalculateReplayVariableSubstitutions,
}: UseHistoryDisplayRuntimeOptions) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [pendingHistoryTickets, setPendingHistoryTickets] = useState<PendingHistoryTicket[]>([]);
  const [displayOutcome, setDisplayOutcome] = useState<DisplayOutcome | null>(null);
  const [ansLatex, setAnsLatex] = useState('0');
  const historyLaunchOrderRef = useRef(0);
  const workspaceInstanceByTicketIdRef = useRef(new Map<string, WorkspaceInstanceRuntimeContext>());
  const runtimeStartedAtByTicketIdRef = useRef(new Map<string, number>());
  const historyReplaySnapshotByTicketIdRef = useRef(
    new Map<string, HistoryReplaySnapshotV1>(),
  );

  const syncHistoryLaunchOrder = useCallback((entries: readonly HistoryEntry[]) => {
    const maxOrder = entries.reduce(
      (currentMax, entry, index) => Math.max(currentMax, entry.historyLaunchOrder ?? index),
      historyLaunchOrderRef.current,
    );
    historyLaunchOrderRef.current = Math.max(maxOrder, Date.now());
  }, []);

  const nextHistoryLaunchOrder = useCallback((startedAtMs = Date.now()) => {
    historyLaunchOrderRef.current = Math.max(historyLaunchOrderRef.current + 1, startedAtMs);
    return historyLaunchOrderRef.current;
  }, []);

  function resetHistory() {
    setHistory([]);
    setPendingHistoryTickets([]);
    workspaceInstanceByTicketIdRef.current.clear();
    runtimeStartedAtByTicketIdRef.current.clear();
    historyReplaySnapshotByTicketIdRef.current.clear();
    historyLaunchOrderRef.current = Date.now();
    void clearHistoryEntries();
    setClipboardNotice('History reset');
  }

  function deleteHistoryEntryById(id: string) {
    setHistory((currentHistory) => currentHistory.filter((entry) => entry.id !== id));
    void deleteHistoryEntry(id);
    setClipboardNotice('History entry deleted');
  }

  function setWorkspaceRuntimeElapsed(
    workspaceInstance: WorkspaceInstanceRuntimeContext | null,
    elapsedMs: number | null,
  ) {
    if (!workspaceInstance) {
      setRuntimeElapsedMs(elapsedMs);
      return;
    }

    const workspaceInstanceId = workspaceInstance.workspaceInstanceId;
    updateWorkspaceInstanceRuntimeState?.(
      workspaceInstanceId,
      (currentRuntimeState) => ({
        ...normalizeWorkspaceRuntimeState(currentRuntimeState),
        lastRuntimeElapsedMs: elapsedMs,
      }),
    );

    if (isWorkspaceDisplayTargetActive(workspaceInstanceId)) {
      setRuntimeElapsedMs(elapsedMs);
    }
  }

  function runtimeElapsedMsForTicket(ticketId?: string | null) {
    if (!ticketId) {
      return null;
    }

    const startedAtMs = runtimeStartedAtByTicketIdRef.current.get(ticketId);
    return typeof startedAtMs === 'number' ? runtimeElapsedMs(startedAtMs) : null;
  }

  function reservePendingHistoryTicket(input: {
    mode: ModeId;
    inputLatex: string;
    capabilityId?: string;
    inputRevisionId?: string;
    workspaceInstance?: WorkspaceInstanceRuntimeContext | null;
  }): PendingHistoryTicketReservation | null {
    const startedAtMs = Date.now();
    const historyLaunchOrder = nextHistoryLaunchOrder(startedAtMs);
    const workspaceInstance =
      Object.prototype.hasOwnProperty.call(input, 'workspaceInstance')
        ? input.workspaceInstance ?? null
        : getActiveWorkspaceInstanceRuntimeContext?.() ?? null;
    const reservation: PendingHistoryTicketReservation = {
      id: createId(),
      historyLaunchOrder,
      startedAtMs,
      workspaceInstance,
      isWorkspaceInstanceOpen,
    };
    runtimeStartedAtByTicketIdRef.current.set(reservation.id, startedAtMs);
    historyReplaySnapshotByTicketIdRef.current.set(
      reservation.id,
      buildHistoryReplaySnapshot(settings, ansLatex),
    );
    if (workspaceInstance) {
      workspaceInstanceByTicketIdRef.current.set(reservation.id, workspaceInstance);
    }
    const ticket: PendingHistoryTicket = buildPendingHistoryTicket({
      id: reservation.id,
      mode: input.mode,
      inputLatex: input.inputLatex,
      capabilityId: input.capabilityId,
      inputRevisionId: input.inputRevisionId,
      ...(workspaceInstance
        ? {
            workspaceInstanceId: workspaceInstance.workspaceInstanceId,
            workspaceInstanceLabel: workspaceInstance.workspaceInstanceLabel,
            workspaceInstanceRevision: workspaceInstance.workspaceInstanceRevision,
          }
        : {}),
      historyLaunchOrder,
      startedAtMs,
    });

    flushSync(() => {
      setWorkspaceRuntimeElapsed(workspaceInstance, null);
      setPendingHistoryTickets((currentTickets) => [...currentTickets, ticket]);
    });

    return {
      id: reservation.id,
      historyLaunchOrder: reservation.historyLaunchOrder,
      startedAtMs: reservation.startedAtMs,
      workspaceInstance: reservation.workspaceInstance,
      isWorkspaceInstanceOpen: reservation.isWorkspaceInstanceOpen,
    };
  }

  function discardPendingHistoryTicket(ticketId?: string | null) {
    if (!ticketId) {
      return;
    }

    workspaceInstanceByTicketIdRef.current.delete(ticketId);
    runtimeStartedAtByTicketIdRef.current.delete(ticketId);
    historyReplaySnapshotByTicketIdRef.current.delete(ticketId);
    setPendingHistoryTickets((currentTickets) =>
      discardPendingHistoryTicketById(currentTickets, ticketId));
  }

  function markPendingHistoryTicketAsStopping(ticketId?: string | null) {
    if (!ticketId) {
      return;
    }

    setPendingHistoryTickets((currentTickets) =>
      markPendingHistoryTicketStopping(currentTickets, ticketId));
  }

  function discardPendingHistoryTicketsForWorkspaceInstance(workspaceInstanceId: string) {
    for (const [ticketId, workspaceInstance] of workspaceInstanceByTicketIdRef.current) {
      if (workspaceInstance.workspaceInstanceId === workspaceInstanceId) {
        workspaceInstanceByTicketIdRef.current.delete(ticketId);
        runtimeStartedAtByTicketIdRef.current.delete(ticketId);
        historyReplaySnapshotByTicketIdRef.current.delete(ticketId);
      }
    }
    setPendingHistoryTickets((currentTickets) =>
      currentTickets.filter((ticket) => ticket.workspaceInstanceId !== workspaceInstanceId));
  }

  function markPendingHistoryTicketsForWorkspaceInstanceAsStopping(workspaceInstanceId: string) {
    setPendingHistoryTickets((currentTickets) =>
      currentTickets.map((ticket) =>
        ticket.workspaceInstanceId === workspaceInstanceId
          ? { ...ticket, status: 'stopping' as const }
          : ticket));
  }

  function appendFinalizedHistoryEntry(entry: HistoryEntry, ticketId?: string | null) {
    const replaySnapshot = ticketId
      ? historyReplaySnapshotByTicketIdRef.current.get(ticketId)
      : undefined;
    const finalizedEntry = replaySnapshot ? { ...entry, replaySnapshot } : entry;
    discardPendingHistoryTicket(ticketId);
    setHistory((currentHistory) => {
      const ordered = sortHistoryEntriesByLaunchOrder([...currentHistory, finalizedEntry]);
      return ordered.slice(-80);
    });
    void appendHistoryEntry(finalizedEntry);
  }

  function stopPendingHistoryTicket(ticket: PendingHistoryTicket) {
    void import('../../lib/ooe/job-launch/active-job-registry')
      .then(({
        listActiveOoeJobs,
        requestLatestOoeCapabilityCancellation,
        requestOoeJobCancellation,
      }) => {
        const exactJob = ticket.inputRevisionId
          ? listActiveOoeJobs().find((job) =>
              job.capabilityId === ticket.capabilityId
              && job.inputRevisionId === ticket.inputRevisionId)
          : null;
        const cancelled = exactJob
          ? requestOoeJobCancellation(exactJob.registryId, {
              requestedBy: 'user',
              reason: 'Pending History ticket Stop requested.',
            })
          : ticket.capabilityId
            ? requestLatestOoeCapabilityCancellation(ticket.capabilityId, {
                requestedBy: 'user',
                reason: 'Pending History ticket Stop requested.',
              })
            : null;

        if (cancelled) {
          markPendingHistoryTicketAsStopping(ticket.id);
          const activeWorkspaceInstance = getActiveWorkspaceInstanceRuntimeContext?.() ?? null;
          if (
            !ticket.workspaceInstanceId
            || ticket.workspaceInstanceId === activeWorkspaceInstance?.workspaceInstanceId
          ) {
            setRuntimeStatusOverride('Stop requested');
          }
        }
      })
      .catch(() => {
        setClipboardNotice('Could not request Stop for this pending job');
      });
  }

  function stopPendingRuntimeTicket(
    capabilityIds: readonly string[],
    options: {
      workspaceInstanceId?: string | null;
      workspaceInstanceRevision?: number | null;
    } = {},
  ) {
    const ticket = oldestMatchingTicket(
      scopedPendingRuntimeTickets(options),
      capabilityIds,
      'running',
    );

    if (!ticket) {
      return false;
    }

    stopPendingHistoryTicket(ticket);
    return true;
  }

  function resolveCommitWorkspaceInstance(context: CommitHistoryDisplayContext) {
    return context.historyTicketId
      ? workspaceInstanceByTicketIdRef.current.get(context.historyTicketId) ?? null
      : null;
  }

  function isWorkspaceDisplayTargetActive(workspaceInstanceId: string) {
    return getActiveWorkspaceInstanceRuntimeContext?.()?.workspaceInstanceId === workspaceInstanceId;
  }

  function captureDisplayState(): WorkspaceDisplayState {
    return {
      displayOutcome,
      ansLatex,
      replayVariableSubstitutions: getReplayVariableSubstitutions(),
    };
  }

  function restoreDisplayState(state: WorkspaceInstanceStateSlot) {
    const normalized = normalizeWorkspaceDisplayState(state);
    setAnsLatex(normalized.ansLatex);
    setDisplayOutcome(normalized.displayOutcome);
    setReplayVariableSubstitutions(normalized.replayVariableSubstitutions);
  }

  function commitDisplayOutcome(
    outcome: DisplayOutcome,
    context: CommitHistoryDisplayContext,
  ) {
    const workspaceInstance = resolveCommitWorkspaceInstance(context);
    if (!workspaceInstance) {
      if (!context.suppressDisplayCommit) {
        setDisplayOutcome(outcome);
      }
      return true;
    }

    const workspaceInstanceId = workspaceInstance.workspaceInstanceId;
    if (
      isWorkspaceInstanceOpen?.(workspaceInstanceId, {
        workspaceInstanceRevision: workspaceInstance.workspaceInstanceRevision,
      }) === false
    ) {
      discardPendingHistoryTicket(context.historyTicketId);
      return false;
    }

    const updateOriginDisplayState = () => {
      updateWorkspaceInstanceDisplayState?.(
        workspaceInstanceId,
        (currentDisplayState) => applyWorkspaceDisplayOutcome(currentDisplayState, outcome),
      );
    };

    if (isWorkspaceDisplayTargetActive(workspaceInstanceId)) {
      if (!context.suppressDisplayCommit) {
        setDisplayOutcome(outcome);
      }
      updateOriginDisplayState();
      return true;
    }

    updateOriginDisplayState();
    return true;
  }

  function commitOutcome(
    outcome: DisplayOutcome,
    inputLatex: string,
    mode: ModeId,
    context: CommitHistoryDisplayContext = {},
  ) {
    const workspaceInstance = resolveCommitWorkspaceInstance(context);
    const committedRuntimeElapsedMs = runtimeElapsedMsForTicket(context.historyTicketId);
    const isActiveWorkspaceCommit = !workspaceInstance
      || isWorkspaceDisplayTargetActive(workspaceInstance.workspaceInstanceId);
    if (
      !context.suppressDisplayCommit
      && outcome.kind === 'prompt'
      && outcome.targetMode === 'equation'
      && autoSwitchToEquation
      && isActiveWorkspaceCommit
    ) {
      discardPendingHistoryTicket(context.historyTicketId);
      switchToEquationWithLatex(outcome.carryLatex);
      return;
    }

    if (!commitDisplayOutcome(outcome, context)) {
      return;
    }

    if (committedRuntimeElapsedMs !== null) {
      setWorkspaceRuntimeElapsed(workspaceInstance, committedRuntimeElapsedMs);
    }

    if (outcome.kind !== 'success' || (!outcome.exactLatex && !outcome.approxText)) {
      discardPendingHistoryTicket(context.historyTicketId);
      return;
    }

    if (outcome.exactLatex && !context.suppressDisplayCommit && isActiveWorkspaceCommit) {
      setAnsLatex(outcome.exactLatex);
    }
    if (!historyEnabled) {
      discardPendingHistoryTicket(context.historyTicketId);
      return;
    }

    appendFinalizedHistoryEntry(
      buildHistoryDisplayEntry({
        outcome,
        inputLatex,
        mode,
        context: {
          ...context,
          ...(committedRuntimeElapsedMs !== null
            ? { runtimeElapsedMs: committedRuntimeElapsedMs }
            : {}),
        },
        currentCalculateHistoryContext,
        currentCalculusHistoryContext,
        geometryScreen: getGeometryScreen(),
        trigScreen: getTrigScreen(),
        statisticsScreen: getStatisticsScreen(),
      }),
      context.historyTicketId,
    );
  }

  function routeHistoryDestination(
    mode: ModeId,
    applyDestination: () => void,
    options: { openInNewTab?: boolean } = {},
  ) {
    if (
      options.openInNewTab
      && routeToModeDestinationInNewTab
      && routeToModeDestinationInNewTab(mode, applyDestination)
    ) {
      return;
    }

    if (routeToModeDestination) {
      routeToModeDestination(mode, applyDestination);
      return;
    }

    setMode(mode);
    applyDestination();
  }

  function replayHistoryEntryToDestination(
    entry: HistoryEntry,
    options: { openInNewTab?: boolean } = {},
  ) {
    setLauncherSurfaceApp();

    const legacyCalculusScreen = entry.mode === 'calculate'
      ? mapLegacyCalculateScreenToCalculusScreen(
        entry.calculateScreen,
        entry.calculateSeed,
      )
      : null;
    const replayMode: ModeId = legacyCalculusScreen ? 'calculus' : entry.mode;

    routeHistoryDestination(replayMode, () => {
      if (replayMode !== 'calculate') {
        clearCalculateReplayVariableSubstitutions();
      }

      setReplayVariableSubstitutions(
        replayMode !== 'calculate' && entry.variableSubstitutions && entry.variableSubstitutions.length > 0
          ? { mode: replayMode, inputLatex: entry.inputLatex, substitutions: entry.variableSubstitutions }
          : null,
      );

      if (entry.mode === 'calculate') {
        if (legacyCalculusScreen) {
          openCalculusScreen(legacyCalculusScreen);
          applyCalculusSeed(
            legacyCalculusScreen,
            entry.calculateSeed as GuideExample['launch']['calculusSeed'],
          );
        } else {
          restoreCalculateHistoryEntry(entry);
        }
      }

      restoreLinearAlgebraTableHistoryEntry(entry);

      if (entry.mode === 'equation') {
        restoreEquationHistoryEntry(entry);
      }

      if (isCalculusMode(entry.mode)) {
        restoreCalculusHistoryEntry(entry);
      }

      if (entry.mode === 'trigonometry') {
        restoreTrigHistoryEntry(entry);
      }

      if (entry.mode === 'statistics') {
        restoreStatisticsHistoryEntry(entry);
      }

      if (entry.mode === 'geometry') {
        restoreGeometryHistoryEntry(entry);
      }

      setDisplayOutcome({
        kind: 'success',
        title: 'History',
        exactLatex: entry.resultLatex,
        exactSupplementLatex: entry.exactSupplementLatex,
        approxText: entry.approxText,
        detailSections: entry.detailSections,
        systemReadback: entry.systemReadback,
        answerDomain: entry.answerDomain,
        solutionKind: entry.solutionKind,
        warnings: [],
      });
      closeHistoryPanel();
    }, options);
  }

  function replayHistoryEntry(entry: HistoryEntry) {
    replayHistoryEntryToDestination(entry);
  }

  function replayHistoryEntryInNewTab(entry: HistoryEntry) {
    replayHistoryEntryToDestination(entry, { openInNewTab: true });
  }

  function restoreHistoryDisplayMemorySnapshot(snapshot: CalculatorMemorySnapshot) {
    syncHistoryLaunchOrder(snapshot.history);
    setHistory(snapshot.history);
    setPendingHistoryTickets([]);
    workspaceInstanceByTicketIdRef.current.clear();
    runtimeStartedAtByTicketIdRef.current.clear();
    historyReplaySnapshotByTicketIdRef.current.clear();
    setAnsLatex(snapshot.ansLatex);
    setDisplayOutcome(null);
  }

  const restoreLoadedHistory = useCallback((entries: HistoryEntry[]) => {
    syncHistoryLaunchOrder(entries);
    setHistory(entries);
  }, [syncHistoryLaunchOrder]);

  function buildHistoryDisplayMemoryFragment(settings: Settings, variableMemory: StoredVariableValue[]) {
    return {
      settings,
      history,
      variableMemory,
      ansLatex,
      displayOutcome: null,
    };
  }

  function resetHistoryDisplayMemory() {
    setDisplayOutcome(null);
    setAnsLatex('0');
    setPendingHistoryTickets([]);
    workspaceInstanceByTicketIdRef.current.clear();
    runtimeStartedAtByTicketIdRef.current.clear();
    historyReplaySnapshotByTicketIdRef.current.clear();
  }

  function scopedPendingRuntimeTickets(
    options: {
      workspaceInstanceId?: string | null;
      workspaceInstanceRevision?: number | null;
    } = {},
  ) {
    return options.workspaceInstanceId
      ? pendingHistoryTickets.filter((ticket) =>
          (!ticket.workspaceInstanceId
            || ticket.workspaceInstanceId === options.workspaceInstanceId)
          && (options.workspaceInstanceRevision == null
            || ticket.workspaceInstanceRevision == null
            || ticket.workspaceInstanceRevision === options.workspaceInstanceRevision))
      : pendingHistoryTickets;
  }

  function oldestMatchingTicket(
    tickets: readonly PendingHistoryTicket[],
    capabilityIds: readonly string[],
    status?: PendingHistoryTicket['status'],
  ) {
    return tickets
      .filter((ticket) =>
        (!status || ticket.status === status)
        && ticket.capabilityId
        && capabilityIds.includes(ticket.capabilityId))
      .sort((left, right) => left.startedAtMs - right.startedAtMs)[0] ?? null;
  }

  function getPendingRuntimeStatus(
    capabilityIds: readonly string[],
    options: {
      workspaceInstanceId?: string | null;
      workspaceInstanceRevision?: number | null;
    } = {},
  ): PendingRuntimeStatus | null {
    const scopedTickets = scopedPendingRuntimeTickets(options);

    const stoppingTicket = oldestMatchingTicket(scopedTickets, capabilityIds, 'stopping');
    if (stoppingTicket) {
      return {
        label: 'Stopping',
        status: 'stopping',
        startedAtMs: stoppingTicket.startedAtMs,
        ticketId: stoppingTicket.id,
      };
    }

    const runningTicket = oldestMatchingTicket(scopedTickets, capabilityIds);
    if (runningTicket) {
      return {
        label: 'Computing',
        status: 'computing',
        startedAtMs: runningTicket.startedAtMs,
        ticketId: runningTicket.id,
      };
    }

    return null;
  }

  function getPendingRuntimeStatusLabel(
    capabilityIds: readonly string[],
    options: {
      workspaceInstanceId?: string | null;
      workspaceInstanceRevision?: number | null;
    } = {},
  ) {
    const scopedTickets = scopedPendingRuntimeTickets(options);

    if (hasStoppingPendingHistoryTickets(scopedTickets, capabilityIds)) {
      return 'Stopping';
    }
    if (hasActivePendingHistoryTickets(scopedTickets, capabilityIds)) {
      return 'Computing';
    }
    return null;
  }

  return {
    ansLatex,
    buildHistoryDisplayMemoryFragment,
    captureDisplayState,
    commitOutcome: commitOutcome as CommitHistoryDisplayOutcome,
    deleteHistoryEntryById,
    discardPendingHistoryTicket,
    discardPendingHistoryTicketsForWorkspaceInstance,
    displayOutcome,
    getPendingRuntimeStatus,
    getPendingRuntimeStatusLabel,
    history,
    markPendingHistoryTicketAsStopping,
    markPendingHistoryTicketsForWorkspaceInstanceAsStopping,
    pendingHistoryTickets,
    replayHistoryEntry,
    replayHistoryEntryInNewTab,
    reservePendingHistoryTicket,
    resetHistory,
    resetHistoryDisplayMemory,
    restoreDisplayState,
    restoreHistoryDisplayMemorySnapshot,
    restoreLoadedHistory,
    setDisplayOutcome,
    stopPendingHistoryTicket,
    stopPendingRuntimeTicket,
  };
}
