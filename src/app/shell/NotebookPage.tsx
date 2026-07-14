import type { Editor } from '@tiptap/core';
import {
  PanelLeftOpen,
  PanelRightOpen,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';

import {
  countNotebookBlocks,
  notebookRichSurfaceStateFromSlot,
  type NotebookRichDocument,
  type NotebookSurfaceState,
  type NotebookWorkspaceTarget,
} from '../../lib/notebook';
import type { WorkspaceInstanceStateSlot } from '../runtime/workspace-instances';
import { NotebookAuthoringKeyboard } from './notebook/authoring-keyboard';
import {
  NotebookRichCanvas,
  notebookEditorNodeById,
  selectNotebookEditorNode,
  type NotebookEditorSelection,
} from './notebook/canvas';
import {
  NotebookMathFieldProvider,
  useNotebookMathFieldController,
} from './notebook/math-field';
import { NotebookInspector } from './notebook/NotebookInspector';
import { NotebookOutline } from './notebook/NotebookOutline';
import { NotebookPaneResizer } from './notebook/NotebookPaneResizer';
import {
  NotebookTransientLayerProvider,
  useNotebookTransientLayer,
} from './notebook/transient-ui';
import { useNotebookUiState } from './notebook/useNotebookUiState';

type NotebookPageProps = {
  instanceId: string;
  onOpenMathInTool: (target: NotebookWorkspaceTarget, latex: string) => void;
  onUpdateSurfaceState: (instanceId: string, state: NotebookSurfaceState) => void;
  surfaceState: WorkspaceInstanceStateSlot;
};

type NotebookDrawer = 'outline' | 'inspector' | null;

function selectionUsesInspector(
  selection: NotebookEditorSelection | null,
): selection is NotebookEditorSelection {
  return selection?.type === 'inlineMath'
    || selection?.type === 'displayMath'
    || selection?.type === 'semanticBlock'
    || selection?.type === 'notebookSection';
}

function NotebookPageContent({
  instanceId,
  onOpenMathInTool,
  onUpdateSurfaceState,
  surfaceState,
}: NotebookPageProps) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [selection, setSelection] = useState<NotebookEditorSelection | null>(null);
  const [lastRelevantSelection, setLastRelevantSelection] = useState<NotebookEditorSelection | null>(null);
  const { active: activeMathField } = useNotebookMathFieldController();
  const workbenchRef = useRef<HTMLDivElement | null>(null);
  const collapsedInspectorSelectionIdRef = useRef<string | null>(null);
  const { patchUiState, uiState } = useNotebookUiState(instanceId);
  const outlineDrawer = useNotebookTransientLayer({ id: 'notebook-outline-drawer' });
  const inspectorDrawer = useNotebookTransientLayer({ id: 'notebook-inspector-drawer' });
  const activeDrawer: NotebookDrawer = outlineDrawer.isOpen
    ? 'outline'
    : inspectorDrawer.isOpen ? 'inspector' : null;
  const notebookState = notebookRichSurfaceStateFromSlot(surfaceState, {
    idPrefix: instanceId,
  });
  const { document } = notebookState;
  const workbenchStyle = {
    '--notebook-inspector-width': `${uiState.inspectorWidth}px`,
    '--notebook-outline-width': `${uiState.outlineWidth}px`,
  } as CSSProperties;
  const focusedMathSelection = editor
    && activeMathField?.field.matches(':focus')
    ? notebookEditorNodeById(editor, activeMathField.nodeId)
    : null;
  const currentRelevantSelection = focusedMathSelection ?? selection;
  const currentSelectionUsesInspector = selectionUsesInspector(currentRelevantSelection);
  const inspectorIsVisible = uiState.inspectorMode === 'pinned'
    || (uiState.inspectorMode === 'auto' && currentSelectionUsesInspector);
  const inspectedSelection = uiState.inspectorMode === 'pinned'
    ? lastRelevantSelection ?? (currentSelectionUsesInspector ? currentRelevantSelection : null)
    : currentSelectionUsesInspector ? currentRelevantSelection : null;

  const commitDocument = useCallback((nextDocument: NotebookRichDocument) => {
    onUpdateSurfaceState(instanceId, {
      kind: 'notebook-surface-state',
      document: nextDocument,
    });
  }, [instanceId, onUpdateSurfaceState]);

  const handleSelectionChange = useCallback((nextSelection: NotebookEditorSelection | null) => {
    setSelection(nextSelection);
    if (!selectionUsesInspector(nextSelection)) {
      return;
    }
    setLastRelevantSelection(nextSelection);
    if (
      uiState.inspectorMode === 'collapsed'
      && nextSelection.id !== collapsedInspectorSelectionIdRef.current
    ) {
      collapsedInspectorSelectionIdRef.current = null;
      patchUiState({ inspectorMode: 'auto' });
    }
  }, [patchUiState, uiState.inspectorMode]);

  useEffect(() => {
    if (!selectionUsesInspector(focusedMathSelection)) {
      return;
    }
    setLastRelevantSelection(focusedMathSelection);
    if (
      uiState.inspectorMode === 'collapsed'
      && focusedMathSelection.id !== collapsedInspectorSelectionIdRef.current
    ) {
      collapsedInspectorSelectionIdRef.current = null;
      patchUiState({ inspectorMode: 'auto' });
    }
  }, [focusedMathSelection?.id, focusedMathSelection?.type, patchUiState, uiState.inspectorMode]);

  function toggleDrawer(drawer: Exclude<NotebookDrawer, null>) {
    if (drawer === 'outline') {
      patchUiState({ outlineCollapsed: false });
      outlineDrawer.toggle();
    } else {
      if (uiState.inspectorMode === 'collapsed') {
        collapsedInspectorSelectionIdRef.current = null;
        patchUiState({ inspectorMode: 'auto' });
      }
      inspectorDrawer.toggle();
    }
  }

  function restoreInspector() {
    collapsedInspectorSelectionIdRef.current = null;
    patchUiState({ inspectorMode: 'auto' });
    if (editor && lastRelevantSelection?.id) {
      selectNotebookEditorNode(editor, lastRelevantSelection.id);
    }
  }

  return (
      <section className="app-page app-page--notebook" data-testid="notebook-page">
        <header className="app-page-shell-header">REZANOVA CLASSWIZ CALCULATOR</header>
        <div
          ref={workbenchRef}
          className={`notebook-page-workbench${uiState.outlineCollapsed ? ' is-outline-collapsed' : ''}${!inspectorIsVisible ? ' is-inspector-collapsed' : ''}`}
          style={workbenchStyle}
        >
          <NotebookOutline
            className={activeDrawer === 'outline' ? 'is-drawer-open' : undefined}
            document={document}
            editor={editor}
            selectedNodeId={inspectedSelection?.id ?? document.selectedNodeId}
            onClose={() => {
              patchUiState({ outlineCollapsed: true });
              outlineDrawer.close(false);
            }}
          />
          {!uiState.outlineCollapsed ? <NotebookPaneResizer
            containerRef={workbenchRef}
            defaultWidth={320}
            maxWidth={480}
            minWidth={240}
            onResize={(outlineWidth) => patchUiState({ outlineWidth })}
            otherPaneWidth={uiState.inspectorWidth}
            side="outline"
            width={uiState.outlineWidth}
          /> : null}
          <main className="notebook-canvas" data-testid="notebook-canvas">
            <div className="notebook-canvas-header">
              <div className="notebook-canvas-heading-row">
                <span>Math-aware document</span>
                <div className="notebook-drawer-toggles">
                  <button
                    data-notebook-transient-trigger={outlineDrawer.id}
                    type="button"
                    aria-label="Toggle Notebook outline"
                    aria-pressed={activeDrawer === 'outline'}
                    title="Outline"
                    onClick={() => toggleDrawer('outline')}
                  ><PanelLeftOpen aria-hidden="true" size={17} /></button>
                  <button
                    data-notebook-transient-trigger={inspectorDrawer.id}
                    type="button"
                    aria-label="Toggle block inspector"
                    aria-pressed={activeDrawer === 'inspector'}
                    title="Block inspector"
                    onClick={() => toggleDrawer('inspector')}
                  ><PanelRightOpen aria-hidden="true" size={17} /></button>
                </div>
              </div>
              <input
                aria-label="Notebook title"
                value={document.title}
                onChange={(event) => commitDocument({
                  ...document,
                  title: event.target.value,
                  updatedAt: new Date().toISOString(),
                })}
              />
              <div className="notebook-canvas-meta">
                <span>{countNotebookBlocks(document.content)} blocks</span>
                <span>Session draft</span>
              </div>
            </div>
            <NotebookRichCanvas
              document={document}
              onChange={commitDocument}
              onEditorChange={setEditor}
              onOpenMathInTool={onOpenMathInTool}
              onSelectionChange={handleSelectionChange}
            />
            <NotebookAuthoringKeyboard instanceId={instanceId} />
          </main>
          {inspectorIsVisible ? <NotebookPaneResizer
            containerRef={workbenchRef}
            defaultWidth={300}
            maxWidth={460}
            minWidth={250}
            onResize={(inspectorWidth) => patchUiState({ inspectorWidth })}
            otherPaneWidth={uiState.outlineWidth}
            side="inspector"
            width={uiState.inspectorWidth}
          /> : null}
          {inspectorIsVisible || activeDrawer === 'inspector' ? (
            <NotebookInspector
              className={activeDrawer === 'inspector' ? 'is-drawer-open' : undefined}
              editor={editor}
              mode={uiState.inspectorMode}
              selection={inspectedSelection}
              onClose={() => {
                collapsedInspectorSelectionIdRef.current = inspectedSelection?.id ?? null;
                patchUiState({ inspectorMode: 'collapsed' });
                inspectorDrawer.close(false);
              }}
              onOpenMathInTool={onOpenMathInTool}
              onPinToggle={() => {
                collapsedInspectorSelectionIdRef.current = null;
                patchUiState({
                  inspectorMode: uiState.inspectorMode === 'pinned' ? 'auto' : 'pinned',
                });
              }}
            />
          ) : null}
          {uiState.outlineCollapsed ? (
            <button
              type="button"
              className="notebook-collapsed-rail notebook-collapsed-rail--outline"
              aria-label="Restore Notebook outline"
              title="Restore outline"
              onClick={() => patchUiState({ outlineCollapsed: false })}
            ><PanelLeftOpen aria-hidden="true" size={17} /></button>
          ) : null}
          {!inspectorIsVisible ? (
            <button
              type="button"
              className="notebook-collapsed-rail notebook-collapsed-rail--inspector"
              aria-label="Restore block inspector"
              title="Restore inspector"
              onClick={restoreInspector}
            ><PanelRightOpen aria-hidden="true" size={17} /></button>
          ) : null}
          {activeDrawer ? (
            <button
              type="button"
              className="notebook-drawer-backdrop"
              aria-label="Close Notebook drawer"
              onClick={() => activeDrawer === 'outline'
                ? outlineDrawer.close(false)
                : inspectorDrawer.close(false)}
            />
          ) : null}
        </div>
        <footer className="app-page-shell-footer">
          <span>Ready</span>
          <span>Workspace: Notebook</span>
          <span>Session draft</span>
        </footer>
      </section>
  );
}

export function NotebookPage(props: NotebookPageProps) {
  return (
    <NotebookTransientLayerProvider>
      <NotebookMathFieldProvider>
        <NotebookPageContent {...props} />
      </NotebookMathFieldProvider>
    </NotebookTransientLayerProvider>
  );
}
