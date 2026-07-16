import type { Editor } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';
import { useCallback, useEffect, useRef, type RefObject } from 'react';

import {
  normalizeNotebookMediaWidthPercent,
  notebookMaximumWrappedMediaWidthPercent,
  notebookPageGeometry,
  type NotebookRichDocument,
} from '../../../../lib/notebook';
import {
  moveNotebookNode,
  notebookEditorNodeById,
  notebookEditorSelection,
  selectNotebookEditorNode,
  type NotebookMovePlacement,
} from './selection';
import type {
  NotebookMediaDragGripEvent,
  NotebookMediaInteractionEvent,
} from './NotebookDirectMediaInteraction';
import type {
  NotebookPaginationMetrics,
  NotebookViewMode,
} from './useNotebookPagination';

export type NotebookMediaStatus = {
  page: number;
  viewMode: NotebookViewMode;
  xPt: number;
  yPt: number;
};

type MediaFrame = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type MediaDragPreview = {
  frame: MediaFrame;
  pointer: { clientX: number; clientY: number };
};

type MediaFlowTarget = 'square-left' | 'normal' | 'square-right';

type BlockDragState = {
  active: boolean;
  label: string;
  nodeId: string;
  origin: { clientX: number; clientY: number };
  pointerId: number;
  pointerTarget: HTMLElement;
};

