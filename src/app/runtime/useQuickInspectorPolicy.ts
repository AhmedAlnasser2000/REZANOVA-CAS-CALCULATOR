import { useEffect } from 'react';
import {
  type LeftInspectorSurface,
  type SideSurface,
} from './useSideSurfaceRuntime';
import {
  resolveWorkspaceSurfaceDescriptor,
} from './workspace-surfaces';
import type { WorkspaceKind } from './workspace-instances';

type UseQuickInspectorPolicyOptions = {
  activeWorkspaceKind: WorkspaceKind | null;
  closeLeftInspector: () => void;
  closeSideSurface: () => void;
  historyOpen: boolean;
  leftInspectorOutboardOpen: boolean;
  leftInspectorOverlayOpen: boolean;
  leftInspectorSurface: LeftInspectorSurface;
  ooeDiagnosticsOpen: boolean;
  settingsOpen: boolean;
  sideSurface: SideSurface;
  sideSurfaceOutboardOpen: boolean;
  sideSurfaceOverlayOpen: boolean;
  variablesOpen: boolean;
};

export function useQuickInspectorPolicy({
  activeWorkspaceKind,
  closeLeftInspector,
  closeSideSurface,
  historyOpen,
  leftInspectorOutboardOpen,
  leftInspectorOverlayOpen,
  leftInspectorSurface,
  ooeDiagnosticsOpen,
  settingsOpen,
  sideSurface,
  sideSurfaceOutboardOpen,
  sideSurfaceOverlayOpen,
  variablesOpen,
}: UseQuickInspectorPolicyOptions) {
  const descriptor = activeWorkspaceKind
    ? resolveWorkspaceSurfaceDescriptor(activeWorkspaceKind)
    : null;
  const quickInspectorsAllowed = descriptor?.allowsQuickInspectors ?? true;

  useEffect(() => {
    if (quickInspectorsAllowed) {
      return;
    }
    if (sideSurface !== 'none') {
      closeSideSurface();
    }
    if (leftInspectorSurface !== 'none') {
      closeLeftInspector();
    }
  }, [
    closeLeftInspector,
    closeSideSurface,
    leftInspectorSurface,
    quickInspectorsAllowed,
    sideSurface,
  ]);

  return {
    effectiveHistoryOpen: quickInspectorsAllowed && historyOpen,
    effectiveLeftInspectorOutboardOpen: quickInspectorsAllowed && leftInspectorOutboardOpen,
    effectiveLeftInspectorOverlayOpen: quickInspectorsAllowed && leftInspectorOverlayOpen,
    effectiveLeftInspectorSurface: quickInspectorsAllowed ? leftInspectorSurface : 'none',
    effectiveOoeDiagnosticsOpen: quickInspectorsAllowed && ooeDiagnosticsOpen,
    effectiveSettingsOpen: quickInspectorsAllowed && settingsOpen,
    effectiveSideSurface: quickInspectorsAllowed ? sideSurface : 'none',
    effectiveSideSurfaceOutboardOpen: quickInspectorsAllowed && sideSurfaceOutboardOpen,
    effectiveSideSurfaceOverlayOpen: quickInspectorsAllowed && sideSurfaceOverlayOpen,
    effectiveVariablesOpen: quickInspectorsAllowed && variablesOpen,
  } as const;
}
