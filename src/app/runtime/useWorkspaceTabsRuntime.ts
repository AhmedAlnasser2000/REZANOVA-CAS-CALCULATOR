import { useCallback, useMemo } from 'react';
import type { ModeId, PendingHistoryTicket } from '../../types/calculator';
import type { useWorkspaceInstancesRuntime } from './useWorkspaceInstancesRuntime';
import type { useWorkspaceDisplayStateHostRuntime } from './useWorkspaceDisplayStateHostRuntime';
import type { useWorkspaceRuntimeStateHostRuntime } from './useWorkspaceRuntimeStateHostRuntime';
import type { useWorkspaceSurfaceStateHostRuntime } from './useWorkspaceSurfaceStateHostRuntime';
import {
  type WorkspaceInstance,
  type WorkspaceInstanceId,
  type WorkspaceKind,
} from './workspace-instances';
import {
  requestWorkspaceTabJobCancellation,
  summarizeWorkspaceTabJobs,
} from './workspaceTabJobs';

type WorkspaceInstancesRuntime = ReturnType<typeof useWorkspaceInstancesRuntime>;
type WorkspaceDisplayStateHostRuntime = ReturnType<typeof useWorkspaceDisplayStateHostRuntime>;
type WorkspaceRuntimeStateHostRuntime = ReturnType<typeof useWorkspaceRuntimeStateHostRuntime>;
type WorkspaceSurfaceStateHostRuntime = ReturnType<typeof useWorkspaceSurfaceStateHostRuntime>;

type WorkspaceTabItem = {
  id: WorkspaceInstanceId;
  title: string;
  workspaceKind: WorkspaceKind;
  compartmentLabel: string;
  isActive: boolean;
  activeJobCount: number;
  pendingTicketCount: number;
  stoppingTicketCount: number;
};

type UseWorkspaceTabsRuntimeOptions = {
  commitVisibleModeSelection: (mode: ModeId) => void;
  currentMode: ModeId;
  discardPendingHistoryTicketsForWorkspaceInstance: (workspaceInstanceId: WorkspaceInstanceId) => void;
  labsEnabled: boolean;
  markPendingHistoryTicketsForWorkspaceInstanceAsStopping: (
    workspaceInstanceId: WorkspaceInstanceId,
  ) => void;
  pendingHistoryTickets: readonly PendingHistoryTicket[];
  setEditorRuntimeStatusOverride: (status: string | null) => void;
  workspaceDisplayHost: WorkspaceDisplayStateHostRuntime;
  workspaceInstances: WorkspaceInstancesRuntime;
  workspaceRuntimeHost: WorkspaceRuntimeStateHostRuntime;
  workspaceStateHost: WorkspaceSurfaceStateHostRuntime;
};

function latestWorkspaceInstance(instances: readonly WorkspaceInstance[]) {
  return [...instances]
    .sort((left, right) =>
      left.lastActivatedAt === right.lastActivatedAt
        ? left.order - right.order
        : left.lastActivatedAt - right.lastActivatedAt)
    .at(-1) ?? null;
}

function nextWorkspaceKindAfterClose(
  instances: readonly WorkspaceInstance[],
  closingInstanceId: WorkspaceInstanceId,
): WorkspaceKind {
  const remaining = instances.filter((instance) => instance.id !== closingInstanceId);
  return latestWorkspaceInstance(remaining)?.workspaceKind ?? 'calculate';
}

