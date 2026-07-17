import type { ReactNodeViewProps } from '@tiptap/react';
import { NodeViewWrapper, useEditorState } from '@tiptap/react';
import { NodeSelection } from '@tiptap/pm/state';
import { GripVertical, ImageOff, RotateCw } from 'lucide-react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';

import {
  DEFAULT_NOTEBOOK_PAGE_SETUP,
  normalizeNotebookMediaWidthPercent,
  notebookEffectiveImagePlacement,
  type NotebookAssetPort,
  type NotebookImagePlacement,
  type NotebookPageSetup,
} from '../../../../lib/notebook';
import {
  NOTEBOOK_MEDIA_RESIZE_HANDLES,
  normalizeNotebookMediaCrop,
  resizeNotebookMediaByKeyboard,
  useNotebookDirectMediaInteraction,
  type NotebookImageNodeViewOptions,
} from './NotebookDirectMediaInteraction';

export type { NotebookImageNodeViewOptions } from './NotebookDirectMediaInteraction';

type ImageLoadState =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'ready'; url: string };

function finiteAttr(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function normalizeRotation(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value)
    ? ((Math.round(value) % 360) + 360) % 360
    : 0;
}

function roundPoint(value: number) {
  return Math.round(value * 1000) / 1000;
}

function keyboardStep(event: KeyboardEvent<HTMLElement>) {
  return event.shiftKey ? 10 : 1;
}

function arrowDelta(event: KeyboardEvent<HTMLElement>) {
  const step = keyboardStep(event);
  switch (event.key) {
    case 'ArrowLeft':
      return { x: -step, y: 0 };
    case 'ArrowRight':
      return { x: step, y: 0 };
    case 'ArrowUp':
      return { x: 0, y: -step };
    case 'ArrowDown':
      return { x: 0, y: step };
    default:
      return null;
  }
}

function isFloatingPlacement(value: unknown): value is {
  mode: 'floating';
  xPt: number;
  yPt: number;
  [key: string]: unknown;
} {
  return Boolean(value && typeof value === 'object'
    && !Array.isArray(value)
    && (value as { mode?: unknown }).mode === 'floating'
    && typeof (value as { xPt?: unknown }).xPt === 'number'
    && typeof (value as { yPt?: unknown }).yPt === 'number');
}

