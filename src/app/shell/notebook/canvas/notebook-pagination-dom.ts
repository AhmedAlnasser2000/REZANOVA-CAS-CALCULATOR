import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

import {
  isNotebookObjectPlacement,
} from '../../../../lib/notebook/document/object-placement';
import type {
  NotebookObjectPlacement,
  NotebookPaginationBlock,
  NotebookPaginationBlockKind,
} from '../../../../lib/notebook';

export type NotebookPaginationNodeMetadata = {
  id: string;
  topLevelId: string;
  kind: NotebookPaginationBlockKind;
  objectPlacement?: NotebookObjectPlacement;
  aspectRatio?: number;
  rotationDeg?: number;
};

export type NotebookPaginationDocumentMetadata = {
  nodes: ReadonlyMap<string, NotebookPaginationNodeMetadata>;
  paragraphAnchorBlockIds: Readonly<Record<string, string>>;
};

export function notebookPaginationElementId(element: HTMLElement, index: number) {
  return element.dataset.notebookNodeId
    ?? element.querySelector<HTMLElement>('[data-notebook-node-id]')?.dataset.notebookNodeId
    ?? `notebook.block.${index}`;
}

function kindForNode(node: ProseMirrorNode): NotebookPaginationBlockKind {
  switch (node.type.name) {
    case 'heading': return 'heading';
    case 'notebookSection': return 'section';
    case 'semanticBlock': return 'container';
    case 'displayMath': return 'math';
    case 'imageFigure': return 'media';
    case 'evidenceSnapshot': return 'evidence';
    case 'horizontalRule': return 'divider';
    case 'pageBreak': return 'pageBreak';
    default: return 'prose';
  }
}

function finitePositive(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : undefined;
}

function metadataForNode(
  node: ProseMirrorNode,
  id: string,
  topLevelId: string,
): NotebookPaginationNodeMetadata {
  const placement = isNotebookObjectPlacement(node.attrs.notebookObjectPlacement)
    ? node.attrs.notebookObjectPlacement
    : undefined;
  return {
    id,
    topLevelId,
    kind: kindForNode(node),
    ...(placement ? { objectPlacement: placement } : {}),
    ...(finitePositive(node.attrs.displayAspectRatio) === undefined
      ? {}
      : { aspectRatio: Number(node.attrs.displayAspectRatio) }),
    ...(typeof node.attrs.rotation === 'number' && Number.isFinite(node.attrs.rotation)
      ? { rotationDeg: node.attrs.rotation }
      : {}),
  };
}

export function notebookPaginationDocumentMetadata(doc: ProseMirrorNode) {
  const nodes = new Map<string, NotebookPaginationNodeMetadata>();
  const paragraphAnchorBlockIds: Record<string, string> = {};
  doc.forEach((topLevelNode, _offset, topLevelIndex) => {
    const fallbackId = `notebook.block.${topLevelIndex}`;
    const topLevelId = typeof topLevelNode.attrs.id === 'string'
      ? topLevelNode.attrs.id
      : fallbackId;
    const visit = (node: ProseMirrorNode) => {
      const id = typeof node.attrs.id === 'string' ? node.attrs.id : undefined;
      if (id) {
        nodes.set(id, metadataForNode(node, id, topLevelId));
        if (node.type.name === 'paragraph') paragraphAnchorBlockIds[id] = topLevelId;
      }
      node.forEach(visit);
    };
    nodes.set(topLevelId, metadataForNode(topLevelNode, topLevelId, topLevelId));
    if (topLevelNode.type.name === 'paragraph') {
      paragraphAnchorBlockIds[topLevelId] = topLevelId;
    }
    topLevelNode.forEach(visit);
  });
  return { nodes, paragraphAnchorBlockIds } satisfies NotebookPaginationDocumentMetadata;
}

export function notebookPaginationBlockFromElement(
  element: HTMLElement,
  index: number,
  pointsPerPixel: number,
  metadata: NotebookPaginationDocumentMetadata,
): NotebookPaginationBlock {
  const id = notebookPaginationElementId(element, index);
  const node = metadata.nodes.get(id);
  const computed = getComputedStyle(element);
  const marginTop = Number.parseFloat(computed.marginTop) || 0;
  const marginBottom = Number.parseFloat(computed.marginBottom) || 0;
  const rectangle = element.getBoundingClientRect();
  return {
    id,
    kind: node?.kind ?? 'prose',
    heightPt: Math.max(0, (rectangle.height + marginTop + marginBottom) * pointsPerPixel),
    measuredWidthPt: Math.max(0, rectangle.width * pointsPerPixel),
    ...(node?.objectPlacement ? { objectPlacement: node.objectPlacement } : {}),
    ...(node?.aspectRatio ? { aspectRatio: node.aspectRatio } : {}),
    ...(node?.rotationDeg === undefined ? {} : { rotationDeg: node.rotationDeg }),
  };
}

export function notebookFloatingPaginationBlocks(
  editorElement: HTMLElement,
  pointsPerPixel: number,
  metadata: NotebookPaginationDocumentMetadata,
  maximumWidthPt: number,
) {
  const elementsById = new Map<string, HTMLElement>();
  editorElement.querySelectorAll<HTMLElement>('[data-notebook-node-id]').forEach((element) => {
    const id = element.dataset.notebookNodeId;
    if (id && !elementsById.has(id)) elementsById.set(id, element);
  });
  return [...metadata.nodes.values()].flatMap((node): NotebookPaginationBlock[] => {
    if (node.objectPlacement?.mode !== 'floating') return [];
    const element = elementsById.get(node.id);
    if (!element) return [];
    const widthPx = Math.min(node.objectPlacement.widthPt, maximumWidthPt) / pointsPerPixel;
    const previousWidth = element.style.getPropertyValue('width');
    const previousWidthPriority = element.style.getPropertyPriority('width');
    const previousMaxWidth = element.style.getPropertyValue('max-width');
    const previousMaxWidthPriority = element.style.getPropertyPriority('max-width');
    const previousBoxSizing = element.style.getPropertyValue('box-sizing');
    const previousBoxSizingPriority = element.style.getPropertyPriority('box-sizing');
    element.style.setProperty('width', `${widthPx}px`, 'important');
    element.style.setProperty('max-width', 'none', 'important');
    element.style.setProperty('box-sizing', 'border-box');
    const rectangle = element.getBoundingClientRect();
    const restore = (property: string, value: string, priority: string) => {
      if (value) element.style.setProperty(property, value, priority);
      else element.style.removeProperty(property);
    };
    restore('width', previousWidth, previousWidthPriority);
    restore('max-width', previousMaxWidth, previousMaxWidthPriority);
    restore('box-sizing', previousBoxSizing, previousBoxSizingPriority);
    return [{
      id: node.id,
      kind: node.kind,
      heightPt: Math.max(0, rectangle.height * pointsPerPixel),
      measuredWidthPt: Math.max(0, rectangle.width * pointsPerPixel),
      objectPlacement: node.objectPlacement,
      ...(node.aspectRatio ? { aspectRatio: node.aspectRatio } : {}),
      ...(node.rotationDeg === undefined ? {} : { rotationDeg: node.rotationDeg }),
    }];
  });
}
