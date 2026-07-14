import type { Editor } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';
import { useCallback, useEffect, useRef, type RefObject } from 'react';

import {
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

type NotebookDirectMediaCanvasCoordinatorOptions = {
  documentRef: RefObject<NotebookRichDocument>;
  editorRef: RefObject<Editor | null>;
  onMediaStatusChange: (status: NotebookMediaStatus | null) => void;
  pageStageRef: RefObject<HTMLDivElement | null>;
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

/**
 * Local V10 canvas coordination for direct media gestures. Node views own the
 * pointer mechanics; this keeps document reordering, crop mode, and status
 * reporting next to the one Notebook canvas that can resolve them.
 */
export function useNotebookDirectMediaCanvasCoordinator({
  documentRef,
  editorRef,
  onMediaStatusChange,
  pageStageRef,
  viewMode,
}: NotebookDirectMediaCanvasCoordinatorOptions) {
  const mediaStatusChangeRef = useRef(onMediaStatusChange);
  const viewModeRef = useRef(viewMode);
  const paginationMetricsRef = useRef<NotebookPaginationMetrics | null>(null);
  const cropModeImageIdRef = useRef<string | null>(null);
  const mediaDropTargetRef = useRef<HTMLElement | null>(null);
  const mediaDragGhostRef = useRef<HTMLDivElement | null>(null);
  const mediaDragPreviewRef = useRef<MediaDragPreview | null>(null);

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
    mediaDropTargetRef.current?.removeAttribute('data-notebook-media-drop-target');
    mediaDropTargetRef.current = null;
  }, []);

  const clearMediaDragPreview = useCallback(() => {
    mediaDragGhostRef.current?.remove();
    mediaDragGhostRef.current = null;
    mediaDragPreviewRef.current = null;
  }, []);

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

  const handleMediaDragGrip = useCallback((event: NotebookMediaDragGripEvent) => {
    const editor = editorRef.current;
    publishMediaStatusForFrame(event.frame);
    if (!editor || editor.isDestroyed) return;

    if (event.phase === 'start') {
      clearMediaDragPreview();
      mediaDragPreviewRef.current = { frame: event.frame, pointer: event.pointer };
      return;
    }

    if (event.phase === 'move') {
      publishMediaStatusForFrame(publishMediaDragPreview(event.frame, event.pointer));
      const candidate = globalThis.document.elementFromPoint(
        event.pointer.clientX,
        event.pointer.clientY,
      )?.closest<HTMLElement>('[data-notebook-node-id]');
      const isUsableTarget = candidate
        && editor.view.dom.contains(candidate)
        && candidate.dataset.notebookNodeId
        && candidate.dataset.notebookNodeId !== event.nodeId;
      if (!isUsableTarget) {
        clearMediaDropTarget();
        return;
      }
      const targetBounds = candidate.getBoundingClientRect();
      const placement = event.pointer.clientY < targetBounds.top + targetBounds.height / 2
        ? 'before'
        : 'after';
      if (mediaDropTargetRef.current !== candidate) {
        clearMediaDropTarget();
        mediaDropTargetRef.current = candidate;
      }
      candidate.setAttribute('data-notebook-media-drop-target', placement);
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

    const stageBounds = pageStageRef.current?.getBoundingClientRect();
    const source = notebookEditorNodeById(editor, event.nodeId);
    if (!stageBounds || !source || stageBounds.width <= 0) return;
    const node = editor.state.doc.nodeAt(source.from);
    if (!node) return;
    const horizontalRatio = (event.pointer.clientX - stageBounds.left) / stageBounds.width;
    const placement = horizontalRatio < 1 / 3
      ? 'square-left'
      : horizontalRatio > 2 / 3 ? 'square-right' : null;
    const alignment = placement === 'square-left' ? 'left' : placement === 'square-right' ? 'right' : null;
    if (node.attrs.placement === placement && node.attrs.alignment === alignment) return;
    const transaction = editor.state.tr.setNodeMarkup(source.from, undefined, {
      ...node.attrs,
      placement,
      alignment,
    });
    transaction.setSelection(NodeSelection.create(transaction.doc, source.from));
    editor.view.dispatch(transaction.scrollIntoView());
    requestAnimationFrame(refreshSelectedMediaStatus);
  }, [
    clearMediaDragPreview,
    clearMediaDropTarget,
    editorRef,
    pageStageRef,
    publishMediaDragPreview,
    publishMediaStatusForFrame,
    refreshSelectedMediaStatus,
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
