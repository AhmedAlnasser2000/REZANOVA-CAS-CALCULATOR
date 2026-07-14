import type { ReactNodeViewProps } from '@tiptap/react';
import { NodeViewWrapper, useEditorState } from '@tiptap/react';
import { GripVertical, VideoOff } from 'lucide-react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';

import type {
  NotebookAssetPort,
  NotebookVideoTrack,
} from '../../../../lib/notebook';
import {
  NOTEBOOK_MEDIA_RESIZE_HANDLES,
  useNotebookDirectMediaInteraction,
  type NotebookDirectMediaNodeViewOptions,
} from './NotebookDirectMediaInteraction';

export type { NotebookDirectMediaNodeViewOptions } from './NotebookDirectMediaInteraction';

type VideoLoadState =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'ready'; posterUrl?: string; trackUrls: string[]; url: string };

function videoTracks(value: unknown): NotebookVideoTrack[] {
  return Array.isArray(value) ? value as NotebookVideoTrack[] : [];
}

export function createNotebookVideoNodeView(
  assetPort: NotebookAssetPort,
  options: NotebookDirectMediaNodeViewOptions = {},
) {
  return function NotebookVideoNodeView({
    editor,
    getPos,
    node,
    selected,
    updateAttributes,
  }: ReactNodeViewProps) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const frameRef = useRef<HTMLDivElement | null>(null);
    const nodeId = String(node.attrs.id ?? 'notebook.video');
    const assetId = String(node.attrs.assetId ?? '');
    const posterAssetId = typeof node.attrs.posterAssetId === 'string'
      ? node.attrs.posterAssetId
      : null;
    const serializedTracks = JSON.stringify(node.attrs.tracks ?? null);
    const tracks = useMemo(
      () => videoTracks(JSON.parse(serializedTracks) as unknown),
      [serializedTracks],
    );
    const [loadState, setLoadState] = useState<VideoLoadState>({ status: 'loading' });
    const videoNumber = useEditorState({
      editor,
      selector: ({ editor: currentEditor }) => {
        const ownPosition = getPos();
        if (typeof ownPosition !== 'number' || node.attrs.numbered !== true) return null;
        let count = 0;
        currentEditor.state.doc.descendants((candidate, position) => {
          if (position > ownPosition) return false;
          if (candidate.type.name === 'videoFigure' && candidate.attrs.numbered === true) count += 1;
          return position < ownPosition;
        });
        return count || null;
      },
    });

    useEffect(() => {
      let cancelled = false;
      const objectUrls: string[] = [];
      setLoadState({ status: 'loading' });

      async function resolveAsset(assetIdentity: string) {
        const nativeUrl = await assetPort.resolveUrl?.(assetIdentity);
        if (nativeUrl) return nativeUrl;
        const payload = await assetPort.load(assetIdentity);
        if (!payload) return null;
        const url = URL.createObjectURL(new Blob(
          [payload.bytes as BlobPart],
          { type: payload.metadata.mimeType },
        ));
        objectUrls.push(url);
        return url;
      }

      void Promise.all([
        resolveAsset(assetId),
        posterAssetId ? resolveAsset(posterAssetId) : Promise.resolve(null),
        ...tracks.map((track) => resolveAsset(track.assetId)),
      ]).then(([url, posterUrl, ...trackUrls]) => {
        if (cancelled) return;
        if (!url || trackUrls.some((trackUrl) => !trackUrl)) {
          setLoadState({ status: 'missing' });
          return;
        }
        setLoadState({
          status: 'ready',
          url,
          ...(posterUrl ? { posterUrl } : {}),
          trackUrls: trackUrls as string[],
        });
      }).catch(() => {
        if (!cancelled) setLoadState({ status: 'missing' });
      });

      return () => {
        cancelled = true;
        objectUrls.forEach((url) => URL.revokeObjectURL(url));
      };
    }, [assetId, posterAssetId, tracks]);

    useEffect(() => {
      if (loadState.status !== 'ready') return;
      const video = videoRef.current;
      return () => {
        if (!video) return;
        video.pause();
        video.removeAttribute('src');
        video.load();
      };
    }, [loadState]);

    const caption = String(node.attrs.caption ?? '').trim();
    const title = String(node.attrs.title ?? 'Untitled video');
    const description = String(node.attrs.description ?? '').trim();
    const rawWidthPercent = Number(node.attrs.widthPercent);
    const widthPercent = Number.isFinite(rawWidthPercent)
      ? Math.min(100, Math.max(10, Math.round(rawWidthPercent)))
      : 100;
    const rawDisplayAspectRatio = Number(node.attrs.displayAspectRatio);
    const displayAspectRatio = Number.isFinite(rawDisplayAspectRatio)
      && rawDisplayAspectRatio >= 0.1
      && rawDisplayAspectRatio <= 10
      ? rawDisplayAspectRatio
      : undefined;
    const interaction = useNotebookDirectMediaInteraction({
      displayAspectRatio,
      editor,
      frameRef,
      mediaType: 'video',
      minimumSizePx: options.minimumSizePx,
      nodeId,
      onMediaDragGrip: options.onMediaDragGrip,
      onMediaInteraction: options.onMediaInteraction,
      selected,
      updateAttributes,
      widthPercent,
    });
    const effectiveWidthPercent = interaction.preview?.widthPercent ?? widthPercent;
    const effectiveAspectRatio = interaction.preview?.displayAspectRatio ?? displayAspectRatio;
    const style = {
      '--notebook-video-width': `${effectiveWidthPercent}%`,
      ...(effectiveAspectRatio === undefined
        ? {}
        : { '--notebook-media-display-aspect-ratio': String(effectiveAspectRatio) }),
    } as CSSProperties;

    return (
      <NodeViewWrapper
        as="figure"
        className={`notebook-video-figure${selected ? ' is-selected' : ''}${interaction.activeGesture ? ' is-media-manipulating' : ''}`}
        contentEditable={false}
        data-notebook-video=""
        data-notebook-media-kind="video"
        data-notebook-media-manipulating={interaction.activeGesture ?? undefined}
        data-notebook-node-id={nodeId}
        data-testid="notebook-video-figure"
        data-video-alignment={String(node.attrs.alignment ?? 'center')}
        data-video-placement={String(node.attrs.placement ?? 'normal')}
        onClick={() => {
          const position = getPos();
          if (typeof position === 'number') {
            editor.chain().focus().setNodeSelection(position).run();
          }
        }}
        onPointerCancel={(event: ReactPointerEvent<HTMLElement>) => interaction.finishPointer(event, true)}
        onPointerMove={interaction.handlePointerMove}
        onPointerUp={interaction.finishPointer}
        style={style}
      >
        <div className="notebook-video-heading">
          <strong>{title}</strong>
          {description ? <span>{description}</span> : null}
        </div>
        <div ref={frameRef} className="notebook-media-transform-shell notebook-media-transform-shell--video">
          <div
            className="notebook-video-frame"
            style={effectiveAspectRatio === undefined
              ? undefined
              : { aspectRatio: String(effectiveAspectRatio) }}
          >
            {loadState.status === 'ready' ? (
            <video
              ref={videoRef}
              controls
              crossOrigin="anonymous"
              loop={node.attrs.loop === true}
              playsInline
              poster={loadState.posterUrl}
              preload="metadata"
              src={loadState.url}
              title={title}
              style={effectiveAspectRatio === undefined
                ? undefined
                : { height: '100%', objectFit: 'fill' }}
            >
              {tracks.map((track, index) => (
                <track
                  key={track.id}
                  default={track.default === true}
                  kind={track.kind}
                  label={track.label}
                  src={loadState.trackUrls[index]}
                  srcLang={track.language}
                />
              ))}
            </video>
          ) : loadState.status === 'missing' ? (
            <div className="notebook-video-missing" role="img" aria-label="Video asset is unavailable">
              <VideoOff aria-hidden="true" size={26} />
              <span>Video asset unavailable</span>
            </div>
            ) : (
              <div className="notebook-video-loading" role="status">Loading video…</div>
            )}
          </div>
          {selected ? (
          <div className="notebook-media-direct-controls" role="group" aria-label="Video controls">
            <button
              type="button"
              className="notebook-media-drag-grip"
              data-notebook-media-drag-grip="video"
              aria-label="Drag video to reposition"
              title="Drag video to reposition"
              onClick={(event) => event.stopPropagation()}
              onPointerDown={interaction.beginDrag}
            >
              <GripVertical aria-hidden="true" size={16} />
            </button>
            <div className="notebook-media-resize-handles" role="group" aria-label="Resize video">
              {NOTEBOOK_MEDIA_RESIZE_HANDLES.map((handle) => (
                <button
                  key={handle.value}
                  type="button"
                  className={`notebook-media-resize-handle notebook-media-resize-handle--${handle.value}`}
                  data-notebook-media-resize-handle={handle.value}
                  aria-label={`Resize video from the ${handle.label}`}
                  title={`Resize from the ${handle.label}`}
                  onClick={(event) => event.stopPropagation()}
                  onPointerDown={(event) => interaction.beginResize(event, handle.value)}
                >
                  <span aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
          ) : null}
        </div>
        {caption ? (
          <figcaption>
            {videoNumber ? <strong>{`Video ${videoNumber}. `}</strong> : null}
            {caption}
          </figcaption>
        ) : null}
      </NodeViewWrapper>
    );
  };
}
