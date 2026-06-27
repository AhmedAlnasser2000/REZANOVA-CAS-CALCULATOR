import type { ReactNode } from 'react';
import type { SymbolicDisplayPrefs } from '../../lib/display/symbolic-display';
import type { WorkspaceInstance } from '../runtime/workspace-instances';
import {
  formulaViewerArtifactFromSurfaceState,
} from '../runtime/formula-viewer-artifacts';
import { FormulaViewerPage } from './FormulaViewerPage';

type FormulaViewerWorkspaceGateProps = {
  activeInstance: WorkspaceInstance | null | undefined;
  children: ReactNode;
  onCopyResult: (latex: string) => void;
  onFocusTab: (instanceId: string) => void;
  symbolicDisplayPrefs: SymbolicDisplayPrefs;
  workspaceInstances: readonly WorkspaceInstance[];
};

export function FormulaViewerWorkspaceGate({
  activeInstance,
  children,
  onCopyResult,
  onFocusTab,
  symbolicDisplayPrefs,
  workspaceInstances,
}: FormulaViewerWorkspaceGateProps) {
  const artifact = formulaViewerArtifactFromSurfaceState(activeInstance?.surfaceState ?? null);

  if (!artifact) {
    return <>{children}</>;
  }

  const sourceId = artifact.sourceWorkspaceInstanceId;
  const sourceAvailable = Boolean(
    sourceId && workspaceInstances.some((instance) => instance.id === sourceId),
  );

  return (
    <FormulaViewerPage
      artifact={artifact}
      onBackToSource={() => sourceId ? onFocusTab(sourceId) : undefined}
      onCopyResult={onCopyResult}
      sourceAvailable={sourceAvailable}
      symbolicDisplayPrefs={symbolicDisplayPrefs}
    />
  );
}
