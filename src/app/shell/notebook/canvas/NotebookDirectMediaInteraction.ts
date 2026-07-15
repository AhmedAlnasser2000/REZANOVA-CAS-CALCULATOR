import type { Editor } from '@tiptap/core';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';

import { normalizeNotebookMediaWidthPercent } from '../../../../lib/notebook';

export const NOTEBOOK_MEDIA_RESIZE_HANDLES = [
  { value: 'north-west', label: 'top left' },
  { value: 'north', label: 'top' },
  { value: 'north-east', label: 'top right' },
  { value: 'east', label: 'right' },
  { value: 'south-east', label: 'bottom right' },
  { value: 'south', label: 'bottom' },
  { value: 'south-west', label: 'bottom left' },
  { value: 'west', label: 'left' },
] as const;

export type NotebookMediaResizeHandle = (typeof NOTEBOOK_MEDIA_RESIZE_HANDLES)[number]['value'];

export type NotebookMediaKind = 'image' | 'video';

export type NotebookMediaCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type NotebookMediaPreview = {
  widthPercent: number;
  displayAspectRatio: number;
  /** Gesture-only viewport rectangle. It is never written to the document. */
  rectanglePx: NotebookMediaViewportRectangle;
  rotation?: number;
  crop?: NotebookMediaCrop;
};

export type NotebookMediaViewportRectangle = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

export type NotebookMediaInteractionPhase = 'start' | 'move' | 'commit' | 'cancel';

export type NotebookMediaInteractionEvent = {
  nodeId: string;
  mediaType: NotebookMediaKind;
  interaction: 'resize' | 'rotate' | 'crop' | 'drag';
  phase: NotebookMediaInteractionPhase;
  pointer: { clientX: number; clientY: number };
  frame: { left: number; top: number; width: number; height: number };
  preview: NotebookMediaPreview | null;
};

export type NotebookMediaDragGripEvent = {
  nodeId: string;
  mediaType: NotebookMediaKind;
  phase: 'start' | 'move' | 'end' | 'cancel';
  pointer: { clientX: number; clientY: number };
  frame: { left: number; top: number; width: number; height: number };
};

export type NotebookDirectMediaNodeViewOptions = {
  /** Emits transient gesture state for status coordinates and insertion guides. */
  onMediaInteraction?: (event: NotebookMediaInteractionEvent) => void;
  /** Lets the canvas decide a snap placement or document reordering on drop. */
  onMediaDragGrip?: (event: NotebookMediaDragGripEvent) => void;
  /** Defaults to the V10 minimum rendered size: 36 CSS pixels at the current scale. */
  minimumSizePx?: number;
};

export type NotebookImageCropModeContext = {
  editor: Editor;
  nodeId: string;
};

export type NotebookImageNodeViewOptions = NotebookDirectMediaNodeViewOptions & {
  /**
   * Optional external state. A function can read a future Tiptap plugin state
   * without this node view owning the crop-mode coordinator.
   */
  cropMode?: boolean | ((context: NotebookImageCropModeContext) => boolean);
  onCropModeChange?: (event: { nodeId: string; active: boolean; reason: 'escape' }) => void;
};

type Gesture = {
  frame: NotebookMediaViewportRectangle;
  handle?: NotebookMediaResizeHandle;
  initial: NotebookMediaPreview;
  mode: 'resize' | 'rotate' | 'crop' | 'drag';
  pointerId: number;
  pointerTarget: HTMLElement;
  rotation: number;
  startAngle: number;
  startClientX: number;
  startClientY: number;
};

type DirectMediaInteractionOptions = {
  alignment?: 'left' | 'center' | 'right';
  crop?: NotebookMediaCrop;
  cropMode?: boolean;
  displayAspectRatio?: number;
  editor: Editor;
  frameRef: RefObject<HTMLElement | null>;
  lockedAspectRatio?: number;
  mediaType: NotebookMediaKind;
  minimumSizePx?: number;
  nodeId: string;
  onCropModeChange?: NotebookImageNodeViewOptions['onCropModeChange'];
  onMediaDragGrip?: NotebookDirectMediaNodeViewOptions['onMediaDragGrip'];
  onMediaInteraction?: NotebookDirectMediaNodeViewOptions['onMediaInteraction'];
  rotation?: number;
  selected: boolean;
  updateAttributes: (attributes: Record<string, unknown>) => void;
  widthPercent: number;
};

