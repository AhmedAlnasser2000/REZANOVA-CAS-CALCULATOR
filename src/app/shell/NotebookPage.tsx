import type { Editor } from '@tiptap/core';
import {
  PanelLeftOpen,
  PanelRightOpen,
} from 'lucide-react';
import { useCallback, useState } from 'react';

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
  type NotebookEditorSelection,
} from './notebook/canvas';
import { NotebookMathFieldProvider } from './notebook/math-field';
import { NotebookInspector } from './notebook/NotebookInspector';
import { NotebookOutline } from './notebook/NotebookOutline';

type NotebookPageProps = {
  instanceId: string;
  onOpenMathInTool: (target: NotebookWorkspaceTarget, latex: string) => void;
  onUpdateSurfaceState: (instanceId: string, state: NotebookSurfaceState) => void;
  surfaceState: WorkspaceInstanceStateSlot;
};

type NotebookDrawer = 'outline' | 'inspector' | null;

export function NotebookPage({
  instanceId,
  onOpenMathInTool,
  onUpdateSurfaceState,
  surfaceState,
}: NotebookPageProps) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [selection, setSelection] = useState<NotebookEditorSelection | null>(null);
  const [activeDrawer, setActiveDrawer] = useState<NotebookDrawer>(null);
  const notebookState = notebookRichSurfaceStateFromSlot(surfaceState, {
    idPrefix: instanceId,
  });
  const { document } = notebookState;

  const commitDocument = useCallback((nextDocument: NotebookRichDocument) => {
    onUpdateSurfaceState(instanceId, {
      kind: 'notebook-surface-state',
      document: nextDocument,
    });
  }, [instanceId, onUpdateSurfaceState]);

  function toggleDrawer(drawer: Exclude<NotebookDrawer, null>) {
    setActiveDrawer((current) => current === drawer ? null : drawer);
  }

  return (
    <NotebookMathFieldProvider>
      <section className="app-page app-page--notebook" data-testid="notebook-page">
        <header className="app-page-shell-header">REZANOVA CLASSWIZ CALCULATOR</header>
        <div className="notebook-page-workbench">
          <NotebookOutline
            className={activeDrawer === 'outline' ? 'is-drawer-open' : undefined}
            document={document}
            editor={editor}
            selectedNodeId={selection?.id ?? document.selectedNodeId}
            onClose={() => setActiveDrawer(null)}
          />
          <main className="notebook-canvas" data-testid="notebook-canvas">
            <div className="notebook-canvas-header">
              <div className="notebook-canvas-heading-row">
                <span>Math-aware document</span>
                <div className="notebook-drawer-toggles">
                  <button
                    type="button"
                    aria-label="Toggle Notebook outline"
                    aria-pressed={activeDrawer === 'outline'}
                    title="Outline"
                    onClick={() => toggleDrawer('outline')}
                  ><PanelLeftOpen aria-hidden="true" size={17} /></button>
                  <button
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
              onSelectionChange={setSelection}
            />
            <NotebookAuthoringKeyboard />
          </main>
          <NotebookInspector
            className={activeDrawer === 'inspector' ? 'is-drawer-open' : undefined}
            editor={editor}
            selection={selection}
            onClose={() => setActiveDrawer(null)}
            onOpenMathInTool={onOpenMathInTool}
          />
          {activeDrawer ? (
            <button
              type="button"
              className="notebook-drawer-backdrop"
              aria-label="Close Notebook drawer"
              onClick={() => setActiveDrawer(null)}
            />
          ) : null}
        </div>
        <footer className="app-page-shell-footer">
          <span>Ready</span>
          <span>Workspace: Notebook</span>
          <span>Session draft</span>
        </footer>
      </section>
    </NotebookMathFieldProvider>
  );
}
