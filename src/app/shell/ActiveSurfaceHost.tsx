import type { ReactNode } from 'react';
import type { SymbolicDisplayPrefs } from '../../lib/display/symbolic-display';
import type { WorkspaceInstance } from '../runtime/workspace-instances';
import { formulaViewerArtifactFromSurfaceState } from '../runtime/formula-viewer-artifacts';
import { FormulaViewerPage } from './FormulaViewerPage';

type ActiveSurfaceHostProps = {
  activeInstance: WorkspaceInstance | null | undefined;
  onCopyResult: (latex: string) => void;
  onFocusTab: (instanceId: string) => void;
  renderCalculatorSurface: () => ReactNode;
  symbolicDisplayPrefs: SymbolicDisplayPrefs;
  workspaceInstances: readonly WorkspaceInstance[];
};

export function ActiveSurfaceHost({
  activeInstance,
  onCopyResult,
  onFocusTab,
  renderCalculatorSurface,
  symbolicDisplayPrefs,
  workspaceInstances,
}: ActiveSurfaceHostProps) {
  const formulaViewerArtifact = formulaViewerArtifactFromSurfaceState(
    activeInstance?.surfaceState ?? null,
  );

  if (!formulaViewerArtifact) {
    return (
      <section
        className="active-surface active-surface--calculator"
        data-testid="active-surface-calculator"
      >
        {renderCalculatorSurface()}
      </section>
    );
  }

  const sourceId = formulaViewerArtifact.sourceWorkspaceInstanceId;
  const sourceAvailable = Boolean(
    sourceId && workspaceInstances.some((instance) => instance.id === sourceId),
  );

  return (
    <section
      className="active-surface active-surface--page active-surface--formula-viewer"
      data-surface-kind="formula-viewer"
      data-testid="active-surface-page"
    >
      <FormulaViewerPage
        artifact={formulaViewerArtifact}
        onBackToSource={sourceId ? () => onFocusTab(sourceId) : undefined}
        onCopyResult={onCopyResult}
        sourceAvailable={sourceAvailable}
        symbolicDisplayPrefs={symbolicDisplayPrefs}
      />
    </section>
  );
}