type ActiveGesture = Gesture['mode'] | null;

type GesturePointerEvent = {
  clientX: number;
  clientY: number;
  pointerId: number;
  shiftKey?: boolean;
  preventDefault(): void;
  stopPropagation(): void;
};

const MIN_CROP_AREA = 0.1;
const MIN_CROP_EDGE = 0.01;

function finiteNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function round(value: number, precision = 3) {
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
}

function normalizeRotation(value: number) {
  return ((Math.round(value) % 360) + 360) % 360;
}

export function normalizeNotebookMediaCrop(crop: NotebookMediaCrop): NotebookMediaCrop {
  const left = clamp(finiteNumber(crop.x, 0), 0, 1 - MIN_CROP_EDGE);
  const top = clamp(finiteNumber(crop.y, 0), 0, 1 - MIN_CROP_EDGE);
  const width = clamp(finiteNumber(crop.width, 1), MIN_CROP_EDGE, 1 - left);
  const height = clamp(finiteNumber(crop.height, 1), MIN_CROP_EDGE, 1 - top);
  return { x: left, y: top, width, height };
}

function handleVector(handle: NotebookMediaResizeHandle) {
  return {
    horizontal: handle.includes('west') ? -1 : handle.includes('east') ? 1 : 0,
    vertical: handle.includes('north') ? -1 : handle.includes('south') ? 1 : 0,
  };
}

function isCornerHandle(handle: NotebookMediaResizeHandle) {
  const vector = handleVector(handle);
  return vector.horizontal !== 0 && vector.vertical !== 0;
}

function frameSnapshot(frame: NotebookMediaViewportRectangle) {
  return {
    left: frame.left,
    top: frame.top,
    width: frame.width,
    height: frame.height,
  };
}

function pointerSnapshot(event: { clientX: number; clientY: number }) {
  return { clientX: event.clientX, clientY: event.clientY };
}

function editorContentWidth(editor: Editor, fallback: number) {
  const element = editor.view.dom as HTMLElement;
  const bounds = element.getBoundingClientRect();
  const style = getComputedStyle(element);
  const scale = element.offsetWidth > 0 ? bounds.width / element.offsetWidth : 1;
  const width = bounds.width
    - (Number.parseFloat(style.paddingLeft) || 0) * scale
    - (Number.parseFloat(style.paddingRight) || 0) * scale;
  return width > 0 ? width : fallback;
}

function aspectRatioFromFrame(frame: Pick<DOMRect, 'width' | 'height'>, fallback: number) {
  if (frame.width > 0 && frame.height > 0) {
    return clamp(frame.width / frame.height, 0.1, 10);
  }
  return clamp(fallback, 0.1, 10);
}

function viewportRectangle(
  frameElement: HTMLElement,
  bounds: DOMRect,
): NotebookMediaViewportRectangle {
  const editor = frameElement.closest<HTMLElement>('.notebook-rich-editor');
  const editorBounds = editor?.getBoundingClientRect();
  const scaleX = editor && editorBounds && editor.offsetWidth > 0
    ? editorBounds.width / editor.offsetWidth
    : 1;
  const scaleY = editor && editorBounds && editor.offsetHeight > 0
    ? editorBounds.height / editor.offsetHeight
    : scaleX;
  const width = Math.max(1, (frameElement.offsetWidth || bounds.width) * scaleX);
  const height = Math.max(1, (frameElement.offsetHeight || bounds.height) * scaleY);
  const left = bounds.left + (bounds.width - width) / 2;
  const top = bounds.top + (bounds.height - height) / 2;
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
  };
}

function pageObjectMaximumHeight(editor: Editor) {
  const stage = (editor.view.dom as HTMLElement).closest<HTMLElement>(
    '.notebook-page-stage.is-print',
  );
  if (!stage) return Number.POSITIVE_INFINITY;
  const value = Number.parseFloat(
    getComputedStyle(stage).getPropertyValue('--notebook-object-max-height-px'),
  );
  // Pagination briefly reports a 1px provisional page while its first layout
  // measurement is pending. It is not a physical limit for a direct gesture.
  return Number.isFinite(value) && value >= 36 ? value : Number.POSITIVE_INFINITY;
}