type NotebookPointerCoordinatorOptions = {
  documentRef: RefObject<NotebookRichDocument>;
  editorRef: RefObject<Editor | null>;
  onMediaStatusChange: (status: NotebookMediaStatus | null) => void;
  pageStageRef: RefObject<HTMLDivElement | null>;
  scrollRegionRef: RefObject<HTMLDivElement | null>;
  viewMode: NotebookViewMode;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function positionMediaDragGhost(
  ghost: HTMLDivElement,
  frame: MediaFrame,
  shiftX: number,
  shiftY: number,
) {
  ghost.style.left = `${frame.left}px`;
  ghost.style.top = `${frame.top}px`;
  ghost.style.width = `${frame.width}px`;
  ghost.style.height = `${frame.height}px`;
  ghost.style.transform = `translate(${shiftX}px, ${shiftY}px)`;
}

function positionBlockDragGhost(
  ghost: HTMLDivElement,
  pointer: { clientX: number; clientY: number },
) {
  ghost.style.left = `${pointer.clientX + 14}px`;
  ghost.style.top = `${pointer.clientY + 14}px`;
}

function positionMediaDropGuide(
  guide: HTMLDivElement,
  target: HTMLElement,
  placement: NotebookMovePlacement,
) {
  const bounds = target.getBoundingClientRect();
  guide.dataset.placement = placement;
  guide.dataset.targetNodeId = target.dataset.notebookNodeId ?? target.dataset.nodeId ?? '';
  guide.classList.toggle('is-inside', placement === 'inside');
  guide.style.left = `${bounds.left - (placement === 'inside' ? 2 : 10)}px`;
  guide.style.top = `${placement === 'inside'
    ? bounds.top - 2
    : placement === 'before' ? bounds.top - 5 : bounds.bottom + 3}px`;
  guide.style.width = `${bounds.width + (placement === 'inside' ? 4 : 20)}px`;
  guide.style.height = placement === 'inside' ? `${bounds.height + 4}px` : '2px';
}

function editorContentBounds(element: HTMLElement) {
  const bounds = element.getBoundingClientRect();
  const style = getComputedStyle(element);
  const left = bounds.left + (Number.parseFloat(style.paddingLeft) || 0);
  const right = bounds.right - (Number.parseFloat(style.paddingRight) || 0);
  return {
    bottom: bounds.bottom,
    height: bounds.height,
    left,
    right,
    top: bounds.top,
    width: Math.max(0, right - left),
  };
}

function pointInside(
  point: { clientX: number; clientY: number },
  bounds: { bottom: number; left: number; right: number; top: number },
) {
  return point.clientX >= bounds.left
    && point.clientX <= bounds.right
    && point.clientY >= bounds.top
    && point.clientY <= bounds.bottom;
}

/**
 * One Notebook pointer coordinator for block movement and direct media gestures.
 * Node views expose handles; this hook owns previews and delegates committed
 * mutations to the existing document commands.
 */
export function useNotebookPointerCoordinator({
  documentRef,
  editorRef,
  onMediaStatusChange,
  pageStageRef,
  scrollRegionRef,
  viewMode,
}: NotebookPointerCoordinatorOptions) {
  const mediaStatusChangeRef = useRef(onMediaStatusChange);
  const viewModeRef = useRef(viewMode);
  const paginationMetricsRef = useRef<NotebookPaginationMetrics | null>(null);
  const cropModeImageIdRef = useRef<string | null>(null);
  const mediaDropTargetRef = useRef<HTMLElement | null>(null);
  const mediaDropGuideRef = useRef<HTMLDivElement | null>(null);
  const mediaDragGhostRef = useRef<HTMLDivElement | null>(null);
  const mediaDragPreviewRef = useRef<MediaDragPreview | null>(null);
  const mediaFlowTargetRef = useRef<MediaFlowTarget | null>(null);
  const mediaFlowTargetsElementRef = useRef<HTMLDivElement | null>(null);
  const mediaAutoScrollFrameRef = useRef<number | null>(null);
  const mediaAutoScrollVelocityRef = useRef(0);
  const latestMediaDragEventRef = useRef<NotebookMediaDragGripEvent | null>(null);
  const blockDragRef = useRef<BlockDragState | null>(null);
  const blockDragGhostRef = useRef<HTMLDivElement | null>(null);
  const blockDropPlacementRef = useRef<NotebookMovePlacement | null>(null);
  const blockAutoScrollFrameRef = useRef<number | null>(null);
  const blockAutoScrollVelocityRef = useRef(0);
  const latestBlockPointerRef = useRef<{ clientX: number; clientY: number } | null>(null);

  useEffect(() => {
    mediaStatusChangeRef.current = onMediaStatusChange;
    viewModeRef.current = viewMode;
  }, [onMediaStatusChange, viewMode]);

  const publishImageCropMode = useCallback((nodeId: string, active: boolean) => {
    cropModeImageIdRef.current = active ? nodeId : null;
    const editorElement = editorRef.current?.view.dom as HTMLElement | undefined;
    editorElement?.dispatchEvent(new CustomEvent('notebook-image-crop-mode-change', {
      detail: { active, nodeId: active ? nodeId : null },
    }));
  }, [editorRef]);

  const imageCropMode = useCallback(({ nodeId }: { nodeId: string }) => (
    cropModeImageIdRef.current === nodeId
  ), []);

  const clearMediaDropTarget = useCallback(() => {
    mediaDropTargetRef.current = null;
    mediaDropGuideRef.current?.remove();
    mediaDropGuideRef.current = null;
  }, []);

  const renderMediaDropGuide = useCallback((target: HTMLElement, placement: NotebookMovePlacement) => {
    let guide = mediaDropGuideRef.current;
    if (!guide) {
      guide = globalThis.document.createElement('div');
      guide.className = 'notebook-media-drop-guide notebook-block-drop-guide';
      guide.setAttribute('aria-hidden', 'true');
      globalThis.document.body.append(guide);
      mediaDropGuideRef.current = guide;
    }
    positionMediaDropGuide(guide, target, placement);
  }, []);

  const stopBlockAutoScroll = useCallback(() => {
    blockAutoScrollVelocityRef.current = 0;
    latestBlockPointerRef.current = null;
    if (blockAutoScrollFrameRef.current !== null) {
      cancelAnimationFrame(blockAutoScrollFrameRef.current);
      blockAutoScrollFrameRef.current = null;
    }
  }, []);

  const clearBlockDrag = useCallback(() => {
    stopBlockAutoScroll();
    try {
      blockDragRef.current?.pointerTarget.releasePointerCapture?.(
        blockDragRef.current.pointerId,
      );
    } catch {
      // Pointer capture may already have been released by the browser.
    }
    blockDragRef.current = null;
    blockDropPlacementRef.current = null;
    blockDragGhostRef.current?.remove();
    blockDragGhostRef.current = null;
    clearMediaDropTarget();
  }, [clearMediaDropTarget, stopBlockAutoScroll]);

  const clearMediaFlowTargets = useCallback(() => {
    mediaFlowTargetsElementRef.current?.remove();
    mediaFlowTargetsElementRef.current = null;
    mediaFlowTargetRef.current = null;
  }, []);

  const stopMediaAutoScroll = useCallback(() => {
    mediaAutoScrollVelocityRef.current = 0;
    latestMediaDragEventRef.current = null;
    if (mediaAutoScrollFrameRef.current !== null) {
      cancelAnimationFrame(mediaAutoScrollFrameRef.current);
      mediaAutoScrollFrameRef.current = null;
    }
  }, []);

  const clearMediaDragPreview = useCallback(() => {
    stopMediaAutoScroll();
    clearMediaFlowTargets();
    mediaDragGhostRef.current?.remove();
    mediaDragGhostRef.current = null;
    mediaDragPreviewRef.current = null;
  }, [clearMediaFlowTargets, stopMediaAutoScroll]);

  const renderMediaFlowTargets = useCallback((active: MediaFlowTarget | null, wrapEnabled: boolean) => {
    const editorElement = editorRef.current?.view.dom as HTMLElement | undefined;
    const stage = pageStageRef.current;
    const scrollRegion = scrollRegionRef.current;
    if (!editorElement || !stage || !scrollRegion) return;
    const content = editorContentBounds(editorElement);
    const stageBounds = stage.getBoundingClientRect();
    const scrollBounds = scrollRegion.getBoundingClientRect();
    const top = Math.max(stageBounds.top, scrollBounds.top);
    const bottom = Math.min(stageBounds.bottom, scrollBounds.bottom);
    if (content.width <= 0 || bottom <= top) return;

    let element = mediaFlowTargetsElementRef.current;
    if (!element) {
      element = globalThis.document.createElement('div');
      element.className = 'notebook-media-flow-targets';
      element.setAttribute('aria-hidden', 'true');
      element.style.pointerEvents = 'none';
      ([
        ['square-left', 'Wrap left'],
        ['normal', 'Normal flow'],
        ['square-right', 'Wrap right'],
      ] as const).forEach(([target, label]) => {
        const item = globalThis.document.createElement('span');
        item.dataset.notebookMediaFlowTarget = target;
        item.textContent = label;
        element?.append(item);
      });
      globalThis.document.body.append(element);
      mediaFlowTargetsElementRef.current = element;
    }
    element.style.left = `${content.left}px`;
    element.style.top = `${top}px`;
    element.style.width = `${content.width}px`;
    element.style.height = `${bottom - top}px`;
    element.dataset.activeTarget = active ?? '';
    element.dataset.wrapEnabled = wrapEnabled ? 'true' : 'false';
  }, [editorRef, pageStageRef, scrollRegionRef]);

  const publishMediaDragPreview = useCallback((
    frame: MediaFrame,
    pointer: { clientX: number; clientY: number },
  ) => {
    const start = mediaDragPreviewRef.current;
    if (!start) return frame;
    const shiftX = pointer.clientX - start.pointer.clientX;
    const shiftY = pointer.clientY - start.pointer.clientY;
    let ghost = mediaDragGhostRef.current;
    if (!ghost) {
      ghost = globalThis.document.createElement('div');
      ghost.className = 'notebook-media-drag-ghost';
      ghost.setAttribute('aria-hidden', 'true');
      globalThis.document.body.append(ghost);
      mediaDragGhostRef.current = ghost;
    }
    positionMediaDragGhost(ghost, start.frame, shiftX, shiftY);
    return {
      ...frame,
      left: frame.left + shiftX,
      top: frame.top + shiftY,
    };
  }, []);

  const publishMediaStatusForFrame = useCallback((frame: MediaFrame) => {
    const stage = pageStageRef.current;
    const editorElement = editorRef.current?.view.dom as HTMLElement | undefined;
    if (!stage || !editorElement) return;
    const geometry = notebookPageGeometry(documentRef.current.pageSetup);

    if (viewModeRef.current === 'draft') {
      const bounds = editorElement.getBoundingClientRect();
      if (bounds.width <= 0) return;
      const scale = geometry.usableWidth / bounds.width;
      mediaStatusChangeRef.current({
        page: 1,
        viewMode: 'draft',
        xPt: clamp((frame.left - bounds.left) * scale, 0, geometry.usableWidth),
        yPt: Math.max(0, (frame.top - bounds.top) * scale),
      });
      return;
    }

    const bounds = stage.getBoundingClientRect();
    if (bounds.width <= 0) return;
    const metrics = paginationMetricsRef.current;
    const pageHeightPx = metrics?.pageHeightPx && metrics.pageHeightPx > 1
      ? metrics.pageHeightPx
      : bounds.width * (geometry.height / geometry.width);
    const pageGapPx = metrics?.pageGapPx ?? 24;
    const stride = pageHeightPx + pageGapPx;
    const relativeY = Math.max(0, frame.top - bounds.top);
    const pageIndex = Math.max(0, Math.floor(relativeY / stride));
    const yWithinPage = relativeY - pageIndex * stride;
    mediaStatusChangeRef.current({
      page: pageIndex + 1,
      viewMode: 'print',
      xPt: clamp((frame.left - bounds.left) * (geometry.width / bounds.width), 0, geometry.width),
      yPt: clamp(yWithinPage * (geometry.height / pageHeightPx), 0, geometry.height),
    });
  }, [documentRef, editorRef, pageStageRef]);

  const refreshSelectedMediaStatus = useCallback(() => {
    const editor = editorRef.current;
    if (!editor || editor.isDestroyed) return;
    const selection = notebookEditorSelection(editor);
    const cropTargetId = cropModeImageIdRef.current;
    if (cropTargetId && (selection?.type !== 'imageFigure' || selection.id !== cropTargetId)) {
      publishImageCropMode(cropTargetId, false);
    }
    if (!selection?.id || selection.type !== 'imageFigure') {
      mediaStatusChangeRef.current(null);
      return;
    }
    const figure = [...editor.view.dom.querySelectorAll<HTMLElement>('[data-notebook-node-id]')]
      .find((element) => element.dataset.notebookNodeId === selection.id);
    if (figure) publishMediaStatusForFrame(figure.getBoundingClientRect());
  }, [editorRef, publishImageCropMode, publishMediaStatusForFrame]);

  const handleMediaInteraction = useCallback((event: NotebookMediaInteractionEvent) => {
    publishMediaStatusForFrame(event.frame);
  }, [publishMediaStatusForFrame]);

  const updateMediaDragDestination = useCallback((event: NotebookMediaDragGripEvent) => {
    const editor = editorRef.current;
    const editorElement = editor?.view.dom as HTMLElement | undefined;
    const stage = pageStageRef.current;
    const scrollRegion = scrollRegionRef.current;
    if (!editor || editor.isDestroyed || !editorElement || !stage || !scrollRegion) return;

    const candidate = globalThis.document.elementFromPoint(
      event.pointer.clientX,
      event.pointer.clientY,
    )?.closest<HTMLElement>('[data-notebook-node-id]');
    const isUsableTarget = candidate
      && editorElement.contains(candidate)
      && candidate.dataset.notebookNodeId
      && candidate.dataset.notebookNodeId !== event.nodeId;
    const content = editorContentBounds(editorElement);
    const maximumWrapWidth = notebookMaximumWrappedMediaWidthPercent(
      documentRef.current.pageSetup,
      content.width,
    );
    const wrapEnabled = maximumWrapWidth >= 10;
    if (isUsableTarget) {
      mediaFlowTargetRef.current = null;
      renderMediaFlowTargets(null, wrapEnabled);
      const targetBounds = candidate.getBoundingClientRect();
      const placement = event.pointer.clientY < targetBounds.top + targetBounds.height / 2
        ? 'before'
        : 'after';
      if (mediaDropTargetRef.current !== candidate) {
        clearMediaDropTarget();
        mediaDropTargetRef.current = candidate;
      }
      renderMediaDropGuide(candidate, placement);
      return;
    }

    clearMediaDropTarget();
    const stageBounds = stage.getBoundingClientRect();
    const scrollBounds = scrollRegion.getBoundingClientRect();
    const visibleContentBounds = {
      bottom: Math.min(stageBounds.bottom, scrollBounds.bottom),
      left: content.left,
      right: content.right,
      top: Math.max(stageBounds.top, scrollBounds.top),
    };
    if (!pointInside(event.pointer, visibleContentBounds) || content.width <= 0) {
      mediaFlowTargetRef.current = null;
      renderMediaFlowTargets(null, wrapEnabled);
      return;
    }
    const horizontalRatio = (event.pointer.clientX - content.left) / content.width;
    const target = wrapEnabled && horizontalRatio < 1 / 3
      ? 'square-left'
      : wrapEnabled && horizontalRatio > 2 / 3
        ? 'square-right'
        : 'normal';
    mediaFlowTargetRef.current = target;
    renderMediaFlowTargets(target, wrapEnabled);
  }, [
    clearMediaDropTarget,
    documentRef,
    editorRef,
    pageStageRef,
    renderMediaDropGuide,
    renderMediaFlowTargets,
    scrollRegionRef,
  ]);

  const updateMediaAutoScroll = useCallback((event: NotebookMediaDragGripEvent) => {
    latestMediaDragEventRef.current = event;
    const scrollRegion = scrollRegionRef.current;
    if (!scrollRegion) return;
    const bounds = scrollRegion.getBoundingClientRect();
    const edgeSize = Math.min(64, Math.max(36, bounds.height * 0.12));
    let velocity = 0;
    if (event.pointer.clientY >= bounds.top && event.pointer.clientY < bounds.top + edgeSize) {
      velocity = -18 * (1 - (event.pointer.clientY - bounds.top) / edgeSize);
    } else if (event.pointer.clientY <= bounds.bottom
      && event.pointer.clientY > bounds.bottom - edgeSize) {
      velocity = 18 * (1 - (bounds.bottom - event.pointer.clientY) / edgeSize);
    }
    mediaAutoScrollVelocityRef.current = velocity;
    if (velocity === 0 || mediaAutoScrollFrameRef.current !== null) return;

    const tick = () => {
      mediaAutoScrollFrameRef.current = null;
      const region = scrollRegionRef.current;
      const nextEvent = latestMediaDragEventRef.current;
      const currentVelocity = mediaAutoScrollVelocityRef.current;
      if (!region || !nextEvent || currentVelocity === 0) return;
      const maximum = Math.max(0, region.scrollHeight - region.clientHeight);
      const nextScrollTop = clamp(region.scrollTop + currentVelocity, 0, maximum);
      if (nextScrollTop === region.scrollTop) {
        mediaAutoScrollVelocityRef.current = 0;
        updateMediaDragDestination(nextEvent);
        publishMediaStatusForFrame(publishMediaDragPreview(nextEvent.frame, nextEvent.pointer));
        return;
      }
      region.scrollTop = nextScrollTop;
      updateMediaDragDestination(nextEvent);
      publishMediaStatusForFrame(publishMediaDragPreview(nextEvent.frame, nextEvent.pointer));
      mediaAutoScrollFrameRef.current = requestAnimationFrame(tick);
    };
    mediaAutoScrollFrameRef.current = requestAnimationFrame(tick);
  }, [
    publishMediaDragPreview,
    publishMediaStatusForFrame,
    scrollRegionRef,
    updateMediaDragDestination,
  ]);

  const handleMediaDragGrip = useCallback((event: NotebookMediaDragGripEvent) => {
    const editor = editorRef.current;
    if (!editor || editor.isDestroyed) return;

    if (event.phase === 'start') {
      clearMediaDropTarget();
      clearMediaDragPreview();
      mediaDragPreviewRef.current = { frame: event.frame, pointer: event.pointer };
      publishMediaStatusForFrame(event.frame);
      const editorElement = editor.view.dom as HTMLElement;
      const content = editorContentBounds(editorElement);
      renderMediaFlowTargets(null, notebookMaximumWrappedMediaWidthPercent(
        documentRef.current.pageSetup,
        content.width,
      ) >= 10);
      return;
    }

    if (event.phase === 'move') {
      publishMediaStatusForFrame(publishMediaDragPreview(event.frame, event.pointer));
      updateMediaDragDestination(event);
      updateMediaAutoScroll(event);
      return;
    }

    if (event.phase === 'cancel') {
      clearMediaDropTarget();
      clearMediaDragPreview();
      requestAnimationFrame(refreshSelectedMediaStatus);
      return;
    }
    if (event.phase !== 'end') return;

    const dropTarget = mediaDropTargetRef.current;
    const targetId = dropTarget?.dataset.notebookNodeId ?? null;
    const targetBounds = dropTarget?.getBoundingClientRect();
    const flowTarget = mediaFlowTargetRef.current;
    clearMediaDropTarget();
    clearMediaDragPreview();
    if (targetId && targetBounds) {
      const placement = event.pointer.clientY < targetBounds.top + targetBounds.height / 2
        ? 'before'
        : 'after';
      if (moveNotebookNode(editor, event.nodeId, targetId, placement, {
        sourceAttributes: { alignment: null, placement: null },
      })) {
        requestAnimationFrame(refreshSelectedMediaStatus);
        return;
      }
    }

    if (!flowTarget) {
      requestAnimationFrame(refreshSelectedMediaStatus);
      return;
    }
    const source = notebookEditorNodeById(editor, event.nodeId);
    if (!source) return;
    const node = editor.state.doc.nodeAt(source.from);
    if (!node) return;
    const placement = flowTarget === 'normal' ? null : flowTarget;
    const alignment = flowTarget === 'square-left'
      ? 'left'
      : flowTarget === 'square-right' ? 'right' : null;
    const currentWidth = normalizeNotebookMediaWidthPercent(
      typeof node.attrs.widthPercent === 'number' ? node.attrs.widthPercent : 100,
    );
    const contentWidth = editorContentBounds(editor.view.dom as HTMLElement).width;
    const maximumWrapWidth = normalizeNotebookMediaWidthPercent(
      notebookMaximumWrappedMediaWidthPercent(documentRef.current.pageSetup, contentWidth),
    );
    const widthPercent = flowTarget === 'normal'
      ? currentWidth
      : Math.min(currentWidth, maximumWrapWidth);
    if (node.attrs.placement === placement
      && node.attrs.alignment === alignment
      && currentWidth === widthPercent) {
      requestAnimationFrame(refreshSelectedMediaStatus);
      return;
    }
    const transaction = editor.state.tr.setNodeMarkup(source.from, undefined, {
      ...node.attrs,
      placement,
      alignment,
      widthPercent,
    });
    transaction.setSelection(NodeSelection.create(transaction.doc, source.from));
    editor.view.dispatch(transaction.scrollIntoView());
    requestAnimationFrame(refreshSelectedMediaStatus);
  }, [
    clearMediaDragPreview,
    clearMediaDropTarget,
    documentRef,
    editorRef,
    publishMediaDragPreview,
    publishMediaStatusForFrame,
    refreshSelectedMediaStatus,
    renderMediaFlowTargets,
    updateMediaAutoScroll,
    updateMediaDragDestination,
  ]);

  const renderBlockDragGhost = useCallback((state: BlockDragState, pointer: {
    clientX: number;
    clientY: number;
  }) => {
    let ghost = blockDragGhostRef.current;
    if (!ghost) {
      ghost = globalThis.document.createElement('div');
      ghost.className = 'notebook-block-drag-ghost';
      ghost.setAttribute('aria-hidden', 'true');
      ghost.textContent = state.label;
      globalThis.document.body.append(ghost);
      blockDragGhostRef.current = ghost;
    }
    positionBlockDragGhost(ghost, pointer);
  }, []);

  const blockTargetAtPoint = useCallback((
    sourceId: string,
    pointer: { clientX: number; clientY: number },
  ) => {
    const editor = editorRef.current;
    const editorElement = editor?.view.dom as HTMLElement | undefined;
    const notebookPage = editorElement?.closest<HTMLElement>('.app-page--notebook');
    const source = editor ? notebookEditorNodeById(editor, sourceId) : null;
    if (!editor || editor.isDestroyed || !editorElement || !notebookPage || !source) return null;

    const hits = typeof globalThis.document.elementsFromPoint === 'function'
      ? globalThis.document.elementsFromPoint(pointer.clientX, pointer.clientY)
      : [globalThis.document.elementFromPoint(pointer.clientX, pointer.clientY)].filter(Boolean) as Element[];
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
          if (targetId && target && targetId !== sourceId && !insideSource) {
            const bounds = candidate.getBoundingClientRect();
            const outlineTarget = candidate.classList.contains('notebook-outline-entry');
            const sectionEdge = Math.min(30, bounds.height * 0.2);
            const placement: NotebookMovePlacement = target.type === 'notebookSection'
              && (outlineTarget
                ? pointer.clientX > bounds.left + Math.min(68, bounds.width * 0.3)
                : pointer.clientY > bounds.top + sectionEdge
                  && pointer.clientY < bounds.bottom - sectionEdge)
              ? 'inside'
              : pointer.clientY < bounds.top + bounds.height / 2 ? 'before' : 'after';
            return { element: candidate, placement, targetId };
          }
        }
        candidate = candidate.parentElement?.closest<HTMLElement>(
          '[data-notebook-node-id], .notebook-outline-entry[data-node-id]',
        ) ?? null;
      }
    }
    return null;
  }, [editorRef]);

  const updateBlockDragDestination = useCallback((
    state: BlockDragState,
    pointer: { clientX: number; clientY: number },
  ) => {
    renderBlockDragGhost(state, pointer);
    const target = blockTargetAtPoint(state.nodeId, pointer);
    if (!target) {
      blockDropPlacementRef.current = null;
      clearMediaDropTarget();
      return;
    }
    if (mediaDropTargetRef.current !== target.element) {
      clearMediaDropTarget();
      mediaDropTargetRef.current = target.element;
    }
    blockDropPlacementRef.current = target.placement;
    renderMediaDropGuide(target.element, target.placement);
  }, [blockTargetAtPoint, clearMediaDropTarget, renderBlockDragGhost, renderMediaDropGuide]);

  const updateBlockAutoScroll = useCallback((
    pointer: { clientX: number; clientY: number },
  ) => {
    latestBlockPointerRef.current = pointer;
    const scrollRegion = scrollRegionRef.current;
    if (!scrollRegion) return;
    const bounds = scrollRegion.getBoundingClientRect();
    const edgeSize = Math.min(64, Math.max(36, bounds.height * 0.12));
    let velocity = 0;
    if (pointer.clientY >= bounds.top && pointer.clientY < bounds.top + edgeSize) {
      velocity = -18 * (1 - (pointer.clientY - bounds.top) / edgeSize);
    } else if (pointer.clientY <= bounds.bottom && pointer.clientY > bounds.bottom - edgeSize) {
      velocity = 18 * (1 - (bounds.bottom - pointer.clientY) / edgeSize);
    }
    blockAutoScrollVelocityRef.current = velocity;
    if (velocity === 0 || blockAutoScrollFrameRef.current !== null) return;

    const tick = () => {
      blockAutoScrollFrameRef.current = null;
      const region = scrollRegionRef.current;
      const latestPointer = latestBlockPointerRef.current;
      const currentState = blockDragRef.current;
      const currentVelocity = blockAutoScrollVelocityRef.current;
      if (!region || !latestPointer || !currentState?.active || currentVelocity === 0) return;
      const maximum = Math.max(0, region.scrollHeight - region.clientHeight);
      const nextScrollTop = clamp(region.scrollTop + currentVelocity, 0, maximum);
      if (nextScrollTop === region.scrollTop) {
        blockAutoScrollVelocityRef.current = 0;
        updateBlockDragDestination(currentState, latestPointer);
        return;
      }
      region.scrollTop = nextScrollTop;
      updateBlockDragDestination(currentState, latestPointer);
      blockAutoScrollFrameRef.current = requestAnimationFrame(tick);
    };
    blockAutoScrollFrameRef.current = requestAnimationFrame(tick);
  }, [scrollRegionRef, updateBlockDragDestination]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || blockDragRef.current) return;
      const editor = editorRef.current;
      const editorElement = editor?.view.dom as HTMLElement | undefined;
      const notebookPage = editorElement?.closest<HTMLElement>('.app-page--notebook');
      if (!editor || editor.isDestroyed || !editorElement || !notebookPage) return;
      const eventTarget = event.target instanceof Element ? event.target : null;
      if (!eventTarget || !notebookPage.contains(eventTarget)) return;
      const explicitHandle = eventTarget.closest<HTMLElement>('[data-notebook-block-drag-id]');
      const divider = explicitHandle ? null : eventTarget.closest<HTMLElement>(
        '.notebook-rich-editor-host hr[data-notebook-node-id]',
      );
      const pointerTarget = explicitHandle ?? divider;
      const nodeId = explicitHandle?.dataset.notebookBlockDragId
        ?? divider?.dataset.notebookNodeId
        ?? null;
      if (!pointerTarget || !nodeId || !notebookEditorNodeById(editor, nodeId)) return;

      event.preventDefault();
      event.stopPropagation();
      const state: BlockDragState = {
        active: false,
        label: explicitHandle?.dataset.notebookBlockDragLabel ?? 'Divider',
        nodeId,
        origin: { clientX: event.clientX, clientY: event.clientY },
        pointerId: event.pointerId,
        pointerTarget,
      };
      blockDragRef.current = state;
      try {
        pointerTarget.setPointerCapture?.(event.pointerId);
      } catch {
        // Pointer capture is an enhancement; window listeners retain the gesture.
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      const state = blockDragRef.current;
      if (!state || state.pointerId !== event.pointerId) return;
      const pointer = { clientX: event.clientX, clientY: event.clientY };
      if (!state.active) {
        const distance = Math.hypot(
          pointer.clientX - state.origin.clientX,
          pointer.clientY - state.origin.clientY,
        );
        if (distance < 4) return;
        state.active = true;
      }
      event.preventDefault();
      updateBlockDragDestination(state, pointer);
      updateBlockAutoScroll(pointer);
    };

    const finishBlockDrag = (event: PointerEvent, cancelled: boolean) => {
      const state = blockDragRef.current;
      if (!state || state.pointerId !== event.pointerId) return;
      const wasActive = state.active;
      const targetId = mediaDropTargetRef.current?.dataset.notebookNodeId
        ?? mediaDropTargetRef.current?.dataset.nodeId
        ?? null;
      const placement = blockDropPlacementRef.current;
      clearBlockDrag();
      if (cancelled) return;
      const editor = editorRef.current;
      if (!editor || editor.isDestroyed) return;
      if (!wasActive) {
        selectNotebookEditorNode(editor, state.nodeId);
        return;
      }
      if (targetId && placement) {
        moveNotebookNode(editor, state.nodeId, targetId, placement);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !blockDragRef.current) return;
      event.preventDefault();
      clearBlockDrag();
    };
    const handlePointerUp = (event: PointerEvent) => finishBlockDrag(event, false);
    const handlePointerCancel = (event: PointerEvent) => finishBlockDrag(event, true);

    globalThis.addEventListener('pointerdown', handlePointerDown, true);
    globalThis.addEventListener('pointermove', handlePointerMove, true);
    globalThis.addEventListener('pointerup', handlePointerUp, true);
    globalThis.addEventListener('pointercancel', handlePointerCancel, true);
    globalThis.addEventListener('keydown', handleKeyDown, true);
    return () => {
      globalThis.removeEventListener('pointerdown', handlePointerDown, true);
      globalThis.removeEventListener('pointermove', handlePointerMove, true);
      globalThis.removeEventListener('pointerup', handlePointerUp, true);
      globalThis.removeEventListener('pointercancel', handlePointerCancel, true);
      globalThis.removeEventListener('keydown', handleKeyDown, true);
      clearBlockDrag();
    };
  }, [
    clearBlockDrag,
    editorRef,
    updateBlockAutoScroll,
    updateBlockDragDestination,
  ]);

  const setPaginationMetrics = useCallback((metrics: NotebookPaginationMetrics) => {
    paginationMetricsRef.current = metrics;
  }, []);

  useEffect(() => () => {
    clearBlockDrag();
    clearMediaDropTarget();
    clearMediaDragPreview();
    mediaStatusChangeRef.current(null);
  }, [clearBlockDrag, clearMediaDragPreview, clearMediaDropTarget]);

  return {
    clearMediaDropTarget,
    handleMediaDragGrip,
    handleMediaInteraction,
    imageCropMode,
    publishImageCropMode,
    refreshSelectedMediaStatus,
    setPaginationMetrics,
  };
}
