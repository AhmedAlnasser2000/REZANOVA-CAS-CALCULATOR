import type { ReactNodeViewProps } from '@tiptap/react';
import { NodeViewWrapper } from '@tiptap/react';
import { NodeSelection } from '@tiptap/pm/state';
import { Send, Sigma } from 'lucide-react';

import {
  isNotebookLatexRunnable,
  type NotebookWorkspaceTarget,
} from '../../../../lib/notebook';
import { NotebookMathField } from '../math-field';

export type NotebookOpenMathHandler = (
  target: NotebookWorkspaceTarget,
  latex: string,
) => void;

function canOpenTarget(target: NotebookWorkspaceTarget) {
  return target === 'calculate' || target === 'equation';
}

function targetLabel(target: NotebookWorkspaceTarget) {
  return target.charAt(0).toUpperCase() + target.slice(1);
}

export function createNotebookMathNodeView(
  role: 'inline' | 'display',
  onOpenMathInTool: NotebookOpenMathHandler,
) {
  return function NotebookMathNodeView({
    node,
    editor,
    getPos,
    selected,
    updateAttributes,
  }: ReactNodeViewProps) {
    const id = String(node.attrs.id ?? 'notebook.math');
    const latex = String(node.attrs.latex ?? '');
    const workspaceTarget = String(
      node.attrs.workspaceTarget ?? 'calculate',
    ) as NotebookWorkspaceTarget;
    const canOpen = role === 'display'
      && Boolean(latex.trim())
      && canOpenTarget(workspaceTarget)
      && isNotebookLatexRunnable(latex);
    const selectMathNode = () => {
      const position = getPos();
      if (typeof position === 'number' && !editor.isDestroyed) {
        editor.view.dispatch(
          editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, position)),
        );
      }
    };
    const selectMathNodeAfterFocus = () => {
      queueMicrotask(selectMathNode);
    };

    if (role === 'inline') {
      return (
        <NodeViewWrapper
          as="span"
          className={`notebook-rich-inline-math${selected ? ' is-selected' : ''}`}
          data-testid="notebook-inline-math-node"
          contentEditable={false}
          onPointerDown={selectMathNode}
        >
          <NotebookMathField
            className="notebook-rich-inline-field"
            dataTestId="notebook-inline-math-field"
            nodeId={id}
            role="inline"
            value={latex}
            workspaceTarget={workspaceTarget}
            onChange={(nextLatex) => updateAttributes({ latex: nextLatex })}
            onFocus={selectMathNodeAfterFocus}
          />
        </NodeViewWrapper>
      );
    }

    return (
      <NodeViewWrapper
        className={`notebook-rich-display-math${selected ? ' is-selected' : ''}`}
        data-testid="notebook-display-math-node"
        contentEditable={false}
        onPointerDown={selectMathNode}
      >
        <header>
          <span><Sigma aria-hidden="true" size={15} /> Display math</span>
          <small>{targetLabel(workspaceTarget)}</small>
        </header>
        <div className="notebook-rich-display-math-row">
          <NotebookMathField
            className="notebook-rich-display-field"
            dataTestId="notebook-display-math-field"
            nodeId={id}
            placeholder="Enter math"
            role="display"
            value={latex}
            workspaceTarget={workspaceTarget}
            onChange={(nextLatex) => updateAttributes({ latex: nextLatex })}
            onFocus={selectMathNodeAfterFocus}
            onSubmit={() => {
              if (canOpen) {
                onOpenMathInTool(workspaceTarget, latex);
              }
            }}
          />
          <button
            type="button"
            disabled={!canOpen}
            title={!isNotebookLatexRunnable(latex)
              ? 'This notation is available for authored documents but is not sent to calculator tools.'
              : undefined}
            onClick={() => onOpenMathInTool(workspaceTarget, latex)}
          >
            <Send aria-hidden="true" size={15} />
            Open in Tool
          </button>
        </div>
      </NodeViewWrapper>
    );
  };
}
