import type { ReactNodeViewProps } from '@tiptap/react';
import { NodeViewWrapper } from '@tiptap/react';
import { NodeSelection } from '@tiptap/pm/state';
import { GripVertical, Send, Sigma } from 'lucide-react';
import type { PointerEvent as ReactPointerEvent } from 'react';

import {
  isNotebookLatexRunnable,
  type NotebookWorkspaceTarget,
} from '../../../../lib/notebook';
import {
  canOpenNotebookToolTarget,
  notebookToolTargetLabel,
} from '../tool-targets';
import { recordNotebookNodeViewRender } from './node-view-stats';
import { NotebookViewportMathField } from './NotebookViewportMathField';

export type NotebookOpenMathHandler = (
  target: NotebookWorkspaceTarget,
  latex: string,
) => void;

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
    recordNotebookNodeViewRender(id);
    const latex = String(node.attrs.latex ?? '');
    const workspaceTarget = String(
      node.attrs.workspaceTarget ?? 'calculate',
    ) as NotebookWorkspaceTarget;
    const canOpen = role === 'display'
      && Boolean(latex.trim())
      && canOpenNotebookToolTarget(workspaceTarget)
      && isNotebookLatexRunnable(latex);
    const selectDisplayNode = () => {
      const position = getPos();
      if (typeof position === 'number' && !editor.isDestroyed) {
        editor.view.dispatch(
          editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, position)),
        );
      }
    };
    const selectDisplayCard = (event: ReactPointerEvent<HTMLElement>) => {
      if ((event.target as HTMLElement).closest('math-field, button')) {
        return;
      }
      selectDisplayNode();
    };
    if (role === 'inline') {
      return (
        <NodeViewWrapper
          as="span"
          className={`notebook-rich-inline-math${selected ? ' is-selected' : ''}`}
          data-testid="notebook-inline-math-node"
          contentEditable={false}
        >
          <NotebookViewportMathField
            className="notebook-rich-inline-field"
            dataTestId="notebook-inline-math-field"
            nodeId={id}
            role="inline"
            selected={selected}
            value={latex}
            workspaceTarget={workspaceTarget}
            onChange={(nextLatex) => updateAttributes({ latex: nextLatex })}
          />
        </NodeViewWrapper>
      );
    }

    return (
      <NodeViewWrapper
        className={`notebook-rich-display-math${selected ? ' is-selected' : ''}`}
        data-notebook-node-id={id}
        data-notebook-block-type="displayMath"
        data-testid="notebook-display-math-node"
        contentEditable={false}
        onPointerDown={selectDisplayCard}
      >
        <header>
          <span>
            <button
              type="button"
              className="notebook-block-drag-handle"
              aria-label="Move separate equation"
              data-notebook-block-drag-id={id}
              data-notebook-block-drag-label="Separate equation"
              data-notebook-block-drag-source="canvas"
              title="Drag to reorder"
            ><GripVertical aria-hidden="true" size={14} /></button>
            <Sigma aria-hidden="true" size={15} /> Separate equation
          </span>
          <small>{notebookToolTargetLabel(workspaceTarget)}</small>
        </header>
        <div className="notebook-rich-display-math-row">
          <NotebookViewportMathField
            className="notebook-rich-display-field"
            dataTestId="notebook-display-math-field"
            nodeId={id}
            placeholder="Enter math"
            role="display"
            selected={selected}
            value={latex}
            workspaceTarget={workspaceTarget}
            onChange={(nextLatex) => updateAttributes({ latex: nextLatex })}
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
