export type WorkspaceRuntimeState = {
  clipboardNotice: string | null;
  editorAnalysisGeneration: number;
  editorAnalysisStopped: boolean;
  lastRuntimeElapsedMs: number | null;
  runtimeStatusOverride: string | null;
};

export const EMPTY_WORKSPACE_RUNTIME_STATE: WorkspaceRuntimeState = {
  clipboardNotice: null,
  editorAnalysisGeneration: 0,
  editorAnalysisStopped: false,
  lastRuntimeElapsedMs: null,
  runtimeStatusOverride: null,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeRuntimeElapsedMs(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : null;
}

export function normalizeWorkspaceRuntimeState(value: unknown): WorkspaceRuntimeState {
  if (!isRecord(value)) {
    return EMPTY_WORKSPACE_RUNTIME_STATE;
  }

  return {
    clipboardNotice: typeof value.clipboardNotice === 'string' ? value.clipboardNotice : null,
    editorAnalysisGeneration:
      typeof value.editorAnalysisGeneration === 'number'
        ? value.editorAnalysisGeneration
        : 0,
    editorAnalysisStopped:
      typeof value.editorAnalysisStopped === 'boolean'
        ? value.editorAnalysisStopped
        : false,
    lastRuntimeElapsedMs: normalizeRuntimeElapsedMs(value.lastRuntimeElapsedMs),
    runtimeStatusOverride:
      typeof value.runtimeStatusOverride === 'string'
        ? value.runtimeStatusOverride
        : null,
  };
}
