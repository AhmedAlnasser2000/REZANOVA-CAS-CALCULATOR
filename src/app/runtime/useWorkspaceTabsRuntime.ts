import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  isNotebookLibrarySurfaceState,
  NOTEBOOK_WORKSPACE_CLOSE_EVENT,
  NOTEBOOK_WORKSPACE_FOCUS_EVENT,
  NOTEBOOK_WORKSPACE_OPEN_QUERY_EVENT,
  NOTEBOOK_WORKSPACE_TITLE_EVENT,
  type NotebookWorkspaceCloseDetail,
  type NotebookWorkspaceFocusDetail,
  type NotebookWorkspaceOpenQueryDetail,
  type NotebookWorkspaceTitleDetail,
} from '../../lib/notebook';
import type { ModeId, PendingHistoryTicket } from '../../types/calculator';
import type { FormulaViewerArtifact } from './formula-viewer-artifacts';
import {
  NOTEBOOK_PAGE_WORKSPACE_KIND,
  GRAPHING_PAGE_WORKSPACE_KIND,
  type SingletonAppPageWorkspaceKind,
} from './app-page-workspaces';
import type { useWorkspaceInstancesRuntime } from './useWorkspaceInstancesRuntime';
import type { useWorkspaceDisplayStateHostRuntime } from './useWorkspaceDisplayStateHostRuntime';
import type { useWorkspaceRuntimeStateHostRuntime } from './useWorkspaceRuntimeStateHostRuntime';
import type { useWorkspaceSurfaceStateHostRuntime } from './useWorkspaceSurfaceStateHostRuntime';
import {
  type WorkspaceInstance,
  type WorkspaceInstanceId,
  type WorkspaceKind,
  isWorkspaceModeKind,
} from './workspace-instances';
import {
  requestWorkspaceTabJobCancellation,
  subscribeToWorkspaceTabJobChanges,
  summarizeWorkspaceTabJobs,
} from './workspaceTabJobs';
import {
  resolveWorkspaceSurfaceDescriptor,
  type WorkspaceSurfaceKind,
  type WorkspaceTabActionPolicy,
} from './workspace-surfaces';

type WorkspaceInstancesRuntime = ReturnType<typeof useWorkspaceInstancesRuntime>;
type WorkspaceDisplayStateHostRuntime = ReturnType<typeof useWorkspaceDisplayStateHostRuntime>;
type WorkspaceRuntimeStateHostRuntime = ReturnType<typeof useWorkspaceRuntimeStateHostRuntime>;
type WorkspaceSurfaceStateHostRuntime = ReturnType<typeof useWorkspaceSurfaceStateHostRuntime>;

