import type { Editor } from '@tiptap/core';

import {
  NOTEBOOK_FLOATING_OBJECT_MIN_WIDTH_PT,
  notebookPageGeometry,
  type NotebookObjectPlacement,
  type NotebookRichDocument,
} from '../../../../lib/notebook';
import { notebookEditorNodeById } from './selection';
import type {
  NotebookPaginationMetrics,
  NotebookViewMode,
} from './useNotebookPagination';

type FloatingObjectPlacement = Extract<NotebookObjectPlacement, { mode: 'floating' }>;
type NotebookFloatingBlockType =
  | 'displayMath'
  | 'evidenceSnapshot'
  | 'horizontalRule'
  | 'notebookSection'
  | 'semanticBlock';

type Point = { clientX: number; clientY: number };

type Bounds = {
  bottom: number;
  left: number;
  right: number;
  top: number;
};

type MutableElementRef = { current: HTMLDivElement | null };

function pointInside(point: Point, bounds: Bounds) {
  return point.clientX >= bounds.left
    && point.clientX <= bounds.right
    && point.clientY >= bounds.top
    && point.clientY <= bounds.bottom;
}

function positionBlockFloatingGuide(
  guide: HTMLDivElement,
  pointer: Point,
) {
  guide.style.left = `${pointer.clientX + 14}px`;
  guide.style.top = `${pointer.clientY + 14}px`;
}

function positionBlockDragGhost(
  ghost: HTMLDivElement,
  pointer: Point,
) {
  ghost.style.left = `${pointer.clientX + 14}px`;
  ghost.style.top = `${pointer.clientY + 14}px`;
}

export function nearestParagraphAnchor(
  editor: Editor,
  sourcePosition: number,
  fallbackPageNumber: number,
): FloatingObjectPlacement['anchor'] {
  let preceding: string | null = null;
  let following: string | null = null;
  editor.state.doc.descendants((node, position) => {
    if (node.type.name !== 'paragraph') return;
    const id = typeof node.attrs.id === 'string' && node.attrs.id.trim()
      ? node.attrs.id
      : null;
    if (!id) return;
    if (position < sourcePosition) {
      preceding = id;
    } else if (position > sourcePosition && !following) {
      following = id;
    }
  });
  return preceding || following
    ? { kind: 'paragraph', nodeId: preceding ?? following! }
    : { kind: 'page', pageNumber: fallbackPageNumber };
}

export function nextFloatingZOrder(editor: Editor) {
  let maximum = -1;
  editor.state.doc.descendants((node) => {
    const placement = node.attrs.notebookObjectPlacement;
    if (placement?.mode === 'floating' && Number.isInteger(placement.zOrder)) {
      maximum = Math.max(maximum, Number(placement.zOrder));
    }
  });
  return maximum + 1;
}

export function notebookBlockSupportsFloating(typeName: string): typeName is NotebookFloatingBlockType {
  return typeName === 'displayMath'
    || typeName === 'evidenceSnapshot'
    || typeName === 'horizontalRule'
    || typeName === 'notebookSection'
    || typeName === 'semanticBlock';
}

export function renderNotebookBlockFloatingGuide(
  guideRef: MutableElementRef,
  pointer: Point,
) {
  let guide = guideRef.current;
  if (!guide) {
    guide = globalThis.document.createElement('div');
    guide.className = 'notebook-block-floating-guide';
    guide.setAttribute('aria-hidden', 'true');
    guide.textContent = 'Float here';
    globalThis.document.body.append(guide);
    guideRef.current = guide;
  }
  positionBlockFloatingGuide(guide, pointer);
}

export function renderNotebookBlockDragGhost(
  ghostRef: MutableElementRef,
  label: string,
  pointer: Point,
) {
  let ghost = ghostRef.current;
  if (!ghost) {
    ghost = globalThis.document.createElement('div');
    ghost.className = 'notebook-block-drag-ghost';
    ghost.setAttribute('aria-hidden', 'true');
    globalThis.document.body.append(ghost);
    ghostRef.current = ghost;
  }
  ghost.textContent = label;
  positionBlockDragGhost(ghost, pointer);
}

