import type { Editor } from '@tiptap/core';
import {
  ArrowDown,
  ArrowUp,
  FilePenLine,
  Italic,
  Send,
  Type,
  X,
} from 'lucide-react';

import {
  isNotebookLatexRunnable,
  NOTEBOOK_SEMANTIC_DEFINITIONS,
  notebookSemanticDefinition,
  type NotebookSemanticKind,
  type NotebookWorkspaceTarget,
} from '../../../lib/notebook';
import {
  convertSelectedNotebookMath,
  moveSelectedNotebookTopLevelNode,
  notebookTopLevelMoveState,
  updateSelectedNotebookMathTarget,
  updateSelectedNotebookSemantic,
  type NotebookEditorSelection,
} from './canvas';
import {
  canOpenNotebookToolTarget,
  NOTEBOOK_TOOL_TARGETS,
} from './tool-targets';

function selectionLabel(selection: NotebookEditorSelection | null) {
  if (!selection) {
    return 'Document';
  }
  const labels: Record<string, string> = {
    paragraph: 'Text',
    heading: 'Heading',
    inlineMath: 'Inline math',
    displayMath: 'Display math',
    semanticBlock: 'Academic container',
    evidenceSnapshot: 'Evidence snapshot',
    bulletList: 'Bullet list',
    orderedList: 'Numbered list',
  };
  return labels[selection.type] ?? 'Document block';
}

type NotebookInspectorProps = {
  className?: string;
  editor: Editor | null;
  onClose: () => void;
  onOpenMathInTool: (target: NotebookWorkspaceTarget, latex: string) => void;
  selection: NotebookEditorSelection | null;
};

export function NotebookInspector({
  className,
  editor,
  onClose,
  onOpenMathInTool,
  selection,
}: NotebookInspectorProps) {
  const isMath = selection?.type === 'inlineMath' || selection?.type === 'displayMath';
  const isSemantic = selection?.type === 'semanticBlock';
  const target = String(selection?.attrs.workspaceTarget ?? 'calculate') as NotebookWorkspaceTarget;
  const latex = String(selection?.attrs.latex ?? '');
  const semanticKind = String(selection?.attrs.variant ?? 'note') as NotebookSemanticKind;
  const semanticDefinition = notebookSemanticDefinition(semanticKind);
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
        <button
          type="button"
          className="notebook-drawer-close"
          aria-label="Close block inspector"
          title="Close inspector"
          onClick={onClose}
        >
          <X aria-hidden="true" size={17} />
        </button>
      </div>

      {editor && !isMath && !isSemantic ? (
        <div className="notebook-inspector-section">
          <span>Text treatment</span>
          <div className="notebook-inspector-actions">
            <button type="button" onClick={() => editor.chain().focus().toggleBold().run()}><Type size={15} /> Bold</button>
            <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={15} /> Italic</button>
          </div>
        </div>
      ) : null}

      {editor && isSemantic ? (
        <div className="notebook-inspector-section notebook-semantic-controls">
          <label htmlFor="notebook-semantic-kind">Container</label>
          <select
            id="notebook-semantic-kind"
            aria-label="Academic container type"
            value={semanticKind}
            onChange={(event) => updateSelectedNotebookSemantic(editor, {
              variant: event.target.value as NotebookSemanticKind,
              collapsed: false,
            })}
          >
            {NOTEBOOK_SEMANTIC_DEFINITIONS.map((definition) => (
              <option key={definition.kind} value={definition.kind}>{definition.label}</option>
            ))}
          </select>
          <div className="notebook-semantic-fields">
            <label>
              <span>Number</span>
              <input
                aria-label="Container number"
                value={String(selection?.attrs.number ?? '')}
                placeholder="Optional"
                onChange={(event) => updateSelectedNotebookSemantic(editor, {
                  number: event.target.value,
                })}
              />
            </label>
            <label>
              <span>Label</span>
              <input
                aria-label="Container label"
                value={String(selection?.attrs.label ?? '')}
                placeholder="Optional"
                onChange={(event) => updateSelectedNotebookSemantic(editor, {
                  label: event.target.value,
                })}
              />
            </label>
          </div>
          {semanticDefinition.collapsible ? (
            <div className="notebook-semantic-collapse-setting">
              <span>Start collapsed</span>
              <button
                type="button"
                role="switch"
                aria-checked={selection?.attrs.collapsed === true}
                aria-label="Start container collapsed"
                className={selection?.attrs.collapsed === true ? 'is-on' : undefined}
                onClick={() => updateSelectedNotebookSemantic(editor, {
                  collapsed: selection?.attrs.collapsed !== true,
                })}
              ><span /></button>
            </div>
          ) : null}
        </div>
      ) : null}

      {editor && isMath ? (
        <>
          <div className="notebook-inspector-section">
            <span>Math placement</span>
            <div className="notebook-inspector-segmented">
              <button
                type="button"
                className={selection?.type === 'inlineMath' ? 'is-active' : undefined}
                onClick={() => convertSelectedNotebookMath(editor, 'inline')}
              >Inline</button>
              <button
                type="button"
                className={selection?.type === 'displayMath' ? 'is-active' : undefined}
                onClick={() => convertSelectedNotebookMath(editor, 'display')}
              >Display</button>
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
          <span>Block order</span>
          <div className="notebook-inspector-actions">
            <button
              type="button"
              disabled={!moveState.canMoveUp}
              onClick={() => moveSelectedNotebookTopLevelNode(editor, 'up')}
            ><ArrowUp size={15} /> Move Up</button>
            <button
              type="button"
              disabled={!moveState.canMoveDown}
              onClick={() => moveSelectedNotebookTopLevelNode(editor, 'down')}
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
