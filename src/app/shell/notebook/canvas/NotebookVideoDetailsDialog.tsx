import { Video } from 'lucide-react';
import { useState } from 'react';

import {
  notebookVideoWarningMessage,
  type NotebookVideoWarning,
} from '../../../../lib/notebook';

export type NotebookVideoDetails = {
  title: string;
  description: string;
  caption: string;
  numbered: boolean;
  loop: boolean;
};

export function NotebookVideoDetailsDialog({
  busy,
  fileName,
  initial,
  mode,
  onCancel,
  onConfirm,
  warnings,
}: {
  busy: boolean;
  fileName?: string;
  initial: NotebookVideoDetails;
  mode: 'edit' | 'insert';
  onCancel: () => void;
  onConfirm: (details: NotebookVideoDetails) => void;
  warnings: readonly NotebookVideoWarning[];
}) {
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [caption, setCaption] = useState(initial.caption);
  const [numbered, setNumbered] = useState(initial.numbered);
  const [loop, setLoop] = useState(initial.loop);

  return (
    <div className="notebook-image-dialog-backdrop">
      <section
        aria-labelledby="notebook-video-dialog-title"
        aria-modal="true"
        className="notebook-image-dialog notebook-video-dialog"
        data-notebook-transient-layer="notebook-video-details"
        role="dialog"
      >
        <header>
          <Video aria-hidden="true" size={19} />
          <div>
            <h2 id="notebook-video-dialog-title">
              {mode === 'insert' ? 'Insert video' : 'Video details'}
            </h2>
            {fileName ? <span>{fileName}</span> : null}
          </div>
        </header>
        <label>
          <span>Title</span>
          <input
            autoFocus
            disabled={busy}
            placeholder="Name this video"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label>
          <span>Description <small>recommended for accessibility</small></span>
          <textarea
            disabled={busy}
            placeholder="Summarize the important visual and audio content"
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <label>
          <span>Caption <small>optional</small></span>
          <input
            disabled={busy}
            placeholder="Caption shown under the video"
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
          />
        </label>
        <label className="notebook-image-dialog-check">
          <input
            checked={numbered}
            disabled={busy || !caption.trim()}
            type="checkbox"
            onChange={(event) => setNumbered(event.target.checked)}
          />
          <span>Number this caption automatically as a Video</span>
        </label>
        <label className="notebook-image-dialog-check">
          <input
            checked={loop}
            disabled={busy}
            type="checkbox"
            onChange={(event) => setLoop(event.target.checked)}
          />
          <span>Loop playback</span>
        </label>
        {warnings.length > 0 ? (
          <div className="notebook-image-dialog-warning" role="status">
            <strong>Large video</strong>
            {warnings.map((warning) => (
              <span key={warning}>{notebookVideoWarningMessage(warning)}</span>
            ))}
          </div>
        ) : null}
        <footer>
          <button type="button" disabled={busy} onClick={onCancel}>Cancel</button>
          <button
            className="is-primary"
            type="button"
            disabled={busy || !title.trim()}
            onClick={() => onConfirm({
              title: title.trim(),
              description: description.trim(),
              caption: caption.trim(),
              numbered: Boolean(caption.trim()) && numbered,
              loop,
            })}
          >
            {busy ? 'Working…' : mode === 'insert' ? 'Insert video' : 'Save details'}
          </button>
        </footer>
      </section>
    </div>
  );
}
