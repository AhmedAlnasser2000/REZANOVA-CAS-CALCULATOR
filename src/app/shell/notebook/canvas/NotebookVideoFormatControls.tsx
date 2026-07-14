import type { Editor } from '@tiptap/core';
import { closeHistory } from '@tiptap/pm/history';
import { NodeSelection } from '@tiptap/pm/state';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Captions,
  ChevronDown,
  Image as ImageIcon,
  ImageOff,
  ListVideo,
  Trash2,
  WrapText,
} from 'lucide-react';

import {
  notebookEffectiveImagePlacement,
  type NotebookImagePlacement,
  type NotebookPageSetup,
  type NotebookVideoAlignment,
  type NotebookVideoTrack,
} from '../../../../lib/notebook';
import { NotebookFloatingLayer, useNotebookTransientLayer } from '../transient-ui';
import { notebookEditorNodeById, notebookEditorSelection } from './selection';

const WIDTH_PRESETS = [25, 50, 75, 100] as const;
const WRAP_OPTIONS: ReadonlyArray<{
  value: NotebookImagePlacement;
  label: string;
  description: string;
}> = [
  { value: 'normal', label: 'Normal flow', description: 'Place the video between paragraphs.' },
  { value: 'top-and-bottom', label: 'Top and Bottom', description: 'Keep text above and below the video.' },
  { value: 'square-left', label: 'Square Left', description: 'Wrap text beside a left-aligned video.' },
  { value: 'square-right', label: 'Square Right', description: 'Wrap text beside a right-aligned video.' },
];

function selectedVideo(editor: Editor) {
  const selection = notebookEditorSelection(editor);
  return selection?.type === 'videoFigure' && selection.id ? selection : null;
}

function videoWidth(value: unknown) {
  return typeof value === 'number' && value >= 10 && value <= 100 ? value : 100;
}

function videoAlignment(value: unknown): NotebookVideoAlignment {
  return value === 'left' || value === 'right' ? value : 'center';
}

function videoPlacement(value: unknown): NotebookImagePlacement {
  return value === 'top-and-bottom' || value === 'square-left' || value === 'square-right'
    ? value
    : 'normal';
}

function editorContentWidth(editor: Editor) {
  const element = editor.view.dom as HTMLElement;
  const style = getComputedStyle(element);
  const width = element.clientWidth
    - (Number.parseFloat(style.paddingLeft) || 0)
    - (Number.parseFloat(style.paddingRight) || 0);
  return width > 0 ? width : undefined;
}

function videoTracks(value: unknown): NotebookVideoTrack[] {
  return Array.isArray(value) ? value as NotebookVideoTrack[] : [];
}

