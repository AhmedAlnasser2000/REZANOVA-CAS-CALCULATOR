import { Image as ImageIcon } from 'lucide-react';
import { useState } from 'react';

import {
  notebookImageWarningMessage,
  type NotebookImageWarning,
} from '../../../../lib/notebook';

export type NotebookImageDetails = {
  altText: string;
  decorative: boolean;
  caption: string;
  numbered: boolean;
};

export function NotebookImageDetailsDialog({
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
  initial: NotebookImageDetails;
  mode: 'edit' | 'insert';
  onCancel: () => void;
  onConfirm: (details: NotebookImageDetails) => void;
  warnings: readonly NotebookImageWarning[];
}) {
  const [altText, setAltText] = useState(initial.altText);
  const [caption, setCaption] = useState(initial.caption);
  const [decorative, setDecorative] = useState(initial.decorative);
  const [numbered, setNumbered] = useState(initial.numbered);
  const [missingAltWarning, setMissingAltWarning] = useState(false);

  function submit() {
    if (!decorative && !altText.trim() && !missingAltWarning) {
      setMissingAltWarning(true);
      return;
    }
    onConfirm({
      altText: decorative ? '' : altText.trim(),
      decorative,
      caption: caption.trim(),
      numbered: Boolean(caption.trim()) && numbered,
    });
  }

  return (
    <div className="notebook-image-dialog-backdrop">
      <section
        aria-labelledby="notebook-image-dialog-title"
        aria-modal="true"
        className="notebook-image-dialog"
        data-notebook-transient-layer="notebook-image-details"
        role="dialog"
      >
        <header>
          <ImageIcon aria-hidden="true" size={19} />
          <div>
            <h2 id="notebook-image-dialog-title">
              {mode === 'insert' ? 'Insert image' : 'Picture details'}
            </h2>
            {fileName ? <span>{fileName}</span> : null}
          </div>
        </header>
        <label>
          <span>Alternative text</span>
          <textarea
            autoFocus
            disabled={busy || decorative}
            placeholder="Describe the image for someone who cannot see it"
            rows={3}
            value={altText}
            onChange={(event) => {
              setAltText(event.target.value);
              setMissingAltWarning(false);
            }}
          />
        </label>
        <label className="notebook-image-dialog-check">
          <input
            checked={decorative}
            disabled={busy}
            type="checkbox"
            onChange={(event) => {
              setDecorative(event.target.checked);
              setMissingAltWarning(false);
            }}
          />
          <span>Decorative image — assistive technology can ignore it</span>
        </label>
        <label>
          <span>Caption <small>optional</small></span>
          <input
            disabled={busy}
            placeholder="Explain what this figure shows"
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
          <span>Number this caption automatically as a Figure</span>
        </label>
        {warnings.length > 0 ? (
          <div className="notebook-image-dialog-warning" role="status">
            <strong>Large image</strong>
            {warnings.map((warning) => (
              <span key={warning}>{notebookImageWarningMessage(warning)}</span>
            ))}
          </div>
        ) : null}
        {missingAltWarning ? (
          <div className="notebook-image-dialog-warning" role="alert">
            <strong>Alternative text is empty</strong>
            <span>Describe meaningful content, mark the image Decorative, or confirm insertion without alternative text.</span>
          </div>
        ) : null}
        <footer>
          <button type="button" disabled={busy} onClick={onCancel}>Cancel</button>
          <button className="is-primary" type="button" disabled={busy} onClick={submit}>
            {busy
              ? 'Working…'
              : missingAltWarning
                ? `${mode === 'insert' ? 'Insert' : 'Save'} without alt text`
                : mode === 'insert' ? 'Insert image' : 'Save details'}
          </button>
        </footer>
      </section>
    </div>
  );
}
