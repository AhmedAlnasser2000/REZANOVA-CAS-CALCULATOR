import { NodeSelection } from '@tiptap/pm/state';
import type { ReactNodeViewProps } from '@tiptap/react';
import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';
import {
  ChevronDown,
  ChevronRight,
  FolderOpen,
  GripVertical,
} from 'lucide-react';

import { recordNotebookNodeViewRender } from './node-view-stats';

export function NotebookSectionNodeView({
  editor,
  getPos,
  node,
  selected,
  updateAttributes,
}: ReactNodeViewProps) {
  const id = String(node.attrs.id ?? 'notebook.section');
  const collapsed = node.attrs.collapsed === true;
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
      data-testid="notebook-section"
    >
      <header onPointerDown={selectSection}>
        <span className="notebook-section-drag" data-drag-handle="" title="Drag section">
          <GripVertical aria-hidden="true" size={15} />
        </span>
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
        <FolderOpen aria-hidden="true" size={16} />
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
