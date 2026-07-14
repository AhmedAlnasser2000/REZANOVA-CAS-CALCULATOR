import type { ReactNodeViewProps } from '@tiptap/react';
import { NodeViewWrapper, useEditorState } from '@tiptap/react';
import { VideoOff } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';

import type {
  NotebookAssetPort,
  NotebookVideoTrack,
} from '../../../../lib/notebook';

type VideoLoadState =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'ready'; posterUrl?: string; trackUrls: string[]; url: string };

function videoTracks(value: unknown): NotebookVideoTrack[] {
  return Array.isArray(value) ? value as NotebookVideoTrack[] : [];
}

export function createNotebookVideoNodeView(assetPort: NotebookAssetPort) {
  return function NotebookVideoNodeView({
    editor,
    getPos,
    node,
    selected,
  }: ReactNodeViewProps) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
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
    const style = {
      '--notebook-video-width': `${Number(node.attrs.widthPercent ?? 100)}%`,
    } as CSSProperties;

    return (
      <NodeViewWrapper
        as="figure"
        className={`notebook-video-figure${selected ? ' is-selected' : ''}`}
        contentEditable={false}
        data-testid="notebook-video-figure"
        data-video-alignment={String(node.attrs.alignment ?? 'center')}
        onClick={() => {
          const position = getPos();
          if (typeof position === 'number') {
            editor.chain().focus().setNodeSelection(position).run();
          }
        }}
        style={style}
      >
        <div className="notebook-video-heading">
          <strong>{title}</strong>
          {description ? <span>{description}</span> : null}
        </div>
        <div className="notebook-video-frame">
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
