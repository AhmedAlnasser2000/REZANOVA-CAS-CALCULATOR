import type { Editor } from '@tiptap/core';
import {
  ArrowDown,
  ArrowUp,
  ChevronsDown,
  ChevronsUp,
  FileCheck2,
  Image,
  Layers,
  Minus,
  Shapes,
  Sigma,
} from 'lucide-react';
import { useMemo } from 'react';

import {
  notebookSemanticDefinition,
  type NotebookObjectPlacement,
  type NotebookRichBlockNode,
  type NotebookRichDocument,
} from '../../../lib/notebook';
import {
  moveNotebookFloatingLayer,
  selectNotebookEditorNode,
} from './canvas';

type FloatingPlacement = Extract<NotebookObjectPlacement, { mode: 'floating' }>;

type NotebookLayerItem = {
  anchorLabel: string;
  id: string;
  label: string;
  typeLabel: string;
  wrapLabel: string;
  zOrder: number;
};

type NotebookObjectLayersProps = {
  document: NotebookRichDocument;
  editor: Editor | null;
  selectedNodeId: string | null;
};

function placementForNode(node: NotebookRichBlockNode): FloatingPlacement | null {
  if (!('objectPlacement' in node) || node.objectPlacement?.mode !== 'floating') {
    return null;
  }
  return node.objectPlacement;
}

function blockLabel(node: NotebookRichBlockNode) {
  if (node.type === 'imageFigure') {
    return node.caption?.trim() || node.altText?.trim() || 'Image';
  }
  if (node.type === 'displayMath') {
    return node.label?.trim() || node.sourceText?.trim() || node.latex.trim() || 'Equation';
  }
  if (node.type === 'evidenceSnapshot') {
    return node.title.trim() || 'Evidence';
  }
  if (node.type === 'horizontalRule') {
    return 'Divider';
  }
  if (node.type === 'semanticBlock') {
    const definition = notebookSemanticDefinition(node.variant);
    return [definition.label, node.number, node.label]
      .filter((part) => Boolean(part?.trim()))
      .join(' ');
  }
  if (node.type === 'section') {
    return node.title.trim() || 'Untitled section';
  }
  return 'Object';
}

function blockTypeLabel(node: NotebookRichBlockNode) {
  if (node.type === 'imageFigure') return 'Image';
  if (node.type === 'displayMath') return 'Equation';
  if (node.type === 'evidenceSnapshot') return 'Evidence';
  if (node.type === 'horizontalRule') return 'Divider';
  if (node.type === 'semanticBlock') return notebookSemanticDefinition(node.variant).label;
  if (node.type === 'section') return 'Section';
  return 'Object';
}

function wrapLabel(wrap: FloatingPlacement['wrap']) {
  if (wrap === 'top-and-bottom') return 'Top and bottom';
  if (wrap === 'in-front') return 'In front';
  if (wrap === 'behind') return 'Behind';
  return 'Square';
}

function layerIcon(nodeType: string) {
  if (nodeType === 'Image') return <Image aria-hidden="true" size={15} />;
  if (nodeType === 'Equation') return <Sigma aria-hidden="true" size={15} />;
  if (nodeType === 'Evidence') return <FileCheck2 aria-hidden="true" size={15} />;
  if (nodeType === 'Divider') return <Minus aria-hidden="true" size={15} />;
  return <Shapes aria-hidden="true" size={15} />;
}

function collectFloatingLayers(nodes: readonly NotebookRichBlockNode[]): NotebookLayerItem[] {
  const items: NotebookLayerItem[] = [];
  function visit(children: readonly NotebookRichBlockNode[]) {
    children.forEach((node) => {
      const placement = placementForNode(node);
      if (placement) {
        const typeLabel = blockTypeLabel(node);
        items.push({
          anchorLabel: placement.anchor.kind === 'page'
            ? `Page ${placement.anchor.pageNumber}`
            : 'Paragraph anchor',
          id: node.id,
          label: blockLabel(node),
          typeLabel,
          wrapLabel: wrapLabel(placement.wrap),
          zOrder: placement.zOrder,
        });
      }
      if (node.type === 'semanticBlock' || node.type === 'section') {
        visit(node.content);
      } else if (node.type === 'bulletList' || node.type === 'orderedList') {
        node.content.forEach((item) => visit(item.content));
      }
    });
  }
  visit(nodes);
  return items.sort((left, right) => right.zOrder - left.zOrder || left.label.localeCompare(right.label));
}

export function NotebookObjectLayers({
  document,
  editor,
  selectedNodeId,
}: NotebookObjectLayersProps) {
  const layers = useMemo(() => collectFloatingLayers(document.content), [document.content]);
  const selectedIndex = layers.findIndex((layer) => layer.id === selectedNodeId);
  const selectedLayer = selectedIndex >= 0 ? layers[selectedIndex] : null;

  function moveSelected(move: Parameters<typeof moveNotebookFloatingLayer>[2]) {
    if (!editor || !selectedLayer) {
      return;
    }
    moveNotebookFloatingLayer(editor, selectedLayer.id, move);
  }

  return (
    <section className="notebook-object-layers" aria-label="Notebook objects and layers">
      <div className="notebook-outline-heading">
        <span><Layers aria-hidden="true" size={15} /> Objects & Layers</span>
        <small>{layers.length} floating</small>
      </div>
      <div className="notebook-object-layer-actions" aria-label="Arrange selected floating object">
        <button type="button" disabled={!selectedLayer} onClick={() => moveSelected('bring-to-front')}>
          <ChevronsUp aria-hidden="true" size={14} /> Front
        </button>
        <button type="button" disabled={!selectedLayer} onClick={() => moveSelected('forward')}>
          <ArrowUp aria-hidden="true" size={14} /> Forward
        </button>
        <button type="button" disabled={!selectedLayer} onClick={() => moveSelected('backward')}>
          <ArrowDown aria-hidden="true" size={14} /> Backward
        </button>
        <button type="button" disabled={!selectedLayer} onClick={() => moveSelected('send-to-back')}>
          <ChevronsDown aria-hidden="true" size={14} /> Back
        </button>
      </div>
      <div className="notebook-object-layer-list">
        {layers.length > 0 ? layers.map((layer) => (
          <button
            key={layer.id}
            type="button"
            data-testid="notebook-object-layer-entry"
            data-node-id={layer.id}
            className={layer.id === selectedNodeId ? 'is-active' : undefined}
            onClick={() => {
              if (editor) selectNotebookEditorNode(editor, layer.id);
            }}
          >
            {layerIcon(layer.typeLabel)}
            <span>
              <small>{layer.typeLabel} · {layer.anchorLabel} · {layer.wrapLabel}</small>
              <strong>{layer.label}</strong>
            </span>
            <em>z{layer.zOrder}</em>
          </button>
        )) : (
          <div className="notebook-outline-empty">
            No floating objects yet. Drag an eligible object into page whitespace to create one.
          </div>
        )}
      </div>
    </section>
  );
}
