import type { Editor } from '@tiptap/core';
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';

import {
  validateNotebookImage,
  validateNotebookVideo,
  validateNotebookWebVtt,
  type NotebookAssetPort,
  type NotebookVideoInspection,
  type NotebookVideoTrack,
} from '../../../../lib/notebook';
import { useNotebookTransientLayer } from '../transient-ui';
import {
  NotebookVideoDetailsDialog,
  type NotebookVideoDetails,
} from './NotebookVideoDetailsDialog';
import {
  captureNotebookToolbarSelection,
  restoreNotebookToolbarSelection,
  type NotebookToolbarSelection,
} from './notebookToolbarSelection';
import { notebookEditorNodeById, notebookEditorSelection } from './selection';

type PendingVideoInsert = {
  mode: 'insert';
  file: File;
  fileName: string;
  inspection: NotebookVideoInspection;
  selection: NotebookToolbarSelection;
  insertionPosition?: number;
};

type PendingVideoEdit = {
  mode: 'edit';
  nodeId: string;
  initial: NotebookVideoDetails;
};

type PendingVideoDialog = PendingVideoInsert | PendingVideoEdit;

type UseNotebookVideoAuthoringOptions = {
  assetPort: NotebookAssetPort;
  editor: Editor | null;
  onInserted: () => void;
};

export type NotebookVideoAuthoring = {
  choosePoster: () => void;
  chooseTrack: () => void;
  controls: ReactNode;
  fileInputRef: RefObject<HTMLInputElement | null>;
  openDetails: () => void;
  removePoster: () => void;
  removeTrack: (trackId: string) => void;
  stage: (file: File, insertionPosition?: number) => Promise<void>;
};

export function isNotebookVideoFile(file: File) {
  return file.type === 'video/mp4'
    || file.type === 'video/webm'
    || /\.(mp4|webm)$/i.test(file.name);
}

