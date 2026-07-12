import { NodeSelection } from '@tiptap/pm/state';
import type { ReactNodeViewProps } from '@tiptap/react';
import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';
import {
  BookMarked,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Lightbulb,
  TriangleAlert,
} from 'lucide-react';

import {
  notebookSemanticDefinition,
  notebookSemanticTitle,
  type NotebookSemanticKind,
} from '../../../../lib/notebook';
import { recordNotebookNodeViewRender } from './node-view-stats';

function SemanticIcon({ kind }: { kind: NotebookSemanticKind }) {
  const tone = notebookSemanticDefinition(kind).tone;
  if (tone === 'reasoning') {
    return <CheckCircle2 aria-hidden="true" size={17} />;
  }
  if (tone === 'practice') {
    return <BookMarked aria-hidden="true" size={17} />;
  }
  if (kind === 'warning') {
    return <TriangleAlert aria-hidden="true" size={17} />;
  }
  if (tone === 'support') {
    return <Lightbulb aria-hidden="true" size={17} />;
  }
  return <BookMarked aria-hidden="true" size={17} />;
}

export function NotebookSemanticNodeView({
  editor,
  getPos,
  node,
  selected,
  updateAttributes,
}: ReactNodeViewProps) {
  const variant = String(node.attrs.variant ?? 'note') as NotebookSemanticKind;
  recordNotebookNodeViewRender(String(node.attrs.id ?? `notebook.semantic.${variant}`));
  const definition = notebookSemanticDefinition(variant);
  const collapsed = definition.collapsible && node.attrs.collapsed === true;
  const title = notebookSemanticTitle(
    variant,
    String(node.attrs.number ?? ''),
    String(node.attrs.label ?? ''),
  );

  const selectContainer = () => {
    const position = getPos();
    if (typeof position !== 'number' || editor.isDestroyed) {
      return;
    }
    editor.view.dispatch(
      editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, position)),
    );
  };

  return (
    <NodeViewWrapper
      as="section"
      className={`notebook-semantic-block is-${variant}${selected ? ' is-selected' : ''}`}
      data-notebook-semantic={variant}
      data-semantic-tone={definition.tone}
      data-testid={`notebook-semantic-${variant}`}
    >
      <header onPointerDown={selectContainer} onClick={selectContainer}>
        <button
          type="button"
          className="notebook-semantic-drag"
          aria-label={`Move ${title}`}
          title="Drag to reorder"
          data-drag-handle
          onPointerDown={(event) => event.stopPropagation()}
        >
          <GripVertical aria-hidden="true" size={16} />
        </button>
        <span className="notebook-semantic-icon"><SemanticIcon kind={variant} /></span>
        <strong>{title}</strong>
        {definition.collapsible ? (
          <button
            type="button"
            className="notebook-semantic-collapse"
            aria-expanded={!collapsed}
            aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${title}`}
            title={collapsed ? 'Expand' : 'Collapse'}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => updateAttributes({ collapsed: !collapsed })}
          >
            {collapsed
              ? <ChevronRight aria-hidden="true" size={17} />
              : <ChevronDown aria-hidden="true" size={17} />}
          </button>
        ) : null}
      </header>
      <NodeViewContent
        className="notebook-semantic-content"
        hidden={collapsed}
      />
    </NodeViewWrapper>
  );
}
