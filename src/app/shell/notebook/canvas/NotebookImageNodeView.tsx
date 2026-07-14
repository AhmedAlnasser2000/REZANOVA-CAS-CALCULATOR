import type { ReactNodeViewProps } from '@tiptap/react';
import { NodeViewWrapper, useEditorState } from '@tiptap/react';
import { ImageOff } from 'lucide-react';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';

import {
  DEFAULT_NOTEBOOK_PAGE_SETUP,
  notebookEffectiveImagePlacement,
  type NotebookAssetPort,
  type NotebookImagePlacement,
  type NotebookPageSetup,
} from '../../../../lib/notebook';

type ImageLoadState =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'ready'; url: string };

export function createNotebookImageNodeView(assetPort: NotebookAssetPort) {
  return function NotebookImageNodeView({
    editor,
    getPos,
    node,
    selected,
  }: ReactNodeViewProps) {
    const assetId = String(node.attrs.assetId ?? '');
    const [loadState, setLoadState] = useState<ImageLoadState>({ status: 'loading' });
    const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
    const [renderedContentWidth, setRenderedContentWidth] = useState<number>();
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
      return {
        x: Number(cropX),
        y: Number(cropY),
        width: Number(cropWidth),
        height: Number(cropHeight),
      };
    }, [node.attrs]);
    const cropViewportStyle = useMemo<CSSProperties | undefined>(() => {
      if (!naturalSize) return undefined;
      return {
        aspectRatio: `${naturalSize.width * crop.width} / ${naturalSize.height * crop.height}`,
      };
    }, [crop.height, crop.width, naturalSize]);
    const cropImageStyle = useMemo<CSSProperties>(() => ({
      width: `${100 / crop.width}%`,
      height: `${100 / crop.height}%`,
      left: `${-(crop.x / crop.width) * 100}%`,
      top: `${-(crop.y / crop.height) * 100}%`,
    }), [crop]);
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
      Number(node.attrs.widthPercent ?? 100),
      renderedContentWidth,
    );
    const figureStyle = {
      '--notebook-image-width': `${Number(node.attrs.widthPercent ?? 100)}%`,
      '--notebook-image-rotation': `${Number(node.attrs.rotation ?? 0)}deg`,
    } as CSSProperties;
    const caption = String(node.attrs.caption ?? '').trim();
    const altText = node.attrs.decorative === true ? '' : String(node.attrs.altText ?? '');

    return (
      <NodeViewWrapper
        as="figure"
        className={`notebook-image-figure${selected ? ' is-selected' : ''}`}
        contentEditable={false}
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