export function NotebookVideoFormatControls({
  editor,
  onChoosePoster,
  onChooseTrack,
  onEditDetails,
  onRemovePoster,
  onRemoveTrack,
  pageSetup,
}: {
  editor: Editor;
  onChoosePoster: () => void;
  onChooseTrack: () => void;
  onEditDetails: () => void;
  onRemovePoster: () => void;
  onRemoveTrack: (trackId: string) => void;
  pageSetup: NotebookPageSetup;
}) {
  const wrapLayer = useNotebookTransientLayer({ id: 'notebook-video-wrap' });
  const target = selectedVideo(editor);
  const width = videoWidth(target?.attrs.widthPercent);
  const alignment = videoAlignment(target?.attrs.alignment);
  const placement = videoPlacement(target?.attrs.placement);
  const effectivePlacement = notebookEffectiveImagePlacement(
    pageSetup,
    placement,
    width,
    editorContentWidth(editor),
  );
  const tracks = videoTracks(target?.attrs.tracks);
  const hasPoster = typeof target?.attrs.posterAssetId === 'string';

  function updateVideo(nextAttrs: Record<string, unknown>) {
    const current = selectedVideo(editor);
    if (!current?.id) return false;
    const located = notebookEditorNodeById(editor, current.id);
    if (!located || located.type !== 'videoFigure') return false;
    const node = editor.state.doc.nodeAt(located.from);
    if (!node) return false;
    const transaction = closeHistory(editor.state.tr).setNodeMarkup(located.from, undefined, {
      ...node.attrs,
      ...nextAttrs,
    });
    transaction.setSelection(NodeSelection.create(transaction.doc, located.from));
    editor.view.dispatch(transaction);
    editor.view.focus();
    return true;
  }

  function setPlacement(nextPlacement: NotebookImagePlacement) {
    updateVideo({
      placement: nextPlacement === 'normal' ? null : nextPlacement,
      ...(nextPlacement === 'square-left' ? { alignment: 'left' } : {}),
      ...(nextPlacement === 'square-right' ? { alignment: 'right' } : {}),
    });
    wrapLayer.close(false);
  }

  return (
    <>
      <section className="notebook-ribbon-group is-video-size" aria-label="Video size">
        <div className="notebook-ribbon-group-tools">
          {WIDTH_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              className={width === preset ? 'is-active' : undefined}
              aria-label={`Set video width to ${preset}%`}
              aria-pressed={width === preset}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => updateVideo({ widthPercent: preset === 100 ? null : preset })}
            >{preset}%</button>
          ))}
          <label className="notebook-video-width-input">
            <span>Custom</span>
            <input
              aria-label="Custom video width percentage"
              min="10"
              max="100"
              type="number"
              value={width}
              onChange={(event) => {
                const value = Math.max(10, Math.min(100, Math.round(Number(event.target.value))));
                if (Number.isFinite(value)) updateVideo({ widthPercent: value === 100 ? null : value });
              }}
            />
            <span>%</span>
          </label>
        </div>
        <span className="notebook-ribbon-group-label">Size</span>
      </section>
      <section className="notebook-ribbon-group" aria-label="Video alignment">
        <div className="notebook-ribbon-group-tools">
          {([
            ['left', AlignLeft],
            ['center', AlignCenter],
            ['right', AlignRight],
          ] as const).map(([value, Icon]) => (
            <button
              key={value}
              type="button"
              className={alignment === value ? 'is-active' : undefined}
              aria-label={`Align video ${value}`}
              aria-pressed={alignment === value}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => updateVideo({ alignment: value === 'center' ? null : value })}
            ><Icon aria-hidden="true" size={16} /></button>
          ))}
        </div>
        <span className="notebook-ribbon-group-label">Alignment</span>
      </section>
      <section className="notebook-ribbon-group" aria-label="Video wrapping">
        <div className="notebook-ribbon-group-tools">
          <div className="notebook-picture-control">
            <button
              data-notebook-transient-trigger={wrapLayer.id}
              type="button"
              className={placement !== 'normal' ? 'is-active' : undefined}
              aria-label={`Wrap text: ${WRAP_OPTIONS.find((option) => option.value === placement)?.label}`}
              aria-haspopup="menu"
              aria-expanded={wrapLayer.isOpen}
              title="Wrap text"
              onMouseDown={(event) => event.preventDefault()}
              onClick={wrapLayer.toggle}
            ><WrapText aria-hidden="true" size={16} /><ChevronDown aria-hidden="true" size={11} /></button>
            {wrapLayer.isOpen ? (
              <NotebookFloatingLayer
                layerId={wrapLayer.id}
                className="notebook-picture-menu"
                role="menu"
                aria-label="Video wrapping"
              >
                {WRAP_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="menuitemradio"
                    aria-checked={placement === option.value}
                    className={placement === option.value ? 'is-active' : undefined}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => setPlacement(option.value)}
                  >
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                  </button>
                ))}
                {effectivePlacement !== placement ? (
                  <p role="status">Normal flow is used at this size to keep the text column readable.</p>
                ) : null}
              </NotebookFloatingLayer>
            ) : null}
          </div>
        </div>
        <span className="notebook-ribbon-group-label">Wrap</span>
      </section>
      <section className="notebook-ribbon-group" aria-label="Video details">
        <div className="notebook-ribbon-group-tools">
          <button type="button" title="Edit video details" onClick={onEditDetails}>
            <ListVideo aria-hidden="true" size={16} /><span>Details</span>
          </button>
        </div>
        <span className="notebook-ribbon-group-label">Details</span>
      </section>
      <section className="notebook-ribbon-group" aria-label="Video poster">
        <div className="notebook-ribbon-group-tools">
          <button type="button" title="Choose poster image" onClick={onChoosePoster}>
            <ImageIcon aria-hidden="true" size={16} /><span>{hasPoster ? 'Replace' : 'Poster'}</span>
          </button>
          <button type="button" disabled={!hasPoster} title="Remove poster image" onClick={onRemovePoster}>
            <ImageOff aria-hidden="true" size={16} />
          </button>
        </div>
        <span className="notebook-ribbon-group-label">Poster</span>
      </section>
      <section className="notebook-ribbon-group is-video-tracks" aria-label="Video captions">
        <div className="notebook-ribbon-group-tools">
          <button type="button" title="Add WebVTT captions" onClick={onChooseTrack}>
            <Captions aria-hidden="true" size={16} /><span>Add captions</span>
          </button>
          {tracks.map((track) => (
            <span className="notebook-video-track-chip" key={track.id}>
              <span>{track.label}</span>
              <button
                type="button"
                aria-label={`Remove ${track.label} captions`}
                title={`Remove ${track.label}`}
                onClick={() => onRemoveTrack(track.id)}
              ><Trash2 aria-hidden="true" size={13} /></button>
            </span>
          ))}
        </div>
        <span className="notebook-ribbon-group-label">Captions</span>
      </section>
    </>
  );
}
