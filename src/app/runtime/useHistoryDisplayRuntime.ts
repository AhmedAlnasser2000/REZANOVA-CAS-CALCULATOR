import {
  useCallback,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
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
import type {
  WorkspaceInstanceStateSlot,
  WorkspaceInstanceStateSlotUpdater,
} from './workspace-instances';
import {
  buildHistoryDisplayEntry,
  type CommitHistoryDisplayContext,
} from './historyDisplayEntry';
import type {
  CalculusScreen,
  CalculatorMemorySnapshot,
  DisplayOutcome,
  GeometryScreen,
  GuideExample,
  HistoryEntry,
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
  setClipboardNotice: (notice: string | null) => void;
  setLauncherSurfaceApp: () => void;
  setMode: (mode: ModeId) => void;
  setReplayVariableSubstitutions: Dispatch<SetStateAction<HistoryDisplayReplayVariableSubstitutions>>;
  setRuntimeStatusOverride: (status: string | null) => void;
  switchToEquationWithLatex: (latex: string) => void;
  updateWorkspaceInstanceDisplayState?: (
    workspaceInstanceId: string,
    displayState: WorkspaceInstanceStateSlot | WorkspaceInstanceStateSlotUpdater,
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
  isWorkspaceInstanceOpen,
  openCalculusScreen,
  restoreCalculateHistoryEntry,
  restoreCalculusHistoryEntry,
  restoreEquationHistoryEntry,
  restoreGeometryHistoryEntry,
  restoreLinearAlgebraTableHistoryEntry,
  restoreStatisticsHistoryEntry,
  restoreTrigHistoryEntry,
  setClipboardNotice,
  setLauncherSurfaceApp,
  setMode,
  setReplayVariableSubstitutions,
  setRuntimeStatusOverride,
  switchToEquationWithLatex,
  updateWorkspaceInstanceDisplayState,
  applyCalculusSeed,
  clearCalculateReplayVariableSubstitutions,
}: UseHistoryDisplayRuntimeOptions) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [pendingHistoryTickets, setPendingHistoryTickets] = useState<PendingHistoryTicket[]>([]);
  const [displayOutcome, setDisplayOutcome] = useState<DisplayOutcome | null>(null);
  const [ansLatex, setAnsLatex] = useState('0');
  const historyLaunchOrderRef = useRef(0);
  const workspaceInstanceByTicketIdRef = useRef(new Map<string, WorkspaceInstanceRuntimeContext>());

  const syncHistoryLaunchOrder = useCallback((entries: readonly HistoryEntry[]) => {
    const maxOrder = entries.reduce(
      (currentMax, entry, index) => Math.max(currentMax, entry.historyLaunchOrder ?? index),
      historyLaunchOrderRef.current,
    );
    historyLaunchOrderRef.current = Math.max(maxOrder, Date.now());
  }, []);

  const nextHistoryLaunchOrder = useCallback(() => {
    historyLaunchOrderRef.current = Math.max(historyLaunchOrderRef.current + 1, Date.now());
    return historyLaunchOrderRef.current;
  }, []);

  function resetHistory() {
    setHistory([]);
    setPendingHistoryTickets([]);
    workspaceInstanceByTicketIdRef.current.clear();
    historyLaunchOrderRef.current = Date.now();
    void clearHistoryEntries();
    setClipboardNotice('History reset');
  }

  function deleteHistoryEntryById(id: string) {
    setHistory((currentHistory) => currentHistory.filter((entry) => entry.id !== id));
    void deleteHistoryEntry(id);
    setClipboardNotice('History entry deleted');
  }

  function reservePendingHistoryTicket(input: {
    mode: ModeId;
    inputLatex: string;
    capabilityId?: string;
    inputRevisionId?: string;
  }): PendingHistoryTicketReservation | null {
    const historyLaunchOrder = nextHistoryLaunchOrder();
    const workspaceInstance = getActiveWorkspaceInstanceRuntimeContext?.() ?? null;
    const reservation: PendingHistoryTicketReservation = {
      id: createId(),
      historyLaunchOrder,
      workspaceInstance,
      isWorkspaceInstanceOpen,
    };
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
    });

    if (historyEnabled) {
      setPendingHistoryTickets((currentTickets) => [...currentTickets, ticket]);
    }

    return {
      id: reservation.id,
      historyLaunchOrder: reservation.historyLaunchOrder,
      workspaceInstance: reservation.workspaceInstance,
      isWorkspaceInstanceOpen: reservation.isWorkspaceInstanceOpen,
    };
  }

  function discardPendingHistoryTicket(ticketId?: string | null) {
    if (!ticketId) {
      return;
    }

    workspaceInstanceByTicketIdRef.current.delete(ticketId);
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
    discardPendingHistoryTicket(ticketId);
    setHistory((currentHistory) => {
      const ordered = sortHistoryEntriesByLaunchOrder([...currentHistory, entry]);
      return ordered.slice(-80);
    });
    void appendHistoryEntry(entry);
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
          setRuntimeStatusOverride('Stop requested');
        }
      })
      .catch(() => {
        setClipboardNotice('Could not request Stop for this pending job');
      });
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

    if (isWorkspaceDisplayTargetActive(workspaceInstanceId)) {
      if (!context.suppressDisplayCommit) {
        setDisplayOutcome(outcome);
      }
      return true;
    }

    updateWorkspaceInstanceDisplayState?.(
      workspaceInstanceId,
      (currentDisplayState) => applyWorkspaceDisplayOutcome(currentDisplayState, outcome),
    );
    return true;
  }

  function commitOutcome(
    outcome: DisplayOutcome,
    inputLatex: string,
    mode: ModeId,
    context: CommitHistoryDisplayContext = {},
  ) {
    const workspaceInstance = resolveCommitWorkspaceInstance(context);
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
        context,
        currentCalculateHistoryContext,
        currentCalculusHistoryContext,
        geometryScreen: getGeometryScreen(),
        trigScreen: getTrigScreen(),
        statisticsScreen: getStatisticsScreen(),
      }),
      context.historyTicketId,
    );
  }

  function replayHistoryEntry(entry: HistoryEntry) {
    setLauncherSurfaceApp();
    setMode(entry.mode);
    if (entry.mode !== 'calculate') {
      clearCalculateReplayVariableSubstitutions();
    }
    setReplayVariableSubstitutions(
      entry.mode !== 'calculate' && entry.variableSubstitutions && entry.variableSubstitutions.length > 0
        ? { mode: entry.mode, inputLatex: entry.inputLatex, substitutions: entry.variableSubstitutions }
        : null,
    );
    if (entry.mode === 'calculate') {
      const legacyCalculusScreen = mapLegacyCalculateScreenToCalculusScreen(
        entry.calculateScreen,
        entry.calculateSeed,
      );
      if (legacyCalculusScreen) {
        setMode('calculus');
        openCalculusScreen(legacyCalculusScreen);
        applyCalculusSeed(
          legacyCalculusScreen,
          entry.calculateSeed as GuideExample['launch']['calculusSeed'],
        );
        clearCalculateReplayVariableSubstitutions();
        setReplayVariableSubstitutions(
          entry.variableSubstitutions && entry.variableSubstitutions.length > 0
            ? { mode: 'calculus', inputLatex: entry.inputLatex, substitutions: entry.variableSubstitutions }
            : null,
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
      answerDomain: entry.answerDomain,
      solutionKind: entry.solutionKind,
      warnings: [],
    });
    closeHistoryPanel();
  }

  function restoreHistoryDisplayMemorySnapshot(snapshot: CalculatorMemorySnapshot) {
    syncHistoryLaunchOrder(snapshot.history);
    setHistory(snapshot.history);
    setPendingHistoryTickets([]);
    workspaceInstanceByTicketIdRef.current.clear();
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
  }

  function getPendingRuntimeStatusLabel(capabilityIds: readonly string[]) {
    if (hasStoppingPendingHistoryTickets(pendingHistoryTickets, capabilityIds)) {
      return 'Stopping';
    }
    if (hasActivePendingHistoryTickets(pendingHistoryTickets, capabilityIds)) {
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
    getPendingRuntimeStatusLabel,
    history,
    markPendingHistoryTicketAsStopping,
    markPendingHistoryTicketsForWorkspaceInstanceAsStopping,
    pendingHistoryTickets,
    replayHistoryEntry,
    reservePendingHistoryTicket,
    resetHistory,
    resetHistoryDisplayMemory,
    restoreDisplayState,
    restoreHistoryDisplayMemorySnapshot,
    restoreLoadedHistory,
    setDisplayOutcome,
    stopPendingHistoryTicket,
  };
}