export function fitNotebookRotatedMediaFrame(
  width: number,
  height: number,
  rotation: number,
  maximumWidth: number,
  maximumHeight: number,
) {
  const radians = (rotation * Math.PI) / 180;
  const cosine = Math.abs(Math.cos(radians));
  const sine = Math.abs(Math.sin(radians));
  const renderedWidth = width * cosine + height * sine;
  const renderedHeight = width * sine + height * cosine;
  const scale = Math.min(
    1,
    maximumWidth / Math.max(1, renderedWidth),
    maximumHeight / Math.max(1, renderedHeight),
  );
  return { height: height * scale, width: width * scale };
}

function mediaPreview(
  options: DirectMediaInteractionOptions,
  rectangle: NotebookMediaViewportRectangle,
): NotebookMediaPreview {
  const contentWidth = editorContentWidth(options.editor, rectangle.width || 1);
  const derivedWidth = rectangle.width > 0 ? (rectangle.width / contentWidth) * 100 : 100;
  const widthPercent = normalizeNotebookMediaWidthPercent(
    finiteNumber(options.widthPercent, derivedWidth),
  );
  const ratio = typeof options.displayAspectRatio === 'number'
    ? clamp(options.displayAspectRatio, 0.1, 10)
    : aspectRatioFromFrame(rectangle, 1);
  return {
    widthPercent,
    displayAspectRatio: clamp(ratio, 0.1, 10),
    rectanglePx: rectangle,
    ...(options.rotation === undefined ? {} : { rotation: normalizeRotation(options.rotation) }),
    ...(options.crop ? { crop: normalizeNotebookMediaCrop(options.crop) } : {}),
  };
}

type ResizeRectangleInput = {
  handle: NotebookMediaResizeHandle;
  lockedAspectRatio?: number;
  maximumHeight: number;
  maximumWidth: number;
  minimumSize: number;
  movementX: number;
  movementY: number;
  rectangle: NotebookMediaViewportRectangle;
};

/**
 * Computes the single content rectangle used by media, its selection border,
 * and its handles. Images lock only corners; videos supply lockedAspectRatio
 * so every handle remains proportional.
 */
export function resizeNotebookMediaRectangle(input: ResizeRectangleInput) {
  const vector = handleVector(input.handle);
  const lockedRatio = typeof input.lockedAspectRatio === 'number'
    ? clamp(input.lockedAspectRatio, 0.1, 10)
    : undefined;
  const currentRatio = clamp(
    input.rectangle.width / Math.max(1, input.rectangle.height),
    0.1,
    10,
  );
  const ratio = lockedRatio ?? currentRatio;
  let width = input.rectangle.width;
  let height = input.rectangle.height;

  if (lockedRatio || isCornerHandle(input.handle)) {
    const widthCandidate = input.rectangle.width + input.movementX * vector.horizontal;
    const heightCandidate = input.rectangle.height + input.movementY * vector.vertical;
    let candidateWidth: number;
    if (vector.horizontal === 0) {
      candidateWidth = heightCandidate * ratio;
    } else if (vector.vertical === 0) {
      candidateWidth = widthCandidate;
    } else {
      const widthDelta = widthCandidate - input.rectangle.width;
      const heightAsWidthDelta = heightCandidate * ratio - input.rectangle.width;
      candidateWidth = input.rectangle.width + (
        Math.abs(widthDelta) >= Math.abs(heightAsWidthDelta) ? widthDelta : heightAsWidthDelta
      );
    }
    const minimumWidth = Math.max(input.minimumSize, input.minimumSize * ratio);
    const maximumWidth = Math.min(input.maximumWidth, input.maximumHeight * ratio);
    width = clamp(candidateWidth, minimumWidth, Math.max(minimumWidth, maximumWidth));
    height = width / ratio;
  } else if (vector.horizontal !== 0) {
    width = input.rectangle.width + input.movementX * vector.horizontal;
  } else {
    height = input.rectangle.height + input.movementY * vector.vertical;
  }

  if (!lockedRatio && !isCornerHandle(input.handle)) {
    width = clamp(width, input.minimumSize, input.maximumWidth);
    height = clamp(height, input.minimumSize, input.maximumHeight);
  }

  width = Math.max(input.minimumSize, Math.min(input.maximumWidth, width));
  height = Math.max(input.minimumSize, Math.min(input.maximumHeight, height));
  return rectangleFromSize(input.rectangle, input.handle, width, height);
}