export function useWorkspaceTabsRuntime({
  commitVisibleModeSelection,
  currentMode,
  discardPendingHistoryTicketsForWorkspaceInstance,
  labsEnabled,
  markPendingHistoryTicketsForWorkspaceInstanceAsStopping,
  pendingHistoryTickets,
  setEditorRuntimeStatusOverride,
  workspaceDisplayHost,
  workspaceInstances,
  workspaceRuntimeHost,
  workspaceStateHost,
}: UseWorkspaceTabsRuntimeOptions) {
  const jobSummaries = useMemo(() =>
    summarizeWorkspaceTabJobs({
      pendingHistoryTickets,
      workspaceInstances: workspaceInstances.workspaceInstances,
    }), [pendingHistoryTickets, workspaceInstances.workspaceInstances]);

  const tabs = useMemo<WorkspaceTabItem[]>(() =>
    workspaceInstances.workspaceInstances.map((instance) => {
      const summary = jobSummaries[instance.id] ?? {
        activeJobCount: 0,
        pendingTicketCount: 0,
        stoppingTicketCount: 0,
      };
      return {
        id: instance.id,
        title: instance.title,
        workspaceKind: instance.workspaceKind,
        compartmentLabel: instance.compartmentLabel,
        isActive: instance.id === workspaceInstances.activeInstanceId,
        activeJobCount: summary.activeJobCount,
        pendingTicketCount: summary.pendingTicketCount,
        stoppingTicketCount: summary.stoppingTicketCount,
      };
    }), [
      jobSummaries,
      workspaceInstances.activeInstanceId,
      workspaceInstances.workspaceInstances,
    ]);

  const focusTab = useCallback((instanceId: WorkspaceInstanceId) => {
    const target = workspaceInstances.workspaceInstances.find((instance) => instance.id === instanceId);
    if (!target || (target.workspaceKind === 'labs' && !labsEnabled)) {
      return;
    }

    workspaceDisplayHost.captureActiveDisplayState();
    workspaceRuntimeHost.captureActiveRuntimeState();
    workspaceStateHost.focusInstance(instanceId);
    commitVisibleModeSelection(target.workspaceKind);
  }, [
    commitVisibleModeSelection,
    labsEnabled,
    workspaceDisplayHost,
    workspaceRuntimeHost,
    workspaceInstances.workspaceInstances,
    workspaceStateHost,
  ]);

  const createTab = useCallback(() => {
    workspaceDisplayHost.captureActiveDisplayState();
    workspaceRuntimeHost.captureActiveRuntimeState();
    workspaceStateHost.createBlankInstance('calculate');
    commitVisibleModeSelection('calculate');
  }, [commitVisibleModeSelection, workspaceDisplayHost, workspaceRuntimeHost, workspaceStateHost]);

  const duplicateTab = useCallback((instanceId: WorkspaceInstanceId) => {
    const source = workspaceInstances.workspaceInstances.find((instance) => instance.id === instanceId);
    if (!source || (source.workspaceKind === 'labs' && !labsEnabled)) {
      return;
    }

    const capturedSurfaceState =
      source.id === workspaceInstances.activeInstanceId
        ? workspaceStateHost.captureActiveSurfaceState()
        : undefined;
    const capturedDisplayState =
      source.id === workspaceInstances.activeInstanceId
        ? workspaceDisplayHost.captureActiveDisplayState()
        : undefined;
    const capturedRuntimeState =
      source.id === workspaceInstances.activeInstanceId
        ? workspaceRuntimeHost.captureActiveRuntimeState()
        : undefined;
    workspaceInstances.duplicateInstance(
      instanceId,
      capturedSurfaceState,
      capturedDisplayState,
      capturedRuntimeState,
    );
    commitVisibleModeSelection(source.workspaceKind);
  }, [
    commitVisibleModeSelection,
    labsEnabled,
    workspaceDisplayHost,
    workspaceRuntimeHost,
    workspaceInstances,
    workspaceStateHost,
  ]);

  const cancelTabJobs = useCallback((instanceId: WorkspaceInstanceId, reason: string) =>
    requestWorkspaceTabJobCancellation(instanceId, reason), []);

  const closeTab = useCallback((instanceId: WorkspaceInstanceId) => {
    const target = workspaceInstances.workspaceInstances.find((instance) => instance.id === instanceId);
    if (!target) {
      return;
    }

    cancelTabJobs(instanceId, 'Workspace tab closed.');
    discardPendingHistoryTicketsForWorkspaceInstance(instanceId);
    const nextKind = target.id === workspaceInstances.activeInstanceId
      ? nextWorkspaceKindAfterClose(workspaceInstances.workspaceInstances, instanceId)
      : currentMode;
    if (target.id === workspaceInstances.activeInstanceId) {
      workspaceDisplayHost.captureActiveDisplayState();
      workspaceRuntimeHost.captureActiveRuntimeState();
    }
    workspaceInstances.closeInstance(instanceId);
    if (target.id === workspaceInstances.activeInstanceId) {
      commitVisibleModeSelection(nextKind);
    }
  }, [
    cancelTabJobs,
    commitVisibleModeSelection,
    currentMode,
    discardPendingHistoryTicketsForWorkspaceInstance,
    workspaceDisplayHost,
    workspaceInstances,
    workspaceRuntimeHost,
  ]);

  const closeOtherTabs = useCallback((instanceId: WorkspaceInstanceId) => {
    const target = workspaceInstances.workspaceInstances.find((instance) => instance.id === instanceId);
    if (!target || (target.workspaceKind === 'labs' && !labsEnabled)) {
      return;
    }

    for (const instance of workspaceInstances.workspaceInstances) {
      if (instance.id === instanceId) {
        continue;
      }
      cancelTabJobs(instance.id, 'Other workspace tabs closed.');
      discardPendingHistoryTicketsForWorkspaceInstance(instance.id);
    }
    workspaceDisplayHost.captureActiveDisplayState();
    workspaceRuntimeHost.captureActiveRuntimeState();
    workspaceInstances.closeOtherInstances(instanceId);
    commitVisibleModeSelection(target.workspaceKind);
  }, [
    cancelTabJobs,
    commitVisibleModeSelection,
    discardPendingHistoryTicketsForWorkspaceInstance,
    labsEnabled,
    workspaceDisplayHost,
    workspaceInstances,
    workspaceRuntimeHost,
  ]);

  const clearTabState = useCallback((instanceId: WorkspaceInstanceId) => {
    if (instanceId === workspaceInstances.activeInstanceId) {
      workspaceStateHost.restoreActiveSurfaceState(null);
      workspaceDisplayHost.restoreActiveDisplayState(null);
      workspaceRuntimeHost.restoreActiveRuntimeState(null);
    }
    workspaceInstances.clearInstanceState(instanceId);
  }, [workspaceDisplayHost, workspaceInstances, workspaceRuntimeHost, workspaceStateHost]);

  const stopTabJobs = useCallback((instanceId: WorkspaceInstanceId) => {
    const cancelled = cancelTabJobs(instanceId, 'Workspace tab Stop requested.');
    if (cancelled > 0) {
      markPendingHistoryTicketsForWorkspaceInstanceAsStopping(instanceId);
      if (instanceId === workspaceInstances.activeInstanceId) {
        setEditorRuntimeStatusOverride('Stop requested');
      }
    }
  }, [
    cancelTabJobs,
    markPendingHistoryTicketsForWorkspaceInstanceAsStopping,
    setEditorRuntimeStatusOverride,
    workspaceInstances.activeInstanceId,
  ]);

  return useMemo(() => ({
    onClearTabState: clearTabState,
    onCloseOtherTabs: closeOtherTabs,
    onCloseTab: closeTab,
    onCreateBlankTab: createTab,
    onDuplicateTab: duplicateTab,
    onFocusTab: focusTab,
    onRenameTab: workspaceInstances.renameInstance,
    onStopJobsInTab: stopTabJobs,
    tabs,
  }), [
    clearTabState,
    closeOtherTabs,
    closeTab,
    createTab,
    duplicateTab,
    focusTab,
    stopTabJobs,
    tabs,
    workspaceInstances.renameInstance,
  ]);
}
