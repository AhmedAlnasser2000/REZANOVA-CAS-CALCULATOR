import type { ReactNodeViewProps } from '@tiptap/react';
import { NodeViewWrapper, useEditorState } from '@tiptap/react';
import {
  Captions,
  Expand,
  GripVertical,
  Minimize2,
  Pause,
  Play,
  Theater,
  VideoOff,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  useCallback,
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

type NotebookVideoFullscreenMode = 'browser' | 'desktop' | null;

function videoTracks(value: unknown): NotebookVideoTrack[] {
  return Array.isArray(value) ? value as NotebookVideoTrack[] : [];
}

function formatVideoTime(value: number) {
  const seconds = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

function isTauriWindow() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
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
    const presentationRef = useRef<HTMLDivElement | null>(null);
    const audioInitializedRef = useRef(false);
    const fullscreenModeRef = useRef<NotebookVideoFullscreenMode>(null);
    const fullscreenRequestIdRef = useRef(0);
    const fullscreenEntryRequestRef = useRef<number | null>(null);
    const fullscreenReturnModeRef = useRef<'inline' | 'theater'>('inline');
    const controlsHideTimerRef = useRef<number | null>(null);
    const controlsHoveredRef = useRef(false);
    const controlsFocusedRef = useRef(false);
    const nodeId = String(node.attrs.id ?? 'notebook.video');
    const assetId = String(node.attrs.assetId ?? '');
    const posterAssetId = typeof node.attrs.posterAssetId === 'string'
      ? node.attrs.posterAssetId
      : null;
    const serializedTracks = JSON.stringify(node.attrs.tracks ?? null);
    const rawDisplayAspectRatio = Number(node.attrs.displayAspectRatio);
    const displayAspectRatio = Number.isFinite(rawDisplayAspectRatio)
      && rawDisplayAspectRatio >= 0.1
      && rawDisplayAspectRatio <= 10
      ? rawDisplayAspectRatio
      : undefined;
    const tracks = useMemo(
      () => videoTracks(JSON.parse(serializedTracks) as unknown),
      [serializedTracks],
    );
    const [loadState, setLoadState] = useState<VideoLoadState>({ status: 'loading' });
    const [captionTrackIndex, setCaptionTrackIndex] = useState<number | null>(() => {
      const defaultIndex = tracks.findIndex((track) => track.default === true);
      return defaultIndex >= 0 ? defaultIndex : null;
    });
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(1);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackError, setPlaybackError] = useState<string | null>(null);
    const [theaterMode, setTheaterMode] = useState(false);
    const [fullscreenMode, setFullscreenMode] = useState<NotebookVideoFullscreenMode>(null);
    const [fullscreenPending, setFullscreenPending] = useState(false);
    const [sourceAspectRatio, setSourceAspectRatio] = useState<number | undefined>(displayAspectRatio);
    const [controlsVisible, setControlsVisible] = useState(true);
    const [controlsHovered, setControlsHovered] = useState(false);
    const [controlsFocused, setControlsFocused] = useState(false);
    const [theaterBounds, setTheaterBounds] = useState<CSSProperties>();
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
      setPlaybackError(null);
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);
      audioInitializedRef.current = false;

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
      const defaultIndex = tracks.findIndex((track) => track.default === true);
      setCaptionTrackIndex(defaultIndex >= 0 ? defaultIndex : null);
    }, [serializedTracks, tracks]);

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

    useEffect(() => {
      fullscreenModeRef.current = fullscreenMode;
    }, [fullscreenMode]);

    const syncPlaybackState = useCallback(() => {
      const video = videoRef.current;
      if (!video) return;
      setCurrentTime(Number.isFinite(video.currentTime) ? video.currentTime : 0);
      setDuration(Number.isFinite(video.duration) ? video.duration : 0);
      setIsMuted(video.muted);
      setVolume(video.volume);
      setIsPlaying(!video.paused && !video.ended);
    }, []);

    const normalizeSourceProportions = useCallback(() => {
      const video = videoRef.current;
      if (!video?.videoWidth || !video.videoHeight) return;
      const ratio = Math.max(
        0.1,
        Math.min(10, Math.round((video.videoWidth / video.videoHeight) * 1000) / 1000),
      );
      setSourceAspectRatio(ratio);
      if (displayAspectRatio !== undefined && Math.abs(displayAspectRatio - ratio) < 0.001) return;
      const position = getPos();
      if (typeof position !== 'number') return;
      const current = editor.state.doc.nodeAt(position);
      if (!current || current.type.name !== 'videoFigure') return;
      const transaction = editor.state.tr.setNodeMarkup(position, undefined, {
        ...current.attrs,
        displayAspectRatio: ratio,
      });
      transaction.setMeta('addToHistory', false);
      editor.view.dispatch(transaction);
    }, [displayAspectRatio, editor, getPos]);

    const clearControlsTimer = useCallback(() => {
      if (controlsHideTimerRef.current !== null) {
        window.clearTimeout(controlsHideTimerRef.current);
        controlsHideTimerRef.current = null;
      }
    }, []);

    const revealControls = useCallback(() => {
      clearControlsTimer();
      setControlsVisible(true);
      if (!isPlaying || controlsHoveredRef.current || controlsFocusedRef.current) return;
      controlsHideTimerRef.current = window.setTimeout(() => {
        controlsHideTimerRef.current = null;
        setControlsVisible(false);
      }, 2500);
    }, [clearControlsTimer, isPlaying]);

    useEffect(() => {
      if (!isPlaying || controlsHovered || controlsFocused) {
        clearControlsTimer();
        setControlsVisible(true);
        return undefined;
      }
      revealControls();
      return clearControlsTimer;
    }, [clearControlsTimer, controlsFocused, controlsHovered, isPlaying, revealControls]);

    useEffect(() => clearControlsTimer, [clearControlsTimer]);

    const measureTheaterBounds = useCallback(() => {
      const page = presentationRef.current?.closest<HTMLElement>('.app-page--notebook');
      if (!page) return;
      const rect = page.getBoundingClientRect();
      const surface = page.closest<HTMLElement>('.active-surface--page');
      const scale = Number.parseFloat(
        surface ? getComputedStyle(surface).getPropertyValue('--page-ui-scale') : '1',
      ) || 1;
      setTheaterBounds({
        top: rect.top / scale,
        left: rect.left / scale,
        width: rect.width / scale,
        height: rect.height / scale,
      });
    }, []);

    useEffect(() => {
      if (!theaterMode || fullscreenMode !== null) return undefined;
      measureTheaterBounds();
      window.addEventListener('resize', measureTheaterBounds);
      return () => window.removeEventListener('resize', measureTheaterBounds);
    }, [fullscreenMode, measureTheaterBounds, theaterMode]);

    const applyCaptionTrack = useCallback((nextIndex: number | null) => {
      const textTracks = videoRef.current?.textTracks;
      if (!textTracks) return;
      for (let index = 0; index < textTracks.length; index += 1) {
        textTracks[index]!.mode = index === nextIndex ? 'showing' : 'disabled';
      }
    }, []);

    useEffect(() => {
      if (loadState.status !== 'ready') return undefined;
      const timeout = window.setTimeout(() => applyCaptionTrack(captionTrackIndex));
      return () => window.clearTimeout(timeout);
    }, [applyCaptionTrack, captionTrackIndex, loadState.status, serializedTracks]);

    const closePresentation = useCallback(async () => {
      fullscreenRequestIdRef.current += 1;
      const entryRequestIsPending = fullscreenEntryRequestRef.current !== null;
      if (!entryRequestIsPending) setFullscreenPending(false);
      const mode = fullscreenModeRef.current;
      if (mode === 'desktop' && isTauriWindow()) {
        try {
          const { getCurrentWindow } = await import('@tauri-apps/api/window');
          await getCurrentWindow().setFullscreen(false);
        } catch {
          // The Notebook overlay still restores even if the host window rejects exit.
        }
      } else if (mode === 'browser' && document.fullscreenElement) {
        await document.exitFullscreen?.().catch(() => {});
      }
      fullscreenModeRef.current = null;
      setFullscreenMode(null);
      setTheaterMode(mode === null ? false : fullscreenReturnModeRef.current === 'theater');
    }, []);

    const toggleTheater = useCallback(() => {
      if (fullscreenPending) return;
      if (theaterMode || fullscreenModeRef.current) {
        void closePresentation();
      } else {
        measureTheaterBounds();
        setTheaterMode(true);
      }
    }, [closePresentation, fullscreenPending, measureTheaterBounds, theaterMode]);

    const toggleFullscreen = useCallback(() => {
      if (fullscreenModeRef.current) {
        void closePresentation();
        return;
      }
      if (fullscreenPending || fullscreenEntryRequestRef.current !== null) return;

      const requestId = fullscreenRequestIdRef.current + 1;
      fullscreenRequestIdRef.current = requestId;
      fullscreenEntryRequestRef.current = requestId;
      fullscreenReturnModeRef.current = theaterMode ? 'theater' : 'inline';
      setFullscreenPending(true);
      const requestIsCurrent = () => fullscreenRequestIdRef.current === requestId;
      const settleRequest = () => {
        if (fullscreenEntryRequestRef.current !== requestId) return;
        fullscreenEntryRequestRef.current = null;
        setFullscreenPending(false);
      };
      if (isTauriWindow()) {
        void import('@tauri-apps/api/window')
          .then(async ({ getCurrentWindow }) => {
            if (!requestIsCurrent()) return;
            const appWindow = getCurrentWindow();
            await appWindow.setFullscreen(true);
            if (!requestIsCurrent()) {
              await appWindow.setFullscreen(false).catch(() => {});
              return;
            }
            fullscreenModeRef.current = 'desktop';
            setFullscreenMode('desktop');
          })
          .catch(() => {
            if (requestIsCurrent()) {
              setPlaybackError('Fullscreen is unavailable in this Notebook window.');
            }
          })
          .finally(settleRequest);
        return;
      }

      const presentation = presentationRef.current;
      if (!presentation?.requestFullscreen) {
        fullscreenEntryRequestRef.current = null;
        setFullscreenPending(false);
        setPlaybackError('Fullscreen is unavailable in this browser.');
        return;
      }
      void presentation.requestFullscreen()
        .then(async () => {
          if (!requestIsCurrent() || document.fullscreenElement !== presentation) {
            if (requestIsCurrent()) {
              fullscreenRequestIdRef.current += 1;
              setTheaterMode(fullscreenReturnModeRef.current === 'theater');
            }
            if (document.fullscreenElement === presentation) {
              await document.exitFullscreen?.().catch(() => {});
            }
            return;
          }
          fullscreenModeRef.current = 'browser';
          setFullscreenMode('browser');
        })
        .catch(() => {
          if (requestIsCurrent()) {
            setPlaybackError('Fullscreen is unavailable in this browser.');
          }
        })
        .finally(settleRequest);
    }, [closePresentation, fullscreenPending, theaterMode]);

    useEffect(() => {
      if (!theaterMode && !fullscreenMode && !fullscreenPending) return undefined;
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        void closePresentation();
      };
      window.addEventListener('keydown', onKeyDown, true);
      return () => window.removeEventListener('keydown', onKeyDown, true);
    }, [closePresentation, fullscreenMode, fullscreenPending, theaterMode]);

    useEffect(() => {
      const onFullscreenChange = () => {
        if (
          (fullscreenModeRef.current === 'browser' || fullscreenEntryRequestRef.current !== null)
          && document.fullscreenElement !== presentationRef.current
        ) {
          fullscreenRequestIdRef.current += 1;
          fullscreenModeRef.current = null;
          if (fullscreenEntryRequestRef.current === null) {
            setFullscreenPending(false);
          }
          setFullscreenMode(null);
          setTheaterMode(fullscreenReturnModeRef.current === 'theater');
        }
      };
      document.addEventListener('fullscreenchange', onFullscreenChange);
      return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
    }, []);

    useEffect(() => () => {
      fullscreenRequestIdRef.current += 1;
      fullscreenEntryRequestRef.current = null;
      const mode = fullscreenModeRef.current;
      if (mode === 'browser' && document.fullscreenElement === presentationRef.current) {
        void document.exitFullscreen?.().catch(() => {});
      } else if (mode === 'desktop' && isTauriWindow()) {
        void import('@tauri-apps/api/window')
          .then(({ getCurrentWindow }) => getCurrentWindow().setFullscreen(false))
          .catch(() => {});
      }
    }, []);

    const playOrPause = useCallback(() => {
      const video = videoRef.current;
      if (!video) return;
      if (video.paused) {
        void Promise.resolve(video.play())
          .then(() => {
            setPlaybackError(null);
            syncPlaybackState();
          })
          .catch(() => {
            setIsPlaying(false);
            setPlaybackError('Playback could not start. Check that this local video is supported.');
          });
      } else {
        video.pause();
        syncPlaybackState();
      }
    }, [syncPlaybackState]);

    const seekTo = useCallback((value: number) => {
      const video = videoRef.current;
      if (!video || !Number.isFinite(value)) return;
      video.currentTime = Math.max(0, Math.min(duration || 0, value));
      setCurrentTime(video.currentTime);
    }, [duration]);

    const changeVolume = useCallback((value: number) => {
      const video = videoRef.current;
      if (!video || !Number.isFinite(value)) return;
      video.volume = Math.min(1, Math.max(0, value));
      if (video.volume > 0) video.muted = false;
      setIsMuted(video.muted);
      setVolume(video.volume);
    }, []);

    const toggleMuted = useCallback(() => {
      const video = videoRef.current;
      if (!video) return;
      video.muted = !video.muted;
      setIsMuted(video.muted);
    }, []);

    const selectCaptionTrack = useCallback((value: string) => {
      const nextIndex = value === 'off' ? null : Number(value);
      if (nextIndex !== null && (!Number.isInteger(nextIndex) || nextIndex < 0 || nextIndex >= tracks.length)) {
        return;
      }
      setCaptionTrackIndex(nextIndex);
      applyCaptionTrack(nextIndex);
    }, [applyCaptionTrack, tracks.length]);

    const toggleCaptions = useCallback(() => {
      const defaultIndex = tracks.findIndex((track) => track.default === true);
      const nextIndex = captionTrackIndex === null
        ? (defaultIndex >= 0 ? defaultIndex : 0)
        : null;
      if (tracks.length === 0) return;
      setCaptionTrackIndex(nextIndex);
      applyCaptionTrack(nextIndex);
    }, [applyCaptionTrack, captionTrackIndex, tracks]);

    const caption = String(node.attrs.caption ?? '').trim();
    const title = String(node.attrs.title ?? 'Untitled video');
    const description = String(node.attrs.description ?? '').trim();
    const rawWidthPercent = Number(node.attrs.widthPercent);
    const widthPercent = Number.isFinite(rawWidthPercent)
      ? Math.min(100, Math.max(10, Math.round(rawWidthPercent)))
      : 100;
    const interaction = useNotebookDirectMediaInteraction({
      displayAspectRatio,
      editor,
      frameRef,
      lockedAspectRatio: sourceAspectRatio ?? displayAspectRatio,
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
    const effectiveAspectRatio = interaction.preview?.displayAspectRatio
      ?? sourceAspectRatio
      ?? displayAspectRatio;
    const style = {
      '--notebook-video-width': interaction.activeGesture === 'resize'
        && interaction.preview?.renderedWidthPx
        ? `${interaction.preview.renderedWidthPx}px`
        : `${effectiveWidthPercent}%`,
      ...(effectiveAspectRatio === undefined
        ? {}
        : { '--notebook-media-display-aspect-ratio': String(effectiveAspectRatio) }),
    } as CSSProperties;
    const isFullscreen = fullscreenMode !== null;
    const isTheater = theaterMode && !isFullscreen;
    const isPresenting = isTheater || isFullscreen;

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
        <div
          ref={presentationRef}
          className={`notebook-video-presentation${isTheater ? ' is-theater' : ''}${isFullscreen ? ' is-fullscreen' : ''}`}
          data-notebook-video-presentation={isTheater ? 'theater' : isFullscreen ? 'fullscreen' : undefined}
          style={isTheater ? theaterBounds : undefined}
          onPointerMove={revealControls}
        >
          <div ref={frameRef} className="notebook-media-transform-shell notebook-media-transform-shell--video">
            <div
              className="notebook-video-frame"
              style={effectiveAspectRatio === undefined
                ? undefined
                : { aspectRatio: String(effectiveAspectRatio) }}
            >
              {loadState.status === 'ready' ? (
                <>
                  <video
                    ref={videoRef}
                    className={playbackError ? 'is-playback-error' : undefined}
                    crossOrigin="anonymous"
                    loop={node.attrs.loop === true}
                    playsInline
                    poster={loadState.posterUrl}
                    preload="metadata"
                    src={loadState.url}
                    title={title}
                    onDurationChange={syncPlaybackState}
                    onEnded={syncPlaybackState}
                    onError={() => {
                      videoRef.current?.pause();
                      setIsPlaying(false);
                      setPlaybackError('This video could not be decoded or played.');
                    }}
                    onLoadedData={() => {
                      setPlaybackError(null);
                      syncPlaybackState();
                      applyCaptionTrack(captionTrackIndex);
                    }}
                    onLoadedMetadata={() => {
                      const video = videoRef.current;
                      if (video && !audioInitializedRef.current) {
                        video.defaultMuted = false;
                        video.muted = false;
                        video.volume = 1;
                        audioInitializedRef.current = true;
                      }
                      normalizeSourceProportions();
                      syncPlaybackState();
                      applyCaptionTrack(captionTrackIndex);
                    }}
                    onPause={syncPlaybackState}
                    onPlay={() => {
                      setPlaybackError(null);
                      syncPlaybackState();
                    }}
                    onTimeUpdate={syncPlaybackState}
                    onVolumeChange={syncPlaybackState}
                    style={{ height: '100%', objectFit: 'contain' }}
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
                  {playbackError ? (
                    <div className="notebook-video-playback-error" role="alert">
                      {loadState.posterUrl ? <img alt="" src={loadState.posterUrl} /> : null}
                      <span>{playbackError}</span>
                    </div>
                  ) : null}
                </>
              ) : loadState.status === 'missing' ? (
                <div className="notebook-video-missing" role="img" aria-label="Video asset is unavailable">
                  <VideoOff aria-hidden="true" size={26} />
                  <span>Video asset unavailable</span>
                </div>
              ) : (
                <div className="notebook-video-loading" role="status">Loading video…</div>
              )}
            </div>
            {selected && !isPresenting ? (
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
          {loadState.status === 'ready' ? (
            <div
              className={`notebook-video-playback-controls${isPlaying && !controlsVisible && !controlsHovered && !controlsFocused ? ' is-hidden' : ''}`}
              role="group"
              aria-label="Video playback controls"
              onClick={(event) => event.stopPropagation()}
              onFocusCapture={() => {
                controlsFocusedRef.current = true;
                setControlsFocused(true);
                clearControlsTimer();
                setControlsVisible(true);
              }}
              onBlurCapture={(event) => {
                if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                controlsFocusedRef.current = false;
                setControlsFocused(false);
                revealControls();
              }}
              onPointerEnter={() => {
                controlsHoveredRef.current = true;
                setControlsHovered(true);
                clearControlsTimer();
                setControlsVisible(true);
              }}
              onPointerLeave={() => {
                controlsHoveredRef.current = false;
                setControlsHovered(false);
                revealControls();
              }}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                aria-label={isPlaying ? 'Pause video' : 'Play video'}
                title={isPlaying ? 'Pause video' : 'Play video'}
                onClick={playOrPause}
              >
                {isPlaying ? <Pause aria-hidden="true" size={16} /> : <Play aria-hidden="true" size={16} />}
              </button>
              <span className="notebook-video-time" aria-live="off">
                {formatVideoTime(currentTime)} / {formatVideoTime(duration)}
              </span>
              <input
                aria-label="Video seek"
                className="notebook-video-seek"
                disabled={duration <= 0}
                max={duration || 0}
                min="0"
                step="0.05"
                type="range"
                value={Math.min(currentTime, duration || 0)}
                onChange={(event) => seekTo(Number(event.currentTarget.value))}
              />
              <button
                type="button"
                aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                aria-pressed={isMuted}
                title={isMuted ? 'Unmute video' : 'Mute video'}
                onClick={toggleMuted}
              >
                {isMuted ? <VolumeX aria-hidden="true" size={16} /> : <Volume2 aria-hidden="true" size={16} />}
              </button>
              <input
                aria-label="Video volume"
                className="notebook-video-volume"
                max="1"
                min="0"
                step="0.05"
                type="range"
                value={isMuted ? 0 : volume}
                onChange={(event) => changeVolume(Number(event.currentTarget.value))}
              />
              <button
                type="button"
                aria-label={captionTrackIndex === null ? 'Show captions' : 'Hide captions'}
                aria-pressed={captionTrackIndex !== null}
                disabled={tracks.length === 0}
                title={captionTrackIndex === null ? 'Show captions' : 'Hide captions'}
                onClick={toggleCaptions}
              >
                <Captions aria-hidden="true" size={16} />
              </button>
              <label className="notebook-video-captions">
                <span className="sr-only">Captions</span>
                <select
                  aria-label="Captions"
                  disabled={tracks.length === 0}
                  value={captionTrackIndex === null ? 'off' : String(captionTrackIndex)}
                  onChange={(event) => selectCaptionTrack(event.currentTarget.value)}
                >
                  <option value="off">Off</option>
                  {tracks.map((track, index) => (
                    <option key={track.id} value={index}>{track.label}</option>
                  ))}
                </select>
              </label>
              {fullscreenMode === null ? (
                <button
                  type="button"
                  aria-label={theaterMode ? 'Exit theater mode' : 'Enter theater mode'}
                  aria-pressed={theaterMode}
                  disabled={fullscreenPending}
                  title={theaterMode ? 'Exit theater mode' : 'Enter theater mode'}
                  onClick={toggleTheater}
                >
                  {theaterMode ? <Minimize2 aria-hidden="true" size={16} /> : <Theater aria-hidden="true" size={16} />}
                </button>
              ) : null}
              <button
                type="button"
                aria-label={fullscreenMode ? 'Exit fullscreen' : 'Enter fullscreen'}
                aria-pressed={fullscreenMode !== null}
                disabled={fullscreenPending}
                title={fullscreenMode ? 'Exit fullscreen' : 'Enter fullscreen'}
                onClick={toggleFullscreen}
              >
                {fullscreenMode ? <Minimize2 aria-hidden="true" size={16} /> : <Expand aria-hidden="true" size={16} />}
              </button>
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
