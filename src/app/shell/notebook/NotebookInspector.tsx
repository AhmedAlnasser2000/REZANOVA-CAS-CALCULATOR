import type { Editor } from '@tiptap/core';
import {
  ArrowDown,
  ArrowUp,
  FilePenLine,
  MousePointer2,
  Pin,
  PinOff,
  Send,
  X,
} from 'lucide-react';

import {
  isNotebookLatexRunnable,
  type NotebookInspectorMode,
  type NotebookWorkspaceTarget,
} from '../../../lib/notebook';
import {
  convertSelectedNotebookMath,
  moveSelectedNotebookTopLevelNode,
  notebookTopLevelMoveState,
  updateSelectedNotebookMathTarget,
  type NotebookEditorSelection,
} from './canvas';
import { NotebookStructuredBlockInspector } from './NotebookStructuredBlockInspector';
import {
  canOpenNotebookToolTarget,
  NOTEBOOK_TOOL_TARGETS,
} from './tool-targets';

function selectionLabel(selection: NotebookEditorSelection | null) {
  if (!selection) {
    return 'Nothing selected';
  }
  const labels: Record<string, string> = {
    paragraph: 'Text',
    heading: 'Heading',
    inlineMath: 'Math in text',
    displayMath: 'Separate equation',
    semanticBlock: 'Academic container',
    evidenceSnapshot: 'Evidence snapshot',
    notebookSection: 'Section',
    bulletList: 'Bullet list',
    orderedList: 'Numbered list',
  };
  return labels[selection.type] ?? 'Document block';
}

type NotebookInspectorProps = {
  className?: string;
  editor: Editor | null;
  mode: NotebookInspectorMode;
  onClose: () => void;
  onOpenMathInTool: (target: NotebookWorkspaceTarget, latex: string) => void;
  onPinToggle: () => void;
  selection: NotebookEditorSelection | null;
};

export function NotebookInspector({
  className,
  editor,
  mode,
  onClose,
  onOpenMathInTool,
  onPinToggle,
  selection,
}: NotebookInspectorProps) {
  const isMath = selection?.type === 'inlineMath' || selection?.type === 'displayMath';
  const isSemantic = selection?.type === 'semanticBlock';
  const isSection = selection?.type === 'notebookSection';
  const target = String(selection?.attrs.workspaceTarget ?? 'calculate') as NotebookWorkspaceTarget;
  const latex = String(selection?.attrs.latex ?? '');
  const moveState = editor && selection?.id
    ? notebookTopLevelMoveState(editor, selection.id)
    : { canMoveUp: false, canMoveDown: false };
  const canOpen = Boolean(
    isMath
      && latex.trim()
      && canOpenNotebookToolTarget(target)
      && isNotebookLatexRunnable(latex),
  );

  return (
    <aside data-notebook-transient-layer="notebook-inspector-drawer" className={`notebook-inspector${className ? ` ${className}` : ''}`} data-testid="notebook-inspector">
      <div className="notebook-inspector-heading">
        <div>
          <span>Block inspector</span>
          <strong>{selectionLabel(selection)}</strong>
        </div>
        <div className="notebook-inspector-heading-actions">
          <button
            type="button"
            className="notebook-inspector-pin"
            aria-label={mode === 'pinned' ? 'Use automatic block inspector' : 'Pin block inspector'}
            aria-pressed={mode === 'pinned'}
            title={mode === 'pinned' ? 'Use automatic inspector' : 'Pin inspector'}
            onClick={onPinToggle}
          >
            {mode === 'pinned'
              ? <PinOff aria-hidden="true" size={16} />
              : <Pin aria-hidden="true" size={16} />}
          </button>
          <button
            type="button"
            className="notebook-drawer-close"
            aria-label="Close block inspector"
            title="Collapse inspector"
            onClick={onClose}
          >
            <X aria-hidden="true" size={17} />
          </button>
        </div>
      </div>

      {!selection ? (
        <div className="notebook-inspector-empty" data-testid="notebook-inspector-empty">
          <MousePointer2 aria-hidden="true" size={34} />
          <strong>Nothing selected</strong>
          <span>Select a container, section, or equation to inspect its settings.</span>
        </div>
      ) : null}

      {editor && selection && (isSemantic || isSection) ? (
        <NotebookStructuredBlockInspector editor={editor} selection={selection} />
      ) : null}

      {editor && isMath ? (
        <>
          <div className="notebook-inspector-section">
            <span>Math placement</span>
            <div className="notebook-inspector-segmented">
              <button
                type="button"
                className={selection?.type === 'inlineMath' ? 'is-active' : undefined}
                onClick={() => convertSelectedNotebookMath(editor, 'inline', selection)}
              >In text</button>
              <button
                type="button"
                className={selection?.type === 'displayMath' ? 'is-active' : undefined}
                onClick={() => convertSelectedNotebookMath(editor, 'display', selection)}
              >Separate equation</button>
            </div>
          </div>
          <div className="notebook-inspector-section">
            <label htmlFor="notebook-workspace-target">Workspace</label>
            <select
              id="notebook-workspace-target"
              value={target}
              onChange={(event) => updateSelectedNotebookMathTarget(
                editor,
                event.target.value as NotebookWorkspaceTarget,
                selection,
              )}
            >
              {NOTEBOOK_TOOL_TARGETS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}{item.live ? '' : ' (authoring only)'}
                </option>
              ))}
            </select>
          </div>
          <div className="notebook-inspector-section notebook-inspector-math-source">
            <span>Preserved source</span>
            <code>{String(selection?.attrs.sourceText ?? '') || 'Created directly in math mode'}</code>
            <button
              type="button"
              disabled={!canOpen}
              onClick={() => onOpenMathInTool(target, latex)}
            ><Send size={15} /> Open in Tool</button>
          </div>
        </>
      ) : null}

      {editor && selection?.id ? (
        <div className="notebook-inspector-section">
          <span>{isSemantic || isSection ? 'Arrangement' : 'Block order'}</span>
          <div className="notebook-inspector-actions">
            <button
              type="button"
              disabled={!moveState.canMoveUp}
              onClick={() => moveSelectedNotebookTopLevelNode(editor, 'up', selection.id)}
            ><ArrowUp size={15} /> Move Up</button>
            <button
              type="button"
              disabled={!moveState.canMoveDown}
              onClick={() => moveSelectedNotebookTopLevelNode(editor, 'down', selection.id)}
            ><ArrowDown size={15} /> Move Down</button>
          </div>
        </div>
      ) : null}

      <div className="notebook-session-status">
        <FilePenLine aria-hidden="true" size={17} />
        <div>
          <strong>Session draft</strong>
          <span>This Notebook stays with its app tab.</span>
        </div>
      </div>
    </aside>
  );
}
