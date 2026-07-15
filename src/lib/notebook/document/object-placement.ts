import {
  NOTEBOOK_FLOATING_OBJECT_MIN_WIDTH_PT,
  NOTEBOOK_FLOATING_PAGE_NUMBER_MAX,
  NOTEBOOK_OBJECT_REFERENCES,
  NOTEBOOK_OBJECT_WRAPS,
  type NotebookObjectPlacement,
  type NotebookRichBlockNode,
} from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isOneOf<T>(value: unknown, options: readonly T[]): value is T {
  return options.some((option) => option === value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  return Object.keys(value).length === keys.length
    && Object.keys(value).every((key) => keys.includes(key));
}

export function isNotebookObjectPlacement(value: unknown): value is NotebookObjectPlacement {
  if (!isRecord(value) || typeof value.mode !== 'string') return false;
  if (value.mode === 'flow') return hasExactKeys(value, ['mode']);
  if (value.mode !== 'floating' || !hasExactKeys(value, [
    'mode',
    'anchor',
    'horizontalReference',
    'verticalReference',
    'xPt',
    'yPt',
    'widthPt',
    'wrap',
    'textDistancePt',
    'zOrder',
  ])) {
    return false;
  }
  const anchor = value.anchor;
  const anchorIsValid = isRecord(anchor) && (
    (anchor.kind === 'paragraph'
      && hasExactKeys(anchor, ['kind', 'nodeId'])
      && typeof anchor.nodeId === 'string'
      && Boolean(anchor.nodeId.trim()))
    || (anchor.kind === 'page'
      && hasExactKeys(anchor, ['kind', 'pageNumber'])
      && Number.isInteger(anchor.pageNumber)
      && Number(anchor.pageNumber) >= 1
      && Number(anchor.pageNumber) <= NOTEBOOK_FLOATING_PAGE_NUMBER_MAX)
  );
  const distance = value.textDistancePt;
  const distanceIsValid = isRecord(distance)
    && hasExactKeys(distance, ['top', 'right', 'bottom', 'left'])
    && ['top', 'right', 'bottom', 'left'].every((key) => (
      typeof distance[key] === 'number'
      && Number.isFinite(distance[key])
      && Number(distance[key]) >= 0
    ));
  return anchorIsValid
    && isOneOf(value.horizontalReference, NOTEBOOK_OBJECT_REFERENCES)
    && isOneOf(value.verticalReference, NOTEBOOK_OBJECT_REFERENCES)
    && typeof value.xPt === 'number'
    && Number.isFinite(value.xPt)
    && typeof value.yPt === 'number'
    && Number.isFinite(value.yPt)
    && typeof value.widthPt === 'number'
    && Number.isFinite(value.widthPt)
    && value.widthPt >= NOTEBOOK_FLOATING_OBJECT_MIN_WIDTH_PT
    && isOneOf(value.wrap, NOTEBOOK_OBJECT_WRAPS)
    && distanceIsValid
    && Number.isInteger(value.zOrder)
    && Number(value.zOrder) >= 0;
}

function collectParagraphIds(nodes: readonly NotebookRichBlockNode[], ids: Set<string>) {
  nodes.forEach((node) => {
    if (node.type === 'paragraph') ids.add(node.id);
    if (node.type === 'semanticBlock' || node.type === 'section') {
      collectParagraphIds(node.content, ids);
    } else if (node.type === 'bulletList' || node.type === 'orderedList') {
      node.content.forEach((item) => collectParagraphIds(item.content, ids));
    }
  });
}

export function isNotebookObjectPlacementGraphValid(
  nodes: readonly NotebookRichBlockNode[],
) {
  const paragraphIds = new Set<string>();
  const paragraphAnchors: Array<{ anchorId: string; ownParagraphIds: Set<string> }> = [];
  const zOrders: number[] = [];
  collectParagraphIds(nodes, paragraphIds);
  const visit = (blocks: readonly NotebookRichBlockNode[]) => {
    blocks.forEach((node) => {
      if ('objectPlacement' in node && node.objectPlacement?.mode === 'floating') {
        zOrders.push(node.objectPlacement.zOrder);
        if (node.objectPlacement.anchor.kind === 'paragraph') {
          const ownParagraphIds = new Set<string>();
          if (node.type === 'semanticBlock' || node.type === 'section') {
            collectParagraphIds(node.content, ownParagraphIds);
          }
          paragraphAnchors.push({
            anchorId: node.objectPlacement.anchor.nodeId,
            ownParagraphIds,
          });
        }
      }
      if (node.type === 'semanticBlock' || node.type === 'section') {
        visit(node.content);
      } else if (node.type === 'bulletList' || node.type === 'orderedList') {
        node.content.forEach((item) => visit(item.content));
      }
    });
  };
  visit(nodes);
  if (paragraphAnchors.some(({ anchorId, ownParagraphIds }) => (
    !paragraphIds.has(anchorId) || ownParagraphIds.has(anchorId)
  ))) {
    return false;
  }
  zOrders.sort((left, right) => left - right);
  return zOrders.every((zOrder, index) => zOrder === index);
}
