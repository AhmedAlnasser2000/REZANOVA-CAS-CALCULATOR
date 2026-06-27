import type { FormulaViewerSourceContext } from './formula-viewer-artifacts';
import type { WorkspaceInstance } from './workspace-instances';

export function formulaViewerSourceContextForWorkspaceInstance(
  instance: WorkspaceInstance | null | undefined,
): FormulaViewerSourceContext {
  return {
    sourceWorkspaceInstanceId: instance?.id ?? null,
    sourceWorkspaceKind: instance?.workspaceKind ?? null,
    sourceWorkspaceTitle: instance?.title ?? null,
  };
}