export function floatingPlacementForBlockPointer({
  document,
  editor,
  nodeId,
  pageStage,
  paginationMetrics,
  pointer,
  viewMode,
}: {
  document: NotebookRichDocument;
  editor: Editor;
  nodeId: string;
  pageStage: HTMLElement | null;
  paginationMetrics: NotebookPaginationMetrics | null;
  pointer: Point;
  viewMode: NotebookViewMode;
}): FloatingObjectPlacement | null {
  if (viewMode !== 'print' || !pageStage) return null;
  const source = notebookEditorNodeById(editor, nodeId);
  if (!source || !notebookBlockSupportsFloating(source.type)) return null;
  const sourceElement = [...editor.view.dom.querySelectorAll<HTMLElement>('[data-notebook-node-id]')]
    .find((element) => element.dataset.notebookNodeId === nodeId);
  const sourceBounds = sourceElement?.getBoundingClientRect();
  const geometry = notebookPageGeometry(document.pageSetup);
  const stageBounds = pageStage.getBoundingClientRect();
  if (stageBounds.width <= 0) return null;
  const pageHeightPx = paginationMetrics?.pageHeightPx && paginationMetrics.pageHeightPx > 1
    ? paginationMetrics.pageHeightPx
    : stageBounds.width * (geometry.height / geometry.width);
  const pageGapPx = paginationMetrics?.pageGapPx ?? 24;
  const stride = pageHeightPx + pageGapPx;
  const relativeY = Math.max(0, pointer.clientY - stageBounds.top);
  const pageIndex = Math.max(0, Math.floor(relativeY / stride));
  const yWithinPage = relativeY - pageIndex * stride;
  const scale = geometry.width / stageBounds.width;
  const margins = document.pageSetup.marginsPt;
  const sourceWidthPt = (sourceBounds?.width && sourceBounds.width > 0)
    ? sourceBounds.width * scale
    : geometry.usableWidth;
  return {
    mode: 'floating',
    anchor: nearestParagraphAnchor(editor, source.from, pageIndex + 1),
    horizontalReference: 'margins',
    verticalReference: 'margins',
    xPt: Math.max(0, (pointer.clientX - stageBounds.left) * scale - margins.left),
    yPt: Math.max(0, yWithinPage * (geometry.height / pageHeightPx) - margins.top),
    widthPt: Math.max(
      NOTEBOOK_FLOATING_OBJECT_MIN_WIDTH_PT,
      Math.min(geometry.usableWidth, sourceWidthPt),
    ),
    wrap: 'square',
    textDistancePt: { top: 6, right: 6, bottom: 6, left: 6 },
    zOrder: nextFloatingZOrder(editor),
  };
}

export function pointerIsInBlockFloatingDropZone({
  editor,
  pageStage,
  pointer,
  scrollRegion,
  sourceId,
  viewMode,
}: {
  editor: Editor;
  pageStage: HTMLElement | null;
  pointer: Point;
  scrollRegion: HTMLElement | null;
  sourceId: string;
  viewMode: NotebookViewMode;
}) {
  if (viewMode !== 'print' || !pageStage || !scrollRegion) return false;
  const editorElement = editor.view.dom as HTMLElement | undefined;
  const notebookPage = editorElement?.closest<HTMLElement>('.app-page--notebook');
  const source = notebookEditorNodeById(editor, sourceId);
  if (!editorElement || !notebookPage || !source) return false;
  if (!notebookBlockSupportsFloating(source.type)) return false;

  const stageBounds = pageStage.getBoundingClientRect();
  const scrollBounds = scrollRegion.getBoundingClientRect();
  const visibleStageBounds = {
    bottom: Math.min(stageBounds.bottom, scrollBounds.bottom),
    left: stageBounds.left,
    right: stageBounds.right,
    top: Math.max(stageBounds.top, scrollBounds.top),
  };
  if (!pointInside(pointer, visibleStageBounds)) return false;

  const hits = typeof globalThis.document.elementsFromPoint === 'function'
    ? globalThis.document.elementsFromPoint(pointer.clientX, pointer.clientY)
    : [globalThis.document.elementFromPoint(pointer.clientX, pointer.clientY)]
      .filter(Boolean) as Element[];
  const visited = new Set<HTMLElement>();
  for (const hit of hits) {
    let candidate = hit.closest<HTMLElement>(
      '[data-notebook-node-id], .notebook-outline-entry[data-node-id]',
    );
    while (candidate && notebookPage.contains(candidate)) {
      if (!visited.has(candidate)) {
        visited.add(candidate);
        const targetId = candidate.dataset.notebookNodeId ?? candidate.dataset.nodeId ?? null;
        const target = targetId ? notebookEditorNodeById(editor, targetId) : null;
        const insideSource = target
          ? target.from >= source.from && target.to <= source.to
          : false;
        const sourceInsideTarget = target
          ? source.from >= target.from && source.to <= target.to
          : false;
        if (targetId && targetId !== sourceId && !insideSource && !sourceInsideTarget) {
          return false;
        }
      }
      candidate = candidate.parentElement?.closest<HTMLElement>(
        '[data-notebook-node-id], .notebook-outline-entry[data-node-id]',
      ) ?? null;
    }
  }
  return true;
}
