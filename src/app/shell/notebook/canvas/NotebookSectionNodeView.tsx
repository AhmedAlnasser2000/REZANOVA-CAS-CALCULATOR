import { NodeSelection } from '@tiptap/pm/state';
import type { ReactNodeViewProps } from '@tiptap/react';
import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';
import type { CSSProperties } from 'react';
import {
  ChevronDown,
  ChevronRight,
  FolderOpen,
  GripVertical,
} from 'lucide-react';

import { notebookSectionIsCollapsible } from '../../../../lib/notebook';
import { recordNotebookNodeViewRender } from './node-view-stats';

export function NotebookSectionNodeView({
  editor,
  getPos,
  node,
  selected,
  updateAttributes,
}: ReactNodeViewProps) {
  const id = String(node.attrs.id ?? 'notebook.section');
  const collapsible = notebookSectionIsCollapsible(
    typeof node.attrs.collapsible === 'boolean' ? node.attrs.collapsible : null,
  );
  const collapsed = collapsible && node.attrs.collapsed === true;
  const accentColor = typeof node.attrs.accentColor === 'string'
    ? node.attrs.accentColor
    : null;
  const title = String(node.attrs.title ?? 'Untitled section');
  recordNotebookNodeViewRender(id);

  function selectSection() {
    const position = getPos();
    if (typeof position !== 'number' || editor.isDestroyed) {
      return;
    }
    editor.view.dispatch(
      editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, position)),
    );
  }

  return (
    <NodeViewWrapper
      as="section"
      className={`notebook-section${collapsed ? ' is-collapsed' : ''}${selected ? ' is-selected' : ''}`}
      data-notebook-section=""
      data-notebook-node-id={id}
      data-notebook-block-type="notebookSection"
      data-notebook-accent={accentColor ?? 'automatic'}
      data-testid="notebook-section"
      style={accentColor ? { '--notebook-accent': accentColor } as CSSProperties : undefined}
    >
      <header onPointerDown={selectSection}>
        <button
          type="button"
          className="notebook-section-drag"
          aria-label={`Move ${title}`}
          data-notebook-block-drag-id={id}
          data-notebook-block-drag-label={title}
          data-notebook-block-drag-source="canvas"
          title="Drag section"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <GripVertical aria-hidden="true" size={15} />
        </button>
        {collapsible ? (
          <button
            type="button"
            aria-label={collapsed ? `Expand ${title}` : `Collapse ${title}`}
            aria-expanded={!collapsed}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => updateAttributes({ collapsed: !collapsed })}
          >
            {collapsed
              ? <ChevronRight aria-hidden="true" size={16} />
              : <ChevronDown aria-hidden="true" size={16} />}
          </button>
        ) : <span className="notebook-section-chevron-placeholder" />}
        <FolderOpen className="notebook-section-icon" aria-hidden="true" size={16} />
        <input
          aria-label="Section title"
          value={title}
          onPointerDown={(event) => event.stopPropagation()}
          onChange={(event) => updateAttributes({ title: event.target.value })}
        />
        <small>{node.childCount} blocks</small>
      </header>
      <NodeViewContent className="notebook-section-content" />
    </NodeViewWrapper>
  );
}