export function createNotebookImageNodeView(
  assetPort: NotebookAssetPort,
  options: NotebookImageNodeViewOptions = {},
) {
  return function NotebookImageNodeView({
    editor,
    getPos,
    node,
    selected,
    updateAttributes,
  }: ReactNodeViewProps) {
    const nodeId = String(node.attrs.id ?? 'notebook.image');
    const assetId = String(node.attrs.assetId ?? '');
    const [loadState, setLoadState] = useState<ImageLoadState>({ status: 'loading' });
    const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
    const [renderedContentWidth, setRenderedContentWidth] = useState<number>();
    const [eventCropMode, setEventCropMode] = useState(false);
    const [accessibilityStatus, setAccessibilityStatus] = useState('');
    const frameRef = useRef<HTMLDivElement | null>(null);

    const figureNumber = useEditorState({
      editor,
      selector: ({ editor: currentEditor }) => {
        const ownPosition = getPos();
        if (typeof ownPosition !== 'number' || node.attrs.numbered !== true) return null;
        let count = 0;
        currentEditor.state.doc.descendants((candidate, position) => {
          if (position > ownPosition) return false;
          if (candidate.type.name === 'imageFigure' && candidate.attrs.numbered === true) count += 1;
          return position < ownPosition;
        });
        return count || null;
      },
    });

    useEffect(() => {
      let cancelled = false;
      let objectUrl: string | null = null;
      setLoadState({ status: 'loading' });
      setNaturalSize(null);
      void assetPort.load(assetId).then((payload) => {
        if (cancelled) return;
        if (!payload) {
          setLoadState({ status: 'missing' });
          return;
        }
        objectUrl = URL.createObjectURL(new Blob(
          [payload.bytes as BlobPart],
          { type: payload.metadata.mimeType },
        ));
        setLoadState({ status: 'ready', url: objectUrl });
      }).catch(() => {
        if (!cancelled) setLoadState({ status: 'missing' });
      });
      return () => {
        cancelled = true;
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      };
    }, [assetId]);

    useEffect(() => {
      const editorElement = editor.view.dom as HTMLElement;
      let frame = 0;
      const measure = () => {
        frame = 0;
        const style = getComputedStyle(editorElement);
        const width = editorElement.clientWidth
          - (Number.parseFloat(style.paddingLeft) || 0)
          - (Number.parseFloat(style.paddingRight) || 0);
        if (width <= 0) return;
        setRenderedContentWidth((current) => (
          current !== undefined && Math.abs(current - width) < 0.5 ? current : width
        ));
      };
      const schedule = () => {
        if (frame) cancelAnimationFrame(frame);
        frame = requestAnimationFrame(measure);
      };
      const observer = typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(schedule);
      observer?.observe(editorElement);
      schedule();
      globalThis.addEventListener('resize', schedule);
      return () => {
        if (frame) cancelAnimationFrame(frame);
        observer?.disconnect();
        globalThis.removeEventListener('resize', schedule);
      };
    }, [editor]);

    useEffect(() => {
      const editorElement = editor.view.dom as HTMLElement;
      const onCropModeChange = (event: Event) => {
        const detail = (event as CustomEvent<{ active?: boolean; nodeId?: string | null }>).detail;
        setEventCropMode(detail?.active === true && detail.nodeId === nodeId);
      };
      editorElement.addEventListener('notebook-image-crop-mode-change', onCropModeChange);
      return () => editorElement.removeEventListener('notebook-image-crop-mode-change', onCropModeChange);
    }, [editor, nodeId]);

    const crop = useMemo(() => {
      const { cropX, cropY, cropWidth, cropHeight } = node.attrs;
      if (![cropX, cropY, cropWidth, cropHeight].every((value) => typeof value === 'number')) {
        return { x: 0, y: 0, width: 1, height: 1 };
      }
      return normalizeNotebookMediaCrop({
        x: Number(cropX),
        y: Number(cropY),
        width: Number(cropWidth),
        height: Number(cropHeight),
      });
    }, [node.attrs]);

    const configuredCropMode = useEditorState({
      editor,
      selector: ({ editor: currentEditor }) => {
        if (typeof options.cropMode === 'function') {
          return options.cropMode({ editor: currentEditor, nodeId });
        }
        return options.cropMode === true;
      },
    });
    const cropMode = eventCropMode || configuredCropMode;
    const selectedImageNodeId = useEditorState({
      editor,
      selector: ({ editor: currentEditor }) => {
        const { selection } = currentEditor.state;
        return selection instanceof NodeSelection && selection.node.type.name === 'imageFigure'
          ? String(selection.node.attrs.id ?? '')
          : null;
      },
    });
    const isSelected = selected || selectedImageNodeId === nodeId;
    const widthPercent = normalizeNotebookMediaWidthPercent(finiteAttr(node.attrs.widthPercent) ?? 100);
    const displayWidthPt = finiteAttr(node.attrs.displayWidthPt);
    const displayHeightPt = finiteAttr(node.attrs.displayHeightPt);
    const rotation = normalizeRotation(node.attrs.rotation);
    const displayAspectRatio = finiteAttr(node.attrs.displayAspectRatio)
      ?? (displayWidthPt && displayHeightPt ? displayWidthPt / displayHeightPt : undefined);

    const interaction = useNotebookDirectMediaInteraction({
      alignment: node.attrs.alignment === 'left' || node.attrs.alignment === 'right'
        ? node.attrs.alignment
        : 'center',
      crop,
      cropMode,
      displayAspectRatio,
      displayHeightPt,
      displayWidthPt,
      editor,
      frameRef,
      mediaType: 'image',
      minimumSizePx: options.minimumSizePx,
      nodeId,
      onCropModeChange: options.onCropModeChange,
      onMediaDragGrip: options.onMediaDragGrip,
      onMediaInteraction: options.onMediaInteraction,
      rotation,
      selected: isSelected,
      updateAttributes,
      widthPercent,
    });

    const effectiveCrop = interaction.preview?.crop ?? crop;
    const effectiveWidthPercent = interaction.preview?.widthPercent ?? widthPercent;
    const effectiveRotation = interaction.preview?.rotation ?? rotation;
    const effectiveDisplayWidthPt = interaction.preview?.displayWidthPt ?? displayWidthPt;
    const effectiveDisplayHeightPt = interaction.preview?.displayHeightPt ?? displayHeightPt;
    const effectiveAspectRatio = interaction.preview?.displayAspectRatio
      ?? displayAspectRatio
      ?? (naturalSize ? naturalSize.width / naturalSize.height : undefined);
    const imageWidth = interaction.activeGesture === 'resize' && interaction.preview?.rectanglePx.width
      ? `calc(${interaction.preview.rectanglePx.width}px / var(--page-ui-scale, 1))`
      : effectiveDisplayWidthPt !== undefined
        ? `${effectiveDisplayWidthPt}pt`
        : `${effectiveWidthPercent}%`;
    const imageHeight = interaction.activeGesture === 'resize' && interaction.preview?.rectanglePx.height
      ? `calc(${interaction.preview.rectanglePx.height}px / var(--page-ui-scale, 1))`
      : effectiveDisplayHeightPt !== undefined
        ? `${effectiveDisplayHeightPt}pt`
        : undefined;
    const figureStyle = {
      '--notebook-image-width': imageWidth,
      '--notebook-image-rotation': `${effectiveRotation}deg`,
      boxSizing: 'border-box',
      maxWidth: effectiveDisplayWidthPt !== undefined ? 'none' : '100%',
      width: imageWidth,
      ...(imageHeight === undefined ? {} : { '--notebook-image-height': imageHeight }),
      ...(effectiveAspectRatio === undefined
        ? {}
        : { '--notebook-media-display-aspect-ratio': String(effectiveAspectRatio) }),
    } as CSSProperties;
    const cropImageStyle = useMemo<CSSProperties>(() => ({
      width: `${100 / effectiveCrop.width}%`,
      height: `${100 / effectiveCrop.height}%`,
      left: `${-(effectiveCrop.x / effectiveCrop.width) * 100}%`,
      maxHeight: 'none',
      maxWidth: 'none',
      objectFit: 'fill',
      position: 'absolute',
      top: `${-(effectiveCrop.y / effectiveCrop.height) * 100}%`,
    }), [effectiveCrop]);
    const cropOverlayStyle = useMemo(() => ({
      '--notebook-crop-x': `${effectiveCrop.x * 100}%`,
      '--notebook-crop-y': `${effectiveCrop.y * 100}%`,
      '--notebook-crop-width': `${effectiveCrop.width * 100}%`,
      '--notebook-crop-height': `${effectiveCrop.height * 100}%`,
    }) as CSSProperties, [effectiveCrop]);
    const sourceAspectRatio = naturalSize
      ? (naturalSize.width / Math.max(1, naturalSize.height)) * (effectiveCrop.width / effectiveCrop.height)
      : effectiveAspectRatio;
    const bitmapStageStyle = useMemo<CSSProperties>(() => {
      if (sourceAspectRatio === undefined || effectiveAspectRatio === undefined) return {};
      return {
        '--notebook-image-source-aspect-ratio': String(sourceAspectRatio),
        '--notebook-image-target-aspect-ratio': String(effectiveAspectRatio),
      } as CSSProperties;
    }, [effectiveAspectRatio, sourceAspectRatio]);
    const requestedPlacement = String(node.attrs.placement ?? 'normal') as NotebookImagePlacement;
    const pageSetup = useEditorState({
      editor,
      selector: ({ editor: currentEditor }) => (
        (currentEditor.state.doc.attrs.notebookPageSetup as NotebookPageSetup | null)
          ?? DEFAULT_NOTEBOOK_PAGE_SETUP
      ),
    });
    const effectivePlacement = notebookEffectiveImagePlacement(
      pageSetup,
      requestedPlacement,
      effectiveWidthPercent,
      renderedContentWidth,
    );
    const caption = String(node.attrs.caption ?? '').trim();
    const altText = node.attrs.decorative === true ? '' : String(node.attrs.altText ?? '');
    const selectImageNode = () => {
      const position = getPos();
      if (typeof position === 'number') {
        editor.chain().focus().setNodeSelection(position).run();
      }
    };
    const currentPointSize = () => {
      const frame = frameRef.current?.getBoundingClientRect();
      const width = effectiveDisplayWidthPt
        ?? (frame && frame.width > 0 ? frame.width / (96 / 72) : 144);
      const height = effectiveDisplayHeightPt
        ?? (frame && frame.height > 0 ? frame.height / (96 / 72) : width / (effectiveAspectRatio ?? 1));
      return { height, width };
    };
    const announceSize = (width: number, height: number) => {
      setAccessibilityStatus(`Image size ${Math.round(width)} by ${Math.round(height)} points.`);
    };
    const handleResizeKeyDown = (
      event: KeyboardEvent<HTMLButtonElement>,
      handle: (typeof NOTEBOOK_MEDIA_RESIZE_HANDLES)[number]['value'],
    ) => {
      const { height, width } = currentPointSize();
      const result = resizeNotebookMediaByKeyboard({
        displayAspectRatio: effectiveAspectRatio,
        displayHeightPt: height,
        displayWidthPt: width,
        handle,
        key: event.key,
        shiftKey: event.shiftKey,
      });
      if (!result) return;
      event.preventDefault();
      event.stopPropagation();
      selectImageNode();
      updateAttributes({
        displayAspectRatio: result.displayAspectRatio,
        displayHeightPt: result.displayHeightPt,
        displayWidthPt: result.displayWidthPt,
        widthPercent: null,
      });
      announceSize(result.displayWidthPt, result.displayHeightPt);
    };
    const handleRotateKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
      const delta = event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? keyboardStep(event)
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -keyboardStep(event)
          : 0;
      if (delta === 0) return;
      event.preventDefault();
      event.stopPropagation();
      selectImageNode();
      const nextRotation = normalizeRotation(effectiveRotation + delta);
      updateAttributes({ rotation: nextRotation === 0 ? null : nextRotation });
      setAccessibilityStatus(`Image rotation ${nextRotation} degrees.`);
    };
    const handleMoveKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
      const delta = arrowDelta(event);
      const placement = node.attrs.notebookObjectPlacement;
      if (!delta || !isFloatingPlacement(placement)) return;
      event.preventDefault();
      event.stopPropagation();
      selectImageNode();
      const nextPlacement = {
        ...placement,
        xPt: roundPoint(placement.xPt + delta.x),
        yPt: roundPoint(placement.yPt + delta.y),
      };
      updateAttributes({ notebookObjectPlacement: nextPlacement });
      setAccessibilityStatus(`Image position ${Math.round(nextPlacement.xPt)} by ${Math.round(nextPlacement.yPt)} points.`);
    };

    return (
      <NodeViewWrapper
        as="figure"
        className={`notebook-image-figure${isSelected ? ' is-selected' : ''}${interaction.activeGesture ? ' is-media-manipulating' : ''}${cropMode && isSelected ? ' is-crop-mode' : ''}`}
        contentEditable={false}
        data-image-alignment={node.attrs.alignment ?? 'center'}
        data-image-placement={effectivePlacement}
        data-image-requested-placement={requestedPlacement}
        data-image-sizing={effectiveDisplayWidthPt !== undefined ? 'point' : 'percent'}
        data-notebook-image=""
        data-notebook-node-id={nodeId}
        data-testid="notebook-image-figure"
        style={figureStyle}
        onMouseDown={(event: MouseEvent<HTMLElement>) => {
          if ((event.target as HTMLElement | null)?.closest('button')) return;
          event.preventDefault();
          selectImageNode();
        }}
        onClick={selectImageNode}
      >
        <div
          className="notebook-media-transform-shell"
          ref={frameRef}
          onPointerDown={(event) => {
            if ((event.target as HTMLElement | null)?.closest('button')) return;
            event.preventDefault();
            selectImageNode();
          }}
        >
          <div className="notebook-image-frame" data-image-load-state={loadState.status}>
            {loadState.status === 'ready' ? (
              <div
                className="notebook-image-crop-viewport"
                data-natural-size={naturalSize ? 'ready' : 'pending'}
              >
                <div className="notebook-image-bitmap-stage" style={bitmapStageStyle}>
                  <img
                    alt={altText}
                    draggable={false}
                    src={loadState.url}
                    style={cropImageStyle}
                    onLoad={(event) => {
                      const image = event.currentTarget;
                      setNaturalSize({ width: image.naturalWidth || 1, height: image.naturalHeight || 1 });
                    }}
                  />
                </div>
              </div>
            ) : loadState.status === 'missing' ? (
              <div className="notebook-image-missing"><ImageOff size={18} /> Image unavailable</div>
            ) : (
              <div className="notebook-image-loading">Loading image…</div>
            )}
            {cropMode && isSelected ? (
              <div className="notebook-image-crop-overlay" style={cropOverlayStyle}>
                <div className="notebook-image-crop-dim notebook-image-crop-dim--top" />
                <div className="notebook-image-crop-dim notebook-image-crop-dim--right" />
                <div className="notebook-image-crop-dim notebook-image-crop-dim--bottom" />
                <div className="notebook-image-crop-dim notebook-image-crop-dim--left" />
                <div className="notebook-image-crop-selection" />
                {NOTEBOOK_MEDIA_RESIZE_HANDLES.map((handle) => (
                  <button
                    key={handle.value}
                  type="button"
                  aria-label={`Crop image from ${handle.label}`}
                  className={`notebook-image-crop-handle notebook-image-crop-handle--${handle.value}`}
                  data-notebook-media-resize-handle={handle.value}
                  onPointerDown={(event) => interaction.beginCrop(event, handle.value)}
                />
                ))}
              </div>
            ) : null}
          </div>
          {isSelected ? (
            <>
              <button
                type="button"
                aria-label="Move image"
                aria-describedby={`${nodeId}-image-accessibility-status`}
                className="notebook-media-drag-grip"
                title={isFloatingPlacement(node.attrs.notebookObjectPlacement)
                  ? 'Move floating image with arrow keys. Hold Shift for 10 pt.'
                  : 'Drag image into page whitespace to make it floating.'}
                onKeyDown={handleMoveKeyDown}
                onPointerDown={interaction.beginDrag}
              >
                <GripVertical size={13} />
              </button>
              {NOTEBOOK_MEDIA_RESIZE_HANDLES.map((handle) => (
                <button
                  key={handle.value}
                  type="button"
                  aria-label={`Resize image from ${handle.label}`}
                  aria-describedby={`${nodeId}-image-accessibility-status`}
                  className={`notebook-media-resize-handle notebook-media-resize-handle--${handle.value}`}
                  data-notebook-media-resize-handle={handle.value}
                  title="Resize image with arrow keys. Hold Shift for 10 pt."
                  onKeyDown={(event) => handleResizeKeyDown(event, handle.value)}
                  onPointerDown={(event) => interaction.beginResize(event, handle.value)}
                />
              ))}
              <button
                type="button"
                aria-label="Rotate image"
                aria-describedby={`${nodeId}-image-accessibility-status`}
                className="notebook-image-rotation-handle"
                title="Rotate image with arrow keys. Hold Shift for 10 degrees."
                onKeyDown={handleRotateKeyDown}
                onPointerDown={interaction.beginRotation}
              >
                <RotateCw size={12} />
              </button>
              <span
                id={`${nodeId}-image-accessibility-status`}
                className="sr-only"
                role="status"
                aria-live="polite"
              >
                {accessibilityStatus || 'Selected image. Use handles to resize, move, or rotate.'}
              </span>
            </>
          ) : null}
        </div>
        {caption ? (
          <figcaption>
            {figureNumber ? <strong>{`Figure ${figureNumber}. `}</strong> : null}
            {caption}
          </figcaption>
        ) : null}
      </NodeViewWrapper>
    );
  };
}