function rectangleFromSize(
  rectangle: NotebookMediaViewportRectangle,
  handle: NotebookMediaResizeHandle,
  width: number,
  height: number,
): NotebookMediaViewportRectangle {
  const vector = handleVector(handle);
  const centerX = rectangle.left + rectangle.width / 2;
  const centerY = rectangle.top + rectangle.height / 2;
  const left = vector.horizontal < 0
    ? rectangle.right - width
    : vector.horizontal > 0 ? rectangle.left : centerX - width / 2;
  const top = vector.vertical < 0
    ? rectangle.bottom - height
    : vector.vertical > 0 ? rectangle.top : centerY - height / 2;
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
  };
}

function flowAlignedRectangle(
  rectangle: NotebookMediaViewportRectangle,
  width: number,
  height: number,
  alignment: DirectMediaInteractionOptions['alignment'],
): NotebookMediaViewportRectangle {
  const left = alignment === 'left'
    ? rectangle.left
    : alignment === 'right'
      ? rectangle.right - width
      : rectangle.left + (rectangle.width - width) / 2;
  const top = rectangle.top;
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
  };
}

function cropWithMinimumArea(
  left: number,
  right: number,
  top: number,
  bottom: number,
  handle: NotebookMediaResizeHandle,
): NotebookMediaCrop {
  const vector = handleVector(handle);
  let nextLeft = clamp(left, 0, 1 - MIN_CROP_EDGE);
  let nextRight = clamp(right, nextLeft + MIN_CROP_EDGE, 1);
  let nextTop = clamp(top, 0, 1 - MIN_CROP_EDGE);
  let nextBottom = clamp(bottom, nextTop + MIN_CROP_EDGE, 1);

  const expandHorizontal = () => {
    const height = nextBottom - nextTop;
    const neededWidth = Math.min(1, MIN_CROP_AREA / Math.max(height, MIN_CROP_EDGE));
    if (vector.horizontal < 0) {
      nextLeft = Math.max(0, nextRight - neededWidth);
    } else {
      nextRight = Math.min(1, nextLeft + neededWidth);
    }
  };
  const expandVertical = () => {
    const width = nextRight - nextLeft;
    const neededHeight = Math.min(1, MIN_CROP_AREA / Math.max(width, MIN_CROP_EDGE));
    if (vector.vertical < 0) {
      nextTop = Math.max(0, nextBottom - neededHeight);
    } else {
      nextBottom = Math.min(1, nextTop + neededHeight);
    }
  };

  if ((nextRight - nextLeft) * (nextBottom - nextTop) < MIN_CROP_AREA) {
    if (vector.horizontal !== 0) expandHorizontal();
    if ((nextRight - nextLeft) * (nextBottom - nextTop) < MIN_CROP_AREA
      && vector.vertical !== 0) {
      expandVertical();
    }
    if ((nextRight - nextLeft) * (nextBottom - nextTop) < MIN_CROP_AREA) {
      expandVertical();
    }
  }

  return {
    x: round(nextLeft, 4),
    y: round(nextTop, 4),
    width: round(nextRight - nextLeft, 4),
    height: round(nextBottom - nextTop, 4),
  };
}

