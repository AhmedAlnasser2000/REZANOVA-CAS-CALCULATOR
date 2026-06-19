import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { EditorAnalysisControlState } from '../../lib/editor/editor-analysis-control';
import type {
  WorkspaceInstance,
  WorkspaceInstanceId,
  WorkspaceInstanceStateSlot,
  WorkspaceInstanceStateSlotUpdater,
} from './workspace-instances';
import {
  normalizeWorkspaceRuntimeState,
  type WorkspaceRuntimeState,
} from './workspace-runtime-state';

type UpdateWorkspaceRuntimeState = (
  instanceId: WorkspaceInstanceId,
  runtimeState: WorkspaceInstanceStateSlot | WorkspaceInstanceStateSlotUpdater,
) => void;

type UseActiveWorkspaceRuntimeStatusOptions = {
  activeInstance: WorkspaceInstance | null;
  restartEditorAnalysis: () => void;
  updateInstanceRuntimeState: UpdateWorkspaceRuntimeState;
};

export function useActiveWorkspaceRuntimeStatus({
  activeInstance,
  restartEditorAnalysis,
  updateInstanceRuntimeState,
}: UseActiveWorkspaceRuntimeStatusOptions) {
  const [clipboardNotice, setClipboardNotice] = useState<string | null>(null);
  const [editorAnalysisStopped, setEditorAnalysisStopped] = useState(false);
  const [editorAnalysisGeneration, setEditorAnalysisGeneration] = useState(0);
  const [lastRuntimeElapsedMs, setLastRuntimeElapsedMs] = useState<number | null>(null);
  const [editorRuntimeStatusOverride, setEditorRuntimeStatusOverride] = useState<string | null>(null);
  const activeRuntimeKey = activeInstance
    ? `${activeInstance.id}:${activeInstance.navigationRevision}`
    : null;
  const activeRuntimeKeyRef = useRef<string | null>(activeRuntimeKey);

  const editorAnalysisControl = useMemo<EditorAnalysisControlState>(
    () => ({
      generation: editorAnalysisGeneration,
      restartEditor: restartEditorAnalysis,
      stopped: editorAnalysisStopped,
    }),
    [editorAnalysisGeneration, editorAnalysisStopped, restartEditorAnalysis],
  );

  const activeRuntimeState = useMemo<WorkspaceRuntimeState>(() => ({
    clipboardNotice,
    editorAnalysisGeneration,
    editorAnalysisStopped,
    lastRuntimeElapsedMs,
    runtimeStatusOverride: editorRuntimeStatusOverride,
  }), [
    clipboardNotice,
    editorAnalysisGeneration,
    editorAnalysisStopped,
    lastRuntimeElapsedMs,
    editorRuntimeStatusOverride,
  ]);

  const restoreRuntimeState = useCallback((state: WorkspaceRuntimeState) => {
    setClipboardNotice(state.clipboardNotice);
    setEditorAnalysisGeneration(state.editorAnalysisGeneration);
    setEditorAnalysisStopped(state.editorAnalysisStopped);
    setLastRuntimeElapsedMs(state.lastRuntimeElapsedMs);
    setEditorRuntimeStatusOverride(state.runtimeStatusOverride);
  }, []);

  useEffect(() => {
    activeRuntimeKeyRef.current = activeRuntimeKey;
  }, [activeRuntimeKey]);

  useEffect(() => {
    if (!editorRuntimeStatusOverride || !activeInstance) {
      return;
    }

    const runtimeKey = activeRuntimeKey;
    const workspaceInstanceId = activeInstance.id;
    const timeoutId = window.setTimeout(() => {
      updateInstanceRuntimeState(workspaceInstanceId, (currentState) => ({
        ...normalizeWorkspaceRuntimeState(currentState),
        runtimeStatusOverride: null,
      }));
      if (activeRuntimeKeyRef.current === runtimeKey) {
        setEditorRuntimeStatusOverride(null);
      }
    }, 1500);

    return () => window.clearTimeout(timeoutId);
  }, [activeInstance, activeRuntimeKey, editorRuntimeStatusOverride, updateInstanceRuntimeState]);

  useEffect(() => {
    if (!clipboardNotice || !activeInstance) {
      return;
    }

    const runtimeKey = activeRuntimeKey;
    const workspaceInstanceId = activeInstance.id;
    const timeoutId = window.setTimeout(() => {
      updateInstanceRuntimeState(workspaceInstanceId, (currentState) => ({
        ...normalizeWorkspaceRuntimeState(currentState),
        clipboardNotice: null,
      }));
      if (activeRuntimeKeyRef.current === runtimeKey) {
        setClipboardNotice(null);
      }
    }, 1800);

    return () => window.clearTimeout(timeoutId);
  }, [activeInstance, activeRuntimeKey, clipboardNotice, updateInstanceRuntimeState]);

  return {
    activeRuntimeState,
    clipboardNotice,
    editorAnalysisControl,
    editorAnalysisStopped,
    editorRuntimeStatusOverride,
    lastRuntimeElapsedMs,
    restoreRuntimeState,
    setClipboardNotice,
    setEditorAnalysisGeneration,
    setEditorAnalysisStopped,
    setEditorRuntimeStatusOverride,
    setLastRuntimeElapsedMs,
  };
}