export function useNotebookVideoAuthoring({
  assetPort,
  editor,
  onInserted,
}: UseNotebookVideoAuthoringOptions): NotebookVideoAuthoring {
  const [pendingDialog, setPendingDialog] = useState<PendingVideoDialog | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialog = useNotebookTransientLayer({ id: 'notebook-video-details' });
  const dialogIsOpen = dialog.isOpen;
  const openDialog = dialog.open;
  const dialogWasOpenRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const posterInputRef = useRef<HTMLInputElement | null>(null);
  const trackInputRef = useRef<HTMLInputElement | null>(null);
  const toolTargetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pendingDialog) {
      dialogWasOpenRef.current = false;
      return;
    }
    if (dialogIsOpen) {
      dialogWasOpenRef.current = true;
      return;
    }
    if (dialogWasOpenRef.current) {
      dialogWasOpenRef.current = false;
      setPendingDialog(null);
      setBusy(false);
      return;
    }
    openDialog();
  }, [dialogIsOpen, openDialog, pendingDialog]);

  async function storeBlob(blob: Blob, mimeType: 'video/mp4' | 'video/webm') {
    if (assetPort.putBlob) return assetPort.putBlob(blob, mimeType);
    return assetPort.put(new Uint8Array(await blob.arrayBuffer()), mimeType);
  }

  function updateAttrs(nodeId: string, nextAttrs: Record<string, unknown>) {
    if (!editor) return false;
    const selected = notebookEditorNodeById(editor, nodeId);
    if (!selected || selected.type !== 'videoFigure') return false;
    const node = editor.state.doc.nodeAt(selected.from);
    if (!node) return false;
    editor.view.dispatch(editor.state.tr.setNodeMarkup(selected.from, undefined, {
      ...node.attrs,
      ...nextAttrs,
    }));
    editor.commands.setNodeSelection(selected.from);
    return true;
  }

  function selectedTargetId() {
    if (!editor) return null;
    const selected = notebookEditorSelection(editor);
    return selected?.type === 'videoFigure' ? selected.id : null;
  }

  async function stage(file: File, insertionPosition?: number) {
    if (!editor) return;
    const selection = captureNotebookToolbarSelection(editor);
    setError(null);
    try {
      const declaredType = file.type === 'video/mp4' || file.type === 'video/webm'
        ? file.type
        : undefined;
      const inspection = await validateNotebookVideo(file, declaredType);
      setPendingDialog({
        mode: 'insert',
        file,
        fileName: file.name || 'Local video',
        inspection,
        selection,
        ...(insertionPosition !== undefined ? { insertionPosition } : {}),
      });
    } catch (stageError) {
      setError(stageError instanceof Error ? stageError.message : 'This video could not be inserted.');
    }
  }

  function openDetails() {
    if (!editor) return;
    const selected = notebookEditorSelection(editor);
    if (selected?.type !== 'videoFigure' || !selected.id) return;
    setPendingDialog({
      mode: 'edit',
      nodeId: selected.id,
      initial: {
        title: String(selected.attrs.title ?? 'Untitled video'),
        description: String(selected.attrs.description ?? ''),
        caption: String(selected.attrs.caption ?? ''),
        numbered: selected.attrs.numbered === true,
        loop: selected.attrs.loop === true,
      },
    });
  }

  async function confirmDetails(details: NotebookVideoDetails) {
    if (!pendingDialog || !editor) return;
    setBusy(true);
    setError(null);
    if (pendingDialog.mode === 'edit') {
      if (!updateAttrs(pendingDialog.nodeId, {
        title: details.title,
        description: details.description,
        caption: details.caption || null,
        numbered: details.numbered || null,
        loop: details.loop || null,
      })) {
        setError('The selected video is no longer available.');
        setBusy(false);
        return;
      }
      setPendingDialog(null);
      dialog.close(false);
      setBusy(false);
      return;
    }

    const pending = pendingDialog;
    try {
      const metadata = await storeBlob(pending.file, pending.inspection.mimeType);
      const nodeId = `notebook.videoFigure.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
      const videoContent = {
        type: 'videoFigure',
        attrs: {
          id: nodeId,
          assetId: metadata.id,
          title: details.title,
          description: details.description,
          caption: details.caption || null,
          numbered: details.numbered || null,
          posterAssetId: null,
          tracks: null,
          widthPercent: null,
          alignment: null,
          placement: null,
          displayAspectRatio: null,
          loop: details.loop || null,
        },
      };
      const inserted = pending.insertionPosition === undefined
        ? restoreNotebookToolbarSelection(editor, pending.selection).insertContent(videoContent).run()
        : editor.chain().focus().insertContentAt(
            Math.max(0, Math.min(editor.state.doc.content.size, pending.insertionPosition)),
            videoContent,
          ).run();
      const video = notebookEditorNodeById(editor, nodeId);
      if (!inserted || !video) throw new Error('The editor could not place this video.');
      editor.commands.setNodeSelection(video.from);
      setPendingDialog(null);
      dialog.close(false);
      onInserted();
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : 'This video could not be inserted.');
    } finally {
      setBusy(false);
    }
  }

  function choosePoster() {
    toolTargetIdRef.current = selectedTargetId();
    posterInputRef.current?.click();
  }

  async function stagePoster(file: File) {
    const targetId = toolTargetIdRef.current;
    if (!targetId) return;
    setError(null);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const declaredType = file.type.startsWith('image/') ? file.type : undefined;
      const inspection = await validateNotebookImage(bytes, declaredType);
      const metadata = await assetPort.put(bytes, inspection.mimeType);
      if (!updateAttrs(targetId, { posterAssetId: metadata.id })) {
        throw new Error('The selected video is no longer available.');
      }
    } catch (posterError) {
      setError(posterError instanceof Error ? posterError.message : 'The poster image could not be added.');
    }
  }

  function removePoster() {
    const targetId = selectedTargetId();
    if (targetId) updateAttrs(targetId, { posterAssetId: null });
  }

  function chooseTrack() {
    toolTargetIdRef.current = selectedTargetId();
    trackInputRef.current?.click();
  }

  async function stageTrack(file: File) {
    if (!editor) return;
    const targetId = toolTargetIdRef.current;
    if (!targetId) return;
    setError(null);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      validateNotebookWebVtt(bytes);
      const metadata = await assetPort.put(bytes, 'text/vtt');
      const located = notebookEditorNodeById(editor, targetId);
      const node = located?.type === 'videoFigure' ? editor.state.doc.nodeAt(located.from) : null;
      if (!node) throw new Error('The selected video is no longer available.');
      const currentTracks = Array.isArray(node.attrs.tracks)
        ? node.attrs.tracks as NotebookVideoTrack[]
        : [];
      const label = file.name.replace(/\.vtt$/i, '').trim() || 'English';
      const nextTrack: NotebookVideoTrack = {
        id: `notebook.videoTrack.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`,
        assetId: metadata.id,
        kind: 'captions',
        label,
        language: 'en',
        ...(currentTracks.length === 0 ? { default: true } : {}),
      };
      updateAttrs(targetId, { tracks: [...currentTracks, nextTrack] });
    } catch (trackError) {
      setError(trackError instanceof Error ? trackError.message : 'The captions could not be added.');
    }
  }

  function removeTrack(trackId: string) {
    if (!editor) return;
    const targetId = selectedTargetId();
    if (!targetId) return;
    const located = notebookEditorNodeById(editor, targetId);
    const node = located?.type === 'videoFigure' ? editor.state.doc.nodeAt(located.from) : null;
    if (!node) return;
    const tracks = (Array.isArray(node.attrs.tracks) ? node.attrs.tracks : []) as NotebookVideoTrack[];
    const remaining = tracks.filter((track) => track.id !== trackId);
    if (remaining.length > 0 && !remaining.some((track) => track.default)) {
      remaining[0] = { ...remaining[0], default: true };
    }
    updateAttrs(targetId, { tracks: remaining.length > 0 ? remaining : null });
  }

  const controls = (
    <>
      <input
        ref={fileInputRef}
        className="sr-only"
        type="file"
        accept=".mp4,.webm,video/mp4,video/webm"
        aria-label="Choose video"
        onChange={(event) => {
          const files = event.currentTarget.files;
          const file = files?.item?.(0) ?? files?.[0] ?? null;
          event.currentTarget.value = '';
          if (file) void stage(file);
        }}
      />
      <input
        ref={posterInputRef}
        className="sr-only"
        type="file"
        accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml"
        aria-label="Choose video poster image"
        onChange={(event) => {
          const files = event.currentTarget.files;
          const file = files?.item?.(0) ?? files?.[0] ?? null;
          event.currentTarget.value = '';
          if (file) void stagePoster(file);
        }}
      />
      <input
        ref={trackInputRef}
        className="sr-only"
        type="file"
        accept=".vtt,text/vtt"
        aria-label="Choose WebVTT captions"
        onChange={(event) => {
          const files = event.currentTarget.files;
          const file = files?.item?.(0) ?? files?.[0] ?? null;
          event.currentTarget.value = '';
          if (file) void stageTrack(file);
        }}
      />
      {error ? (
        <div className="notebook-image-error notebook-video-error" role="alert">
          <span>{error}</span>
          <button type="button" aria-label="Dismiss video error" onClick={() => setError(null)}>×</button>
        </div>
      ) : null}
      {pendingDialog && dialog.isOpen ? (
        <NotebookVideoDetailsDialog
          key={pendingDialog.mode === 'insert' ? pendingDialog.fileName : pendingDialog.nodeId}
          busy={busy}
          fileName={pendingDialog.mode === 'insert' ? pendingDialog.fileName : undefined}
          initial={pendingDialog.mode === 'insert'
            ? {
                title: pendingDialog.fileName.replace(/\.(mp4|webm)$/i, '') || 'Untitled video',
                description: '',
                caption: '',
                numbered: true,
                loop: false,
              }
            : pendingDialog.initial}
          mode={pendingDialog.mode}
          warnings={pendingDialog.mode === 'insert' ? pendingDialog.inspection.warnings : []}
          onCancel={() => dialog.close()}
          onConfirm={(details) => void confirmDetails(details)}
        />
      ) : null}
    </>
  );

  return {
    choosePoster,
    chooseTrack,
    controls,
    fileInputRef,
    openDetails,
    removePoster,
    removeTrack,
    stage,
  };
}