function resizedPreview(
  gesture: Gesture,
  event: { clientX: number; clientY: number },
  options: DirectMediaInteractionOptions,
): NotebookMediaPreview {
  const handle = gesture.handle;
  if (!handle) return gesture.initial;
  const minimumSize = Math.max(1, finiteNumber(options.minimumSizePx, 36));
  const contentWidth = editorContentWidth(options.editor, gesture.frame.width || 1);
  const maximumWidth = Math.max(minimumSize, contentWidth);
  const maximumHeight = Math.max(
    minimumSize,
    Math.min(contentWidth / 0.1, pageObjectMaximumHeight(options.editor)),
  );
  const radians = (gesture.rotation * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const screenDeltaX = event.clientX - gesture.startClientX;
  const screenDeltaY = event.clientY - gesture.startClientY;
  const deltaX = screenDeltaX * cosine + screenDeltaY * sine;
  const deltaY = -screenDeltaX * sine + screenDeltaY * cosine;
  const horizontalMovement = options.alignment === 'center'
    && handleVector(handle).horizontal !== 0
    ? deltaX * 2
    : deltaX;
  let rectangle = resizeNotebookMediaRectangle({
    handle,
    rectangle: gesture.frame,
    movementX: horizontalMovement,
    movementY: deltaY,
    minimumSize,
    maximumWidth,
    maximumHeight,
    ...(typeof options.lockedAspectRatio === 'number'
      ? { lockedAspectRatio: options.lockedAspectRatio }
      : {}),
  });
  const fitted = fitNotebookRotatedMediaFrame(
    rectangle.width,
    rectangle.height,
    gesture.rotation,
    maximumWidth,
    maximumHeight,
  );
  rectangle = flowAlignedRectangle(
    gesture.frame,
    fitted.width,
    fitted.height,
    options.alignment,
  );
  let { width, height } = rectangle;
  let displayAspectRatio = clamp(width / height, 0.1, 10);
  if (displayAspectRatio === 0.1) {
    height = width / displayAspectRatio;
  } else if (displayAspectRatio === 10) {
    width = height * displayAspectRatio;
  }
  displayAspectRatio = clamp(width / height, 0.1, 10);
  rectangle = flowAlignedRectangle(gesture.frame, width, height, options.alignment);
  const widthPercent = normalizeNotebookMediaWidthPercent((width / contentWidth) * 100);
  return {
    ...gesture.initial,
    widthPercent,
    displayAspectRatio: round(displayAspectRatio),
    rectanglePx: rectangle,
  };
}

function rotatedPreview(
  gesture: Gesture,
  event: { clientX: number; clientY: number; shiftKey?: boolean },
  options: DirectMediaInteractionOptions,
): NotebookMediaPreview {
  const centerX = gesture.frame.left + gesture.frame.width / 2;
  const centerY = gesture.frame.top + gesture.frame.height / 2;
  const angle = Math.atan2(event.clientY - centerY, event.clientX - centerX) * (180 / Math.PI);
  const initialRotation = gesture.initial.rotation ?? 0;
  const rawRotation = initialRotation + angle - gesture.startAngle;
  const rotation = event.shiftKey ? Math.round(rawRotation / 15) * 15 : rawRotation;
  const normalizedRotation = normalizeRotation(rotation);
  const contentWidth = editorContentWidth(options.editor, gesture.frame.width || 1);
  const maximumHeight = pageObjectMaximumHeight(options.editor);
  const baseWidth = contentWidth * (gesture.initial.widthPercent / 100);
  const baseHeight = baseWidth / gesture.initial.displayAspectRatio;
  const fitted = fitNotebookRotatedMediaFrame(
    baseWidth,
    baseHeight,
    normalizedRotation,
    contentWidth,
    maximumHeight,
  );
  return {
    ...gesture.initial,
    rotation: normalizedRotation,
    widthPercent: normalizeNotebookMediaWidthPercent((fitted.width / contentWidth) * 100),
  };
}

function croppedPreview(
  gesture: Gesture,
  event: { clientX: number; clientY: number },
): NotebookMediaPreview {
  const handle = gesture.handle;
  const crop = gesture.initial.crop;
  if (!handle || !crop || gesture.frame.width <= 0 || gesture.frame.height <= 0) {
    return gesture.initial;
  }
  const vector = handleVector(handle);
  const deltaX = ((event.clientX - gesture.startClientX) / gesture.frame.width) * crop.width;
  const deltaY = ((event.clientY - gesture.startClientY) / gesture.frame.height) * crop.height;
  let left = crop.x;
  let right = crop.x + crop.width;
  let top = crop.y;
  let bottom = crop.y + crop.height;
  if (vector.horizontal < 0) left = clamp(left + deltaX, 0, right - MIN_CROP_EDGE);
  if (vector.horizontal > 0) right = clamp(right + deltaX, left + MIN_CROP_EDGE, 1);
  if (vector.vertical < 0) top = clamp(top + deltaY, 0, bottom - MIN_CROP_EDGE);
  if (vector.vertical > 0) bottom = clamp(bottom + deltaY, top + MIN_CROP_EDGE, 1);
  return {
    ...gesture.initial,
    crop: cropWithMinimumArea(left, right, top, bottom, handle),
  };
}

function attributesForGesture(gesture: Gesture, preview: NotebookMediaPreview) {
  const attributes: Record<string, unknown> = {};
  if (preview.widthPercent !== gesture.initial.widthPercent) {
    attributes.widthPercent = preview.widthPercent;
  }
  if (Math.abs(preview.displayAspectRatio - gesture.initial.displayAspectRatio) >= 0.001) {
    attributes.displayAspectRatio = preview.displayAspectRatio;
  }
  if (gesture.mode === 'rotate' && preview.rotation !== gesture.initial.rotation) {
    attributes.rotation = preview.rotation;
  }
  if (gesture.mode === 'crop' && preview.crop && gesture.initial.crop) {
    if (preview.crop.x !== gesture.initial.crop.x) attributes.cropX = preview.crop.x;
    if (preview.crop.y !== gesture.initial.crop.y) attributes.cropY = preview.crop.y;
    if (preview.crop.width !== gesture.initial.crop.width) attributes.cropWidth = preview.crop.width;
    if (preview.crop.height !== gesture.initial.crop.height) attributes.cropHeight = preview.crop.height;
  }
  return attributes;
}

function interactionFrame(gesture: Gesture, preview: NotebookMediaPreview | null) {
  if (!preview || gesture.mode !== 'resize') {
    return frameSnapshot(gesture.frame);
  }
  return frameSnapshot(preview.rectanglePx);
}

export function useNotebookDirectMediaInteraction(options: DirectMediaInteractionOptions) {
  const gestureRef = useRef<Gesture | null>(null);
  const previewRef = useRef<NotebookMediaPreview | null>(null);
  const [preview, setPreview] = useState<NotebookMediaPreview | null>(null);
  const [activeGesture, setActiveGesture] = useState<ActiveGesture>(null);

  const emitInteraction = useCallback((
    gesture: Gesture,
    phase: NotebookMediaInteractionPhase,
    event: { clientX: number; clientY: number },
    nextPreview: NotebookMediaPreview | null,
  ) => {
    options.onMediaInteraction?.({
      nodeId: options.nodeId,
      mediaType: options.mediaType,
      interaction: gesture.mode,
      phase,
      pointer: pointerSnapshot(event),
      frame: interactionFrame(gesture, nextPreview),
      preview: nextPreview,
    });
  }, [options]);

  const emitDrag = useCallback((
    gesture: Gesture,
    phase: NotebookMediaDragGripEvent['phase'],
    event: { clientX: number; clientY: number },
  ) => {
    options.onMediaDragGrip?.({
      nodeId: options.nodeId,
      mediaType: options.mediaType,
      phase,
      pointer: pointerSnapshot(event),
      frame: frameSnapshot(gesture.frame),
    });
  }, [options]);

  const clearGesture = useCallback(() => {
    const gesture = gestureRef.current;
    if (gesture?.pointerTarget.hasPointerCapture?.(gesture.pointerId)) {
      gesture.pointerTarget.releasePointerCapture(gesture.pointerId);
    }
    gestureRef.current = null;
    previewRef.current = null;
    setPreview(null);
    setActiveGesture(null);
  }, []);

  const previewAtPointer = useCallback((
    gesture: Gesture,
    event: { clientX: number; clientY: number; shiftKey?: boolean },
  ) => {
    if (gesture.mode === 'resize') return resizedPreview(gesture, event, options);
    if (gesture.mode === 'rotate') return rotatedPreview(gesture, event, options);
    if (gesture.mode === 'crop') return croppedPreview(gesture, event);
    return null;
  }, [options]);

  const begin = useCallback((
    event: ReactPointerEvent<HTMLElement>,
    mode: Gesture['mode'],
    handle?: NotebookMediaResizeHandle,
  ) => {
    if (event.button !== 0 || options.editor.isDestroyed) return;
    const frameElement = options.frameRef.current;
    if (!frameElement) return;
    const frame = frameElement.getBoundingClientRect();
    if (frame.width <= 0 || frame.height <= 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const measuredFrame = viewportRectangle(frameElement, frame);
    const initial = mediaPreview(options, measuredFrame);
    const centerX = frame.left + frame.width / 2;
    const centerY = frame.top + frame.height / 2;
    const gesture: Gesture = {
      frame: measuredFrame,
      handle,
      initial,
      mode,
      pointerId: event.pointerId,
      pointerTarget: event.currentTarget,
      rotation: options.mediaType === 'image' ? normalizeRotation(options.rotation ?? 0) : 0,
      startAngle: Math.atan2(event.clientY - centerY, event.clientX - centerX) * (180 / Math.PI),
      startClientX: event.clientX,
      startClientY: event.clientY,
    };
    gestureRef.current = gesture;
    previewRef.current = mode === 'drag' ? null : initial;
    setPreview(mode === 'drag' ? null : initial);
    setActiveGesture(mode);
    emitInteraction(gesture, 'start', event, previewRef.current);
    if (mode === 'drag') emitDrag(gesture, 'start', event);
  }, [emitDrag, emitInteraction, options]);

  const beginResize = useCallback((
    event: ReactPointerEvent<HTMLElement>,
    handle: NotebookMediaResizeHandle,
  ) => begin(event, 'resize', handle), [begin]);
  const beginRotation = useCallback((event: ReactPointerEvent<HTMLElement>) => begin(event, 'rotate'), [begin]);
  const beginCrop = useCallback((
    event: ReactPointerEvent<HTMLElement>,
    handle: NotebookMediaResizeHandle,
  ) => begin(event, 'crop', handle), [begin]);
  const beginDrag = useCallback((event: ReactPointerEvent<HTMLElement>) => begin(event, 'drag'), [begin]);

  const handlePointerMoveEvent = useCallback((event: GesturePointerEvent) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    if (gesture.mode === 'drag') {
      emitInteraction(gesture, 'move', event, null);
      emitDrag(gesture, 'move', event);
      return;
    }
    const nextPreview = previewAtPointer(gesture, event);
    previewRef.current = nextPreview;
    setPreview(nextPreview);
    emitInteraction(gesture, 'move', event, nextPreview);
  }, [emitDrag, emitInteraction, previewAtPointer]);

  const finishPointerEvent = useCallback((
    event: GesturePointerEvent,
    cancelled = false,
  ) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    if (gesture.mode === 'drag') {
      const phase = cancelled ? 'cancel' : 'end';
      emitInteraction(gesture, cancelled ? 'cancel' : 'commit', event, null);
      emitDrag(gesture, phase, event);
      clearGesture();
      return;
    }
    const nextPreview = cancelled ? gesture.initial : previewAtPointer(gesture, event) ?? gesture.initial;
    if (!cancelled) {
      const attributes = attributesForGesture(gesture, nextPreview);
      if (Object.keys(attributes).length > 0) {
        options.updateAttributes(attributes);
      }
      emitInteraction(gesture, 'commit', event, nextPreview);
    } else {
      emitInteraction(gesture, 'cancel', event, gesture.initial);
    }
    clearGesture();
  }, [clearGesture, emitDrag, emitInteraction, options, previewAtPointer]);

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    handlePointerMoveEvent(event);
  }, [handlePointerMoveEvent]);

  const finishPointer = useCallback((
    event: ReactPointerEvent<HTMLElement>,
    cancelled = false,
  ) => {
    finishPointerEvent(event, cancelled);
  }, [finishPointerEvent]);

  const cancel = useCallback(() => {
    const gesture = gestureRef.current;
    if (gesture) {
      const event = { clientX: gesture.startClientX, clientY: gesture.startClientY };
      if (gesture.mode === 'drag') {
        emitInteraction(gesture, 'cancel', event, null);
        emitDrag(gesture, 'cancel', event);
      } else {
        emitInteraction(gesture, 'cancel', event, gesture.initial);
      }
      clearGesture();
    }
    if (options.cropMode) {
      options.onCropModeChange?.({ nodeId: options.nodeId, active: false, reason: 'escape' });
    }
  }, [clearGesture, emitDrag, emitInteraction, options]);

  useEffect(() => {
    if (!activeGesture && !(options.cropMode && options.selected)) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      cancel();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [activeGesture, cancel, options.cropMode, options.selected]);

  useEffect(() => {
    if (!activeGesture) return undefined;
    const onPointerMove = (event: PointerEvent) => handlePointerMoveEvent(event);
    const onPointerUp = (event: PointerEvent) => finishPointerEvent(event);
    const onPointerCancel = (event: PointerEvent) => finishPointerEvent(event, true);
    window.addEventListener('pointermove', onPointerMove, true);
    window.addEventListener('pointerup', onPointerUp, true);
    window.addEventListener('pointercancel', onPointerCancel, true);
    return () => {
      window.removeEventListener('pointermove', onPointerMove, true);
      window.removeEventListener('pointerup', onPointerUp, true);
      window.removeEventListener('pointercancel', onPointerCancel, true);
    };
  }, [activeGesture, finishPointerEvent, handlePointerMoveEvent]);

  useEffect(() => () => clearGesture(), [clearGesture]);

  return {
    activeGesture,
    beginCrop,
    beginDrag,
    beginResize,
    beginRotation,
    cancel,
    finishPointer,
    handlePointerMove,
    preview,
  };
}
