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

type NotebookDirectMediaCanvasCoordinatorOptions = {
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

function positionMediaDropGuide(
  guide: HTMLDivElement,
  target: HTMLElement,
  placement: 'before' | 'after',
) {
  const bounds = target.getBoundingClientRect();
  guide.dataset.placement = placement;
  guide.dataset.targetNodeId = target.dataset.notebookNodeId ?? '';
  guide.style.left = `${bounds.left - 10}px`;
  guide.style.top = `${placement === 'before' ? bounds.top - 5 : bounds.bottom + 3}px`;
  guide.style.width = `${bounds.width + 20}px`;
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
 * Local current-schema canvas coordination for direct media gestures. Node views own the
 * pointer mechanics; this keeps document reordering, crop mode, and status
 * reporting next to the one Notebook canvas that can resolve them.
 */
export function useNotebookDirectMediaCanvasCoordinator({
  documentRef,
  editorRef,
  onMediaStatusChange,
  pageStageRef,
  scrollRegionRef,
  viewMode,
}: NotebookDirectMediaCanvasCoordinatorOptions) {
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

  const renderMediaDropGuide = useCallback((target: HTMLElement, placement: 'before' | 'after') => {
    let guide = mediaDropGuideRef.current;
    if (!guide) {
      guide = globalThis.document.createElement('div');
      guide.className = 'notebook-media-drop-guide';
      guide.setAttribute('aria-hidden', 'true');
      globalThis.document.body.append(guide);
      mediaDropGuideRef.current = guide;
    }
    positionMediaDropGuide(guide, target, placement);
  }, []);

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
    if (!selection?.id || (selection.type !== 'imageFigure' && selection.type !== 'videoFigure')) {
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

  const setPaginationMetrics = useCallback((metrics: NotebookPaginationMetrics) => {
    paginationMetricsRef.current = metrics;
  }, []);

  useEffect(() => () => {
    clearMediaDropTarget();
    clearMediaDragPreview();
    mediaStatusChangeRef.current(null);
  }, [clearMediaDragPreview, clearMediaDropTarget]);

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
