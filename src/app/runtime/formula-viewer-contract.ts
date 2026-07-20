import type { DisplayBlock } from '../../lib/display/result/display-blocks';
import type { WorkspaceInstanceId } from '../../types/calculator/workspace-instance-types';

export const FORMULA_VIEWER_WORKSPACE_KIND = 'formula-viewer' as const;

export type FormulaViewerWorkspaceKind = typeof FORMULA_VIEWER_WORKSPACE_KIND;

export type FormulaViewerSourceContext = {
  sourceWorkspaceInstanceId?: WorkspaceInstanceId | string | null;
  sourceWorkspaceKind?: string | null;
  sourceWorkspaceTitle?: string | null;
  sourceExpressionLatex?: string | null;
  resolvedInputLatex?: string | null;
  resultTitle?: string | null;
  copyLatex?: string | null;
};

export type FormulaViewerArtifact = {
  kind: 'formula-viewer-artifact';
  id: string;
  resultSignature: string;
  sourceWorkspaceInstanceId: WorkspaceInstanceId | string | null;
  sourceWorkspaceKind: string | null;
  sourceWorkspaceTitle: string | null;
  sourceExpressionLatex: string;
  resolvedInputLatex: string;
  resultTitle: string;
  copyLatex: string;
  primaryBlock: DisplayBlock;
  globalFactBlocks: DisplayBlock[];
  detailBlocks: DisplayBlock[];
  rowCount: number;
  groupCount: number;
  countSummary?: import('../../lib/display/result/display-blocks').DisplayBlockCountSummary;
  latexLength: number;
  createdAt: number;
  trustSummary?: string;
};

export type FormulaViewerSurfaceState = {
  kind: 'formula-viewer';
  artifact: FormulaViewerArtifact;
};

export function formulaViewerSurfaceState(
  artifact: FormulaViewerArtifact,
): FormulaViewerSurfaceState {
  return { artifact, kind: 'formula-viewer' };
}

export function formulaViewerArtifactFromSurfaceState(
  state: unknown,
): FormulaViewerArtifact | null {
  if (!state || typeof state !== 'object') return null;
  const candidate = state as Partial<FormulaViewerSurfaceState>;
  return candidate.kind === 'formula-viewer'
    && candidate.artifact?.kind === 'formula-viewer-artifact'
    ? candidate.artifact
    : null;
}