type WorkspaceTabItem = {
  id: WorkspaceInstanceId;
  title: string;
  workspaceKind: WorkspaceKind;
  surfaceKind: WorkspaceSurfaceKind;
  actionPolicy: WorkspaceTabActionPolicy;
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

function commitWorkspaceMode(
  commitVisibleModeSelection: (mode: ModeId) => void,
  workspaceKind: WorkspaceKind,
) {
  if (isWorkspaceModeKind(workspaceKind)) {
    commitVisibleModeSelection(workspaceKind);
  }
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
  const [ooeJobRevision, setOoeJobRevision] = useState(0);

  useEffect(() => subscribeToWorkspaceTabJobChanges(() => {
    setOoeJobRevision((revision) => revision + 1);
  }), []);

  const jobSummaries = summarizeWorkspaceTabJobs({
    pendingHistoryTickets,
    workspaceInstances: workspaceInstances.workspaceInstances,
  });
  void ooeJobRevision;

  const activeInstanceRef = useRef(workspaceInstances.activeInstance);

  useEffect(() => {
    const previous = activeInstanceRef.current;
    const current = workspaceInstances.activeInstance;
    if (previous?.workspaceKind === GRAPHING_PAGE_WORKSPACE_KIND
      && previous.id !== current?.id) {
      requestWorkspaceTabJobCancellation(
        previous.id,
        'Graph workspace became inactive.',
      );
    }
    activeInstanceRef.current = current;
  }, [workspaceInstances.activeInstance]);

  useEffect(() => () => {
    const activeInstance = activeInstanceRef.current;
    if (activeInstance?.workspaceKind === GRAPHING_PAGE_WORKSPACE_KIND) {
      requestWorkspaceTabJobCancellation(
        activeInstance.id,
        'Graph workspace runtime disposed.',
      );
    }
  }, []);

  const tabs = useMemo<WorkspaceTabItem[]>(() =>
    workspaceInstances.workspaceInstances.map((instance) => {
      const summary = jobSummaries[instance.id] ?? {
        activeJobCount: 0,
        pendingTicketCount: 0,
        stoppingTicketCount: 0,
      };
      const surfaceDescriptor = resolveWorkspaceSurfaceDescriptor(instance.workspaceKind);
      return {
        actionPolicy: surfaceDescriptor.tabActionPolicy,
        id: instance.id,
        title: instance.title,
        workspaceKind: instance.workspaceKind,
        surfaceKind: surfaceDescriptor.surfaceKind,
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
    commitWorkspaceMode(commitVisibleModeSelection, target.workspaceKind);
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
    if (!resolveWorkspaceSurfaceDescriptor(source.workspaceKind).tabActionPolicy.canDuplicate) {
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
    commitWorkspaceMode(commitVisibleModeSelection, source.workspaceKind);
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
      commitWorkspaceMode(commitVisibleModeSelection, nextKind);
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
    commitWorkspaceMode(commitVisibleModeSelection, target.workspaceKind);
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
    const target = workspaceInstances.workspaceInstances.find((instance) => instance.id === instanceId);
    if (!target || !resolveWorkspaceSurfaceDescriptor(target.workspaceKind).tabActionPolicy.canClearState) {
      return;
    }

    if (instanceId === workspaceInstances.activeInstanceId) {
      workspaceStateHost.restoreActiveSurfaceState(null);
      workspaceDisplayHost.restoreActiveDisplayState(null);
      workspaceRuntimeHost.restoreActiveRuntimeState(null);
    }
    workspaceInstances.clearInstanceState(instanceId);
  }, [workspaceDisplayHost, workspaceInstances, workspaceRuntimeHost, workspaceStateHost]);

  const stopTabJobs = useCallback((instanceId: WorkspaceInstanceId) => {
    const target = workspaceInstances.workspaceInstances.find((instance) => instance.id === instanceId);
    if (!target || !resolveWorkspaceSurfaceDescriptor(target.workspaceKind).tabActionPolicy.canStopJobs) {
      return;
    }

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
    workspaceInstances.workspaceInstances,
  ]);

  const openFormulaViewerTab = useCallback((artifact: FormulaViewerArtifact) => {
    workspaceDisplayHost.captureActiveDisplayState();
    workspaceRuntimeHost.captureActiveRuntimeState();
    workspaceStateHost.captureActiveSurfaceState();
    workspaceInstances.openFormulaViewerInstance(artifact);
  }, [
    workspaceDisplayHost,
    workspaceInstances,
    workspaceRuntimeHost,
    workspaceStateHost,
  ]);

  const openAppPageTab = useCallback((workspaceKind: SingletonAppPageWorkspaceKind) => {
    workspaceDisplayHost.captureActiveDisplayState();
    workspaceRuntimeHost.captureActiveRuntimeState();
    workspaceStateHost.captureActiveSurfaceState();
    workspaceInstances.openAppPageInstance(workspaceKind);
  }, [
    workspaceDisplayHost,
    workspaceInstances,
    workspaceRuntimeHost,
    workspaceStateHost,
  ]);

  const createNotebookPageTab = useCallback(() => {
    workspaceDisplayHost.captureActiveDisplayState();
    workspaceRuntimeHost.captureActiveRuntimeState();
    workspaceStateHost.captureActiveSurfaceState();
    workspaceStateHost.createBlankInstance(NOTEBOOK_PAGE_WORKSPACE_KIND);
  }, [
    workspaceDisplayHost,
    workspaceRuntimeHost,
    workspaceStateHost,
  ]);

  const createGraphPageTab = useCallback(() => {
    workspaceDisplayHost.captureActiveDisplayState();
    workspaceRuntimeHost.captureActiveRuntimeState();
    workspaceStateHost.captureActiveSurfaceState();
    workspaceStateHost.createBlankInstance(GRAPHING_PAGE_WORKSPACE_KIND);
  }, [
    workspaceDisplayHost,
    workspaceRuntimeHost,
    workspaceStateHost,
  ]);

  const renameTab = useCallback((instanceId: WorkspaceInstanceId, title: string) => {
    const target = workspaceInstances.workspaceInstances.find((instance) => instance.id === instanceId);
    if (!target || !resolveWorkspaceSurfaceDescriptor(target.workspaceKind).tabActionPolicy.canRename) {
      return;
    }
    workspaceInstances.renameInstance(instanceId, title);
  }, [workspaceInstances]);

  const syncNotebookTitle = useCallback((instanceId: WorkspaceInstanceId, title: string) => {
    const target = workspaceInstances.workspaceInstances.find((instance) => (
      instance.id === instanceId && instance.workspaceKind === NOTEBOOK_PAGE_WORKSPACE_KIND
    ));
    if (target) {
      workspaceInstances.renameInstance(instanceId, title);
    }
  }, [workspaceInstances]);

  useEffect(() => {
    const focusNotebook = (event: Event) => {
      const detail = (event as CustomEvent<NotebookWorkspaceFocusDetail>).detail;
      const target = workspaceInstances.workspaceInstances.find((instance) => (
        instance.workspaceKind === NOTEBOOK_PAGE_WORKSPACE_KIND
        && isNotebookLibrarySurfaceState(instance.surfaceState)
        && instance.surfaceState.libraryId === detail?.libraryId
      ));
      if (!target || !detail) {
        return;
      }
      detail.handled = true;
      focusTab(target.id);
    };
    const closeNotebook = (event: Event) => {
      const detail = (event as CustomEvent<NotebookWorkspaceCloseDetail>).detail;
      if (detail?.instanceId) {
        closeTab(detail.instanceId);
      }
    };
    const titleNotebook = (event: Event) => {
      const detail = (event as CustomEvent<NotebookWorkspaceTitleDetail>).detail;
      if (detail?.instanceId) {
        syncNotebookTitle(detail.instanceId, detail.title);
      }
    };
    const queryNotebookOpen = (event: Event) => {
      const detail = (event as CustomEvent<NotebookWorkspaceOpenQueryDetail>).detail;
      if (!detail?.libraryId) {
        return;
      }
      detail.open = workspaceInstances.workspaceInstances.some((instance) => (
        instance.id !== detail.excludingInstanceId
        && instance.workspaceKind === NOTEBOOK_PAGE_WORKSPACE_KIND
        && isNotebookLibrarySurfaceState(instance.surfaceState)
        && instance.surfaceState.libraryId === detail.libraryId
      ));
    };
    window.addEventListener(NOTEBOOK_WORKSPACE_FOCUS_EVENT, focusNotebook);
    window.addEventListener(NOTEBOOK_WORKSPACE_CLOSE_EVENT, closeNotebook);
    window.addEventListener(NOTEBOOK_WORKSPACE_TITLE_EVENT, titleNotebook);
    window.addEventListener(NOTEBOOK_WORKSPACE_OPEN_QUERY_EVENT, queryNotebookOpen);
    return () => {
      window.removeEventListener(NOTEBOOK_WORKSPACE_FOCUS_EVENT, focusNotebook);
      window.removeEventListener(NOTEBOOK_WORKSPACE_CLOSE_EVENT, closeNotebook);
      window.removeEventListener(NOTEBOOK_WORKSPACE_TITLE_EVENT, titleNotebook);
      window.removeEventListener(NOTEBOOK_WORKSPACE_OPEN_QUERY_EVENT, queryNotebookOpen);
    };
  }, [closeTab, focusTab, syncNotebookTitle, workspaceInstances.workspaceInstances]);

  return useMemo(() => ({
    onClearTabState: clearTabState,
    onCloseOtherTabs: closeOtherTabs,
    onCloseTab: closeTab,
    onCreateBlankTab: createTab,
    onCreateGraphPageTab: createGraphPageTab,
    onDuplicateTab: duplicateTab,
    onFocusTab: focusTab,
    onCreateNotebookPageTab: createNotebookPageTab,
    onOpenAppPageTab: openAppPageTab,
    onOpenFormulaViewerTab: openFormulaViewerTab,
    onRenameTab: renameTab,
    onStopJobsInTab: stopTabJobs,
    tabs,
  }), [
    clearTabState,
    closeOtherTabs,
    closeTab,
    createTab,
    createGraphPageTab,
    duplicateTab,
    focusTab,
    createNotebookPageTab,
    openAppPageTab,
    openFormulaViewerTab,
    renameTab,
    stopTabJobs,
    tabs,
  ]);
}
