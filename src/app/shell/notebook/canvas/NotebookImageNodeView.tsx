import type { ReactNodeViewProps } from '@tiptap/react';
import { NodeViewWrapper, useEditorState } from '@tiptap/react';
import { GripVertical, ImageOff, RotateCw } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
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
  useNotebookDirectMediaInteraction,
  type NotebookImageNodeViewOptions,
} from './NotebookDirectMediaInteraction';

export type { NotebookImageNodeViewOptions } from './NotebookDirectMediaInteraction';

type ImageLoadState =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'ready'; url: string };

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
    const commitAttributes = useCallback((attributes: Record<string, unknown>) => {
      const cropAttributes = ['cropX', 'cropY', 'cropWidth', 'cropHeight'] as const;
      const changesCrop = cropAttributes.some((attribute) => Object.hasOwn(attributes, attribute));
      const clearsCrop = cropAttributes.every((attribute) => attributes[attribute] === null);
      updateAttributes(changesCrop && !clearsCrop
        ? {
          ...attributes,
          cropX: attributes.cropX ?? crop.x,
          cropY: attributes.cropY ?? crop.y,
          cropWidth: attributes.cropWidth ?? crop.width,
          cropHeight: attributes.cropHeight ?? crop.height,
        }
        : attributes);
    }, [crop, updateAttributes]);
    const [eventCropMode, setEventCropMode] = useState(false);
    const configuredCropMode = useEditorState({
      editor,
      selector: ({ editor: currentEditor }) => {
        if (typeof options.cropMode === 'function') {
          return options.cropMode({ editor: currentEditor, nodeId });
        }
        return options.cropMode === true;
      },
    });
    useEffect(() => {
      const editorElement = editor.view.dom as HTMLElement;
      const onCropModeChange = (event: Event) => {
        const detail = (event as CustomEvent<{ active?: boolean; nodeId?: string | null }>).detail;
        setEventCropMode(detail?.active === true && detail.nodeId === nodeId);
      };
      editorElement.addEventListener('notebook-image-crop-mode-change', onCropModeChange);
      return () => editorElement.removeEventListener('notebook-image-crop-mode-change', onCropModeChange);
    }, [editor, nodeId]);
    const cropMode = eventCropMode || configuredCropMode;
    const rawWidthPercent = node.attrs.widthPercent;
    const widthPercent = typeof rawWidthPercent === 'number' && Number.isFinite(rawWidthPercent)
      ? normalizeNotebookMediaWidthPercent(rawWidthPercent)
      : 100;
    const rawRotation = Number(node.attrs.rotation);
    const rotation = Number.isFinite(rawRotation)
      ? ((Math.round(rawRotation) % 360) + 360) % 360
      : 0;
    const rawDisplayAspectRatio = Number(node.attrs.displayAspectRatio);
    const displayAspectRatio = Number.isFinite(rawDisplayAspectRatio)
      && rawDisplayAspectRatio >= 0.1
      && rawDisplayAspectRatio <= 10
      ? rawDisplayAspectRatio
      : undefined;
    const interaction = useNotebookDirectMediaInteraction({
      alignment: node.attrs.alignment === 'left' || node.attrs.alignment === 'right'
        ? node.attrs.alignment
        : 'center',
      crop,
      cropMode,
      displayAspectRatio,
      editor,
      frameRef,
      mediaType: 'image',
      minimumSizePx: options.minimumSizePx,
      nodeId,
      onCropModeChange: options.onCropModeChange,
      onMediaDragGrip: options.onMediaDragGrip,
      onMediaInteraction: options.onMediaInteraction,
      rotation,
      selected,
      updateAttributes: commitAttributes,
      widthPercent,
    });
    const effectiveCrop = interaction.preview?.crop ?? crop;
    const effectiveWidthPercent = interaction.preview?.widthPercent ?? widthPercent;
    const effectiveRotation = interaction.preview?.rotation ?? rotation;
    const effectiveAspectRatio = interaction.preview?.displayAspectRatio ?? displayAspectRatio;
    const cropViewportStyle = useMemo<CSSProperties | undefined>(() => {
      if (effectiveAspectRatio !== undefined) {
        return { aspectRatio: String(effectiveAspectRatio) };
      }
      if (!naturalSize) return undefined;
      return {
        aspectRatio: `${naturalSize.width * effectiveCrop.width} / ${naturalSize.height * effectiveCrop.height}`,
      };
    }, [effectiveAspectRatio, effectiveCrop.height, effectiveCrop.width, naturalSize]);
    const cropImageStyle = useMemo<CSSProperties>(() => ({
      width: `${100 / effectiveCrop.width}%`,
      height: `${100 / effectiveCrop.height}%`,
      left: `${-(effectiveCrop.x / effectiveCrop.width) * 100}%`,
      top: `${-(effectiveCrop.y / effectiveCrop.height) * 100}%`,
    }), [effectiveCrop]);
    const cropOverlayStyle = useMemo(() => ({
      '--notebook-crop-x': `${effectiveCrop.x * 100}%`,
      '--notebook-crop-y': `${effectiveCrop.y * 100}%`,
      '--notebook-crop-width': `${effectiveCrop.width * 100}%`,
      '--notebook-crop-height': `${effectiveCrop.height * 100}%`,
    }) as CSSProperties, [effectiveCrop]);
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
    const figureStyle = {
      '--notebook-image-width': interaction.activeGesture === 'resize'
        && interaction.preview?.rectanglePx.width
        ? `calc(${interaction.preview.rectanglePx.width}px / var(--page-ui-scale, 1))`
        : `${effectiveWidthPercent}%`,
      '--notebook-image-rotation': `${effectiveRotation}deg`,
      ...(effectiveAspectRatio === undefined
        ? {}
        : { '--notebook-media-display-aspect-ratio': String(effectiveAspectRatio) }),
    } as CSSProperties;
    const caption = String(node.attrs.caption ?? '').trim();
    const altText = node.attrs.decorative === true ? '' : String(node.attrs.altText ?? '');

    return (
      <NodeViewWrapper
        as="figure"
        className={`notebook-image-figure${selected ? ' is-selected' : ''}${interaction.activeGesture ? ' is-media-manipulating' : ''}${cropMode && selected ? ' is-crop-mode' : ''}`}
        contentEditable={false}
        data-notebook-image=""
        data-notebook-media-kind="image"
        data-notebook-media-manipulating={interaction.activeGesture ?? undefined}
        data-notebook-node-id={nodeId}
        data-notebook-image-crop-mode={cropMode && selected ? 'true' : 'false'}
        data-testid="notebook-image-figure"
        data-image-alignment={String(node.attrs.alignment ?? 'center')}
        data-image-placement={effectivePlacement}
        data-image-requested-placement={requestedPlacement}
        data-image-rendered-content-width={renderedContentWidth?.toFixed(1)}
        data-image-wrap-fallback={effectivePlacement !== requestedPlacement ? 'true' : 'false'}
        onClick={() => {
          const position = getPos();
          if (typeof position === 'number') {
            editor.chain().focus().setNodeSelection(position).run();
          }
        }}
        style={figureStyle}
      >
        <div ref={frameRef} className="notebook-media-transform-shell notebook-media-transform-shell--image">
          <div className="notebook-image-frame">
            {loadState.status === 'ready' ? (
            <div
              className="notebook-image-crop-viewport"
              data-natural-size={naturalSize ? 'ready' : 'pending'}
              style={cropViewportStyle}
            >
              <img
                alt={altText}
                src={loadState.url}
                style={cropImageStyle}
                onLoad={(event) => setNaturalSize({
                  width: event.currentTarget.naturalWidth || 1,
                  height: event.currentTarget.naturalHeight || 1,
                })}
              />
            </div>
          ) : loadState.status === 'missing' ? (
            <div className="notebook-image-missing" role="img" aria-label="Image asset is unavailable">
              <ImageOff aria-hidden="true" size={24} />
              <span>Image asset unavailable</span>
            </div>
          ) : (
            <div className="notebook-image-loading" role="status">Loading image…</div>
          )}
            {selected && cropMode ? (
            <div
              className="notebook-image-crop-overlay"
              data-testid="notebook-image-crop-overlay"
              role="group"
              aria-label="Crop image"
              style={cropOverlayStyle}
            >
              <span className="notebook-image-crop-dim notebook-image-crop-dim--top" aria-hidden="true" />
              <span className="notebook-image-crop-dim notebook-image-crop-dim--right" aria-hidden="true" />
              <span className="notebook-image-crop-dim notebook-image-crop-dim--bottom" aria-hidden="true" />
              <span className="notebook-image-crop-dim notebook-image-crop-dim--left" aria-hidden="true" />
              <span className="notebook-image-crop-selection" aria-hidden="true" />
              {NOTEBOOK_MEDIA_RESIZE_HANDLES.map((handle) => (
                <button
                  key={handle.value}
                  type="button"
                  className={`notebook-image-crop-handle notebook-image-crop-handle--${handle.value}`}
                  data-notebook-image-crop-handle={handle.value}
                  aria-label={`Crop image from the ${handle.label}`}
                  title={`Crop from the ${handle.label}`}
                  onClick={(event) => event.stopPropagation()}
                  onPointerDown={(event) => interaction.beginCrop(event, handle.value)}
                >
                  <span aria-hidden="true" />
                </button>
              ))}
              <button
                type="button"
                className="notebook-image-crop-reset"
                onClick={(event) => {
                  event.stopPropagation();
                  commitAttributes({ cropX: null, cropY: null, cropWidth: null, cropHeight: null });
                }}
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
              >
                Reset crop
              </button>
            </div>
            ) : null}
          </div>
          {selected && !cropMode ? (
          <div className="notebook-media-direct-controls" role="group" aria-label="Image controls">
            <button
              type="button"
              className="notebook-media-drag-grip"
              data-notebook-media-drag-grip="image"
              aria-label="Drag image to reposition"
              title="Drag image to reposition"
              onClick={(event) => event.stopPropagation()}
              onPointerDown={interaction.beginDrag}
            >
              <GripVertical aria-hidden="true" size={16} />
            </button>
            <div className="notebook-media-resize-handles" role="group" aria-label="Resize image">
              {NOTEBOOK_MEDIA_RESIZE_HANDLES.map((handle) => (
                <button
                  key={handle.value}
                  type="button"
                  className={`notebook-media-resize-handle notebook-media-resize-handle--${handle.value}`}
                  data-notebook-media-resize-handle={handle.value}
                  aria-label={`Resize image from the ${handle.label}`}
                  title={`Resize from the ${handle.label}`}
                  onClick={(event) => event.stopPropagation()}
                  onPointerDown={(event) => interaction.beginResize(event, handle.value)}
                >
                  <span aria-hidden="true" />
                </button>
              ))}
            </div>
            <button
              type="button"
              className="notebook-image-rotation-handle"
              data-notebook-image-rotation-handle=""
              aria-label="Rotate image"
              title="Rotate image. Hold Shift to snap to 15 degrees."
              onClick={(event) => event.stopPropagation()}
              onPointerDown={interaction.beginRotation}
            >
              <RotateCw aria-hidden="true" size={15} />
            </button>
          </div>
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
